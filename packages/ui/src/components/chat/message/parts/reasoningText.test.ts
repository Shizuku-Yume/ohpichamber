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

    test('keeps an empty comment that shares its line with prose', () => {
        expect(cleanReasoningText('Plan the work <!-- --> now')).toBe('Plan the work <!-- --> now');
        expect(cleanReasoningText('The sentinel `<!-- -->` is appended')).toBe('The sentinel `<!-- -->` is appended');
    });

    test('closes a fence opened inside a blockquote and de-quotes its body', () => {
        const input = "> Here's why:\n> ```ts\n> const a = 1;\n> ```\n> Done\n\nNext paragraph\n\n<!-- -->\nTail";
        expect(cleanReasoningText(input)).toBe("Here's why:\n```ts\nconst a = 1;\n```\nDone\n\nNext paragraph\n\nTail");
    });

    test('treats a backtick opener with a backtick in its info string as prose', () => {
        // Not a CommonMark fence, so the sentinel line below it is prose and goes.
        expect(cleanReasoningText('```js`b\n<!-- -->\nB')).toBe('```js`b\nB');
        // A tilde fence has no such restriction.
        expect(cleanReasoningText('~~~js`b\n<!-- -->\nB')).toBe('~~~js`b\n<!-- -->\nB');
    });

    test('normalizes CRLF and lone CR line endings, fenced block included', () => {
        expect(cleanReasoningText('A\r\n\r\nB\rC')).toBe('A\n\nB\nC');
        expect(cleanReasoningText('Before\r\n```\r\nline 1\r\n\r\nline 3\r\n```\r\nAfter')).toBe(
            'Before\n```\nline 1\n\nline 3\n```\nAfter',
        );
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
