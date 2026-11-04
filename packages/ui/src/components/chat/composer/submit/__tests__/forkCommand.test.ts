import { describe, expect, test } from 'bun:test';

import type { ChatDraftIdentity } from '@/lib/chatDraftPersistence';
import type { Session } from '@openchamber/agent-contract';

import { runForkCommand, type ForkCommandDeps } from '../forkCommand';

const forked: Session = {
    sessionId: 'session-fork', projectId: 'project-a', workspaceId: 'workspace-a', displayPath: '.', rootSessionId: 'session-fork',
    createdAt: 1, updatedAt: 1, epoch: 'epoch-1', headSequence: '0', runtimeStatus: 'idle', activeRunId: null, mode: { kind: 'main' },
    title: 'Fork', metadata: {}, metadataRevision: '1', archiveRevision: '0',
};
const selection = { providerID: 'p', modelID: 'm', agent: 'build', variant: 'route-a', reasoningEffort: 'high' };

function createDeps(overrides: Partial<ForkCommandDeps> = {}) {
    const sends: Array<{ text: string; sessionId: string; directory?: string }> = [];
    const restores: Array<{ target: ChatDraftIdentity; text: string }> = [];
    const deps: ForkCommandDeps = {
        fork: async () => forked,
        directoryFor: () => '/repo',
        send: async (text, _selection, target) => {
            sends.push({ text, ...target });
        },
        draftIdentity: (directory, sessionId) => (directory ? { runtimeKey: 'rt', directory, sessionId } : null),
        restoreText: (target, text) => {
            restores.push({ target, text });
        },
        ...overrides,
    };
    return { deps, sends, restores };
}

describe('runForkCommand', () => {
    test('sends captured route and effort with the fork prompt', async () => {
        let captured: unknown;
        const { deps } = createDeps({ send: async (_text, selection) => { captured = selection; } });
        await runForkCommand('session-a', 'retry', selection, deps);
        expect(captured).toEqual(selection);
    });

    test('a bare /fork only opens the fork', async () => {
        const { deps, sends } = createDeps();
        expect(await runForkCommand('session-a', '', selection, deps)).toBe('forked');
        expect(sends).toEqual([]);
    });

    test('a failed fork throws and sends nothing', async () => {
        const { deps, sends } = createDeps({ fork: async () => { throw new Error('boom'); } });
        await expect(runForkCommand('session-a', 'text', selection, deps)).rejects.toThrow('boom');
        expect(sends).toEqual([]);
    });

    test('a failed send puts the text into the fork composer', async () => {
        const { deps, restores } = createDeps({ send: async () => { throw new Error('offline'); } });
        expect(await runForkCommand('session-a', 'text', selection, deps)).toBe('send-failed');
        expect(restores).toEqual([{ target: { runtimeKey: 'rt', directory: '/repo', sessionId: 'session-fork' }, text: 'text' }]);
    });

    test('a runtime switch mid-fork stops before sending', async () => {
        const { deps, sends } = createDeps({ fork: async () => null });
        expect(await runForkCommand('session-a', 'text', selection, deps)).toBe('stale');
        expect(sends).toEqual([]);
    });
});
