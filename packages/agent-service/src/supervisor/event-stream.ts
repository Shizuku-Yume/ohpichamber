import type { CanonicalEvent, StreamInvalidated } from '@openchamber/agent-contract';
import type { SessionJournal } from '../projection/journal.ts';

// Kept above the journal's retained replay (1000 events) so a paused reader can
// hold one full replay plus live events before the stream is considered lost.
export const EVENT_STREAM_QUEUE_LIMIT = 2048;

export interface EventStreamResponse {
  destroyed: boolean;
  writableEnded: boolean;
  write(chunk: string): boolean;
  end(chunk?: string): void;
  on(event: 'drain', listener: () => void): void;
  off(event: 'drain', listener: () => void): void;
  once(event: 'close', listener: () => void): void;
  writeHead(status: number, headers: Record<string, string>): void;
  flushHeaders(): void;
}

const frame = (event: CanonicalEvent | StreamInvalidated): string => event.type === 'stream.invalidated'
  ? `event: stream.invalidated\ndata: ${JSON.stringify(event)}\n\n`
  : `id: ${event.epoch}:${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

export function deliverSessionStream(options: {
  response: EventStreamResponse;
  sessionId: string;
  journal: Pick<SessionJournal, 'subscribe'>;
  cursor: string | undefined;
}): void {
  const { response, sessionId, journal, cursor } = options;
  const pending: string[] = [];
  let blocked = false;
  let settled = false;
  let subscription: { replay: CanonicalEvent[]; unsubscribe: () => void } | undefined;

  function stop(): void {
    subscription?.unsubscribe();
    response.off('drain', drain);
  }

  function overflow(epoch: string): void {
    if (settled) return;
    settled = true;
    pending.length = 0;
    stop();
    const invalidated: StreamInvalidated = { type: 'stream.invalidated', sessionId, epoch, reason: 'DELIVERY_OVERFLOW' };
    response.end(frame(invalidated));
  }

  function flush(): void {
    while (!blocked && pending.length > 0) {
      // write() returning false means the frame is buffered, not lost: keep the
      // rest queued and resume from the socket's drain event.
      if (!response.write(pending.shift()!)) blocked = true;
    }
  }

  function drain(): void {
    blocked = false;
    flush();
  }

  const write = (event: CanonicalEvent | StreamInvalidated): void => {
    if (settled || response.destroyed || response.writableEnded) return;
    if (event.type === 'stream.invalidated') {
      // The stream is finished either way; retained events expire with its epoch.
      settled = true;
      pending.length = 0;
      stop();
      response.end(frame(event));
      return;
    }
    pending.push(frame(event));
    if (pending.length > EVENT_STREAM_QUEUE_LIMIT) { overflow(event.epoch); return; }
    flush();
  };

  // Subscribe and write captured replay in one synchronous turn.
  subscription = journal.subscribe(cursor, write);
  response.on('drain', drain);
  response.once('close', () => {
    settled = true;
    pending.length = 0;
    stop();
  });
  response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  response.flushHeaders();
  for (const event of subscription.replay) {
    write(event);
    if (settled || response.writableEnded || response.destroyed) break;
  }
}
