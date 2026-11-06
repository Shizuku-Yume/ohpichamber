import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { Window } from 'happy-dom';

// The DOM must exist before react-dom loads: it decides at module init whether
// it runs in a browser, and a server-mode load never attaches its event system.
// These imports are therefore dynamic, evaluated after the globals below.
const browser = new Window({ url: 'http://localhost/' });

export const WindowEvent = browser.Event;
export const WindowFocusEvent = browser.FocusEvent;

const installDom = () => {
  for (const [key, value] of Object.entries({
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    localStorage: browser.localStorage,
    Node: browser.Node,
    Element: browser.Element,
    HTMLElement: browser.HTMLElement,
    HTMLTextAreaElement: browser.HTMLTextAreaElement,
    Event: browser.Event,
    FocusEvent: browser.FocusEvent,
    CustomEvent: browser.CustomEvent,
    MutationObserver: browser.MutationObserver,
    ResizeObserver: browser.ResizeObserver,
    getComputedStyle: browser.getComputedStyle.bind(browser),
    requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
    cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
};
installDom();

const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { BehaviorPage } = await import('./BehaviorPage');

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;

beforeEach(() => {
  // A sibling suite in the same process may have replaced the DOM globals with
  // its own Window; this page's renderer must see the one it was loaded against.
  installDom();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  fetchSpy = spyOn(globalThis, 'fetch');
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  fetchSpy.mockRestore();
});

interface BehaviorRequests {
  settingsWrites: Array<{ body: Record<string, unknown>; finish: () => void }>;
  rules: Record<string, string | null>;
}

const stubFetch = (initial: { rules?: string; settings?: Record<string, unknown> } = {}) => {
  const requests: BehaviorRequests = { settingsWrites: [], rules: { global: initial.rules ?? null, project: null } };
  const other: string[] = [];
  (requests as unknown as { other: string[] }).other = other;
  const warnSpy = spyOn(console, 'warn').mockImplementation((...args) => { other.push(`WARN ${args.map(String).join(' ')}`); });
  (requests as unknown as { warnSpy: typeof warnSpy }).warnSpy = warnSpy;
  fetchSpy.mockImplementation(async (input, init) => {
    const request = new Request(input instanceof Request ? input : new URL(input, window.location.href), init);
    const url = new URL(request.url);
    if (url.pathname === '/api/behavior/agents-md') {
      const scope = url.searchParams.get('scope') ?? 'global';
      if (request.method === 'GET') {
        const content = requests.rules[scope];
        return Response.json({ content: content ?? '', exists: content !== null, path: `/test/${scope}/AGENTS.md` });
      }
      const body = await request.json() as { content: string; expectedContent: string | null };
      const { promise, resolve } = Promise.withResolvers<Response>();
      requests.settingsWrites.push({
        body: { rules: body.content, scope },
        finish: () => { requests.rules[scope] = body.content; resolve(Response.json({ success: true })); },
      });
      return promise;
    }
    if (url.pathname === '/api/config/settings') {
      if (request.method === 'GET') return Response.json({});
      const body = await request.json() as Record<string, unknown>;
      const { promise, resolve } = Promise.withResolvers<Response>();
      requests.settingsWrites.push({
        body,
        finish: () => resolve(Response.json(body, { headers: { 'Content-Type': 'application/json' } })),
      });
      return promise;
    }
    other.push(`${request.method} ${url.pathname}`);
    return Response.json({});
  });
  return requests;
};

const settle = async () => {
  for (let index = 0; index < 4; index += 1) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  }
};

// The shared settings mirror is debounced separately from the AGENTS.md PUT.
const settleSettings = async () => {
  await settle();
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
  await settle();
};

const renderPage = async () => {
  await act(async () => { root.render(<I18nProvider><BehaviorPage /></I18nProvider>); });
  await settle();
};

const textareas = () => Array.from(container.querySelectorAll('textarea'));

test('a profile with no behavior text saves nothing and injects nothing', async () => {
  const requests = stubFetch();
  await renderPage();

  expect(textareas()[0]?.value).toBe('');
  expect(requests.settingsWrites).toEqual([]);
  expect(requests.settingsWrites).toEqual([]);
});

test('editing global rules writes the AGENTS.md file and no settings copy', async () => {
  const requests = stubFetch({ rules: 'initial rules\n' });
  await renderPage();
  const rulesField = textareas()[0];
  if (!rulesField) throw new Error('Missing rules field');
  expect(rulesField.value).toBe('initial rules\n');

  // Take the setter from the element's own prototype: the global
  // `HTMLTextAreaElement` may belong to a window another suite installed.
  const setValue = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(rulesField), 'value')?.set;
  if (!setValue) throw new Error('Missing native textarea setter');
  await act(async () => {
    setValue.call(rulesField, 'new rules');
    rulesField.dispatchEvent(new WindowEvent('input', { bubbles: true }) as unknown as Event);
  });
  await act(async () => { rulesField.dispatchEvent(new WindowFocusEvent('focusout', { bubbles: true }) as unknown as FocusEvent); });
  await settle();

  expect(requests.settingsWrites.map((write) => write.body)).toEqual([
    { rules: 'new rules\n', scope: 'global' },
  ]);
  await act(async () => { requests.settingsWrites[0]?.finish(); });
  await settle();
  expect(requests.settingsWrites.some((write) => 'globalBehaviorPrompt' in write.body)).toBe(false);
  expect(rulesField.value).toBe('new rules\n');
  // The AGENTS.md file is the only authority; OMP loads it natively, so the
  // page never mirrors it into settings for a second prompt injection.
});

test('the default preset is an explicit option and persists a strictly empty instruction', async () => {
  const requests = stubFetch();
  await renderPage();
  const toggle = container.querySelector<HTMLElement>('[data-settings-item="behavior.response-style"] [role="button"]');
  if (!toggle) throw new Error('Missing response style toggle');
  await act(async () => { toggle.click(); });
  await settleSettings();

  const settingsWrite = requests.settingsWrites.find((write) => 'responseStyleInstruction' in write.body);
  if (!settingsWrite) throw new Error('Missing response style settings write');
  expect(settingsWrite.body.responseStyleEnabled).toBe(true);
  expect(settingsWrite.body.responseStylePreset).toBe('default');
  expect(settingsWrite.body.responseStyleInstruction).toBe('');
});
