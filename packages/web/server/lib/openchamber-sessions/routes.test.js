import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createProjectDirectoryRuntime } from '../host/project-directory-runtime.js';
import { createHostSessionState } from '../host/session-state.js';
import { history as historyFixture, runtimeSession, snapshot as snapshotFixture } from '../event-stream/canonical-test-fixtures.js';
import { mergeMetadataPatch } from './session-metadata-store.js';

let routeFixture;
let routeFixtureDataDir;
let testWorkspaceDirectory;
let testAgentDirectory;

const createMemorySessionMetadataStore = () => {
  const entries = new Map(); const revisions = new Map();
  const merge = mergeMetadataPatch;
  return { entries, get: async id => entries.get(id) ?? null, getState: async id => entries.has(id) ? { metadata: entries.get(id), revision: String(revisions.get(id) ?? 1) } : null, setSessionMetadata: async (id, patch) => { const current = entries.get(id); const metadata = merge(current, patch); const changed = JSON.stringify(current) !== JSON.stringify(metadata); const revision = (revisions.get(id) ?? (current ? 1 : 0)) + (changed ? 1 : 0); entries.set(id, metadata); revisions.set(id, revision); return { metadata, revision: String(revision), changed }; }, updateSessionMetadata: async (id, decide) => { const current = entries.get(id) ?? {}; const patch = decide(current); if (!patch) return { metadata: current, revision: String(revisions.get(id) ?? (entries.has(id) ? 1 : 0)), changed: false }; const metadata = merge(current, patch); const revision = (revisions.get(id) ?? (entries.has(id) ? 1 : 0)) + 1; entries.set(id, metadata); revisions.set(id, revision); return { metadata, revision: String(revision), changed: true }; } };
};
const createMemoryArchiveStore = () => { const entries = new Map(); return { entries, getState: async id => entries.has(id) ? { archivedAt: entries.get(id), revision: '1' } : null, archive: async (ids, archivedAt) => ({ archived: ids.map(id => { entries.set(id, archivedAt ?? 1); return { id, archivedAt: archivedAt ?? 1 }; }), failedIds: [] }), unarchive: async ids => ({ restored: ids.map(id => { entries.delete(id); return { id, archivedAt: null }; }), failedIds: [] }) }; };
const validScope = (sessionId) => ({
  sessionId,
  rootSessionId: sessionId,
  projectId: 'proj_1',
  workspaceId: 'ws_1',
  cwd: testWorkspaceDirectory ?? '/repo/app',
  agentDirectoryId: 'agent-dir-1',
  agentDirectory: testAgentDirectory ?? '/repo/app/.agents',
  displayPath: 'app',
});
const createApp = (overrides = {}) => {
  const app = express(); const archiveStore = overrides.archiveStore ?? createMemoryArchiveStore(); const sessionMetadataStore = overrides.sessionMetadataStore ?? createMemorySessionMetadataStore();
  const { registerOpenChamberSessionRoutes } = overrides.routes;
  registerOpenChamberSessionRoutes(app, {
    service: { request: vi.fn() },
    agentScopeStore: overrides.agentScopeStore ?? routeFixture.agentScopeStore,
    resolveWorkspaceScope: async () => validScope('workspace'),
    resolveSessionScope: async id => validScope(id),
    resolveHostSessionScope: async id => id === 'ses_admitted' ? validScope(id) : null,
    registerSessionScope: async () => true,
    resolveAttachments: async () => [],
    capturePrompt: async (_scope, body) => body,
    beforeDispatch: async () => { },
    onPromptAccepted: async () => { },
    directCommandAdmissionStore: overrides.directCommandAdmissionStore ?? routeFixture.directCommandAdmissionStore,
    archiveStore,
    sessionMetadataStore,
    isRequestOriginAllowed: async () => true,
    ...overrides,
  });
  return { app, archiveStore, sessionMetadataStore, hostSessionState: routeFixture };
};

describe('canonical session route contracts', () => {
  let routes;
  beforeAll(async () => {
    routes = await import('./routes.js');
    routeFixtureDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openchamber-routes-admission-'));
    testWorkspaceDirectory = path.join(routeFixtureDataDir, 'app');
    testAgentDirectory = path.join(testWorkspaceDirectory, '.agents');
    fs.mkdirSync(testAgentDirectory, { recursive: true });
    routeFixture = createHostSessionState({ dataDir: routeFixtureDataDir });
    await routeFixture.initialize();
    await routeFixture.agentScopeStore.ensureWorkspace({
      hostProjectId: 'proj_1',
      projectId: 'proj_1',
      workspaceId: 'ws_1',
      projectDirectory: testWorkspaceDirectory,
      workspaceDirectory: testWorkspaceDirectory,
      agentDirectory: testAgentDirectory,
      name: 'Project',
    });
  });
  afterAll(async () => {
    await routeFixture.close();
    fs.rmSync(routeFixtureDataDir, { recursive: true, force: true });
  });
  it('requires the origin gate before wiring routes', () => { const app = express(); expect(() => routes.registerOpenChamberSessionRoutes(app, { sessionService: {} })).toThrow('Session routes require isRequestOriginAllowed'); });
  it('rejects SDK entry IDs and inferred fork modes at the public boundary', async () => {
    const { app } = createApp({ routes });
    await request(app).post('/api/openchamber/sessions/ses_admitted/fork').send({ entryId: 'native-entry', messageId: 'public-message', mode: 'selected' }).expect(400);
    await request(app).post('/api/openchamber/sessions/ses_admitted/fork').send({ messageId: 'public-message' }).expect(400);
    await request(app).post('/api/openchamber/sessions/ses_admitted/fork').send({ messageId: 'public-message', mode: 'full' }).expect(400);
  });
  it('rejects metadata and archive operations for an unauthorized Host session', async () => { const { app } = createApp({ routes }); await request(app).get('/api/openchamber/sessions/ses_foreign/metadata').expect(404); await request(app).post('/api/openchamber/sessions/archive').send({ ids: ['ses_foreign'] }).expect(404); });
  it('keeps admitted Host metadata and archive operations available when native service is unavailable', async () => { const archiveStore = createMemoryArchiveStore(); const sessionMetadataStore = createMemorySessionMetadataStore(); const { app } = createApp({ routes, archiveStore, sessionMetadataStore }); await request(app).patch('/api/openchamber/sessions/ses_admitted/metadata').send({ changes: { notes: 'host-owned' } }).expect(200); await request(app).get('/api/openchamber/sessions/ses_admitted/metadata').expect(200); await request(app).post('/api/openchamber/sessions/archive').send({ ids: ['ses_admitted'], archivedAt: 1700 }).expect(200); await request(app).post('/api/openchamber/sessions/unarchive').send({ ids: ['ses_admitted'] }).expect(200); });
  it('rejects malformed archive batches', async () => { const { app } = createApp({ routes }); await request(app).post('/api/openchamber/sessions/archive').send({ ids: [] }).expect(400); await request(app).post('/api/openchamber/sessions/archive').send({ ids: ['ses_admitted'], archivedAt: -1 }).expect(400); });
  it('reopens a cold session before a run, starts one worker, and keeps the second send live', async () => {
    const live = new Set(); const calls = []; let workerStarts = 0;
    const runtime = id => ({
      sessionId: id, rootSessionId: id, projectId: 'proj_1', workspaceId: 'ws_1', displayPath: 'app',
      createdAt: 1, updatedAt: 2, epoch: `epoch-${id}`, headSequence: '0', runtimeStatus: 'idle', activeRunId: null, mode: { kind: 'main' }
    });
    const service = {
      request: async (pathname, init = {}) => {
        calls.push(pathname);
        const id = decodeURIComponent(pathname.split('/').at(-2));
        if (pathname.endsWith('/reopen')) {
          if (!live.has(id)) { live.add(id); workerStarts += 1; }
          return Response.json(runtime(id));
        }
        if (pathname.endsWith('/runs')) {
          if (!live.has(id)) return Response.json({ type: 'urn:ohpichamber:problem:SERVICE_UNAVAILABLE', title: 'Unavailable', status: 503, code: 'SERVICE_UNAVAILABLE', detail: 'Cold session has no worker', retryable: true }, { status: 503 });
          const body = JSON.parse(init.body);
          return Response.json({ run: { runId: body.runId, sessionId: id, status: 'running', origin: 'host', createdAt: 1 } });
        }
        throw new Error(`Unexpected service request ${pathname}`);
      }
    };
    const { createOpenChamberSessionService, registerCanonicalSessionRoutes } = routes;
    const sessionService = createOpenChamberSessionService({
      agentScopeStore: routeFixture.agentScopeStore,
      service,
      resolveWorkspaceScope: async () => validScope('workspace'),
      resolveSessionScope: async id => validScope(id),
      resolveHostSessionScope: async id => id === 'ses_admitted' ? validScope(id) : null,
      registerSessionScope: async () => true,
      resolveAttachments: async () => [],
      capturePrompt: async (_scope, body) => body,
      beforeDispatch: async () => { },
      onPromptAccepted: async () => { },
      directCommandAdmissionStore: routeFixture.directCommandAdmissionStore,
      archiveStore: createMemoryArchiveStore(),
      sessionMetadataStore: createMemorySessionMetadataStore(),
    });
    const app = express();
    const router = express.Router();
    registerCanonicalSessionRoutes(router, sessionService);
    app.use('/api/agent/v1/sessions', router);
    const prompt = {
      input: { text: 'Cold prompt', attachments: [], context: [] },
      options: { providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null }
    };
    const first = await request(app).post('/api/agent/v1/sessions/ses_admitted/runs').send(prompt).expect(200);
    expect(first.body.run).toMatchObject({ sessionId: 'ses_admitted', status: 'running' });
    const second = await request(app).post('/api/agent/v1/sessions/ses_admitted/runs').send(prompt).expect(200);
    expect(second.body.run).toMatchObject({ sessionId: 'ses_admitted', status: 'running' });
    expect(workerStarts).toBe(1);
    expect(calls.filter(path => path.endsWith('/reopen'))).toHaveLength(2);
    const afterValid = calls.length;
    await request(app).post('/api/agent/v1/sessions/ses_admitted/runs').send({}).expect(400);
    expect(calls).toHaveLength(afterValid);
  });
  it('enforces Host admission invariant: rejects cold send when agentScopeStore is missing instead of bypassing admission', async () => {
    const calls = [];
    const service = {
      request: async (pathname) => {
        calls.push(pathname);
        return Response.json({});
      }
    };
    const { createOpenChamberSessionService, registerCanonicalSessionRoutes } = routes;
    const sessionService = createOpenChamberSessionService({
      service,
      // agentScopeStore intentionally omitted to verify invariant enforcement
      resolveWorkspaceScope: async () => validScope('workspace'),
      resolveSessionScope: async id => validScope(id),
      resolveHostSessionScope: async id => id === 'ses_admitted' ? validScope(id) : null,
      registerSessionScope: async () => true,
      resolveAttachments: async () => [],
      capturePrompt: async (_scope, body) => body,
      beforeDispatch: async () => { },
      onPromptAccepted: async () => { },
      directCommandAdmissionStore: routeFixture.directCommandAdmissionStore,
      archiveStore: createMemoryArchiveStore(),
      sessionMetadataStore: createMemorySessionMetadataStore(),
    });
    const app = express();
    const router = express.Router();
    registerCanonicalSessionRoutes(router, sessionService);
    app.use('/api/agent/v1/sessions', router);
    const prompt = {
      input: { text: 'Cold prompt', attachments: [], context: [] },
      options: { providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null }
    };
    const response = await request(app).post('/api/agent/v1/sessions/ses_admitted/runs').send(prompt).expect(503);
    expect(response.body).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      detail: 'Host session admission authority is unavailable',
    });
    expect(calls.filter(path => path.endsWith('/reopen'))).toHaveLength(0);
  });

  it('merges and announces workbench metadata patches and broadcasts each committed change', async () => {
    const sessionMetadataStore = createMemorySessionMetadataStore();
    const broadcastGlobalUiEvent = vi.fn();
    const { app } = createApp({ routes, sessionMetadataStore, broadcastGlobalUiEvent });

    await request(app).patch('/api/openchamber/sessions/ses_admitted/metadata')
      .send({
        changes: {
          openchamber: {
            pinned: { at: 1_700 }, workbench: { lastIdleAt: 9, lastTurnOutcome: 'completed' },
            turn: { endedAt: 9, durationMs: 4_000 },
          }
        }
      })
      .expect(200);
    // A view advances one field; the pin and the finished turn survive.
    const viewed = await request(app).patch('/api/openchamber/sessions/ses_admitted/metadata')
      .send({ changes: { openchamber: { workbench: { viewedAt: 9 } } } })
      .expect(200);
    expect(viewed.body).toEqual({
      sessionId: 'ses_admitted', revision: '2',
      metadata: {
        openchamber: {
          pinned: { at: 1_700 }, workbench: { lastIdleAt: 9, viewedAt: 9, lastTurnOutcome: 'completed' },
          turn: { endedAt: 9, durationMs: 4_000 },
        }
      },
    });
    // Unpinning deletes the pin alone; the run record is untouched.
    const unpinned = await request(app).patch('/api/openchamber/sessions/ses_admitted/metadata')
      .send({ changes: { openchamber: { pinned: null } } })
      .expect(200);
    expect(unpinned.body.metadata).toEqual({
      openchamber: {
        workbench: { lastIdleAt: 9, viewedAt: 9, lastTurnOutcome: 'completed' }, turn: { endedAt: 9, durationMs: 4_000 },
      }
    });
    expect(broadcastGlobalUiEvent).toHaveBeenCalledTimes(3);
    expect(broadcastGlobalUiEvent).toHaveBeenLastCalledWith({
      type: 'openchamber:session-metadata',
      properties: { sessionId: 'ses_admitted', sessionID: 'ses_admitted', metadata: unpinned.body.metadata, revision: '3' },
    });
  });

  it('rejects malformed workbench metadata without writing or announcing', async () => {
    const sessionMetadataStore = createMemorySessionMetadataStore();
    const broadcastGlobalUiEvent = vi.fn();
    const { app } = createApp({ routes, sessionMetadataStore, broadcastGlobalUiEvent });
    for (const changes of [
      { openchamber: { pinned: {} } },
      { openchamber: { workbench: { lastTurnOutcome: 'aborted' } } },
      { openchamber: { turn: { endedAt: 1, durationMs: -1 } } },
    ]) await request(app).patch('/api/openchamber/sessions/ses_admitted/metadata').send({ changes }).expect(400);
    expect(sessionMetadataStore.entries.size).toBe(0);
    expect(broadcastGlobalUiEvent).not.toHaveBeenCalled();
  });

  describe('session links the UI owns', () => {
    const agentEntry = {
      id: 'acme/app#7', number: 7, title: 'Add search', url: 'https://github.com/acme/app/pull/7', kind: 'pull', linkedAt: 5,
    };
    const uiEntry = {
      id: 'linear:ENG-12', identifier: 'ENG-12', title: 'Spec', url: 'https://linear.app/acme/issue/eng-12', kind: 'linear', linkedAt: 9,
    };
    const trackerEntry = {
      id: 'jira:OPS-4', provider: 'jira', identifier: 'OPS-4', title: 'Outage', url: 'https://jira.example/browse/OPS-4', kind: 'tracker', linkedAt: 10,
    };

    it('persists mixed tracker operations through the Host and preserves existing links', async () => {
      const { app } = createApp({ routes, sessionMetadataStore: routeFixture.sessionMetadataStore });
      const sessionId = 'ses_admitted';
      const legacyLinear = { ...uiEntry, provider: 'linear' };
      await routeFixture.sessionMetadataStore.setSessionMetadata(sessionId, { openchamber: { linked_issues: [legacyLinear, agentEntry] } });
      const issue = { id: 'acme/app#8', number: 8, title: 'Issue', url: 'https://github.com/acme/app/issues/8', kind: 'issue', linkedAt: 11 };

      const linked = await request(app).post(`/api/openchamber/sessions/${sessionId}/links`)
        .send({ entries: [trackerEntry, issue], linked: true }).expect(200);
      expect(linked.body.metadata.openchamber.linked_issues).toEqual([legacyLinear, agentEntry, trackerEntry, issue]);
      const readBack = await request(app).get(`/api/openchamber/sessions/${sessionId}/metadata`).expect(200);
      expect(readBack.body.metadata).toEqual(linked.body.metadata);

      const neutralLinear = { ...legacyLinear, kind: 'tracker' };
      const linearRelinked = await request(app).post(`/api/openchamber/sessions/${sessionId}/links`)
        .send({ entries: [neutralLinear], linked: true }).expect(200);
      expect(linearRelinked.body.metadata.openchamber.linked_issues).toEqual([agentEntry, trackerEntry, issue, legacyLinear]);

      const unlinked = await request(app).post(`/api/openchamber/sessions/${sessionId}/links`)
        .send({ entries: [trackerEntry, issue], linked: false }).expect(200);
      expect(unlinked.body.metadata.openchamber.linked_issues).toEqual([agentEntry, legacyLinear]);
      expect((await routeFixture.sessionMetadataStore.getState(sessionId)).metadata).toEqual(unlinked.body.metadata);
    });

    it('rejects invalid tracker identities atomically and checks Host scope', async () => {
      const { app, sessionMetadataStore } = createApp({ routes });
      sessionMetadataStore.entries.set('ses_admitted', { openchamber: { linked_issues: [uiEntry] } });
      for (const bad of [
        { ...trackerEntry, provider: undefined },
        { ...trackerEntry, provider: 'INVALID' },
        { ...trackerEntry, identifier: '' },
        { ...trackerEntry, identifier: '  ' },
        { ...trackerEntry, id: 'jira:OTHER-1' },
        { ...trackerEntry, linkedAt: undefined },
        { ...trackerEntry, author: 42 },
        { ...trackerEntry, unexpected: true },
      ]) {
        await request(app).post('/api/openchamber/sessions/ses_admitted/links')
          .send({ entries: [agentEntry, bad], linked: true }).expect(400);
      }
      await request(app).post('/api/openchamber/sessions/ses_foreign/links')
        .send({ entries: [trackerEntry], linked: true }).expect(404);
      expect(await sessionMetadataStore.get('ses_admitted')).toEqual({ openchamber: { linked_issues: [uiEntry] } });
    });

    it('appends to the links already on the record and announces the merged metadata', async () => {
      const { app, sessionMetadataStore } = createApp({ routes });
      const broadcastGlobalUiEvent = vi.fn();
      // Rebuild with the broadcast spy so the fallback writer announces.
      const built = createApp({ routes, sessionMetadataStore, broadcastGlobalUiEvent });
      // As if an agent's `session.link` had already written this session.
      sessionMetadataStore.entries.set('ses_admitted', { openchamber: { linked_issues: [agentEntry] } });

      const response = await request(built.app)
        .post('/api/openchamber/sessions/ses_admitted/links')
        .send({ entries: [uiEntry], linked: true, directory: '/repo/app' })
        .expect(200);

      expect(response.body.metadata.openchamber.linked_issues).toEqual([agentEntry, uiEntry]);
      await expect(sessionMetadataStore.get('ses_admitted')).resolves.toEqual(response.body.metadata);
      expect(broadcastGlobalUiEvent).toHaveBeenCalledWith({
        type: 'openchamber:session-metadata',
        properties: { sessionID: 'ses_admitted', metadata: response.body.metadata, revision: expect.any(String) },
      });
    });

    it('refreshes a re-linked entry and keeps the rest of the list', async () => {
      const { app, sessionMetadataStore } = createApp({ routes });
      sessionMetadataStore.entries.set('ses_admitted', { openchamber: { linked_issues: [agentEntry, uiEntry] } });

      const response = await request(app)
        .post('/api/openchamber/sessions/ses_admitted/links')
        .send({ entries: [{ ...agentEntry, title: 'Add search (renamed)' }], linked: true })
        .expect(200);

      expect(response.body.metadata.openchamber.linked_issues).toEqual([
        uiEntry,
        { ...agentEntry, title: 'Add search (renamed)' },
      ]);
    });

    it('unlinks by id and leaves unrelated entries', async () => {
      const { app, sessionMetadataStore } = createApp({ routes });
      sessionMetadataStore.entries.set('ses_admitted', { openchamber: { linked_issues: [agentEntry, uiEntry] } });

      const response = await request(app)
        .post('/api/openchamber/sessions/ses_admitted/links')
        .send({ entries: [{ id: 'acme/app#7', title: 'Add search', url: 'https://github.com/acme/app/pull/7', kind: 'pull' }], linked: false })
        .expect(200);

      expect(response.body.metadata.openchamber.linked_issues).toEqual([uiEntry]);
    });

    it('applies a batch in one write', async () => {
      const { app, sessionMetadataStore } = createApp({ routes });
      const broadcastGlobalUiEvent = vi.fn();
      const built = createApp({ routes, sessionMetadataStore, broadcastGlobalUiEvent });
      const second = { id: 'acme/app#8', number: 8, title: 'Second', url: 'https://github.com/acme/app/issues/8', kind: 'issue', linkedAt: 9 };

      const response = await request(built.app)
        .post('/api/openchamber/sessions/ses_admitted/links')
        .send({ entries: [uiEntry, second], linked: true })
        .expect(200);

      expect(response.body.metadata.openchamber.linked_issues).toEqual([uiEntry, second]);
      expect(broadcastGlobalUiEvent).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid entry with 400 and writes nothing', async () => {
      const { app, sessionMetadataStore } = createApp({ routes });
      const broadcastGlobalUiEvent = vi.fn();
      const built = createApp({ routes, sessionMetadataStore, broadcastGlobalUiEvent });
      sessionMetadataStore.entries.set('ses_admitted', { openchamber: { linked_issues: [agentEntry] } });

      await request(built.app)
        .post('/api/openchamber/sessions/ses_admitted/links')
        .send({ entries: [{ id: 'x', title: 'No kind', url: 'https://x.dev/1' }], linked: true })
        .expect(400);
      await request(built.app)
        .post('/api/openchamber/sessions/ses_admitted/links')
        .send({ entries: [uiEntry] })
        .expect(400);
      await request(built.app)
        .post('/api/openchamber/sessions/ses_admitted/links')
        .send({ entries: 'nope', linked: true })
        .expect(400);

      await expect(sessionMetadataStore.get('ses_admitted'))
        .resolves.toEqual({ openchamber: { linked_issues: [agentEntry] } });
      expect(broadcastGlobalUiEvent).not.toHaveBeenCalled();
    });

    it('writes nothing when the operation changes no entry', async () => {
      const { app, sessionMetadataStore } = createApp({ routes });
      const broadcastGlobalUiEvent = vi.fn();
      const built = createApp({ routes, sessionMetadataStore, broadcastGlobalUiEvent });
      await request(built.app)
        .post('/api/openchamber/sessions/ses_admitted/links')
        .send({ entries: [{ id: 'acme/app#99', number: 99, title: 'T', url: 'https://github.com/acme/app/issues/99', kind: 'issue' }], linked: false })
        .expect(200, { metadata: {} });

      expect(broadcastGlobalUiEvent).not.toHaveBeenCalled();
    });
  });

  describe('session create with parent link', () => {
    it('authorizes parent session in the same workspace and sets parentSessionId', async () => {
      const capturedBootstrap = [];
      await routeFixture.agentScopeStore.ensureWorkspace({
        hostProjectId: 'proj_1', projectId: 'proj_1', workspaceId: 'ws_1',
        projectDirectory: testWorkspaceDirectory, workspaceDirectory: testWorkspaceDirectory, agentDirectory: testAgentDirectory, name: 'Project',
      });
      const service = {
        request: vi.fn(async (path, init) => {
          if (path === '/internal/sessions') {
            const body = JSON.parse(init.body);
            capturedBootstrap.push(body);
            return Response.json(runtimeSession({ sessionId: body.rootSessionId, rootSessionId: body.rootSessionId, projectId: body.projectId, workspaceId: body.workspaceId, parentSessionId: body.parentSessionId }));
          }
          return Response.json({});
        }),
      };
      const { app } = createApp({
        routes,
        service,
        agentScopeStore: routeFixture.agentScopeStore,
        resolveSessionScope: async (id) => id === 'ses_parent' ? validScope('ses_parent') : null,
      });
      const response = await request(app)
        .post('/api/openchamber/sessions')
        .send({ projectId: 'proj_1', workspaceId: 'ws_1', options: { providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null }, parentSessionId: 'ses_parent' })
        .expect(200);

      expect(response.body.session).toMatchObject({ parentSessionId: 'ses_parent', workspaceId: 'ws_1' });
      expect(capturedBootstrap[0]).toMatchObject({ parentSessionId: 'ses_parent', workspaceId: 'ws_1' });
    });

    it('rejects session create when parent session is missing with 404', async () => {
      const { app } = createApp({
        routes,
        resolveSessionScope: async () => null,
      });
      await request(app)
        .post('/api/openchamber/sessions')
        .send({ projectId: 'proj_1', workspaceId: 'ws_1', options: { providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null }, parentSessionId: 'ses_missing' })
        .expect(404);
    });

    it('rejects session create when parent belongs to another workspace with 403', async () => {
      const { app } = createApp({
        routes,
        resolveSessionScope: async () => ({ ...validScope('ses_foreign'), workspaceId: 'ws_foreign' }),
      });
      await request(app)
        .post('/api/openchamber/sessions')
        .send({ projectId: 'proj_1', workspaceId: 'ws_1', options: { providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null }, parentSessionId: 'ses_foreign' })
        .expect(403);
    });
  });

  describe('session create with multi-run metadata', () => {
    const multirunBase = {
      version: 1,
      group: { kind: 'id', id: '550e8400-e29b-41d4-a716-446655440000' },
      groupSlug: 'group_bench',
      runGroup: 'g1',
      providerID: 'provider_1',
      modelID: 'model_1',
      role: 'run',
      title: 'Run 1',
    };

    it('creates session with initial multi-run metadata having sessionID: null and binds returned sessionID on follow-up', async () => {
      const service = {
        request: vi.fn(async (path, init) => {
          if (path === '/internal/sessions') {
            const body = JSON.parse(init.body);
            return Response.json(runtimeSession({
              sessionId: body.rootSessionId,
              rootSessionId: body.rootSessionId,
              projectId: body.projectId,
              workspaceId: body.workspaceId,
            }));
          }
          return Response.json({});
        }),
      };
      const { app, sessionMetadataStore } = createApp({
        routes,
        service,
        agentScopeStore: routeFixture.agentScopeStore,
        resolveHostSessionScope: async (id) => validScope(id),
      });

      const response = await request(app)
        .post('/api/openchamber/sessions')
        .send({
          projectId: 'proj_1',
          workspaceId: 'ws_1',
          options: { providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null },
          metadata: { openchamber: { multirun: { ...multirunBase, sessionID: null } } },
        })
        .expect(200);

      const createdSession = response.body.session;
      expect(createdSession.sessionId).toBeDefined();
      expect(createdSession.metadata.openchamber.multirun).toMatchObject({
        version: 1,
        groupSlug: 'group_bench',
        runGroup: 'g1',
        providerID: 'provider_1',
        modelID: 'model_1',
        role: 'run',
        title: 'Run 1',
      });

      // Follow-up: patch with newly created sessionId to bind multi-run membership
      const boundPatch = {
        changes: {
          openchamber: {
            multirun: { ...multirunBase, sessionID: createdSession.sessionId },
          },
        },
      };
      await request(app)
        .patch(`/api/openchamber/sessions/${createdSession.sessionId}/metadata`)
        .send(boundPatch)
        .expect(200);

      const updatedState = await sessionMetadataStore.getState(createdSession.sessionId);
      expect(updatedState.metadata.openchamber.multirun.sessionID).toBe(createdSession.sessionId);
    });

    it('creates session with multi-run metadata when sessionID is omitted', async () => {
      const service = {
        request: vi.fn(async (path, init) => {
          if (path === '/internal/sessions') {
            const body = JSON.parse(init.body);
            return Response.json(runtimeSession({
              sessionId: body.rootSessionId,
              rootSessionId: body.rootSessionId,
              projectId: body.projectId,
              workspaceId: body.workspaceId,
            }));
          }
          return Response.json({});
        }),
      };
      const { app } = createApp({
        routes,
        service,
        agentScopeStore: routeFixture.agentScopeStore,
      });

      const response = await request(app)
        .post('/api/openchamber/sessions')
        .send({
          projectId: 'proj_1',
          workspaceId: 'ws_1',
          options: { providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null },
          metadata: { openchamber: { multirun: { ...multirunBase } } },
        })
        .expect(200);

      expect(response.body.session.sessionId).toBeDefined();
      expect(response.body.session.metadata.openchamber.multirun.groupSlug).toBe('group_bench');
    });

    it('rejects session create with malformed multi-run metadata', async () => {
      const { app } = createApp({
        routes,
        agentScopeStore: routeFixture.agentScopeStore,
      });

      await request(app)
        .post('/api/openchamber/sessions')
        .send({
          projectId: 'proj_1',
          workspaceId: 'ws_1',
          options: { providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null },
          metadata: { openchamber: { multirun: { ...multirunBase, sessionID: 123 } } },
        })
        .expect(400);
    });
  });
});

describe('canonical session list persistence', () => {
  const createService = async (state, sessions) => {
    const { createOpenChamberSessionService } = await import('./routes.js');
    const directory = path.dirname(state.databasePath);
    const workspace = await state.agentScopeStore.ensureWorkspace({ hostProjectId: 'project', projectId: 'project', workspaceId: 'workspace', projectDirectory: directory, workspaceDirectory: directory, agentDirectory: directory, name: 'Project' });
    return createOpenChamberSessionService({
      service: { request: async () => Response.json({ items: sessions, errors: [] }) },
      agentScopeStore: state.agentScopeStore,
      resolveWorkspaceScope: async () => workspace,
      resolveSessionScope: async id => validScope(id),
      resolveHostSessionScope: async id => validScope(id),
      registerSessionScope: async () => true,
      resolveAttachments: async () => [],
      capturePrompt: async (_scope, body) => body,
      beforeDispatch: async () => { },
      onPromptAccepted: async () => { },
      sessionMetadataStore: state.sessionMetadataStore,
      archiveStore: state.archiveStore,
      directCommandAdmissionStore: state.directCommandAdmissionStore,
    });
  };

  it('renames through the canonical title route and returns the composed session', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-title-'));
    const state = createHostSessionState({ dataDir });
    const calls = [];
    try {
      await state.initialize();
      const { createOpenChamberSessionService } = await import('./routes.js');
      const service = createOpenChamberSessionService({
        service: {
          request: async (pathname, init) => {
            calls.push({ pathname, body: init?.body });
            return Response.json(runtimeSession({ title: 'Renamed' }));
          }
        },
        resolveWorkspaceScope: async () => ({ ...validScope('workspace'), projectId: 'project', workspaceId: 'workspace' }),
        resolveSessionScope: async id => validScope(id),
        resolveHostSessionScope: async id => ({ ...validScope(id), projectId: 'project', workspaceId: 'workspace' }),
        registerSessionScope: async () => true,
        resolveAttachments: async () => [],
        capturePrompt: async (_scope, body) => body,
        beforeDispatch: async () => { },
        onPromptAccepted: async () => { },
        sessionMetadataStore: state.sessionMetadataStore,
        archiveStore: state.archiveStore,
        directCommandAdmissionStore: state.directCommandAdmissionStore,
      });
      const renamed = await service.rename('session', { workspaceId: 'workspace', title: '  Renamed  ' });
      expect(calls).toEqual([{ pathname: '/api/agent/v1/sessions/session/title', body: JSON.stringify({ workspaceId: 'workspace', title: 'Renamed' }) }]);
      expect(renamed).toMatchObject({ sessionId: 'session', title: 'Renamed', metadata: null, metadataRevision: '0' });
    } finally {
      await state.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('reads a snapshot and history without reopening a worker', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-cold-read-'));
    const state = createHostSessionState({ dataDir });
    const calls = [];
    try {
      await state.initialize();
      const { createOpenChamberSessionService } = await import('./routes.js');
      const service = createOpenChamberSessionService({
        service: {
          request: async (pathname) => {
            calls.push(pathname);
            if (pathname.endsWith('/snapshot')) return Response.json(snapshotFixture());
            return Response.json(historyFixture());
          }
        },
        resolveWorkspaceScope: async () => ({ ...validScope('workspace'), projectId: 'project', workspaceId: 'workspace' }),
        resolveSessionScope: async id => ({ ...validScope(id), projectId: 'project', workspaceId: 'workspace' }),
        resolveHostSessionScope: async id => ({ ...validScope(id), projectId: 'project', workspaceId: 'workspace' }),
        registerSessionScope: async () => true,
        resolveAttachments: async () => [],
        capturePrompt: async (_scope, body) => body,
        beforeDispatch: async () => { },
        onPromptAccepted: async () => { },
        sessionMetadataStore: state.sessionMetadataStore,
        archiveStore: state.archiveStore,
        directCommandAdmissionStore: state.directCommandAdmissionStore,
      });
      expect((await service.open('session')).session.sessionId).toBe('session');
      expect((await service.history('session')).messages).toHaveLength(1);
      expect(calls).toEqual(['/api/agent/v1/sessions/session/snapshot', '/api/agent/v1/sessions/session/history']);
      expect(calls.some(path => path.endsWith('/reopen'))).toBe(false);
    } finally {
      await state.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('lists an unarchived session without losing its committed archive revision', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-unarchive-'));
    const state = createHostSessionState({ dataDir });
    try {
      await state.initialize();
      const service = await createService(state, [runtimeSession()]);
      await state.archiveStore.archive(['session'], 1700);
      const archived = await service.list('workspace');
      expect(archived.items[0]).toMatchObject({ sessionId: 'session', archivedAt: 1700, archiveRevision: '1' });
      await state.archiveStore.unarchive(['session']);
      const restored = await service.list('workspace');
      expect(restored.errors).toEqual({});
      expect(restored.items[0]).toMatchObject({ sessionId: 'session', archiveRevision: '2' });
      expect(Object.hasOwn(restored.items[0], 'archivedAt')).toBe(false);
    } finally {
      await state.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('retains healthy sessions when a sibling has corrupt persisted metadata', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-list-partial-'));
    const state = createHostSessionState({ dataDir });
    const connection = new DatabaseSync(state.databasePath);
    try {
      await state.initialize();
      await state.sessionMetadataStore.setSessionMetadata('healthy', { notes: 'Preserved session' });
      connection.prepare('INSERT INTO session_metadata (session_id, revision, payload) VALUES (?, ?, ?)').run('corrupt', 1, '{');
      const service = await createService(state, [runtimeSession({ sessionId: 'corrupt', rootSessionId: 'corrupt' }), runtimeSession({ sessionId: 'healthy', rootSessionId: 'healthy' })]);
      const listed = await service.list('workspace');
      expect(listed.items.map(session => session.sessionId)).toEqual(['healthy']);
      expect(listed.items[0].metadata.notes).toBe('Preserved session');
      expect(listed.errors).toEqual({ corrupt: 'METADATA_CORRUPT' });
    } finally {
      connection.close();
      await state.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('lists archived worktree sessions via listArchivedWorktreeSessions endpoint', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-archive-wt-'));
    const state = createHostSessionState({ dataDir });
    try {
      await state.initialize();
      const directory = path.dirname(state.databasePath);
      const anchor = await state.agentScopeStore.ensureWorkspace({
        hostProjectId: 'project', projectId: 'project', workspaceId: 'ws_anchor',
        projectDirectory: directory, workspaceDirectory: directory, agentDirectory: directory, name: 'Project',
      });
      await state.agentScopeStore.bindSession({
        sessionId: 'ses_archived', rootSessionId: 'ses_archived', workspaceId: anchor.workspaceId, agentDirectoryId: anchor.agentDirectoryId,
      });
      await state.archiveStore.archive(['ses_archived'], 1700);
      await state.sessionMetadataStore.setSessionMetadata('ses_archived', { notes: 'Archived worktree task' });
      const binding = await state.agentScopeStore.createWorktreeArchive({
        hostProjectId: 'project', archiveId: 'arc_1', archiveRef: 'refs/openchamber/archive/arc_1',
        snapshotCommit: 'a'.repeat(40), anchorWorkspaceId: anchor.workspaceId, claimId: 'claim_1',
        claimGeneration: 'gen_1', branchName: 'feature', branchOid: null,
      });
      await state.agentScopeStore.archiveWorktreeSessions({ hostProjectId: 'project', archiveId: 'arc_1' }, 'claim_1', 1700);
      await state.agentScopeStore.setWorktreeArchivePhase({ hostProjectId: 'project', archiveId: 'arc_1' }, 'claim_1', 2, 'removal_pending');
      await state.agentScopeStore.finishWorktreeArchive({ hostProjectId: 'project', archiveId: 'arc_1' }, 'claim_1');

      const { createOpenChamberSessionService } = await import('./routes.js');
      const service = createOpenChamberSessionService({
        service: { request: async () => Response.json({ items: [], errors: [] }) },
        agentScopeStore: state.agentScopeStore,
        resolveWorkspaceDirectory: async (dir) => (dir === directory ? { hostProjectId: 'project', projectId: 'project' } : null),
        resolveWorkspaceScope: async () => anchor,
        resolveSessionScope: async (id) => validScope(id),
        resolveHostSessionScope: async (id) => validScope(id),
        registerSessionScope: async () => true,
        resolveAttachments: async () => [],
        capturePrompt: async (_scope, body) => body,
        beforeDispatch: async () => { },
        onPromptAccepted: async () => { },
        sessionMetadataStore: state.sessionMetadataStore,
        archiveStore: state.archiveStore,
        directCommandAdmissionStore: state.directCommandAdmissionStore,
      });

      const result = await service.listArchivedWorktreeSessions({ projectDirectory: directory, archiveId: 'arc_1' });
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0]).toMatchObject({
        sessionId: 'ses_archived',
        metadata: { notes: 'Archived worktree task' },
        archivedAt: 1700,
      });
    } finally {
      await state.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

describe('Host metadata conversion authorization', () => {
  it('canonicalizes selected directories and refuses isolated scopes before reading', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'session-scope-')); const selected = path.join(root, 'selected'); fs.mkdirSync(selected); const dataDir = path.join(root, 'data'); fs.mkdirSync(dataDir); const db = new DatabaseSync(path.join(dataDir, 'host-metadata.sqlite')); const store = (await import('./session-metadata-store.js')).createSessionMetadataStore({ dataDir, database: db, closeDatabase: true }); const runtime = createProjectDirectoryRuntime({ fsPromises: fs.promises, path, normalizeDirectoryPath: value => value, refuseDirectory: () => null }); expect(runtime).toBeTruthy(); await store.close(); fs.rmSync(root, { recursive: true, force: true });
  });
});
