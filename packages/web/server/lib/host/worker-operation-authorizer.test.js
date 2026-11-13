import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { beforeAll, describe, expect, it } from 'vitest';
import { createProjectDirectoryRuntime } from './project-directory-runtime.js';
import { createWorkerOperationAuthorizer, isPermissionPresetId, PERMISSION_PRESET_IDS } from './worker-operation-authorizer.js';

const server = { serverId: 'oauth-server', label: 'OAuth server', enabled: true, transport: { type: 'http', url: 'https://mcp.example/tools' } };
const endpointFields = ['authorizationUrl', 'tokenUrl', 'issuerUrl', 'registrationUrl', 'resourceMetadataUrl', 'redirectUri', 'resource'];
let scope;
let authorize;

beforeAll(async () => {
  const cwd = await fs.realpath(fileURLToPath(new URL('..', import.meta.url)));
  const agentDirectory = await fs.realpath(fileURLToPath(new URL('.', import.meta.url)));
  scope = { rootSessionId: 'root', workerGeneration: 'generation', projectId: 'project', workspaceId: 'workspace', agentDirectoryId: 'agent-directory', cwd, agentDirectory };
  const policy = {
    projectId: scope.projectId, workspaceId: scope.workspaceId, agentDirectoryId: scope.agentDirectoryId, cwd, agentDirectory,
    providers: [], mcpServers: [server], fileTools: [], shellCommands: [], agentIds: [], permissionPresetIds: [], providerEntry: true
  };
  const directoryOwner = createProjectDirectoryRuntime({ fsPromises: fs, path, normalizeDirectoryPath: value => value });
  authorize = createWorkerOperationAuthorizer({
    resolvePolicy: async () => policy,
    validateDirectoryPath: directoryOwner.validateDirectoryPath,
    enterprisePolicyOptions: { env: { OPENCHAMBER_ENTERPRISE_MODE: '1' }, readFile: () => { const error = new Error('Absent policy'); error.code = 'ENOENT'; throw error; } },
  });
});

describe('Host MCP OAuth authorization', () => {
  it('allows configured remote MCP discovery and sanitized flow endpoints under enterprise policy', async () => {
    expect(await authorize(scope, { type: 'mcp-oauth', server, configuration: {} })).toEqual({ allowed: true });
    const configuration = Object.fromEntries(endpointFields.map(field => [field, `https://oauth.example/${field}?resource=tools`]));
    Object.assign(configuration, { clientId: 'public-client', scopes: 'mcp:tools', prompt: 'consent', callbackPort: 3000, callbackPath: '/callback', stripSameOriginResource: false });
    expect(await authorize(scope, { type: 'mcp-oauth', server, configuration })).toEqual({ allowed: true });
    expect(await authorize(scope, { type: 'provider-entry' })).toMatchObject({ allowed: false, code: 'enterprise_mode', status: 403 });
  });

  it.each(endpointFields)('refuses unsafe %s without treating it as an unavailable policy', async field => {
    for (const url of ['file:///etc/passwd', 'https://user:secret@oauth.example/token', 'https://oauth.example/token#fragment', 'not-a-url']) {
      expect(await authorize(scope, { type: 'mcp-oauth', server, configuration: { [field]: url } })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });
    }
  });

  it('refuses secret, transport injection and unknown configuration fields', async () => {
    for (const configuration of [{ clientSecret: 'private' }, { fetch: 'injected' }, { headers: { Authorization: 'private' } }, { arbitrary: true }]) {
      expect(await authorize(scope, { type: 'mcp-oauth', server, configuration })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });
    }
  });

  it('keeps configured-server and captured-source authority independent of endpoint validity', async () => {
    expect(await authorize(scope, { type: 'mcp-oauth', server: { ...server, transport: { type: 'http', url: 'https://foreign.example/tools' } }, configuration: {} })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    expect(await authorize({ ...scope, agentDirectoryId: 'foreign-agent-directory' }, { type: 'mcp-oauth', server, configuration: {} })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
  });
});

async function nativeHarness(rows = [], enterprisePolicyOptions) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'native-host-policy-'));
  await Promise.all(['workspace', 'agent', 'outside'].map(name => fs.mkdir(path.join(root, name))));
  const cwd = await fs.realpath(path.join(root, 'workspace'));
  const agentDirectory = await fs.realpath(path.join(root, 'agent'));
  const nativeScope = { rootSessionId: 'native-root', workerGeneration: 'native-generation', projectId: 'native-project', workspaceId: 'native-workspace', agentDirectoryId: 'native-source', cwd, agentDirectory };
  const policy = {
    projectId: nativeScope.projectId, workspaceId: nativeScope.workspaceId, agentDirectoryId: nativeScope.agentDirectoryId, cwd, agentDirectory,
    providers: [{ providerId: 'fixture', modelId: 'small', endpoint: 'https://fixture.example/v1' }], mcpServers: [], fileTools: ['read', 'write'], shellCommands: [], agentIds: [], permissionPresetIds: [], providerEntry: true
  };
  const directoryOwner = createProjectDirectoryRuntime({ fsPromises: fs, path, normalizeDirectoryPath: value => value });
  const nativeAuthorize = createWorkerOperationAuthorizer({ resolvePolicy: async () => policy, validateDirectoryPath: directoryOwner.validateDirectoryPath, approvalPolicyStore: { list: () => rows }, enterprisePolicyOptions });
  return { scope: nativeScope, policy, authorize: nativeAuthorize, outside: path.join(root, 'outside'), close: () => fs.rm(root, { recursive: true, force: true }) };
}

describe('Host-owned native descriptor authority', () => {
  it('requires a trusted descriptor and contains every native read/write/rename target', async () => {
    const harness = await nativeHarness();
    try {
      const inside = path.join(harness.scope.cwd, 'inside.txt');
      const outside = path.join(harness.outside, 'outside.txt');
      await fs.writeFile(inside, 'inside');
      await fs.writeFile(outside, 'outside');
      const read = { type: 'tool', toolName: 'read', input: { path: 'inside.txt:2-8' } };
      const descriptor = { toolName: 'read', sourcePaths: [inside], destinationPaths: [], fileOps: [] };
      expect(await harness.authorize(harness.scope, read)).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });
      expect(await harness.authorize(harness.scope, read, descriptor)).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, read, { ...descriptor, sourcePaths: [outside] })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      for (const effectiveMode of ['apply_patch', 'hashline', 'patch', 'replace', 'sloppy']) {
        const request = { type: 'tool', toolName: 'edit', input: { changes: 'source-owned native edit input' } };
        const edit = { toolName: 'edit', effectiveMode, sourcePaths: [inside], destinationPaths: [inside], fileOps: [{ kind: 'rename', path: inside, to: outside }] };
        expect(await harness.authorize(harness.scope, request, edit)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
        expect(await fs.readFile(outside, 'utf8')).toBe('outside');
      }
      expect(await fs.readFile(inside, 'utf8')).toBe('inside');
    } finally { await harness.close(); }
  });

  it('rejects symlink escapes after trusted Bun path parsing', async () => {
    const harness = await nativeHarness();
    try {
      await fs.symlink(harness.outside, path.join(harness.scope.cwd, 'linked'));
      await fs.writeFile(path.join(harness.outside, 'secret.txt'), 'SECRET_UNCHANGED');
      const escaped = path.join(harness.scope.cwd, 'linked', 'secret.txt');
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'read', input: { path: 'linked/secret.txt:1' } }, { toolName: 'read', sourcePaths: [escaped], destinationPaths: [], fileOps: [] })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'write', input: { path: 'linked/secret.txt', content: 'overwrite' } }, { toolName: 'write', sourcePaths: [], destinationPaths: [escaped], fileOps: [{ kind: 'write', path: escaped }] })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await fs.readFile(path.join(harness.outside, 'secret.txt'), 'utf8')).toBe('SECRET_UNCHANGED');
    } finally { await harness.close(); }
  });

  it('passes only allowlisted OMP internal read URLs and keeps local targets authorized', async () => {
    const harness = await nativeHarness();
    try {
      const inside = path.join(harness.scope.cwd, 'inside.txt');
      await fs.writeFile(inside, 'inside');
      const internalRead = { type: 'tool', toolName: 'read', input: { path: 'agent://native' } };
      const internalDescriptor = { toolName: 'read', sourcePaths: [], destinationPaths: [], fileOps: [], internalReadUrls: ['agent://native'] };
      expect(await harness.authorize(harness.scope, internalRead, internalDescriptor)).toEqual({ allowed: true });
      for (const scheme of ['agent', 'history', 'artifact', 'local', 'proc', 'skill', 'xd', 'mcp', 'omp', 'issue', 'pr']) {
        expect(await harness.authorize(harness.scope, internalRead, { ...internalDescriptor, internalReadUrls: [`${scheme}://native`] })).toEqual({ allowed: true });
      }
      expect(await harness.authorize(harness.scope, internalRead, { ...internalDescriptor, internalReadUrls: ['file:///etc/passwd'] })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });
      expect(await harness.authorize(harness.scope, internalRead, { ...internalDescriptor, internalReadUrls: ['agent://native\0'] })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });
      expect(await harness.authorize(harness.scope, internalRead, { ...internalDescriptor, internalReadUrls: ['https://example.com'] })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });

      const mixed = { type: 'tool', toolName: 'read', input: { path: 'inside.txt;agent://native' } };
      expect(await harness.authorize(harness.scope, mixed, { ...internalDescriptor, sourcePaths: [inside] })).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, mixed, { ...internalDescriptor, sourcePaths: [path.join(harness.outside, 'secret')] })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });

      for (const toolName of ['write', 'edit', 'grep', 'glob']) {
        const request = { type: 'tool', toolName, input: { path: 'agent://native' } };
        expect(await harness.authorize(harness.scope, request, { ...internalDescriptor, toolName })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      }
      harness.policy.fileTools = [];
      expect(await harness.authorize(harness.scope, internalRead, internalDescriptor)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
  });

  it('admits native wait without granting another native tool', async () => {
    const harness = await nativeHarness();
    try {
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'wait', input: { ids: ['bg_1'] } })).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'wait-foreign', input: {} })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
  });

  it('binds initialized provider/model/endpoint instead of accepting a worker-declared fallback', async () => {
    const harness = await nativeHarness();
    try {
      const request = { type: 'tool', toolName: 'provider.use', input: {} };
      const descriptor = { toolName: 'provider.use', sourcePaths: [], destinationPaths: [], fileOps: [], providerId: 'fixture', modelId: 'small', endpoint: 'https://fixture.example/v1' };
      expect(await harness.authorize(harness.scope, request, descriptor)).toEqual({ allowed: true });
      for (const delta of [{ providerId: 'foreign' }, { modelId: 'foreign' }, { endpoint: 'https://foreign.example/v1' }]) {
        expect(await harness.authorize(harness.scope, request, { ...descriptor, ...delta })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      }
    } finally { await harness.close(); }
  });

  it('requires exact consent for the native workspace-root command descriptor unless machine policy grants it', async () => {
    const harness = await nativeHarness();
    try {
      const command = 'printf harmless';
      const request = { type: 'tool', toolName: 'bash', input: { command }, approvalId: 'approval', toolCallId: 'call' };
      const descriptor = { toolName: 'bash', sourcePaths: [harness.scope.cwd], destinationPaths: [], fileOps: [], command };
      const approvalGrant = { approvalId: 'approval', toolCallId: 'call', rootSessionId: harness.scope.rootSessionId, workerGeneration: harness.scope.workerGeneration, epoch: 'epoch', command };
      expect(await harness.authorize(harness.scope, request, descriptor)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, approvalRequired: true });
      expect(await harness.authorize(harness.scope, request, { ...descriptor, sourcePaths: [harness.outside] })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, request, { ...descriptor, approvalGrant })).toEqual({ allowed: true });
      for (const mismatch of [{ command: 'printf other' }, { toolCallId: 'other-call' }, { rootSessionId: 'foreign-root' }, { workerGeneration: 'retired-generation' }]) {
        expect(await harness.authorize(harness.scope, request, { ...descriptor, approvalGrant: { ...approvalGrant, ...mismatch } })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, approvalRequired: true });
      }
      harness.policy.shellCommands.push(command);
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'bash', input: { command } }, descriptor)).toEqual({ allowed: true });
    } finally { await harness.close(); }
  });

  it('keeps explicit workspace deny authoritative over one-shot approval and machine grants', async () => {
    const command = 'printf denied';
    const input = { command };
    const harness = await nativeHarness([{ scope: 'workspace', decision: 'deny', target: { toolName: 'bash', pattern: JSON.stringify(input) } }]);
    try {
      harness.policy.shellCommands.push(command);
      const request = { type: 'tool', toolName: 'bash', input, approvalId: 'approval', toolCallId: 'call' };
      const descriptor = {
        toolName: 'bash', sourcePaths: [], destinationPaths: [], fileOps: [], command,
        approvalGrant: { approvalId: 'approval', toolCallId: 'call', rootSessionId: harness.scope.rootSessionId, workerGeneration: harness.scope.workerGeneration, epoch: 'epoch', command }
      };
      expect(await harness.authorize(harness.scope, request, descriptor)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
  });

  it('admits native questions without granting unknown tools and keeps scope, profile and explicit deny checks', async () => {
    const input = { questions: [{ id: 'choice', question: 'Choose', options: [{ label: 'One' }, { label: 'Two' }] }] };
    const request = { type: 'tool', toolName: 'ask', input };
    const harness = await nativeHarness();
    try {
      expect(await harness.authorize(harness.scope, request)).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, { ...request, toolName: 'custom-question' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize({ ...harness.scope, workspaceId: 'foreign' }, request)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, agentId: 'foreign' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, permissionPresetId: 'foreign' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
    const denied = await nativeHarness([{ scope: 'workspace', decision: 'deny', target: { toolName: 'ask', pattern: JSON.stringify(input) } }]);
    try {
      expect(await denied.authorize(denied.scope, request)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await denied.close(); }
  });

  it('admits native child result submission without granting arbitrary tools', async () => {
    const input = { data: { marker: 'T18 child marker' } };
    const request = { type: 'tool', toolName: 'yield', input };
    const harness = await nativeHarness();
    try {
      expect(await harness.authorize(harness.scope, request)).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, { ...request, toolName: 'custom-yield' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, agentId: 'foreign' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
    const denied = await nativeHarness([{ scope: 'workspace', decision: 'deny', target: { toolName: 'yield', pattern: JSON.stringify(input) } }]);
    try {
      expect(await denied.authorize(denied.scope, request)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await denied.close(); }
  });

  it('admits session-local goal operations without granting machine capabilities', async () => {
    const harness = await nativeHarness();
    try {
      for (const op of ['create', 'get', 'complete', 'resume', 'drop']) {
        const request = { type: 'tool', toolName: 'goal', input: { op, objective: 'Finish the task' } };
        expect(await harness.authorize(harness.scope, request)).toEqual({ allowed: true });
        for (const mismatch of [{ workspaceId: 'foreign' }, { agentDirectoryId: 'foreign' }, { cwd: harness.outside }]) {
          expect(await harness.authorize({ ...harness.scope, ...mismatch }, request)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
        }
        expect(await harness.authorize(harness.scope, { ...request, toolName: 'unregistered-tool' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      }
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'goal', input: { op: 'complete' }, agentId: 'foreign' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
    const input = { op: 'complete' };
    const denied = await nativeHarness([{ scope: 'workspace', decision: 'deny', target: { toolName: 'goal', pattern: JSON.stringify(input) } }]);
    try {
      expect(await denied.authorize(denied.scope, { type: 'tool', toolName: 'goal', input })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await denied.close(); }
  });

  it('admits session-local todo operations without granting machine capabilities', async () => {
    const harness = await nativeHarness();
    try {
      for (const op of ['init', 'view']) {
        const input = op === 'init'
          ? { op, list: [{ phase: 'Phase 1', items: ['Task 1'] }] }
          : { op };
        const request = { type: 'tool', toolName: 'todo', input };
        expect(await harness.authorize(harness.scope, request)).toEqual({ allowed: true });
        for (const mismatch of [{ workspaceId: 'foreign' }, { agentDirectoryId: 'foreign' }, { cwd: harness.outside }]) {
          expect(await harness.authorize({ ...harness.scope, ...mismatch }, request)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
        }
      }
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'todo', input: { op: 'init' }, agentId: 'foreign' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'todo', input: { op: 'init' }, permissionPresetId: 'foreign' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
    const input = { op: 'init' };
    const denied = await nativeHarness([{ scope: 'workspace', decision: 'deny', target: { toolName: 'todo', pattern: JSON.stringify(input) } }]);
    try {
      expect(await denied.authorize(denied.scope, { type: 'tool', toolName: 'todo', input })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await denied.close(); }
  });

  it('admits profile-gated native task delegation without granting arbitrary tools', async () => {
    const input = { agent: 'child', name: 'child-proof', task: 'Return the child proof marker.' };
    const request = { type: 'tool', toolName: 'task', input };
    const harness = await nativeHarness();
    try {
      harness.policy.agentIds.push('profile');
      expect(await harness.authorize(harness.scope, { ...request, agentId: 'profile' })).toEqual({ allowed: true });
      expect(await harness.authorize({ ...harness.scope, workspaceId: 'foreign' }, request)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, agentId: 'foreign' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, permissionPresetId: 'foreign' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, toolName: 'arbitrary-tool' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, input: { ...input, isolated: true } })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, input: { tasks: [{ ...input, isolated: true }] } })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, input: { ...input, name: '../escape' } })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });
      expect(await harness.authorize(harness.scope, { ...request, input: { tasks: [{ ...input, name: 'nested/escape' }] } })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });
      expect(await harness.authorize(harness.scope, { ...request, input: { agent: input.agent, task: input.task } })).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, { ...request, input: { tasks: [{ ...input, name: 'safe-child-2' }] } })).toEqual({ allowed: true });
    } finally { await harness.close(); }
    const denied = await nativeHarness([{ scope: 'workspace', decision: 'deny', target: { toolName: 'task', pattern: JSON.stringify(input) } }]);
    try {
      expect(await denied.authorize(denied.scope, request)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await denied.close(); }
  });
  it('validates permissionPresetId and authorizes permission.preset tools against workspace policy', async () => {
    expect(PERMISSION_PRESET_IDS).toEqual(['ask', 'safety', 'auto']);
    expect(isPermissionPresetId('ask')).toBe(true);
    expect(isPermissionPresetId('safety')).toBe(true);
    expect(isPermissionPresetId('auto')).toBe(true);
    expect(isPermissionPresetId('invalid')).toBe(false);
    expect(isPermissionPresetId(null)).toBe(false);
    expect(isPermissionPresetId(123)).toBe(false);

    const harness = await nativeHarness();
    try {
      harness.policy.permissionPresetIds.push('safety');
      expect(await harness.authorize(harness.scope, {
        type: 'tool',
        toolName: 'permission.preset',
        input: { presetId: 'safety' },
        permissionPresetId: 'safety',
      })).toEqual({ allowed: true });

      expect(await harness.authorize(harness.scope, {
        type: 'tool',
        toolName: 'permission.preset',
        input: { presetId: 'invalid' },
        permissionPresetId: 'invalid',
      })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });

      expect(await harness.authorize(harness.scope, {
        type: 'tool',
        toolName: 'permission.preset',
        input: { presetId: 'auto' },
        permissionPresetId: 'auto',
      })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });

      expect(await harness.authorize(harness.scope, {
        type: 'tool',
        toolName: 'permission.preset',
        input: { presetId: 'ask' },
        permissionPresetId: 'safety',
      })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally {
      await harness.close();
    }
  });
});

describe('proposed-state authorization', () => {
  it('C1/C2/C6 authorize the MCP server a persist operation introduces', async () => {
    const harness = await nativeHarness();
    try {
      const proposed = { serverId: 'proposed-server', label: 'Proposed', enabled: true, transport: { type: 'http', url: 'https://proposed.example/tools' } };
      expect(await harness.authorize(harness.scope, { type: 'mcp-server', server: proposed }))
        .toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { type: 'mcp-server', server: proposed, proposed: true })).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, { type: 'mcp-oauth', server: proposed, configuration: {}, proposed: true })).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, { type: 'mcp-server', server: { ...proposed, enabled: false }, proposed: true }))
        .toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { type: 'mcp-server', server: { ...proposed, managed: false }, proposed: true }))
        .toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { type: 'mcp-oauth', server: { ...proposed, transport: { type: 'stdio', command: 'server', args: [] } }, configuration: {}, proposed: true }))
        .toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });
    } finally { await harness.close(); }
  });

  it('C3/C4 authorize the permission preset an agent write introduces', async () => {
    const harness = await nativeHarness();
    try {
      const request = { type: 'tool', toolName: 'permission.preset', input: { presetId: 'auto' }, permissionPresetId: 'auto' };
      expect(await harness.authorize(harness.scope, request)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, proposed: true })).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, { ...request, proposed: true, input: { presetId: 'safety' } }))
        .toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, proposed: true, input: { presetId: 'invented' }, permissionPresetId: 'invented' }))
        .toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
  });

  it('C5 authorizes the provider and model a completion introduces', async () => {
    const harness = await nativeHarness();
    try {
      const request = { type: 'tool', toolName: 'provider.use', input: { providerId: 'added', modelId: 'added-model' } };
      const descriptor = { toolName: 'provider.use', sourcePaths: [], destinationPaths: [], fileOps: [], providerId: 'added', modelId: 'added-model' };
      expect(await harness.authorize(harness.scope, request, descriptor)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, { ...request, proposed: true }, descriptor)).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, { ...request, proposed: true }, { ...descriptor, modelId: undefined }))
        .toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      expect(await harness.authorize(harness.scope, request, { ...descriptor, providerId: 'fixture', modelId: 'small', endpoint: 'https://fixture.example/v1' })).toEqual({ allowed: true });
    } finally { await harness.close(); }
  });

  it('names the refusing check in every refusal', async () => {
    const harness = await nativeHarness();
    try {
      const refusals = [
        await harness.authorize({ ...harness.scope, workspaceId: 'foreign' }, { type: 'tool', toolName: 'wait', input: {} }),
        await harness.authorize(harness.scope, { type: 'tool', toolName: 'wait', input: {}, agentId: 'foreign' }),
        await harness.authorize(harness.scope, { type: 'mcp-server', server }),
        await harness.authorize(harness.scope, { type: 'tool', toolName: 'read', input: { path: 'x' } }),
        await harness.authorize(harness.scope, { type: 'tool', toolName: 'bash', input: { command: 'true' } }),
      ];
      for (const refusal of refusals) {
        expect(refusal.allowed).toBe(false);
        expect(typeof refusal.detail).toBe('string');
        expect(refusal.detail.length).toBeGreaterThan(0);
      }
    } finally { await harness.close(); }
  });
});

describe('native web-search egress authority', () => {
  it('reads machine policy for each actual query and fails closed for malformed policy', async () => {
    let policyText = JSON.stringify({ enterpriseMode: false });
    const harness = await nativeHarness([], { env: {}, readFile: () => policyText });
    try {
      expect(await harness.authorize(harness.scope, { type: 'web-search' })).toEqual({ allowed: true });
      policyText = JSON.stringify({ enterpriseMode: true });
      expect(await harness.authorize(harness.scope, { type: 'web-search' })).toMatchObject({ allowed: false, code: 'enterprise_mode', status: 403 });
      policyText = '{broken';
      expect(await harness.authorize(harness.scope, { type: 'web-search' })).toMatchObject({ allowed: false, code: 'enterprise_mode', status: 403 });
      policyText = JSON.stringify({ enterpriseMode: false });
      expect(await harness.authorize(harness.scope, { type: 'web-search' })).toEqual({ allowed: true });
    } finally { await harness.close(); }
  });

  it('requires captured workspace and source authority even when enterprise mode is off', async () => {
    const harness = await nativeHarness([], { env: {}, readFile: () => '{}' });
    try {
      for (const mismatch of [{ workspaceId: 'foreign' }, { agentDirectoryId: 'foreign' }, { cwd: harness.outside }, { agentDirectory: harness.outside }]) {
        expect(await harness.authorize({ ...harness.scope, ...mismatch }, { type: 'web-search' })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      }
      expect(await harness.authorize(harness.scope, { type: 'web-search', endpoint: 'http://localhost:8080' })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });
    } finally { await harness.close(); }
  });
});
describe('Host-owned native LSP tool authorization', () => {
  it('authorizes read-only LSP actions on workspace-contained files under read policy', async () => {
    const harness = await nativeHarness();
    try {
      const inside = path.join(harness.scope.cwd, 'inside.ts');
      await fs.writeFile(inside, 'export const a = 1;');

      for (const action of ['hover', 'definition', 'type_definition', 'implementation', 'references']) {
        const request = { type: 'tool', toolName: 'lsp', input: { action, file: 'inside.ts', line: 1 } };
        const descriptor = { toolName: 'lsp', lspAction: action, lspMethod: `textDocument/${action}`, sourcePaths: [inside], destinationPaths: [], fileOps: [] };
        expect(await harness.authorize(harness.scope, request, descriptor)).toEqual({ allowed: true });
      }

      // status
      const statusReq = { type: 'tool', toolName: 'lsp', input: { action: 'status' } };
      const statusDesc = { toolName: 'lsp', lspAction: 'status', lspMethod: 'status', sourcePaths: [harness.scope.cwd], destinationPaths: [], fileOps: [] };
      expect(await harness.authorize(harness.scope, statusReq, statusDesc)).toEqual({ allowed: true });

      // diagnostics workspace (*) and file
      const diagAllReq = { type: 'tool', toolName: 'lsp', input: { action: 'diagnostics', file: '*' } };
      const diagAllDesc = { toolName: 'lsp', lspAction: 'diagnostics', lspMethod: 'workspace/diagnostic', sourcePaths: [harness.scope.cwd], destinationPaths: [], fileOps: [] };
      expect(await harness.authorize(harness.scope, diagAllReq, diagAllDesc)).toEqual({ allowed: true });

      const diagFileReq = { type: 'tool', toolName: 'lsp', input: { action: 'diagnostics', file: 'inside.ts' } };
      const diagFileDesc = { toolName: 'lsp', lspAction: 'diagnostics', lspMethod: 'textDocument/diagnostic', sourcePaths: [inside], destinationPaths: [], fileOps: [] };
      expect(await harness.authorize(harness.scope, diagFileReq, diagFileDesc)).toEqual({ allowed: true });

      // symbols workspace and file
      const symAllReq = { type: 'tool', toolName: 'lsp', input: { action: 'symbols' } };
      const symAllDesc = { toolName: 'lsp', lspAction: 'symbols', lspMethod: 'workspace/symbol', sourcePaths: [harness.scope.cwd], destinationPaths: [], fileOps: [] };
      expect(await harness.authorize(harness.scope, symAllReq, symAllDesc)).toEqual({ allowed: true });

      const symFileReq = { type: 'tool', toolName: 'lsp', input: { action: 'symbols', file: 'inside.ts' } };
      const symFileDesc = { toolName: 'lsp', lspAction: 'symbols', lspMethod: 'textDocument/documentSymbol', sourcePaths: [inside], destinationPaths: [], fileOps: [] };
      expect(await harness.authorize(harness.scope, symFileReq, symFileDesc)).toEqual({ allowed: true });

      // capabilities
      const capReq = { type: 'tool', toolName: 'lsp', input: { action: 'capabilities' } };
      const capDesc = { toolName: 'lsp', lspAction: 'capabilities', lspMethod: 'capabilities', sourcePaths: [harness.scope.cwd], destinationPaths: [], fileOps: [] };
      expect(await harness.authorize(harness.scope, capReq, capDesc)).toEqual({ allowed: true });

      // code_actions query (apply !== true)
      const caReq = { type: 'tool', toolName: 'lsp', input: { action: 'code_actions', file: 'inside.ts' } };
      const caDesc = { toolName: 'lsp', lspAction: 'code_actions', lspMethod: 'textDocument/codeAction', sourcePaths: [inside], destinationPaths: [], fileOps: [] };
      expect(await harness.authorize(harness.scope, caReq, caDesc)).toEqual({ allowed: true });
    } finally { await harness.close(); }
  });

  it('fails closed for escaped paths, symlink escapes, and missing read permissions', async () => {
    const harness = await nativeHarness();
    try {
      const inside = path.join(harness.scope.cwd, 'inside.ts');
      const outside = path.join(harness.outside, 'outside.ts');
      await fs.writeFile(inside, 'inside');
      await fs.writeFile(outside, 'outside');
      await fs.symlink(harness.outside, path.join(harness.scope.cwd, 'linked'));
      const escapedSymlink = path.join(harness.scope.cwd, 'linked', 'outside.ts');

      const req = { type: 'tool', toolName: 'lsp', input: { action: 'hover', file: 'outside.ts', line: 1 } };

      // Outside path
      expect(await harness.authorize(harness.scope, req, { toolName: 'lsp', lspAction: 'hover', sourcePaths: [outside], destinationPaths: [], fileOps: [] })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });

      // Symlink escape
      expect(await harness.authorize(harness.scope, req, { toolName: 'lsp', lspAction: 'hover', sourcePaths: [escapedSymlink], destinationPaths: [], fileOps: [] })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });

      // Read permission stripped from policy
      harness.policy.fileTools = ['write'];
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'lsp', input: { action: 'hover', file: 'inside.ts', line: 1 } }, { toolName: 'lsp', lspAction: 'hover', sourcePaths: [inside], destinationPaths: [], fileOps: [] })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });

      // Read-only query claiming destination paths fails closed
      harness.policy.fileTools = ['read', 'write'];
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'lsp', input: { action: 'hover', file: 'inside.ts', line: 1 } }, { toolName: 'lsp', lspAction: 'hover', sourcePaths: [inside], destinationPaths: [inside], fileOps: [] })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
  });

  it('fails closed for malformed params and unsupported methods', async () => {
    const harness = await nativeHarness();
    try {
      const inside = path.join(harness.scope.cwd, 'inside.ts');
      await fs.writeFile(inside, 'inside');

      // Missing descriptor -> 400
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'lsp', input: { action: 'hover', file: 'inside.ts' } })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });

      // Descriptor missing lspAction -> 400
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'lsp', input: { action: 'hover', file: 'inside.ts' } }, { toolName: 'lsp', sourcePaths: [inside], destinationPaths: [], fileOps: [] })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });

      // Descriptor toolName mismatch -> 400
      expect(await harness.authorize(harness.scope, { type: 'tool', toolName: 'lsp', input: { action: 'hover', file: 'inside.ts' } }, { toolName: 'read', sourcePaths: [inside], destinationPaths: [], fileOps: [] })).toMatchObject({ allowed: false, code: 'INVALID_REQUEST', status: 400 });

      // Unsupported actions -> 403
      for (const action of ['reload', 'request', 'unknown_action', 'eval']) {
        const req = { type: 'tool', toolName: 'lsp', input: { action } };
        const desc = { toolName: 'lsp', lspAction: action, sourcePaths: [inside], destinationPaths: [], fileOps: [] };
        expect(await harness.authorize(harness.scope, req, desc)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
      }
    } finally { await harness.close(); }
  });

  it('fails closed for mutations without explicit approval grant, and authorizes granted mutations', async () => {
    const harness = await nativeHarness();
    try {
      const inside = path.join(harness.scope.cwd, 'inside.ts');
      const renamed = path.join(harness.scope.cwd, 'renamed.ts');
      await fs.writeFile(inside, 'inside');

      // rename without approval grant -> 403 approvalRequired
      const renameReq = { type: 'tool', toolName: 'lsp', input: { action: 'rename', file: 'inside.ts', line: 1, new_name: 'renamed' }, approvalId: 'app-1', toolCallId: 'call-1' };
      const renameDesc = { toolName: 'lsp', lspAction: 'rename', sourcePaths: [inside], destinationPaths: [inside], fileOps: [] };
      expect(await harness.authorize(harness.scope, renameReq, renameDesc)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, approvalRequired: true });

      // code_actions with apply: true without grant -> 403 approvalRequired
      const caApplyReq = { type: 'tool', toolName: 'lsp', input: { action: 'code_actions', file: 'inside.ts', apply: true }, approvalId: 'app-1', toolCallId: 'call-1' };
      const caApplyDesc = { toolName: 'lsp', lspAction: 'code_actions', sourcePaths: [inside], destinationPaths: [inside], fileOps: [] };
      expect(await harness.authorize(harness.scope, caApplyReq, caApplyDesc)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, approvalRequired: true });

      // rename_file without grant -> 403 approvalRequired
      const rfReq = { type: 'tool', toolName: 'lsp', input: { action: 'rename_file', file: 'inside.ts', new_name: 'renamed.ts' }, approvalId: 'app-1', toolCallId: 'call-1' };
      const rfDesc = { toolName: 'lsp', lspAction: 'rename_file', sourcePaths: [inside], destinationPaths: [renamed], fileOps: [{ kind: 'rename', path: inside, to: renamed }] };
      expect(await harness.authorize(harness.scope, rfReq, rfDesc)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, approvalRequired: true });

      // Mutation without write permission in fileTools fails closed
      harness.policy.fileTools = ['read'];
      const grant = { approvalId: 'app-1', toolCallId: 'call-1', rootSessionId: harness.scope.rootSessionId, workerGeneration: harness.scope.workerGeneration, epoch: 'epoch-1', command: 'rename' };
      expect(await harness.authorize(harness.scope, renameReq, { ...renameDesc, approvalGrant: grant })).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });

      // Mutation with valid grant and write permission succeeds
      harness.policy.fileTools = ['read', 'write'];
      expect(await harness.authorize(harness.scope, renameReq, { ...renameDesc, approvalGrant: grant })).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, caApplyReq, { ...caApplyDesc, approvalGrant: grant })).toEqual({ allowed: true });
      expect(await harness.authorize(harness.scope, rfReq, { ...rfDesc, approvalGrant: grant })).toEqual({ allowed: true });
    } finally { await harness.close(); }
  });

  it('enforces explicit policy denial in approval store against LSP operations', async () => {
    const input = { action: 'hover', file: 'inside.ts', line: 1 };
    const rows = [{ target: { toolName: 'lsp', pattern: JSON.stringify(input) }, decision: 'deny' }];
    const harness = await nativeHarness(rows);
    try {
      const inside = path.join(harness.scope.cwd, 'inside.ts');
      await fs.writeFile(inside, 'inside');
      const req = { type: 'tool', toolName: 'lsp', input };
      const desc = { toolName: 'lsp', lspAction: 'hover', sourcePaths: [inside], destinationPaths: [], fileOps: [] };
      expect(await harness.authorize(harness.scope, req, desc)).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403 });
    } finally { await harness.close(); }
  });
});

describe('OMP 18.18.0 tier-based tool authorization', () => {
  it('loads OMP 18.18.0 built-in tool list from the pinned package and asserts decisions matching OMP tiers', async () => {
    const builtinPath = fileURLToPath(new URL('../../../../../packages/agent-service/node_modules/@oh-my-pi/pi-coding-agent/src/tools/builtin-names.ts', import.meta.url));
    const { BUILTIN_TOOL_NAMES } = await import(builtinPath);
    expect(BUILTIN_TOOL_NAMES.length).toBeGreaterThan(20);

    const harness = await nativeHarness();
    try {
      const inside = path.join(harness.scope.cwd, 'inside.txt');
      await fs.writeFile(inside, 'inside');

      const readTier = new Set(['read', 'grep', 'glob', 'find', 'ast_grep', 'checkpoint', 'rewind', 'memory_edit', 'recall', 'reflect', 'think', 'ask', 'todo', 'wait']);
      const writeTier = new Set(['write', 'edit', 'ast_edit', 'new_context', 'manage_skill']);
      const execTier = new Set(['eval', 'debug', 'ida', 'github', 'security_scan', 'bash']);

      for (const toolName of BUILTIN_TOOL_NAMES) {
        if (toolName === 'task') {
          const res = await harness.authorize(harness.scope, { type: 'tool', toolName: 'task', input: { name: 'child', task: 'do' } });
          expect(res).toEqual({ allowed: true });
          continue;
        }
        if (toolName === 'web_search') {
          const res = await harness.authorize(harness.scope, { type: 'web-search' });
          expect(res).toEqual({ allowed: true });
          continue;
        }
        if (toolName === 'context_notes') {
          const readRes = await harness.authorize(harness.scope, { type: 'tool', toolName, input: {} });
          expect(readRes).toEqual({ allowed: true });
          const writeRes = await harness.authorize(harness.scope, { type: 'tool', toolName, input: { text: 'note' } });
          expect(writeRes).toEqual({ allowed: true });
          continue;
        }
        if (toolName === 'retain' || toolName === 'learn') {
          const readRes = await harness.authorize(harness.scope, { type: 'tool', toolName, input: {} });
          expect(readRes).toEqual({ allowed: true });
          continue;
        }
        if (toolName === 'lsp') {
          const lspDesc = { toolName: 'lsp', lspAction: 'hover', sourcePaths: [inside], destinationPaths: [], fileOps: [] };
          const res = await harness.authorize(harness.scope, { type: 'tool', toolName, input: { action: 'hover' } }, lspDesc);
          expect(res).toEqual({ allowed: true });
          continue;
        }

        if (readTier.has(toolName)) {
          const descriptor = ['read', 'grep', 'glob'].includes(toolName)
            ? { toolName, sourcePaths: [inside], destinationPaths: [], fileOps: [] }
            : undefined;
          const res = await harness.authorize(harness.scope, { type: 'tool', toolName, input: { path: 'inside.txt' } }, descriptor);
          expect(res.allowed).toBe(true);
        } else if (writeTier.has(toolName)) {
          const descriptor = ['write', 'edit'].includes(toolName)
            ? { toolName, sourcePaths: [inside], destinationPaths: [inside], fileOps: [], effectiveMode: 'replace' }
            : undefined;
          const res = await harness.authorize(harness.scope, { type: 'tool', toolName, input: { path: 'inside.txt' } }, descriptor);
          expect(res.allowed).toBe(true);
        } else if (execTier.has(toolName)) {
          const descriptor = toolName === 'bash'
            ? { toolName: 'bash', command: 'echo 1', sourcePaths: [harness.scope.cwd], destinationPaths: [], fileOps: [] }
            : undefined;
          const res = await harness.authorize(harness.scope, { type: 'tool', toolName, input: { command: 'echo 1' } }, descriptor);
          expect(res.allowed).toBe(false);
          expect(res.approvalRequired).toBe(true);
        }
      }
    } finally {
      await harness.close();
    }
  });

  it('out-of-workspace read returns approvalRequired and succeeds with approvalGrant', async () => {
    const harness = await nativeHarness();
    try {
      const outside = path.join(harness.outside, 'outside.txt');
      await fs.writeFile(outside, 'outside');
      const req = { type: 'tool', toolName: 'read', input: { path: outside }, approvalId: 'app-out', toolCallId: 'call-out' };
      const desc = { toolName: 'read', sourcePaths: [outside], destinationPaths: [], fileOps: [] };

      const unapproved = await harness.authorize(harness.scope, req, desc);
      expect(unapproved).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, approvalRequired: true, detail: 'The operation targets a path outside the authorized workspace' });

      const grant = { approvalId: 'app-out', toolCallId: 'call-out', rootSessionId: harness.scope.rootSessionId, workerGeneration: harness.scope.workerGeneration, epoch: 'epoch-1', toolName: 'read', input: req.input };
      const approved = await harness.authorize(harness.scope, req, { ...desc, approvalGrant: grant });
      expect(approved).toEqual({ allowed: true });
    } finally {
      await harness.close();
    }
  });

  it('out-of-workspace write stays denied even with approvalGrant', async () => {
    const harness = await nativeHarness();
    try {
      const outside = path.join(harness.outside, 'outside.txt');
      await fs.writeFile(outside, 'outside');
      const req = { type: 'tool', toolName: 'write', input: { path: outside, content: 'evil' }, approvalId: 'app-out', toolCallId: 'call-out' };
      const desc = { toolName: 'write', sourcePaths: [], destinationPaths: [outside], fileOps: [{ kind: 'write', path: outside }] };
      const grant = { approvalId: 'app-out', toolCallId: 'call-out', rootSessionId: harness.scope.rootSessionId, workerGeneration: harness.scope.workerGeneration, epoch: 'epoch-1', toolName: 'write', input: req.input };

      const res = await harness.authorize(harness.scope, req, { ...desc, approvalGrant: grant });
      expect(res).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, detail: 'The operation targets a path outside the authorized workspace' });
      expect(res.approvalRequired).toBeUndefined();
    } finally {
      await harness.close();
    }
  });

  it('authorizes MCP tools: configured server returns approvalRequired (allowed with grant); unconfigured server denied', async () => {
    const harness = await nativeHarness();
    try {
      harness.policy.mcpServers = [{ serverId: 'github_mcp', label: 'GitHub MCP', enabled: true, transport: { type: 'http', url: 'https://mcp.example/tools' } }];
      const toolCallId = 'mcp-call-1';
      const approvalId = 'mcp-app-1';
      const input = { query: 'repo' };
      const req = { type: 'tool', toolName: 'mcp__github_mcp_search', input, approvalId, toolCallId };

      const unapproved = await harness.authorize(harness.scope, req);
      expect(unapproved).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, approvalRequired: true, detail: 'The MCP tool requires approval' });

      const grant = { approvalId, toolCallId, rootSessionId: harness.scope.rootSessionId, workerGeneration: harness.scope.workerGeneration, epoch: 'epoch-1', toolName: req.toolName, input };
      const desc = { toolName: req.toolName, sourcePaths: [], destinationPaths: [], fileOps: [], approvalGrant: grant };
      const approved = await harness.authorize(harness.scope, req, desc);
      expect(approved).toEqual({ allowed: true });

      const unconfReq = { type: 'tool', toolName: 'mcp__unknown_server_tool', input: {} };
      const unconfRes = await harness.authorize(harness.scope, unconfReq);
      expect(unconfRes).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, detail: 'The MCP server is not in the workspace configuration' });
    } finally {
      await harness.close();
    }
  });

  it('authorizes eval tool: returns approvalRequired without grant, allowed with grant', async () => {
    const harness = await nativeHarness();
    try {
      const toolCallId = 'eval-call-1';
      const approvalId = 'eval-app-1';
      const input = { code: 'console.log("hello")' };
      const req = { type: 'tool', toolName: 'eval', input, approvalId, toolCallId };

      const unapproved = await harness.authorize(harness.scope, req);
      expect(unapproved).toMatchObject({ allowed: false, code: 'UNAUTHORIZED', status: 403, approvalRequired: true, detail: 'The eval tool requires approval' });

      const grant = { approvalId, toolCallId, rootSessionId: harness.scope.rootSessionId, workerGeneration: harness.scope.workerGeneration, epoch: 'epoch-1', toolName: 'eval', input };
      const desc = { toolName: 'eval', sourcePaths: [], destinationPaths: [], fileOps: [], approvalGrant: grant };
      const approved = await harness.authorize(harness.scope, req, desc);
      expect(approved).toEqual({ allowed: true });
    } finally {
      await harness.close();
    }
  });
});
