import { afterAll, afterEach, expect, spyOn, test } from 'bun:test';
import React, { act } from 'react';
import { Window } from 'happy-dom';
import type { Session } from '@openchamber/agent-contract';
import type { Root } from 'react-dom/client';
import type { TodoSendExecution } from '../TodoSendDialog';

const browser = new Window({ url: 'http://runtime.test' });
const descriptors = new Map<string, PropertyDescriptor | undefined>();
for (const [name, value] of Object.entries({
  window: browser, document: browser.document, navigator: browser.navigator,
  localStorage: browser.localStorage, HTMLElement: browser.HTMLElement,
  Element: browser.Element, Node: browser.Node, ResizeObserver: browser.ResizeObserver,
  MutationObserver: browser.MutationObserver, getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser), IS_REACT_ACT_ENVIRONMENT: true,
})) {
  descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

// The stores and components read browser globals at import time.
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { switchRuntimeEndpoint } = await import('@/lib/runtime-switch');
const { useSessionUIStore } = await import('@/sync/session-ui-store');
const worktreeSessionCreator = await import('@/lib/worktreeSessionCreator');
const { useProjectTodoSend } = await import('./useProjectTodoSend');
const host = document.createElement('div');
document.body.append(host);
let root: Root | null = null;
const originalState = useSessionUIStore.getState();
const spies: Array<{ mockRestore(): void }> = [];
let action: { sendToNewSession: (id: string, text: string) => void; sendToNewWorktreeSession: (id: string, text: string) => void; confirmSend: (execution: TodoSendExecution) => Promise<void> };

function Harness() {
  action = useProjectTodoSend({ projectRef: { id: 'project', path: '/repo' }, canCreateWorktree: true });
  return null;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  useSessionUIStore.setState(originalState);
  for (const spy of spies.splice(0).reverse()) spy.mockRestore();
});
afterAll(async () => {
  await browser.happyDOM.close();
  for (const [name, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

test('new-session todo sends project overrides from one snapshot, not global prompts', async () => {
  switchRuntimeEndpoint({ apiBaseUrl: 'http://runtime.test', runtimeKey: 'todo-prompt-test' });
  const session: Session = { sessionId: 'todo-session', rootSessionId: 'todo-session', projectId: 'project', workspaceId: 'workspace', displayPath: '.', createdAt: 1, updatedAt: 1, epoch: 'epoch', headSequence: '0', runtimeStatus: 'idle', activeRunId: null, mode: { kind: 'main' }, metadata: null, metadataRevision: '0', archiveRevision: '0' };
  const create = async () => session;
  const sent: Array<{ visible: string; instructions: string | undefined }> = [];
  useSessionUIStore.setState({
    createSession: create,
    setCurrentSession: () => {},
    sendMessage: async (visible, _provider, _model, _agent, _attachments, _mention, parts) => {
      sent.push({ visible, instructions: parts?.[0]?.text });
    },
  });
  const promptReads: Array<string | null> = [];
  spies.push(spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'http://runtime.test');
    if (url.pathname !== '/api/magic-prompts') return Response.json({});
    const directory = url.searchParams.get('sessionDirectory');
    promptReads.push(directory);
    return Response.json({ version: 1, overrides: directory === '/repo'
      ? { 'plan.todo.visible': 'Project {{todo_text}}', 'plan.todo.instructions': 'Project instructions {{todo_text}}' }
      : { 'plan.todo.visible': 'Global {{todo_text}}', 'plan.todo.instructions': 'Global instructions' } });
  }));
  root = createRoot(host);
  await act(async () => root?.render(<I18nProvider><Harness /></I18nProvider>));
  await act(async () => action.sendToNewSession('todo', 'ship'));
  await act(async () => action.confirmSend({ providerID: 'provider', modelID: 'model', variant: '' }));
  expect(promptReads).toEqual(['/repo']);
  expect(sent).toEqual([{ visible: 'Project ship', instructions: 'Project instructions ship' }]);
});

test('worktree todo reads prompts and routes to the created nested project directory', async () => {
  switchRuntimeEndpoint({ apiBaseUrl: 'http://runtime.test', runtimeKey: 'todo-nested' });
  spies.push(spyOn(worktreeSessionCreator, 'createWorktreeSessionForNewBranch').mockResolvedValue({ id: 'nested-session', branch: 'branch', path: '/trees/branch', directory: '/trees/branch/subdir' }));
  const selected: unknown[] = [];
  const sent: unknown[] = [];
  useSessionUIStore.setState({
    setCurrentSession: (id, directory) => { selected.push([id, directory]); },
    sendMessage: async (visible, _provider, _model, _agent, _attachments, _mention, parts, _variant, _metadata, options) => { sent.push([visible, parts?.[0]?.text, options?.target]); },
  });
  const reads: Array<string | null> = [];
  spies.push(spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'http://runtime.test');
    if (url.pathname !== '/api/magic-prompts') return Response.json({});
    const directory = url.searchParams.get('sessionDirectory'); reads.push(directory);
    return Response.json({ version: 1, overrides: directory === '/trees/branch/subdir' ? { 'plan.todo.visible': 'Nested {{todo_text}}', 'plan.todo.instructions': 'Nested instructions' } : { 'plan.todo.visible': 'Wrong scope' } });
  }));
  root = createRoot(host);
  await act(async () => root?.render(<I18nProvider><Harness /></I18nProvider>));
  await act(async () => action.sendToNewWorktreeSession('todo', 'ship'));
  await act(async () => action.confirmSend({ providerID: 'provider', modelID: 'model', variant: '' }));
  expect(reads).toEqual(['/trees/branch/subdir']);
  expect(selected).toEqual([['nested-session', '/trees/branch/subdir']]);
  expect(sent).toEqual([['Nested ship', 'Nested instructions', { runtimeKey: 'todo-nested', sessionId: 'nested-session', directory: '/trees/branch/subdir' }]]);
});

test.each(['creation', 'prompts'])('todo send stops after an A-B-A runtime switch during %s', async (stage) => {
  switchRuntimeEndpoint({ apiBaseUrl: 'http://runtime.test', runtimeKey: 'todo-aba' });
  const session: Session = { sessionId: 'todo-session', rootSessionId: 'todo-session', projectId: 'project', workspaceId: 'workspace', displayPath: '.', createdAt: 1, updatedAt: 1, epoch: 'epoch', headSequence: '0', runtimeStatus: 'idle', activeRunId: null, mode: { kind: 'main' }, metadata: null, metadataRevision: '0', archiveRevision: '0' };
  let release!: () => void;
  let started!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const reached = new Promise<void>((resolve) => { started = resolve; });
  const sent: string[] = [];
  const selected: string[] = [];
  useSessionUIStore.setState({
    createSession: async () => { if (stage === 'creation') { started(); await pending; } return session; },
    setCurrentSession: (id) => { if (id) selected.push(id); },
    sendMessage: async (visible) => { sent.push(visible); },
  });
  spies.push(spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'http://runtime.test');
    if (url.pathname !== '/api/magic-prompts') return Response.json({});
    if (stage === 'prompts') { started(); await pending; }
    return Response.json({ version: 1, overrides: { 'plan.todo.visible': 'Project {{todo_text}}' } });
  }));
  root = createRoot(host);
  await act(async () => root?.render(<I18nProvider><Harness /></I18nProvider>));
  await act(async () => action.sendToNewSession('todo', 'ship'));
  let operation!: Promise<void>;
  await act(async () => { operation = action.confirmSend({ providerID: 'provider', modelID: 'model', variant: '' }); await reached; });
  switchRuntimeEndpoint({ apiBaseUrl: 'http://other.test', runtimeKey: 'todo-other' });
  switchRuntimeEndpoint({ apiBaseUrl: 'http://runtime.test', runtimeKey: 'todo-aba' });
  await act(async () => { release(); await operation; });
  expect(selected).toEqual([]);
  expect(sent).toEqual([]);
});
