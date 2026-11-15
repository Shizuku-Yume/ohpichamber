import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
mock.module('./markdown/markdown-shiki.worker.ts?worker&url', () => ({ default: 'blob:test-shiki-worker' }));
mock.module('@/components/chat/markdown/markdown-shiki.worker.ts?worker&url', () => ({ default: 'blob:test-shiki-worker' }));
import type {
    CanonicalEvent,
    Message,
    Part,
    RuntimeSession,
    Session,
    SessionSnapshot,
} from '@openchamber/agent-contract';

import { applyDirectoryEvent } from '@/sync/event-reducer';
import { INITIAL_STATE, type State } from '@/sync/types';
import { createParsedStatus } from '@/hooks/useAssistantStatus';
import { I18nProvider } from '@/lib/i18n';
import { useStreamingTextThrottle } from './hooks/useStreamingTextThrottle';
import { resolveAssistantDisplayText } from './message/parts/assistantTextVisibility';
import { TodoCard } from './message/parts/TodoCard';
import { latestTodoPhases } from './todoHistory';
import { SyncProvider } from '@/sync/sync-context';
import { ThemeSystemContext, type ThemeContextValue } from '@/contexts/theme-system-context';
import { getDefaultTheme } from '@/lib/theme/themes';
// Loaded after the mock so the worker URL never reaches Bun's loader.
const { default: ToolPart } = await import('./message/parts/ToolPart');
import { loadMarkdownRendererModule } from './markdownRendererLoader';

// Replays one OMP turn — thinking, a call carrying `input.i`, its prose, and a
// todo snapshot — through the real reducer and the real presentation pieces,
// and checks what the reader sees at each point: the call's intent as the
// status line, the first prose token on the frame it arrives, and the todo
// tray folded to the active item with its progress.

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
const unexpectedChange = (): never => { throw new Error('Theme should not change'); };
const defaultTheme = getDefaultTheme(false);
const themeContext: ThemeContextValue = {
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
    themeMode: 'light',
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

const SESSION_ID = 'session-replay';
const EPOCH = 'epoch-replay';

const runtime = (): RuntimeSession => ({
    sessionId: SESSION_ID,
    projectId: 'project-replay',
    workspaceId: 'workspace-replay',
    displayPath: '.',
    rootSessionId: SESSION_ID,
    createdAt: 1,
    updatedAt: 1,
    epoch: EPOCH,
    headSequence: '0',
    runtimeStatus: 'running',
    activeRunId: 'run-replay',
    mode: { kind: 'main' },
});

const snapshot = (): SessionSnapshot => ({
    session: runtime(),
    cursor: `${EPOCH}:0`,
    activeRun: null,
    branch: { branchId: 'branch-replay', branchVersion: '0', leafMessageId: null },
    window: { firstTurnId: null, lastTurnId: null, firstMessageId: null, lastMessageId: null, hasEarlier: false },
    turns: [],
    messages: [],
    approvals: [],
    questions: [],
    requestRecovery: { pendingSet: 'replace', priorEpochs: 'expired' },
});

const initialState = (): State => {
    const session: Session = { ...runtime(), metadata: null, metadataRevision: '0', archiveRevision: '0' };
    return {
        ...INITIAL_STATE,
        session: [session],
        sessionTotal: 1,
        snapshot: { [SESSION_ID]: snapshot() },
        message: { [SESSION_ID]: [] },
        permission: {},
        form: {},
        sessionEpoch: { [SESSION_ID]: EPOCH },
        sessionCursor: { [SESSION_ID]: `${EPOCH}:0` },
        partOwner: {},
    };
};

const event = (sequence: number, type: CanonicalEvent['type'], fields: Record<string, unknown>): CanonicalEvent => ({
    sessionId: SESSION_ID,
    epoch: EPOCH,
    sequence: String(sequence),
    timestamp: sequence,
    type,
    ...fields,
} as CanonicalEvent);

const INTENT = 'Reading the app entry';
const PROSE = 'Here is the first token of the answer, and it keeps going.';

const replayTurn = (): State => {
    const assistantMessageId = 'message-assistant';
    const reasoning: Part = { type: 'reasoning', partId: 'part-reasoning', content: '' };
    const call: Part = {
        type: 'tool_call',
        partId: 'part-read',
        toolCallId: 'call-read',
        toolName: 'read',
        input: { path: 'src/app.ts', i: INTENT },
        status: 'running',
    };
    const text: Part = { type: 'text', partId: 'part-text', content: '' };
    const todo: Part = {
        type: 'tool_result',
        partId: 'part-todo',
        toolCallId: 'call-todo',
        toolName: 'todo',
        output: {
            content: [],
            details: {
                phases: [
                    { name: 'Discovery', tasks: [{ content: 'Search codebase', status: 'completed' }, { content: 'Inspect findings', status: 'in_progress' }] },
                    { name: 'Execution', tasks: [{ content: 'Apply modifications', status: 'pending' }] },
                ],
            },
        },
        isError: false,
    };

    const events: CanonicalEvent[] = [
        event(1, 'turn.started', { turnId: 'turn-1', runId: 'run-replay', userMessageId: 'message-user' }),
        event(2, 'message.created', { messageId: assistantMessageId, turnId: 'turn-1', role: 'assistant', providerId: 'anthropic', modelId: 'claude-opus-4-1' }),
        event(3, 'part.started', { messageId: assistantMessageId, part: reasoning }),
        event(4, 'part.delta', { partId: 'part-reasoning', delta: 'Looking at the config first' }),
        event(5, 'part.started', { messageId: assistantMessageId, part: call }),
        event(6, 'tool.started', { toolCallId: 'call-read', toolName: 'read', input: { path: 'src/app.ts', i: INTENT } }),
        event(7, 'part.started', { messageId: assistantMessageId, part: text }),
        event(8, 'part.delta', { partId: 'part-text', delta: 'Here is the first' }),
        event(9, 'part.delta', { partId: 'part-text', delta: ' token of the answer, and it keeps going.' }),
        event(10, 'part.started', { messageId: assistantMessageId, part: todo }),
    ];

    let state = initialState();
    for (const item of events) {
        const result = applyDirectoryEvent(state, item);
        expect(`${item.type}: ${result.kind}`).toBe(`${item.type}: applied`);
        state = result.state;
    }
    return state;
};

const assistantMessage = (state: State): Message => {
    const message = state.message[SESSION_ID]?.find((item) => item.messageId === 'message-assistant');
    if (!message) throw new Error('the replay produced no assistant message');
    return message;
};

describe('OMP stream replay', () => {
    test('the status line is the running call’s input.i intent', () => {
        const message = assistantMessage(replayTurn());
        const call = message.parts.find((part) => part.type === 'tool_call');
        expect(call?.type === 'tool_call' ? call.input.i : undefined).toBe(INTENT);

        const status = createParsedStatus(message.parts);
        expect(status.status.text).toBe(INTENT);
        expect(status.isAnswering).toBe(false);

        // Once the call ends, the line falls back to the plain working state.
        const settled = createParsedStatus(message.parts.map((part) => part.type === 'tool_call' ? { ...part, status: 'completed' as const } : part));
        expect(settled.status.text).toBeUndefined();
        expect(settled.status.key).toBe('chat.agentStatus.working');
    });

    test('thinking reads as thinking while it is the newest live part', () => {
        const message = assistantMessage(replayTurn());
        const thinking = createParsedStatus(message.parts.filter((part) => part.type === 'reasoning'));
        expect(thinking.status.key).toBe('chat.agentStatus.thinking');
    });

    test('the todo tray folds to the active item and its progress', () => {
        const message = assistantMessage(replayTurn());
        const phases = latestTodoPhases([message]);
        expect(phases).not.toBeNull();

        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);
        act(() => {
            root.render(<I18nProvider><TodoCard phases={phases ?? []} /></I18nProvider>);
        });

        const row = container.querySelector('[data-testid="todo-card"]');
        expect(row?.textContent).toContain('Inspect findings');
        expect(row?.textContent).toContain('1/3');
        expect(row?.textContent).not.toContain('Apply modifications');
        expect(row?.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');

        act(() => root.unmount());
        container.remove();
    });

    test('the first prose token shows on the frame it arrives; later tokens coalesce', async () => {
        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);

        const Probe = ({ text, throttleMs }: { text: string; throttleMs?: number }) => {
            const throttled = useStreamingTextThrottle({ text, isStreaming: true, throttleMs });
            const display = resolveAssistantDisplayText({ textContent: text, throttledTextContent: throttled, isStreaming: true });
            return <div data-testid="prose">{display}</div>;
        };
        const prose = () => container.querySelector('[data-testid="prose"]')?.textContent ?? '';

        act(() => root.render(<Probe text="" />));
        expect(prose()).toBe('');

        // The first token renders in the commit that delivers it: no timer.
        act(() => root.render(<Probe text="Here is the first" />));
        expect(prose()).toBe('Here is the first');

        // A later token inside the window waits for it, then lands.
        act(() => root.render(<Probe text={PROSE} throttleMs={1000} />));
        expect(prose()).toBe('Here is the first');
        const waited = Promise.withResolvers<void>();
        setTimeout(waited.resolve, 1050);
        await act(async () => {
            await waited.promise;
        });
        expect(prose()).toBe(PROSE);

        act(() => root.unmount());
        container.remove();
    });
    test('a three-cell eval (js and py, one failing cell, table and JSON views, nested tool calls) renders titled cells with highlighted code, step timeline advancing while running, structured output and failure marker', async () => {
        const assistantMessageId = 'message-eval-assistant';
        const call: Part = {
            type: 'tool_call',
            partId: 'part-eval-call',
            toolCallId: 'call-eval-1',
            toolName: 'eval',
            input: {
                title: 'Data processing pipeline',
                language: 'js',
                code: 'const data = loadData();',
            },
            status: 'running',
        };

        // 1. Initial tool.started event
        const startEvents: CanonicalEvent[] = [
            event(101, 'turn.started', { turnId: 'turn-eval', runId: 'run-eval', userMessageId: 'message-user' }),
            event(102, 'message.created', { messageId: assistantMessageId, turnId: 'turn-eval', role: 'assistant', providerId: 'anthropic', modelId: 'claude-opus-4-1' }),
            event(103, 'part.started', { messageId: assistantMessageId, part: call }),
            event(104, 'tool.started', { toolCallId: 'call-eval-1', toolName: 'eval', input: call.input }),
        ];

        let state = initialState();
        for (const item of startEvents) {
            const res = applyDirectoryEvent(state, item);
            state = res.state;
        }

        const container = document.createElement('div');
        document.body.append(container);
        const root = createRoot(container);

        // Verify running state while running before results:
        act(() => {
            root.render(
                <SyncProvider directory="/workspace">
                    <I18nProvider>
                        <ThemeSystemContext.Provider value={themeContext}>
                            <ToolPart
                                part={call}
                                sessionId={SESSION_ID}
                                directory="/workspace"
                                isExpanded
                                isMobile={false}
                                onToggle={() => { }}
                            />
                        </ThemeSystemContext.Provider>
                    </I18nProvider>
                </SyncProvider>
            );
        });

        const runningCell = container.querySelector('[data-testid="eval-cell-block"]');
        expect(runningCell).not.toBeNull();
        expect(runningCell?.getAttribute('data-cell-status')).toBe('running');
        expect(container.querySelector('[data-testid="eval-step-running"]')).not.toBeNull();

        // 2. Stream partial update (streaming result with 1st cell running and read status event)
        const partialResult: Part = {
            type: 'tool_result',
            partId: 'part-eval-result',
            toolCallId: 'call-eval-1',
            toolName: 'eval',
            isError: false,
            output: {
                content: [{ type: 'text', text: 'reading data...' }],
                details: {
                    cells: [
                        {
                            index: 0,
                            title: 'Data loading',
                            code: 'const data = loadData();',
                            language: 'js',
                            output: '',
                            status: 'running',
                            durationMs: 150,
                            statusEvents: [
                                { op: 'read', path: 'raw_data.csv', chars: 512 },
                            ],
                        },
                    ],
                },
            },
        };

        const updateEvents: CanonicalEvent[] = [
            event(105, 'part.started', { messageId: assistantMessageId, part: partialResult }),
        ];
        for (const item of updateEvents) {
            const res = applyDirectoryEvent(state, item);
            state = res.state;
        }

        act(() => {
            root.render(
                <SyncProvider directory="/workspace">
                    <I18nProvider>
                        <ThemeSystemContext.Provider value={themeContext}>
                            <ToolPart
                                part={partialResult}
                                pairedCall={call}
                                sessionId={SESSION_ID}
                                directory="/workspace"
                                isExpanded
                                isMobile={false}
                                onToggle={() => { }}
                            />
                        </ThemeSystemContext.Provider>
                    </I18nProvider>
                </SyncProvider>
            );
        });

        // Running state is preserved when pairedCall is running
        const activeStepList = container.querySelector('[data-testid="eval-step-list"]');
        expect(activeStepList?.textContent).toContain('512 chars from raw_data.csv');
        expect(activeStepList?.textContent).toContain('Last completed');
        expect(container.querySelector('[data-testid="eval-step-running"]')).not.toBeNull();

        // 3. Complete final result with 3 cells (js, py, py failing), views and nested tool calls
        const finalResult: Part = {
            type: 'tool_result',
            partId: 'part-eval-result',
            toolCallId: 'call-eval-1',
            toolName: 'eval',
            isError: true,
            output: {
                content: [{ type: 'text', text: 'pipeline finished with 1 error' }],
                details: {
                    cells: [
                        {
                            index: 0,
                            title: 'Data loading',
                            code: 'const data = loadData();',
                            language: 'js',
                            output: 'Loaded rows:\nTABLE_DATA',
                            views: [
                                {
                                    text: 'TABLE_DATA',
                                    view: {
                                        kind: 'table',
                                        columns: [{ head: 'id' }, { head: 'metric', numeric: true }],
                                        rows: [['#1', '100'], ['#2', '200']],
                                    },
                                },
                            ],
                            status: 'complete',
                            durationMs: 250,
                            statusEvents: [
                                { op: 'read', path: 'raw_data.csv', chars: 512 },
                                { op: 'write', path: 'clean.csv', chars: 320 },
                            ],
                        },
                        {
                            index: 1,
                            title: 'Model evaluation',
                            code: 'import numpy as np\nscores = evaluate(data)',
                            language: 'py',
                            output: 'METRICS_JSON',
                            views: [
                                {
                                    text: 'METRICS_JSON',
                                    view: {
                                        kind: 'json',
                                        value: { accuracy: 0.96, latencyMs: 12 },
                                    },
                                },
                            ],
                            status: 'complete',
                            durationMs: 450,
                            statusEvents: [
                                { op: 'grep', pattern: 'benchmark', count: 3 },
                                { op: 'run', cmd: 'python evaluate.py', code: 0 },
                            ],
                        },
                        {
                            index: 2,
                            title: 'Deployment step',
                            code: 'deploy_model(scores)',
                            language: 'py',
                            output: 'HTTPError: 500 Internal Server Error',
                            status: 'error',
                            durationMs: 200,
                            exitCode: 1,
                            statusEvents: [
                                { op: 'log', message: 'deploying to cluster' },
                            ],
                        },
                    ],
                },
            },
        };

        const finalCompletedCall: Part = { ...call, status: 'completed' };

        const completeEvents: CanonicalEvent[] = [
            event(106, 'tool.completed', { toolCallId: 'call-eval-1', status: 'completed' }),
            event(107, 'turn.completed', { turnId: 'turn-eval', runId: 'run-eval' }),
        ];
        for (const item of completeEvents) {
            const res = applyDirectoryEvent(state, item);
            state = res.state;
        }

        act(() => {
            root.render(
                <SyncProvider directory="/workspace">
                    <I18nProvider>
                        <ThemeSystemContext.Provider value={themeContext}>
                            <ToolPart
                                part={finalResult}
                                pairedCall={finalCompletedCall}
                                sessionId={SESSION_ID}
                                directory="/workspace"
                                isExpanded
                                isMobile={false}
                                onToggle={() => { }}
                            />
                        </ThemeSystemContext.Provider>
                    </I18nProvider>
                </SyncProvider>
            );
        });

        // Summary row: "3 cells · 900ms · 4 tool calls"
        expect(container.textContent).toContain('3 cells · 900ms · 4 tool calls');

        // All 3 titled cells rendered with highlighted code
        const finalCells = container.querySelectorAll('[data-testid="eval-cell-block"]');
        expect(finalCells.length).toBe(3);

        // Cell 0: js, titled "Data loading", table view
        expect(finalCells[0]?.textContent).toContain('1/3 · Data loading');
        expect(finalCells[0]?.textContent).toContain('js');
        expect(finalCells[0]?.textContent).toContain('const data = loadData()');
        expect(finalCells[0]?.querySelector('[data-testid="eval-view-table"]')).not.toBeNull();
        expect(finalCells[0]?.querySelector('[data-testid="eval-view-table"]')?.textContent).toContain('#1');
        expect(finalCells[0]?.querySelector('[data-testid="eval-view-table"]')?.textContent).toContain('100');

        // Cell 1: py, titled "Model evaluation", json view
        expect(finalCells[1]?.textContent).toContain('2/3 · Model evaluation');
        expect(finalCells[1]?.textContent).toContain('python');
        expect(finalCells[1]?.textContent).toContain('import numpy');
        expect(finalCells[1]?.querySelector('[data-testid="eval-view-json"]')).not.toBeNull();

        // Cell 2: failing cell with failure marker
        expect(finalCells[2]?.textContent).toContain('3/3 · Deployment step');
        expect(finalCells[2]?.getAttribute('data-cell-status')).toBe('error');
        const failureBadge = finalCells[2]?.querySelector('[data-testid="eval-cell-failure"]');
        expect(failureBadge).not.toBeNull();
        expect(failureBadge?.textContent).toContain('Exit code: 1');

        act(() => root.unmount());
        container.remove();
    });
});
