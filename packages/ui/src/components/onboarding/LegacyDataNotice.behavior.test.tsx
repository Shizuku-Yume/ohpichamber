import React from 'react';
import { afterEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import { I18nProvider } from '@/lib/i18n';
import { LegacyDataNotice } from './LegacyDataNotice';
import { switchRuntimeEndpoint } from '@/lib/runtime-switch';
import { getSafeStorage } from '@/stores/utils/safeStorage';
import { useUIStore } from '@/stores/useUIStore';

const originalFetch = globalThis.fetch;
const originalDescriptors = new Map();
const globalNames = ['window', 'document', 'navigator', 'localStorage', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
const storageKeys = ['legacy-data-notice-dismissed:task20-rendered', 'legacy-data-notice-dismissed:task20-configure'];
let browser;
let root;
let container;

const installBrowser = () => {
  browser = new Window({ url: 'http://localhost' });
  const values = {
    window: browser, document: browser.document, navigator: browser.navigator, localStorage: browser.localStorage,
    HTMLElement: browser.HTMLElement, Element: browser.Element, Node: browser.Node, Event: browser.Event,
    MouseEvent: browser.MouseEvent, getComputedStyle: browser.getComputedStyle.bind(browser), IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const name of globalNames) {
    originalDescriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: values[name] });
  }
  container = document.createElement('div');
  document.body.append(container);
};

const renderNotice = async () => {
  root = createRoot(container);
  await act(async () => {
    root.render(<I18nProvider><LegacyDataNotice /></I18nProvider>);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  globalThis.fetch = originalFetch;
  for (const key of storageKeys) getSafeStorage().removeItem(key);
  if (browser) await browser.happyDOM.close();
  for (const [name, descriptor] of originalDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  originalDescriptors.clear();
  browser = undefined;
  useUIStore.getState().setSettingsDialogOpen(false);
  switchRuntimeEndpoint({ apiBaseUrl: '', clientToken: null, runtimeKey: 'task20-rendered-reset' });
});

describe('legacy notice rendered behavior', () => {
  test('renders from an existence-only response, dismisses, and stays hidden after remount', async () => {
    installBrowser();
    switchRuntimeEndpoint({ apiBaseUrl: 'http://task20.test', clientToken: 'task20', runtimeKey: 'task20-rendered' });
    globalThis.fetch = async input => String(input).includes('/api/host/legacy-data')
      ? Response.json({ present: true })
      : Response.json({ present: false });
    const response = await fetch('http://task20.test/api/host/legacy-data');
    const payload = await response.json();
    expect(payload).toEqual({ present: true });
    expect(Object.keys(payload)).toEqual(['present']);
    await renderNotice();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    const dismiss = [...container.querySelectorAll('button')].find(button => button.textContent === 'Dismiss');
    expect(dismiss).toBeDefined();
    await act(async () => dismiss.click());
    expect(container.querySelector('[role="status"]')).toBeNull();
    await act(async () => root.unmount());
    root = undefined;
    await renderNotice();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  test('configure providers navigates to the existing providers settings surface', async () => {
    installBrowser();
    switchRuntimeEndpoint({ apiBaseUrl: 'http://task20.test', clientToken: 'task20', runtimeKey: 'task20-configure' });
    globalThis.fetch = async () => Response.json({ present: true });
    await renderNotice();
    const configure = [...container.querySelectorAll('a')].find(link => link.getAttribute('href') === '/?settings=providers');
    expect(configure).toBeDefined();
    await act(async () => configure.dispatchEvent(new browser.MouseEvent('click', { bubbles: true, cancelable: true })));
    expect(useUIStore.getState().settingsPage).toBe('providers');
    expect(useUIStore.getState().isSettingsDialogOpen).toBe(true);
  });

  test('keeps the notice hidden when the Host reports clean data', async () => {
    installBrowser();
    switchRuntimeEndpoint({ apiBaseUrl: 'http://task20.test', clientToken: 'task20', runtimeKey: 'task20-clean' });
    globalThis.fetch = async () => Response.json({ present: false });
    await renderNotice();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
