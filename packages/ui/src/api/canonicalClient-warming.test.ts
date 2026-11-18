import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { CanonicalApiError, CanonicalClient } from './canonicalClient';
import { configureRuntimeUrlResolver, getRuntimeUrlResolver, setRuntimeUrlResolver } from '../lib/runtime-url';
import type { RuntimeUrlResolver } from '../lib/runtime-url';

const client = new CanonicalClient();
const workspaceId = 'workspace/a';
let server: Server;
let previousResolver: RuntimeUrlResolver;
let responseBody = '';
let status: number;
let calls: Array<{ method: string; url: string; body: string }>;
function setPayload<T>(value: T): void {
  responseBody = JSON.stringify(value);
}
beforeEach(async () => {
  calls = []; status = 200;
  setPayload({ workspaceId, revision: '7', mode: 'streaming' });
  server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += String(chunk);
    calls.push({ method: request.method!, url: request.url!, body });
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(responseBody);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  // SAFETY: server.listen above binds TCP on loopback, so address() is an AddressInfo.
  const address = server.address() as AddressInfo;
  previousResolver = getRuntimeUrlResolver();
  configureRuntimeUrlResolver({ apiBaseUrl: `http://127.0.0.1:${address.port}` });
});
afterEach(async () => {
  setRuntimeUrlResolver(previousResolver);
  const closed = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  server.closeAllConnections();
  await closed;
});

describe('canonical warming transport boundary', () => {
  test('rejects foreign workspace reads, malformed revisions and non-native modes', async () => {
    for (const state of [
      { workspaceId: 'foreign', revision: '7', mode: 'idle' },
      { workspaceId, revision: '18446744073709551616', mode: 'idle' },
      { workspaceId, revision: '7', mode: 'enabled' },
      { workspaceId, revision: '7', mode: 'idle', enabled: true },
    ]) {
      setPayload(state);
      await expect(client.readCacheWarming(workspaceId)).rejects.toThrow();
    }
  });
  test('rejects foreign, stale, wrong-mode and inconsistent update receipts', async () => {
    for (const result of [
      { persisted: { workspaceId: 'foreign', revision: '8', mode: 'idle' }, status: 'no-active-workers', workers: [] },
      { persisted: { workspaceId, revision: '7', mode: 'idle' }, status: 'no-active-workers', workers: [] },
      { persisted: { workspaceId, revision: '8', mode: 'off' }, status: 'no-active-workers', workers: [] },
      { persisted: { workspaceId, revision: '9', mode: 'idle' }, status: 'no-active-workers', workers: [] },
      { persisted: { workspaceId, revision: '8', mode: 'idle' }, status: 'applied', workers: [] },
      { persisted: { workspaceId, revision: '8', mode: 'idle' }, status: 'partial', workers: [] },
    ]) {
      setPayload(result);
      await expect(client.updateCacheWarming(workspaceId, { expectedRevision: '7', mode: 'idle' })).rejects.toThrow();
    }
  });
  test('rejects invalid CAS counters before transport and propagates abort signals', async () => {
    expect(() => client.updateCacheWarming(workspaceId, { expectedRevision: '-1', mode: 'idle' })).toThrow();
    expect(calls).toEqual([]);
    const controller = new AbortController(); controller.abort();
    await expect(client.readCacheWarming(workspaceId, controller.signal)).rejects.toThrow();
    await expect(client.updateCacheWarming(workspaceId, { expectedRevision: '7', mode: 'idle' }, controller.signal)).rejects.toThrow();
    expect(calls).toEqual([]);
  });
  test('preserves canonical revision-conflict details', async () => {
    status = 409;
    const problem = { type: 'urn:ohpichamber:problem:CATALOG_CONFLICT', title: 'Revision conflict', status, detail: 'Workspace revision changed', code: 'CATALOG_CONFLICT', retryable: false };
    setPayload(problem);
    try {
      await client.updateCacheWarming(workspaceId, { expectedRevision: '7', mode: 'idle' });
      throw new Error('Expected conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(CanonicalApiError);
      if (!(error instanceof CanonicalApiError)) throw error;
      expect(error.problem).toEqual(problem);
    }
  });

  test('reads and updates valid session cache warming state', async () => {
    const sessionId = 'session/1';
    const sessionState = {
      sessionId,
      workspaceId,
      revision: '0',
      mode: null,
      workspaceMode: 'idle',
      effectiveMode: 'idle',
    };
    setPayload(sessionState);
    await expect(client.readSessionCacheWarming(sessionId)).resolves.toEqual(sessionState);
    expect(calls[0]).toEqual({
      method: 'GET',
      url: '/api/agent/v1/sessions/session%2F1/cache-warming',
      body: '',
    });

    const applyResult = {
      persisted: {
        sessionId,
        workspaceId,
        revision: '1',
        mode: 'streaming',
        workspaceMode: 'idle',
        effectiveMode: 'streaming',
      },
      status: 'applied',
      worker: {
        worker: { rootSessionId: sessionId, workspaceId, workerGeneration: 'gen-1' },
        outcome: 'applied',
        mode: 'streaming',
      },
    };
    setPayload(applyResult);
    await expect(
      client.updateSessionCacheWarming(sessionId, { expectedRevision: '0', mode: 'streaming' }),
    ).resolves.toEqual(applyResult);
    expect(calls[1]).toEqual({
      method: 'PUT',
      url: '/api/agent/v1/sessions/session%2F1/cache-warming',
      body: JSON.stringify({ expectedRevision: '0', mode: 'streaming' }),
    });
  });

  test('rejects inconsistent session effectiveMode, wrong mode, and non-incremented revision', async () => {
    const sessionId = 'session-1';
    setPayload({
      sessionId,
      workspaceId,
      revision: '1',
      mode: 'streaming',
      workspaceMode: 'off',
      effectiveMode: 'off',
    });
    await expect(client.readSessionCacheWarming(sessionId)).rejects.toThrow();

    for (const badResult of [
      {
        persisted: {
          sessionId,
          workspaceId,
          revision: '8',
          mode: 'off',
          workspaceMode: 'idle',
          effectiveMode: 'off',
        },
        status: 'no-active-worker',
        worker: null,
      },
      {
        persisted: {
          sessionId,
          workspaceId,
          revision: '7',
          mode: 'streaming',
          workspaceMode: 'idle',
          effectiveMode: 'streaming',
        },
        status: 'no-active-worker',
        worker: null,
      },
      {
        persisted: {
          sessionId,
          workspaceId,
          revision: '9',
          mode: 'streaming',
          workspaceMode: 'idle',
          effectiveMode: 'streaming',
        },
        status: 'no-active-worker',
        worker: null,
      },
    ]) {
      setPayload(badResult);
      await expect(
        client.updateSessionCacheWarming(sessionId, { expectedRevision: '7', mode: 'streaming' }),
      ).rejects.toThrow();
    }
  });

  test('propagates abort signals and preserves 409 CATALOG_CONFLICT for session warming', async () => {
    const sessionId = 'session-1';
    const controller = new AbortController();
    controller.abort();
    await expect(client.readSessionCacheWarming(sessionId, controller.signal)).rejects.toThrow();
    await expect(
      client.updateSessionCacheWarming(sessionId, { expectedRevision: '0', mode: 'idle' }, controller.signal),
    ).rejects.toThrow();
    expect(calls).toEqual([]);

    status = 409;
    const problem = {
      type: 'urn:ohpichamber:problem:CATALOG_CONFLICT',
      title: 'Revision conflict',
      status,
      detail: 'Session revision changed',
      code: 'CATALOG_CONFLICT',
      retryable: false,
    };
    setPayload(problem);
    try {
      await client.updateSessionCacheWarming(sessionId, { expectedRevision: '0', mode: 'idle' });
      throw new Error('Expected conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(CanonicalApiError);
      if (!(error instanceof CanonicalApiError)) throw error;
      expect(error.problem).toEqual(problem);
    }
  });
});
