import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import express from 'express';
import request from 'supertest';
import { expect, it } from 'vitest';
import { createAgentServiceSupervisor } from '../host/agent-service-supervisor.js';
import { createHostSessionState } from '../host/session-state.js';
import { createOpenChamberSessionService } from '../openchamber-sessions/routes.js';
import { registerGitRoutes } from './routes.js';

it('archives and restores real native sessions through the registered Host Git routes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'native-worktree-archive-'));
  const project = path.join(root, 'project');
  const checkout = path.join(root, 'source');
  const agentDirectory = path.join(root, 'agent');
  fs.mkdirSync(project); fs.mkdirSync(agentDirectory);
  const git = (...args) => execFileSync('git', ['-C', project, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q');
  git('-c', 'user.name=Archive test', '-c', 'user.email=archive@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'base');
  git('worktree', 'add', '-q', '-b', 'native-archive', checkout);
  const nested = path.join(checkout, 'nested'); fs.mkdirSync(nested);
  fs.writeFileSync(path.join(checkout, 'change.txt'), 'native change\n');
  const env = { HOME: root, USERPROFILE: root, PI_CONFIG_DIR: '.omp', PI_CODING_AGENT_DIR: agentDirectory,
    PI_PROFILE: '', OMP_PROFILE: '', XDG_CONFIG_HOME: path.join(root, 'config'), XDG_DATA_HOME: path.join(root, 'data'),
    XDG_STATE_HOME: path.join(root, 'state'), XDG_CACHE_HOME: path.join(root, 'cache') };
  const native = createAgentServiceSupervisor({ bunPath: process.env.OHPICHAMBER_BUN,
    entrypoint: fileURLToPath(new URL('../../../../agent-service/src/index.ts', import.meta.url)), dataDir: path.join(root, 'native'), env, diagnosticsLevel: 'info',
    handleSkillSource: async (operation) => operation.action === 'reconcile' ? { status: 'reconciled', sources: { workspace: '0', agent: '0' } } : { status: 'failed', code: 'SERVICE_UNAVAILABLE' } });
  const owner = createHostSessionState({ dataDir: path.join(root, 'host') });
  try {
    await native.start();
    const store = owner.agentScopeStore;
    const scopes = new Map();
    const register = async (cwd) => {
      const scope = await store.ensureWorkspace({ hostProjectId: 'host-project', projectDirectory: project, workspaceDirectory: cwd, agentDirectory, name: 'Project' });
      const response = await native.request(`/internal/workspaces/${encodeURIComponent(scope.workspaceId)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: scope.projectId, cwd: scope.cwd, agentDirectory, agentDirectoryId: scope.agentDirectoryId, env }) });
      expect(response.status, await response.text()).toBe(201);
      scopes.set(cwd, { ...scope, displayPath: path.relative(project, cwd) || '.', env });
      return scopes.get(cwd);
    };
    await register(project); await register(checkout); const nestedScope = await register(nested);
    let loseDeleteReply = false;
    let refused = [];
    const transport = { request: async (pathname, init) => {
      const response = await native.request(pathname, init);
      if (loseDeleteReply && pathname.endsWith('/worktree-archive-delete') && response.ok) {
        loseDeleteReply = false;
        const input = JSON.parse(init.body);
        const send = (url, body) => native.request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        refused = await Promise.all([
          send(pathname, { ...input, operationId: randomUUID() }),
          send(pathname, { ...input, workspaceId: 'foreign-workspace' }),
          send(pathname, { ...input, sessionIds: [...input.sessionIds, 'foreign-session'] }),
          send(`${pathname}/retire`, { ...input, operationId: randomUUID() }),
          send(pathname.replace('/worktree-archive-delete', '/branch'), {}),
        ]);
        throw new Error('Simulated lost native delete response');
      }
      return response;
    } };
    const sessions = createOpenChamberSessionService({ service: transport, agentScopeStore: store,
      resolveWorkspaceDirectory: async (directory) => scopes.get(directory) ?? null,
      resolveWorkspaceScope: (id) => [...scopes.values()].find((scope) => scope.workspaceId === id) ?? null,
      resolveSessionScope: (id) => store.getSession(id), resolveHostSessionScope: (id) => store.getSession(id),
      resolveHostRelocationScope: (id) => store.getSession(id),
      registerSessionScope: async (session) => { await store.bindSession({ sessionId: session.sessionId, rootSessionId: session.rootSessionId, workspaceId: session.workspaceId }); return true; },
      resolveAttachments: async () => [], capturePrompt: async (_scope, prompt) => prompt,
      beforeDispatch: async () => {}, onPromptAccepted: async () => {}, directCommandAdmissionStore: owner.directCommandAdmissionStore,
      archiveStore: owner.archiveStore, sessionMetadataStore: owner.sessionMetadataStore });
    const createNative = async (scope = nestedScope) => {
      const rootSessionId = randomUUID();
      const response = await native.request('/internal/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rootSessionId, projectId: scope.projectId, workspaceId: scope.workspaceId, cwd: scope.cwd, agentDirectory, agentDirectoryId: scope.agentDirectoryId, displayPath: scope.displayPath, env }) });
      const body = await response.json();
      expect(response.status, JSON.stringify(body)).toBe(201);
      await store.bindSession({ sessionId: body.sessionId, rootSessionId: body.rootSessionId, workspaceId: body.workspaceId });
      return body;
    };
    const first = await createNative();
    const previous = await createNative();
    await owner.archiveStore.archive([previous.sessionId], 1234);
    const callLease = async (route, init) => { const response = await native.request(route, init); if (!response.ok) throw new Error(`Lease ${response.status}: ${await response.text()}`); };
    const lease = { acquire: (directory, leaseId) => callLease('/internal/worktree-leases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ directory, leaseId }) }), release: (leaseId) => callLease(`/internal/worktree-leases/${leaseId}`, { method: 'DELETE' }) };
    const app = express(); app.use(express.json());
    registerGitRoutes(app, { worktreeBootstrapStore: { remove: async () => {} }, worktreeLeaseControl: lease, worktreeArchiveSessionService: sessions });
    const archived = await request(app).post('/api/git/worktrees/archives').query({ directory: project }).send({ directory: checkout, id: 'native-fixture' });
    expect(archived.status, JSON.stringify(archived.body)).toBe(200);
    const target = path.join(root, 'target'); git('worktree', 'add', '-q', target, 'native-archive');
    const targetScope = await register(target);
    const restored = await request(app).post('/api/git/worktrees/archives/restore').query({ directory: target }).send({ id: 'native-fixture' });
    expect(restored.status, JSON.stringify(restored.body)).toBe(200);
    expect((await store.getSession(first.sessionId)).workspaceId).toBe(targetScope.workspaceId);
    expect(await owner.archiveStore.isArchived(first.sessionId)).toBe(false);
    expect(await owner.archiveStore.getState(previous.sessionId)).toMatchObject({ archivedAt: 1234, revision: '1' });
    expect(fs.readFileSync(path.join(target, 'change.txt'), 'utf8')).toBe('native change\n');
    const deleteSource = path.join(root, 'delete-source'); git('worktree', 'add', '-q', '-b', 'native-delete', deleteSource);
    const deleteScope = await register(deleteSource);
    const deletedSession = await createNative(deleteScope);
    const saved = await request(app).post('/api/git/worktrees/archives').query({ directory: project }).send({ directory: deleteSource, id: 'native-delete' });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
    loseDeleteReply = true;
    const lost = await request(app).delete('/api/git/worktrees/archives').query({ directory: project }).send({ id: 'native-delete' });
    expect(lost.status).toBeGreaterThanOrEqual(400);
    expect(lost.body.error).toContain('Simulated lost native delete response');
    expect(refused.map((response) => response.status)).toEqual([409, 409, 409, 409, 409]);
    expect(await store.getSession(deletedSession.sessionId)).not.toBeNull();
    expect(await store.getWorktreeArchive({ hostProjectId: 'host-project', archiveId: 'native-delete' })).not.toBeNull();
    await native.stop();
    await native.start();
    const deleted = await request(app).delete('/api/git/worktrees/archives').query({ directory: project }).send({ id: 'native-delete' });
    expect(deleted.status, JSON.stringify(deleted.body)).toBe(200);
    expect(await store.getSession(deletedSession.sessionId)).toBeNull();
    expect(await store.getWorktreeArchive({ hostProjectId: 'host-project', archiveId: 'native-delete' })).toBeNull();
  } finally { await native.stop(); await owner.close(); fs.rmSync(root, { recursive: true, force: true }); }
}, 120_000);
