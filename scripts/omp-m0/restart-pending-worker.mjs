import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ProbeError, safeError } from './envelope.mjs';
import { bounded, createFixtureSession, loadFixtureSDK } from './fixture.mjs';
import { sourceImport } from './capability-fixture.mjs';

const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
const context = { ...input, workspace: join(input.sandbox, 'workspace'), agentDir: join(input.sandbox, 'agent'), home: join(input.sandbox, 'home') };
const eventsFile = join(input.sandbox, 'restart-pending.events.jsonl');
const metrics = { eventCount: 0, toolExecutionCount: 0, answerCount: 0 };
let eventWrite = Promise.resolve();
let active;
function workerFailureCode(error) {
  if (error instanceof ProbeError) return error.code;
  if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND') return error.code;
  return safeError(error, 'RESTART_PENDING_WORKER_FAILED');
}

function recordEvent(type) {
  metrics.eventCount++;
  if (type === 'tool_execution') metrics.toolExecutionCount++;
  if (type === 'question_answered') metrics.answerCount++;
  eventWrite = eventWrite.then(() => appendFile(eventsFile, `${JSON.stringify({ phase: input.phase, type })}\n`));
  return eventWrite;
}

async function flushEvents() { await eventWrite; }

async function readEventMetrics() {
  const totals = { eventCount: 0, toolExecutionCount: 0, answerCount: 0, pendingEventCount: 0, pendingToolExecutionCount: 0, pendingAnswerCount: 0 };
  let text;
  try { text = await readFile(eventsFile, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return totals; throw error; }
  for (const line of text.split('\n')) {
    if (!line) continue;
    let row;
    try { row = JSON.parse(line); } catch { throw new ProbeError('RESTART_EVENT_LOG_CORRUPT'); }
    if (!/^(pending|fresh)$/.test(row.phase) || !/^[a-z_]+$/.test(row.type)) throw new ProbeError('RESTART_EVENT_LOG_UNSAFE');
    totals.eventCount++;
    if (row.type === 'tool_execution') totals.toolExecutionCount++;
    if (row.type === 'question_answered') totals.answerCount++;
    if (row.phase === 'pending') {
      totals.pendingEventCount++;
      if (row.type === 'tool_execution') totals.pendingToolExecutionCount++;
      if (row.type === 'question_answered') totals.pendingAnswerCount++;
    }
  }
  return totals;
}

async function pendingPhase() {
  const [sdk, loader, { ExtensionRunner }, { ExtensionToolWrapper }, { initializeExtensions }, { EventBus }] = await Promise.all([
    loadFixtureSDK(context),
    sourceImport(context, 'packages/coding-agent/src/extensibility/extensions/loader.ts'),
    sourceImport(context, 'packages/coding-agent/src/extensibility/extensions/runner.ts'),
    sourceImport(context, 'packages/coding-agent/src/extensibility/extensions/wrapper.ts'),
    sourceImport(context, 'packages/coding-agent/src/modes/runtime-init.ts'),
    sourceImport(context, 'packages/coding-agent/src/utils/event-bus.ts'),
  ]);
  const approvalPending = Promise.withResolvers();
  const questionPending = Promise.withResolvers();
  const approvalPresented = Promise.withResolvers();
  const questionPresented = Promise.withResolvers();
  const runtime = new loader.ExtensionRuntime();
  const extension = await loader.loadExtensionFromFactory(api => {
    api.on('tool_approval_requested', () => { void recordEvent('approval_requested').catch(() => {}); });
    api.on('tool_approval_resolved', () => { void recordEvent('approval_resolved').catch(() => {}); });
  }, context.workspace, new EventBus(), runtime, 'm0-restart-pending');
  active = await createFixtureSession(context, {
    responses: [],
    settings: { 'tools.approvalMode': 'always-ask' },
    extensionRunnerFactory: ({ manager, modelRegistry, settings }) => new ExtensionRunner([extension], runtime, context.workspace, manager, modelRegistry, undefined, settings),
  });
  const tool = {
    name: 'm0_restart_write', label: 'Controlled restart write', description: 'Controlled restart fixture.', approval: 'write', parameters: sdk.type({ value: 'string' }),
    execute: async () => { await recordEvent('tool_execution'); return { content: [{ type: 'text', text: 'should-not-run' }] }; },
  };
  const wrapped = new ExtensionToolWrapper(tool, active.session.extensionRunner);
  const bind = uiContext => initializeExtensions(active.session, { onShutdown: () => active.session.abort(), uiContext });
  try {
    await bind({ select: (_title, choices) => { approvalPresented.resolve(choices); return approvalPending.promise; } });
    const approvalRequest = wrapped.execute('m0-restart-approval', { value: 'controlled' });
    approvalRequest.catch(() => {});
    const choices = await bounded(approvalPresented.promise, context.timeoutMs, 'RESTART_APPROVAL_PRESENTATION_TIMEOUT');
    if (!choices.includes('Approve') || !choices.includes('Deny')) throw new ProbeError('RESTART_APPROVAL_NOT_PENDING');

    const { AskTool } = await sourceImport(context, 'packages/coding-agent/src/tools/ask.ts');
    const { Settings } = await sourceImport(context, 'packages/coding-agent/src/config/settings.ts');
    const { ensureThemeSync } = await sourceImport(context, 'packages/tui/src/theme/theme.ts');
    ensureThemeSync();
    const askTool = new AskTool({ cwd: context.workspace, hasUI: false, canPromptUser: true, settings: Settings.isolated({ 'speech.enabled': false }) });
    const questionRequest = askTool.execute('m0-restart-question', { questions: [{ id: 'm0-restart-question', question: 'Controlled restart question?', options: [{ label: 'yes' }, { label: 'no' }], recommended: 0 }] }, undefined, undefined, {
      hasUI: true,
      abort: () => {},
      ui: { askDialog: questions => { questionPresented.resolve(questions); void recordEvent('question_presented').catch(() => {}); return questionPending.promise; } },
    });
    questionRequest.then(() => { void recordEvent('question_answered').catch(() => {}); }, () => {});
    const questions = await bounded(questionPresented.promise, context.timeoutMs, 'RESTART_QUESTION_PRESENTATION_TIMEOUT');
    if (questions.length !== 1 || questions[0].id !== 'm0-restart-question') throw new ProbeError('RESTART_QUESTION_NOT_PENDING');

    await flushEvents();
    const observed = await readEventMetrics();
    await writeFile(input.markerFile, JSON.stringify({
      phase: 'pending', pid: process.pid, approvalPending: true, questionPending: true,
      toolExecutionCount: observed.toolExecutionCount, answerCount: observed.answerCount,
      eventCount: observed.eventCount, pendingEventCount: observed.pendingEventCount,
    }));
    await new Promise(() => {});
  } finally {
    approvalPending.resolve(undefined);
    questionPending.resolve(undefined);
    if (active) { await active.dispose(); active = undefined; }
  }
}

async function freshPhase() {
  const marker = JSON.parse(await readFile(input.markerFile, 'utf8'));
  const before = await readEventMetrics();
  const [sdk, loader, { ExtensionRunner }, { ExtensionToolWrapper }, { initializeExtensions }, { EventBus }] = await Promise.all([
    loadFixtureSDK(context),
    sourceImport(context, 'packages/coding-agent/src/extensibility/extensions/loader.ts'),
    sourceImport(context, 'packages/coding-agent/src/extensibility/extensions/runner.ts'),
    sourceImport(context, 'packages/coding-agent/src/extensibility/extensions/wrapper.ts'),
    sourceImport(context, 'packages/coding-agent/src/modes/runtime-init.ts'),
    sourceImport(context, 'packages/coding-agent/src/utils/event-bus.ts'),
  ]);
  const runtime = new loader.ExtensionRuntime();
  const extension = await loader.loadExtensionFromFactory(api => {
    api.on('tool_approval_requested', () => { void recordEvent('approval_requested').catch(() => {}); });
    api.on('tool_approval_resolved', () => { void recordEvent('approval_resolved').catch(() => {}); });
  }, context.workspace, new EventBus(), runtime, 'm0-restart-pending-fresh');
  active = await createFixtureSession(context, {
    responses: [], settings: { 'tools.approvalMode': 'always-ask' },
    extensionRunnerFactory: ({ manager, modelRegistry, settings }) => new ExtensionRunner([extension], runtime, context.workspace, manager, modelRegistry, undefined, settings),
  });
  const tool = { name: 'm0_restart_write', label: 'Controlled restart write', description: 'Controlled restart fixture.', approval: 'write', parameters: sdk.type({ value: 'string' }), execute: async () => { await recordEvent('tool_execution'); return { content: [{ type: 'text', text: 'fresh-execution' }] }; } };
  const wrapped = new ExtensionToolWrapper(tool, active.session.extensionRunner);
  const bind = uiContext => initializeExtensions(active.session, { onShutdown: () => active.session.abort(), uiContext });
  try {
    await bind({ select: async (_title, choices) => { if (!choices.includes('Approve')) throw new ProbeError('RESTART_APPROVAL_OPTIONS_INVALID'); return 'Approve'; } });
    await bounded(wrapped.execute('m0-restart-fresh-approval', { value: 'controlled' }), context.timeoutMs, 'RESTART_FRESH_APPROVAL_TIMEOUT');
    const { AskTool } = await sourceImport(context, 'packages/coding-agent/src/tools/ask.ts');
    const { Settings } = await sourceImport(context, 'packages/coding-agent/src/config/settings.ts');
    const { ensureThemeSync } = await sourceImport(context, 'packages/tui/src/theme/theme.ts');
    ensureThemeSync();
    const askTool = new AskTool({ cwd: context.workspace, hasUI: false, canPromptUser: true, settings: Settings.isolated({ 'speech.enabled': false }) });
    const questionRequest = askTool.execute('m0-restart-fresh-question', { questions: [{ id: 'm0-restart-question', question: 'Controlled restart question?', options: [{ label: 'yes' }, { label: 'no' }], recommended: 0 }] }, undefined, undefined, {
      hasUI: true,
      abort: () => {},
      ui: { askDialog: async questions => { await recordEvent('question_presented'); return { kind: 'submit', results: questions.map(question => ({ id: question.id, question: question.question, options: question.options.map(option => option.label), multi: false, selectedOptions: [question.options[0]?.label ?? ''] })) }; } },
    });
    await bounded(questionRequest, context.timeoutMs, 'RESTART_FRESH_QUESTION_TIMEOUT');
    await recordEvent('question_answered');
    await flushEvents();
    const lateObservationWindowMs = Math.min(100, Math.max(1, context.timeoutMs));
    await new Promise(resolve => setTimeout(resolve, lateObservationWindowMs));
    const after = await readEventMetrics();
    const lateExecutionObserved = after.pendingToolExecutionCount > marker.toolExecutionCount;
    const lateAnswerObserved = after.pendingAnswerCount > marker.answerCount;
    await writeFile(input.resultFile, JSON.stringify({
      phase: 'fresh', oldPid: marker.pid, freshPid: process.pid,
      distinctWorker: marker.pid !== process.pid,
      freshSessionReady: true,
      approval: {
        pendingObservedBeforeStop: marker.approvalPending === true,
        staleResolution: { status: 'unavailable', reason: 'The controlled fixture exposes no cross-worker request handle or durable pending registry.' },
        staleResolutionRejected: null, lateExecutionObserved,
        before: { toolExecutionCount: before.toolExecutionCount, eventCount: before.eventCount },
        after: { toolExecutionCount: after.toolExecutionCount, eventCount: after.eventCount },
      },
      question: {
        pendingObservedBeforeStop: marker.questionPending === true,
        staleResolution: { status: 'unavailable', reason: 'The controlled fixture exposes no cross-worker request handle or durable pending registry.' },
        staleResolutionRejected: null, lateAnswerObserved,
        before: { answerCount: before.answerCount, eventCount: before.eventCount },
        after: { answerCount: after.answerCount, eventCount: after.eventCount },
      },
      eventCounts: { before: before.eventCount, after: after.eventCount, pendingAtStop: marker.eventCount, pendingAfterStop: after.pendingEventCount, lateObservationWindowMs },
    }));
  } finally {
    if (active) { await active.dispose(); active = undefined; }
  }
}

try {
  if (input.phase === 'pending') await pendingPhase();
  else if (input.phase === 'fresh') { await freshPhase(); process.exit(0); }
  else throw new ProbeError('RESTART_PHASE_INVALID');
} catch (error) {
  try { if (active) await active.dispose(); } catch {}
  await writeFile(input.errorFile, JSON.stringify({ status: error instanceof ProbeError ? error.status : 'failed', error: workerFailureCode(error) }));
  process.exit(1);
}
