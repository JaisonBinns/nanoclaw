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
    logger.info(
      { botUsername: botInfo.username },
      'Telegram bot authenticated',
    );

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
    logger.debug(
      'Telegram: chat metadata syncs on message receipt (no bulk fetch)',
    );
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
      chatName = [msg.chat.first_name, msg.chat.last_name]
        .filter(Boolean)
        .join(' ');
    } else {
      chatName = (msg.chat as any).title || chatId;
    }

    // Store chat metadata for discovery
    storeChatMetadata(chatId, timestamp, chatName);

    // Build sender info
    const sender = msg.from?.id?.toString() || '';
    const senderName =
      [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') ||
      sender;

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
