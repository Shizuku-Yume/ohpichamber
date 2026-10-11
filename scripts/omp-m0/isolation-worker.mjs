import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadFixtureSDK } from './fixture.mjs';
import { connectWorkerChannel } from './worker-channel.mjs';

const send = message => channel.send(message);
let instances = [];
let closed = false;
let eventCount = 0;
let lateEvents = 0;
let config;
let sdk;
let createAgentSession;
let AgentRegistry;
let isProviderEnabled;
const bindingMarker = () => ['a', 'b'].filter(label => !isProviderEnabled(`omp_m0_marker_${label}`)).join(',') || 'none';
let disposeStarted = false;

async function initialize(input) {
  config = input;
  let stage = 'fixture-import';
  try {
    sdk = await loadFixtureSDK(config.context);
    stage = 'sdk-import';
    const runtime = await import(pathToFileURL(join(config.context.sourceDir, 'packages/coding-agent/src/sdk.ts')).href);
    ({ createAgentSession, AgentRegistry } = runtime);
    stage = 'mock-registration';
    const mock = await import(pathToFileURL(join(config.context.sourceDir, 'packages/ai/src/providers/mock.ts')).href);
    mock.registerMockApi();
    stage = 'capability-import';
    ({ isProviderEnabled } = await import(pathToFileURL(join(config.context.sourceDir, 'packages/coding-agent/src/capability/index.ts')).href));
  } catch (error) {
    const codes = ['SDK_DEPENDENCY_UNAVAILABLE', 'SDK_IMPORT_TIMEOUT', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'];
    send({ type: 'error', code: 'SDK_UNAVAILABLE', stage, causeCode: codes.includes(error.code) ? error.code : 'SDK_IMPORT_REJECTED' });
    process.exitCode = 1; channel.close(); return;
  }
  try {
    const labels = config.mode.startsWith('shared-') ? ['a', 'b'] : [config.label];
    for (const label of labels) {
      const workspace = join(config.context.sandbox, `isolation-${label}`, 'workspace');
      const agentDir = join(config.context.sandbox, `isolation-${label}`, 'agent');
      // These are the host-resolved overlays a shared-process embedding would
      // otherwise install before creating a session. No host environment is read.
      process.chdir(workspace);
      process.env.OMP_M0_OVERLAY = label;
      const model = sdk.createMockModel({ provider: 'local', responses: [
        { content: [{ type: 'toolCall', name: 'isolation_observe', arguments: {} }] },
        { content: ['Controlled isolation turn complete.'] },
      ] });
      const authStorage = await sdk.AuthStorage.create(':memory:');
      const registry = new sdk.ModelRegistry(authStorage, join(agentDir, 'models.yml'), {
        ignoreLocalModelConfig: true, cacheDbPath: join(agentDir, 'catalog.db'),
        fetch: async () => { throw new Error('FIXTURE_NETWORK_DISABLED'); },
      });
      const rows = [];
      const tool = {
        name: 'isolation_observe', label: 'Isolation observer',
        description: 'Read controlled cwd and environment markers.', loadMode: 'essential',
        parameters: sdk.type({}),
        async execute(_id, _params, _update, ctx) {
          send({ type: 'active', label });
          if (config.mode.startsWith('shared-')) {
            arrivals++;
            if (arrivals === 2) releaseBarrier();
            await barrier;
          } else await activeBarrier;
          const observed = {
            label,
            sessionMarker: await marker(ctx.sessionManager.getCwd()),
            processMarker: await marker(process.cwd()),
            environmentMarker: knownLabel(process.env.OMP_M0_OVERLAY),
            sessionCwdMatches: ctx.sessionManager.getCwd() === workspace,
            processSettingsBinding: bindingMarker(),
            registryOwnsSession: sessionRegistry.get('Main')?.session === session,
            registryEntryCount: sessionRegistry.list().length,
          };
          rows.push(observed);
          return { content: [{ type: 'text', text: JSON.stringify(observed) }], details: observed };
        },
      };
      const privateRegistry = config.mode !== 'shared-default';
      const sessionRegistry = privateRegistry ? new AgentRegistry() : AgentRegistry.global();
      const options = {
        cwd: workspace, agentDir, model, authStorage, modelRegistry: registry,
        sessionManager: sdk.SessionManager.inMemory(workspace),
        settings: sdk.Settings.isolated({
          'compaction.enabled': false, 'todo.enabled': false, 'retry.enabled': false,
          'secrets.enabled': false, 'memory.backend': 'off',
          'worktree.onStart': 'off', 'worktree.onExit': 'keep', 'worktree.cleanSource': false,
          disabledProviders: [`omp_m0_marker_${label}`],
        }),
        systemPrompt: ['Controlled M0 isolation fixture.'],
        skills: [], rules: [], contextFiles: [], promptTemplates: [], slashCommands: [],
        preloadedCustomToolPaths: [], disableExtensionDiscovery: true,
        enableMCP: false, enableLsp: false, enableIrc: false, skipPythonPreflight: true,
        autoTitle: false, interactivePrompts: false,
        cacheWarming: false, toolNames: [tool.name], restrictToolNames: true,
        allowRestrictedCustomTools: true, customTools: [tool], requireYieldTool: false,
        bindProcessState: config.mode !== 'shared-private-unbound',
      };
      if (privateRegistry) options.agentRegistry = sessionRegistry;
      let session;
      try { ({ session } = await createAgentSession(options)); }
      catch (error) { authStorage.close(); throw error; }
      session.agent.streamFn = model.stream;
      const unsubscribe = session.subscribe(() => {
        eventCount++;
        if (closed) lateEvents++;
      });
      instances.push({ label, session, authStorage, unsubscribe, rows });
    }
    send({ type: 'ready', sessionCount: instances.length });
  } catch (error) {
    const optionNames = ['memory.backend', 'worktree.onStart', 'worktree.onExit', 'worktree.cleanSource', 'disabledProviders', 'theme', 'isolation_observe', 'skills', 'rules', 'toolNames', 'parameters'];
    const diagnostic = {
      errorClass: ['Error', 'TypeError', 'RangeError', 'ValidationError'].includes(error.name) ? error.name : 'SDKError',
      optionNamesMentioned: optionNames.filter(name => String(error.message).includes(name)),
      functionNames: [...String(error.stack).matchAll(/\bat ([A-Za-z_$][A-Za-z0-9_$.]*)\s*\(/g)].slice(0, 5).map(match => match[1]),
    };
    send({ type: 'error', code: 'SESSION_CREATION_FAILED', diagnostic });
    await shutdown();
  }
}

const knownLabel = value => value === 'a' || value === 'b' ? value : 'other';
async function marker(cwd) {
  try { return knownLabel((await readFile(join(cwd, 'isolation-marker.txt'), 'utf8')).trim()); }
  catch { return 'unreadable'; }
}
let arrivals = 0;
let releaseBarrier;
const barrier = new Promise(resolve => { releaseBarrier = resolve; });
let releaseActive;
const activeBarrier = new Promise(resolve => { releaseActive = resolve; });

async function run() {
  try {
    await Promise.all(instances.map(instance => instance.session.prompt('Observe controlled isolation markers.')));
    send({ type: 'result', rows: instances.flatMap(instance => instance.rows), eventCount, concurrentToolsObserved: arrivals });
  } catch { send({ type: 'error', code: 'SESSION_PROMPT_FAILED' }); }
}

async function shutdown() {
  if (disposeStarted) return;
  disposeStarted = true;
  let disposeFailed = false;
  const bindingRestoration = [];
  for (const instance of [...instances].reverse()) {
    try { await instance.session.abort(); await instance.session.dispose(); }
    catch { disposeFailed = true; }
    finally { instance.authStorage.close(); }
    bindingRestoration.push({ disposedLabel: instance.label, processSettingsBinding: bindingMarker() });
  }
  closed = true;
  const eventsAtClose = eventCount;
  await new Promise(resolve => setTimeout(resolve, 100));
  for (const instance of instances) instance.unsubscribe();
  send({ type: 'closed', eventsAtClose, lateEvents, observationWindowMs: 100, disposeFailed, bindingRestoration });
  process.exitCode = disposeFailed ? 1 : 0;
  channel.close();
}

const channel = connectWorkerChannel(message => {
  if (message?.type === 'initialize' && !config) void initialize(message.config);
  else if (message?.type === 'run' && instances.length) void run();
  else if (message?.type === 'release-active') releaseActive();
  else if (message?.type === 'shutdown') void shutdown();
}, () => { process.exitCode = 1; void shutdown(); });
channel.input.on('end', () => { if (!disposeStarted) process.exit(1); });
