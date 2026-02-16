/**
 * Unified message type shared across all channels.
 * Platform-specific details are abstracted away.
 */
export interface ChannelMessage {
  id: string;
  chatId: string; // Platform-native ID (WhatsApp JID or Telegram chat ID)
  sender: string; // Platform-native sender ID
  senderName: string; // Human-readable name
  content: string; // Text content (captions for media)
  timestamp: string; // ISO 8601
  isFromMe: boolean;
  platform: string; // 'whatsapp' | 'telegram'
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
