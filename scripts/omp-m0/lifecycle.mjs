import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bounded, captureEvents, createFixtureSession, loadFixtureSDK } from './fixture.mjs';
import { ProbeError, probeResult, safeError } from './envelope.mjs';

const delay = ms => new Promise(done => setTimeout(done, ms));
const requireObservation = (value, code, observations = {}) => {
  if (value) return;
  const error = new ProbeError(code);
  error.observations = observations;
  throw error;
};

async function workspaceSnapshot(workspace) {
  const hash = createHash('sha256');
  let fileCount = 0;
  async function visit(relative) {
    const entries = await readdir(join(workspace, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const child = join(relative, entry.name);
      if (entry.isDirectory()) { hash.update(`directory:${child}\0`); await visit(child); }
      else if (entry.isFile()) { hash.update(`file:${child}\0`).update(createHash('sha256').update(await readFile(join(workspace, child))).digest()); fileCount++; }
      else throw new ProbeError('UNEXPECTED_WORKSPACE_ENTRY');
    }
  }
  await visit('');
  return { digest: hash.digest('hex'), fileCount };
}


export async function runSuite(context) {
  const probes = [];
  const timeoutMs = Math.min(context.timeoutMs, 15000);
  const owned = new Set();
  let sdk;
  try { sdk = await loadFixtureSDK(context); }
  catch (error) {
    return ['session', 'events', 'abort', 'dispose', 'history', 'branch', 'fork', 'subagent'].map(id => probeResult(`lifecycle-${id}`, id, 'unavailable', { timeoutMs, exitCode: 1, cleanup: { sessionCreated: false, sessionDisposed: null } }, [safeError(error, 'SDK_DEPENDENCY_UNAVAILABLE')]));
  }

  async function create(options) {
    const fixture = await createFixtureSession(context, options);
    owned.add(fixture);
    return fixture;
  }
  async function dispose(fixture) {
    await bounded(fixture.dispose(), timeoutMs, 'SESSION_DISPOSE_TIMEOUT');
    owned.delete(fixture);
  }
  async function observe(id, capability, work) {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    let result;
    try { result = probeResult(id, capability, 'passed', await bounded(work(), timeoutMs)); }
    catch (error) { result = probeResult(id, capability, error instanceof ProbeError ? error.status : 'failed', error instanceof ProbeError ? error.observations ?? {} : {}, [safeError(error, 'SDK_OPERATION_FAILED')]); }
    Object.assign(result.observations, { startedAt, durationMs: Number((performance.now() - started).toFixed(3)), timeoutMs, exitCode: result.status === 'passed' ? 0 : 1 });
    probes.push(result);
  }

  let fixture;
  let capture;
  let originalFile;
  let originalId;
  const markerFile = join(context.workspace, 'fixture-state.txt');
  try {
    await observe('lifecycle-session', 'SDK session construction', async () => {
      const tool = {
        name: 'fixture_write', label: 'Fixture write', description: 'Writes a controlled disposable workspace marker.', parameters: sdk.type({}),
        async execute() {
          await writeFile(markerFile, 'controlled-workspace-change\n');
          return { content: [{ type: 'text', text: 'Fixture marker written.' }], details: { changed: true } };
        },
      };
      fixture = await create({ persistent: true, tools: [tool], responses: [
        { content: [{ type: 'thinking', thinking: 'Controlled analysis.' }, { type: 'toolCall', name: 'fixture_write', arguments: {} }] },
        { content: ['Controlled ', 'fixture ', 'completion.'] },
      ] });
      capture = captureEvents(fixture.session);
      originalId = fixture.session.sessionId;
      requireObservation(originalId && fixture.session.sessionFile, 'SESSION_IDENTITY_MISSING');
      return { created: true, persistent: true, seam: 'OMP Agent and AgentSession constructors; built-in MockModel.stream; keyless local label', initialMessageCount: fixture.session.messages.length };
    });

    await observe('lifecycle-events', 'prompt, model turn versus terminal request completion, fragment density', async () => {
      requireObservation(fixture, 'SESSION_NOT_CREATED');
      let promptSettled = false;
      const turnBoundaries = [];
      const stopWatching = fixture.session.subscribe(event => { if (event.type === 'turn_end') turnBoundaries.push({ promptSettled, observedSequence: capture.events.length }); });
      try { await fixture.session.prompt('Execute the controlled fixture operation.'); promptSettled = true; await fixture.session.waitForIdle(); }
      finally { stopWatching(); }
      const turns = capture.events.filter(event => event.type === 'turn_end');
      const terminal = capture.events.filter(event => event.type === 'agent_end' && event.isTerminal === true);
      requireObservation(fixture.model.calls.length === 2 && turns.length === 2 && terminal.length >= 1, 'TURN_COMPLETION_NOT_OBSERVED');
      requireObservation(turns[0].sequence < turns[1].sequence && turns[1].sequence < terminal.at(-1).sequence, 'TURN_TERMINAL_ORDER_INVALID');
      requireObservation(capture.events.some(event => event.type === 'tool_execution_end'), 'TOOL_RESULT_NOT_OBSERVED');
      requireObservation(turnBoundaries[0].promptSettled === false, 'FIRST_TURN_ALREADY_SETTLED');
      originalFile = fixture.session.sessionFile;
      return { ...capture.summary(), modelCalls: fixture.model.calls.length, turnEndCount: turns.length, terminalAgentEndCount: terminal.length, turnBoundaries, outerCompletionDistinctFromTurnEnd: true, batchingApplied: false, cursorMapping: 'unverified; observed sequence is probe-local only' };
    });

    await observe('lifecycle-history', 'persisted SDK history reload', async () => {
      requireObservation(originalFile, 'HISTORY_NOT_AVAILABLE');
      await fixture.session.flushToDisk();
      const entriesBefore = fixture.manager.getEntries();
      const reopened = await sdk.SessionManager.open(originalFile, join(context.agentDir, 'sessions'));
      const restored = await create({ manager: reopened, responses: [{ content: ['Restored fixture completion.'] }] });
      try {
        const messages = restored.session.messages;
        requireObservation(messages.some(message => message.role === 'user') && messages.some(message => message.role === 'assistant') && messages.some(message => message.role === 'toolResult'), 'HISTORY_MISSING_ROLES');
        requireObservation(reopened.getSessionId() === originalId && reopened.getEntries().length === entriesBefore.length, 'HISTORY_RELOAD_MISMATCH');
        return { loaded: true, sameSessionIdentity: true, entryCount: entriesBefore.length, messageCount: messages.length, roles: messages.map(message => message.role), source: 'SessionManager.open and buildSessionContext, not a duplicate transcript' };
      } finally { await dispose(restored); }
    });

    await observe('lifecycle-fork', 'SDK fork without workspace rollback', async () => {
      requireObservation(fixture && originalFile, 'FORK_HISTORY_NOT_AVAILABLE');
      const before = await workspaceSnapshot(context.workspace);
      const messageCountBefore = fixture.session.messages.length;
      const oldId = fixture.session.sessionId;
      const accepted = await fixture.session.fork(undefined, { requireIdle: true });
      requireObservation(accepted && oldId !== fixture.session.sessionId, 'FORK_NOT_OBSERVED');
      const after = await workspaceSnapshot(context.workspace);
      requireObservation(before.digest === after.digest && before.fileCount > 0 && messageCountBefore === fixture.session.messages.length, 'FORK_CHANGED_WORKSPACE_OR_HISTORY');
      return { accepted, newSessionIdentity: true, preservedMessageCount: messageCountBefore, workspaceUnchanged: true, workspaceDigestBefore: before.digest, workspaceDigestAfter: after.digest, workspaceFileCount: after.fileCount };
    });

    await observe('lifecycle-branch', 'SDK branch without workspace rollback', async () => {
      requireObservation(fixture, 'BRANCH_SESSION_NOT_AVAILABLE');
      const selected = fixture.manager.getEntries().find(entry => entry.type === 'message' && entry.message.role === 'user');
      requireObservation(selected, 'BRANCH_USER_ENTRY_MISSING');
      const oldId = fixture.session.sessionId;
      const before = await workspaceSnapshot(context.workspace);
      const result = await fixture.session.branch(selected.id);
      const after = await workspaceSnapshot(context.workspace);
      requireObservation(!result.cancelled && oldId !== fixture.session.sessionId && before.digest === after.digest && before.fileCount > 0, 'BRANCH_CHANGED_WORKSPACE_OR_CANCELLED');
      return { accepted: true, newSessionIdentity: true, selectedTextReturned: result.selectedText.length > 0, activeMessageCount: fixture.session.messages.length, workspaceUnchanged: true, workspaceDigestBefore: before.digest, workspaceDigestAfter: after.digest, workspaceFileCount: after.fileCount };
    });

    await observe('lifecycle-abort', 'abort in-flight controlled model', async () => {
      const dispatched = Promise.withResolvers();
      const active = await create({ responses: [() => { dispatched.resolve(); return { content: ['Must not complete normally.'], delayMs: 5000 }; }] });
      const events = captureEvents(active.session);
      try {
        const prompting = active.session.prompt('Start controlled cancellable fixture.');
        await bounded(dispatched.promise, timeoutMs, 'MODEL_NOT_DISPATCHED');
        await active.session.abort();
        await prompting;
        await active.session.waitForIdle();
        requireObservation(active.session.isStreaming === false && events.events.some(event => event.stopReason === 'aborted'), 'ABORT_NOT_OBSERVED');
        return { idleAfterAbort: true, abortedAssistantObserved: true, ...events.summary() };
      } finally { await dispose(active); events.close(); }
    });

    await observe('lifecycle-dispose', 'dispose, cancellation and post-close event observation', async () => {
      const dispatched = Promise.withResolvers();
      const release = Promise.withResolvers();
      const handlerReturned = Promise.withResolvers();
      let lateProviderReturnedAfterClose = false;
      let closed = false;
      const active = await create({ responses: [async () => { dispatched.resolve(); await release.promise; lateProviderReturnedAfterClose = closed; handlerReturned.resolve(); return { content: ['Delayed fixture delivery.'] }; }] });
      const events = captureEvents(active.session);
      let agentEventsAfterClose = 0;
      const unsubscribeAgent = active.agent.subscribe(() => { if (closed) agentEventsAfterClose++; });
      try {
        const prompting = active.session.prompt('Start controlled late-delivery fixture.');
        await bounded(dispatched.promise, timeoutMs, 'MODEL_NOT_DISPATCHED');
        await bounded(active.session.dispose({ drainTimeoutMs: 25 }), timeoutMs, 'ACTIVE_DISPOSE_TIMEOUT');
        closed = true;
        const sessionEventCountAtClose = events.events.length;
        release.resolve();
        await bounded(handlerReturned.promise, timeoutMs, 'LATE_PROVIDER_NOT_RELEASED');
        await prompting;
        await active.agent.waitForIdle();
        await active.session.dispose();
        await delay(100);
        requireObservation(active.session.isDisposed && events.events.length === sessionEventCountAtClose, 'POST_CLOSE_SESSION_EVENTS_OBSERVED');
        requireObservation(lateProviderReturnedAfterClose, 'LATE_PROVIDER_CALLBACK_NOT_EXERCISED');
        return { disposed: true, repeatedDisposeCompleted: true, delayedProviderReturnedAfterDispose: lateProviderReturnedAfterClose, coreSettledAfterClose: true, drainDeadlineMs: 25, quietWindowMs: 100, postCloseSessionEventCount: events.events.length - sessionEventCountAtClose, postCloseAgentEventCount: agentEventsAfterClose, ...events.summary(), limitation: 'bounded fixture late-delivery window, not a guarantee for arbitrary providers' };
      } finally { release.resolve(); unsubscribeAgent(); await dispose(active); events.close(); }
    });

    await observe('lifecycle-subagent', 'native SDK subagent executor', async () => {
      requireObservation(fixture, 'PARENT_SESSION_NOT_AVAILABLE');
      const load = relative => import(pathToFileURL(join(context.sourceDir, relative)).href);
      const [{ runSubprocess }, { EventBus }] = await Promise.all([load('packages/coding-agent/src/task/executor.ts'), load('packages/coding-agent/src/utils/event-bus.ts')]);
      const childModel = sdk.createMockModel({ provider: 'local', id: 'm0-child', responses: [{ content: [{ type: 'toolCall', name: 'yield', arguments: { data: { fixtureCompleted: true } } }] }] });
      // Inject only the controlled model catalog. Session creation, dispatch,
      // auth resolution, yield and event delivery remain actual SDK operations.
      class ChildModelRegistry extends sdk.ModelRegistry {
        find(provider, id) { return provider === childModel.provider && id === childModel.id ? childModel : super.find(provider, id); }
        getProviderModels(provider) { return provider === childModel.provider ? [childModel] : super.getProviderModels(provider); }
        getAvailable() { return [childModel]; }
        getAll() { return [childModel]; }
      }
      const registry = new ChildModelRegistry(fixture.authStorage, join(context.agentDir, 'child-models.yml'), { ignoreLocalModelConfig: true, cacheDbPath: join(context.agentDir, 'child-cache.db'), fetch: async () => { throw new ProbeError('FIXTURE_NETWORK_DISABLED'); } });
      registry.registerProvider('local', { api: 'mock', streamSimple: (_model, modelContext, options) => childModel.stream(childModel, modelContext, options) }, 'm0-child-fixture');
      const bus = new EventBus();
      const rows = [];
      const stop = bus.on('task:subagent:event', payload => {
        const event = payload.event;
        const row = { sequence: rows.length + 1, type: event.type, timestamp: new Date().toISOString() };
        if (event.type === 'agent_end') row.isTerminal = event.isTerminal ?? null;
        rows.push(row);
      });
      try {
        const result = await runSubprocess({
          cwd: context.workspace,
          agent: { name: 'm0-fixture', description: 'Controlled SDK child', systemPrompt: 'Return the controlled structured result with yield.', tools: [], spawns: [], source: 'builtin' },
          task: 'Complete controlled M0 child fixture.',
          description: 'Controlled M0 child',
          index: 0,
          id: 'm0-fixture-child',
          parentAgentId: 'm0-fixture-parent',
          modelOverride: 'local/m0-child',
          modelRegistry: registry,
          authStorage: fixture.authStorage,
          settings: sdk.Settings.isolated({
            'compaction.enabled': false,
            'todo.enabled': false,
            'retry.enabled': false,
            'secrets.enabled': false,
            'advisor.enabled': false,
            'autolearn.enabled': false,
            'includeWorkspaceTree': false,
            'memory.backend': 'off',
            'worktree.onStart': 'off',
            'worktree.onExit': 'keep',
            'worktree.cleanSource': false,
          }),
          enableMCP: false,
          enableLsp: false,
          enableIrc: false,
          restrictToolNames: true,
          keepAlive: false,
          maxRuntimeMs: timeoutMs,
          subagentEventBus: bus,
          contextFiles: [],
          skills: [],
          promptTemplates: [],
          rules: [],
          workspaceTree: { rootPath: context.workspace, rendered: '', truncated: false, totalLines: 0, agentsMdFiles: [] },
          extensionRoots: () => ({ mode: 'explicit-only', explicit: [], configured: [] }),
          preloadedExtensionPaths: [],
          preloadedCustomToolPaths: [],
          sessionFile: null,
          persistArtifacts: false,
        });
        const observations = { childCompleted: result.exitCode === 0, childExitCode: result.exitCode, modelCalls: childModel.calls.length, eventCount: rows.length, events: rows, outputRetained: false, nativeExecutor: 'runSubprocess, SDK sessions not CLI/RPC', keepAlive: false };
        requireObservation(result.exitCode === 0 && childModel.calls.length > 0 && rows.some(event => event.type === 'agent_end'), 'NATIVE_SUBAGENT_FAILED', observations);
        return observations;
      } finally { stop(); registry.unregisterProvider('local'); }
    });
  } finally {
    capture?.close();
    for (const resource of [...owned]) {
      try { await dispose(resource); }
      catch { probes.push(probeResult('lifecycle-cleanup', 'session cleanup', 'failed', { timeoutMs, exitCode: 1, cleanup: { sessionDisposed: false } }, ['SESSION_CLEANUP_FAILED'])); }
    }
  }
  for (const probe of probes) if (!probe.observations.cleanup) probe.observations.cleanup = { sessionDisposed: owned.size === 0 };
  return probes;
}
