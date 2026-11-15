import { describe, expect, test } from 'bun:test';

import { cleanReasoningText } from './reasoningText';

describe('cleanReasoningText', () => {
    test('keeps a blank line between paragraphs', () => {
        expect(cleanReasoningText('A\n\nB')).toBe('A\n\nB');
    });

    test('keeps a single newline inside a paragraph', () => {
        expect(cleanReasoningText('A\nB')).toBe('A\nB');
    });

    test('turns an invisible-only line into a blank line that still separates paragraphs', () => {
        expect(cleanReasoningText('A\n\u200b\nB')).toBe('A\n\nB');
    });

    test('collapses runs of blank lines to one', () => {
        expect(cleanReasoningText('A\n\n\n\nB')).toBe('A\n\nB');
        expect(cleanReasoningText('A\n   \n\t\n\n\nB')).toBe('A\n\nB');
    });

    test('keeps fenced code verbatim, including blank lines and comment-looking lines', () => {
        const input = 'Before\n```\nline  \n\n<!-- -->\n\nlast\n```\nAfter';
        expect(cleanReasoningText(input)).toBe(input);
    });

    test('keeps a tilde fence verbatim too', () => {
        const input = '~~~md\n\n<!-- -->\n~~~';
        expect(cleanReasoningText(input)).toBe(input);
    });

    test('removes empty HTML comment sentinel lines outside fences', () => {
        expect(cleanReasoningText('A\n<!-- -->\nB')).toBe('A\nB');
        expect(cleanReasoningText('A\n\n<!-- -->')).toBe('A');
        expect(cleanReasoningText('A\n\n<!-- -->\n\nB')).toBe('A\n\nB');
    });

    test('removes an inline empty comment from prose', () => {
        expect(cleanReasoningText('Plan the work <!-- --> now')).toBe('Plan the work  now');
    });

    test('strips a leading blockquote marker from each line', () => {
        expect(cleanReasoningText('> A\n>\n> B')).toBe('A\n\nB');
    });

    test('trims the whole text', () => {
        expect(cleanReasoningText('\n\n  A  \n\n')).toBe('A');
    });

    test('returns empty text for invisible-only input', () => {
        expect(cleanReasoningText('')).toBe('');
        expect(cleanReasoningText('\u200b\u00a0 ')).toBe('');
    });
});
