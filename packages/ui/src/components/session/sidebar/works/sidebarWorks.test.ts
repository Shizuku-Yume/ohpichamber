import { describe, expect, test } from 'bun:test';
import type { Session } from '@openchamber/agent-contract';
import type { SessionGroup, SessionNode } from '../types';
import type { ProjectSection } from '../projects/sessionProjectRender';
import { buildSidebarWorkIndex, orderSidebarWorks } from './sidebarWorks';
import { pickWorkSessionToOpen } from './workActions';

const session = (sessionId: string, extra: Partial<Session> = {}): Session => ({
  sessionId,
  projectId: 'p',
  workspaceId: 'w',
  displayPath: '/repo',
  rootSessionId: sessionId,
  createdAt: 1,
  updatedAt: 1,
  epoch: '1',
  headSequence: '0',
  runtimeStatus: 'idle',
  activeRunId: null,
  mode: { kind: 'main' as const },
  metadata: null,
  metadataRevision: '0',
  archiveRevision: '0',
  ...extra,
});

const node = (sessionId: string, children: SessionNode[] = [], extra: Partial<Session> = {}): SessionNode => ({
  session: session(sessionId, extra),
  children,
  worktree: null,
});

const group = (id: string, sessions: SessionNode[], worktree: boolean): SessionGroup => ({
  id,
  label: id,
  branch: worktree ? id : null,
  description: null,
  isMain: !worktree,
  directory: `/${id}`,
  worktree: worktree ? { path: `/${id}`, projectDirectory: '/repo', branch: id, label: id } : null,
  sessions,
});

const section: ProjectSection = {
  project: { id: 'p', normalizedPath: '/repo' },
  groups: [
    group('main', [node('root', [node('review')]), node('lonely')], false),
    group('wt', [node('w1'), node('w2')], true),
    group('empty-wt', [], true),
  ],
};

describe('sidebar works', () => {
  test('a root session with what nests under it is one work, a worktree with all its sessions another', () => {
    const index = buildSidebarWorkIndex([section]);
    expect(index.bySessionId.get('review')?.key).toBe('session:root');
    expect(index.bySessionId.get('w2')?.key).toBe('p:wt');
    expect(index.worktreeWorks.map((ref) => ref.key)).toEqual(['p:wt', 'p:empty-wt']);
  });

  test('works come once each, in the order of their first matching session', () => {
    const index = buildSidebarWorkIndex([section]);
    const order = ['w2', 'review', 'w1', 'lonely', 'root'].map((id) => session(id));
    expect(orderSidebarWorks(order, index, (entry) => entry.sessionId !== 'lonely').map((ref) => ref.key))
      .toEqual(['p:wt', 'session:root']);
  });

  test('a click opens the latest session that is not a review or fork, else the latest, else nothing', () => {
    const review = node('review', [], { metadata: { openchamber: { kind: 'review', originalSessionID: 'x' } } });
    const fork = node('fork', [], { parentSessionId: 'x' });
    expect(pickWorkSessionToOpen([review, fork, node('work')])?.sessionId).toBe('work');
    expect(pickWorkSessionToOpen([review, fork])?.sessionId).toBe('review');
    expect(pickWorkSessionToOpen([])).toBeNull();
  });
});
