import { afterAll, afterEach, beforeEach, expect, test } from 'bun:test';
import type { Model } from '@openchamber/agent-contract';
import type { Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import { plugin } from 'bun';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser, document: browser.document, navigator: browser.navigator, localStorage: browser.localStorage,
  Node: browser.Node, Element: browser.Element, HTMLElement: browser.HTMLElement,
  HTMLInputElement: browser.HTMLInputElement, HTMLTextAreaElement: browser.HTMLTextAreaElement,
  Event: browser.Event, FocusEvent: browser.FocusEvent, CustomEvent: browser.CustomEvent,
  MutationObserver: browser.MutationObserver, ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser), IS_REACT_ACT_ENVIRONMENT: true,
});
// These loading boundaries must run after the browser globals and the Bun asset-loader plugin are installed.
plugin({
  name: 'model-role-editor-provider-logos',
  setup(build) {
    build.onLoad({ filter: /useProviderLogo\.ts$/ }, ({ path }) => {
      const directory = resolve(dirname(path), '../assets/provider-logos');
      const logos = Object.fromEntries(readdirSync(directory).filter((name) => name.endsWith('.svg')).map((name) => [
        `../assets/provider-logos/${name}`, pathToFileURL(resolve(directory, name)).href,
      ]));
      return { contents: readFileSync(path, 'utf8').replace(/import\.meta\.glob<string>\([\s\S]*?\);/, `${JSON.stringify(logos)};`), loader: 'ts' };
    });
  },
});
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { formatModelRef } = await import('@openchamber/agent-contract');
const { ModelRoleEditor } = await import('./ModelRoleEditor');

const model: Model = {
  modelId: 'model', provider: 'provider', name: 'Test model', modalities: ['text'],
  contextWindow: 1000, maxOutputTokens: 100, reasoningEffortSupported: false,
  reasoningOptions: [], variants: [], pricing: null,
};
const SELECTED = formatModelRef({ provider: 'provider', modelId: 'model' });
const PLACEHOLDER = 'Use the default model';
const LOADING = 'Loading...';

const container = document.createElement('div');
document.body.appendChild(container);
let root: Root;
beforeEach(() => { root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); });
afterAll(() => { browser.close(); });

const renderEditor = async (loading: boolean, roles: Record<string, string>) => {
  await act(async () => {
    root.render(
      <I18nProvider>
        <ModelRoleEditor
          role="smol"
          roles={roles}
          models={[model]}
          label="Small model"
          settingsItem="test.model-role"
          loading={loading}
          onChange={() => {}}
        />
      </I18nProvider>,
    );
  });
};

test('model role editor shows the loading trigger while the value is pending, then the model, never the inherit placeholder in between', async () => {
  const snapshots: string[] = [];

  await renderEditor(true, {});
  snapshots.push(container.textContent ?? '');
  expect(snapshots[0]).toContain(LOADING);
  expect(snapshots[0]).not.toContain(PLACEHOLDER);

  await renderEditor(true, { smol: SELECTED });
  snapshots.push(container.textContent ?? '');
  expect(snapshots[1]).toContain(LOADING);
  expect(snapshots[1]).not.toContain(PLACEHOLDER);

  await renderEditor(false, { smol: SELECTED });
  snapshots.push(container.textContent ?? '');
  expect(snapshots[2]).not.toContain(LOADING);
  expect(snapshots[2]).not.toContain(PLACEHOLDER);
  expect(snapshots[2]).toContain('model');

  expect(snapshots.some((text) => text.includes(PLACEHOLDER))).toBe(false);
});
