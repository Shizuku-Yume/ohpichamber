import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { fetchSessionKnowledge, reportSessionKnowledgeDelivered, setSessionProjectContextPin } from './sessionKnowledgeApi';
import { getRuntimeApiBaseUrl, getRuntimeKey, switchRuntimeEndpoint } from './runtime-switch';

const SPACE_DIRECTORY = '/spaces/a1b2c3d4e5f6/repo';

interface RestorableSpy { mockRestore(): void }

let request: RestorableSpy | null = null;

const capturePaths = (): string[] => {
  const paths: string[] = [];
  request = spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    // The path and the directory header together say where the request goes.
    const directory = new Headers(init?.headers).get('x-opencode-directory');
    paths.push(`${new URL(input instanceof Request ? input.url : String(input), 'http://app.test').pathname} ${directory ?? '-'}`);
    return Response.json({ recorded: true, pins: { notes: ['note-1'], plans: [] } });
  });
  return paths;
};

afterEach(() => {
  request?.mockRestore();
  request = null;
});

// The session lives in the space's server, so a write that reaches the host's
// server finds no session and changes nothing.
describe('session knowledge writes name the directory only in the body', () => {
  test('a pin reaches the server inside the space', async () => {
    const paths = capturePaths();
    expect(await setSessionProjectContextPin(SPACE_DIRECTORY, 'session-1', 'note', 'note-1', true))
      .toEqual({ notes: ['note-1'], plans: [] });
    expect(paths).toEqual([`/api/session-knowledge/pin ${encodeURIComponent(SPACE_DIRECTORY)}`]);
  });

  test('the delivery report reaches the server inside the space', async () => {
    const paths = capturePaths();
    await reportSessionKnowledgeDelivered(SPACE_DIRECTORY, 'session-1', 'sig-1');
    expect(paths).toEqual([`/api/session-knowledge/delivered ${encodeURIComponent(SPACE_DIRECTORY)}`]);
  });

  test('a host session stays on the host', async () => {
    const paths = capturePaths();
    await setSessionProjectContextPin('/home/me/repo', 'session-1', 'note', 'note-1', true);
    await reportSessionKnowledgeDelivered('/home/me/repo', 'session-1', 'sig-1');
    expect(paths).toEqual(['/api/session-knowledge/pin -', '/api/session-knowledge/delivered -']);
  });
});

describe('knowledge delivery barrier runtime ownership', () => {
  test.each([false, true])('does not query the new runtime after a pending report (return=%s)', async (returnToA) => {
    const priorKey = getRuntimeKey(); const priorBase = getRuntimeApiBaseUrl();
    switchRuntimeEndpoint({ apiBaseUrl: 'http://knowledge-a.test', runtimeKey: 'knowledge-a' });
    let release!: () => void; let started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const reached = new Promise<void>(resolve => { started = resolve; });
    const reads: string[] = [];
    request = spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input), 'http://knowledge-a.test');
      if (url.pathname === '/api/session-knowledge/delivered') { started(); await gate; return Response.json({ recorded: true }); }
      if (url.pathname === '/api/session-knowledge') { reads.push(url.toString()); return Response.json({ text: 'context', signature: 'sig' }); }
      return Response.json({});
    });
    try {
      const report = reportSessionKnowledgeDelivered('/repo-a', 'session-barrier', 'sig'); await reached;
      const read = fetchSessionKnowledge('/repo-a', 'session-barrier');
      switchRuntimeEndpoint({ apiBaseUrl: 'http://knowledge-b.test', runtimeKey: 'knowledge-b' });
      if (returnToA) switchRuntimeEndpoint({ apiBaseUrl: 'http://knowledge-a.test', runtimeKey: 'knowledge-a' });
      release(); await report;
      await expect(read).rejects.toThrow('runtime changed'); expect(reads).toEqual([]);
    } finally { switchRuntimeEndpoint({ apiBaseUrl: priorBase, runtimeKey: priorKey }); }
  });

  test('same-owner read waits for delivery and requests the actual scope', async () => {
    const paths: string[] = [];
    let release!: () => void; let started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const reached = new Promise<void>(resolve => { started = resolve; });
    request = spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input), 'http://app.test');
      if (url.pathname === '/api/session-knowledge/delivered') { started(); await gate; return Response.json({ recorded: true }); }
      if (url.pathname === '/api/session-knowledge') { paths.push(`${url.searchParams.get('directory')}:${url.searchParams.get('sessionId')}`); return Response.json({ text: 'project context', signature: 'new' }); }
      return Response.json({});
    });
    const report = reportSessionKnowledgeDelivered('/repo', 'session-current', 'sig'); await reached;
    const read = fetchSessionKnowledge('/repo', 'session-current'); expect(paths).toEqual([]);
    release(); await report;
    expect(await read).toEqual({ text: 'project context', signature: 'new' });
    expect(paths).toEqual(['/repo:session-current']);
  });
});
