---
name: add-telegram
description: Add Telegram as a messaging channel. Can replace WhatsApp, run alongside it, or be added as a secondary (non-control) channel. Guides through BotFather setup, creates a channel abstraction layer, and refactors the codebase to support multi-channel messaging.
---

# Add Telegram Channel

This skill transforms a NanoClaw installation to support Telegram. It creates a channel abstraction layer and implements Telegram via the `telegraf` library.

Run all commands automatically. Only pause when user action is required (BotFather setup, token collection).

**UX Note:** When asking the user questions, prefer using the `AskUserQuestion` tool instead of just outputting text.

## 1. Ask User Questions

### 1a. Channel Mode

Ask the user using AskUserQuestion:

> How do you want to add Telegram?
>
> **Option 1: Replace WhatsApp** - Remove WhatsApp entirely, use Telegram as your only channel
> **Option 2: Add alongside WhatsApp** - Both channels active, either can be the admin (main) channel
> **Option 3: Secondary channel only** - Telegram can receive messages and respond, but admin control stays on WhatsApp

Store their choice as `CHANNEL_MODE` (`replace`, `both`, `secondary`).

### 1b. Bot Token

Ask the user:

> Do you already have a Telegram bot token, or do you need to create one?
>
> **Option 1: I have a token** - Paste your bot token
> **Option 2: I need to create one** - I'll guide you through BotFather

**If they need to create one:**

Tell the user:

> Let's create your Telegram bot:
>
> 1. Open Telegram and search for **@BotFather**
> 2. Send `/newbot`
> 3. Choose a display name (e.g., "Andy Assistant")
> 4. Choose a username (must end in `bot`, e.g., `andy_nanoclaw_bot`)
> 5. BotFather will give you a token like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
>
> **Important next step:** After creating the bot, send `/mybots` to BotFather, select your bot, then:
> - Go to **Bot Settings > Group Privacy** and set it to **DISABLED**
> - This allows the bot to see all messages in groups, not just commands
>
> Paste your bot token here when ready.

Wait for the user to provide their token. Validate it looks like a bot token (numeric ID, colon, alphanumeric string):

```bash
TOKEN="<user_provided_token>"
# Quick validation
if echo "$TOKEN" | grep -qE '^[0-9]+:[A-Za-z0-9_-]+$'; then
  echo "Token format looks valid"
else
  echo "WARNING: Token doesn't match expected format (number:alphanumeric)"
fi
```

### 1c. Admin Channel (if mode is `both`)

If the user chose "Add alongside WhatsApp", ask:

> Which platform should be your **admin (main) channel**?
>
> The main channel has elevated privileges: can see all group messages, manage tasks, and access the full project.
>
> **Option 1: Keep WhatsApp as main** (Recommended) - Telegram groups will be regular (non-admin) channels
> **Option 2: Switch main to Telegram** - WhatsApp groups become regular channels

### 1d. Trigger Word

Ask the user:

> Should Telegram use the same trigger word (`@ASSISTANT_NAME`) or a different one?
>
> **Option 1: Same trigger** (Recommended) - `@ASSISTANT_NAME` works on both platforms
> **Option 2: Different trigger** - Specify a different trigger for Telegram

If they want a different trigger, ask what it should be.

## 2. Install Dependencies

```bash
npm install telegraf
```

Verify installation:

```bash
node -e "require('telegraf'); console.log('telegraf installed successfully')"
```

## 3. Create Channel Abstraction (`src/channel.ts`)

Create a new file `src/channel.ts` with the channel interface and unified message type.

**Key design:** The interface uses a callback pattern (`onMessage`) so both WhatsApp's event-driven model and Telegram's polling model work identically.

```typescript
/**
 * Unified message type shared across all channels.
 * Platform-specific details are abstracted away.
 */
export interface ChannelMessage {
  id: string;
  chatId: string;          // Platform-native ID (WhatsApp JID or Telegram chat ID)
  sender: string;          // Platform-native sender ID
  senderName: string;      // Human-readable name
  content: string;         // Text content (captions for media)
  timestamp: string;       // ISO 8601
  isFromMe: boolean;
  platform: string;        // 'whatsapp' | 'telegram'
}

export type MessageHandler = (message: ChannelMessage) => void;

/**
 * Channel interface. Each messaging platform implements this.
 */
export interface Channel {
  /** Platform identifier */
  readonly platformId: string;

  /** Connect to the platform */
  connect(): Promise<void>;

  /** Disconnect gracefully */
  disconnect(): Promise<void>;

  /** Register callback for incoming messages */
  onMessage(handler: MessageHandler): void;

  /** Send a text message to a chat */
  sendMessage(chatId: string, text: string): Promise<void>;

  /** Show/hide typing indicator */
  setTyping(chatId: string, isTyping: boolean): Promise<void>;

  /** Sync chat/group metadata (names, participants). Optional — not all platforms support it. */
  syncChatMetadata?(): Promise<void>;

  /** Check if this channel owns the given chatId */
  ownsChatId(chatId: string): boolean;
}
```

## 4. Extract WhatsApp into `src/channels/whatsapp.ts`

Create directory and file:

```bash
mkdir -p src/channels
```

Create `src/channels/whatsapp.ts` that implements the `Channel` interface using the existing baileys code from `src/index.ts`.

**Extract these pieces from `src/index.ts`:**

| What | Current location in `src/index.ts` |
|------|-------------------------------------|
| baileys imports | Lines 5-10 |
| `sock` variable | Line 59 |
| LID-to-phone mapping (`lidToPhoneMap`, `translateJid`) | Lines 65, 77-86 |
| `setTyping` | Lines 88-94 |
| `sendMessage` | Lines 330-337 |
| `connectWhatsApp` (socket creation, auth, QR handling) | Lines 683-793 |
| `syncGroupMetadata` | Lines 141-172 |

The WhatsApp channel class should look like this:

```typescript
import makeWASocket, {
  DisconnectReason,
  WASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

import { STORE_DIR } from '../config.js';
import { Channel, ChannelMessage, MessageHandler } from '../channel.js';
import { storeChatMetadata, updateChatName } from '../db.js';
import { logger } from '../logger.js';

export class WhatsAppChannel implements Channel {
  readonly platformId = 'whatsapp';
  private sock!: WASocket;
  private messageHandler: MessageHandler | null = null;
  private lidToPhoneMap: Record<string, string> = {};
  private onConnected: (() => void) | null = null;
  private onDisconnected: ((loggedOut: boolean) => void) | null = null;

  /**
   * Register lifecycle callbacks.
   * - onConnected: called when WhatsApp connection opens (start loops here)
   * - onDisconnected: called on disconnect; `loggedOut` = true means re-auth needed
   */
  setLifecycleCallbacks(callbacks: {
    onConnected?: () => void;
    onDisconnected?: (loggedOut: boolean) => void;
  }): void {
    this.onConnected = callbacks.onConnected || null;
    this.onDisconnected = callbacks.onDisconnected || null;
  }

  async connect(): Promise<void> {
    const authDir = path.join(STORE_DIR, 'auth');
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    this.sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      browser: ['NanoClaw', 'Chrome', '1.0.0'],
    });

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const msg = 'WhatsApp authentication required. Run /setup in Claude Code.';
        logger.error(msg);
        exec(
          `osascript -e 'display notification "${msg}" with title "NanoClaw" sound name "Basso"'`,
        );
        setTimeout(() => process.exit(1), 1000);
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = reason === DisconnectReason.loggedOut;
        logger.info({ reason, loggedOut }, 'WhatsApp connection closed');

        if (this.onDisconnected) this.onDisconnected(loggedOut);

        if (!loggedOut) {
          logger.info('Reconnecting WhatsApp...');
          this.connect();
        } else {
          logger.info('WhatsApp logged out. Run /setup to re-authenticate.');
          process.exit(0);
        }
      } else if (connection === 'open') {
        logger.info('Connected to WhatsApp');

        // Build LID to phone mapping
        if (this.sock.user) {
          const phoneUser = this.sock.user.id.split(':')[0];
          const lidUser = this.sock.user.lid?.split(':')[0];
          if (lidUser && phoneUser) {
            this.lidToPhoneMap[lidUser] = `${phoneUser}@s.whatsapp.net`;
            logger.debug({ lidUser, phoneUser }, 'LID to phone mapping set');
          }
        }

        if (this.onConnected) this.onConnected();
      }
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message) continue;
        const rawJid = msg.key.remoteJid;
        if (!rawJid || rawJid === 'status@broadcast') continue;

        const chatJid = this.translateJid(rawJid);
        const timestamp = new Date(Number(msg.messageTimestamp) * 1000).toISOString();

        // Always store chat metadata for group discovery
        storeChatMetadata(chatJid, timestamp);

        // Emit unified message
        if (this.messageHandler) {
          const content =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            '';

          this.messageHandler({
            id: msg.key.id || '',
            chatId: chatJid,
            sender: msg.key.participant || msg.key.remoteJid || '',
            senderName: msg.pushName || (msg.key.participant || msg.key.remoteJid || '').split('@')[0],
            content,
            timestamp,
            isFromMe: msg.key.fromMe || false,
            platform: 'whatsapp',
          });
        }
      }
    });
  }

  async disconnect(): Promise<void> {
    this.sock?.end(undefined);
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      await this.sock.sendMessage(chatId, { text });
      logger.info({ jid: chatId, length: text.length }, 'WhatsApp message sent');
    } catch (err) {
      logger.error({ jid: chatId, err }, 'Failed to send WhatsApp message');
    }
  }

  async setTyping(chatId: string, isTyping: boolean): Promise<void> {
    try {
      await this.sock.sendPresenceUpdate(isTyping ? 'composing' : 'paused', chatId);
    } catch (err) {
      logger.debug({ jid: chatId, err }, 'Failed to update WhatsApp typing status');
    }
  }

  async syncChatMetadata(): Promise<void> {
    try {
      logger.info('Syncing group metadata from WhatsApp...');
      const groups = await this.sock.groupFetchAllParticipating();
      let count = 0;
      for (const [jid, metadata] of Object.entries(groups)) {
        if (metadata.subject) {
          updateChatName(jid, metadata.subject);
          count++;
        }
      }
      logger.info({ count }, 'WhatsApp group metadata synced');
    } catch (err) {
      logger.error({ err }, 'Failed to sync WhatsApp group metadata');
    }
  }

  ownsChatId(chatId: string): boolean {
    // WhatsApp JIDs end with @s.whatsapp.net or @g.us
    return chatId.endsWith('@s.whatsapp.net') || chatId.endsWith('@g.us') || chatId.endsWith('@lid');
  }

  private translateJid(jid: string): string {
    if (!jid.endsWith('@lid')) return jid;
    const lidUser = jid.split('@')[0].split(':')[0];
    const phoneJid = this.lidToPhoneMap[lidUser];
    if (phoneJid) {
      logger.debug({ lidJid: jid, phoneJid }, 'Translated LID to phone JID');
      return phoneJid;
    }
    return jid;
  }
}
```

**Important:** The `onConnected` callback is how the main process knows WhatsApp is ready. The main process should start the message loop, IPC watcher, scheduler, etc. from this callback — matching the current behavior where those start inside `connection === 'open'`.

## 5. Create `src/channels/telegram.ts`

Create `src/channels/telegram.ts` implementing the `Channel` interface using `telegraf`.

```typescript
import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { Channel, ChannelMessage, MessageHandler } from '../channel.js';
import { storeChatMetadata } from '../db.js';
import { logger } from '../logger.js';

export class TelegramChannel implements Channel {
  readonly platformId = 'telegram';
  private bot: Telegraf;
  private messageHandler: MessageHandler | null = null;
  private botUserId: number = 0;

  constructor(token: string) {
    this.bot = new Telegraf(token);
  }

  async connect(): Promise<void> {
    // Get bot info for isFromMe detection
    const botInfo = await this.bot.telegram.getMe();
    this.botUserId = botInfo.id;
    logger.info({ botUsername: botInfo.username }, 'Telegram bot authenticated');

    // Listen for text messages
    this.bot.on(message('text'), (ctx) => {
      this.handleMessage(ctx);
    });

    // Also handle captions on photos/videos
    this.bot.on(message('caption'), (ctx) => {
      this.handleMessage(ctx);
    });

    // Launch bot (long-polling)
    this.bot.launch();
    logger.info('Telegram bot started (long-polling)');
  }

  async disconnect(): Promise<void> {
    this.bot.stop('NanoClaw shutdown');
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      // Telegram chat IDs are numeric (possibly negative for groups)
      const numericId = parseInt(chatId, 10);
      await this.bot.telegram.sendMessage(numericId, text);
      logger.info({ chatId, length: text.length }, 'Telegram message sent');
    } catch (err) {
      logger.error({ chatId, err }, 'Failed to send Telegram message');
    }
  }

  async setTyping(chatId: string, isTyping: boolean): Promise<void> {
    if (!isTyping) return; // Telegram only supports "sending" typing, no "stop"
    try {
      const numericId = parseInt(chatId, 10);
      await this.bot.telegram.sendChatAction(numericId, 'typing');
    } catch (err) {
      logger.debug({ chatId, err }, 'Failed to send Telegram typing action');
    }
  }

  async syncChatMetadata(): Promise<void> {
    // Telegram bots can't enumerate all chats — metadata is stored as messages arrive
    logger.debug('Telegram: chat metadata syncs on message receipt (no bulk fetch)');
  }

  ownsChatId(chatId: string): boolean {
    // Telegram chat IDs are purely numeric (positive for private, negative for groups)
    return /^-?\d+$/.test(chatId);
  }

  private handleMessage(ctx: Context): void {
    const msg = ctx.message;
    if (!msg) return;

    const chatId = msg.chat.id.toString();
    const timestamp = new Date(msg.date * 1000).toISOString();

    // Build chat name
    let chatName: string;
    if (msg.chat.type === 'private') {
      chatName = [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(' ');
    } else {
      chatName = (msg.chat as any).title || chatId;
    }

    // Store chat metadata for discovery
    storeChatMetadata(chatId, timestamp, chatName);

    // Build sender info
    const sender = msg.from?.id?.toString() || '';
    const senderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || sender;

    // Extract text content
    const content = (msg as any).text || (msg as any).caption || '';

    if (this.messageHandler) {
      this.messageHandler({
        id: msg.message_id.toString(),
        chatId,
        sender,
        senderName,
        content,
        timestamp,
        isFromMe: msg.from?.id === this.botUserId,
        platform: 'telegram',
      });
    }
  }
}
```

**Notes for the implementer:**
- Telegram bots need **Group Privacy mode disabled** (done in BotFather setup) to see all messages, not just `/commands`
- Chat IDs are numeric: positive for private chats, negative for groups/supergroups
- Unlike WhatsApp, Telegram bots can't enumerate all groups — metadata is captured as messages arrive
- `sendChatAction('typing')` auto-expires after ~5 seconds; call it periodically for long operations

## 6. Create `src/channel-factory.ts`

Create `src/channel-factory.ts` that reads configuration and instantiates the appropriate channel(s).

```typescript
import { Channel } from './channel.js';
import { WhatsAppChannel } from './channels/whatsapp.js';
import { TelegramChannel } from './channels/telegram.js';
import { logger } from './logger.js';

export type ChannelType = 'whatsapp' | 'telegram' | 'both';

export function createChannels(channelType: ChannelType): Channel[] {
  const channels: Channel[] = [];

  if (channelType === 'whatsapp' || channelType === 'both') {
    channels.push(new WhatsAppChannel());
    logger.info('WhatsApp channel enabled');
  }

  if (channelType === 'telegram' || channelType === 'both') {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      logger.error('TELEGRAM_BOT_TOKEN not set in .env — Telegram channel disabled');
    } else {
      channels.push(new TelegramChannel(token));
      logger.info('Telegram channel enabled');
    }
  }

  if (channels.length === 0) {
    throw new Error('No channels configured. Set CHANNEL_TYPE to whatsapp, telegram, or both.');
  }

  return channels;
}
```

## 7. Refactor `src/index.ts`

This is the most involved step. The goal is to replace WhatsApp-specific code with channel-agnostic code.

### 7a. Remove WhatsApp-specific code from `src/index.ts`

**Remove these:**
- baileys imports (lines 5-10)
- `sock` variable (line 59)
- `lidToPhoneMap` and `translateJid` (lines 65, 77-86)
- `setTyping` function (lines 88-94)
- `sendMessage` function (lines 330-337)
- `syncGroupMetadata` function (lines 141-172)
- `connectWhatsApp` function (lines 683-793)
- `ensureContainerSystemRunning` can stay as-is (it's host-side, not channel-specific)

### 7b. Add channel imports and state

Replace the removed code with:

```typescript
import { Channel, ChannelMessage } from './channel.js';
import { ChannelType, createChannels } from './channel-factory.js';

// Active channels
let channels: Channel[] = [];
```

### 7c. Add channel-aware `sendMessage`

The `sendMessage` function needs to find which channel owns the target chat ID:

```typescript
async function sendMessage(chatId: string, text: string): Promise<void> {
  const channel = channels.find((ch) => ch.ownsChatId(chatId));
  if (!channel) {
    logger.error({ chatId }, 'No channel found for chat ID');
    return;
  }
  await channel.sendMessage(chatId, text);
}
```

### 7d. Add channel-aware `setTyping`

```typescript
async function setTyping(chatId: string, isTyping: boolean): Promise<void> {
  const channel = channels.find((ch) => ch.ownsChatId(chatId));
  if (channel) {
    await channel.setTyping(chatId, isTyping);
  }
}
```

### 7e. Add unified message handler

This replaces the `messages.upsert` event handler. It's called by every channel via `onMessage`:

```typescript
function handleIncomingMessage(msg: ChannelMessage): void {
  // Only store full message content for registered groups
  if (registeredGroups[msg.chatId]) {
    // Store directly into the database (bypassing baileys proto format)
    storeMessageRaw(
      msg.id,
      msg.chatId,
      msg.sender,
      msg.senderName,
      msg.content,
      msg.timestamp,
      msg.isFromMe,
    );
  }
}
```

### 7f. Add `storeMessageRaw` to `src/db.ts`

The current `storeMessage` in `src/db.ts` takes a baileys `proto.IWebMessageInfo`. Add a new function that accepts raw fields so both WhatsApp and Telegram can use it:

```typescript
/**
 * Store a message from raw fields (channel-agnostic).
 * Use this instead of storeMessage() when not coming from baileys.
 */
export function storeMessageRaw(
  id: string,
  chatJid: string,
  sender: string,
  senderName: string,
  content: string,
  timestamp: string,
  isFromMe: boolean,
): void {
  db.prepare(
    `INSERT OR REPLACE INTO messages (id, chat_jid, sender, sender_name, content, timestamp, is_from_me) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, chatJid, sender, senderName, content, timestamp, isFromMe ? 1 : 0);
}
```

**Keep the existing `storeMessage` function** — it's still used by the WhatsApp channel for backwards compatibility if desired, but the refactored `index.ts` should use `storeMessageRaw` via the unified message handler.

### 7g. Refactor `syncGroupMetadata`

Move the `syncGroupMetadata` logic into index.ts as a function that calls `syncChatMetadata()` on each channel that supports it:

```typescript
async function syncAllChannelMetadata(force = false): Promise<void> {
  if (!force) {
    const lastSync = getLastGroupSync();
    if (lastSync) {
      const lastSyncTime = new Date(lastSync).getTime();
      if (Date.now() - lastSyncTime < GROUP_SYNC_INTERVAL_MS) {
        logger.debug({ lastSync }, 'Skipping channel metadata sync - synced recently');
        return;
      }
    }
  }

  for (const channel of channels) {
    if (channel.syncChatMetadata) {
      await channel.syncChatMetadata();
    }
  }
  setLastGroupSync();
}
```

### 7h. Refactor `main()` and startup

Replace `connectWhatsApp()` with channel initialization:

```typescript
async function main(): Promise<void> {
  // Container runtime check — only needed if using Apple Container
  // (keep ensureContainerSystemRunning as-is)
  ensureContainerSystemRunning();
  initDatabase();
  logger.info('Database initialized');
  loadState();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    for (const channel of channels) {
      await channel.disconnect();
    }
    await queue.shutdown(10000);
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Read channel type from env (default: whatsapp for backwards compat)
  const channelType = (process.env.CHANNEL_TYPE || 'whatsapp') as ChannelType;
  channels = createChannels(channelType);

  // Register unified message handler on all channels
  for (const channel of channels) {
    channel.onMessage(handleIncomingMessage);
  }

  // Connect all channels
  // WhatsApp needs special handling: its "onConnected" callback triggers the message loop.
  // For Telegram (and other channels), connect() returns immediately after launch.
  let systemStarted = false;

  const startSystems = () => {
    if (systemStarted) return;
    systemStarted = true;

    syncAllChannelMetadata().catch((err) =>
      logger.error({ err }, 'Initial channel metadata sync failed'),
    );
    if (!groupSyncTimerStarted) {
      groupSyncTimerStarted = true;
      setInterval(() => {
        syncAllChannelMetadata().catch((err) =>
          logger.error({ err }, 'Periodic channel metadata sync failed'),
        );
      }, GROUP_SYNC_INTERVAL_MS);
    }
    startSchedulerLoop({
      sendMessage,
      registeredGroups: () => registeredGroups,
      getSessions: () => sessions,
      queue,
      onProcess: (groupJid, proc, containerName) =>
        queue.registerProcess(groupJid, proc, containerName),
    });
    startIpcWatcher();
    queue.setProcessMessagesFn(processGroupMessages);
    recoverPendingMessages();
    startMessageLoop();
  };

  for (const channel of channels) {
    // WhatsApp needs lifecycle callbacks for reconnection behavior
    if ('setLifecycleCallbacks' in channel) {
      (channel as any).setLifecycleCallbacks({
        onConnected: startSystems,
      });
    }
    await channel.connect();
  }

  // If no WhatsApp channel (pure Telegram mode), start systems immediately
  // since Telegram's connect() resolves after bot.launch()
  if (!channels.some((ch) => ch.platformId === 'whatsapp')) {
    startSystems();
  }
}
```

### 7i. Update `getAvailableGroups`

The existing function filters for `@g.us` (WhatsApp groups). Update it to include Telegram chats:

In the `getAvailableGroups` function, change:

```typescript
.filter((c) => c.jid !== '__group_sync__' && c.jid.endsWith('@g.us'))
```

To:

```typescript
.filter((c) => c.jid !== '__group_sync__' && (c.jid.endsWith('@g.us') || /^-?\d+$/.test(c.jid)))
```

This includes both WhatsApp groups (`@g.us`) and Telegram chats (numeric IDs, negative for groups).

## 8. Update Configuration

### 8a. Update `src/config.ts`

Add these exports:

```typescript
export const CHANNEL_TYPE = (process.env.CHANNEL_TYPE || 'whatsapp') as
  | 'whatsapp'
  | 'telegram'
  | 'both';
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
```

### 8b. Update `.env`

Based on the user's chosen mode, add to `.env`:

**Replace mode:**
```
CHANNEL_TYPE=telegram
TELEGRAM_BOT_TOKEN=<token>
```

**Both mode:**
```
CHANNEL_TYPE=both
TELEGRAM_BOT_TOKEN=<token>
```

**Secondary mode:**
```
CHANNEL_TYPE=both
TELEGRAM_BOT_TOKEN=<token>
```

(Secondary vs both is distinguished by which channel holds the main group registration, not by config.)

## 9. Chat ID Design

**No database schema changes needed.** WhatsApp JIDs and Telegram chat IDs are naturally distinct and never collide:

| Platform | Chat ID format | Examples |
|----------|---------------|----------|
| WhatsApp (personal) | `{phone}@s.whatsapp.net` | `14155551234@s.whatsapp.net` |
| WhatsApp (group) | `{id}@g.us` | `120363336345536173@g.us` |
| Telegram (private) | `{positive_number}` | `123456789` |
| Telegram (group) | `{negative_number}` | `-1001234567890` |

The `ownsChatId()` method on each channel determines routing:
- WhatsApp: ends with `@s.whatsapp.net`, `@g.us`, or `@lid`
- Telegram: matches `/^-?\d+$/`

## 10. Build, Test, and Register

### 10a. Build

```bash
npm run build
```

Fix any TypeScript errors before proceeding.

### 10b. Verify Telegram Connection

Start the app briefly (set Bash tool timeout to 15000ms):

```bash
npm run dev
```

The logs should show:
```
Telegram bot authenticated { botUsername: 'your_bot_name' }
Telegram bot started (long-polling)
```

### 10c. Register a Telegram Chat

Tell the user:

> Open Telegram and send a message to your bot (or add it to a group and send a message).
>
> This stores the chat metadata so we can register it.

After the user confirms they've sent a message, query the database:

```bash
sqlite3 store/messages.db "SELECT jid, name FROM chats WHERE jid GLOB '[0-9]*' OR jid GLOB '-[0-9]*' ORDER BY last_message_time DESC LIMIT 10"
```

Show the results and ask the user which Telegram chat to register. Then register it:

**For the main channel (if Telegram is main):**

Write the registered group to `data/registered_groups.json` (or insert directly via SQLite):

```bash
sqlite3 store/messages.db "INSERT OR REPLACE INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger) VALUES ('<CHAT_ID>', 'main', 'main', '@ASSISTANT_NAME', datetime('now'), 0)"
```

**For a regular Telegram group:**

```bash
sqlite3 store/messages.db "INSERT OR REPLACE INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger) VALUES ('<CHAT_ID>', '<GROUP_NAME>', '<FOLDER_NAME>', '@ASSISTANT_NAME', datetime('now'), 1)"
```

Create the group folder:

```bash
mkdir -p groups/<FOLDER_NAME>/logs
```

### 10d. Restart and Test

```bash
npm run build
```

If using launchd:

```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw
```

Or for development:

```bash
npm run dev
```

Tell the user:

> Send `@ASSISTANT_NAME hello` in your registered Telegram chat.
>
> If this is your main channel (or `requiresTrigger` is false), just send `hello`.

Watch logs:

```bash
tail -f logs/nanoclaw.log
```

## 11. Update `CLAUDE.md`

Update the project's `CLAUDE.md` to reflect the new architecture. Add to the Key Files table:

```markdown
| `src/channel.ts` | Channel interface and ChannelMessage type |
| `src/channels/whatsapp.ts` | WhatsApp channel (baileys) |
| `src/channels/telegram.ts` | Telegram channel (telegraf) |
| `src/channel-factory.ts` | Creates channels based on CHANNEL_TYPE env var |
```

Update the Quick Context section:

```markdown
Single Node.js process that connects to messaging channels (WhatsApp and/or Telegram), routes messages to Claude Agent SDK running in Apple Container (Linux VMs). Each group has isolated filesystem and memory.
```

---

## Troubleshooting

### Bot not receiving messages in groups

Telegram bots have "Privacy Mode" enabled by default, which means they only see:
- Messages starting with `/`
- Replies to the bot's own messages
- Messages in groups where the bot is admin

**Fix:** In BotFather, send `/mybots` > select bot > **Bot Settings** > **Group Privacy** > **Turn off**

After disabling privacy mode, **remove and re-add the bot to any existing groups** for the change to take effect.

### "TELEGRAM_BOT_TOKEN not set" error

Verify the `.env` file has the token:
```bash
grep TELEGRAM_BOT_TOKEN .env
```

### Telegram messages stored but no response

1. Check the chat is registered: `sqlite3 store/messages.db "SELECT * FROM registered_groups WHERE jid LIKE '%<chat_id>%'"`
2. Check trigger pattern: if `requires_trigger = 1`, messages need the `@ASSISTANT_NAME` prefix
3. Check logs: `tail -50 logs/nanoclaw.log`

### WhatsApp still works but Telegram doesn't (or vice versa)

- Verify `CHANNEL_TYPE=both` in `.env`
- Check that both channels logged "connected" / "started" in logs
- Verify the chat ID format in the database matches what the channel expects

### "No channel found for chat ID" in logs

The IPC system is trying to send a message to a chat ID that no active channel recognizes. This happens if:
- `CHANNEL_TYPE` doesn't include the platform for that chat
- The chat ID format is unexpected

Check which channels are active and their `ownsChatId` patterns.

---

## Removing Telegram

To revert to WhatsApp-only:

1. Set `CHANNEL_TYPE=whatsapp` in `.env` (or remove the variable entirely)
2. Optionally remove `TELEGRAM_BOT_TOKEN` from `.env`
3. Rebuild and restart:
   ```bash
   npm run build
   launchctl kickstart -k gui/$(id -u)/com.nanoclaw
   ```

The Telegram code stays in the codebase but is never instantiated. To fully remove it:

1. Delete `src/channels/telegram.ts`
2. Remove the Telegram branch from `src/channel-factory.ts`
3. Run `npm uninstall telegraf`
4. Rebuild
