import { expect, test } from 'bun:test';
import { createServer, get } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { SessionJournal } from '../projection/journal.ts';
import type { ProjectionEvent, ProjectionInput, ProjectionSeed } from '../projection/protocol.ts';
import { deliverSessionStream, EVENT_STREAM_QUEUE_LIMIT, type EventStreamResponse } from './event-stream.ts';

const ListeningPortSchema = z.object({ port: z.number().int().positive() });
const session = { sessionId: 's', projectId: 'p', workspaceId: 'w', displayPath: '.', rootSessionId: 's' };
const seed: ProjectionSeed = { createdAt: 1, updatedAt: 1, branch: { branchId: 'branch:opaque', branchVersion: '1', leafMessageId: null }, turns: [], messages: [] };
const input = (event: ProjectionEvent, timestamp = 2): ProjectionInput => ({ timestamp, event });
const largeInput = (index: number) => input({ type: 'tool.started', toolCallId: `tool${index}`, toolName: 'bash', input: { arguments: ['x'.repeat(1024)] } });

test('a reader that has not consumed its socket receives a larger replay complete and in order', async () => {
  const journal = new SessionJournal(session, seed);
  const events = journal.append(Array.from({ length: 1000 }, (_, index) => largeInput(index)));
  const cursor = `${journal.runtime().epoch}:0`;
  const port = await new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const bound = ListeningPortSchema.safeParse(probe.address());
      probe.close(() => bound.success ? resolve(bound.data.port) : reject(new Error('A loopback port is required')));
    });
  });
  const server = createServer((_request: IncomingMessage, response: ServerResponse) => {
    deliverSessionStream({ response, sessionId: session.sessionId, journal, cursor });
  });
  await new Promise<void>(resolve => server.listen(port, '127.0.0.1', resolve));
  try {
    // The server writes the whole replay synchronously while this client has
    // not read a byte, so write() returns false before the body is consumed.
    const body = await new Promise<string>((resolve, reject) => {
      const request = get({ host: '127.0.0.1', port, path: '/events' }, response => {
        let text = '';
        let counted = 0;
        let received = 0;
        response.on('data', chunk => {
          text += chunk.toString('utf8');
          let boundary: number;
          while ((boundary = text.indexOf('\n\n', counted)) >= 0) { received += 1; counted = boundary + 2; }
          // A healthy SSE stream stays open, so the replay's frame count ends it.
          if (received >= events.length) { response.destroy(); resolve(text); }
        });
        response.on('end', () => resolve(text));
        response.on('error', reject);
      });
      request.on('error', reject);
    });
    expect(body).not.toContain('stream.invalidated');
    const ids = body.split('\n\n').flatMap(frame => {
      const match = /^id: (.*)$/m.exec(frame);
      return match ? [match[1]!] : [];
    });
    expect(ids).toEqual(events.map(event => `${event.epoch}:${event.sequence}`));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    journal.close();
  }
});

test('a reader that exceeds the bounded queue receives stream.invalidated', () => {
  const journal = new SessionJournal(session, seed);
  const cursor = `${journal.runtime().epoch}:0`;
  const ended: string[] = [];
  const response: EventStreamResponse = {
    destroyed: false,
    writableEnded: false,
    write(_chunk: string) { return false; },
    end(chunk?: string) { this.writableEnded = true; if (chunk !== undefined) ended.push(chunk); },
    once(_event: 'close', _listener: () => void) {},
    on(_event: 'drain', _listener: () => void) {},
    off(_event: 'drain', _listener: () => void) {},
    writeHead(_status: number, _headers: Record<string, string>) {},
    flushHeaders() {},
  };
  deliverSessionStream({ response, sessionId: session.sessionId, journal, cursor });
  journal.append(Array.from({ length: EVENT_STREAM_QUEUE_LIMIT + 2 }, (_, index) => largeInput(index)));
  expect(ended).toHaveLength(1);
  expect(ended[0]).toContain('"reason":"DELIVERY_OVERFLOW"');
  journal.close();
});
