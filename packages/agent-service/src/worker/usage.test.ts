import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UsageAccountsSchema, UsageStatsSchema, UsageToolsResponseSchema, type UsageQuery } from '@openchamber/agent-contract';
import type { FileEntry, SessionEntry, SessionMessageEntry } from '@oh-my-pi/pi-coding-agent/session/session-entries';
import { discoverAuthStorage } from '@oh-my-pi/pi-coding-agent/sdk';
import { getStatsDbPath, setAgentDir } from '@oh-my-pi/pi-utils';
import { closeDb } from '@oh-my-pi/omp-stats/db';
import type { UsageSessionReference } from '../protocol.ts';
import { getUsageAccounts, getUsageStats, getUsageTools } from './usage.ts';

const start = Date.parse('2026-03-07T05:00:00Z');
const end = Date.parse('2026-03-10T04:00:00Z');
const query: UsageQuery = { from: start, to: end, timezone: 'UTC' };
const ENV_KEYS = ['PI_CONFIG_DIR', 'PI_CODING_AGENT_DIR', 'XDG_DATA_HOME', 'XDG_CONFIG_HOME', 'XDG_STATE_HOME', 'XDG_CACHE_HOME'] as const;
const saved = new Map<string, string | undefined>();
let root: string;
let agentDir: string;
let stop: (() => void) | undefined;

// Each test gets its own OMP home: an agent directory with its own sessions and stats.db, so no fixture leaks into another test.
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'usage-'));
  agentDir = join(root, 'agent');
  await mkdir(join(agentDir, 'sessions'), { recursive: true });
  for (const key of ENV_KEYS) saved.set(key, process.env[key]);
  process.env.PI_CONFIG_DIR = join(root, 'config');
  process.env.XDG_DATA_HOME = join(root, 'xdg-data');
  process.env.XDG_CONFIG_HOME = join(root, 'xdg-config');
  process.env.XDG_STATE_HOME = join(root, 'xdg-state');
  process.env.XDG_CACHE_HOME = join(root, 'xdg-cache');
  setAgentDir(agentDir);
  closeDb();
});
afterEach(async () => {
  stop?.();
  stop = undefined;
  closeDb();
  for (const key of ENV_KEYS) {
    const value = saved.get(key);
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await rm(root, { recursive: true, force: true });
});

function assistant(id: string, parentId: string | null, time: number, options: { amount?: number; provider?: string; model?: string; reasoning?: number; cost?: number; ttft?: number; duration?: number } = {}): SessionMessageEntry {
  const amount = options.amount ?? 10;
  const usage: Record<string, unknown> = {
    input: amount, output: 2, cacheRead: 3, cacheWrite: 1, totalTokens: amount + 6,
    cost: { input: 0.1, output: 0.02, cacheRead: 0.03, cacheWrite: 0.01, total: options.cost ?? 0.16 },
  };
  if (options.reasoning !== undefined) usage.reasoningTokens = options.reasoning;
  return {
    type: 'message', id, parentId, timestamp: new Date(time).toISOString(), message: {
      role: 'assistant', api: 'openai-completions', provider: options.provider ?? 'provider-a', model: options.model ?? 'model-a',
      stopReason: 'stop', timestamp: time, content: [{ type: 'text', text: 'Persisted native response' }], usage,
      ...(options.ttft !== undefined ? { ttft: options.ttft } : {}), ...(options.duration !== undefined ? { duration: options.duration } : {}),
    } as SessionMessageEntry['message'],
  };
}
function user(id: string, parentId: string | null, time: number): SessionMessageEntry {
  return { type: 'message', id, parentId, timestamp: new Date(time).toISOString(), message: { role: 'user', content: 'Persisted native prompt', timestamp: time } };
}

/** Write a transcript into the agent's sessions folder for `folder` (the project), exactly where OMP writes its own. */
async function tuiSession(folder: string, id: string, entries: SessionEntry[], parentSession?: string): Promise<string> {
  const directory = join(agentDir, 'sessions', folder);
  await mkdir(directory, { recursive: true });
  const file = join(directory, `${id}.jsonl`);
  const header = Object.assign({ type: 'session', version: 3, id: `native-${id}`, cwd: join(root, 'workspace'), timestamp: new Date(start).toISOString() },
    parentSession ? { parentSession } : {});
  const records: FileEntry[] = [header as FileEntry, ...entries as FileEntry[]];
  await writeFile(file, records.map(entry => JSON.stringify(entry)).join('\n') + '\n');
  return file;
}

test('TUI sessions that no turn ever settled are ingested by OMP sync before the report is built', async () => {
  await tuiSession('--work--tui', 'tui-only', [user('tu', null, start), assistant('ta', 'tu', start + 1, { amount: 40 })]);
  const stats = UsageStatsSchema.parse(await getUsageStats(query));
  expect(stats).toMatchObject({ steps: 1, prompts: 1, sessions: 1, partial: false, tokens: { input: 40 } });
});

test('a project scope constrains every aggregate, and an empty scope matches nothing', async () => {
  const projectA = join(agentDir, 'sessions', '--work--a');
  await tuiSession('--work--a', 'a', [user('ua', null, start), assistant('aa', 'ua', start + 1, { amount: 100, provider: 'prov-a', model: 'model-a', cost: 0.2 })]);
  await tuiSession('--work--b', 'b', [user('ub', null, start), assistant('ab', 'ub', start + 1, { amount: 1000, provider: 'prov-b', model: 'model-b', cost: 2 })]);
  // A scope is the exact authorized file set the Host resolves, not a folder:
  // a folder can hold another workspace's transcripts.
  const scope = (...files: Array<[string, string, 'root' | 'subagent']>) =>
    files.map(([file, sessionId, role]) => ({ file, sessionId, role }));
  const scoped = await getUsageStats(query, scope([join(projectA, 'a.jsonl'), 'a', 'root']));
  expect(scoped).toMatchObject({ steps: 1, sessions: 1, prompts: 1, activeDays: 1, tokens: { input: 100 } });
  expect(scoped.cost).toBeCloseTo(0.2);
  expect(scoped.providers.map(provider => provider.providerId)).toEqual(['prov-a']);
  expect(scoped.models.map(model => model.modelId)).toEqual(['model-a']);
  expect(scoped.activity).toEqual([{ date: '2026-03-07', steps: 1 }]);
  const all = await getUsageStats(query);
  expect(all).toMatchObject({ steps: 2, prompts: 2, tokens: { input: 1100 } });
  expect(await getUsageStats(query, [])).toMatchObject({ steps: 0, sessions: 0, prompts: 0, partial: false, models: [] });
});

test('reasoning is counted once across assistant turns and model_usage auxiliary calls, and output stays inclusive', async () => {
  const auxiliary: SessionEntry = {
    type: 'model_usage', id: 'aux', parentId: null, timestamp: new Date(start + 2).toISOString(), purpose: 'summary',
    api: 'openai-completions', provider: 'prov-a', model: 'model-a', stopReason: 'stop', usage: {
      input: 5, output: 4, cacheRead: 0, cacheWrite: 0, totalTokens: 9, reasoningTokens: 7,
      cost: { input: 0.01, output: 0.01, cacheRead: 0, cacheWrite: 0, total: 0.02 },
    },
  };
  const turn = assistant('turn', null, start + 1, { amount: 100, reasoning: 25, provider: 'prov-a' });
  if (turn.message.role !== 'assistant') throw new Error('fixture assistant expected');
  turn.message.usage = { ...(turn.message.usage as object), output: 50 } as typeof turn.message.usage;
  await tuiSession('--work--reason', 'reason', [turn, auxiliary]);
  const stats = UsageStatsSchema.parse(await getUsageStats(query));
  expect(stats.tokens.reasoning).toBe(32);
  expect(stats.models).toEqual([expect.objectContaining({ modelId: 'model-a', tokens: expect.objectContaining({ reasoning: 32, output: 54 }) })]);
  expect(stats.providers[0]).toMatchObject({ tokens: { reasoning: 32 } });
});

test('a failed stats database is an error, never an empty report', async () => {
  await tuiSession('--work--bad', 'bad', [user('bu', null, start), assistant('ba', 'bu', start + 1)]);
  closeDb();
  const path = getStatsDbPath();
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, 'this is not an sqlite database'.repeat(200));
  await expect(getUsageStats(query)).rejects.toThrow();
  await rm(path, { force: true });
  await rm(`${path}-wal`, { force: true });
  await rm(`${path}-shm`, { force: true });
});

test('a configured custom model is priced from OMP’s model registry, not the bundled catalog', async () => {
  await writeFile(join(agentDir, 'models.yml'), [
    'providers:', '  lab-custom:', '    baseUrl: http://127.0.0.1:9/v1', '    api: openai-completions', '    auth: none',
    '    models:', '      - id: custom-x', '        name: Custom X', '        contextWindow: 65536', '        maxTokens: 256',
    '        cost:', '          input: 2', '          output: 8', '          cacheRead: 0.5', '          cacheWrite: 0', '',
  ].join('\n'));
  await tuiSession('--work--custom', 'custom', [user('cu', null, start), assistant('ca', 'cu', start + 1, { provider: 'lab-custom', model: 'custom-x', cost: 0.5 })]);
  const stats = UsageStatsSchema.parse(await getUsageStats(query));
  const model = stats.models.find(row => row.providerId === 'lab-custom');
  expect(model?.pricing).toEqual({ inputPerMillionTokens: 2, outputPerMillionTokens: 8, cacheReadPerMillionTokens: 0.5, cacheWritePerMillionTokens: 0 });
  expect(model?.cost).toBeCloseTo(0.5);
  expect(stats.providers.find(row => row.providerId === 'lab-custom')?.pricing).toEqual(model?.pricing);
});

test('provider TTFT is weighted by request count, not an average of model averages', async () => {
  await tuiSession('--work--ttft', 'ttft', [
    assistant('one', null, start + 1, { provider: 'prov-t', model: 'fast', ttft: 100, duration: 1000 }),
    assistant('two', null, start + 2, { provider: 'prov-t', model: 'slow', ttft: 500, duration: 1000 }),
    assistant('three', null, start + 3, { provider: 'prov-t', model: 'slow', ttft: 500, duration: 1000 }),
    assistant('four', null, start + 4, { provider: 'prov-t', model: 'slow', ttft: 500, duration: 1000 }),
  ]);
  const stats = UsageStatsSchema.parse(await getUsageStats(query));
  expect(stats.providers[0]).toMatchObject({ providerId: 'prov-t', avgTtft: 400 });
  expect(stats.models.find(model => model.modelId === 'fast')?.avgTtft).toBe(100);
});

test('prompt counts are scoped to the selected provider through provider-attributed prompts', async () => {
  await tuiSession('--work--prompts', 'prompts', [
    user('p1', null, start + 1), assistant('r1', 'p1', start + 2, { provider: 'prov-x', model: 'm' }),
    user('p2', null, start + 3), assistant('r2', 'p2', start + 4, { provider: 'prov-y', model: 'm' }),
  ]);
  expect(UsageStatsSchema.parse(await getUsageStats(query)).prompts).toBe(2);
  expect(UsageStatsSchema.parse(await getUsageStats({ ...query, providerId: 'prov-x' }))).toMatchObject({ prompts: 1, steps: 1 });
});

test('native AuthStorage usage reports and history are projected and carry no credential or identity', async () => {
  const secret = 'zai-secret-token-7f3a';
  const server = Bun.serve({
    port: 0, hostname: '127.0.0.1',
    fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== '/api/monitor/usage/quota/limit' || request.headers.get('authorization') !== secret) return new Response('denied', { status: 401 });
      return Response.json({ success: true, data: { level: 'pro', limits: [{ type: 'TOKENS_LIMIT', usage: 1000, currentValue: 400, percentage: 40, unit: 3, number: 5, nextResetTime: Date.parse('2026-03-08T10:00:00Z') }] } });
    },
  });
  stop = () => server.stop(true);
  await writeFile(join(agentDir, 'models.yml'), `providers:\n  zai:\n    baseUrl: http://127.0.0.1:${server.port}\n`);
  const auth = await discoverAuthStorage(agentDir, { cwd: root });
  try {
    await auth.credentials.upsert('zai', { type: 'api_key', key: secret });
  } finally {
    auth.close();
  }
  const { accounts, errors } = await getUsageAccounts({ from: start, to: end, timezone: 'UTC' });
  expect(errors).toEqual({});
  const parsed = UsageAccountsSchema.parse(accounts);
  expect(parsed.reports?.[0]).toMatchObject({ provider: 'zai', limits: [{ id: 'zai:tokens:5h', amount: { usedFraction: 0.4, unit: 'tokens' } }] });
  expect(Array.isArray(parsed.history)).toBe(true);
  expect(JSON.stringify(accounts)).not.toContain(secret);
  expect(JSON.stringify(accounts)).not.toMatch(/accountId|accountKey|email|apiKey|accessToken|refreshToken/);
});

test('tool calls retain successful, failed, synthetic, interrupted, missing and after-window outcomes with null durations', async () => {
  const turn = assistant('tool-turn', null, start);
  if (turn.message.role !== 'assistant') throw new Error('fixture assistant expected');
  const names = ['read', 'bash', 'synthetic', 'interrupted', 'missing', 'late', 'recovered'];
  turn.message.content = names.map(name => ({ type: 'toolCall', id: `call-${name}`, name, arguments: {} }));
  const entries: SessionEntry[] = [turn];
  let parentId = turn.id;
  for (const [index, name] of names.entries()) {
    if (name === 'missing') continue;
    const time = name === 'late' ? end : start + index + 1;
    const message = Object.assign({
      role: 'toolResult', toolCallId: `call-${name}`, toolName: name, isError: name !== 'read' && name !== 'late', timestamp: time,
      content: name === 'recovered' ? [{ type: 'text', text: 'Previous OMP process exited before this tool returned; its outcome is unknown.' }] : [],
    }, name === 'synthetic' ? { details: { __synthetic: true, source: 'assistant_stop_aborted', executed: false } } : {},
      name === 'interrupted' ? { details: { __interrupted: true, source: 'interrupt_skipped', execution: 'started' } } : {});
    const result: SessionMessageEntry = { type: 'message', id: `result-${name}`, parentId, timestamp: new Date(time).toISOString(), message };
    entries.push(result); parentId = result.id;
  }
  const file = await tuiSession('--work--tools', 'tools', entries);
  const source: UsageSessionReference = { sessionId: 'tools', rootSessionId: 'tools', workspaceId: 'workspace-a', projectId: 'project-a', cwd: join(root, 'workspace'), agentDirectory: agentDir, sessionsDirectory: join(agentDir, 'sessions', '--work--tools'), sessionFile: file };
  const report = UsageToolsResponseSchema.parse(await getUsageTools(query, [source]));
  expect(report.totals).toEqual({ calls: 7, succeeded: 1, failed: 1, unfinished: 5 });
  expect(report.usage.every(row => row.durationP50 === null)).toBe(true);
  expect(report.usage.find(row => row.name === 'bash')).toMatchObject({ calls: 1, failed: 1 });
  const later = await getUsageTools({ ...query, to: end + 1 }, [source]);
  expect(later.totals).toEqual({ calls: 7, succeeded: 2, failed: 1, unfinished: 4 });
});

test('a registered path cannot escape its sessions directory through a symlink', async () => {
  const file = await tuiSession('--work--contain', 'contained', [assistant('ok', null, start)]);
  const outside = join(root, 'outside.jsonl');
  const before = await readFile(file, 'utf8');
  await writeFile(outside, before);
  const link = join(agentDir, 'sessions', '--work--contain', 'link.jsonl');
  await symlink(outside, link);
  const linked: UsageSessionReference = { sessionId: 'linked', rootSessionId: 'linked', workspaceId: 'w', projectId: 'p', cwd: root, agentDirectory: agentDir, sessionsDirectory: join(agentDir, 'sessions', '--work--contain'), sessionFile: link };
  const good: UsageSessionReference = { ...linked, sessionId: 'good', rootSessionId: 'good', sessionFile: file };
  await expect(getUsageTools(query, [good, linked])).resolves.toMatchObject({ partial: true, errors: { linked: 'USAGE_SESSION_UNREADABLE' } });
  expect(await readFile(outside, 'utf8')).toBe(before);
});
