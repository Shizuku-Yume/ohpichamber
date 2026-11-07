import type { Message, Turn } from '@openchamber/agent-contract';

export interface LatestReply {
 messageId: string;
 text: string;
}

export const extractMessageText = (message: Message): string => {
 return message.parts
  .filter((part): part is { type: 'text'; partId: string; content: string } => part.type === 'text' && typeof part.content === 'string')
  .map((part) => part.content)
  .join('')
  .trim();
};

const toMessageMap = (
 messages: readonly Message[] | ReadonlyMap<string, Message>,
): ReadonlyMap<string, Message> => {
 if ('get' in messages && typeof messages.get === 'function') {
  return messages;
 }
 const map = new Map<string, Message>();
 for (const m of messages as readonly Message[]) map.set(m.messageId, m);
 return map;
};

/**
 * Returns the newest completed answer from authoritative Turn state.
 * Only turns whose status is 'completed' qualify; steps still running,
 * failed, or awaiting input are excluded.
 */
export const findLatestCompletedReply = (
 turns: readonly Turn[],
 messages: readonly Message[] | ReadonlyMap<string, Message>,
): LatestReply | null => {
 const messageMap = toMessageMap(messages);
 for (let i = turns.length - 1; i >= 0; i -= 1) {
  const turn = turns[i];
  if (!turn || turn.status !== 'completed') continue;
  for (let j = turn.assistantMessageIds.length - 1; j >= 0; j -= 1) {
   const messageId = turn.assistantMessageIds[j];
   const message = messageMap.get(messageId);
   if (!message || message.role !== 'assistant') continue;
   const text = extractMessageText(message);
   if (text) return { messageId, text };
  }
 }
 return null;
};

/**
 * Returns all completed reply IDs across completed turns, for the auto-read history baseline.
 */
export const findCompletedReplyIds = (
 turns: readonly Turn[],
 messages: readonly Message[] | ReadonlyMap<string, Message>,
): string[] => {
 const messageMap = toMessageMap(messages);
 const ids: string[] = [];
 for (const turn of turns) {
  if (turn.status !== 'completed') continue;
  for (const messageId of turn.assistantMessageIds) {
   const message = messageMap.get(messageId);
   if (!message || message.role !== 'assistant') continue;
   if (extractMessageText(message)) ids.push(messageId);
  }
 }
 return ids;
};
