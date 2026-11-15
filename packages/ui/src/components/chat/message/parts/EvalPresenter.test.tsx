import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { Window } from 'happy-dom';
import type { ToolCallPart, ToolResultPart } from '@openchamber/agent-contract';

const browser = new Window({ url: 'http://localhost/' });
for (const [name, value] of Object.entries({
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    localStorage: browser.localStorage,
    Node: browser.Node,
    Element: browser.Element,
    HTMLElement: browser.HTMLElement,
    requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
    cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
    IS_REACT_ACT_ENVIRONMENT: true,
})) {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

mock.module('../../markdown/markdown-shiki.worker.ts?worker&url', () => ({ default: 'blob:test-shiki-worker' }));
mock.module('@/components/chat/markdown/markdown-shiki.worker.ts?worker&url', () => ({ default: 'blob:test-shiki-worker' }));

// Loaded dynamically after DOM globals and worker shims are initialized.
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { ThemeSystemContext } = await import('@/contexts/theme-system-context');
const { SyncProvider } = await import('@/sync/sync-context');
const { getDefaultTheme } = await import('@/lib/theme/themes');
const { loadMarkdownRendererModule } = await import('@/components/chat/markdownRendererLoader');
const { EvalPresenter } = await import('./EvalPresenter');

const unexpectedChange = (): never => { throw new Error('Theme should not change'); };
const defaultTheme = getDefaultTheme(false);
const themeContext = {
    currentTheme: defaultTheme,
    availableThemes: [defaultTheme],
    setTheme: unexpectedChange,
    customThemesLoading: false,
    reloadCustomThemes: unexpectedChange,
    importTheme: unexpectedChange,
    deleteImportedTheme: unexpectedChange,
    customThemeIds: [],
    isSystemPreference: false,
    setSystemPreference: unexpectedChange,
    themeMode: 'light' as const,
    setThemeMode: unexpectedChange,
    lightThemeId: defaultTheme.metadata.id,
    darkThemeId: getDefaultTheme(true).metadata.id,
    setLightThemePreference: unexpectedChange,
    setDarkThemePreference: unexpectedChange,
};

beforeAll(async () => {
    await loadMarkdownRendererModule();
});
afterAll(() => {
    browser.close();
});

describe('EvalPresenter component', () => {
    test('renders pending single cell from call.input before results arrive', () => {
        const call: ToolCallPart = {
            type: 'tool_call',
            partId: 'call-1',
            toolCallId: 'call-1',
            toolName: 'eval',
            input: {
                title: 'Data setup',
                language: 'py',
                code: 'import math\nprint(math.pi)',
            },
            status: 'running',
        };

        const container = document.createElement('div');
        const root = createRoot(container);
        act(() => {
            root.render(
                <SyncProvider directory="/workspace">
                    <I18nProvider>
                        <ThemeSystemContext.Provider value={themeContext}>
                            <EvalPresenter call={call} result={undefined} />
                        </ThemeSystemContext.Provider>
                    </I18nProvider>
                </SyncProvider>
            );
        });

        const presenter = container.querySelector('[data-testid="eval-presenter"]');
        expect(presenter).not.toBeNull();

        const cells = container.querySelectorAll('[data-testid="eval-cell-block"]');
        expect(cells.length).toBe(1);
        expect(cells[0]?.textContent).toContain('Data setup');
        expect(cells[0]?.textContent).toContain('python');
        expect(cells[0]?.textContent).toContain('import math');

        act(() => root.unmount());
    });

    test('renders multiple cells with captions, status, highlighted code, step timeline, views and failure marker', () => {
        const call: ToolCallPart = {
            type: 'tool_call',
            partId: 'call-eval-multi',
            toolCallId: 'eval-1',
            toolName: 'eval',
            input: { title: 'Three cell eval' },
            status: 'completed',
        };

        const longCode = Array.from({ length: 45 }, (_, i) => `const line${i} = ${i};`).join('\n');

        const result: ToolResultPart = {
            type: 'tool_result',
            partId: 'res-eval-multi',
            toolCallId: 'eval-1',
            toolName: 'eval',
            isError: true,
            output: {
                content: [{ type: 'text', text: 'summary' }],
                details: {
                    cells: [
                        {
                            index: 0,
                            title: 'First JS Cell',
                            language: 'js',
                            code: longCode,
                            output: 'Result table:\nTABLE_DATA\nAll good',
                            views: [
                                {
                                    text: 'TABLE_DATA',
                                    view: {
                                        kind: 'table',
                                        columns: [
                                            { head: 'name' },
                                            { head: 'score', numeric: true },
                                        ],
                                        rows: [
                                            ['Alice', '95'],
                                            ['Bob', '88'],
                                        ],
                                    },
                                },
                            ],
                            status: 'complete',
                            durationMs: 400,
                            statusEvents: [
                                { op: 'phase', title: 'Preparation phase' },
                                { op: 'read', path: 'src/config.json', chars: 120 },
                                { op: 'write', path: 'dist/out.js', chars: 240 },
                            ],
                            statusEventsElided: 2,
                        },
                        {
                            index: 1,
                            title: 'Python Cell with JSON',
                            language: 'py',
                            code: 'import json\nprint(json.dumps({"status": "ok"}))',
                            output: 'JSON_DATA',
                            views: [
                                {
                                    text: 'JSON_DATA',
                                    view: {
                                        kind: 'json',
                                        value: { status: 'ok', count: 42 },
                                    },
                                },
                            ],
                            status: 'complete',
                            durationMs: 700,
                            statusEvents: [
                                { op: 'run', cmd: 'python -V', code: 0 },
                                { op: 'grep', pattern: 'def ', count: 3 },
                            ],
                        },
                        {
                            index: 2,
                            title: 'Failing Cell',
                            language: 'py',
                            code: 'raise ValueError("something broke")',
                            output: 'ValueError: something broke',
                            status: 'error',
                            durationMs: 150,
                            exitCode: 1,
                        },
                    ],
                    replies: ['Out mid-turn reply content'],
                    notice: 'Completed with 1 failure',
                    async: {
                        state: 'completed',
                        jobId: 'eval-job-42',
                        type: 'eval',
                    },
                },
            },
        };

        const container = document.createElement('div');
        const root = createRoot(container);
        act(() => {
            root.render(
                <SyncProvider directory="/workspace">
                    <I18nProvider>
                        <ThemeSystemContext.Provider value={themeContext}>
                            <EvalPresenter call={call} result={result} />
                        </ThemeSystemContext.Provider>
                    </I18nProvider>
                </SyncProvider>
            );
        });

        const cells = container.querySelectorAll('[data-testid="eval-cell-block"]');
        expect(cells.length).toBe(3);

        // Cell 1: multi-cell caption "1/3 · First JS Cell"
        expect(cells[0]?.textContent).toContain('1/3 · First JS Cell');
        expect(cells[0]?.textContent).toContain('js');
        expect(cells[0]?.textContent).toContain('400ms');

        // Collapsed code toggle above 40 lines
        const toggle = cells[0]?.querySelector('[data-testid="eval-code-toggle"]');
        expect(toggle).not.toBeNull();
        expect(toggle?.textContent).toContain('45');

        // Step timeline with elided events and phase heading
        const stepList = cells[0]?.querySelector('[data-testid="eval-step-list"]');
        expect(stepList).not.toBeNull();
        expect(stepList?.textContent).toContain('2 earlier');
        expect(stepList?.textContent).toContain('Preparation phase');
        expect(stepList?.textContent).toContain('120 chars from src/config.json');

        // Table view in cell 1
        const tableView = cells[0]?.querySelector('[data-testid="eval-view-table"]');
        expect(tableView).not.toBeNull();
        expect(tableView?.textContent).toContain('Alice');
        expect(tableView?.textContent).toContain('95');

        // Cell 2: Python cell with JSON
        expect(cells[1]?.textContent).toContain('2/3 · Python Cell with JSON');
        expect(cells[1]?.textContent).toContain('python');
        expect(cells[1]?.textContent).toContain('700ms');
        const jsonView = cells[1]?.querySelector('[data-testid="eval-view-json"]');
        expect(jsonView).not.toBeNull();

        // Cell 3: failing cell with failure marker
        expect(cells[2]?.textContent).toContain('3/3 · Failing Cell');
        expect(cells[2]?.getAttribute('data-cell-status')).toBe('error');
        const failureMarker = cells[2]?.querySelector('[data-testid="eval-cell-failure"]');
        expect(failureMarker).not.toBeNull();
        expect(failureMarker?.textContent).toContain('Exit code: 1');

        // Replies & footer notices
        const replies = container.querySelector('[data-testid="eval-replies"]');
        expect(replies?.textContent).toContain('Out mid-turn reply content');

        const notice = container.querySelector('[data-testid="eval-notice"]');
        expect(notice?.textContent).toContain('Completed with 1 failure');

        const asyncBadge = container.querySelector('[data-testid="eval-async-badge"]');
        expect(asyncBadge?.textContent).toContain('eval-job-42');

        act(() => root.unmount());
    });
});
