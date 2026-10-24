import { expect, spyOn, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CanonicalClient } from '@/api/canonicalClient';
import { Window } from 'happy-dom';

import { ThemeSystemContext, type ThemeContextValue } from '@/contexts/theme-system-context';
import { getDefaultTheme } from '@/lib/theme/themes';
import { I18nProvider } from '@/lib/i18n';
import { getRuntimeKey } from '@/lib/runtime-switch';
import { useGuestsStore } from '@/lib/guests/store';
import { SyncProvider } from '@/sync/sync-context';
import { PluginPane } from './PluginPane';

test('an old window-protocol hello shows an explicit version mismatch and grants no port', async () => {
  const dom = new Window({ url: 'http://guest.test', settings: { disableIframePageLoading: true } });
  const guestWindow = new Window();
  const originals: Array<[string, PropertyDescriptor | undefined]> = [];
  for (const [key, value] of Object.entries({ window: dom, document: dom.document, navigator: dom.navigator,
    localStorage: dom.localStorage, getComputedStyle: dom.getComputedStyle.bind(dom), Event: dom.Event, MessageEvent: dom.MessageEvent,
    IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.push([key, Object.getOwnPropertyDescriptor(globalThis, key)]);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const target = String(input instanceof Request ? input.url : input);
    if (target.includes('/auth/url-token')) return Response.json({ token: 'scoped-test', expiresAt: Date.now() + 60_000 });
    if (target.includes('/event')) return new Response(new ReadableStream(), { headers: { 'content-type': 'text/event-stream' } });
    if (target.includes('/session/active')) return Response.json({});
    if (target.includes('/location')) return Response.json({ directory: '/visible', project: { id: 'project', directory: '/visible', canonical: '/visible' } });
    return Response.json({ data: [] });
  });
  const client = new CanonicalClient();
  const theme = getDefaultTheme(false);
  const themeContext: ThemeContextValue = {
    currentTheme: theme, availableThemes: [theme], customThemeIds: [], setTheme: () => {}, customThemesLoading: false,
    reloadCustomThemes: async () => {}, importTheme: async () => theme, deleteImportedTheme: async () => {},
    isSystemPreference: false, setSystemPreference: () => {}, themeMode: 'light', setThemeMode: () => {},
    lightThemeId: theme.metadata.id, darkThemeId: theme.metadata.id, setLightThemePreference: () => {}, setDarkThemePreference: () => {},
  };
  const runtimeKey = getRuntimeKey();
  useGuestsStore.getState().resetForRuntimeSwitch(runtimeKey);
  useGuestsStore.getState().replaceCatalog([{
    id: 'legacy', name: 'Legacy', icon: 'window', entry: 'panel/index.html',
    capabilities: { requested: [], granted: [] },
  }], runtimeKey);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<React.StrictMode><I18nProvider><ThemeSystemContext.Provider value={themeContext}>
      <SyncProvider client={client} directory="/visible"><PluginPane mode="plugin:legacy" /></SyncProvider>
    </ThemeSystemContext.Provider></I18nProvider></React.StrictMode>));
    for (let attempt = 0; attempt < 100 && !container.querySelector('iframe'); attempt++) {
      await act(async () => {
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, 10);
        await promise;
      });
    }
    const frame = container.querySelector<HTMLIFrameElement>('iframe');
    if (!frame) throw new Error('Guest frame did not mount');
    Object.defineProperty(frame, 'contentWindow', { configurable: true, value: guestWindow });
    const guestPost = spyOn(guestWindow, 'postMessage');
    await act(async () => {
      dom.dispatchEvent(new dom.MessageEvent('message', {
        source: guestWindow,
        data: { channel: 'openchamber.sdk', v: 1, type: 'hello' },
      }));
      const { promise, resolve } = Promise.withResolvers<void>();
      setImmediate(resolve);
      await promise;
    });
    expect(guestPost).toHaveBeenCalledTimes(0);
    expect(container.textContent).toContain('older OpenChamber SDK');
    expect(container.textContent).toContain('@openchamber/sdk 3.0.0');
    expect(container.querySelector('iframe')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    fetch.mockRestore();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    await dom.happyDOM.close();
    await guestWindow.happyDOM.close();
  }
});
