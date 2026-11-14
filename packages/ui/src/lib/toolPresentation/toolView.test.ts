import { afterAll, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import type { JsonValue, ToolCallPart, ToolResultPart } from '@openchamber/agent-contract';

import {
    evalResultSummary,
    normalizeEvalLanguage,
    splitEvalOutput,
    useEvalView,
    type EvalViewData,
    type EvalViewEntry,
} from './toolView';

const browser = new Window({ url: 'http://localhost/' });
for (const [name, value] of Object.entries({
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    Node: browser.Node,
    Element: browser.Element,
    HTMLElement: browser.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
})) {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

afterAll(() => {
    browser.close();
});

function renderEvalViewHook(call: ToolCallPart | undefined, result: ToolResultPart | undefined): EvalViewData {
    let captured: EvalViewData | undefined;
    const TestComponent = () => {
        captured = useEvalView(call, result);
        return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => {
        root.render(React.createElement(TestComponent));
    });
    act(() => {
        root.unmount();
    });
    if (!captured) throw new Error('Hook was not executed');
    return captured;
}

describe('toolView eval presentation', () => {
    test('normalizes eval language names', () => {
        expect(normalizeEvalLanguage('js')).toBe('js');
        expect(normalizeEvalLanguage('javascript')).toBe('js');
        expect(normalizeEvalLanguage('py')).toBe('python');
        expect(normalizeEvalLanguage('python')).toBe('python');
        expect(normalizeEvalLanguage(undefined)).toBe('python');
    });

    test('evalResultSummary formats cells, duration, and tool calls', () => {
        const details: JsonValue = {
            cells: [
                {
                    index: 0,
                    durationMs: 400,
                    statusEvents: [{ op: 'read', chars: 100 }, { op: 'write', chars: 50 }],
                },
                {
                    index: 1,
                    durationMs: 800,
                    statusEvents: [{ op: 'run', cmd: 'ls' }, { op: 'grep', count: 5 }],
                },
            ],
            statusEvents: [{ op: 'log', message: 'hello' }],
        };

        expect(evalResultSummary(details)).toBe('2 cells · 1.2s · 4 tool calls');
        expect(evalResultSummary({ cells: [{ index: 0, durationMs: 250 }] })).toBe('1 cell · 250ms');
        expect(evalResultSummary({ cells: [{ index: 0 }] })).toBe('1 cell');
        expect(evalResultSummary({})).toBeNull();
        expect(evalResultSummary(undefined)).toBeNull();
        const mockT = (key: string, params?: Record<string, unknown>) => {
            if (key === 'chat.eval.cells') return `${params?.count} 个单元格`;
            if (key === 'chat.eval.toolCalls') return `${params?.count} 次工具调用`;
            return key;
        };
        expect(evalResultSummary(details, mockT)).toBe('2 个单元格 · 1.2s · 4 次工具调用');
    });

    test('splitEvalOutput splits text around views in print order', () => {
        const tableEntry: EvalViewEntry = {
            text: '| col1 | col2 |\n| --- | --- |\n| a | b |',
            view: {
                kind: 'table',
                columns: [{ head: 'col1' }, { head: 'col2', numeric: true }],
                rows: [['a', 'b']],
            },
        };
        const jsonEntry: EvalViewEntry = {
            text: '{"result": 42}',
            view: {
                kind: 'json',
                value: { result: 42 },
            },
        };

        const output = `Starting computation...\n${tableEntry.text}\n intermediate log \n${jsonEntry.text}\nCompleted.`;
        const parts = splitEvalOutput(output, [tableEntry, jsonEntry]);

        expect(parts.length).toBe(5);
        expect(parts[0]).toEqual({ kind: 'text', text: 'Starting computation...' });
        expect(parts[1]).toEqual({ kind: 'view', view: tableEntry.view });
        expect(parts[2]).toEqual({ kind: 'text', text: ' intermediate log ' });
        expect(parts[3]).toEqual({ kind: 'view', view: jsonEntry.view });
        expect(parts[4]).toEqual({ kind: 'text', text: 'Completed.' });
    });

    test('useEvalView falls back to call.input as one pending cell before results', () => {
        const call: ToolCallPart = {
            type: 'tool_call',
            partId: 'call-1',
            toolCallId: 'call-1',
            toolName: 'eval',
            input: {
                title: 'Data processing',
                language: 'py',
                code: 'print("hello world")',
            },
            status: 'running',
        };

        const result = renderEvalViewHook(call, undefined);
        expect(result.isRunning).toBe(true);
        expect(result.isFailed).toBe(false);
        expect(result.cells.length).toBe(1);
        expect(result.cells[0]).toEqual({
            index: 0,
            title: 'Data processing',
            code: 'print("hello world")',
            language: 'python',
            output: '',
            status: 'running',
        });
    });

    test('useEvalView parses full eval details with multi-cells, duration, and events', () => {
        const call: ToolCallPart = {
            type: 'tool_call',
            partId: 'call-1',
            toolCallId: 'call-1',
            toolName: 'eval',
            input: { code: '...' },
            status: 'completed',
        };

        const toolResult: ToolResultPart = {
            type: 'tool_result',
            partId: 'res-1',
            toolCallId: 'call-1',
            toolName: 'eval',
            isError: false,
            output: {
                content: [{ type: 'text', text: 'done' }],
                details: {
                    cells: [
                        {
                            index: 0,
                            title: 'Step 1',
                            code: 'const a = 1;',
                            language: 'js',
                            output: '1',
                            status: 'complete',
                            durationMs: 150,
                            statusEvents: [{ op: 'read', path: 'src/file.ts', chars: 50 }],
                        },
                        {
                            index: 1,
                            title: 'Step 2',
                            code: 'raise RuntimeError("bad")',
                            language: 'py',
                            output: 'Traceback...',
                            status: 'error',
                            durationMs: 300,
                            exitCode: 1,
                        },
                    ],
                    replies: ['Here is an out:// mid-turn reply'],
                    notice: 'Execution finished with errors',
                },
            },
        };

        const result = renderEvalViewHook(call, toolResult);
        expect(result.isRunning).toBe(false);
        expect(result.isFailed).toBe(true);
        expect(result.cells.length).toBe(2);
        expect(result.cells[0]?.status).toBe('complete');
        expect(result.cells[0]?.language).toBe('js');
        expect(result.cells[1]?.status).toBe('error');
        expect(result.cells[1]?.exitCode).toBe(1);
        expect(result.totalDurationMs).toBe(450);
        expect(result.toolCallCount).toBe(1);
        expect(result.replies).toEqual(['Here is an out:// mid-turn reply']);
        expect(result.notice).toBe('Execution finished with errors');
    });
});
