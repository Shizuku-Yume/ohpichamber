import { describe, expect, test } from 'bun:test';

import type { Part } from '@openchamber/agent-contract';
import { earlierAssistantText } from './earlierAssistantText';
import type { ChatMessageEntry } from './types';

const text = (id: string, content: string): Part => ({ type: 'text', partId: id, content });
const glob: Part = {
    type: 'tool_call', partId: 'glob', toolCallId: 'glob', toolName: 'glob',
    input: { pattern: '*.md' }, status: 'completed',
};
const assistant = (id: string, parts: Part[]): ChatMessageEntry => ({
    messageId: id, sessionId: 'session', turnId: 'turn', role: 'assistant', createdAt: 1, parts,
});

describe('earlierAssistantText', () => {
    test('collects the text of every step before the last one, in order, without tools or blank parts', () => {
        const turn = [
            assistant('step-1', [text('a', 'Looking at the files.'), glob]),
            assistant('step-2', [text('b', '  '), glob]),
            assistant('step-3', [text('c', 'Found the scripts.'), glob, text('d', 'Checking one more.')]),
            assistant('answer', [text('e', 'The answer.')]),
        ];
        expect(earlierAssistantText(turn)).toEqual(['Looking at the files.', 'Found the scripts.', 'Checking one more.']);
    });

    test('a turn of one message has no earlier text', () => {
        expect(earlierAssistantText([assistant('answer', [text('e', 'The answer.')])])).toEqual([]);
        expect(earlierAssistantText([])).toEqual([]);
    });

    test('a step that changes is read again', () => {
        const answer = assistant('answer', [text('e', 'The answer.')]);
        const step = assistant('step', [text('a', 'First draft.')]);
        expect(earlierAssistantText([step, answer])).toEqual(['First draft.']);
        const updated = { ...step, parts: [text('a', 'Second draft.')] };
        expect(earlierAssistantText([updated, answer])).toEqual(['Second draft.']);
    });
});
