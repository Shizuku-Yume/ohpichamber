import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { JsonValueSchema, type ApprovalRequest, type QuestionRequest, type JsonObject, type JsonValue, type PromptRequest } from '@openchamber/agent-contract';
import { cfgEditMode } from '@oh-my-pi/pi-coding-agent/edit/settings';
import { cfgBashPatterns } from '@oh-my-pi/pi-coding-agent/exec/settings';
import type { SubagentLifecyclePayload } from '@oh-my-pi/pi-coding-agent/task';
import { cfgToolsApprovalMode, cfgWebSearchEnabled } from '@oh-my-pi/pi-coding-agent/tools/settings';
import { cfgSearxngEndpoint } from '@oh-my-pi/pi-coding-agent/web/settings';
import { cfgProvidersWebSearchTimeoutSeconds } from '@oh-my-pi/pi-coding-agent/session/settings';
import { cfgGoalContinuationModes } from '@oh-my-pi/pi-coding-agent/goals/settings';
import { resetSettingsForTest } from '@oh-my-pi/pi-coding-agent/config/settings';
import { createAgentSession } from '@oh-my-pi/pi-coding-agent/sdk';
import type { AgentSession } from '@oh-my-pi/pi-coding-agent/session/agent-session';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { InteractionManager } from '../interaction/manager.ts';
import { SessionJournal } from '../projection/journal.ts';
import type { ProjectionInput } from '../projection/protocol.ts';
import type { HostActionRequest } from '../native-policy-protocol.ts';
import { NativeApprovalRequired } from './policy.ts';
import { WorkerSession } from './session.ts';
import { WorkerModeController } from './mode.ts';
import { openNativeRuntime, type NativeWorkerRuntime } from './native-runtime.ts';
import { HOST_TOOL_DESCRIPTIONS } from './host-tool.ts';

beforeEach(resetSettingsForTest);
afterEach(resetSettingsForTest);
const rootSessionId = 'native-root';
const generation = 'native-generation';
const options = { providerId: 'native-fixture', modelId: 'native-model', agentId: null, variant: null, reasoningEffort: null };
const prompt = (text: string): PromptRequest => ({ input: { text, context: [], attachments: [] }, options });
const ProviderRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['system', 'developer', 'user', 'assistant', 'tool']) }).catchall(JsonValueSchema)),
}).catchall(JsonValueSchema);
type ProviderRequest = z.infer<typeof ProviderRequestSchema>;
const ProviderToolsSchema = z.array(z.object({
  function: z.object({ name: z.string(), description: z.string().optional() }).catchall(JsonValueSchema),
}).catchall(JsonValueSchema));
function requestTools(request: ProviderRequest | undefined): Map<string, string | undefined> {
  const parsed = ProviderToolsSchema.safeParse(request?.tools);
  return new Map(parsed.success ? parsed.data.map(tool => [tool.function.name, tool.function.description]) : []);
}
function promptRequest(requests: ProviderRequest[], marker: string): ProviderRequest {
  const match = requests.find(request => JSON.stringify(request.messages.at(-1)?.content).includes(marker));
  if (!match) throw new Error(`Provider request carrying ${marker} was not captured`);
  return match;
}
function requestContaining(requests: ProviderRequest[], marker: string): ProviderRequest {
  const match = requests.find(request => JSON.stringify(request.messages).includes(marker));
  if (!match) throw new Error(`Provider request containing ${marker} was not captured`);
  return match;
}
function instructionMessages(request: ProviderRequest): Array<{ role: string; content: JsonValue }> {
  return request.messages.filter(message => message.role === 'system' || message.role === 'developer')
    .map(message => ({ role: message.role, content: message.content }));
}
const HOST_TOOL_NAMES = ['openchamber', 'web', 'memory', 'notify'] as const;
const HOST_TOOL_INVENTORY_LINE = new RegExp(`^- (?:${HOST_TOOL_NAMES.join('|')})(?:: \`[^\`]+\`)?$`);
/**
 * Callable Host tools necessarily appear in OMP's tool inventory. That listing
 * is the tools' own presentation, the one difference W4 allows alongside pins
 * and attachments; every other system/developer line must match plain OMP.
 */
const TextBlockSchema = z.object({ text: z.string() }).catchall(JsonValueSchema);
function withoutHostToolInventory(messages: Array<{ role: string; content: JsonValue }>) {
  const stripLines = (text: string) => text.split('\n').filter(line => !HOST_TOOL_INVENTORY_LINE.test(line)).join('\n');
  const strip = (content: JsonValue): JsonValue => {
    const text = z.string().safeParse(content);
    if (text.success) return stripLines(text.data);
    if (!Array.isArray(content)) return content;
    return content.map(block => {
      const parsed = TextBlockSchema.safeParse(block);
      return parsed.success ? { ...parsed.data, text: stripLines(parsed.data.text) } : block;
    });
  };
  return messages.map(message => ({ ...message, content: strip(message.content) }));
}

function expectContextOrder(request: ProviderRequest | undefined, markers: string[]): void {
  if (!request) throw new Error('Native provider request was not captured');
  const messages = JSON.stringify(request.messages);
  let previous = -1;
  for (const marker of markers) {
    const index = messages.indexOf(marker);
    expect(index).toBeGreaterThan(previous);
    previous = index;
  }
}

function completion(tool?: { name: string; input: JsonObject; id: string }): Response {
  const chunk = { id: 'native-response', object: 'chat.completion.chunk', created: 1, model: 'native-model', choices: [{ index: 0,
    delta: tool ? { role: 'assistant', tool_calls: [{ index: 0, id: tool.id, type: 'function', function: { name: tool.name, arguments: JSON.stringify(tool.input) } }] }
      : { role: 'assistant', content: 'Native operation finished.' }, finish_reason: null }] };
  const finish = { ...chunk, choices: [{ index: 0, delta: {}, finish_reason: tool ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 } };
  return new Response(`data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(finish)}\n\ndata: [DONE]\n\n`, { headers: { 'content-type': 'text/event-stream' } });
}
function waitForGoal(worker: WorkerSession, predicate: () => boolean): Promise<void> {
  if (predicate()) return Promise.resolve();
  return new Promise<void>(resolve => {
    const unsubscribe = worker.session.subscribe(() => {
      if (!predicate()) return;
      unsubscribe();
      resolve();
    });
  });
}

async function fixture({ respond, invoke, machineCommands = [], onSubagent = () => {}, denyWebSearch = false, planModel = false, reasoningEfforts }: {
  respond: (payload: ProviderRequest, root: string) => Promise<Response> | Response;
  invoke?: (request: HostActionRequest, signal: AbortSignal, root: string) => Promise<JsonValue>;
  machineCommands?: string[];
  onSubagent?: (payload: SubagentLifecyclePayload) => void;
  denyWebSearch?: boolean;
  planModel?: boolean;
  reasoningEfforts?: readonly string[];
}) {
  const root = await mkdtemp(join(tmpdir(), 'native-seams-'));
  const home = process.env.HOME;
  process.env.HOME = root;
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  const mcpConfigPath = join(agentDirectory, 'mcp.json');
  await mkdir(join(cwd, '.omp', 'agents'), { recursive: true });
  await writeFile(join(cwd, '.omp', 'agents', 'child.md'), '---\nname: child\ndescription: Native child proof agent\nblocking: true\n---\nReturn the child proof marker.\n');
  await mkdir(agentDirectory);
  const events: ProjectionInput[] = [];
  const requests: ProviderRequest[] = [];
  const grants: string[] = [];
  const hostRequests: WorkerPolicyRequest[] = [];
  const pendingApprovals: ApprovalRequest[] = [];
  let approvalWaiter: ((approval: ApprovalRequest) => void) | undefined;
  const pendingQuestions: QuestionRequest[] = [];
  let questionWaiter: ((question: QuestionRequest) => void) | undefined;
  let journal: SessionJournal | undefined;
  let worker: WorkerSession | undefined;
  let fatal = false;
  const interactions = new InteractionManager();
  const provider = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
    const payload = ProviderRequestSchema.parse(await request.json());
    requests.push(payload);
    return respond(payload, cwd);
  } });
  const openWorker = (sessionFile?: string) => WorkerSession.open({ type: 'bootstrap', rootSessionId, workerGeneration: generation,
      projectId: 'project', workspaceId: 'workspace', agentDirectoryId: 'source', cwd, agentDirectory, mcpConfigPath, sessionFile, sessionsDirectory: join(root, 'sessions') }, inputs => {
      events.push(...inputs);
      journal?.append(inputs);
    }, interaction => {
      interactions.onRequest(rootSessionId, generation, interaction);
      if (interaction.kind === 'question') {
        const question = interactions.questions(rootSessionId).find(record => record.questionId === interaction.questionId)!;
        if (questionWaiter) { const waiter = questionWaiter; questionWaiter = undefined; waiter(question); }
        else pendingQuestions.push(question);
        return;
      }
      const approval = interactions.approvals(rootSessionId).find(record => record.approvalId === interaction.approvalId)!;
      if (approvalWaiter) { const waiter = approvalWaiter; approvalWaiter = undefined; waiter(approval); }
      else pendingApprovals.push(approval);
    }, () => { fatal = true; }, async request => {
      hostRequests.push(request);
      if (request.type === 'web-search') {
        if (denyWebSearch) throw new Error('Host policy refused the tool operation');
        return;
      }
      if (request.type === 'tool' && request.toolName === 'web_search') throw new Error('Host policy refused the tool operation');
      if (request.type === 'tool' && ['openchamber', 'web', 'memory', 'notify'].includes(request.toolName)) throw new Error('Host tools must use their domain capability owner, not generic tool grants');
      if (request.type !== 'tool' || request.toolName !== 'bash') return;
      const command = z.string().parse(request.input.command);
      if (machineCommands.includes(command)) return;
      const grant = request.approvalId && request.toolCallId
        ? interactions.consumeApprovalGrant(rootSessionId, generation, request.approvalId, request.toolCallId, request.toolName, request.input) : undefined;
      if (!grant) throw new NativeApprovalRequired();
      grants.push(grant.approvalId);
    }, async (request, signal) => {
      if (!invoke) throw new Error('Host action was not part of this scenario');
      return invoke(request, signal, cwd);
    }, () => {}, onSubagent);
  try {
    worker = await openWorker();
    journal = new SessionJournal({ sessionId: rootSessionId, rootSessionId, projectId: 'project', workspaceId: 'workspace', displayPath: '.' }, worker.seed());
    interactions.openSession(rootSessionId, journal.runtime().epoch, generation, 'workspace', async operation => { await worker!.operation(operation); }, input => { events.push(input); journal!.append([input]); });
    await worker.operation({ type: 'catalog', revision: '1', operation: { type: 'catalog.provider.configure', request: { expectedRevision: '0', configuration: {
      providerId: 'native-fixture', name: 'Native fixture', endpoint: `http://127.0.0.1:${provider.port}/v1`, protocol: 'chat-completions', credentialRef: null,
    } } } });
    await worker.operation({ type: 'catalog', revision: '2', operation: { type: 'catalog.model.configure', request: { expectedRevision: '1', model: {
      modelId: 'native-model', provider: 'native-fixture', name: 'Native model', modalities: ['text'], contextWindow: 65536, maxOutputTokens: 128,
      reasoningEffortSupported: (reasoningEfforts?.length ?? 0) > 0,
      reasoningOptions: (reasoningEfforts ?? []).map(reasoningEffort => ({ reasoningEffort, label: reasoningEffort, budgetTokens: null })),
      variants: [], toolsSupported: true, enabled: true, pricing: null,
    } } } });
    if (planModel) {
      await worker.operation({ type: 'catalog', revision: '3', operation: { type: 'catalog.model.configure', request: { expectedRevision: '2', model: {
        modelId: 'native-plan-model', provider: 'native-fixture', name: 'Native plan model', modalities: ['text'], contextWindow: 65536, maxOutputTokens: 128,
        reasoningEffortSupported: false, reasoningOptions: [], variants: [], toolsSupported: true, enabled: true, pricing: null,
      } } } });
      worker.session.settings.setModelRole('plan', 'native-fixture/native-plan-model');
      await worker.session.settings.flush();
    }
    const initialModel = worker.session.modelRegistry.find('native-fixture', 'native-model');
    if (!initialModel) throw new Error('Fixture main model is unavailable');
    await worker.session.setModelTemporary(initialModel);
    return { root: cwd, agentDirectory, get worker() { return worker!; }, events, requests, grants, hostRequests, interactions, journal, mcpConfigPath,
      reopen: async () => {
        const sessionFile = worker!.session.sessionManager.getSessionFile();
        if (!sessionFile) throw new Error('Fixture session file is missing');
        interactions.closeSession(rootSessionId);
        await worker!.close();
        resetSettingsForTest();
        worker = await openWorker(sessionFile);
        journal!.replace(worker.seed());
        interactions.openSession(rootSessionId, journal!.runtime().epoch, generation, 'workspace', async operation => { await worker!.operation(operation); }, input => { events.push(input); journal!.append([input]); });
      },
      waitQuestion: () => {
        const question = pendingQuestions.shift();
        if (question) return Promise.resolve(question);
        const pending = Promise.withResolvers<QuestionRequest>();
        questionWaiter = pending.resolve;
        return pending.promise;
      },
      waitApproval: () => {
        const approval = pendingApprovals.shift();
        if (approval) return Promise.resolve(approval);
        const pending = Promise.withResolvers<ApprovalRequest>();
        approvalWaiter = pending.resolve;
        return pending.promise;
      },
      fatal: () => fatal,
      close: async () => {
        interactions.closeSession(rootSessionId);
        journal?.close();
        await worker!.close();
        provider.stop(true);
        if (home === undefined) delete process.env.HOME; else process.env.HOME = home;
        resetSettingsForTest();
        await rm(root, { recursive: true, force: true });
      },
    };
  } catch (error) {
    interactions.closeSession(rootSessionId);
    await worker?.close();
    journal?.close();
    provider.stop(true);
    if (home === undefined) delete process.env.HOME; else process.env.HOME = home;
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

async function searxngLoopback(): Promise<{ url: string; requests: string[]; stop: () => void }> {
  const requests: string[] = [];
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/search') return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
    requests.push(url.searchParams.get('q') ?? '');
    return Response.json({ query: url.searchParams.get('q') ?? '', results: [{
      title: 'Task63 Loopback Result', url: 'http://127.0.0.1/task63', content: 'Controlled Task63 loopback result.', engine: 'task63-loopback',
    }] });
  } });
  return { url: `http://127.0.0.1:${server.port}`, requests, stop: () => server.stop(true) };
}

test('worker-originated custom prompts open canonical runs with origin', async () => {
  const harness = await fixture({ respond: () => completion() });
  try {
    const model = harness.worker.session.modelRegistry.find('native-fixture', 'native-model');
    if (!model) throw new Error('Native fixture model is required');
    await harness.worker.session.setModelTemporary(model);
    const task = harness.worker.startWorkerRun('goal', () => harness.worker.session.promptCustomMessage({
      customType: 'goal-continuation', content: 'Continue the goal.', display: false,
    }));
    const started = harness.events.find(input => input.event.type === 'run.started');
    if (!started || started.event.type !== 'run.started') throw new Error('Worker run was not opened');
    expect(started.event.origin).toBe('goal');
    expect(harness.journal.snapshot().activeRun).toMatchObject({ runId: started.event.runId, origin: 'goal', status: 'running' });
    expect(harness.events.some(input => input.event.type === 'turn.started')).toBe(true);
    await task;
    expect(harness.events).toContainEqual(expect.objectContaining({ event: expect.objectContaining({ type: 'run.completed', runId: started.event.runId }) }));
    expect(harness.journal.snapshot().activeRun).toBeNull();
  } finally { await harness.close(); }
}, 30000);
test('worker-originated runs cancel through the normal abort operation', async () => {
  const requestStarted = Promise.withResolvers<void>();
  const harness = await fixture({ respond: async () => {
    requestStarted.resolve();
    return new Response(new ReadableStream({}), { headers: { 'content-type': 'text/event-stream' } });
  } });
  try {
    const model = harness.worker.session.modelRegistry.find('native-fixture', 'native-model');
    if (!model) throw new Error('Native fixture model is required');
    await harness.worker.session.setModelTemporary(model);
    const task = harness.worker.startWorkerRun('plan', () => harness.worker.session.promptCustomMessage({
      customType: 'plan-mode-approved', content: 'Execute the approved plan.', display: false,
    }));
    const started = harness.events.find(input => input.event.type === 'run.started');
    if (!started || started.event.type !== 'run.started') throw new Error('Worker run was not opened');
    await requestStarted.promise;
    const aborted = await harness.worker.operation({ type: 'abort', runId: started.event.runId });
    expect(aborted).toMatchObject({ type: 'abort', run: { runId: started.event.runId, origin: 'plan', status: 'cancelled' } });
    await task;
    expect(harness.events).toContainEqual(expect.objectContaining({ event: expect.objectContaining({ type: 'run.cancelled', runId: started.event.runId }) }));
  } finally { await harness.close(); }
}, 30000);

test('aborting a goal pauses continuation until resume', async () => {
  let requestStarted = Promise.withResolvers<void>();
  const harness = await fixture({ respond: async () => {
    requestStarted.resolve();
    return new Response(new ReadableStream({}), { headers: { 'content-type': 'text/event-stream' } });
  } });
  try {
    await harness.worker.operation({ type: 'goal', op: 'create', objective: 'Abort and resume' });
    await requestStarted.promise;
    const started = harness.events.findLast(input => input.event.type === 'run.started' && input.event.origin === 'goal');
    if (!started || started.event.type !== 'run.started') throw new Error('Goal run did not start');
    await harness.worker.operation({ type: 'abort', runId: started.event.runId });
    const requestCount = harness.requests.length;
    expect(harness.journal.runtime().mode).toMatchObject({ kind: 'goal', status: 'paused' });
    await Promise.resolve();
    expect(harness.requests).toHaveLength(requestCount);
    requestStarted = Promise.withResolvers<void>();
    await harness.worker.operation({ type: 'goal', op: 'resume' });
    await requestStarted.promise;
  } finally { await harness.close(); }
}, 30000);

test('RPC goal continues three turns and retains completed mode', async () => {
  let calls = 0;
  const harness = await fixture({ respond: payload => {
    if (payload.messages.at(-1)?.role === 'tool') return completion();
    calls++;
    return calls < 3 ? completion({ name: 'read', id: `progress-${calls}`, input: { path: `missing-progress-${calls}.txt` } }) : completion({ name: 'goal', id: `goal-${calls}`, input: { op: 'complete' } });
  } });
  try {
    await harness.worker.operation({ type: 'goal', op: 'create', objective: 'Finish the native proof' });
    await waitForGoal(harness.worker, () => harness.requests.length >= 3 && harness.worker.mode().kind === 'goal' && harness.worker.mode().status === 'complete');
    expect(harness.events.filter(input => input.event.type === 'run.started' && input.event.origin === 'goal')).toHaveLength(3);
    expect(harness.journal.runtime().mode).toMatchObject({ kind: 'goal', status: 'complete', objective: 'Finish the native proof' });
  } finally { await harness.close(); }
}, 30000);

test('RPC goal continuation setting gates automatic turns', async () => {
  const harness = await fixture({ respond: () => completion() });
  try {
    cfgGoalContinuationModes.override(harness.worker.session.settings, ['interactive']);
    await harness.worker.operation({ type: 'goal', op: 'create', objective: 'Do not continue without rpc' });
    await Promise.resolve();
    expect(harness.requests).toHaveLength(0);
    expect(harness.journal.runtime().mode).toMatchObject({ kind: 'goal', status: 'active' });
  } finally { await harness.close(); }
}, 30000);

test('goal pause and resume preserve objective, while drop returns main', async () => {
  const harness = await fixture({ respond: () => completion() });
  try {
    cfgGoalContinuationModes.override(harness.worker.session.settings, ['interactive']);
    await harness.worker.operation({ type: 'goal', op: 'create', objective: 'Pause this goal', tokenBudget: 20 });
    await harness.worker.operation({ type: 'goal', op: 'pause' });
    expect(harness.journal.runtime().mode).toMatchObject({ kind: 'goal', status: 'paused', objective: 'Pause this goal' });
    await harness.worker.operation({ type: 'goal', op: 'resume' });
    expect(harness.journal.runtime().mode).toMatchObject({ kind: 'goal', status: 'active', objective: 'Pause this goal' });
    await harness.worker.operation({ type: 'goal', op: 'drop' });
    expect(harness.journal.runtime().mode).toEqual({ kind: 'main' });
  } finally { await harness.close(); }
}, 30000);

test('goal rejects empty objective and a tiny budget limits the first turn', async () => {
  const harness = await fixture({ respond: () => completion() });
  try {
    await expect(harness.worker.operation({ type: 'goal', op: 'create', objective: '   ' })).rejects.toBeTruthy();
    await harness.worker.operation({ type: 'goal', op: 'create', objective: 'Tiny goal', tokenBudget: 1 });
    await waitForGoal(harness.worker, () => harness.worker.mode().kind === 'goal' && harness.worker.mode().status === 'budget-limited');
    expect(harness.journal.runtime().mode).toMatchObject({ kind: 'goal', status: 'budget-limited', objective: 'Tiny goal' });
  } finally { await harness.close(); }
}, 30000);

test('reopening during a goal run restores a paused goal without new work', async () => {
  const requested = Promise.withResolvers<void>();
  const harness = await fixture({ respond: () => {
    requested.resolve();
    return new Response(new ReadableStream({}), { headers: { 'content-type': 'text/event-stream' } });
  } });
  try {
    await harness.worker.operation({ type: 'goal', op: 'create', objective: 'Persist interrupted goal' });
    await requested.promise;
    await harness.reopen();
    expect(harness.worker.mode()).toMatchObject({ kind: 'goal', status: 'paused', objective: 'Persist interrupted goal' });
    expect(harness.journal.runtime().activeRunId).toBeNull();
    expect(harness.worker.continuationPending).toBe(false);
    expect(harness.requests).toHaveLength(1);
  } finally { await harness.close(); }
}, 30000);

for (const op of ['pause', 'drop'] as const) {
  test(`goal ${op} during a progress-making run stops its next continuation`, async () => {
    const requested = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const harness = await fixture({ respond: async payload => {
      requested.resolve();
      await release.promise;
      return payload.messages.at(-1)?.role === 'tool' ? completion() : completion({ name: 'read', id: 'progress-before-stop', input: { path: 'missing.txt' } });
    } });
    try {
      await harness.worker.operation({ type: 'goal', op: 'create', objective: 'Stop after this turn' });
      await requested.promise;
      await harness.worker.operation({ type: 'goal', op });
      release.resolve();
      await waitForGoal(harness.worker, () => harness.journal.runtime().activeRunId === null);
      await harness.worker.session.waitForIdle();
      expect(harness.worker.continuationPending).toBe(false);
      expect(harness.events.filter(input => input.event.type === 'run.started')).toHaveLength(1);
      expect(harness.worker.mode()).toMatchObject(op === 'drop' ? { kind: 'main' } : { kind: 'goal', status: 'paused' });
    } finally { release.resolve(); await harness.close(); }
  }, 30000);
}

test('native builtin command returns context output without starting a provider run', async () => {
  const harness = await fixture({ respond: () => completion() });
  try {
    const result = await harness.worker.operation({ type: 'command', text: '/context' });
    expect(result.type).toBe('command');
    if (result.type !== 'command') throw new Error('Expected command output');
    expect(result.output).toContain('Context');
    expect(result.output.length).toBeGreaterThan(0);
    await expect(harness.worker.operation({ type: 'command', text: '/ssh' })).rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
    expect(harness.requests).toHaveLength(0);
    expect(harness.events.filter(input => input.event.type === 'run.started')).toHaveLength(0);
    expect(harness.journal.runtime().activeRunId).toBeNull();
    expect(harness.fatal()).toBe(false);
  } finally { await harness.close(); }
}, 30000);


test('native web_search tool routes to Host web-search authorization and performs one loopback search', async () => {
  const search = await searxngLoopback();
  const harness = await fixture({ respond(payload) {
    return payload.messages.at(-1)?.role === 'tool' ? completion() : completion({ name: 'web_search', id: 'web-search-call', input: { query: 'task63 loopback', num_results: 3 } });
  } });
  const terminal = Promise.withResolvers<void>();
  const unsubscribe = harness.worker.session.subscribe(event => { if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve(); });
  try {
    cfgWebSearchEnabled.override(harness.worker.session.settings, true);
    cfgSearxngEndpoint.override(harness.worker.session.settings, search.url);
    cfgProvidersWebSearchTimeoutSeconds.override(harness.worker.session.settings, 3);
    harness.worker.session.settings.setModelRole('web', 'web/searxng');
    await harness.worker.operation({ type: 'prompt', runId: 'web-search-run', request: prompt('Search the loopback endpoint with the native web_search tool.') });
    await terminal.promise;
    expect(harness.hostRequests.some(request => request.type === 'tool' && request.toolName === 'web_search')).toBe(false);
    expect(harness.hostRequests).toContainEqual({ type: 'web-search' });
    expect(search.requests).toEqual(['task63 loopback']);
    const outcome = harness.events.map(input => input.event).find(event => event.type === 'tool.completed' && event.toolCallId === 'web-search-call');
    expect(outcome).toMatchObject({ status: 'completed', isError: false,
      output: { content: expect.arrayContaining([{ type: 'text', text: expect.stringContaining('Task63 Loopback Result') }]) } });
    expect(harness.fatal()).toBe(false);
  } finally { unsubscribe(); search.stop(); await harness.close(); }
}, 30000);

test('enterprise Host refusal of web-search blocks the native tool before any loopback egress', async () => {
  const search = await searxngLoopback();
  const harness = await fixture({ denyWebSearch: true, respond(payload) {
    return payload.messages.at(-1)?.role === 'tool' ? completion() : completion({ name: 'web_search', id: 'web-search-denied', input: { query: 'task63 denied' } });
  } });
  const terminal = Promise.withResolvers<void>();
  const unsubscribe = harness.worker.session.subscribe(event => { if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve(); });
  try {
    cfgWebSearchEnabled.override(harness.worker.session.settings, true);
    cfgSearxngEndpoint.override(harness.worker.session.settings, search.url);
    cfgProvidersWebSearchTimeoutSeconds.override(harness.worker.session.settings, 3);
    harness.worker.session.settings.setModelRole('web', 'web/searxng');
    await harness.worker.operation({ type: 'prompt', runId: 'web-search-denied-run', request: prompt('Try the native web_search tool.') });
    await terminal.promise;
    expect(harness.hostRequests.some(request => request.type === 'tool' && request.toolName === 'web_search')).toBe(false);
    expect(harness.hostRequests).toContainEqual({ type: 'web-search' });
    expect(search.requests).toEqual([]);
    const outcome = harness.events.map(input => input.event).find(event => event.type === 'tool.completed' && event.toolCallId === 'web-search-denied');
    expect(outcome).toMatchObject({ status: 'failed', isError: true });
    expect(harness.fatal()).toBe(false);
  } finally { unsubscribe(); search.stop(); await harness.close(); }
}, 30000);

for (const approvalMode of ['always-ask', 'yolo'] as const) {
  for (const decision of ['approve', 'reject'] as const) {
    test(`actual SDK Bash ${approvalMode} waits for source-bound ${decision} before execution`, async () => {
      let toolCalls = 0;
      const harness = await fixture({ respond(payload, root) {
        const messages = payload.messages;
        if (messages.at(-1)?.role === 'tool') return completion();
        return completion({ name: 'bash', id: `native-bash-${++toolCalls}`, input: { command: `printf GRANTED >> '${join(root, 'proof.txt')}'` } });
      } });
      const terminal = Promise.withResolvers<void>();
      const unsubscribe = harness.worker.session.subscribe(event => { if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve(); });
      try {
        cfgToolsApprovalMode.override(harness.worker.session.settings, approvalMode);
        await harness.worker.operation({ type: 'prompt', runId: 'bash-run', request: prompt('Run the native bash tool exactly once.') });
        const approval = await harness.waitApproval();
        expect(approval).toMatchObject({ status: 'pending', toolName: 'bash', actionType: 'bash_command', workerGeneration: generation });
        await expect(readFile(join(harness.root, 'proof.txt'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
        await harness.interactions.resolveApproval(rootSessionId, approval.approvalId, { decision, version: approval.version, epoch: approval.epoch, workerGeneration: approval.workerGeneration });
        await terminal.promise;
        if (decision === 'approve') {
          expect(await readFile(join(harness.root, 'proof.txt'), 'utf8')).toBe('GRANTED');
          expect(harness.grants).toEqual([approval.approvalId]);
        } else {
          await expect(readFile(join(harness.root, 'proof.txt'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
          expect(harness.grants).toEqual([]);
        }
        expect(harness.interactions.consumeApprovalGrant(rootSessionId, generation, approval.approvalId, approval.toolCallId, 'bash', { command: `printf GRANTED >> '${join(harness.root, 'proof.txt')}'` })).toBeUndefined();
        expect(harness.fatal()).toBe(false);
      } finally { unsubscribe(); await harness.close(); }
    }, 30000);
  }
}

for (const decision of ['allow', 'deny'] as const) {
  test(`actual native Bash pattern ${decision} remains authoritative without an extra Host approval`, async () => {
    const command = 'printf PATTERN';
    const harness = await fixture({ machineCommands: [command], respond(payload) {
      const messages = payload.messages;
      return messages.at(-1)?.role === 'tool' ? completion() : completion({ name: 'bash', id: 'pattern-call', input: { command } });
    } });
    const terminal = Promise.withResolvers<void>();
    const unsubscribe = harness.worker.session.subscribe(event => { if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve(); });
    try {
      cfgToolsApprovalMode.override(harness.worker.session.settings, 'always-ask');
      cfgBashPatterns.override(harness.worker.session.settings, [{ match: command, approval: decision }]);
      await harness.worker.operation({ type: 'prompt', runId: 'pattern-run', request: prompt('Use the configured native bash pattern.') });
      await terminal.promise;
      const outcomes = harness.events.map(input => input.event).filter(event => event.type === 'tool.completed' && event.toolCallId === 'pattern-call');
      expect(outcomes).toHaveLength(1);
      const outcome = outcomes[0];
      if (!outcome || outcome.type !== 'tool.completed') throw new Error('Native pattern tool outcome was not projected');
      if (decision === 'allow') {
        expect(outcome).toMatchObject({ status: 'completed', isError: false,
          output: { content: expect.arrayContaining([{ type: 'text', text: expect.stringContaining('PATTERN') }]) },
        });
      } else {
        expect(outcome).toMatchObject({ status: 'failed', isError: true,
          output: { content: expect.arrayContaining([{ type: 'text', text: expect.stringContaining('blocked by tool policy') }]) },
        });
        expect(outcome.output).not.toMatchObject({ content: expect.arrayContaining([{ type: 'text', text: 'PATTERN' }]) });
      }
      expect(harness.events.filter(input => input.event.type === 'approval.requested')).toHaveLength(0);
      expect(harness.grants).toEqual([]);
      expect(harness.fatal()).toBe(false);
    } finally { unsubscribe(); await harness.close(); }
  }, 30000);
}

test('actual SDK Host tool executes with Host-supplied first-use MCP storage and returns its real file result', async () => {
  let invoked: HostActionRequest | undefined;
  const harness = await fixture({ respond(payload) {
    const messages = payload.messages;
    return messages.at(-1)?.role === 'tool' ? completion() : completion({ name: 'memory', id: 'host-memory', input: { action: 'memory.save', input: { key: 'proof', content: 'HOST_MEMORY_WRITTEN' } } });
  }, async invoke(request, signal, root) {
    signal.throwIfAborted();
    invoked = request;
    await writeFile(join(root, 'memory.txt'), String(request.input.content));
    const stored = await readFile(join(root, 'memory.txt'), 'utf8');
    return { stored, bytes: Buffer.byteLength(stored) };
  } });
  const terminal = Promise.withResolvers<void>();
  const unsubscribe = harness.worker.session.subscribe(event => { if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve(); });
  try {
    await expect(readFile(harness.mcpConfigPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    cfgToolsApprovalMode.override(harness.worker.session.settings, 'yolo');
    expect(harness.worker.session.getAllToolInfos().map(tool => tool.name)).toEqual(expect.arrayContaining(['openchamber', 'web', 'memory', 'notify']));
    await harness.worker.operation({ type: 'prompt', runId: 'host-run', request: prompt('Store the marker with the memory tool.') });
    await terminal.promise;
    expect(invoked).toEqual({ sessionId: rootSessionId, toolName: 'memory', action: 'memory.save', input: { key: 'proof', content: 'HOST_MEMORY_WRITTEN' } });
    expect(await readFile(join(harness.root, 'memory.txt'), 'utf8')).toBe('HOST_MEMORY_WRITTEN');
    expect(JSON.stringify(harness.requests)).toContain('HOST_MEMORY_WRITTEN');
    expect(harness.events.some(input => input.event.type === 'tool.completed' && input.event.toolCallId === 'host-memory' && input.event.status === 'completed')).toBe(true);
    expect(harness.fatal()).toBe(false);
  } finally { unsubscribe(); await harness.close(); }
}, 30000);

test('worker sends plain OMP system and developer context plus only the user pin', async () => {
  const marker = 'PARITY_PROMPT_MARKER';
  const harness = await fixture({ respond: () => completion() });
  let plain: AgentSession | undefined;
  let plainAuth: NativeWorkerRuntime['authStorage'] | undefined;
  let unsubscribePlain: (() => void) | undefined;
  try {
    const workerTerminal = Promise.withResolvers<void>();
    const unsubscribeWorker = harness.worker.session.subscribe(event => {
      if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) workerTerminal.resolve();
    });
    await harness.worker.operation({ type: 'prompt', runId: 'parity-run', request: {
      ...prompt(marker), input: { text: marker, attachments: [], context: [{ kind: 'context', text: 'USER_PIN_MARKER', metadata: {} }] },
    } });
    await workerTerminal.promise;
    unsubscribeWorker();
    const workerRequest = promptRequest(harness.requests, marker);

    const runtime = await openNativeRuntime({ cwd: harness.root, agentDirectory: harness.agentDirectory });
    plainAuth = runtime.authStorage;
    const plainDirectory = join(harness.root, 'plain-sessions');
    await mkdir(plainDirectory, { recursive: true });
    const plainManager = SessionManager.create(harness.root, plainDirectory);
    const created = await createAgentSession({
      cwd: harness.root, agentDir: harness.agentDirectory, sessionManager: plainManager, authStorage: runtime.authStorage,
      modelRegistry: runtime.modelRegistry, settings: runtime.settings, initialModelRefreshStrategy: 'offline',
      enableMCP: false, enableLsp: false, disableExtensionDiscovery: true, hasUI: true, interactivePrompts: true,
    });
    plain = created.session;
    const model = runtime.modelRegistry.find('native-fixture', 'native-model');
    if (!model) throw new Error('Plain OMP model is unavailable');
    await plain.setModelTemporary(model);
    const plainTerminal = Promise.withResolvers<void>();
    unsubscribePlain = plain.subscribe(event => {
      if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) plainTerminal.resolve();
    });
    const observed = harness.requests.length;
    await plain.prompt(marker, { throwOnDrop: true, images: [], runCommands: false, expandPromptTemplates: false });
    await plainTerminal.promise;
    const plainRequest = promptRequest(harness.requests.slice(observed), marker);

    const workerInstructions = instructionMessages(workerRequest);
    const plainInstructions = instructionMessages(plainRequest);
    expect(withoutHostToolInventory(workerInstructions)).toEqual(plainInstructions);
    for (const toolName of HOST_TOOL_NAMES) expect(JSON.stringify(workerInstructions)).toContain(`- ${toolName}: \`${toolName}\``);
    expect(JSON.stringify(plainInstructions)).not.toContain('openchamber');
    expect(JSON.stringify(workerRequest.messages)).toContain('USER_PIN_MARKER');
    expect(JSON.stringify(instructionMessages(workerRequest))).not.toContain('USER_PIN_MARKER');
    expect(JSON.stringify(workerRequest)).not.toContain('ohpichamber.context');
    const workerTools = requestTools(workerRequest);
    for (const toolName of HOST_TOOL_NAMES) expect(workerTools.get(toolName)).toBe(HOST_TOOL_DESCRIPTIONS[toolName]);
    expect([...workerTools.keys()].some(name => name.includes('://'))).toBe(false);
    expect(harness.fatal()).toBe(false);
  } finally {
    unsubscribePlain?.();
    await plain?.dispose();
    plainAuth?.close();
    await harness.close();
  }
}, 30000);

test('actual SDK steer/follow-up admission retains queued identity, captured context and attachment metadata', async () => {
  const firstRequest = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let requestCount = 0;
  const harness = await fixture({ async respond() {
    if (++requestCount === 1) { firstRequest.resolve(); await release.promise; }
    return completion();
  } });
  const followedUp = Promise.withResolvers<void>();
  const finished = Promise.withResolvers<void>();
  let followUpId: string | undefined;
  let seen = false;
  const unsubscribe = harness.worker.session.subscribe(event => {
    if (event.type === 'message_start' && event.message.role === 'user' && JSON.stringify(event.message.content).includes('FOLLOW_UP_MARKER')) { seen = true; followedUp.resolve(); }
    if (seen && event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) finished.resolve();
  });
  try {
    await expect(harness.worker.operation({ type: 'steer', request: prompt('idle steer') })).rejects.toMatchObject({ code: 'RUN_NOT_FOUND', status: 404 });
    await expect(harness.worker.operation({ type: 'follow-up', request: prompt('idle follow-up') })).rejects.toMatchObject({ code: 'RUN_NOT_FOUND', status: 404 });
    expect(harness.requests).toHaveLength(0);
    await harness.worker.operation({ type: 'prompt', runId: 'streaming-run', request: {
      ...prompt('Keep this initial turn open.'), input: { text: 'Keep this initial turn open.', attachments: [], context: [
        { kind: 'context', text: 'DIRECT_CONTEXT_ENTRY', metadata: {}, instructions: 'DIRECT_ASSOCIATED_INSTRUCTION' },
        { kind: 'instruction', text: 'DIRECT_LATER_INSTRUCTION' },
        { kind: 'synthetic', text: 'DIRECT_SYNTHETIC_ENTRY' },
        { kind: 'context', text: 'DIRECT_LAST_CONTEXT', metadata: {} },
      ] },
    } });
    await firstRequest.promise;
    const streamingRequest = requestContaining(harness.requests, 'DIRECT_CONTEXT_ENTRY');
    expectContextOrder(streamingRequest, [
      'DIRECT_CONTEXT_ENTRY', 'DIRECT_LATER_INSTRUCTION', 'DIRECT_SYNTHETIC_ENTRY', 'DIRECT_LAST_CONTEXT',
    ]);
    expect(JSON.stringify(streamingRequest)).not.toContain('DIRECT_ASSOCIATED_INSTRUCTION');
    expect(JSON.stringify(streamingRequest)).not.toContain('ohpichamber.context');
    const attachment = { attachmentId: 'streaming-attachment', name: 'note.txt', mediaType: 'text/plain', size: Buffer.byteLength('ATTACHMENT_MARKER'), uri: 'attachment://streaming-attachment' };
    const path = join(harness.root, 'note.txt');
    await writeFile(path, 'ATTACHMENT_MARKER');
    const steered = await harness.worker.operation({ type: 'steer', request: { ...prompt('STEER_MARKER'), input: { text: 'STEER_MARKER', attachments: [], context: [{ kind: 'instruction', text: 'STEERING_INSTRUCTION' }] } } });
    expect(steered).toMatchObject({ type: 'steer', ack: { sessionId: rootSessionId, runId: 'streaming-run', acceptedAt: expect.any(Number) } });
    const queued = await harness.worker.operation({ type: 'follow-up', request: {
      ...prompt('FOLLOW_UP_MARKER'), input: { text: 'FOLLOW_UP_MARKER', attachments: [attachment], context: [
        { kind: 'context', text: 'FOLLOW_UP_CONTEXT', metadata: { captured: true }, deliveryReceiptId: 'delivery', instructions: 'FOLLOW_UP_ASSOCIATED_INSTRUCTION' },
        { kind: 'instruction', text: 'FOLLOW_UP_LATER_INSTRUCTION' },
        { kind: 'synthetic', text: 'FOLLOW_UP_SYNTHETIC_ENTRY' },
        { kind: 'context', text: 'FOLLOW_UP_LAST_CONTEXT', metadata: {} },
      ] },
    }, attachments: [{ attachmentId: attachment.attachmentId, path }] });
    if (queued.type !== 'follow-up') throw new Error('Follow-up acknowledgment was not returned');
    followUpId = queued.ack.followUpId;
    expect(queued.ack).toMatchObject({ sessionId: rootSessionId, followUpId: expect.any(String), acceptedAt: expect.any(Number) });
    expect(JSON.stringify(harness.worker.session.agent.peekSteeringQueue())).toContain('STEER_MARKER');
    expect(JSON.stringify(harness.worker.session.agent.peekFollowUpQueue())).toContain('FOLLOW_UP_MARKER');
    release.resolve();
    await followedUp.promise;
    await finished.promise;
    const history = await harness.worker.operation({ type: 'history', request: { sessionId: rootSessionId } });
    if (history.type !== 'history') throw new Error('History was not returned');
    const followUp = history.history.messages.find(message => message.messageId === followUpId);
    expect(followUp?.parts).toEqual(expect.arrayContaining([{ type: 'attachment', partId: `${followUpId}:attachment:0`, ...attachment }]));
    expect(JSON.stringify(followUp)).toContain('FOLLOW_UP_MARKER');
    expect(JSON.stringify(harness.requests)).toContain('STEERING_INSTRUCTION');
    expect(JSON.stringify(harness.requests)).toContain('FOLLOW_UP_CONTEXT');
    expectContextOrder(requestContaining(harness.requests, 'FOLLOW_UP_CONTEXT'), [
      'FOLLOW_UP_CONTEXT', 'FOLLOW_UP_LATER_INSTRUCTION', 'FOLLOW_UP_SYNTHETIC_ENTRY', 'FOLLOW_UP_LAST_CONTEXT',
    ]);
    expect(JSON.stringify(harness.requests)).not.toContain('FOLLOW_UP_ASSOCIATED_INSTRUCTION');
    expect(JSON.stringify(harness.requests)).not.toContain('ohpichamber.context');
    expect(harness.fatal()).toBe(false);
  } finally { release.resolve(); unsubscribe(); await harness.close(); }
}, 30000);

test('actual native undo/redo retains sibling transcript and cold-reopen selection without changing workspace files', async () => {
  const harness = await fixture({ respond: () => completion() });
  let cold: WorkerSession | undefined;
  try {
    const manager = harness.worker.session.sessionManager;
    const attachment = { attachmentId: 'accepted-upload', name: 'retained.txt', mediaType: 'text/plain', size: 7, uri: 'attachment://accepted-upload' };
    let timestamp = Date.now();
    for (const index of [1, 2]) {
      const userId = manager.appendMessage({ role: 'user', content: `Prompt ${index}`, timestamp: timestamp++ });
      manager.appendCustomEntry('ohpichamber.canonical.v1', { nativeEntryId: userId, messageId: `user-${index}`, turnId: `turn-${index}`,
        runId: `run-${index}`, userMessageId: `user-${index}`, virtualUser: false, attachments: index === 2 ? [attachment] : [] });
      const assistantId = manager.appendMessage({ role: 'assistant', content: [{ type: 'text', text: `Reply ${index}` }], api: 'openai-completions',
        provider: 'native-fixture', model: 'native-model', stopReason: 'stop', timestamp: timestamp++,
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } });
      manager.appendCustomEntry('ohpichamber.canonical.v1', { nativeEntryId: assistantId, messageId: `assistant-${index}`, turnId: `turn-${index}`,
        runId: `run-${index}`, userMessageId: `user-${index}`, virtualUser: false, attachments: [] });
    }
    await manager.flush();
    await writeFile(join(harness.root, 'workspace-proof.txt'), 'Not rolled back');
    const before = harness.worker.seed();
    const treeIds = manager.getEntries().map(entry => entry.id);
    const selectedAssistant = await harness.worker.operation({ type: 'branch', request: { action: 'revert', messageId: 'assistant-1',
      branchId: before.branch.branchId, branchVersion: before.branch.branchVersion } });
    if (selectedAssistant.type !== 'branch') throw new Error('Native assistant selection is required');
    expect(selectedAssistant.seed.messages.map(message => message.messageId)).toEqual(['user-1', 'assistant-1']);
    const fullSelection = await harness.worker.operation({ type: 'branch', request: { action: 'restore',
      branchId: selectedAssistant.result.branch.branchId, branchVersion: selectedAssistant.result.branch.branchVersion } });
    if (fullSelection.type !== 'branch') throw new Error('Native tree restore is required');
    const reverted = await harness.worker.operation({ type: 'branch', request: { action: 'revert', messageId: 'user-2',
      branchId: fullSelection.result.branch.branchId, branchVersion: fullSelection.result.branch.branchVersion } });
    if (reverted.type !== 'branch') throw new Error('Native branch response is required');
    expect(reverted.result).toMatchObject({ sessionId: rootSessionId, branch: { revert: { messageId: 'user-2' } }, draft: { text: 'Prompt 2', attachments: [attachment] } });
    expect(reverted.seed.messages.map(message => message.messageId)).toEqual(['user-1', 'assistant-1']);
    expect(manager.getEntries().map(entry => entry.id)).toEqual(expect.arrayContaining(treeIds));
    expect(await readFile(join(harness.root, 'workspace-proof.txt'), 'utf8')).toBe('Not rolled back');
    const earliest = await harness.worker.operation({ type: 'branch', request: { action: 'revert', messageId: 'user-1',
      branchId: reverted.result.branch.branchId, branchVersion: reverted.result.branch.branchVersion } });
    if (earliest.type !== 'branch') throw new Error('Repeated native undo is required');
    expect(earliest.seed.messages).toEqual([]);
    await harness.worker.close();
    cold = await WorkerSession.open({ type: 'bootstrap', rootSessionId, workerGeneration: 'cold-generation', projectId: 'project',
      workspaceId: 'workspace', agentDirectoryId: 'source', cwd: harness.root, agentDirectory: dirname(harness.mcpConfigPath),
      sessionFile: harness.worker.sessionFile, sessionsDirectory: dirname(harness.worker.sessionFile) }, () => {},
      () => { throw new Error('Branch recovery must not request interaction'); }, () => { throw new Error('Branch recovery must not fail'); },
      async () => {}, async () => { throw new Error('Branch recovery must not invoke Host tools'); }, () => {});
    const coldSeed = cold.seed();
    expect(coldSeed.branch).toEqual(earliest.seed.branch);
    expect(coldSeed.messages).toEqual(earliest.seed.messages);
    const marker = cold.session.sessionManager.getBranch().findLast(entry => entry.type === 'custom' && entry.customType === 'ohpichamber.branch.v1');
    if (marker?.type !== 'custom') throw new Error('Durable native branch marker is required');
    const selection = z.object({ restoreLeafId: z.string() }).parse(marker.data);
    expect(cold.session.sessionManager.getEntry(selection.restoreLeafId)).toBeDefined();
    const restored = await cold.operation({ type: 'branch', request: { action: 'restore', branchId: coldSeed.branch.branchId, branchVersion: coldSeed.branch.branchVersion } });
    if (restored.type !== 'branch') throw new Error('Native redo response is required');
    expect(restored.seed.messages).toEqual(before.messages);
    expect(restored.result.branch.revert).toBeUndefined();
    expect(harness.requests).toHaveLength(0);
  } finally { await cold?.close(); await harness.close(); }
}, 30000);
test('native compact refuses while a run is active', async () => {
  const firstRequest = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const harness = await fixture({ async respond() {
    firstRequest.resolve();
    await release.promise;
    return completion();
  } });
  const terminal = Promise.withResolvers<void>();
  const unsubscribe = harness.worker.session.subscribe(event => {
    if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve();
  });
  try {
    await harness.worker.operation({ type: 'prompt', runId: 'compact-active-run', request: prompt('Keep this run active.') });
    await firstRequest.promise;
    await expect(harness.worker.operation({ type: 'compact', instructions: 'Preserve the active-run refusal.' }))
      .rejects.toMatchObject({ status: 409, code: 'RUN_ACTIVE' });
    release.resolve();
    await terminal.promise;
    expect(harness.fatal()).toBe(false);
  } finally {
    release.resolve();
    unsubscribe();
    await harness.close();
  }
}, 30000);

test('native branch CAS rejects stale owner/version and redo expires after a new prompt', async () => {
  const harness = await fixture({ respond: () => completion() });
  try {
    const manager = harness.worker.session.sessionManager;
    manager.appendMessage({ role: 'user', content: 'Original prompt', timestamp: Date.now() });
    manager.appendMessage({ role: 'assistant', content: [{ type: 'text', text: 'Original reply' }], api: 'openai-completions', provider: 'native-fixture',
      model: 'native-model', stopReason: 'stop', timestamp: Date.now(),
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } });
    await manager.flush();
    const before = harness.worker.seed();
    const target = before.messages.find(message => message.role === 'user')!;
    const leaf = manager.getLeafId();
    await expect(harness.worker.operation({ type: 'branch', request: { action: 'revert', messageId: target.messageId,
      branchId: 'another-branch', branchVersion: before.branch.branchVersion } })).rejects.toMatchObject({ code: 'SESSION_BRANCH_CONFLICT' });
    expect(manager.getLeafId()).toBe(leaf);
    const reverted = await harness.worker.operation({ type: 'branch', request: { action: 'revert', messageId: target.messageId,
      branchId: before.branch.branchId, branchVersion: before.branch.branchVersion } });
    if (reverted.type !== 'branch') throw new Error('Native branch response is required');
    await expect(harness.worker.operation({ type: 'branch', request: { action: 'restore', branchId: before.branch.branchId,
      branchVersion: before.branch.branchVersion } })).rejects.toMatchObject({ code: 'SESSION_BRANCH_CONFLICT' });
    const restored = await harness.worker.operation({ type: 'branch', request: { action: 'restore', branchId: reverted.result.branch.branchId,
      branchVersion: reverted.result.branch.branchVersion } });
    if (restored.type !== 'branch') throw new Error('Native restore response is required');
    expect(restored.result.branch.revert).toBeUndefined();
    expect(restored.seed.messages).toEqual(before.messages);
    const again = await harness.worker.operation({ type: 'branch', request: { action: 'revert', messageId: target.messageId,
      branchId: restored.result.branch.branchId, branchVersion: restored.result.branch.branchVersion } });
    if (again.type !== 'branch') throw new Error('Native branch response is required');
    const terminal = Promise.withResolvers<void>();
    const unsubscribe = harness.worker.session.subscribe(event => { if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve(); });
    try {
      await harness.worker.operation({ type: 'prompt', runId: 'new-branch-run', request: prompt('A new branch prompt') });
      await expect(harness.worker.operation({ type: 'branch', request: { action: 'restore', branchId: again.result.branch.branchId,
        branchVersion: again.result.branch.branchVersion } })).rejects.toMatchObject({ code: 'RUN_ACTIVE' });
      await terminal.promise;
      const history = await harness.worker.operation({ type: 'history', request: { sessionId: rootSessionId } });
      if (history.type !== 'history') throw new Error('Native history response is required');
      expect(history.history.branch.revert).toBeUndefined();
      await expect(harness.worker.operation({ type: 'branch', request: { action: 'restore', branchId: history.history.branch.branchId,
        branchVersion: history.history.branch.branchVersion } })).rejects.toMatchObject({ code: 'SESSION_BRANCH_CONFLICT' });
    } finally { unsubscribe(); }
    expect(harness.fatal()).toBe(false);
  } finally { await harness.close(); }
}, 30000);
test('actual native TaskTool owns a child session and persists its history', async () => {
  let requests = 0;
  const lifecycle: SubagentLifecyclePayload[] = [];
  const harness = await fixture({
    onSubagent: payload => lifecycle.push(payload),
    respond: payload => {
      requests += 1;
      if (requests === 1) return completion({ name: 'task', id: 'native-task', input: { agent: 'child', name: 'child-proof', task: 'Return the child proof marker.' } });
      return completion();
    },
  });
  const terminal = Promise.withResolvers<void>();
  const unsubscribe = harness.worker.session.subscribe(event => {
    if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve();
  });
  try {
    cfgToolsApprovalMode.override(harness.worker.session.settings, 'yolo');
    await harness.worker.operation({ type: 'prompt', runId: 'task-run', request: prompt('Spawn one native child and wait for its result.') });
    await terminal.promise;
    expect(requests).toBeGreaterThanOrEqual(3);

    expect(lifecycle.map(event => event.status)).toEqual(['started', 'completed']);
    const started = lifecycle[0];
    const completed = lifecycle[1];
    expect(started?.id).toBe(completed?.id);
    const history = await harness.worker.operation({ type: 'history', request: { sessionId: rootSessionId } });
    if (history.type !== 'history') throw new Error('Canonical history response is required');
    const taskCall = history.history.messages.flatMap(message => message.parts).find(part => part.type === 'tool_call' && part.toolName === 'task');
    if (taskCall?.type !== 'tool_call') throw new Error('Canonical native TaskTool call is required');
    expect(taskCall.toolCallId).toBe('native-task');
    expect(started?.parentToolCallId).toBe(taskCall.toolCallId);
    expect(completed?.parentToolCallId).toBe(taskCall.toolCallId);
    expect(started?.sessionFile).toBeTruthy();
    if (!started?.sessionFile) throw new Error('Native child session file was not published');
    const child = await SessionManager.open(started.sessionFile, dirname(started.sessionFile), undefined, { initialCwd: harness.root, throwIfMissing: true });
    try {
      expect(child.getSessionId()).not.toBe(rootSessionId);
      expect(child.getEntries().some(entry => entry.type === 'message' && entry.message.role === 'user')).toBe(true);
      expect(child.getEntries().some(entry => entry.type === 'message' && entry.message.role === 'assistant')).toBe(true);
    } finally { await child.close(); }
    expect(harness.fatal()).toBe(false);
  } finally {
    unsubscribe();
    await harness.close();
  }
}, 60000);


test('native child tool calls re-enter Host authorization', async () => {
  let requests = 0;
  const harness = await fixture({ respond: () => {
    requests += 1;
    if (requests === 1) return completion({ name: 'task', id: 'native-task', input: { agent: 'child', name: 'child-proof', task: 'Write child.txt then return the marker.' } });
    if (requests === 2) return completion({ name: 'write', id: 'native-child-write', input: { path: 'child.txt', content: 'child' } });
    return completion();
  } });
  const terminal = Promise.withResolvers<void>();
  const unsubscribe = harness.worker.session.subscribe(event => {
    if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve();
  });
  try {
    cfgToolsApprovalMode.override(harness.worker.session.settings, 'yolo');
    await harness.worker.operation({ type: 'prompt', runId: 'child-auth-run', request: prompt('Spawn one native child that writes a file.') });
    await terminal.promise;
    expect(harness.hostRequests.some(request => request.type === 'tool' && request.toolName === 'task')).toBe(true);
    expect(harness.hostRequests.some(request => request.type === 'tool' && request.toolName === 'write' && request.input.path === 'child.txt')).toBe(true);
    expect(harness.fatal()).toBe(false);
  } finally {
    unsubscribe();
    await harness.close();
  }
}, 60000);

test('actual SDK edit reaches Host policy and projects its exact replace arguments', async () => {
  const input = { path: 'fixture-diff.txt', old_string: "export const greeting = 'hello';",
    new_string: "export const greeting = 'hello, restored UI';\nexport const mood = 'warm';" };
  const harness = await fixture({ respond(payload) {
    return payload.messages.at(-1)?.role === 'tool'
      ? completion()
      : completion({ name: 'edit', id: 'native-edit', input });
  } });
  const terminal = Promise.withResolvers<void>();
  const unsubscribe = harness.worker.session.subscribe(event => { if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve(); });
  try {
    cfgToolsApprovalMode.override(harness.worker.session.settings, 'yolo');
    cfgEditMode.override(harness.worker.session.settings, 'replace');
    await writeFile(join(harness.root, 'fixture-diff.txt'), "export const greeting = 'hello';\nexport const count = 1;\n");
    await harness.worker.operation({ type: 'prompt', runId: 'edit-run', request: prompt('Edit fixture-diff.txt using the configured native replace mode.') });
    await terminal.promise;
    expect(await readFile(join(harness.root, 'fixture-diff.txt'), 'utf8'))
      .toBe("export const greeting = 'hello, restored UI';\nexport const mood = 'warm';\nexport const count = 1;\n");
    expect(harness.fatal()).toBe(false);
    const started = harness.events.map(event => event.event)
      .filter(event => event.type === 'tool.started' && event.toolCallId === 'native-edit');
    expect(started).toEqual([{ type: 'tool.started', toolCallId: 'native-edit', toolName: 'edit', input }]);
    const completed = harness.events.map(event => event.event)
      .filter(event => event.type === 'tool.completed' && event.toolCallId === 'native-edit');
    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({ status: 'completed', isError: false });
    expect(harness.events.some(event => event.event.type === 'run.failed')).toBe(false);
  } finally {
    unsubscribe();
    await harness.close();
  }
}, 30000);

test('model catalog plan availability matches whether plan mode can enter', async () => {
  const missing = await fixture({ respond: () => completion() });
  try {
    const catalog = await missing.worker.operation({ type: 'catalog', revision: '0', operation: { type: 'catalog.models.read' } });
    expect(catalog).toMatchObject({ type: 'catalog', result: { type: 'catalog.models', catalog: { planRoleAvailable: false } } });
    await expect(missing.worker.operation({ type: 'mode.set', mode: 'plan' })).rejects.toMatchObject({ status: 422, code: 'MODEL_UNAVAILABLE' });
  } finally { await missing.close(); }

  const configured = await fixture({ respond: () => completion(), planModel: true });
  try {
    const catalog = await configured.worker.operation({ type: 'catalog', revision: '0', operation: { type: 'catalog.models.read' } });
    expect(catalog).toMatchObject({ type: 'catalog', result: { type: 'catalog.models', catalog: { planRoleAvailable: true } } });
    await expect(configured.worker.operation({ type: 'mode.set', mode: 'plan' }))
      .resolves.toMatchObject({ type: 'mode.set', mode: { kind: 'plan', status: 'active' } });
  } finally { await configured.close(); }
});

test('native plan mode restores its tools and role model after reopening the same file', async () => {
  const harness = await fixture({ respond: () => completion(), planModel: true });
  try {
    const before = harness.worker.session.getEnabledToolNames();
    const entered = await harness.worker.operation({ type: 'mode.set', mode: 'plan' });
    expect(entered).toMatchObject({ type: 'mode.set', mode: { kind: 'plan', status: 'active', planReference: expect.stringMatching(/^local:\/\//) } });
    expect(harness.worker.session.getEnabledToolNames()).toEqual([...new Set([...before, ...(harness.worker.session.hasBuiltInTool('write') ? ['write'] : [])])]);
    expect(harness.worker.session.model?.id).toBe('native-plan-model');
    expect(harness.journal.snapshot().session.mode).toEqual(harness.worker.mode());
    expect(harness.events).toContainEqual(expect.objectContaining({ event: { type: 'session.updated', mode: harness.worker.mode() } }));
    await harness.reopen();
    expect(harness.worker.mode()).toEqual(entered.type === 'mode.set' ? entered.mode : undefined);
    expect(harness.journal.snapshot().session.mode).toEqual(harness.worker.mode());
    expect(harness.worker.session.model?.id).toBe('native-plan-model');
    expect(harness.worker.session.getEnabledToolNames()).toEqual([...new Set([...before, ...(harness.worker.session.hasBuiltInTool('write') ? ['write'] : [])])]);
    expect(await harness.worker.operation({ type: 'mode.set', mode: 'main' })).toEqual({ type: 'mode.set', mode: { kind: 'main' } });
    expect(harness.worker.session.getEnabledToolNames()).toEqual(before);
    expect(harness.worker.session.model?.id).toBe('native-model');
    await harness.reopen();
    expect(harness.worker.mode()).toEqual({ kind: 'main' });
    expect(harness.worker.session.model?.id).toBe('native-model');
  } finally { await harness.close(); }
}, 30000);

test('native vibe mode restores tools after reopening and returning to Main', async () => {
  const harness = await fixture({ respond: () => completion() });
  try {
    const before = harness.worker.session.getEnabledToolNames();
    const entered = await harness.worker.operation({ type: 'mode.set', mode: 'vibe' });
    expect(entered).toEqual({ type: 'mode.set', mode: { kind: 'vibe' } });
    expect(harness.worker.session.getEnabledToolNames()).toEqual(['read', ...(harness.worker.session.hasBuiltInTool('todo') ? ['todo'] : []), 'vibe_spawn', 'vibe_send', 'vibe_wait', 'vibe_kill', 'vibe_list']);
    expect(harness.journal.snapshot().session.mode).toEqual({ kind: 'vibe' });
    await harness.reopen();
    expect(harness.worker.mode()).toEqual({ kind: 'vibe' });
    expect(harness.worker.session.getEnabledToolNames()).toEqual(['read', ...(harness.worker.session.hasBuiltInTool('todo') ? ['todo'] : []), 'vibe_spawn', 'vibe_send', 'vibe_wait', 'vibe_kill', 'vibe_list']);
    expect(await harness.worker.operation({ type: 'mode.set', mode: 'main' })).toEqual({ type: 'mode.set', mode: { kind: 'main' } });
    expect(harness.worker.session.getEnabledToolNames()).toEqual(before);
    await harness.reopen();
    expect(harness.worker.mode()).toEqual({ kind: 'main' });
  } finally { await harness.close(); }
}, 30000);

test('native plan and vibe transitions remain mutually exclusive', async () => {
  const harness = await fixture({ respond: () => completion(), planModel: true });
  try {
    await harness.worker.operation({ type: 'mode.set', mode: 'plan' });
    const vibe = await harness.worker.operation({ type: 'mode.set', mode: 'vibe' });
    expect(vibe).toEqual({ type: 'mode.set', mode: { kind: 'vibe' } });
    expect(harness.worker.session.getPlanModeState()).toBeUndefined();
    expect(harness.worker.session.getEnabledToolNames()).toContain('vibe_spawn');
    const plan = await harness.worker.operation({ type: 'mode.set', mode: 'plan' });
    expect(plan).toMatchObject({ type: 'mode.set', mode: { kind: 'plan', status: 'active' } });
    expect(harness.worker.session.getEnabledToolNames()).not.toContain('vibe_spawn');
    expect(harness.journal.snapshot().session.mode).toEqual(plan.type === 'mode.set' ? plan.mode : undefined);
    await harness.worker.operation({ type: 'mode.set', mode: 'main' });
  } finally { await harness.close(); }
}, 30000);

test('native plan prompts keep the role model despite captured Main options', async () => {
  const requested = Promise.withResolvers<ProviderRequest>();
  const harness = await fixture({ planModel: true, respond: payload => { requested.resolve(payload); return completion(); } });
  try {
    await harness.worker.operation({ type: 'mode.set', mode: 'plan' });
    await harness.worker.operation({ type: 'prompt', runId: 'plan-role-run', request: prompt('Read the plan context.') });
    expect((await requested.promise).model).toBe('native-plan-model');
    expect(harness.worker.session.model?.id).toBe('native-plan-model');
  } finally { await harness.close(); }
}, 30000);

test('native mode controller restores plan_paused without activating planning tools', async () => {
  const harness = await fixture({ respond: () => completion() });
  try {
    harness.worker.session.sessionManager.appendModeChange('plan_paused', { planFilePath: 'local://paused-plan.md' });
    await harness.worker.session.sessionManager.flush();
    await harness.reopen();
    expect(harness.worker.mode()).toEqual({ kind: 'plan', status: 'paused', planReference: 'local://paused-plan.md' });
    expect(harness.worker.session.getPlanModeState()).toBeUndefined();
    const restored = new WorkerModeController(harness.worker.session);
    expect(restored.mode()).toEqual(harness.worker.mode());
    expect(await harness.worker.operation({ type: 'mode.set', mode: 'main' })).toEqual({ type: 'mode.set', mode: { kind: 'main' } });
  } finally { await harness.close(); }
}, 30000);

test('native plan mode refuses an actual write outside the plan reference', async () => {
  const failed = Promise.withResolvers<void>();
  const harness = await fixture({ planModel: true, respond: payload => payload.messages.at(-1)?.role === 'tool'
    ? completion() : completion({ name: 'write', id: 'outside-plan-write', input: { path: 'outside-plan.txt', content: 'must-refuse' } }) });
  const unsubscribe = harness.worker.session.subscribe(event => {
    if (event.type === 'tool_execution_end' && event.toolCallId === 'outside-plan-write') failed.resolve();
  });
  try {
    await harness.worker.operation({ type: 'mode.set', mode: 'plan' });
    await harness.worker.operation({ type: 'prompt', runId: 'plan-write-run', request: prompt('Write outside the plan file.') });
    await failed.promise;
    const outcome = harness.events.map(input => input.event).find(event => event.type === 'tool.completed' && event.toolCallId === 'outside-plan-write');
    expect(outcome).toMatchObject({ status: 'failed', isError: true });
    await expect(readFile(join(harness.root, 'outside-plan.txt'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  } finally { unsubscribe(); await harness.close(); }
}, 30000);

test('native mode changes reject while a worker run is active', async () => {
  const harness = await fixture({ respond: () => completion() });
  const gate = Promise.withResolvers<boolean>();
  try {
    const run = harness.worker.startWorkerRun('plan', () => gate.promise);
    await expect(harness.worker.operation({ type: 'mode.set', mode: 'plan' })).rejects.toMatchObject({ status: 409, code: 'RUN_ACTIVE' });
    gate.resolve(false);
    await run;
  } finally {
    await harness.close();
  }
}, 30000);

for (const action of ['approve', 'approve-compact', 'feedback', 'reject'] as const) {
  test(`native plan proposal supports ${action} through canonical questions`, async () => {
    let stage = 0;
    let executionStarted = false;
    const execution = Promise.withResolvers<ProviderRequest>();
    const releasePlanning = Promise.withResolvers<void>();
    const planText = '# Native plan\nImplement the requested review.';
    const harness = await fixture({ planModel: true, respond: async payload => {
      stage++;
      if (stage === 1) return completion({ name: 'write', id: 'write-plan', input: { path: 'local://PLAN.md', content: planText } });
      if (stage === 2) return completion({ name: 'write', id: 'propose-plan', input: { path: 'xd://propose', content: 'review' } });
      const content = JSON.stringify(payload.messages);
      if (content.includes('Plan approved.') || content.includes('Revise the verification step.')) {
        executionStarted = true;
        execution.resolve(payload);
      } else await releasePlanning.promise;
      return completion();
    } });
    const planningEnded = Promise.withResolvers<void>();
    const executionEnded = Promise.withResolvers<void>();
    let ended = 0;
    const unsubscribe = harness.worker.session.subscribe(event => {
      if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) {
        ended++;
        if (ended === 1) planningEnded.resolve();
        if (executionStarted) executionEnded.resolve();
      }
    });
    try {
      await harness.worker.session.setActiveToolPresentation(
        harness.worker.session.getEnabledToolNames().filter(name => name !== 'read'),
        harness.worker.session.getMountedXdevToolNames().filter(name => name !== 'read'),
      );
      const before = harness.worker.session.getEnabledToolNames();
      await harness.worker.operation({ type: 'mode.set', mode: 'plan' });
      await harness.worker.operation({ type: 'prompt', runId: 'planning-run', request: prompt('Prepare and propose a plan.') });
      const question = await harness.waitQuestion();
      expect(question.schema).toEqual({ type: 'plan-review', title: 'review', planReference: 'local://PLAN.md', planText });
      expect(JSON.stringify(question)).not.toContain(harness.root);
      const response = action === 'feedback' ? { action, feedback: 'Revise the verification step.' } : { action };
      const reply = { action: 'answer' as const, response, version: question.version, epoch: question.epoch, workerGeneration: question.workerGeneration };
      await harness.interactions.resolveQuestion(rootSessionId, question.questionId, reply);
      expect(harness.events.filter(input => input.event.type === 'run.started')).toHaveLength(1);
      await expect(harness.interactions.resolveQuestion(rootSessionId, question.questionId, reply)).rejects.toMatchObject({ code: 'QUESTION_CONFLICT' });
      releasePlanning.resolve();
      if (action === 'approve-compact') await Promise.race([planningEnded.promise, execution.promise.then(() => undefined)]);
      else await planningEnded.promise;
      if (action === 'reject') {
        expect(harness.worker.mode().kind).toBe('plan');
        expect(harness.events.filter(input => input.event.type === 'run.started')).toHaveLength(1);
      } else {
        await execution.promise;
        await executionEnded.promise;
        const started = harness.events.findIndex(input => input.event.type === 'run.started' && input.event.origin === 'plan');
        expect(started).toBeGreaterThan(0);
        if (action === 'feedback') {
          expect(harness.worker.mode().kind).toBe('plan');
          expect(JSON.stringify(harness.requests.at(-1)?.messages)).toContain('Revise the verification step.');
        } else {
          expect(harness.worker.mode()).toEqual({ kind: 'main' });
          expect(harness.worker.session.getEnabledToolNames()).toEqual(before.includes('read') ? before : [...before, 'read']);
          const executionMessages = harness.worker.seed().messages.filter(message => message.role === 'user');
          expect(JSON.stringify(executionMessages.at(-1))).toContain('Plan approved.');
          expect(JSON.stringify(executionMessages.at(-1))).toContain(planText.replaceAll('\n', '\\n'));
          expect(JSON.stringify(harness.requests.at(-1)?.messages)).toContain('Full plan inlined below; durable copy at');
          if (action === 'approve-compact') {
            const compacted = harness.events.findIndex(input => input.event.type === 'session.compacted');
            expect(compacted).toBeGreaterThan(0);
            expect(compacted).toBeLessThan(started);
          } else expect(harness.events.some(input => input.event.type === 'session.compacted')).toBe(false);
        }
      }
      expect(harness.fatal()).toBe(false);
    } finally { releasePlanning.resolve(); unsubscribe(); await harness.close(); }
  }, 30000);
}

test('a prompt with no explicit effort runs at OMP default thinking level', async () => {
  const harness = await fixture({ respond: () => completion(), reasoningEfforts: ['low', 'medium', 'high'] });
  const terminal = Promise.withResolvers<void>();
  const unsubscribe = harness.worker.session.subscribe(event => {
    if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve();
  });
  try {
    await harness.worker.operation({ type: 'prompt', runId: 'default-effort-run', request: prompt('Use the default thinking level.') });
    await terminal.promise;
    expect(harness.worker.session.configuredThinkingLevel()).toBe('high');
    expect(harness.requests[0]).toMatchObject({ reasoning_effort: 'high' });
    expect(harness.fatal()).toBe(false);
  } finally { unsubscribe(); await harness.close(); }
}, 30000);

test('an explicit off effort reaches the native agent while an omitted effort keeps the OMP default', async () => {
  const harness = await fixture({ respond: () => completion(), reasoningEfforts: ['low', 'medium', 'high'] });
  const terminal = Promise.withResolvers<void>();
  const unsubscribe = harness.worker.session.subscribe(event => {
    if (event.type === 'agent_end' && event.isTerminal !== false && !event.awaitingAsyncWork) terminal.resolve();
  });
  try {
    await harness.worker.operation({ type: 'prompt', runId: 'off-effort-run', request: {
      ...prompt('Think as little as possible.'), options: { ...options, reasoningEffort: 'off' },
    } });
    await terminal.promise;
    expect(harness.worker.session.configuredThinkingLevel()).toBe('off');
    expect(harness.requests[0]?.reasoning_effort).not.toBe('high');
  } finally { unsubscribe(); await harness.close(); }
}, 30000);
