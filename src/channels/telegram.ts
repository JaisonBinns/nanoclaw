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
    const MAX_LENGTH = 4000; // Telegram limit is 4096, use 4000 for safety

    try {
      const numericId = parseInt(chatId, 10);

      // If message fits in one chunk, send directly
      if (text.length <= MAX_LENGTH) {
        await this.bot.telegram.sendMessage(numericId, text);
        logger.info({ chatId, length: text.length }, 'Telegram message sent');
        return;
      }

      // Split into chunks at newline boundaries when possible
      const chunks: string[] = [];
      let remaining = text;

      while (remaining.length > 0) {
        if (remaining.length <= MAX_LENGTH) {
          chunks.push(remaining);
          break;
        }

        // Try to split at a newline near the limit
        const chunk = remaining.slice(0, MAX_LENGTH);
        const lastNewline = chunk.lastIndexOf('\n');

        if (lastNewline > MAX_LENGTH * 0.8) {
          // Good split point found
          chunks.push(remaining.slice(0, lastNewline));
          remaining = remaining.slice(lastNewline + 1);
        } else {
          // No good newline, split at max length
          chunks.push(chunk);
          remaining = remaining.slice(MAX_LENGTH);
        }
      }

      // Send all chunks
      for (let i = 0; i < chunks.length; i++) {
        const prefix = chunks.length > 1 ? `[${i + 1}/${chunks.length}] ` : '';
        await this.bot.telegram.sendMessage(numericId, prefix + chunks[i]);

        // Small delay between chunks to avoid rate limits
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info(
        { chatId, totalLength: text.length, chunks: chunks.length },
        'Telegram message sent (chunked)',
      );
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
