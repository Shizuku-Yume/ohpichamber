import { describe, expect, test } from 'bun:test';
import type { ChatMessageEntry } from './turns/types';
import { getNormalizedMessageForDisplay } from './messageDisplayNormalization';

const message = (parts: ChatMessageEntry['parts']): ChatMessageEntry => ({
    messageId: 'assistant-1', sessionId: 'session-1', turnId: 'turn-1', role: 'assistant', createdAt: 1, parts,
});

describe('display normalization', () => {
    test('keeps an unchanged message as the same object', () => {
        const source = message([{ type: 'text', partId: 'part-1', content: 'hello' }]);
        expect(getNormalizedMessageForDisplay(source)).toBe(source);
        expect(getNormalizedMessageForDisplay(source)).toBe(source);
    });

    test('drops a malformed part and memoizes the copy', () => {
        const malformed = { partId: 'part-bad', content: 'no type' } as unknown as ChatMessageEntry['parts'][number];
        const source = message([{ type: 'text', partId: 'part-1', content: 'hello' }, malformed]);
        const normalized = getNormalizedMessageForDisplay(source);
        expect(normalized).not.toBe(source);
        expect(normalized.parts).toHaveLength(1);
        expect(getNormalizedMessageForDisplay(source)).toBe(normalized);
    });
});
