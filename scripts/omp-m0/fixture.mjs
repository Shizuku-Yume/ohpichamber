import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ProbeError } from './envelope.mjs';

export async function loadFixtureSDK(context) {
  try {
    for (const dependency of ['@oh-my-pi/pi-agent-core', '@oh-my-pi/pi-ai', '@oh-my-pi/pi-natives']) Bun.resolveSync(dependency, join(context.sourceDir, 'packages/coding-agent'));
  } catch { throw new ProbeError('SDK_DEPENDENCY_UNAVAILABLE', 'unavailable'); }
  const load = relative => import(pathToFileURL(join(context.sourceDir, relative)).href);
  const [core, mock, session, manager, settings, storage, registry, schema, messages] = await bounded(Promise.all([
    load('packages/agent/src/index.ts'),
    load('packages/ai/src/providers/mock.ts'),
    load('packages/coding-agent/src/session/agent-session.ts'),
    load('packages/coding-agent/src/session/session-manager.ts'),
    load('packages/coding-agent/src/config/settings.ts'),
    load('packages/coding-agent/src/session/auth-storage.ts'),
    load('packages/coding-agent/src/config/model-registry.ts'),
    load('packages/omptype/src/index.ts'),
    load('packages/coding-agent/src/session/messages.ts'),
  ]), Math.min(context.timeoutMs, 10000), 'SDK_IMPORT_TIMEOUT');
  return { Agent: core.Agent, createMockModel: mock.createMockModel, AgentSession: session.AgentSession, SessionManager: manager.SessionManager, Settings: settings.Settings, AuthStorage: storage.AuthStorage, ModelRegistry: registry.ModelRegistry, type: schema.type, convertToLlm: messages.convertToLlm };
}

export async function createFixtureSession(context, { responses, tools = [], manager, persistent = false, settings = {}, skills = [], extensionRunnerFactory, agentId, asyncJobManager, ownedAsyncJobManager }) {
  const sdk = await loadFixtureSDK(context);
  // The registry already treats 'local' as keyless. The transport is exclusively
  // MockModel.stream, so this label never selects a real provider or endpoint.
  const model = sdk.createMockModel({ provider: 'local', responses });
  const authStorage = await sdk.AuthStorage.create(':memory:');
  const modelRegistry = new sdk.ModelRegistry(authStorage, join(context.agentDir, 'fixture-models.yml'), { ignoreLocalModelConfig: true, cacheDbPath: join(context.agentDir, 'fixture-cache.db'), fetch: async () => { throw new ProbeError('FIXTURE_NETWORK_DISABLED'); } });
  const sessionManager = manager ?? (persistent ? sdk.SessionManager.create(context.workspace, join(context.agentDir, 'sessions')) : sdk.SessionManager.inMemory(context.workspace));
  const agent = new sdk.Agent({ initialState: { model, systemPrompt: ['Controlled M0 fixture.'], tools, messages: sessionManager.buildSessionContext().messages }, streamFn: model.stream, convertToLlm: sdk.convertToLlm });
  let session;
  try {
    const isolatedSettings = sdk.Settings.isolated({ 'compaction.enabled': false, 'todo.enabled': false, 'retry.enabled': false, 'secrets.enabled': false, 'advisor.enabled': false, 'autolearn.enabled': false, ...settings });
    const extensionRunner = extensionRunnerFactory?.({ manager: sessionManager, modelRegistry, settings: isolatedSettings });
    session = new sdk.AgentSession({ agent, sessionManager, skills, extensionRunner, settings: isolatedSettings, modelRegistry, toolRegistry: new Map(tools.map(tool => [tool.name, tool])), memoryEnabled: false, autoTitle: false, interactivePrompts: false, sideStreamFn: model.stream, agentId, asyncJobManager, ownedAsyncJobManager });
  } catch (error) { authStorage.close(); throw error; }
  return { session, agent, model, manager: sessionManager, authStorage, modelRegistry, async dispose() { try { await session.dispose(); } finally { authStorage.close(); } } };
}

export function captureEvents(session) {
  const started = performance.now();
  const events = [];
  const unsubscribe = session.subscribe(event => {
    if (!/^[a-z][a-z0-9_]*$/.test(event.type)) throw new ProbeError('UNSAFE_EVENT_TYPE');
    const row = { sequence: events.length + 1, type: event.type, timestamp: new Date().toISOString(), elapsedMs: Number((performance.now() - started).toFixed(3)) };
    if (event.type === 'agent_end') row.isTerminal = event.isTerminal ?? null;
    if (event.type === 'message_update') {
      row.fragmentType = event.assistantMessageEvent.type;
      if (event.assistantMessageEvent.delta !== undefined) row.fragmentCharacters = event.assistantMessageEvent.delta.length;
    }
    if (event.type === 'message_end' && event.message.role === 'assistant') row.stopReason = event.message.stopReason;
    events.push(row);
  });
  return {
    events,
    close: unsubscribe,
    summary() {
      const fragments = events.filter(event => event.fragmentCharacters !== undefined);
      const characters = fragments.reduce((sum, event) => sum + event.fragmentCharacters, 0);
      return { eventCount: events.length, fragmentCount: fragments.length, fragmentCharacters: characters, meanCharactersPerFragment: fragments.length ? characters / fragments.length : null, eventsPerFragment: fragments.length ? events.length / fragments.length : null, elapsedMs: Number((performance.now() - started).toFixed(3)), events };
    },
  };
}

export async function bounded(work, timeoutMs, code = 'PROBE_TIMEOUT') {
  let timer;
  try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new ProbeError(code)), timeoutMs); })]); }
  finally { clearTimeout(timer); }
}
