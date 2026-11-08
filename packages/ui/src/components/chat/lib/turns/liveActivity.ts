import type { Part } from '@openchamber/agent-contract';
import { fenceUiBlocks } from '../../uiBlocks/taggedBlocks';
import type { ChatMessageEntry, TurnRecord } from './types';

/** A queued user message alone does not retire the previous turn. */
export function getTurnsWithLaterAssistant(turns: readonly TurnRecord[]): Set<string> {
    const retired = new Set<string>();
    let hasLaterAssistant = false;
    for (let index = turns.length - 1; index >= 0; index--) {
        const turn = turns[index];
        if (hasLaterAssistant) retired.add(turn.turnId);
        hasLaterAssistant ||= turn.assistantMessages.length > 0;
    }
    return retired;
}

export function getLiveFinalMessage(messages: readonly ChatMessageEntry[]): ChatMessageEntry | undefined {
    // System records do not retire a visible assistant response.
    let last: ChatMessageEntry | undefined;
    for (let index = messages.length - 1; index >= 0; index--) {
        if (messages[index].role !== 'system') {
            last = messages[index];
            break;
        }
    }
    return last?.role === 'assistant'
        && !last.parts.some((part) => part.type === 'tool_call')
        && last.parts.some((part) => part.type === 'text' && part.content.trim().length > 0)
        ? last : undefined;
}

export function hasLiveActivity(turn: TurnRecord, showReasoning: boolean): boolean {
    if (turn.hasTools || (showReasoning && turn.hasReasoning)) return true;
    return turn.activitySegments?.some((segment) => segment.parts.some((activity) => (
        activity.kind === 'tool' || (showReasoning && activity.kind === 'reasoning')
    ))) ?? false;
}

/** Something a turn showed the user that a collapsed Activity never folds away. */
export type ShownPart = Extract<Part, { type: 'tool_call' } | { type: 'text' }>;

// An opening `openui-lang` fence; `openui-lang literal` is a code sample and stays text.
const UI_BLOCK_FENCE = /^ {0,3}(`{3,}|~{3,})openui-lang[ \t]*$/m;

/**
 * What a turn showed the user, in order: text carrying a native UI block that
 * the agent wrote before a later step, and a call still waiting on an answer.
 * The final answer's own text is the answer, so it is never hoisted.
 */
export function getShownPages(messages: readonly ChatMessageEntry[], finalMessage?: ChatMessageEntry): ShownPart[] {
    const shown: ShownPart[] = [];
    for (const message of messages) {
        for (const part of message.parts) {
            if (part.type === 'tool_call') {
                if (part.status === 'pending_approval' || part.status === 'approved' || part.status === 'running') shown.push(part);
            } else if (part.type === 'text' && message !== finalMessage && UI_BLOCK_FENCE.test(fenceUiBlocks(part.content))) {
                shown.push(part);
            }
        }
    }
    return shown;
}
