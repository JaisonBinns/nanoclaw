# NanoClaw Setup Guide

Step-by-step walkthrough for getting NanoClaw running and messaging your personal Claude assistant.

## Prerequisites

- macOS (Apple Silicon or Intel) or Linux
- Node.js 20+
- [Claude Code](https://claude.ai/download) installed
- [Apple Container](https://github.com/apple/container/releases) (macOS) or [Docker](https://docker.com/products/docker-desktop) (Linux/macOS)

## Option A: Telegram Setup

This is the path we used to set up Nina. Telegram is simpler to get started with — no phone scanning, no QR codes, just a bot token.

### 1. Clone and install

```bash
git clone https://github.com/gavrielc/nanoclaw.git
cd nanoclaw
npm install
```

### 2. Install the container runtime

**macOS (Apple Container):**
1. Download the latest `.pkg` from https://github.com/apple/container/releases
2. Double-click to install
3. Run `container system start`

**Linux (Docker):**
Docker should already be installed. If not: `sudo apt install docker.io`

### 3. Configure Claude authentication

You need either a Claude subscription token or an Anthropic API key.

**Claude subscription (Pro/Max):**
```bash
# In a separate terminal:
claude setup-token
# Copy the token, then:
echo "CLAUDE_CODE_OAUTH_TOKEN=<your-token>" > .env
```

**API key:**
```bash
echo "ANTHROPIC_API_KEY=<your-key>" > .env
```

### 4. Build the agent container

```bash
./container/build.sh
```

This creates the `nanoclaw-agent:latest` image with Node.js, Chromium, Claude Code CLI, and browser automation tools. Takes a few minutes on first build.

### 5. Create a Telegram bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a display name (e.g., "Nina Assistant")
4. Choose a username ending in `bot` (e.g., `nina_nanoclaw_bot`)
5. Copy the token BotFather gives you (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

**Important:** Disable privacy mode so the bot can see all group messages:
- Send `/mybots` to BotFather
- Select your bot > **Bot Settings** > **Group Privacy** > **Turn off**

### 6. Install Telegram dependencies

```bash
npm install telegraf dotenv
```

### 7. Run the `/add-telegram` skill

Open Claude Code in the project directory and run:

```bash
claude
```

Then type `/add-telegram`. The skill will:
- Ask how you want to add Telegram (replace WhatsApp / alongside / secondary)
- Collect your bot token
- Create the channel abstraction layer (`src/channel.ts`)
- Create `src/channels/telegram.ts`
- Refactor `src/index.ts` to use Telegram instead of WhatsApp
- Add `storeMessageRaw()` to `src/db.ts` for channel-agnostic storage
- Update your `.env` with the bot token

Or do it manually by adding to `.env`:
```
TELEGRAM_BOT_TOKEN=<your-bot-token>
ASSISTANT_NAME=Nina
```

### 8. Build

```bash
npm run build
```

### 9. Start and register your chat

```bash
npm run dev
```

You should see:
```
Telegram bot authenticated { botUsername: 'nina_nanoclaw_bot' }
Telegram bot started (long-polling)
NanoClaw running (trigger: @Nina)
```

Now open Telegram and send any message to your bot. This stores the chat metadata. Then register it as your main channel:

```bash
# Find your chat ID
sqlite3 store/messages.db "SELECT jid, name FROM chats ORDER BY last_message_time DESC LIMIT 5"

# Register it (replace CHAT_ID with the number from above)
sqlite3 store/messages.db "INSERT OR REPLACE INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger) VALUES ('CHAT_ID', 'main', 'main', '@Nina', datetime('now'), 0)"

# Create the group folder
mkdir -p groups/main/logs
```

Restart the app (`Ctrl+C`, then `npm run dev`) and send another message. Nina should respond.

### 10. Set up as a persistent service (macOS)

```bash
npm run build

NODE_PATH=$(which node)
PROJECT_PATH=$(pwd)
HOME_PATH=$HOME
mkdir -p logs

cat > ~/Library/LaunchAgents/com.nanoclaw.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.nanoclaw</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${PROJECT_PATH}/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_PATH}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:${HOME_PATH}/.local/bin</string>
        <key>HOME</key>
        <string>${HOME_PATH}</string>
    </dict>
    <key>StandardOutPath</key>
    <string>${PROJECT_PATH}/logs/nanoclaw.log</string>
    <key>StandardErrorPath</key>
    <string>${PROJECT_PATH}/logs/nanoclaw.error.log</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
```

Verify it's running:
```bash
launchctl list | grep nanoclaw
```

### Done

Send a message to your bot on Telegram. Nina is always on.

Service management:
- **Restart:** `launchctl kickstart -k gui/$(id -u)/com.nanoclaw`
- **Stop:** `launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist`
- **Logs:** `tail -f logs/nanoclaw.log`

---

## Option B: WhatsApp Setup (Default)

WhatsApp is the default channel that ships with NanoClaw. No code changes needed — just clone and run `/setup`.

### 1. Clone and install

```bash
git clone https://github.com/gavrielc/nanoclaw.git
cd nanoclaw
npm install
```

### 2. Install the container runtime

Same as Telegram setup (step 2 above).

### 3. Configure Claude authentication

Same as Telegram setup (step 3 above).

### 4. Build the agent container

```bash
./container/build.sh
```

### 5. Authenticate WhatsApp

```bash
npm run auth
```

A QR code will appear in the terminal. On your phone:
1. Open WhatsApp
2. Tap **Settings > Linked Devices > Link a Device**
3. Scan the QR code

The script will print "Successfully authenticated" when done.

### 6. Build and start briefly

```bash
npm run build
npm run dev
```

Let it run for a few seconds to sync your WhatsApp group metadata, then stop it (`Ctrl+C`).

### 7. Register your main channel

Your main channel should be a personal chat (Message Yourself) or a solo WhatsApp group — this is your admin control portal.

**For personal chat (Message Yourself):**
```bash
# Use your phone number with country code, no + or spaces
sqlite3 store/messages.db "INSERT OR REPLACE INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger) VALUES ('14155551234@s.whatsapp.net', 'main', 'main', '@Andy', datetime('now'), 0)"
```

**For a group:**
```bash
# Find the group
sqlite3 store/messages.db "SELECT jid, name FROM chats WHERE jid LIKE '%@g.us' ORDER BY last_message_time DESC LIMIT 10"

# Register it (replace JID with the one from above)
sqlite3 store/messages.db "INSERT OR REPLACE INTO registered_groups (jid, name, folder, trigger_pattern, added_at, requires_trigger) VALUES ('JID_HERE', 'main', 'main', '@Andy', datetime('now'), 0)"
```

Create the group folder:
```bash
mkdir -p groups/main/logs
```

### 8. Set up as a persistent service

Same as Telegram setup (step 10 above).

### 9. Test

Send `@Andy hello` in a registered group, or just `hello` in your main channel (no trigger prefix needed there).

### Done

Service management is the same as Telegram:
- **Restart:** `launchctl kickstart -k gui/$(id -u)/com.nanoclaw`
- **Stop:** `launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist`
- **Logs:** `tail -f logs/nanoclaw.log`
- **Re-auth WhatsApp:** `npm run auth` (if you get disconnected)

---

## The Easier Way

Both paths above can be mostly automated. Just:

```bash
git clone https://github.com/gavrielc/nanoclaw.git
cd nanoclaw
claude
```

Then run `/setup` for WhatsApp, or `/add-telegram` for Telegram. Claude Code handles the rest interactively.
