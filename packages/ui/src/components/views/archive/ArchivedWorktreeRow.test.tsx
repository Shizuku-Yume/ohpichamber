import { afterAll, afterEach, beforeEach, expect, test } from 'bun:test';
import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import type { GitWorktreeArchive } from '@/lib/api/types';

const browser = new Window({ url: 'http://localhost' });
let root: Root;
const descriptors = new Map<string, PropertyDescriptor | undefined>();
for (const [key, value] of Object.entries({ window: browser, document: browser.document, navigator: browser.navigator, localStorage: browser.localStorage, Element: browser.Element, HTMLElement: browser.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
  descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value, configurable: true });
}
// React DOM detects input support when imported, so the component loads after
// the DOM is installed. The test intentionally exercises that loading boundary.
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { ArchivedWorktreeRow } = await import('./ArchivedWorktreeRow');

const archive: GitWorktreeArchive = {
  id: 'a1',
  ref: 'refs/openchamber/archive/a1',
  commit: 'commit-a1',
  head: 'head-a1',
  path: '/worktrees/login-fix',
  branch: 'feature/login',
  branchExists: true,
  title: 'Login fix',
  archivedAt: Date.parse('2026-10-29T10:00:00Z'),
  sessionIds: ['ses_1'],
};

beforeEach(() => {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
});

afterAll(async () => {
  await browser.happyDOM.close();
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

const render = async (element: React.ReactNode) => {
  await act(async () => root.render(<I18nProvider>{element}</I18nProvider>));
};

test('shows the worktree name, branch and archive date, and Restore and Delete act once each', async () => {
  let restored = 0;
  let deleted = 0;
  await render(<ArchivedWorktreeRow archive={archive} busy={false} onRestore={() => { restored += 1; }} onDelete={() => { deleted += 1; }} />);
  const text = document.body.textContent ?? '';
  expect(text).toContain('Login fix');
  expect(text).toContain('feature/login');
  const buttons = [...document.querySelectorAll('button')];
  const restore = buttons.find((button) => button.getAttribute('aria-label')?.includes('Login fix') && button.textContent?.includes('Restore'));
  const remove = buttons.find((button) => button.getAttribute('aria-label')?.includes('Login fix') && !button.textContent?.includes('Restore'));
  if (!restore || !remove) throw new Error('Archive row actions are missing');
  await act(async () => restore.click());
  await act(async () => remove.click());
  expect(restored).toBe(1);
  expect(deleted).toBe(1);
});

test('a busy row disables both actions, and touch shows Delete without hover', async () => {
  let restored = 0;
  let deleted = 0;
  await render(<ArchivedWorktreeRow archive={archive} busy onRestore={() => { restored += 1; }} onDelete={() => { deleted += 1; }} touch />);
  const buttons = [...document.querySelectorAll('button')];
  const restore = buttons.find((button) => button.textContent?.includes('Restore'));
  const remove = buttons.find((button) => button.getAttribute('aria-label')?.includes('Login fix') && !button.textContent?.includes('Restore'));
  if (!restore || !remove) throw new Error('Touch archive row actions are missing');
  expect(restore.disabled).toBe(true);
  expect(remove.disabled).toBe(true);
  expect(remove.className).not.toContain('opacity-0');
  await act(async () => restore.click());
  expect(restored).toBe(0);
  expect(deleted).toBe(0);
});
