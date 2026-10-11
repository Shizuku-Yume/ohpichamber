import { test, expect } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { credentialCases } from './capability-fixture.mjs';
import { serializeEnvelope } from './envelope.mjs';
import { partialStatus, runSuite } from './capabilities.mjs';

const serverPath = fileURLToPath(new URL('./mcp-fixture-server.mjs', import.meta.url));

test('capability credential fixtures contain only non-authenticating markers', () => {
  for (const row of credentialCases) {
    const values = row.format === 'api_key' ? [row.value.key] : [row.value.access, row.value.refresh];
    expect(values.every(value => value.startsWith('m0-non-authenticating'))).toBe(true);
    expect(row.value).not.toHaveProperty('endpoint');
  }
  expect(() => serializeEnvelope({ apiKey: credentialCases[0].value.key })).toThrow();
});

test('degrades parent status when a child capability is unresolved', () => {
  expect(partialStatus(['passed', 'unsupported'])).toBe('partial');
  expect(partialStatus(['passed', 'unknown'])).toBe('partial');
  expect(partialStatus(['passed', 'passed'])).toBe('passed');
});

test('missing source produces separate explicit unavailable capability results', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'omp-m0-unavailable-test-'));
  try {
    const probes = await runSuite({ sourceDir: join(directory, 'missing-source'), sandbox: directory, workspace: directory, agentDir: directory, home: directory, timeoutMs: 1000 });
    expect(probes).toHaveLength(12);
    expect(probes.every(probe => probe.status === 'unavailable' && probe.errors.length > 0)).toBe(true);
    expect(probes.map(probe => probe.id)).toContain('capabilities.approval');
    expect(probes.map(probe => probe.id)).toContain('capabilities.completion-failure');
    const text = serializeEnvelope({ probes });
    expect(text).not.toContain(directory);
    expect(text).not.toContain('missing-source');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('controlled stdio MCP server initializes, lists, calls and exits on input close', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'omp-m0-mcp-test-'));
  const stateFile = join(directory, 'state.jsonl');
  const child = Bun.spawn([process.execPath, serverPath, stateFile], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', env: { PATH: process.env.PATH }, detached: false });
  const request = (id, method, params = {}) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  try {
    request(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'fixture-check', version: '1' } });
    request(2, 'tools/list');
    request(3, 'tools/call', { name: 'fixture_echo', arguments: { value: 'controlled' } });
    child.stdin.end();
    const [text, exitCode, stderr] = await Promise.all([new Response(child.stdout).text(), child.exited, new Response(child.stderr).text()]);
    const replies = text.trim().split('\n').map(line => JSON.parse(line));
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(replies[0].result.serverInfo.name).toBe('omp-m0-local-fixture');
    expect(replies[1].result.tools[0].name).toBe('fixture_echo');
    expect(replies[2].result.content[0].text).toBe('m0-tool-observed');
    expect(await readFile(stateFile, 'utf8')).toContain('fixture.stdin.closed');
  } finally { child.kill(); await child.exited; await rm(directory, { recursive: true, force: true }); }
}, 5000);
