import { afterAll, afterEach, beforeEach, expect, jest, mock, spyOn, test } from 'bun:test';
import type { MCPOAuthRequest, MCPOAuthResult } from '@openchamber/agent-contract';
import { Window } from 'happy-dom';
import type { Root } from 'react-dom/client';

const browser = new Window({ url: 'http://localhost/' });
const descriptorKeys = [
  'window', 'document', 'navigator', 'localStorage', 'Node', 'Element', 'HTMLElement', 'HTMLInputElement',
  'Event', 'FocusEvent', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
  'IS_REACT_ACT_ENVIRONMENT',
] as const;
for (const key of descriptorKeys) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value: {
      window: browser, document: browser.document, navigator: browser.navigator, localStorage: browser.localStorage,
      Node: browser.Node, Element: browser.Element, HTMLElement: browser.HTMLElement, HTMLInputElement: browser.HTMLInputElement,
      Event: browser.Event, FocusEvent: browser.FocusEvent, MutationObserver: browser.MutationObserver,
      getComputedStyle: browser.getComputedStyle.bind(browser),
      requestAnimationFrame: browser.requestAnimationFrame.bind(browser), cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
      IS_REACT_ACT_ENVIRONMENT: true,
    }[key],
  });
}
const openSpy = spyOn(browser, 'open').mockImplementation(() => null);
const owner = { serverId: 'tools', persistedRevision: '3', worker: { rootSessionId: 'oauth_owner', workspaceId: 'workspace', workerGeneration: 'generation' } };
const unauthenticated: MCPOAuthResult = { ...owner, status: 'unauthenticated', authenticated: false };
const pending: MCPOAuthResult = { ...owner, status: 'pending', authenticated: false, pendingFlow: { flowId: 'flow', authorizationUrl: 'https://auth.example.test/authorize?state=opaque' } };
const authenticated: MCPOAuthResult = { ...owner, status: 'authenticated', authenticated: true };

let requests: MCPOAuthRequest[] = [];
let credentials: Array<{ persistedRevision: string; value: string }> = [];
let reconnects = 0;
/** What the panel's mount read and its poll see, in order; the last entry repeats. */
let reads: MCPOAuthResult[] = [];
/** The failure a `start` submit throws, when the test poses one. */
let startFailure: Error | null = null;
/** Failures the poll's own read takes before it answers, as a dropped connection would. */
let pollFailures = 0;
const actual = await import('@/api/canonicalClient');
const { CanonicalApiError } = actual;
mock.module('@/api/canonicalClient', () => ({
  ...actual, canonicalClient: {
    resolveWorkspace: async () => ({ workspaceId: 'workspace', projectId: 'project', name: 'Workspace' }),
    getWorkspaceMcpOAuth: async (): Promise<MCPOAuthResult> => {
    if (pollFailures > 0) {
      pollFailures -= 1;
      throw new Error('The Host connection dropped.');
    }
    return reads.length > 1 ? reads.shift() ?? unauthenticated : reads[0] ?? unauthenticated;
  },
    writeWorkspaceMcpCredential: async (_workspaceId: string, _serverId: string, input: { persistedRevision: string; value: string }) => { credentials.push(input); return { ...owner, credentialRef: 'private_ref' }; },
    submitWorkspaceMcpOAuth: async (_workspaceId: string, _serverId: string, input: MCPOAuthRequest): Promise<MCPOAuthResult> => {
      requests.push(input);
      if (input.action === 'cancel') return unauthenticated;
      if (input.action === 'start' && startFailure) throw startFailure;
      if (input.action === 'start') return pending;
      return input.action === 'complete' ? authenticated : unauthenticated;
    },
  }
}));
// Modules load after the DOM globals and the client mock are installed, which a
// static import cannot order.
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { McpOAuthSignIn } = await import('./McpOAuthSignIn');
const container = document.createElement('div'); document.body.appendChild(container);
let root: Root;

beforeEach(() => {
  root = createRoot(container);
  requests = []; credentials = []; reconnects = 0; reads = [unauthenticated]; startFailure = null; pollFailures = 0;
  openSpy.mockClear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  jest.useRealTimers();
});
afterAll(() => {
  openSpy.mockRestore();
  browser.close();
  for (const key of descriptorKeys) Reflect.deleteProperty(globalThis, key);
});

const render = async (props: { autoStart?: boolean; strict?: boolean; onAutoStartConsumed?: () => void } = {}) => {
  const panel = (
    <McpOAuthSignIn
      serverId="tools"
      directory="/repo"
      autoStart={props.autoStart}
      onAutoStartConsumed={props.onAutoStartConsumed}
      onConnected={() => { reconnects += 1; }}
    />
  );
  await act(async () => {
    root.render(<I18nProvider>{props.strict ? <StrictMode>{panel}</StrictMode> : panel}</I18nProvider>);
  });
};
const { StrictMode } = await import('react');
const settle = async () => { await act(async () => { await Promise.resolve(); }); };
const enter = async (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!setter) throw new Error('Missing input setter');
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
};
const click = async (label: string) => {
  const button = [...container.querySelectorAll('button')].find(candidate => candidate.textContent === label);
  if (!button) throw new Error(`Missing ${label} button`);
  await act(async () => button.dispatchEvent(new Event('click', { bubbles: true })));
};
const starts = () => requests.filter((request) => request.action === 'start');

test('OAuth client secret stays in the dedicated private write and completion carries exact flow ownership', async () => {
  await render();
  const secret = container.querySelector<HTMLInputElement>('input[type="password"]');
  if (!secret) throw new Error('Missing client secret');
  await enter(secret, 'private-client-secret');
  await click('Authorize');
  expect(credentials).toEqual([{ persistedRevision: '3', value: 'private-client-secret' }]);
  expect(requests[0]).toEqual({ action: 'start', persistedRevision: '3', workerGeneration: 'generation', oauth: { clientSecretRef: 'private_ref' } });
  expect(JSON.stringify(requests)).not.toContain('private-client-secret');
  const callback = container.querySelector<HTMLInputElement>('input');
  if (!callback) throw new Error('Missing callback field');
  await enter(callback, 'http://127.0.0.1/callback?code=code&state=opaque');
  await click('Complete Authorization');
  expect(requests[1]).toEqual({ action: 'complete', persistedRevision: '3', workerGeneration: 'generation', flowId: 'flow', callbackInput: 'http://127.0.0.1/callback?code=code&state=opaque' });
  expect(reconnects).toBe(1);
});

test('cancel and clear authentication retain their native flow and worker boundaries', async () => {
  await render(); await click('Authorize'); await click('Cancel');
  expect(requests[1]).toEqual({ action: 'cancel', persistedRevision: '3', workerGeneration: 'generation', flowId: 'flow' });
  await click('Authorize'); await click('Complete Authorization'); await click('Clear Auth');
  expect(requests[4]).toEqual({ action: 'disconnect', persistedRevision: '3', workerGeneration: 'generation' });
});

test('autoStart and StrictMode still send exactly one start and open the browser once', async () => {
  await render({ autoStart: true, strict: true });
  await settle();
  expect(starts()).toHaveLength(1);
  expect(openSpy).toHaveBeenCalledTimes(1);
  expect(openSpy.mock.calls[0]?.[0]).toBe('https://auth.example.test/authorize?state=opaque');
  // The Authorize button is the manual path; while the automatic start runs it
  // is replaced by its progress line, and a pending flow shows neither.
  expect([...container.querySelectorAll('button')].some(button => button.textContent === 'Authorize')).toBe(false);
  expect([...container.querySelectorAll('button')].some(button => button.textContent === 'Open in browser')).toBe(true);
});

test('the poll turns a pending flow into the connected state and connects once', async () => {
  jest.useFakeTimers();
  reads = [unauthenticated, pending, authenticated];
  await render({ autoStart: true });
  await settle();
  expect(starts()).toHaveLength(1);
  expect(reconnects).toBe(0);

  await act(async () => { jest.advanceTimersByTime(1_500); });
  await settle();
  expect(reconnects).toBe(0);
  await act(async () => { jest.advanceTimersByTime(1_500); });
  await settle();
  expect(reconnects).toBe(1);
  expect(container.textContent).toContain('Connected');
  // The poll stops at a terminal state: no further connect from later ticks.
  await act(async () => { jest.advanceTimersByTime(10_000); });
  await settle();
  expect(reconnects).toBe(1);
});

test('a pasted callback and a completing poll cannot connect twice', async () => {
  jest.useFakeTimers();
  reads = [unauthenticated, pending, pending];
  await render({ autoStart: true });
  await settle();
  const callback = container.querySelector<HTMLInputElement>('input');
  if (!callback) throw new Error('Missing callback field');
  await enter(callback, 'http://127.0.0.1/callback?code=code&state=opaque');
  await click('Complete Authorization');
  expect(reconnects).toBe(1);
  // The flow is finished, so the poll no longer runs.
  await act(async () => { jest.advanceTimersByTime(5_000); });
  await settle();
  expect(reconnects).toBe(1);
});

test('a cancel the Agent Service accepts still says the sign-in was cancelled', async () => {
  await render();
  await click('Authorize');
  await click('Cancel');
  await settle();
  // The worker answers a cancel with the unauthenticated state, not a problem,
  // so the panel has to report it from the accepted action itself.
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Sign-in was cancelled.');
});

test('a flow that fails after the browser handoff shows the provider cause and stops waiting', async () => {
  jest.useFakeTimers();
  const failed: MCPOAuthResult = {
    ...unauthenticated,
    error: { code: 'MCP_OAUTH_FAILED', detail: 'The provider refused the token exchange (invalid_grant).', retryable: false },
  };
  reads = [unauthenticated, pending, failed];
  await render({ autoStart: true });
  await settle();
  expect(starts()).toHaveLength(1);

  await act(async () => { jest.advanceTimersByTime(1_500); });
  await settle();
  await act(async () => { jest.advanceTimersByTime(1_500); });
  await settle();

  // The failure is the provider's own sentence in red, and the form is back so
  // the user can retry rather than being left in a silent waiting state.
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('The provider refused the token exchange (invalid_grant).');
  expect(container.textContent).not.toContain('Open in browser');
  expect([...container.querySelectorAll('button')].some(button => button.textContent === 'Authorize')).toBe(true);
  expect(reconnects).toBe(0);
  // Polling stopped with the flow: later ticks read nothing and add no request.
  const before = reads.length;
  await act(async () => { jest.advanceTimersByTime(10_000); });
  await settle();
  expect(reads.length).toBe(before);
});

test('a transport failure during the poll is not a failed flow', async () => {
  jest.useFakeTimers();
  reads = [unauthenticated, pending, authenticated];
  await render({ autoStart: true });
  await settle();
  pollFailures = 1;
  await act(async () => { jest.advanceTimersByTime(1_500); });
  await settle();
  // A dropped read says nothing about the flow: no error, still waiting.
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.textContent).toContain('Open in browser');
  expect(reconnects).toBe(0);
  // The dropped read did not consume the flow's state: the next ticks still
  // arrive, pass the pending result, and then connect.
  for (let tick = 0; tick < 2; tick += 1) {
    await act(async () => { jest.advanceTimersByTime(1_500); });
    await settle();
  }
  expect(reconnects).toBe(1);
});

test('signing in again after clearing the auth connects again', async () => {
  await render();
  await click('Authorize');
  await click('Complete Authorization');
  expect(reconnects).toBe(1);
  await click('Clear Auth');
  await click('Authorize');
  await click('Complete Authorization');
  // The one-connection latch is per sign-in, not per panel lifetime.
  expect(reconnects).toBe(2);
});

test('the auto-start flag is consumed once so a later visit stays manual', async () => {
  let consumed = 0;
  await render({ autoStart: true, onAutoStartConsumed: () => { consumed += 1; } });
  await settle();
  expect(consumed).toBe(1);
  expect(starts()).toHaveLength(1);
});

test('the elapsed timer stops at the budget instead of ticking forever', async () => {
  jest.useFakeTimers();
  reads = [unauthenticated, pending];
  await render({ autoStart: true });
  await settle();
  await act(async () => { jest.advanceTimersByTime(299_000); });
  await settle();
  expect(container.textContent).toContain('Waiting');
  await act(async () => { jest.advanceTimersByTime(2_000); });
  await settle();
  expect(container.textContent).toContain('The sign-in timed out. Try again.');
  await act(async () => { jest.advanceTimersByTime(60_000); });
  await settle();
  expect(container.textContent).toContain('The sign-in timed out. Try again.');
});

test('leaving the panel cancels the flow it was waiting on', async () => {
  reads = [unauthenticated];
  await render();
  await click('Authorize');
  await act(async () => root.unmount());
  const cancellations = requests.filter((request) => request.action === 'cancel');
  expect(cancellations).toEqual([{ action: 'cancel', persistedRevision: '3', workerGeneration: 'generation', flowId: 'flow' }]);
  // A fresh root so the shared teardown has something to unmount.
  root = createRoot(container);
});

test('a cancelled sign-in reads as a neutral message, not an error', async () => {
  startFailure = new CanonicalApiError({ type: 'urn:problem:MCP_OAUTH_CANCELLED', title: 'Cancelled', status: 409, detail: 'MCP OAuth was cancelled.', code: 'MCP_OAUTH_CANCELLED', retryable: false });
  await render();
  await click('Authorize');
  await settle();
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Sign-in was cancelled.');
});

test('a sign-in already in progress says so and waits on the flow that exists', async () => {
  jest.useFakeTimers();
  startFailure = new CanonicalApiError({ type: 'urn:problem:MCP_OAUTH_IN_PROGRESS', title: 'In progress', status: 409, detail: 'MCP sign-in is already in progress.', code: 'MCP_OAUTH_IN_PROGRESS', retryable: false });
  reads = [unauthenticated, pending, authenticated];
  await render({ autoStart: true });
  await settle();
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Sign-in already in progress.');
  // The panel adopted the existing flow and polls it instead of staying stuck.
  await act(async () => { jest.advanceTimersByTime(1_500); });
  await settle();
  expect(reconnects).toBe(1);
});

test('a rejected client registration shows the provider message and focuses the client ID', async () => {
  const providerMessage = 'Dynamic client registration was rejected (POST https://api.figma.com/v1/oauth/mcp/register → HTTP 403 — unapproved_client). Configure oauth.clientId.';
  startFailure = new CanonicalApiError({ type: 'urn:problem:MCP_OAUTH_CLIENT_REGISTRATION_REJECTED', title: 'Registration rejected', status: 422, detail: providerMessage, code: 'MCP_OAUTH_CLIENT_REGISTRATION_REJECTED', retryable: false });
  await render({ autoStart: true });
  await settle();
  expect(container.textContent).toContain(providerMessage);
  const clientId = container.querySelector<HTMLInputElement>('input[aria-label="OAuth client ID"]');
  if (!clientId) throw new Error('Missing client ID field');
  expect(container.ownerDocument.activeElement).toBe(clientId);
  // The user can type one and retry from the same panel.
  await enter(clientId, 'figma-client-id');
  await click('Authorize');
  expect(starts()[starts().length - 1]).toEqual({
    action: 'start', persistedRevision: '3', workerGeneration: 'generation', oauth: { clientId: 'figma-client-id' },
  });
});
