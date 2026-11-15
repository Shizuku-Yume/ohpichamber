import { afterAll, afterEach, expect, test } from 'bun:test';
import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import type { ToolCatalogEntry } from '@openchamber/agent-contract';
import { Window } from 'happy-dom';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser, document: browser.document, navigator: browser.navigator,
  localStorage: browser.localStorage, Node: browser.Node, Element: browser.Element,
  HTMLElement: browser.HTMLElement, HTMLInputElement: browser.HTMLInputElement,
  DocumentFragment: browser.DocumentFragment, Event: browser.Event, MouseEvent: browser.MouseEvent,
  MutationObserver: browser.MutationObserver, ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});

const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { AgentPermissionsEditor } = await import('./AgentPermissionsEditor');

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});
afterAll(() => browser.close());

const render = async (tools: ToolCatalogEntry[]) => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <I18nProvider>
        <AgentPermissionsEditor allowedTools={null} toolsCatalog={tools} onChange={() => {}} />
      </I18nProvider>,
    );
  });
  // Expand the Host-tools group so its rows are in the document.
  const toggle = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('OpenChamber'));
  if (toggle) await act(async () => toggle.click());
  return container;
};

test('a tool whose catalog label only repeats its id renders its name once', async () => {
  const view = await render([
    // The service builds a Host tool's label by capitalising the id.
    { name: 'openchamber', label: 'Openchamber', description: 'Host actions', tier: 'exec', availability: true },
  ]);
  expect(view.textContent).not.toContain('Openchamber (openchamber)');
  // The row still names the tool, using the transcript's presentation label.
  expect(view.textContent).toContain('OpenChamber');
});

test('a tool whose label adds information keeps the id beside it', async () => {
  const view = await render([
    { name: 'manage_skill', label: 'Manage skill', description: 'Install or remove a skill', tier: 'exec', availability: true },
  ]);
  expect(view.textContent).toContain('Manage skill');
  expect(view.textContent).toContain('(manage_skill)');
});
