import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SessionMetadataSchema, SessionMetadataStateSchema } from '@openchamber/agent-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSessionMetadataStore } from './session-metadata-store.js';
import { createTurnDurationRecorder } from './turn-duration.js';

/** Polls until `check` answers true; both runners execute this the same way. */
const waitFor = async (check) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('condition was not met in time');
};

const dataDirs = [];
const makeDataDir = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openchamber-turn-duration-')); dataDirs.push(dir); return dir; };
afterEach(() => { while (dataDirs.length > 0) fs.rmSync(dataDirs.pop(), { recursive: true, force: true }); });

const envelope = (type, sequence, sessionId, fields = {}) => ({
  type, sessionId, epoch: 'epoch', sequence: String(sequence), timestamp: sequence, ...fields,
});
const started = (sessionId, runId, createdAt, sequence = 1) => envelope('run.started', sequence, sessionId, { runId, createdAt });
const finished = (type, sessionId, runId, finishedAt, sequence = 2) => envelope(type, sequence, sessionId, {
  runId, finishedAt, ...(type === 'run.failed' ? { error: 'provider failed' } : {}),
});

const setup = ({ children = [] } = {}) => {
  const persistSessionMetadataPatch = vi.fn(async () => ({}));
  const recorder = createTurnDurationRecorder({
    persistSessionMetadataPatch,
    isChildSession: (sessionID) => (children.includes(sessionID) ? true : undefined),
  });
  return { recorder, persistSessionMetadataPatch };
};

describe('createTurnDurationRecorder', () => {
  it('records a completed run with its idleness, outcome and length', () => {
    const { recorder, persistSessionMetadataPatch } = setup();
    const scope = { cwd: '/repo' };
    recorder.processCanonicalEvent(started('ses_a', 'run_1', 1_000), scope);
    recorder.processCanonicalEvent(finished('run.completed', 'ses_a', 'run_1', 9_000), scope);
    expect(persistSessionMetadataPatch.mock.calls).toEqual([[
      'ses_a',
      {
        openchamber: {
          workbench: { lastIdleAt: 9_000, lastTurnOutcome: 'completed' },
          turn: { endedAt: 9_000, durationMs: 8_000 },
        },
      },
      { directory: '/repo' },
    ]]);
  });

  it('records a failed run and a cancelled run with their own outcomes', () => {
    const { recorder, persistSessionMetadataPatch } = setup();
    recorder.processCanonicalEvent(started('ses_a', 'run_1', 1_000));
    recorder.processCanonicalEvent(finished('run.failed', 'ses_a', 'run_1', 4_000));
    recorder.processCanonicalEvent(started('ses_a', 'run_2', 5_000, 3));
    recorder.processCanonicalEvent(finished('run.cancelled', 'ses_a', 'run_2', 6_000, 4));
    expect(persistSessionMetadataPatch.mock.calls).toEqual([
      ['ses_a', {
        openchamber: {
          workbench: { lastIdleAt: 4_000, lastTurnOutcome: 'failed' },
          turn: { endedAt: 4_000, durationMs: 3_000 },
        },
      }, { directory: '' }],
      ['ses_a', {
        openchamber: {
          workbench: { lastIdleAt: 6_000, lastTurnOutcome: 'cancelled' },
          turn: { endedAt: 6_000, durationMs: 1_000 },
        },
      }, { directory: '' }],
    ]);
  });

  it('never measures a terminator it did not watch start, or the wrong run', () => {
    const { recorder, persistSessionMetadataPatch } = setup();
    // No start at all: a restart or reconnect may have hidden one.
    recorder.processCanonicalEvent(finished('run.completed', 'ses_a', 'run_1', 9_000));
    // A stale start from an earlier run cannot end this one.
    recorder.processCanonicalEvent(started('ses_a', 'run_1', 1_000));
    recorder.processCanonicalEvent(finished('run.completed', 'ses_a', 'run_2', 3_000));
    // Consuming a terminal event also forgets the start.
    recorder.processCanonicalEvent(started('ses_a', 'run_3', 4_000, 3));
    recorder.processCanonicalEvent(finished('run.completed', 'ses_a', 'run_3', 5_000, 4));
    recorder.processCanonicalEvent(finished('run.completed', 'ses_a', 'run_3', 6_000, 5));
    expect(persistSessionMetadataPatch.mock.calls).toEqual([[
      'ses_a',
      {
        openchamber: {
          workbench: { lastIdleAt: 5_000, lastTurnOutcome: 'completed' },
          turn: { endedAt: 5_000, durationMs: 1_000 },
        },
      },
      { directory: '' },
    ]]);
  });

  it('keeps a same-millisecond run at zero instead of a negative length', () => {
    const { recorder, persistSessionMetadataPatch } = setup();
    recorder.processCanonicalEvent(started('ses_a', 'run_1', 5_000));
    recorder.processCanonicalEvent(finished('run.completed', 'ses_a', 'run_1', 5_000));
    expect(persistSessionMetadataPatch.mock.calls).toEqual([[
      'ses_a',
      {
        openchamber: {
          workbench: { lastIdleAt: 5_000, lastTurnOutcome: 'completed' },
          turn: { endedAt: 5_000, durationMs: 0 },
        },
      },
      { directory: '' },
    ]]);
  });

  it('records nothing for a subsession and forgets a deleted session', () => {
    const { recorder, persistSessionMetadataPatch } = setup({ children: ['ses_child'] });
    recorder.processCanonicalEvent(started('ses_child', 'run_1', 1_000));
    recorder.processCanonicalEvent(finished('run.completed', 'ses_child', 'run_1', 2_000));
    recorder.processCanonicalEvent(started('ses_gone', 'run_2', 3_000));
    recorder.processCanonicalEvent(envelope('session.deleted', 4, 'ses_gone', { deletedSessionIds: ['ses_gone'] }));
    recorder.processCanonicalEvent(finished('run.completed', 'ses_gone', 'run_2', 9_000, 5));
    expect(persistSessionMetadataPatch).not.toHaveBeenCalled();
  });

  it('ignores payloads the canonical contract would reject', () => {
    const { recorder, persistSessionMetadataPatch } = setup();
    recorder.processCanonicalEvent(started('ses_a', 'run_1', 1_000));
    // A wire payload without the envelope fields cannot start a run, and a
    // non-positive sequence is not a canonical event either.
    for (const payload of [
      null, {}, { type: 'part.delta' },
      { type: 'run.started', sessionId: 'ses_a', runId: 'run_1', createdAt: 1_000 },
      { ...started('ses_a', 'run_1', 1_000), sequence: '0' },
    ]) {
      expect(() => recorder.processCanonicalEvent(payload)).not.toThrow();
    }
    recorder.processCanonicalEvent(finished('run.completed', 'ses_a', 'run_1', 2_000, 2));
    expect(persistSessionMetadataPatch).toHaveBeenCalledTimes(1);
  });

  it('keeps going when a write fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const persistSessionMetadataPatch = vi.fn(async () => { throw new Error('offline'); });
    const recorder = createTurnDurationRecorder({ persistSessionMetadataPatch, isChildSession: () => undefined });
    recorder.processCanonicalEvent(started('ses_a', 'run_1', 1_000));
    recorder.processCanonicalEvent(finished('run.completed', 'ses_a', 'run_1', 2_000));
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('turn duration against the Host metadata store', () => {
  it('persists a recorded run as canonical metadata and announces the committed revision', async () => {
    const store = createSessionMetadataStore({ dataDir: makeDataDir() });
    const events = [];
    const recorder = createTurnDurationRecorder({
      persistSessionMetadataPatch: async (sessionID, patch, { directory }) => {
        const result = await store.setSessionMetadata(sessionID, patch);
        const state = SessionMetadataStateSchema.parse({ sessionId: sessionID, revision: result.revision, metadata: result.metadata });
        if (result.changed) events.push(state);
        return result;
      },
      isChildSession: () => undefined,
    });
    recorder.processCanonicalEvent(started('ses_a', 'run_1', 1_000));
    recorder.processCanonicalEvent(finished('run.completed', 'ses_a', 'run_1', 5_500), { cwd: '/repo' });
    await waitFor(() => events.length === 1);
    expect(events[0]).toEqual({
      sessionId: 'ses_a', revision: '1',
      metadata: {
        openchamber: {
          workbench: { lastIdleAt: 5_500, lastTurnOutcome: 'completed' },
          turn: { endedAt: 5_500, durationMs: 4_500 },
        },
      },
    });
    // What the store hands back is the contract's own shape, not a guess.
    await store.close();
    const reopened = createSessionMetadataStore({ dataDir: dataDirs.at(-1) });
    const stored = await reopened.get('ses_a');
    expect(SessionMetadataSchema.parse(stored)).toEqual(events[0].metadata);
    await reopened.close();
  });

  it('keeps the pin and the view watermark when a later run writes its own turn', async () => {
    const store = createSessionMetadataStore({ dataDir: makeDataDir() });
    await store.setSessionMetadata('ses_a', { openchamber: { pinned: { at: 7 }, workbench: { viewedAt: 9 } } });
    const recorder = createTurnDurationRecorder({
      persistSessionMetadataPatch: (sessionID, patch) => store.setSessionMetadata(sessionID, patch),
      isChildSession: () => undefined,
    });
    recorder.processCanonicalEvent(started('ses_a', 'run_2', 10_000));
    recorder.processCanonicalEvent(finished('run.failed', 'ses_a', 'run_2', 11_250));
    await waitFor(async () => (await store.get('ses_a'))?.openchamber?.turn?.endedAt === 11_250);
    await expect(store.get('ses_a')).resolves.toEqual({
      openchamber: {
        pinned: { at: 7 },
        workbench: { viewedAt: 9, lastIdleAt: 11_250, lastTurnOutcome: 'failed' },
        turn: { endedAt: 11_250, durationMs: 1_250 },
      },
    });
    await store.close();
  });
});
