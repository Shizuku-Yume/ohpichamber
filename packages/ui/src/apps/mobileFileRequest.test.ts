import { describe, expect, test } from 'bun:test';

import { fileNameOf, sessionLineage, type SessionLike } from './mobileFileRequest';

type TestSession = SessionLike & {
  id: string;
  projectID?: string;
  directory?: string;
  title?: string;
};

const session = (id: string, fields: Partial<TestSession> = {}): TestSession => ({
  id,
  projectID: 'project',
  directory: '/repo',
  title: id,
  ...fields,
});
const reader = (sessions: TestSession[]) => async (id: string) => sessions.find((entry) => entry.id === id) ?? null;
const ids = (lineage: TestSession[]) => lineage.map((entry) => entry.id);

describe('sessionLineage', () => {
  test('walks from a subagent up to its root', async () => {
    const read = reader([session('grandchild', { parentID: 'child' }), session('child', { parentID: 'root' }), session('root')]);
    expect(ids(await sessionLineage('grandchild', read))).toEqual(['grandchild', 'child', 'root']);
  });

  test('a /btw side chat leads to the session it was typed into', async () => {
    const fork = session('fork', { metadata: { openchamber: { kind: 'btw', originalSessionID: 'root' } } });
    expect(ids(await sessionLineage('fork', reader([fork, session('root')])))).toEqual(['fork', 'root']);
  });

  test('a promoted side chat stands on its own', async () => {
    const promoted = session('fork', { metadata: { openchamber: { btwPromoted: true, originalSessionID: 'root' } } });
    expect(ids(await sessionLineage('fork', reader([promoted, session('root')])))).toEqual(['fork']);
  });

  test('stops at a session it cannot read', async () => {
    expect(ids(await sessionLineage('child', reader([session('child', { parentID: 'gone' })])))).toEqual(['child']);
    expect(await sessionLineage('gone', reader([]))).toEqual([]);
  });

  test('a link that loops ends the walk', async () => {
    const fork = session('fork', { metadata: { openchamber: { kind: 'btw', originalSessionID: 'fork' } } });
    expect(ids(await sessionLineage('fork', reader([fork])))).toEqual(['fork']);
    const read = reader([session('a', { parentID: 'b' }), session('b', { parentID: 'a' })]);
    expect(ids(await sessionLineage('a', read))).toEqual(['a', 'b']);
  });
});

describe('fileNameOf', () => {
  test('takes the last part of POSIX and Windows paths', () => {
    expect(fileNameOf('/repo/out/report.md')).toBe('report.md');
    expect(fileNameOf('C:\\repo\\out\\report.md')).toBe('report.md');
  });
});
