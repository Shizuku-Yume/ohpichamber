import { afterAll, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
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

// Replays one OMP turn — thinking, a call carrying `input.i`, its prose, and a
// todo snapshot — through the real reducer and the real presentation pieces,
// and checks what the reader sees at each point: the call's intent as the
// status line, the first prose token on the frame it arrives, and the todo
// tray folded to the active item with its progress.

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    Node: browser.Node,
    Element: browser.Element,
    HTMLElement: browser.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
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
});
