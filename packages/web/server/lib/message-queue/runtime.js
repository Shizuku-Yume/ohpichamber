import { randomUUID } from 'node:crypto';
import {
  ProblemCodeSchema, ProblemDetailsSchema, QueueAppendRequestSchema,
  QueueDeleteRequestSchema, QueueReorderRequestSchema, QueueStateSchema,
} from '@openchamber/agent-contract';
import { createCanonicalQueueRuntime } from './canonical-runtime.js';
import { createPromptQueueStore, PromptQueueError } from './sqlite-store.js';

/**
 * Canonical queue construction is deliberately split from Host composition:
 * SQLite owns durable queue state and the OMP service owns execution admission.
 */
export { createCanonicalQueueRuntime, createPromptQueueStore };
const scopeFor = async (resolveSessionScope, sessionId) => {
  const scope = await resolveSessionScope(sessionId);
  if (!scope || scope.sessionId !== sessionId) throw new PromptQueueError('SESSION_NOT_FOUND', 404, 'Session scope is not available');
  return scope;
};

const respondError = (res, error, fallback) => {
  const status = Number.isInteger(error?.status) ? error.status : (error?.name === 'ZodError' ? 400 : 500);
  const parsedCode = ProblemCodeSchema.safeParse(error?.code);
  const code = parsedCode.success ? parsedCode.data : status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR';
  const detail = error instanceof PromptQueueError ? error.message : fallback;
  const problem = ProblemDetailsSchema.parse({
    type: `urn:ohpichamber:problem:${code}`, title: detail, status, detail, code,
    retryable: status >= 500,
    ...(error instanceof PromptQueueError && error.details ? { details: error.details } : {}),
  });
  res.status(status).type('application/problem+json').json(problem);
};

export function toServerSession(queueState, scope) {
  const leasedItem = queueState.items?.find((item) => item.status === 'leased');
  const sendingId = leasedItem ? leasedItem.queueItemId : null;
  const items = (queueState.items || []).map((item) => ({
    id: item.queueItemId,
    createdAt: item.createdAt,
    content: item.content,
    text: item.text,
    agentMention: item.agentMention?.agentId,
    attachments: (item.attachments || []).map((att) => ({
      id: att.attachmentId,
      filename: att.name,
      mimeType: att.mediaType,
      size: att.size,
      source: 'server',
      serverPath: att.uri,
    })),
    context: (item.context || []).map((ctx) => ({
      kind: ctx.kind,
      text: ctx.text,
      metadata: ctx.metadata,
      instructions: ctx.hasInstructions ? '' : undefined,
    })),
    contextPreview: item.contextPreview,
    sendConfig: {
      providerID: item.options?.providerId || '',
      modelID: item.options?.modelId || '',
      agent: item.options?.agentId || undefined,
      variant: item.options?.variant || undefined,
    },
  }));
  return {
    sessionId: queueState.sessionId,
    directory: scope?.cwd || scope?.directory || '',
    items,
    sendingId,
  };
}

const appendInput = (body, currentRevision = '0') => {
  if (body?.item) {
    const item = body.item;
    const commandId = body.commandId ?? item.id ?? randomUUID();
    const attachments = (item.attachments || []).map((att) => {
      const id = att.id || randomUUID();
      return {
        attachmentId: id,
        name: att.filename || 'attachment',
        mediaType: att.mimeType || 'text/plain',
        size: att.size || 0,
        uri: att.serverPath || `attachment://${id}`,
      };
    });
    const context = (item.context || []).map((ctx) => {
      if (ctx.kind === 'instruction') {
        return { kind: 'instruction', text: ctx.text || '' };
      }
      if (ctx.kind === 'synthetic') {
        return { kind: 'synthetic', text: ctx.text || '' };
      }
      return {
        kind: 'context',
        text: ctx.text || '',
        metadata: (ctx.metadata && typeof ctx.metadata === 'object') ? ctx.metadata : {},
        ...(ctx.instructions ? { instructions: ctx.instructions } : {}),
      };
    });
    const request = {
      expectedRevision: String(body.expectedRevision ?? currentRevision),
      content: item.content || '',
      ...(item.contextPreview ? { contextPreview: item.contextPreview } : {}),
      request: {
        input: {
          text: item.text ?? item.content ?? '',
          attachments,
          context,
          ...(item.agentMention ? { agentMention: { agentId: item.agentMention } } : {}),
        },
        options: {
          providerId: item.sendConfig?.providerID || null,
          modelId: item.sendConfig?.modelID || null,
          agentId: item.sendConfig?.agent || null,
          variant: item.sendConfig?.variant || null,
          reasoningEffort: null,
        },
      },
    };
    return { commandId, request: QueueAppendRequestSchema.parse(request), isUiShape: true };
  }
  const { commandId, ...request } = body || {};
  return { commandId, request: QueueAppendRequestSchema.parse(request), isUiShape: false };
};

const deleteInput = (body, queueItemId, currentRevision = '0') => {
  const request = QueueDeleteRequestSchema.parse({
    expectedRevision: String(body?.expectedRevision ?? currentRevision),
    queueItemId,
  });
  if (body?.queueItemId !== undefined && body.queueItemId !== queueItemId) {
    throw new PromptQueueError('INVALID_REQUEST', 400, 'Queue item identity must match its route');
  }
  return request;
};

/**
 * Host product routes for the canonical queue. The request body is the
 * canonical QueueAppend/QueueReorder/Delete DTO; this layer never translates
 * OpenCode-shaped inputs or manufactures a model selection.
 */
export function registerMessageQueueRoutes(app, runtime, { resolveSessionScope, listQueueScopes } = {}) {
  if (typeof resolveSessionScope !== 'function') throw new TypeError('resolveSessionScope is required');
  if (typeof listQueueScopes !== 'function') throw new TypeError('listQueueScopes is required');

  app.get('/api/message-queue', async (_req, res) => {
    try {
      const listed = await listQueueScopes();
      if (!listed || !Array.isArray(listed.items) || !Array.isArray(listed.errors)) throw new PromptQueueError('INTERNAL_ERROR', 503, 'Queue scope listing is unavailable');
      const items = [];
      const sessions = [];
      let maxRevision = 0;
      const errors = listed.errors.map((error) => ({ code: ProblemCodeSchema.safeParse(error?.code).success ? error.code : 'INTERNAL_ERROR' }));
      for (const scope of listed.items) {
        try {
          const state = QueueStateSchema.parse(await runtime.getState(scope));
          items.push(state);
          const rev = Number(state.revision) || 0;
          if (rev > maxRevision) maxRevision = rev;
          sessions.push(toServerSession(state, scope));
        } catch (error) {
          errors.push({ code: ProblemCodeSchema.safeParse(error?.code).success ? error.code : 'INTERNAL_ERROR' });
        }
      }
      res.json({ revision: maxRevision, sessions, items, errors });
    } catch (error) { respondError(res, error, 'Failed to load message queue'); }
  });

  app.post('/api/message-queue/sessions/:sessionId/items', async (req, res) => {
    try {
      const scope = await scopeFor(resolveSessionScope, req.params.sessionId);
      const currentState = await runtime.getState(scope);
      const { commandId: bodyCommandId, request, isUiShape } = appendInput(req.body, currentState.revision);
      const commandId = bodyCommandId ?? req.get('Idempotency-Key') ?? randomUUID();
      const nextState = QueueStateSchema.parse(await runtime.append(scope, commandId, request));
      if (isUiShape) {
        res.json({
          revision: Number(nextState.revision) || 0,
          session: toServerSession(nextState, scope),
        });
      } else {
        res.json(nextState);
      }
    } catch (error) { respondError(res, error, 'Failed to queue message'); }
  });

  app.put('/api/message-queue/sessions/:sessionId/order', async (req, res) => {
    try {
      const scope = await scopeFor(resolveSessionScope, req.params.sessionId);
      res.json(QueueStateSchema.parse(await runtime.reorder(scope, QueueReorderRequestSchema.parse(req.body))));
    } catch (error) { respondError(res, error, 'Failed to reorder queue'); }
  });

  app.delete('/api/message-queue/sessions/:sessionId/items/:itemId', async (req, res) => {
    try {
      const scope = await scopeFor(resolveSessionScope, req.params.sessionId);
      const currentState = await runtime.getState(scope);
      const nextState = QueueStateSchema.parse(await runtime.remove(scope, deleteInput(req.body, req.params.itemId, currentState.revision)));
      res.json({
        revision: Number(nextState.revision) || 0,
        session: toServerSession(nextState, scope),
      });
    } catch (error) { respondError(res, error, 'Failed to remove queued message'); }
  });

  app.post('/api/message-queue/sessions/:sessionId/items/:itemId/take', async (req, res) => {
    try {
      const scope = await scopeFor(resolveSessionScope, req.params.sessionId);
      const currentState = await runtime.getState(scope);
      const targetItem = currentState.items?.find((item) => item.queueItemId === req.params.itemId);
      const nextState = QueueStateSchema.parse(await runtime.remove(scope, deleteInput(req.body, req.params.itemId, currentState.revision)));
      const session = toServerSession(nextState, scope);
      const item = targetItem ? toServerSession({ ...currentState, items: [targetItem] }, scope).items[0] : null;
      res.json({
        revision: Number(nextState.revision) || 0,
        session,
        item,
      });
    } catch (error) { respondError(res, error, 'Failed to take queued message'); }
  });

  app.post('/api/message-queue/sessions/:sessionId/take', async (req, res) => {
    try {
      const scope = await scopeFor(resolveSessionScope, req.params.sessionId);
      const currentState = await runtime.getState(scope);
      const unleased = (currentState.items || []).filter((item) => item.status !== 'leased');
      let nextState = currentState;
      for (const item of unleased) {
        nextState = QueueStateSchema.parse(await runtime.remove(scope, deleteInput(req.body, item.queueItemId, nextState.revision)));
      }
      const session = toServerSession(nextState, scope);
      const items = toServerSession({ ...currentState, items: unleased }, scope).items;
      res.json({
        revision: Number(nextState.revision) || 0,
        session,
        items,
      });
    } catch (error) { respondError(res, error, 'Failed to take queued messages'); }
  });

  app.delete('/api/message-queue/sessions/:sessionId', async (req, res) => {
    try {
      const scope = await scopeFor(resolveSessionScope, req.params.sessionId);
      const currentState = await runtime.getState(scope);
      const unleased = (currentState.items || []).filter((item) => item.status !== 'leased');
      let nextState = currentState;
      for (const item of unleased) {
        nextState = QueueStateSchema.parse(await runtime.remove(scope, deleteInput(req.body, item.queueItemId, nextState.revision)));
      }
      res.json({
        revision: Number(nextState.revision) || 0,
        session: toServerSession(nextState, scope),
      });
    } catch (error) { respondError(res, error, 'Failed to clear queue'); }
  });

  app.put('/api/message-queue/sessions/:sessionId/hold', async (req, res) => {
    try {
      const scope = await scopeFor(resolveSessionScope, req.params.sessionId);
      res.json(runtime.setHold(scope, req.body?.held, req.body?.ttlMs));
    } catch (error) { respondError(res, error, 'Failed to update queue hold'); }
  });
}
export function registerCanonicalQueueRoutes(router, runtime, { resolveSessionScope } = {}) {
  if (typeof resolveSessionScope !== 'function') throw new TypeError('resolveSessionScope is required');
  const scope = (id) => scopeFor(resolveSessionScope, id);
  router.get('/sessions/:sessionId/queue', async (req, res) => { try { res.json(QueueStateSchema.parse(await runtime.getState(await scope(req.params.sessionId)))); } catch (error) { respondError(res, error, 'Failed to load prompt queue'); } });
  router.post('/sessions/:sessionId/queue', async (req, res) => { try { const { commandId: bodyCommandId, request } = appendInput(req.body); const commandId = bodyCommandId ?? req.get('Idempotency-Key'); res.json(QueueStateSchema.parse(await runtime.append(await scope(req.params.sessionId), commandId, request))); } catch (error) { respondError(res, error, 'Failed to append prompt queue'); } });
  router.put('/sessions/:sessionId/queue/order', async (req, res) => { try { res.json(QueueStateSchema.parse(await runtime.reorder(await scope(req.params.sessionId), QueueReorderRequestSchema.parse(req.body)))); } catch (error) { respondError(res, error, 'Failed to reorder prompt queue'); } });
  router.delete('/sessions/:sessionId/queue/:queueItemId', async (req, res) => { try { res.json(QueueStateSchema.parse(await runtime.remove(await scope(req.params.sessionId), deleteInput(req.body, req.params.queueItemId)))); } catch (error) { respondError(res, error, 'Failed to remove prompt queue item'); } });
}
