import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { TrackerAuthStatus } from '@/lib/api/types';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser, document: browser.document, navigator: browser.navigator, localStorage: browser.localStorage,
  Element: browser.Element, HTMLElement: browser.HTMLElement, Node: browser.Node,
  Event: browser.Event, CustomEvent: browser.CustomEvent, KeyboardEvent: browser.KeyboardEvent, MouseEvent: browser.MouseEvent,
  MutationObserver: browser.MutationObserver, ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser), requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser), IS_REACT_ACT_ENVIRONMENT: true,
});
// The picker's imports pull in app stores that load on import; none of that
// matters here, so their requests never answer.
globalThis.fetch = Object.assign(() => new Promise<Response>(() => {}), globalThis.fetch);

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

// A status without an account list, before it loads or while the tracker is
// not connected, once sent the team picker into React's "maximum update
// depth" loop and took the whole board down.
test('the container picker renders while the tracker status has no account list', async () => {
  const { I18nProvider } = await import('@/lib/i18n');
  const { RuntimeAPIContext } = await import('@/contexts/runtimeAPIContext');
  const { createWebAPIs } = await import('../../../../web/src/api/index');
  const { useTrackerAuthStore } = await import('@/stores/useTrackerAuthStore');
  const { useTrackerRegistry } = await import('@/lib/trackers/registry');
  const { linearLikeTrackerDescriptor } = await import('@/lib/trackers/descriptor.fixture');
  const { SourceBoardContainerPicker } = await import('./SourceBoardPickers');
  const apis = createWebAPIs();
  const linear = linearLikeTrackerDescriptor();
  useTrackerRegistry.setState({ ordered: [linear], byId: new Map([[linear.id, linear]]), status: 'ready', holdsList: true });

  for (const status of [null, { connected: false as const }]) {
    useTrackerAuthStore.setState({ entries: { linear: { status, isLoading: false, hasChecked: status !== null } } });
    await act(async () => {
      root.render(
        <I18nProvider>
          <RuntimeAPIContext.Provider value={apis}>
            <SourceBoardContainerPicker provider="linear" containers={[]} selectedContainerId={null} onSelectContainer={() => {}} onAccountSwitched={() => {}} />
          </RuntimeAPIContext.Provider>
        </I18nProvider>,
      );
    });
    expect(host.textContent).toContain('All teams');
  }
});

test('the board ignores an account activation after a runtime switch', async () => {
  // Load the real picker after its browser globals are installed.
  const { I18nProvider } = await import('@/lib/i18n');
  const { RuntimeAPIContext } = await import('@/contexts/runtimeAPIContext');
  const { createWebAPIs } = await import('../../../../web/src/api/index');
  const { useTrackerAuthStore } = await import('@/stores/useTrackerAuthStore');
  const { useTrackerRegistry } = await import('@/lib/trackers/registry');
  const { linearLikeTrackerDescriptor } = await import('@/lib/trackers/descriptor.fixture');
  const { switchRuntimeEndpoint } = await import('@/lib/runtime-switch');
  const { toast } = await import('@/components/ui');
  const { SourceBoardContainerPicker } = await import('./SourceBoardPickers');
  const apis = createWebAPIs();
  const linear = linearLikeTrackerDescriptor();
  useTrackerRegistry.setState({ ordered: [linear], byId: new Map([[linear.id, linear]]), status: 'ready', holdsList: true });
  const status: TrackerAuthStatus = { connected: true, account: { id: 'one', name: 'One', current: true }, accounts: [
    { id: 'one', name: 'One', current: true }, { id: 'two', name: 'Two', current: false },
  ] };
  const { promise, resolve } = Promise.withResolvers<TrackerAuthStatus>();
  let calls = 0;
  let switched = 0;
  apis.trackers!.authActivate = async () => { calls += 1; return promise; };
  const success = spyOn(toast, 'success');
  try {
    useTrackerAuthStore.getState().resetForRuntimeSwitch();
    useTrackerAuthStore.getState().setStatus('linear', status);
    await act(async () => root.render(<I18nProvider><RuntimeAPIContext.Provider value={apis}>
      <SourceBoardContainerPicker provider="linear" containers={[]} selectedContainerId={null} onSelectContainer={() => {}} onAccountSwitched={() => { switched += 1; }} />
    </RuntimeAPIContext.Provider></I18nProvider>));
    const trigger = host.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]');
    expect(trigger).not.toBeNull();
    await act(async () => {
      trigger!.focus();
      trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')].find((element) => element.textContent?.includes('Two'));
    expect(item).toBeDefined();
    await act(async () => { item!.click(); });
    expect(calls).toBe(1);
    await act(async () => {
      switchRuntimeEndpoint({ apiBaseUrl: 'https://host-b.example', runtimeKey: 'host-b' });
      useTrackerAuthStore.getState().resetForRuntimeSwitch();
      useTrackerAuthStore.getState().setStatus('linear', { connected: false });
      resolve(status);
      await promise;
    });
    expect(useTrackerAuthStore.getState().entries.linear?.status).toEqual({ connected: false });
    expect(switched).toBe(0);
    expect(success).not.toHaveBeenCalled();
  } finally {
    success.mockRestore();
    useTrackerAuthStore.getState().resetForRuntimeSwitch();
  }
});

test('the repository picker names the chosen repository, or all of them', async () => {
  const { I18nProvider } = await import('@/lib/i18n');
  const { SourceBoardRepositoryPicker } = await import('./SourceBoardPickers');
  const repositories = ['/work/app', '/work/team/api'];

  for (const sheet of [false, true]) {
    for (const [selected, shown] of [['/work/team/api', 'team/api'], [null, 'All repositories']] as const) {
      await act(async () => {
        root.render(
          <I18nProvider>
            <SourceBoardRepositoryPicker repositories={repositories} selected={selected} root="/work" allAvailable onSelect={() => {}} sheet={sheet} />
          </I18nProvider>,
        );
      });
      expect(host.textContent).toContain(shown);
      expect(host.querySelector('button')?.getAttribute('aria-label')).toBe('Repository');
    }
  }
});
