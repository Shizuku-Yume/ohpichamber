import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AssistantMessage } from '@oh-my-pi/pi-ai';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import type { AgentSessionEvent } from '@oh-my-pi/pi-coding-agent/session/agent-session-events';
import type { CompactionNoticePart, NoticePart } from '@openchamber/agent-contract';
import { WorkerProjection } from './projection.ts';

const cleanupDirs: string[] = [];
afterEach(async () => {
  await Promise.all(cleanupDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function createTestManager(): Promise<{ manager: SessionManager; dir: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'omp-projection-notices-'));
  cleanupDirs.push(dir);
  const manager = SessionManager.create(dir, dir);
  await manager.ensureOnDisk();
  return { manager, dir };
}

function user(content: string, timestamp: number) {
  return { role: 'user' as const, content, timestamp };
}

function assistant(
  content: AssistantMessage['content'],
  stopReason: AssistantMessage['stopReason'],
  timestamp: number,
  options?: {
    model?: string;
    upstreamModel?: string;
    usage?: AssistantMessage['usage'];
  },
): AssistantMessage & { upstreamModel?: string } {
  return {
    role: 'assistant',
    content,
    api: 'openai-completions',
    provider: 'fixture',
    model: options?.model ?? 'gpt-6.1-sol',
    upstreamModel: options?.upstreamModel,
    stopReason,
    timestamp,
    usage: options?.usage ?? {
      input: 10,
      output: 10,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 20,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
  };
}

describe('WorkerProjection notices and compaction integration', () => {
  test('projects todo_reminder live and survives cold restore from disk', async () => {
    const { manager, dir } = await createTestManager();
    const sessionId = manager.getSessionId();
    const projection = new WorkerProjection(manager, sessionId);

    projection.beginRun('run-1', 1000);
    const userMsg = user('task prompt', 1000);
    manager.appendMessage(userMsg);
    projection.consume({ type: 'message_start', message: userMsg });

    const assistantMsg = assistant([{ type: 'text', text: 'Working on task' }], 'stop', 1001);
    manager.appendMessage(assistantMsg);
    projection.consume({ type: 'message_start', message: assistantMsg });
    projection.consume({ type: 'message_end', message: assistantMsg });
    projection.consume({ type: 'turn_end', message: assistantMsg, toolResults: [] });
    projection.bindPending();

    // Ingest todo_reminder after turn_end
    const reminderEvent: AgentSessionEvent = {
      type: 'todo_reminder',
      attempt: 1,
      maxAttempts: 3,
      todos: [
        { content: 'Verify timeline notice cards', status: 'in_progress' },
        { content: 'Check compaction ratio', status: 'pending' },
      ],
    };

    const outputs = projection.consume(reminderEvent);
    const started = outputs.find(o => o.event.type === 'part.started' && o.event.part.type === 'notice');
    expect(started).toBeDefined();
    if (started?.event.type === 'part.started' && started.event.part.type === 'notice') {
      expect(started.event.part.noticeType).toBe('todo_reminder');
      expect(started.event.part.level).toBe('warning');
      if (started.event.part.noticeType === 'todo_reminder') {
        expect(started.event.part.details.todos).toHaveLength(2);
      }
    }

    await manager.flush();

    // Cold restore from disk via fresh SessionManager & WorkerProjection
    const file = manager.getSessionFile();
    expect(file).toBeDefined();
    const reopened = await SessionManager.open(file!, dir, undefined, { initialCwd: dir, throwIfMissing: true });
    try {
      const restored = new WorkerProjection(reopened, sessionId).seed();
      const assistantMessage = restored.messages.find(m => m.role === 'assistant');
      expect(assistantMessage).toBeDefined();
      const noticeParts = (assistantMessage?.parts.filter(p => p.type === 'notice') ?? []) as NoticePart[];
      expect(noticeParts.some(p => p.noticeType === 'todo_reminder')).toBe(true);
      const reminderPart = noticeParts.find(p => p.noticeType === 'todo_reminder');
      if (reminderPart && reminderPart.noticeType === 'todo_reminder') {
        expect(reminderPart.details.todos).toHaveLength(2);
        expect(reminderPart.details.todos[0]?.content).toBe('Verify timeline notice cards');
      }
    } finally {
      await reopened.close();
    }
  });

  test('pre-message notice buffers live and attaches to first message on disk reload', async () => {
    const { manager, dir } = await createTestManager();
    const sessionId = manager.getSessionId();
    const projection = new WorkerProjection(manager, sessionId);

    projection.beginRun('run-pre', 500);

    // Notice ingested before any message exists
    const preNoticeEvent: AgentSessionEvent = {
      type: 'auto_retry_start',
      attempt: 1,
      maxAttempts: 3,
      delayMs: 1000,
      errorMessage: 'Network blip before first prompt',
    };
    const preOutputs = projection.consume(preNoticeEvent);
    // Buffered: no active message to attach to yet
    expect(preOutputs.filter(o => o.event.type === 'part.started')).toHaveLength(0);

    // First user message arrives
    const userMsg = user('hello', 1000);
    manager.appendMessage(userMsg);
    const startOutputs = projection.consume({ type: 'message_start', message: userMsg });
    // Live flush: pre-message notice is emitted onto the newly admitted message
    const flushedNotice = startOutputs.find(o => o.event.type === 'part.started' && o.event.part.type === 'notice');
    expect(flushedNotice).toBeDefined();

    projection.consume({ type: 'message_end', message: userMsg });
    projection.bindPending();
    await manager.flush();

    // Cold restore from disk: unassociated notice is restored on the first admitted message
    const file = manager.getSessionFile();
    expect(file).toBeDefined();
    const reopened = await SessionManager.open(file!, dir, undefined, { initialCwd: dir, throwIfMissing: true });
    try {
      const restored = new WorkerProjection(reopened, sessionId).seed();
      const firstMessage = restored.messages[0];
      expect(firstMessage).toBeDefined();
      const noticePart = firstMessage?.parts.find((p): p is NoticePart => p.type === 'notice');
      expect(noticePart).toBeDefined();
      if (noticePart && noticePart.type === 'notice') {
        expect(noticePart.noticeType).toBe('auto_retry_start');
      }
    } finally {
      await reopened.close();
    }
  });

  test('interleaves notices with toolcalls without index collisions', async () => {
    const { manager } = await createTestManager();
    const sessionId = manager.getSessionId();
    const projection = new WorkerProjection(manager, sessionId);

    projection.beginRun('run-2', 2000);
    const userMsg = user('execute tools', 2000);
    manager.appendMessage(userMsg);
    projection.consume({ type: 'message_start', message: userMsg });

    const assistantMsg = assistant([], 'stop', 2001);
    manager.appendMessage(assistantMsg);
    projection.consume({ type: 'message_start', message: assistantMsg });

    // Tool call 1
    projection.consume({
      type: 'message_update',
      message: assistantMsg,
      assistantMessageEvent: {
        type: 'toolcall_start',
        contentIndex: 0,
        partial: {
          ...assistantMsg,
          content: [{ type: 'toolCall', id: 'call_1', name: 'read', arguments: { path: 'a.txt' } }],
        },
      },
    });

    // Ingest auto_retry notice mid-message
    const retryEvent: AgentSessionEvent = {
      type: 'auto_retry_start',
      attempt: 2,
      maxAttempts: 3,
      delayMs: 1000,
      errorMessage: 'Rate limit encountered',
    };
    const noticeOutputs = projection.consume(retryEvent);
    const noticeStarted = noticeOutputs.find(o => o.event.type === 'part.started' && o.event.part.type === 'notice');
    expect(noticeStarted).toBeDefined();

    // Tool call 2
    const tool2Outputs = projection.consume({
      type: 'message_update',
      message: assistantMsg,
      assistantMessageEvent: {
        type: 'toolcall_start',
        contentIndex: 1,
        partial: {
          ...assistantMsg,
          content: [
            { type: 'toolCall', id: 'call_1', name: 'read', arguments: { path: 'a.txt' } },
            { type: 'toolCall', id: 'call_2', name: 'write', arguments: { path: 'b.txt' } },
          ],
        },
      },
    });

    const tool2Started = tool2Outputs.find(o => o.event.type === 'part.started');
    expect(tool2Started).toBeDefined();
    if (tool2Started?.event.type === 'part.started') {
      expect(tool2Started.event.part.type).toBe('tool_call');
    }
  });

  test('projects cache invalidation across disk when cacheRead drops and cacheWrite > 0', async () => {
    const { manager, dir } = await createTestManager();
    const sessionId = manager.getSessionId();
    const projection = new WorkerProjection(manager, sessionId);

    projection.beginRun('run-cache', 3000);
    const userMsg1 = user('first query', 3000);
    manager.appendMessage(userMsg1);
    projection.consume({ type: 'message_start', message: userMsg1 });
    projection.consume({ type: 'message_end', message: userMsg1 });

    // Assistant 1: establishes warm cache with cacheRead: 4096
    const assistantMsg1 = assistant([{ type: 'text', text: 'first answer' }], 'stop', 3001, {
      usage: {
        input: 100,
        output: 50,
        cacheRead: 4096,
        cacheWrite: 0,
        totalTokens: 4246,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
    });
    manager.appendMessage(assistantMsg1);
    projection.consume({ type: 'message_start', message: assistantMsg1 });
    projection.consume({ type: 'message_end', message: assistantMsg1 });
    projection.consume({ type: 'turn_end', message: assistantMsg1, toolResults: [] });

    const userMsg2 = user('second query after edit', 3002);
    manager.appendMessage(userMsg2);
    projection.consume({ type: 'message_start', message: userMsg2 });
    projection.consume({ type: 'message_end', message: userMsg2 });

    // Assistant 2: cache invalidated! cacheRead dropped from 4096 to 0, cacheWrite is 3500, input is 200
    const assistantMsg2 = assistant([{ type: 'text', text: 'second answer' }], 'stop', 3003, {
      usage: {
        input: 200,
        output: 50,
        cacheRead: 0,
        cacheWrite: 3500,
        totalTokens: 3750,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
    });
    manager.appendMessage(assistantMsg2);
    projection.consume({ type: 'message_start', message: assistantMsg2 });
    const msg2EndOutputs = projection.consume({ type: 'message_end', message: assistantMsg2 });
    projection.consume({ type: 'turn_end', message: assistantMsg2, toolResults: [] });
    projection.bindPending();

    // Verify live emission
    const cacheNoticeLive = msg2EndOutputs.find(
      o => o.event.type === 'part.started' && o.event.part.type === 'notice' && (o.event.part as NoticePart).noticeType === 'cache_invalidation',
    );
    expect(cacheNoticeLive).toBeDefined();
    if (cacheNoticeLive?.event.type === 'part.started' && cacheNoticeLive.event.part.type === 'notice') {
      const part = cacheNoticeLive.event.part as NoticePart;
      if (part.noticeType === 'cache_invalidation') {
        expect(part.details.reprocessedTokens).toBe(3700);
      }
    }

    await manager.flush();

    // Verify cold reload from disk retains the cache_invalidation notice
    const file = manager.getSessionFile();
    expect(file).toBeDefined();
    const reopened = await SessionManager.open(file!, dir, undefined, { initialCwd: dir, throwIfMissing: true });
    try {
      const restored = new WorkerProjection(reopened, sessionId).seed();
      const assistantMessages = restored.messages.filter(m => m.role === 'assistant');
      expect(assistantMessages.length).toBeGreaterThanOrEqual(2);
      const secondAssistant = assistantMessages[1];
      expect(secondAssistant).toBeDefined();
      const cacheNotice = secondAssistant?.parts.find(
        (p): p is NoticePart => p.type === 'notice' && (p as NoticePart).noticeType === 'cache_invalidation',
      );
      expect(cacheNotice).toBeDefined();
      if (cacheNotice && cacheNotice.type === 'notice' && cacheNotice.noticeType === 'cache_invalidation') {
        expect(cacheNotice.details.reprocessedTokens).toBe(3700);
      }
    } finally {
      await reopened.close();
    }
  });

  test('projects served model mismatch notice live and across cold disk reload', async () => {
    const { manager, dir } = await createTestManager();
    const sessionId = manager.getSessionId();
    const projection = new WorkerProjection(manager, sessionId);

    projection.beginRun('run-mismatch', 4000);
    const userMsg = user('start', 4000);
    manager.appendMessage(userMsg);
    projection.consume({ type: 'message_start', message: userMsg });

    // Assistant message with served_model_mismatch (upstreamModel != model)
    const assistantMsg = assistant([{ type: 'text', text: 'response' }], 'stop', 4001, {
      model: 'gpt-6.1-sol',
      upstreamModel: 'gpt-6.1-terra',
    });
    manager.appendMessage(assistantMsg);
    projection.consume({ type: 'message_start', message: assistantMsg });
    const msgEndOutputs = projection.consume({ type: 'message_end', message: assistantMsg });
    const mismatchNotice = msgEndOutputs.find(
      o => o.event.type === 'part.started' && o.event.part.type === 'notice' && (o.event.part as NoticePart).noticeType === 'served_model_mismatch',
    );
    expect(mismatchNotice).toBeDefined();
    projection.bindPending();
    await manager.flush();

    // Cold reload from disk
    const file = manager.getSessionFile();
    expect(file).toBeDefined();
    const reopened = await SessionManager.open(file!, dir, undefined, { initialCwd: dir, throwIfMissing: true });
    try {
      const restored = new WorkerProjection(reopened, sessionId).seed();
      const assistantMessage = restored.messages.find(m => m.role === 'assistant');
      expect(assistantMessage).toBeDefined();
      const noticePart = assistantMessage?.parts.find(
        (p): p is NoticePart => p.type === 'notice' && (p as NoticePart).noticeType === 'served_model_mismatch',
      );
      expect(noticePart).toBeDefined();
      if (noticePart && noticePart.type === 'notice' && noticePart.noticeType === 'served_model_mismatch') {
        expect(noticePart.details.requested).toBe('gpt-6.1-terra');
        expect(noticePart.details.served).toBe('gpt-6.1-sol');
      }
    } finally {
      await reopened.close();
    }
  });

  test('restores compaction divider with method, tokensBefore/After, and summary from real manager.appendCompaction', async () => {
    const { manager, dir } = await createTestManager();
    const sessionId = manager.getSessionId();

    const userMsg = user('long conversation needing compaction', 5000);
    manager.appendMessage(userMsg);

    const assistantMsg = assistant([{ type: 'text', text: 'detailed multi-step plan' }], 'stop', 5001);
    const assistantEntryId = manager.appendMessage(assistantMsg);

    // Call real SessionManager.prototype.appendCompaction API
    manager.appendCompaction(
      'Summarized 120,000 tokens of past turns down to key decisions and current tasks.',
      'Compacted past context',
      assistantEntryId,
      120000,
      {
        tokensAfter: 32000,
        method: 'soft',
      },
    );

    const followUpUser = user('continue with next phase', 6000);
    manager.appendMessage(followUpUser);

    await manager.flush();

    // Cold reload from disk
    const file = manager.getSessionFile();
    expect(file).toBeDefined();
    const reopened = await SessionManager.open(file!, dir, undefined, { initialCwd: dir, throwIfMissing: true });
    try {
      const restored = new WorkerProjection(reopened, sessionId).seed();
      expect(restored.messages.length).toBeGreaterThanOrEqual(3);

      const compactionMessage = restored.messages.find(m =>
        m.parts.some(p => p.type === 'notice' && (p as NoticePart).noticeType === 'compaction'),
      );
      expect(compactionMessage).toBeDefined();

      const compactionPart = compactionMessage?.parts.find(
        (p): p is CompactionNoticePart => p.type === 'notice' && (p as NoticePart).noticeType === 'compaction',
      );
      expect(compactionPart).toBeDefined();
      expect(compactionPart?.details.tokensBefore).toBe(120000);
      expect(compactionPart?.details.tokensAfter).toBe(32000);
      expect(compactionPart?.details.method).toBe('soft-compacted');
      expect(compactionPart?.details.summary).toBe(
        'Summarized 120,000 tokens of past turns down to key decisions and current tasks.',
      );
    } finally {
      await reopened.close();
    }
  });
});
