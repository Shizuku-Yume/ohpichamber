import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ProbeError, probeResult, safeError } from './envelope.mjs';
import { bounded, createFixtureSession, loadFixtureSDK } from './fixture.mjs';
import { completionContext, credentialCases, requireObservation as check, sourceImport, withCompletionProvider } from './capability-fixture.mjs';

const evidence = {
  auth: 'packages/ai/src/auth-storage.ts:267-275; packages/ai/src/auth/types.ts:796-905',
  models: 'packages/coding-agent/src/config/model-registry.ts:482-528,2909-3109',
  completion: 'packages/ai/src/stream.ts:1119-1125,1570-1585; packages/ai/src/providers/mock.ts:84-115',
  skills: 'packages/coding-agent/src/extensibility/skills.ts:289-375; packages/coding-agent/src/discovery/builtin.ts:295-324',
};
export function partialStatus(statuses) {
  return statuses.every(status => status === 'passed') ? 'passed' : 'partial';
}

async function authProbe(context) {
  const { AuthStorage } = await sourceImport(context, 'packages/ai/src/auth-storage.ts');
  const dirs = await sourceImport(context, 'packages/utils/src/dirs.ts');
  const dbPath = dirs.getAgentDbPath(context.agentDir);
  check(dbPath === join(context.agentDir, 'agent.db'), 'AUTH_DATABASE_PATH_MISMATCH');
  let storage = await AuthStorage.create(dbPath);
  let reopened;
  try {
    await storage.credentials.reload();
    check(storage.credentials.list().length === 0, 'AUTH_SANDBOX_NOT_EMPTY');
    await storage.credentials.set('anthropic', credentialCases[0].value);
    storage.keys.setRuntime('anthropic', 'm0-runtime-non-authenticating');
    check(await storage.keys.get('anthropic') === 'm0-runtime-non-authenticating', 'AUTH_RUNTIME_OVERRIDE_FAILED');
    reopened = await AuthStorage.create(dbPath);
    await reopened.credentials.reload();
    check(reopened.credentials.get('anthropic')?.type === 'api_key', 'AUTH_RELOAD_LOST_CREDENTIAL');
    check(await reopened.keys.get('anthropic') === credentialCases[0].value.key, 'AUTH_RUNTIME_OVERRIDE_PERSISTED');
    const bytes = await readFile(dbPath);
    check(bytes.subarray(0, 16).toString() === 'SQLite format 3\0', 'AUTH_DATABASE_NOT_SQLITE');
    await storage.credentials.remove('anthropic');
    await reopened.credentials.reload();
    check(!reopened.credentials.has('anthropic'), 'AUTH_RELOAD_STALE_CREDENTIAL');
    return { evidence: evidence.auth, databaseFile: 'agent.db', explicitAgentDirectory: true, sqliteHeaderObserved: true, crossInstanceReload: true, removalReload: true, runtimeOverrideNotPersisted: true, initialCredentialCount: 0, cleanup: 'both storage handles closed', limitation: 'Non-authenticating markers only; no provider authentication or credential conversion is established.' };
  } finally { reopened?.close(); storage.close(); }
}

async function credentialProbe(context) {
  const { AuthStorage } = await sourceImport(context, 'packages/ai/src/auth-storage.ts');
  const results = [];
  for (let index = 0; index < credentialCases.length; index++) {
    const entry = credentialCases[index];
    const path = join(context.agentDir, `credential-format-${index}.db`);
    let storage;
    let reopened;
    try {
      storage = await AuthStorage.create(path);
      await storage.credentials.set(entry.provider, entry.value);
      reopened = await AuthStorage.create(path);
      await reopened.credentials.reload();
      const observed = reopened.credentials.get(entry.provider);
      check(observed?.type === entry.format, 'CREDENTIAL_FORMAT_TYPE_MISMATCH');
      check(Object.keys(entry.value).every(key => observed[key] === entry.value[key]), 'CREDENTIAL_FORMAT_ROUNDTRIP_MISMATCH');
      results.push({ provider: entry.provider, format: entry.format, storageStatus: 'passed', authenticationStatus: 'unavailable', migrationStatus: 'unknown' });
    } catch (error) {
      results.push({ provider: entry.provider, format: entry.format, storageStatus: 'failed', authenticationStatus: 'unavailable', migrationStatus: 'unknown', errorCode: safeError(error, 'CREDENTIAL_FORMAT_PROBE_FAILED') });
    } finally { reopened?.close(); storage?.close(); }
  }
  const status = results.some(row => row.storageStatus === 'failed') ? 'failed' : partialStatus(results.flatMap(row => [row.authenticationStatus, row.migrationStatus]));
  return { status, observations: { evidence: evidence.auth, providers: results, limitation: 'Only syntactic storage round trips were exercised. OAuth refresh, scopes, provider validity and host importer feasibility remain unverified.' } };
}

async function modelProbe(context) {
  const [{ AuthStorage }, { ModelRegistry }] = await Promise.all([
    sourceImport(context, 'packages/ai/src/auth-storage.ts'),
    sourceImport(context, 'packages/coding-agent/src/config/model-registry.ts'),
  ]);
  const storage = await AuthStorage.create(':memory:');
  let networkAttempts = 0;
  try {
    const registry = new ModelRegistry(storage, join(context.agentDir, 'capability-models.yml'), { ignoreLocalModelConfig: true, cacheDbPath: join(context.agentDir, 'capability-models.db'), fetch: async () => { networkAttempts++; throw new ProbeError('CAPABILITY_NETWORK_DISABLED'); } });
    await registry.refresh('offline');
    const all = registry.getAll();
    check(all.length > 0, 'MODEL_DISCOVERY_EMPTY');
    const providers = [...new Set(all.map(model => model.provider))].sort();
    const availableBefore = registry.getAvailableForProviders(new Set(['anthropic'])).length;
    await storage.credentials.set('anthropic', credentialCases[0].value);
    const availableAfter = registry.getAvailableForProviders(new Set(['anthropic'])).length;
    check(availableBefore === 0 && availableAfter > 0, 'MODEL_AUTH_DISCOVERY_NOT_OBSERVED');
    check(registry.find('m0-unavailable-provider', 'm0-unavailable-model') === undefined, 'MODEL_MISSING_NOT_EXPLICIT');
    check(networkAttempts === 0, 'MODEL_DISCOVERY_USED_NETWORK');
    return { evidence: evidence.models, discoveredModelCount: all.length, discoveredProviders: providers, authenticatedFixtureProvider: 'anthropic', availableBefore, availableAfter, missingModel: 'undefined lookup, caller must reject', networkAttempts, limitation: 'Catalog availability means auth is configured, not that the marker authenticates. No online discovery or real provider call was performed.' };
  } finally { storage.close(); }
}

async function completionProbe(context, mode) {
  return withCompletionProvider(context, async ({ createMockModel, completeSimple }) => {
    const before = await readdir(context.agentDir);
    let fixture;
    let expected;
    let controller;
    let timer;
    if (mode === 'text') fixture = { content: ['m0 text result'] };
    if (mode === 'structured') { expected = { accepted: true, count: 2 }; fixture = { content: [{ type: 'toolCall', name: 'fixture_result', arguments: expected }] }; }
    if (mode === 'cancel') { fixture = { content: ['must not complete'], delayMs: 1000 }; controller = new AbortController(); }
    if (mode === 'failure') fixture = { throw: 'M0_CONTROLLED_PROVIDER_FAILURE' };
    const model = createMockModel({ provider: 'local', responses: [fixture] });
    const options = controller ? { signal: controller.signal } : {};
    const input = completionContext();
    if (mode === 'structured') {
      input.tools = [{ name: 'fixture_result', description: 'Controlled structured result.', parameters: { type: 'object', properties: { accepted: { type: 'boolean' }, count: { type: 'integer' } }, required: ['accepted', 'count'], additionalProperties: false } }];
      options.toolChoice = { type: 'tool', name: 'fixture_result' };
    }
    try {
      if (controller) timer = setTimeout(() => controller.abort(), 20);
      const result = await bounded(completeSimple(model, input, options), context.timeoutMs, 'COMPLETION_TIMEOUT');
      check(model.calls.length === 1, 'STATELESS_COMPLETION_CALL_COUNT');
      if (mode === 'text') check(result.stopReason === 'stop' && result.content.some(part => part.type === 'text' && part.text === 'm0 text result'), 'TEXT_COMPLETION_MISMATCH');
      if (mode === 'structured') {
        const part = result.content.find(part => part.type === 'toolCall' && part.name === 'fixture_result');
        check(result.stopReason === 'toolUse' && part?.arguments.accepted === true && part.arguments.count === 2 && Object.keys(part.arguments).length === 2, 'STRUCTURED_COMPLETION_MISMATCH');
      }
      if (mode === 'cancel') check(result.stopReason === 'aborted' && result.content.length === 0, 'COMPLETION_ABORT_NOT_OBSERVED');
      if (mode === 'failure') check(result.stopReason === 'error' && result.errorMessage === 'M0_CONTROLLED_PROVIDER_FAILURE', 'PROVIDER_FAILURE_HIDDEN');
      const after = await readdir(context.agentDir);
      check(before.length === after.length && before.every(name => after.includes(name)), 'STATELESS_COMPLETION_WROTE_AGENT_FILES');
      return { evidence: evidence.completion, mode, stopReason: result.stopReason, callCount: model.calls.length, sessionCreated: false, persistedAgentFilesAdded: 0, transport: 'OMP MockModel through completeSimple custom API dispatch', limitation: mode === 'structured' ? 'Typed tool arguments verified with a controlled schema. Real provider schema enforcement and dedicated response-format support were not exercised.' : 'Controlled OMP provider only; no real network/provider behavior is claimed.' };
    } finally { clearTimeout(timer); }
  });
}

async function skillsProbe(context) {
  await sourceImport(context, 'packages/coding-agent/src/discovery/builtin.ts');
  const { loadSkills, buildSkillPromptMessage } = await sourceImport(context, 'packages/coding-agent/src/extensibility/skills.ts');
  const { reset: resetCapabilities } = await sourceImport(context, 'packages/coding-agent/src/capability/index.ts');
  const dirs = await sourceImport(context, 'packages/utils/src/dirs.ts');
  check(dirs.getAgentDir() === context.agentDir, 'SKILLS_AGENT_DIRECTORY_NOT_ISOLATED');
  for (const [root, name] of [[join(context.agentDir, 'skills'), 'm0-global'], [join(context.workspace, '.omp', 'skills'), 'm0-workspace'], [join(context.workspace, '.omp', 'skills'), 'm0-ignored']]) {
    const dir = join(root, name);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: Controlled ${name} fixture.\n---\nM0_SKILL_BODY_${name}\n`);
  }
  resetCapabilities();
  const settings = { cwd: context.workspace, enableClaudeProject: false, enableClaudeUser: false, enableCodexUser: false, enableAgentsUser: false, enableAgentsProject: false };
  const all = await loadSkills(settings);
  check(['m0-global', 'm0-workspace', 'm0-ignored'].every(name => all.skills.some(skill => skill.name === name)), 'SKILLS_DISCOVERY_INCOMPLETE');
  const filtered = await loadSkills({ ...settings, includeSkills: ['m0-*'], ignoredSkills: ['m0-ignored'] });
  check(filtered.skills.length === 2 && !filtered.skills.some(skill => skill.name === 'm0-ignored'), 'SKILLS_FILTER_NOT_APPLIED');
  const selected = filtered.skills.filter(skill => skill.name === 'm0-workspace');
  const created = await createFixtureSession(context, { skills: selected, responses: [{ content: ['literal slash fixture complete'] }, { content: ['expanded skill fixture complete'] }] });
  try {
    check(created.session.skills.length === 1 && created.session.skills[0].name === 'm0-workspace', 'SKILLS_SESSION_INJECTION_FAILED');
    await bounded(created.session.prompt('/skill:m0-workspace fixture arguments'), context.timeoutMs, 'SKILL_PROMPT_TIMEOUT');
    const directSlashExpanded = JSON.stringify(created.model.calls[0].context.messages).includes('M0_SKILL_BODY_m0-workspace');
    const skillInput = await buildSkillPromptMessage(selected[0], { args: 'fixture arguments' });
    await bounded(created.session.prompt(skillInput.message), context.timeoutMs, 'EXPANDED_SKILL_PROMPT_TIMEOUT');
    const serialized = JSON.stringify(created.model.calls[1].context.messages);
    check(serialized.includes('M0_SKILL_BODY_m0-workspace') && !serialized.includes('M0_SKILL_BODY_m0-global'), 'SKILLS_PROMPT_BOUNDARY_FAILED');
    const directSessionSlashExpansion = { status: directSlashExpanded ? 'passed' : 'unsupported', scope: 'Lower-level AgentSession fixture', expanded: directSlashExpanded };
    return { status: partialStatus([directSessionSlashExpansion.status]), observations: { evidence: `${evidence.skills}; packages/coding-agent/src/extensibility/skills.ts:671-714`, discoveredNames: all.skills.map(skill => skill.name), filteredNames: filtered.skills.map(skill => skill.name), injectedName: 'm0-workspace', explicitSkillMessageBodyObserved: true, directSessionSlashExpansion, injectionMechanism: 'OMP buildSkillPromptMessage followed by AgentSession.prompt', excludedBodyAbsent: true, warningsCount: all.warnings.length, globalLocation: 'agent-directory skills', workspaceLocation: '.omp/skills', limitation: 'Native discovery, session skill metadata and explicit body injection verified. Full createAgentSession system-prompt generation and CLI slash handling were not exercised.' } };
  } finally { await created.dispose(); resetCapabilities(); }
}

async function approvalProbe(context) {
  const [sdk, loader, { ExtensionRunner }, { ExtensionToolWrapper }, { initializeExtensions }, { EventBus }] = await Promise.all([
    loadFixtureSDK(context),
    sourceImport(context, 'packages/coding-agent/src/extensibility/extensions/loader.ts'),
    sourceImport(context, 'packages/coding-agent/src/extensibility/extensions/runner.ts'),
    sourceImport(context, 'packages/coding-agent/src/extensibility/extensions/wrapper.ts'),
    sourceImport(context, 'packages/coding-agent/src/modes/runtime-init.ts'),
    sourceImport(context, 'packages/coding-agent/src/utils/event-bus.ts'),
  ]);
  const events = [];
  const runtime = new loader.ExtensionRuntime();
  const extension = await loader.loadExtensionFromFactory(api => {
    api.on('tool_approval_requested', event => { events.push({ type: event.type }); });
    api.on('tool_approval_resolved', event => { events.push({ type: event.type, approved: event.approved }); });
  }, context.workspace, new EventBus(), runtime, 'm0-controlled-approval');
  const created = await createFixtureSession(context, {
    responses: [], settings: { 'tools.approvalMode': 'always-ask' },
    extensionRunnerFactory: ({ manager, modelRegistry, settings }) => new ExtensionRunner([extension], runtime, context.workspace, manager, modelRegistry, undefined, settings),
  });
  const runner = created.session.extensionRunner;
  check(runner, 'APPROVAL_REAL_RUNNER_NOT_BOUND');
  let executions = 0;
  const tool = { name: 'm0_controlled_write', label: 'Controlled write', description: 'Controlled approval fixture.', approval: 'write', parameters: sdk.type({ value: 'string' }), execute: async () => { executions++; return { content: [{ type: 'text', text: 'm0-approved-execution' }] }; } };
  const wrapped = new ExtensionToolWrapper(tool, runner);
  const errorReport = () => { throw new ProbeError('APPROVAL_EXTENSION_RUNTIME_ERROR'); };
  const pending = Promise.withResolvers();
  const presented = Promise.withResolvers();
  const bind = uiContext => initializeExtensions(created.session, { reportSendError: errorReport, reportRuntimeError: errorReport, onShutdown: () => created.session.abort(), uiContext });
  try {
    await bind({ select: (_title, choices) => { presented.resolve(choices); return pending.promise; } });
    const request = wrapped.execute('m0-approval-resolve', { value: 'controlled' });
    const choices = await bounded(Promise.race([presented.promise, request.then(() => { throw new ProbeError('APPROVAL_COMPLETED_WITHOUT_PRESENTATION'); })]), context.timeoutMs, 'APPROVAL_PRESENTATION_TIMEOUT');
    check(choices.includes('Approve') && choices.includes('Deny') && executions === 0, 'APPROVAL_PENDING_EXECUTED_TOOL');
    pending.resolve('Approve');
    await bounded(request, context.timeoutMs, 'APPROVAL_RESOLVE_TIMEOUT');
    check(executions === 1, 'APPROVAL_RESOLVE_DID_NOT_EXECUTE');
    for (const choice of ['Deny', undefined]) {
      await bind({ select: async () => choice });
      let rejected = false;
      try { await wrapped.execute('m0-approval-deny', { value: 'controlled' }); }
      catch (error) { rejected = error.message.startsWith('Tool call denied by user:'); }
      check(rejected && executions === 1, 'APPROVAL_CANCEL_NOT_FAIL_CLOSED');
    }
    await bind(undefined);
    let headlessRejected = false;
    try { await wrapped.execute('m0-approval-headless', { value: 'controlled' }); }
    catch (error) { headlessRejected = error.message.includes('requires approval but no interactive UI'); }
    check(headlessRejected && executions === 1, 'APPROVAL_HEADLESS_NOT_FAIL_CLOSED');
    check(events.filter(event => event.type === 'tool_approval_requested').length === 4 && events.filter(event => event.type === 'tool_approval_resolved').length === 4, 'APPROVAL_EVENTS_INCOMPLETE');
    const restartCleanup = { status: 'unavailable', reason: 'Controlled direct wrapper calls are not an Agent Service pending-request registry; no worker restart projection exists.' };
    return { status: partialStatus([restartCleanup.status]), observations: { evidence: 'packages/coding-agent/src/extensibility/extensions/wrapper.ts:347-420; packages/coding-agent/src/modes/runtime-init.ts:56-213', realExtensionRunner: true, pendingObservedBeforeExecution: true, resolveExecutedOnce: true, denyRejected: true, userCancelRejected: true, headlessFailClosed: true, events, restartCleanup, limitation: 'Real wrapper and runner with controlled UI.select. Do not infer complete built-in approval coverage or cross-worker pending request cleanup.' } };
  } finally { pending.resolve(undefined); await created.dispose(); }
}

async function mcpProbe(context) {
  const [{ MCPManager }, capability] = await Promise.all([
    sourceImport(context, 'packages/coding-agent/src/mcp/manager.ts'),
    sourceImport(context, 'packages/coding-agent/src/capability/index.ts'),
  ]);
  await sourceImport(context, 'packages/coding-agent/src/discovery/builtin.ts');
  const configDir = join(context.workspace, '.omp');
  const stateFile = join(context.sandbox, 'mcp-fixture-state.jsonl');
  const { fileURLToPath } = await import('node:url');
  const serverPath = fileURLToPath(new URL('./mcp-fixture-server.mjs', import.meta.url));
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, 'mcp.json'), JSON.stringify({ mcpServers: { m0_fixture: { type: 'stdio', command: process.execPath, args: [serverPath, stateFile], env: {}, timeout: 3000 } } }));
  capability.reset();
  const manager = new MCPManager(context.workspace);
  const processIds = [];
  const methods = [];
  const observeState = async () => {
    const rows = (await readFile(stateFile, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    const pid = rows[0].pid;
    if (!processIds.includes(pid)) processIds.push(pid);
    return rows.filter(row => row.method).map(row => row.method);
  };
  const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };
  let observations;
  try {
    const loaded = await bounded(manager.discoverAndConnect({ enableProjectConfig: true, startupTimeoutMs: 5000 }), context.timeoutMs, 'MCP_DISCOVERY_TIMEOUT');
    check(loaded.errors.size === 0 && loaded.connectedServers.includes('m0_fixture'), 'MCP_DISCOVERY_RETURNED_FAILURE');
    const tool = manager.getTools().find(tool => tool.name.endsWith('fixture_echo'));
    check(tool, 'MCP_PROJECTED_TOOL_MISSING');
    const initialMethods = await observeState();
    check(initialMethods.includes('initialize') && initialMethods.includes('tools/list'), 'MCP_HANDSHAKE_NOT_OBSERVED');
    const result = await bounded(tool.execute('m0-mcp-call', { value: 'controlled' }, undefined, { cwd: context.workspace }), context.timeoutMs, 'MCP_TOOL_CALL_TIMEOUT');
    check(result.content.some(part => part.type === 'text' && part.text.includes('m0-tool-observed')), 'MCP_TOOL_CALL_RESULT_MISSING');
    await bounded(manager.refreshServerTools('m0_fixture'), context.timeoutMs, 'MCP_REFRESH_TIMEOUT');
    const refreshedMethods = await observeState();
    check(refreshedMethods.filter(method => method === 'tools/list').length > initialMethods.filter(method => method === 'tools/list').length, 'MCP_REFRESH_DID_NOT_LIST_TOOLS');
    methods.push(...refreshedMethods);
    const previousPid = processIds[0];
    const connection = await bounded(manager.reconnectServer('m0_fixture', { manual: true }), context.timeoutMs, 'MCP_RECONNECT_TIMEOUT');
    check(connection, 'MCP_RECONNECT_FAILED');
    methods.push(...await observeState());
    check(processIds.length === 2 && !alive(previousPid), 'MCP_RECONNECT_CHILD_NOT_REPLACED');
    check(manager.getTools().some(tool => tool.name.endsWith('fixture_echo')), 'MCP_RECONNECT_PROJECTION_MISSING');
    observations = { evidence: 'packages/coding-agent/src/mcp/manager.ts:646-672,1430-1458; packages/coding-agent/src/mcp/tool-bridge.ts:707-740', configLocation: '.omp/mcp.json', discoveredFromWorkspaceConfig: true, projectedToolName: tool.name, projectedToolCount: manager.getTools().length, startupErrorCount: loaded.errors.size, toolCallObserved: true, refreshToolsListCalls: refreshedMethods.filter(method => method === 'tools/list').length, reconnectCreatedNewProcess: true, replacedProcessExited: true, dynamicConfigReload: { status: 'unknown', reason: 'Explicit tools refresh and manual reconnect exercised; no file-watcher or changed configuration reload was tested.' }, limitation: 'Local controlled stdio server only. HTTP, SSE, remote OAuth, automatic crash recovery and changed tool schemas were not exercised.' };
  } finally {
    await bounded(manager.disconnectAll(), context.timeoutMs, 'MCP_SHUTDOWN_TIMEOUT');
    capability.reset();
    for (const pid of processIds) check(!alive(pid), 'MCP_CHILD_SURVIVED_SHUTDOWN');
    check(manager.getTools().length === 0, 'MCP_TOOL_PROJECTION_SURVIVED_SHUTDOWN');
  }
  return { status: partialStatus([observations.dynamicConfigReload.status]), observations: { ...observations, shutdown: { disconnected: true, childProcessesExited: processIds.length, toolsCleared: true }, observedProtocolMethods: [...new Set(methods)].sort() } };
}

async function questionProbe(context) {
  const { ensureThemeSync } = await sourceImport(context, 'packages/tui/src/theme/theme.ts');
  ensureThemeSync();
  const [{ AskTool }, { Settings }] = await Promise.all([
    sourceImport(context, 'packages/coding-agent/src/tools/ask.ts'),
    sourceImport(context, 'packages/coding-agent/src/config/settings.ts'),
  ]);
  const tool = new AskTool({ cwd: context.workspace, hasUI: false, canPromptUser: true, settings: Settings.isolated({ 'speech.enabled': false }) });
  const params = { questions: [{ id: 'm0-question', question: 'Controlled choice?', options: [{ label: 'yes' }, { label: 'no' }], recommended: 0 }] };
  let abortCount = 0;
  const abort = () => { abortCount++; };
  const pending = Promise.withResolvers();
  const presented = Promise.withResolvers();
  const request = tool.execute('m0-question-resolve', params, undefined, undefined, { hasUI: true, abort, ui: { askDialog: questions => { presented.resolve(questions); return pending.promise; } } });
  const questions = await bounded(Promise.race([presented.promise, request.then(() => { throw new ProbeError('QUESTION_COMPLETED_WITHOUT_PRESENTATION'); })]), context.timeoutMs, 'QUESTION_PRESENTATION_TIMEOUT');
  check(questions.length === 1 && questions[0].id === 'm0-question', 'QUESTION_REQUEST_NOT_OBSERVED');
  pending.resolve({ kind: 'submit', results: [{ id: 'm0-question', selectedOptions: ['yes'], timedOut: false }] });
  const resolved = await bounded(request, context.timeoutMs, 'QUESTION_RESOLVE_TIMEOUT');
  check(resolved.details.selectedOptions[0] === 'yes' && abortCount === 0, 'QUESTION_RESOLVE_FAILED');
  for (const hasUI of [true, false]) {
    let rejected = false;
    const toolContext = { hasUI, abort };
    if (hasUI) toolContext.ui = { askDialog: async () => undefined };
    try { await tool.execute('m0-question-cancel', params, undefined, undefined, toolContext); }
    catch (error) { rejected = error.name === 'ToolAbortError'; }
    check(rejected, 'QUESTION_CANCELLATION_NOT_REJECTED');
  }
  check(abortCount === 2, 'QUESTION_CANCEL_DID_NOT_ABORT');
  const controller = new AbortController();
  const waiting = Promise.withResolvers();
  const signalRequest = tool.execute('m0-question-signal', params, controller.signal, undefined, { hasUI: true, abort, ui: { askDialog: (_questions, options) => new Promise(resolve => { options.signal.addEventListener('abort', () => resolve(undefined), { once: true }); waiting.resolve(); }) } });
  await bounded(Promise.race([waiting.promise, signalRequest.then(() => { throw new ProbeError('QUESTION_COMPLETED_WITHOUT_PRESENTATION'); })]), context.timeoutMs, 'QUESTION_SIGNAL_PRESENTATION_TIMEOUT');
  controller.abort();
  let signalRejected = false;
  try { await bounded(signalRequest, context.timeoutMs, 'QUESTION_ABORT_TIMEOUT'); }
  catch (error) { signalRejected = error.name === 'ToolAbortError'; }
  check(signalRejected, 'QUESTION_SIGNAL_ABORT_NOT_REJECTED');
  const restartCleanup = { status: 'unavailable', reason: 'Direct AskTool UI seam has no worker restart or durable pending-request registry; Agent Service does not exist.' };
  return { status: partialStatus([restartCleanup.status]), observations: { evidence: 'packages/coding-agent/src/tools/ask.ts:643-654,764-869', requestPresented: true, resolvedAnswerObserved: true, userCancelRejected: true, headlessRejected: true, signalAbortRejected: true, restartCleanup, limitation: 'Real AskTool invoked through a controlled UI context. This does not establish reconnect or process-restart cleanup.' } };
}
async function missingModelProbe(context) {
  const { SessionManager } = await loadFixtureSDK(context);
  const manager = SessionManager.create(context.workspace, join(context.agentDir, 'missing-model-sessions'));
  manager.appendModelChange('m0-unavailable-provider/m0-unavailable-model');
  manager.appendMessage({ role: 'user', content: 'Controlled saved session.', timestamp: 0 });
  await manager.ensureOnDisk();
  await manager.flush();
  const created = await createFixtureSession(context, { persistent: true, responses: [{ content: ['must not be called'] }] });
  const previousSessionId = created.session.sessionId;
  try {
    let rejected = false;
    try { await bounded(created.session.switchSession(manager.getSessionFile()), context.timeoutMs, 'MODEL_RESTORE_TIMEOUT'); }
    catch (error) {
      if (error instanceof ProbeError) throw error;
      rejected = error.message.startsWith('Could not restore model ');
    }
    check(rejected, 'UNAVAILABLE_MODEL_NOT_REJECTED');
    check(created.session.sessionId === previousSessionId && created.model.calls.length === 0, 'UNAVAILABLE_MODEL_MUTATED_SESSION');
    return { evidence: 'packages/coding-agent/src/session/agent-session.ts:11348-11356,11520-11527', restoreRejected: true, activeSessionPreserved: true, providerCalls: 0, fallbackAllowed: false, limitation: 'Controlled saved selector absent from ModelRegistry; no external provider availability was measured.' };
  } finally { await created.dispose(); await manager.flush(); }
}
async function realProviderProbe(context) {
  const api = process.env.OMP_M0_PROVIDER_API ?? 'openai-completions';
  const apiKey = process.env.OMP_M0_PROVIDER_API_KEY;
  const baseUrl = process.env.OMP_M0_PROVIDER_BASE_URL;
  const modelId = process.env.OMP_M0_PROVIDER_MODEL;
  if (!apiKey || !baseUrl || !modelId) throw new ProbeError('REAL_PROVIDER_ENV_UNAVAILABLE', 'unavailable');
  if (api !== 'openai-completions') throw new ProbeError('REAL_PROVIDER_API_UNSUPPORTED', 'unsupported');
  const { complete } = await sourceImport(context, 'packages/ai/src/stream.ts');
  const model = {
    id: modelId,
    name: 'M0 real provider smoke model',
    api,
    provider: 'm0-real-provider',
    baseUrl,
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 32768,
    maxTokens: 128,
  };
  const started = performance.now();
  const result = await bounded(complete(model, completionContext(), { apiKey }), context.timeoutMs, 'REAL_PROVIDER_TIMEOUT');
  if (!['stop', 'length', 'toolUse'].includes(result.stopReason)) throw new ProbeError('REAL_PROVIDER_NO_COMPLETION');
  return {
    api,
    authenticatedRequestCompleted: true,
    stopReason: result.stopReason,
    elapsedMs: Number((performance.now() - started).toFixed(3)),
    usageReported: result.usage !== undefined,
    responseBodyRecorded: false,
    limitation: 'One short text completion only; no provider discovery, tools, cancellation, quota or retry behavior is claimed.',
  };
}

export async function runSuite(context) {
  const probes = [];
  async function record(id, capability, run) {
    try {
      const result = await run();
      probes.push(probeResult(id, capability, result.status ?? 'passed', result.observations ?? result));
    } catch (error) {
      const unavailable = error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND' || error.name === 'ResolveMessage' || /Cannot find (?:package|module)|Could not resolve|Failed to resolve/.test(error.message ?? '');
      probes.push(probeResult(id, capability, error instanceof ProbeError ? error.status : unavailable ? 'unavailable' : 'failed', {}, [{ code: safeError(error, unavailable ? 'OMP_DEPENDENCY_UNAVAILABLE' : 'CAPABILITY_EXECUTION_FAILED') }]));
    }
  }
  await record('capabilities.auth-sqlite', 'AuthStorage and SQLite', () => authProbe(context));
  await record('capabilities.credential-formats', 'Provider credential feasibility', () => credentialProbe(context));
  await record('capabilities.models', 'Model and provider discovery', () => modelProbe(context));
  await record('capabilities.approval', 'Approval resolve cancel restart cleanup', () => approvalProbe(context));
  await record('capabilities.question', 'Question resolve cancel restart cleanup', () => questionProbe(context));
  await record('capabilities.mcp', 'MCP discovery connection tools refresh reconnect shutdown', () => mcpProbe(context));
  await record('capabilities.skills', 'Global workspace skills filtering and injection', () => skillsProbe(context));
  for (const mode of ['text', 'structured', 'cancel', 'failure']) await record(`capabilities.completion-${mode}`, `Stateless completion ${mode}`, () => completionProbe(context, mode));
  await record('capabilities.model-unavailable', 'Unavailable model rejection', () => missingModelProbe(context));
  if (context.realProvider) await record('capabilities.real-provider', 'Real provider completion smoke', () => realProviderProbe(context));

  return probes;
}
