import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { reportSessionKnowledgeDelivered, setSessionProjectContextPin } from './sessionKnowledgeApi';

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
