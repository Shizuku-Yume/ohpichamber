import { describe, expect, test } from 'bun:test';
import type { Session, SessionMetadata } from '@openchamber/agent-contract';
import type { PrVisualSummary } from '@/stores/useGitHubPrStatusStore';
import type { WorktreeMetadata } from '@/types/worktree';
import {
  buildOverviewSessionSections,
  classifyOverviewSession,
  classifyOverviewWorktree,
  isNothingLost,
  overviewLeftOutOfDone,
  OVERVIEW_STALE_WORKTREE_AFTER_MS,
  OVERVIEW_STALLED_AFTER_MS,
  OVERVIEW_UNTRACKED_WINDOW_MS,
  type OverviewSessionFacts,
  type OverviewWorktreeFacts,
} from './overviewModel';

const NOW = 1_000_000_000_000;
const HOUR = 60 * 60 * 1000;

const session = (sessionId: string, time: { created?: number; updated?: number } = {}, extra: Partial<Session> = {}): Session => ({
  sessionId, projectId: 'project', workspaceId: 'ws', displayPath: 'repo', rootSessionId: sessionId,
  createdAt: time.created ?? NOW - HOUR, updatedAt: time.updated ?? NOW - HOUR, epoch: '1', headSequence: '1',
  runtimeStatus: 'idle', activeRunId: null, mode: { kind: 'main' as const }, title: sessionId, metadata: null,
  metadataRevision: '0', archiveRevision: '0',
  ...extra,
});

const inWork = (extra: Record<string, unknown> = {}): SessionMetadata => ({ openchamber: { work: { state: 'open', openedAt: 1 }, ...extra } });

const facts = (value: Session, extra: Partial<OverviewSessionFacts> = {}): OverviewSessionFacts => ({
  session: value, activity: null, blocking: null, prs: [], prsPending: false, issues: [], worktreeDirty: null, ...extra,
});

const unread = (metadata: SessionMetadata | null = null): SessionMetadata => ({
  ...(metadata ?? {}), openchamber: { ...(metadata?.openchamber ?? {}), workbench: { lastIdleAt: NOW } },
});
const pr = (prState: string, visualState: string, mergeableState: string | null = null, checksState: string | null = null): PrVisualSummary => ({
  provider: 'github', number: 1, visualState, prState, draft: false, title: null, url: null, base: null, head: null,
  checks: checksState ? { state: checksState, total: 1, success: 0, failure: 1, pending: 0 } : null,
  canMerge: null, mergeableState, repo: null,
});

const on = { workEnabled: true, now: NOW };
const off = { workEnabled: false, now: NOW };

describe('classifyOverviewSession', () => {
  test('a request waits on the user from any session, even one outside In work', () => {
    expect(classifyOverviewSession(facts(session('a'), { blocking: 'permission', activity: 'running' }), on))
      .toMatchObject({ section: 'waiting', reason: 'permission' });
    expect(classifyOverviewSession(facts(session('a'), { blocking: 'question' }), on))
      .toMatchObject({ section: 'waiting', reason: 'question' });
  });

  test('a running session shows with what keeps it running', () => {
    expect(classifyOverviewSession(facts(session('a'), { activity: 'subagent' }), on))
      .toMatchObject({ section: 'running', activity: 'subagent' });
  });

  test('subagents and archived sessions have no row', () => {
    expect(classifyOverviewSession(facts(session('a', {}, { parentSessionId: 'p' }), { blocking: 'permission' }), on)).toBeNull();
    expect(classifyOverviewSession(facts(session('a', {}, { archivedAt: 1 }), { activity: 'running' }), on)).toBeNull();
  });

  test('with In work on, an unread end counts only for sessions in work', () => {
    expect(classifyOverviewSession(facts(session('a')), on)).toBeNull();
    expect(classifyOverviewSession(facts(session('a', {}, { metadata: unread(inWork()) })), on))
      .toMatchObject({ section: 'waiting', reason: 'finished' });
  });

  test('with In work off, every recent unread end counts; an old one does not', () => {
    expect(classifyOverviewSession(facts(session('a', {}, { metadata: unread() })), off))
      .toMatchObject({ section: 'waiting', reason: 'finished' });
    expect(classifyOverviewSession(facts(session('a')), off)).toBeNull();
    const old = NOW - OVERVIEW_UNTRACKED_WINDOW_MS;
    expect(classifyOverviewSession(facts(session('a', { updated: old }, { metadata: unread() })), off)).toBeNull();
  });

  test('a failed run waits on the user; a successful one does not', () => {
    const review = { metadata: unread({ openchamber: { kind: 'review' as const } }) };
    expect(classifyOverviewSession(facts(session('a', {}, { ...review, runtimeStatus: 'unavailable' })), on))
      .toMatchObject({ section: 'waiting', reason: 'error' });
    expect(classifyOverviewSession(facts(session('a', {}, { metadata: { openchamber: { kind: 'review' as const } }, runtimeStatus: 'idle' })), on)).toBeNull();
  });

  test('a PR with a conflict or failed checks waits on the user', () => {
    const value = session('a', {}, { metadata: inWork() });
    expect(classifyOverviewSession(facts(value, { prs: [pr('open', 'blocked', 'dirty')] }), on))
      .toMatchObject({ section: 'waiting', reason: 'conflict' });
    expect(classifyOverviewSession(facts(value, { prs: [pr('open', 'blocked', 'unstable', 'failure')] }), on))
      .toMatchObject({ section: 'waiting', reason: 'checks' });
    // Blocked with checks that passed: GitHub cannot merge it.
    expect(classifyOverviewSession(facts(value, { prs: [pr('open', 'blocked', 'unknown', 'success')] }), on))
      .toMatchObject({ section: 'waiting', reason: 'conflict' });
  });

  test('done signals go by authority: a merged PR, closed issues, then the hint', () => {
    const hinted = session('a', { updated: NOW - HOUR }, { metadata: inWork({ work: { state: 'open', suggestDoneAt: NOW } }) });
    expect(classifyOverviewSession(facts(hinted, { prs: [pr('merged', 'merged')] }), on)).toMatchObject({ section: 'done', signal: 'merged' });
    expect(classifyOverviewSession(facts(hinted, { issues: ['completed', 'dropped'] }), on)).toMatchObject({ section: 'done', signal: 'issueClosed' });
    expect(classifyOverviewSession(facts(hinted, { issues: ['dropped', 'dropped'] }), on)).toMatchObject({ section: 'done', signal: 'issueDropped' });
    expect(classifyOverviewSession(facts(hinted, { issues: ['completed', 'open'] }), on)).toMatchObject({ section: 'done', signal: 'hint' });
    expect(classifyOverviewSession(facts(hinted, { issues: ['completed', null] }), on)).toMatchObject({ section: 'done', signal: 'hint' });
  });

  test('a merged PR closes the work only while no other PR of the session is open', () => {
    const hinted = session('a', { updated: NOW - HOUR }, { metadata: inWork({ work: { state: 'open', suggestDoneAt: NOW } }) });
    expect(classifyOverviewSession(facts(hinted, { prs: [pr('merged', 'merged'), pr('closed', 'closed')] }), on))
      .toMatchObject({ section: 'done', signal: 'merged' });
    expect(classifyOverviewSession(facts(hinted, { prs: [pr('merged', 'merged'), pr('open', 'open')] }), on))
      .toMatchObject({ section: 'done', signal: 'hint' });
    expect(classifyOverviewSession(facts(hinted, { prs: [pr('merged', 'merged')], prsPending: true }), on))
      .toMatchObject({ section: 'done', signal: 'hint' });
    const plain = session('a', { updated: NOW - HOUR }, { metadata: inWork() });
    expect(classifyOverviewSession(facts(plain, { prs: [pr('merged', 'merged'), pr('open', 'draft')] }), on))
      .toMatchObject({ section: 'working', signal: null });
  });

  test('a veto keeps a done session in work and says why', () => {
    const read = { updated: NOW - HOUR };
    const merged = { prs: [pr('merged', 'merged')] };
    const suggestion = inWork({ assist: { recap: 'r', suggestion: 'Run the tests', forMessageID: 'm', generatedAt: NOW } });
    expect(classifyOverviewSession(facts(session('a', read, { metadata: suggestion }), merged), on))
      .toMatchObject({ section: 'working', signal: 'merged', veto: 'suggestion' });
    expect(classifyOverviewSession(facts(session('a', read, { metadata: inWork() }), { ...merged, worktreeDirty: true }), on))
      .toMatchObject({ section: 'working', signal: 'merged', veto: 'uncommitted' });
    expect(classifyOverviewSession(facts(session('a', read, { metadata: inWork(), runtimeStatus: 'unavailable' }), merged), on))
      .toMatchObject({ section: 'working', signal: 'merged', veto: 'failed' });
  });
  test('an in-work session without a signal is stalled after three days untouched', () => {
    const recent = session('a', { updated: NOW - HOUR }, { metadata: inWork() });
    const old = session('a', { updated: NOW - OVERVIEW_STALLED_AFTER_MS }, { metadata: inWork() });
    expect(classifyOverviewSession(facts(recent), on)).toMatchObject({ section: 'working', stalled: false, signal: null, veto: null });
    expect(classifyOverviewSession(facts(old), on)).toMatchObject({ section: 'working', stalled: true });
  });
});

describe('buildOverviewSessionSections', () => {
  test('waiting rows sort by urgency, then newest first; left out lists vetoed done signals', () => {
    const sections = buildOverviewSessionSections([
      facts(session('finished', { updated: NOW }, { metadata: unread(inWork()) })),
      facts(session('permission', { updated: NOW - 2 * HOUR }), { blocking: 'permission' }),
      facts(session('vetoed', {}, { metadata: inWork() }), { prs: [pr('merged', 'merged')], worktreeDirty: true }),
      facts(session('plain', {}, { metadata: inWork() })),
    ], on);
    expect(sections.waiting.map((row) => row.session.sessionId)).toEqual(['permission', 'finished']);
    expect(sections.working.map((row) => row.session.sessionId)).toEqual(['vetoed', 'plain']);
    expect(overviewLeftOutOfDone(sections).map((row) => row.session.sessionId)).toEqual(['vetoed']);
  });
});

const worktree: WorktreeMetadata = { path: '/repo/.wt/a', projectDirectory: '/repo', branch: 'a', label: 'a' };
const cleanFacts = (extra: Partial<OverviewWorktreeFacts> = {}): OverviewWorktreeFacts => ({
  worktree,
  project: { id: 'p', path: '/repo' },
  pr: 'merged',
  mergedHeadSha: null,
  sessions: [],
  inUse: false,
  git: { losses: { uncommittedFiles: 0, unpushed: false }, lastCommitAt: NOW - HOUR },
  ...extra,
});

describe('classifyOverviewWorktree', () => {
  test('a merged worktree is offered, with what it would lose', () => {
    expect(classifyOverviewWorktree(cleanFacts(), on)).toMatchObject({ kind: 'merged' });
    const dirty = classifyOverviewWorktree(cleanFacts({ git: { losses: { uncommittedFiles: 2, unpushed: null }, lastCommitAt: null } }), on);
    expect(dirty?.losses).toEqual({ uncommittedFiles: 2, unpushed: null });
    expect(isNothingLost(dirty!.losses)).toBe(false);
  });

  test('nothing is offered while it is in use, unread by git, or held by a session in work', () => {
    expect(classifyOverviewWorktree(cleanFacts({ inUse: true }), on)).toBeNull();
    expect(classifyOverviewWorktree(cleanFacts({ git: null }), on)).toBeNull();
    const working = session('a', {}, { metadata: inWork() });
    expect(classifyOverviewWorktree(cleanFacts({ sessions: [working] }), on)).toBeNull();
    expect(classifyOverviewWorktree(cleanFacts({ sessions: [working] }), off)).toMatchObject({ kind: 'merged' });
  });

  test('a worktree without an open PR is stale after two weeks without commits or session activity', () => {
    const old = NOW - OVERVIEW_STALE_WORKTREE_AFTER_MS;
    const stale = cleanFacts({ pr: 'none', git: { losses: { uncommittedFiles: 0, unpushed: false }, lastCommitAt: old } });
    expect(classifyOverviewWorktree(stale, on)).toMatchObject({ kind: 'stale' });
    expect(classifyOverviewWorktree({ ...stale, pr: 'closed' }, on)).toMatchObject({ kind: 'stale' });
    expect(classifyOverviewWorktree({ ...stale, pr: 'open' }, on)).toBeNull();
    expect(classifyOverviewWorktree({ ...stale, pr: 'unknown' }, on)).toBeNull();
    expect(classifyOverviewWorktree({ ...stale, sessions: [session('a', { updated: NOW - HOUR })] }, on)).toBeNull();
    expect(classifyOverviewWorktree(cleanFacts({ pr: 'none', git: { losses: { uncommittedFiles: 0, unpushed: false }, lastCommitAt: null } }), on)).toBeNull();
  });
});
