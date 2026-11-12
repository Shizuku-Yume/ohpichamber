import { describe, expect, test } from 'bun:test';

import { holdPartialTableRow } from './streamTextCommit';

const table = [
    '| Tool | Status |',
    '| --- | --- |',
    '| read | done |',
    '| bash | running |',
].join('\n');

describe('holdPartialTableRow', () => {
    test('holds a growing table row and keeps the newline before it', () => {
        expect(holdPartialTableRow(table + '\n| grep |')).toBe(table + '\n');
        expect(holdPartialTableRow(table + '\n| grep | running')).toBe(table + '\n');
    });

    test('releases the row once its line ends', () => {
        expect(holdPartialTableRow(table + '\n| grep | running |\n')).toBe(table + '\n| grep | running |\n');
    });

    test('releases a growing row that follows a closed table', () => {
        const closed = table + '\n\nProse after the table';
        expect(holdPartialTableRow(closed)).toBe(closed);
    });

    test('does not hold prose, a list item or an open fence body', () => {
        const prose = 'A paragraph that is still being written\nand a second line still growing';
        expect(holdPartialTableRow(prose)).toBe(prose);
        expect(holdPartialTableRow('- one\n- tw')).toBe('- one\n- tw');
        expect(holdPartialTableRow('```ts\nconst value = 1;\nconst grow')).toBe('```ts\nconst value = 1;\nconst grow');
    });

    test('a pipe line with no delimiter row above it is no table', () => {
        const text = 'a | b\nc | d';
        expect(holdPartialTableRow(text)).toBe(text);
    });

    test('a delimiter row without a header above it is no table', () => {
        const text = '| --- | --- |\n| cell |';
        expect(holdPartialTableRow(text)).toBe(text);
    });

    test('a table inside an open fence keeps its growing row', () => {
        const fenced = '```md\n| a | b |\n| --- | --- |\n| c |';
        expect(holdPartialTableRow(fenced)).toBe(fenced);
    });

    test('a table after a closed fence holds its growing row again', () => {
        const text = '```md\nnot a table\n```\n\n| a | b |\n| --- | --- |\n| c |';
        expect(holdPartialTableRow(text)).toBe(text.slice(0, text.lastIndexOf('\n') + 1));
    });

    test('outer pipes are optional', () => {
        const text = 'a | b\n--- | ---\nc |';
        expect(holdPartialTableRow(text)).toBe('a | b\n--- | ---\n');
    });

    test('never grows as the text grows', () => {
        const reply = `${table}\n\nAfter the table.\n\n| x | y |\n| - | - |\n| 1 |`;
        let previous = '';
        for (let end = 0; end <= reply.length; end += 1) {
            const held = holdPartialTableRow(reply.slice(0, end));
            expect(held.startsWith(previous)).toBe(true);
            expect(reply.slice(0, end).startsWith(held)).toBe(true);
            previous = held;
        }
        // The last line is still a growing row, so it stays held.
        expect(previous).toBe(reply.slice(0, reply.lastIndexOf('\n') + 1));
    });

    test('empty input and a finished trailing newline stay as they are', () => {
        expect(holdPartialTableRow('')).toBe('');
        expect(holdPartialTableRow(table + '\n')).toBe(table + '\n');
    });
});
