import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { setAgentDir } from '@oh-my-pi/pi-utils';
import type { RuntimeSession } from '@openchamber/agent-contract';
import { WorkerRegistry } from '../supervisor/workers.ts';
import { SessionReferences } from './references.ts';
import { SessionRegistry } from './registry.ts';

const userMessage = (text: string) => ({ role: 'user' as const, content: [{ type: 'text' as const, text }], timestamp: Date.now() });

async function nativeSession(directory: string, cwd: string, title: string) {
  const manager = SessionManager.create(cwd, directory);
  manager.appendMessage(userMessage(`Prompt for ${title}`));
  await manager.ensureOnDisk();
  await manager.setSessionName(title, 'user');
  await manager.flush();
  const sessionFile = manager.getSessionFile();
  const sessionId = manager.getSessionId();
  await manager.close();
  if (!sessionFile) throw new Error('Native session file is required');
  return { sessionId, sessionFile };
}

test('lists OMP storage including unreferenced CLI sessions and renames through OMP', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omp-session-index-'));
  const previousHome = process.env.HOME;
  const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  process.env.HOME = root;
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await Promise.all([mkdir(cwd), mkdir(agentDirectory)]);
  setAgentDir(agentDirectory);
  const sessionsDirectory = SessionManager.getDefaultSessionDir(cwd, agentDirectory);
  const workers = new WorkerRegistry({ workerEntrypoint: 'unused-test-entrypoint' });
  const stateDirectory = join(root, 'service-state');
  const references = new SessionReferences(stateDirectory);
  const registry = new SessionRegistry(stateDirectory, workers);
  try {
    const app = await nativeSession(sessionsDirectory, cwd, 'App-created OMP title');
    const cli = await nativeSession(sessionsDirectory, cwd, 'CLI-created session');
    await references.initialize();
    await references.put({
      rootSessionId: 'host-root', projectId: 'project', workspaceId: 'workspace', cwd, agentDirectory,
      displayPath: 'workspace', sessionFile: app.sessionFile, sessionsDirectory, createdAt: 1, updatedAt: 1,
    });
    await references.close();
    await registry.initialize();
    const listed = await registry.list({ workspaceId: 'workspace', projectId: 'project', cwd, agentDirectory });
    expect(listed.errors).toEqual([]);
    expect(workers.list()).toHaveLength(0);
    const byId = new Map<string, RuntimeSession>(listed.items.map(item => [item.sessionId, item]));
    expect(byId.get('host-root')?.title).toBe('App-created OMP title');
    expect(byId.get(cli.sessionId)?.title).toBe('CLI-created session');
    expect(byId.get(cli.sessionId)?.rootSessionId).toBe(cli.sessionId);

    const renamed = await registry.rename(cli.sessionId, { workspaceId: 'workspace', projectId: 'project', cwd, agentDirectory }, 'Renamed by the app');
    expect(renamed.title).toBe('Renamed by the app');
    expect(workers.list()).toHaveLength(0);
    const opened = await SessionManager.open(cli.sessionFile, sessionsDirectory, undefined,
      { initialCwd: cwd, throwIfMissing: true, suppressBreadcrumb: true });
    try { expect(opened.getSessionName()).toBe('Renamed by the app'); } finally { await opened.close(); }
    const header = JSON.parse((await readFile(cli.sessionFile, 'utf8')).split('\n')[0] ?? '{}');
    expect(header.title).toBe('Renamed by the app');
  } finally {
    await registry.close();
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR; else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
    await rm(root, { recursive: true, force: true });
  }
});
