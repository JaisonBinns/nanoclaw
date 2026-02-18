import { Channel } from './channel.js';
import { NewMessage } from './types.js';

/**
 * Escape XML special characters.
 */
export function escapeXml(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format messages as XML for agent processing.
 * Escapes special characters and wraps in message tags.
 */
export function formatMessagesXml(messages: NewMessage[]): string {
  const lines = messages.map((m) => {
    return `<message sender="${escapeXml(m.sender_name)}" time="${m.timestamp}">${escapeXml(m.content)}</message>`;
  });

  return `<messages>\n${lines.join('\n')}\n</messages>`;
}

/**
 * Alias for backwards compatibility.
 */
export function formatMessages(messages: NewMessage[]): string {
  return formatMessagesXml(messages);
}

/**
 * Strip internal reasoning blocks from agent output.
 */
export function stripInternalTags(text: string): string {
  return text.replace(/<internal>[\s\S]*?<\/internal>/g, '').trim();
}

/**
 * Format outbound text by stripping internal tags.
 */
export function formatOutbound(rawText: string): string {
  const text = stripInternalTags(rawText);
  if (!text) return '';
  return text;
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
