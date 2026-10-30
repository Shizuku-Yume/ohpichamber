import { afterEach, expect, test } from 'bun:test';

import { registerWorkspaceDirectory, resetWorkspaceDirectories } from '@/stores/globalSessions';
import { isSessionInWorktreeArchive } from './worktreeArchive';

const project = { id: 'project-1', path: '/repo' };

afterEach(() => resetWorkspaceDirectories());

test('archive session actions require matching project and canonical workspace directory', () => {
  registerWorkspaceDirectory('inside', '/work/project-tree');
  registerWorkspaceDirectory('nested', '/work/project-tree/packages/ui');
  registerWorkspaceDirectory('moved', '/work/other-tree');
  registerWorkspaceDirectory('neighbor', '/work/project-tree-copy');

  expect(isSessionInWorktreeArchive({ projectId: 'project-1', workspaceId: 'inside' }, project, '/work/project-tree')).toBe(true);
  expect(isSessionInWorktreeArchive({ projectId: 'project-1', workspaceId: 'nested' }, project, '/work/project-tree')).toBe(true);
  expect(isSessionInWorktreeArchive({ projectId: 'project-2', workspaceId: 'inside' }, project, '/work/project-tree')).toBe(false);
  expect(isSessionInWorktreeArchive({ projectId: 'project-1', workspaceId: 'moved' }, project, '/work/project-tree')).toBe(false);
  expect(isSessionInWorktreeArchive({ projectId: 'project-1', workspaceId: 'neighbor' }, project, '/work/project-tree')).toBe(false);
  expect(isSessionInWorktreeArchive({ projectId: 'project-1', workspaceId: 'unknown' }, project, '/work/project-tree')).toBe(false);
});
