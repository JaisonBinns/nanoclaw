import { Channel } from './channel.js';
import { NewMessage } from './types.js';

/**
 * Format messages as XML for agent processing.
 * Escapes special characters and wraps in message tags.
 */
export function formatMessagesXml(messages: NewMessage[]): string {
  const escapeXml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const lines = messages.map((m) => {
    return `<message sender="${escapeXml(m.sender_name)}" time="${m.timestamp}">${escapeXml(m.content)}</message>`;
  });

  return `<messages>\n${lines.join('\n')}\n</messages>`;
}

/**
 * Send a message via the channel.
 */
export async function sendMessageViaChannel(
  channel: Channel,
  chatId: string,
  text: string,
): Promise<void> {
  await channel.sendMessage(chatId, text);
}

/**
 * Set typing indicator via the channel.
 */
export async function setTypingViaChannel(
  channel: Channel,
  chatId: string,
  isTyping: boolean,
): Promise<void> {
  await channel.setTyping(chatId, isTyping);
}
