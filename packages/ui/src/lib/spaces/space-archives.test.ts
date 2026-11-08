import { beforeEach, describe, expect, test } from 'bun:test';

import { isSpaceArchiveDirectory, refreshSpaceArchives, useSpaceArchivesStore } from './space-archives';
import { registerWorkspaceDirectory, resetWorkspaceDirectories } from '@/stores/globalSessions';

const originalFetch = globalThis.fetch;

type ArchiveAnswer = { spaceId: string; name: string; workspaceId: string };

// The host's archive ids are twelve lowercase hex digits; the workspace id is
// opaque and matches what the sessions list registered.
const answerArchives = (archives: ArchiveAnswer[]): void => {
  globalThis.fetch = (async () => Response.json({ archives })) as typeof fetch;
};

describe('isSpaceArchiveDirectory', () => {
  beforeEach(() => {
    useSpaceArchivesStore.getState().resetForRuntimeSwitch();
    resetWorkspaceDirectories();
  });

  test('answers for a directory already bound to an archived workspace', async () => {
    registerWorkspaceDirectory('wsp_archived', '/spaces/abc/app');
    registerWorkspaceDirectory('wsp_live', '/spaces/def/app');
    answerArchives([{ spaceId: 'abcdefabcdef', name: 'One', workspaceId: 'wsp_archived' }]);
    try {
      await refreshSpaceArchives();
    } finally {
      globalThis.fetch = originalFetch;
    }

    // A path that differs by a redundant root spelling still names the same place.
    expect(isSpaceArchiveDirectory('/spaces/abc/app')).toBe(true);
    expect(isSpaceArchiveDirectory('/spaces/abc/app/')).toBe(true);
    // A workspace the host has not archived keeps its chats live.
    expect(isSpaceArchiveDirectory('/spaces/def/app')).toBe(false);
    expect(isSpaceArchiveDirectory('/spaces/unknown/app')).toBe(false);
    expect(isSpaceArchiveDirectory(null)).toBe(false);
    expect(isSpaceArchiveDirectory('')).toBe(false);
  });

  test('an archive names a workspace, not a path, so an unbound workspace answers nothing', async () => {
    answerArchives([{ spaceId: 'abcdefabcdef', name: 'One', workspaceId: 'wsp_unbound' }]);
    try {
      await refreshSpaceArchives();
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(isSpaceArchiveDirectory('/spaces/abc/app')).toBe(false);
  });

  test('a failed read leaves the last answer in place, never inventing a live chat', async () => {
    registerWorkspaceDirectory('wsp_archived', '/spaces/abc/app');
    answerArchives([{ spaceId: 'abcdefabcdef', name: 'One', workspaceId: 'wsp_archived' }]);
    try {
      await refreshSpaceArchives();
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(isSpaceArchiveDirectory('/spaces/abc/app')).toBe(true);

    globalThis.fetch = (async () => new Response(null, { status: 500 })) as typeof fetch;
    try {
      // A read that fails rejects; the store keeps the answer it already has.
      await expect(refreshSpaceArchives()).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(isSpaceArchiveDirectory('/spaces/abc/app')).toBe(true);
  });
});
