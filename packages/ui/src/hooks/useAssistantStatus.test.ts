import { describe, expect, test } from 'bun:test';
import type { Message, Part, ToolStatus } from '@openchamber/agent-contract';

import { createParsedStatus, getActiveAssistantContext, retryInfoOf } from './useAssistantStatus';

const userMessage = (messageId: string): Message => ({
    messageId,
    role: 'user',
    sessionId: 'ses_1',
    turnId: `turn_${messageId}`,
    createdAt: 1,
    parts: [],
});

const assistantMessage = (messageId: string, providerId: string, modelId: string): Message => {
    const message: Message = {
        messageId,
        role: 'assistant',
        sessionId: 'ses_1',
        turnId: `turn_${messageId}`,
        createdAt: 2,
        parts: [],
    };
    if (providerId) message.providerId = providerId;
    if (modelId) message.modelId = modelId;
    return message;
};

const systemMessage = (messageId: string): Message => ({
    messageId,
    role: 'system',
    sessionId: 'ses_1',
    turnId: `turn_${messageId}`,
    createdAt: 3,
    parts: [],
});

describe('getActiveAssistantContext', () => {
    test('keeps the model when plumbing messages land after the assistant', () => {
        const assistant = assistantMessage('assistant_1', 'anthropic', 'claude-opus-4-1');

        expect(getActiveAssistantContext([userMessage('user_1'), assistant, systemMessage('system_1')])).toEqual({
            assistantId: assistant.messageId,
            model: {
                providerId: 'anthropic',
                modelId: 'claude-opus-4-1',
            },
        });
    });

    test('does not guess a model when a newer prompt follows', () => {
        const prompt = userMessage('user_1');
        const assistant = assistantMessage('assistant_1', 'anthropic', 'claude-opus-4-1');
        const laterPrompt = userMessage('user_2');

        expect(getActiveAssistantContext([prompt, assistant, laterPrompt])).toEqual({
            assistantId: assistant.messageId,
            model: null,
        });
    });

    test('follows the newer assistant message when the model changed mid-session', () => {
        const firstUser = userMessage('user_1');
        const firstAssistant = assistantMessage('assistant_1', 'anthropic', 'claude-opus-4-1');
        const secondUser = userMessage('user_2');
        const secondAssistant = assistantMessage('assistant_2', 'openai', 'gpt-5.6-sol');

        expect(getActiveAssistantContext([firstUser, firstAssistant, secondUser, secondAssistant])).toEqual({
            assistantId: secondAssistant.messageId,
            model: {
                providerId: 'openai',
                modelId: 'gpt-5.6-sol',
            },
        });
    });

    test('does not guess a model when the assistant message records none', () => {
        const assistant = assistantMessage('assistant_1', '', '');

        expect(getActiveAssistantContext([assistant])).toEqual({
            assistantId: assistant.messageId,
            model: null,
        });
    });

    test('reports no assistant when the session has only prompts', () => {
        expect(getActiveAssistantContext([userMessage('user_1')])).toEqual({
            assistantId: null,
            model: null,
        });
    });

    test('does not guess a model for a newer prompt when completion is not represented', () => {
        const previousAssistant = assistantMessage('assistant_1', 'anthropic', 'claude-opus-4-1');
        const messages = [userMessage('user_1'), previousAssistant, userMessage('user_2')];

        expect(getActiveAssistantContext(messages, { providerId: 'openai', modelId: 'gpt-5.6-sol' })).toEqual({
            assistantId: previousAssistant.messageId,
            model: null,
        });
    });

    test('does not guess an active model when a prompt is queued behind an assistant', () => {
        const running = assistantMessage('assistant_1', 'anthropic', 'claude-opus-4-1');

        expect(getActiveAssistantContext([userMessage('user_1'), running, userMessage('user_2')])).toEqual({
            assistantId: running.messageId,
            model: null,
        });
    });
});


describe('createParsedStatus', () => {
    const toolState = (status: 'running' | 'pending' | 'completed' | 'failed'): ToolStatus => status === 'pending' ? 'pending_approval' : status;

    const tool = (id: string, name: string, status: 'running' | 'pending' | 'completed' | 'failed' = 'running', input: Part extends never ? never : Record<string, string> = {}): Part => ({
        type: 'tool_call',
        partId: id,
        toolCallId: `call_${id}`,
        toolName: name,
        input,
        status: toolState(status),
    });

    const statusOf = (parts: Part[]) => createParsedStatus(parts);

    test('a running call reads as its intent, exactly as the harness wrote it', () => {
        expect(statusOf([tool('1', 'read', 'running', { i: 'Checking the parser...' })]).status).toEqual({
            key: 'chat.agentStatus.usingTool',
            name: 'Read',
            text: 'Checking the parser',
        });
    });

    test('without an intent the call describes its own target', () => {
        expect(statusOf([tool('1', 'read', 'running', { path: 'src/main.ts' })]).status).toEqual({
            key: 'chat.agentStatus.usingTool',
            name: 'Read',
            text: 'src/main.ts',
        });
        expect(statusOf([tool('1', 'bash', 'running', { command: 'bun test' })]).status).toEqual({
            key: 'chat.agentStatus.usingTool',
            name: 'Bash',
            text: 'bun test',
        });
    });

    test('the newest unfinished call owns the line', () => {
        expect(statusOf([tool('1', 'read', 'running', { i: 'Reading the index' }), tool('2', 'bash', 'running', { i: 'Running tests' })]).status.text).toBe('Running tests');
        expect(statusOf([tool('1', 'read', 'running', { i: 'Reading the index' }), tool('2', 'bash', 'completed')]).status.text).toBe('Reading the index');
    });

    test('finished calls leave the plain working line', () => {
        expect(statusOf([tool('1', 'read', 'completed')]).status).toEqual({ key: 'chat.agentStatus.working' });
        expect(statusOf([tool('2', 'bash', 'failed')]).status).toEqual({ key: 'chat.agentStatus.working' });
    });

    test('live reasoning with no intent reads as thinking', () => {
        expect(statusOf([{ type: 'reasoning', partId: 'reason_1', content: 'weighing options' }]).status).toEqual({ key: 'chat.agentStatus.thinking' });
        expect(statusOf([{ type: 'reasoning', partId: 'reason_1', content: 'weighing options' }]).isAnswering).toBe(false);
    });

    test('text after reasoning is the answer, not thinking', () => {
        expect(statusOf([
            { type: 'reasoning', partId: 'reason_1', content: 'weighing options' },
            { type: 'text', partId: 'text_1', content: 'Here it is.' },
        ]).status).toEqual({ key: 'chat.agentStatus.working' });
    });

    test('an unknown extension tool still names itself', () => {
        expect(statusOf([tool('1', 'mcp__srv_custom')]).status).toEqual({ key: 'chat.agentStatus.usingTool', name: 'mcp__srv_custom' });
        expect(statusOf([tool('1', 'mcp__srv_custom')]).isAnswering).toBe(false);
    });
});

describe('retryInfoOf', () => {
    const retryNotice = (attempt: number, delayMs: number): Part => ({
        type: 'notice',
        partId: `notice_${attempt}`,
        noticeType: 'auto_retry_start',
        level: 'warning',
        details: { attempt, maxAttempts: 5, delayMs, errorMessage: 'overloaded' },
    });

    test('a trailing retry notice reports its attempt and delay', () => {
        expect(retryInfoOf([retryNotice(2, 4000)])).toEqual({ attempt: 2, next: 4000 });
    });

    test('work after the notice means the retry already ran', () => {
        expect(retryInfoOf([retryNotice(2, 4000), { type: 'text', partId: 'text_1', content: 'back' }])).toBeNull();
    });
});
