import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  ASSISTANT_NAME,
  DATA_DIR,
  MAIN_GROUP_FOLDER,
  POLL_INTERVAL,
  TRIGGER_PATTERN,
} from './config.js';
import {
  AgentResponse,
  AvailableGroup,
  runContainerAgent,
  writeGroupsSnapshot,
  writeTasksSnapshot,
} from './container-runner.js';
import {
  getAllChats,
  getAllRegisteredGroups,
  getAllSessions,
  getAllTasks,
  getLastGroupSync,
  getMessagesSince,
  getNewMessages,
  getRouterState,
  initDatabase,
  setLastGroupSync,
  setRegisteredGroup,
  setRouterState,
  setSession,
  storeMessageRaw,
} from './db.js';
import { GroupQueue } from './group-queue.js';
import { startSchedulerLoop } from './task-scheduler.js';
import { RegisteredGroup } from './types.js';
import { logger } from './logger.js';
import { Channel, ChannelMessage } from './channel.js';
import { TelegramChannel } from './channels/telegram.js';
import { formatMessagesXml, setTypingViaChannel } from './router.js';
import { startIpcWatcher } from './ipc.js';

const GROUP_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let channel: Channel;
let lastTimestamp = '';
let sessions: Record<string, string> = {};
let registeredGroups: Record<string, RegisteredGroup> = {};
let lastAgentTimestamp: Record<string, string> = {};
// Guards to prevent duplicate loops
let messageLoopRunning = false;
let groupSyncTimerStarted = false;

const queue = new GroupQueue();

async function setTyping(chatId: string, isTyping: boolean): Promise<void> {
  await setTypingViaChannel(channel, chatId, isTyping);
}

function loadState(): void {
  // Load from SQLite (migration from JSON happens in initDatabase)
  lastTimestamp = getRouterState('last_timestamp') || '';
  const agentTs = getRouterState('last_agent_timestamp');
  try {
    lastAgentTimestamp = agentTs ? JSON.parse(agentTs) : {};
  } catch {
    logger.warn('Corrupted last_agent_timestamp in DB, resetting');
    lastAgentTimestamp = {};
  }
  sessions = getAllSessions();
  registeredGroups = getAllRegisteredGroups();
  logger.info(
    { groupCount: Object.keys(registeredGroups).length },
    'State loaded',
  );
}

function saveState(): void {
  setRouterState('last_timestamp', lastTimestamp);
  setRouterState(
    'last_agent_timestamp',
    JSON.stringify(lastAgentTimestamp),
  );
}

function registerGroup(jid: string, group: RegisteredGroup): void {
  registeredGroups[jid] = group;
  setRegisteredGroup(jid, group);

  // Create group folder
  const groupDir = path.join(DATA_DIR, '..', 'groups', group.folder);
  fs.mkdirSync(path.join(groupDir, 'logs'), { recursive: true });

  logger.info(
    { jid, name: group.name, folder: group.folder },
    'Group registered',
  );
}

/**
 * Sync channel metadata.
 * For Telegram, metadata is captured as messages arrive (no bulk fetch).
 */
async function syncChannelMetadata(force = false): Promise<void> {
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

  if (channel.syncChatMetadata) {
    await channel.syncChatMetadata();
  }
  setLastGroupSync();
}

/**
 * Get available groups list for the agent.
 * Returns groups ordered by most recent activity.
 */
function getAvailableGroups(): AvailableGroup[] {
  const chats = getAllChats();
  const registeredJids = new Set(Object.keys(registeredGroups));

  return chats
    .filter((c) => c.jid !== '__group_sync__')
    .map((c) => ({
      jid: c.jid,
      name: c.name,
      lastActivity: c.last_message_time,
      isRegistered: registeredJids.has(c.jid),
    }));
}

/**
 * Handle incoming messages from the channel.
 * Stores messages for registered groups.
 */
function handleIncomingMessage(msg: ChannelMessage): void {
  if (registeredGroups[msg.chatId]) {
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

/**
 * Process all pending messages for a group.
 * Called by the GroupQueue when it's this group's turn.
 */
async function processGroupMessages(chatJid: string): Promise<boolean> {
  const group = registeredGroups[chatJid];
  if (!group) return true;

  const isMainGroup = group.folder === MAIN_GROUP_FOLDER;

  // Get all messages since last agent interaction
  const sinceTimestamp = lastAgentTimestamp[chatJid] || '';
  const missedMessages = getMessagesSince(
    chatJid,
    sinceTimestamp,
    ASSISTANT_NAME,
  );

  if (missedMessages.length === 0) return true;

  // For non-main groups, check if trigger is required and present
  if (!isMainGroup && group.requiresTrigger !== false) {
    const hasTrigger = missedMessages.some((m) =>
      TRIGGER_PATTERN.test(m.content.trim()),
    );
    if (!hasTrigger) return true;
  }

  const prompt = formatMessagesXml(missedMessages);

  logger.info(
    { group: group.name, messageCount: missedMessages.length },
    'Processing messages',
  );

  await setTyping(chatJid, true);
  const response = await runAgent(group, prompt, chatJid);
  await setTyping(chatJid, false);

  if (response === 'error') {
    // Container or agent error — signal failure so queue can retry with backoff
    return false;
  }

  // Agent processed messages successfully (whether it responded or stayed silent)
  lastAgentTimestamp[chatJid] =
    missedMessages[missedMessages.length - 1].timestamp;
  saveState();

  if (response.outputType === 'message' && response.userMessage) {
    await sendMessage(chatJid, `${ASSISTANT_NAME}: ${response.userMessage}`);
  }

  if (response.internalLog) {
    logger.info(
      { group: group.name, outputType: response.outputType },
      `Agent: ${response.internalLog}`,
    );
  }

  return true;
}

async function runAgent(
  group: RegisteredGroup,
  prompt: string,
  chatJid: string,
): Promise<AgentResponse | 'error'> {
  const isMain = group.folder === MAIN_GROUP_FOLDER;
  const sessionId = sessions[group.folder];

  // Update tasks snapshot for container to read (filtered by group)
  const tasks = getAllTasks();
  writeTasksSnapshot(
    group.folder,
    isMain,
    tasks.map((t) => ({
      id: t.id,
      groupFolder: t.group_folder,
      prompt: t.prompt,
      schedule_type: t.schedule_type,
      schedule_value: t.schedule_value,
      status: t.status,
      next_run: t.next_run,
    })),
  );

  // Update available groups snapshot (main group only can see all groups)
  const availableGroups = getAvailableGroups();
  writeGroupsSnapshot(
    group.folder,
    isMain,
    availableGroups,
    new Set(Object.keys(registeredGroups)),
  );

  try {
    const output = await runContainerAgent(
      group,
      {
        prompt,
        sessionId,
        groupFolder: group.folder,
        chatJid,
        isMain,
      },
      (proc, containerName) => queue.registerProcess(chatJid, proc, containerName),
    );

    if (output.newSessionId) {
      sessions[group.folder] = output.newSessionId;
      setSession(group.folder, output.newSessionId);
    }

    if (output.status === 'error') {
      logger.error(
        { group: group.name, error: output.error },
        'Container agent error',
      );
      return 'error';
    }

    return output.result ?? { outputType: 'log' };
  } catch (err) {
    logger.error({ group: group.name, err }, 'Agent error');
    return 'error';
  }
}

async function sendMessage(chatId: string, text: string): Promise<void> {
  await channel.sendMessage(chatId, text);
}



async function startMessageLoop(): Promise<void> {
  if (messageLoopRunning) {
    logger.debug('Message loop already running, skipping duplicate start');
    return;
  }
  messageLoopRunning = true;

  logger.info(`NanoClaw running (trigger: @${ASSISTANT_NAME})`);

  while (true) {
    try {
      const jids = Object.keys(registeredGroups);
      const { messages, newTimestamp } = getNewMessages(
        jids,
        lastTimestamp,
        ASSISTANT_NAME,
      );

      if (messages.length > 0) {
        logger.info({ count: messages.length }, 'New messages');

        // Advance the "seen" cursor for all messages immediately
        lastTimestamp = newTimestamp;
        saveState();

        // Deduplicate by group and enqueue
        const groupsWithMessages = new Set<string>();
        for (const msg of messages) {
          groupsWithMessages.add(msg.chat_jid);
        }

        for (const chatJid of groupsWithMessages) {
          queue.enqueueMessageCheck(chatJid);
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in message loop');
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

/**
 * Startup recovery: check for unprocessed messages in registered groups.
 * Handles crash between advancing lastTimestamp and processing messages.
 */
function recoverPendingMessages(): void {
  for (const [chatJid, group] of Object.entries(registeredGroups)) {
    const sinceTimestamp = lastAgentTimestamp[chatJid] || '';
    const pending = getMessagesSince(chatJid, sinceTimestamp, ASSISTANT_NAME);
    if (pending.length > 0) {
      logger.info(
        { group: group.name, pendingCount: pending.length },
        'Recovery: found unprocessed messages',
      );
      queue.enqueueMessageCheck(chatJid);
    }
  }
}

function ensureContainerSystemRunning(): void {
  // Verify Docker is available and running
  try {
    execSync('docker info', { stdio: 'pipe' });
    logger.debug('Docker is running');
  } catch (err) {
    logger.error({ err }, 'Docker is not available or not running');
    console.error(
      '\n╔════════════════════════════════════════════════════════════════╗',
    );
    console.error(
      '║  FATAL: Docker is required but not available                   ║',
    );
    console.error(
      '║                                                                ║',
    );
    console.error(
      '║  Agents cannot run without Docker. To fix:                    ║',
    );
    console.error(
      '║  1. Install Docker Desktop for Mac                            ║',
    );
    console.error(
      '║  2. Start Docker Desktop                                      ║',
    );
    console.error(
      '║  3. Restart NanoClaw                                          ║',
    );
    console.error(
      '╚════════════════════════════════════════════════════════════════╝\n',
    );
    throw new Error('Docker is required but not available');
  }

  // Clean up stopped NanoClaw containers from previous runs
  try {
    const output = execSync('docker ps -a --format {{.Names}}', {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    });
    const stale = output
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.startsWith('nanoclaw-'));
    if (stale.length > 0) {
      execSync(`docker rm ${stale.join(' ')}`, { stdio: 'pipe' });
      logger.info({ count: stale.length }, 'Cleaned up stopped containers');
    }
  } catch {
    // No stopped containers or ls/rm not supported
  }
}

async function main(): Promise<void> {
  ensureContainerSystemRunning();
  initDatabase();
  logger.info('Database initialized');
  loadState();

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    await channel.disconnect();
    await queue.shutdown(10000);
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Create Telegram channel
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.error('TELEGRAM_BOT_TOKEN not set in .env');
    process.exit(1);
  }
  channel = new TelegramChannel(token);

  // Register message handler
  channel.onMessage(handleIncomingMessage);

  // Connect to Telegram
  await channel.connect();

  // Start all systems (Telegram connect resolves immediately after bot.launch())
  syncChannelMetadata().catch((err) =>
    logger.error({ err }, 'Initial channel metadata sync failed'),
  );
  if (!groupSyncTimerStarted) {
    groupSyncTimerStarted = true;
    setInterval(() => {
      syncChannelMetadata().catch((err) =>
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
  startIpcWatcher({
    registeredGroups: () => registeredGroups,
    sendMessage,
    syncChannelMetadata,
    getAvailableGroups,
    writeGroupsSnapshot,
    registerGroup,
  });
  queue.setProcessMessagesFn(processGroupMessages);
  recoverPendingMessages();
  startMessageLoop();
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start NanoClaw');
  process.exit(1);
});
