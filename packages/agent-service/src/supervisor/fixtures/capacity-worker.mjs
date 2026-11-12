import { appendFileSync } from 'node:fs';

let rootSessionId = '';
let shellJobUntil = 0;
const send = message => { if (process.connected) process.send(message); };
const now = Date.now();

process.on('message', message => {
  const type = message?.type;
  if (!type) return;
  if (type === 'bootstrap' || type === 'completion.bootstrap' || type === 'usage.bootstrap') {
    rootSessionId = message.rootSessionId ?? message.authorizationRootId ?? rootSessionId;
    shellJobUntil = Date.now() + Number(process.env.WORKER_SHELL_JOB_MS ?? '0');
    if (process.env.WORKER_LOG) appendFileSync(process.env.WORKER_LOG, `${message.type} ${rootSessionId}\n`);
    if (message.type === 'bootstrap') {
      send({ type: 'opened', workerGeneration: message.workerGeneration, sessionFile: process.env.WORKER_SESSION_FILE ?? `${process.cwd()}/session.jsonl`, seed: {
        createdAt: now, updatedAt: now,
        mode: { kind: 'main' },
        branch: { branchId: 'branch-fixture', branchVersion: '1', leafMessageId: null },
        turns: [],
        messages: [{ messageId: 'message-retained', sessionId: rootSessionId, turnId: 'turn-retained', role: 'user', createdAt: now,
          parts: [{ type: 'text', partId: 'part-retained', content: 'Retained fixture prompt' }] }],
      } });
    }
    send({ type: 'ready', workerGeneration: message.workerGeneration });
    return;
  }
  if (message.type === 'operation') {
    const operation = message.operation;
    if (operation?.type === 'shell' && operation.operation?.type === 'snapshot') {
      const running = Date.now() < shellJobUntil ? [{
        jobId: 'shell-job-fixture', sessionId: rootSessionId, epoch: 'fixture-epoch', workerGeneration: message.workerGeneration,
        workspaceId: 'workspace', projectId: 'project', command: 'sleep 1', background: true,
        startedAt: now, outputCursor: '0', status: 'running',
      }] : [];
      const result = { type: 'shell', result: { type: 'snapshot', snapshot: {
        scope: { kind: 'session', sessionId: rootSessionId }, epoch: 'fixture-epoch', revision: '0',
        running, ended: [], recovery: { priorEpochs: 'invalidated' },
      } } };
      const delay = Number(process.env.WORKER_OPERATION_DELAY_MS ?? '0');
      setTimeout(() => send({ type: 'result', workerGeneration: message.workerGeneration, commandId: message.commandId, result }), delay);
      return;
    }
    send({ type: 'operation.error', workerGeneration: message.workerGeneration, commandId: message.commandId, code: 'NOT_IMPLEMENTED', status: 501, detail: 'The fixture worker does not implement this operation' });
    return;
  }
  if (message.type === 'stop') process.exit(0);
});
process.on('disconnect', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
