import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { listPwaSessions } from './pwa-session-shortcuts.js';

const root = path.join(path.sep, 'workspace');
const scoped = path.join(root, 'app');
const nested = path.join(scoped, 'sub');
const dotted = path.join(scoped, '..cache');
const sibling = path.join(root, 'application');
const unrelated = path.join(root, 'other');

describe('PWA canonical session scope', () => {
  it('keeps exactly the preferred directory and its descendant workspaces', async () => {
    const listed = [];
    const result = await listPwaSessions({
      directory: scoped,
      listWorkspaces: async () => ({
        items: [
          { workspaceId: 'ws-app', cwd: scoped },
          { workspaceId: 'ws-nested', cwd: nested },
          { workspaceId: 'ws-dotted', cwd: dotted },
          { workspaceId: 'ws-sibling', cwd: sibling },
          { workspaceId: 'ws-other', cwd: unrelated },
        ],
        errors: { 'ws-broken': 'METADATA_READ_FAILED' },
      }),
      listSessions: async (workspaceId) => {
        listed.push(workspaceId);
        if (workspaceId === 'ws-nested') throw new Error('service unavailable');
        return { items: [{ sessionId: `session-${workspaceId}` }], errors: {} };
      },
    });

    expect(listed).toEqual(['ws-app', 'ws-nested', 'ws-dotted']);
    expect(result.items).toEqual([{ sessionId: 'session-ws-app' }, { sessionId: 'session-ws-dotted' }]);
    expect(result.errors).toMatchObject({
      'ws-broken': 'METADATA_READ_FAILED',
      'ws-nested': 'SERVICE_UNAVAILABLE',
    });
  });

  it('does not fall back to unrelated workspaces when the preferred scope has none', async () => {
    let listed = false;
    const result = await listPwaSessions({
      directory: path.join(root, 'missing'),
      listWorkspaces: async () => ({ items: [{ workspaceId: 'ws-other', cwd: unrelated }], errors: {} }),
      listSessions: async () => {
        listed = true;
        return { items: [{ sessionId: 'unrelated' }], errors: {} };
      },
    });

    expect(listed).toBe(false);
    expect(result).toEqual({ items: [], errors: {} });
  });

  it('uses the global canonical list when no directory is preferred', async () => {
    const calls = [];
    const result = await listPwaSessions({
      directory: null,
      listWorkspaces: async () => {
        calls.push('workspaces');
        return { items: [], errors: {} };
      },
      listSessions: async (workspaceId) => {
        calls.push(workspaceId ?? 'global');
        return { items: [{ sessionId: 'global-session' }], errors: {} };
      },
    });

    expect(calls).toEqual(['global']);
    expect(result.items).toEqual([{ sessionId: 'global-session' }]);
  });
});
