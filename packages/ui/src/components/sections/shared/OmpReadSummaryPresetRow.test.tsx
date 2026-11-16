/**
 * The read-summary preset writes a whole tuple in one change set, shows the
 * stored tuple rather than a remembered choice, and treats Custom as a state
 * the user cannot select.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { OmpSettingValue } from '@openchamber/agent-contract';
import type { Root } from 'react-dom/client';
import { Window } from 'happy-dom';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  localStorage: browser.localStorage,
  sessionStorage: browser.sessionStorage,
  Node: browser.Node,
  Element: browser.Element,
  HTMLElement: browser.HTMLElement,
  HTMLInputElement: browser.HTMLInputElement,
  HTMLTextAreaElement: browser.HTMLTextAreaElement,
  Event: browser.Event,
  FocusEvent: browser.FocusEvent,
  CustomEvent: browser.CustomEvent,
  KeyboardEvent: browser.KeyboardEvent,
  MouseEvent: browser.MouseEvent,
  PointerEvent: browser.PointerEvent,
  MutationObserver: browser.MutationObserver,
  ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});

// React DOM reads `document` at module scope, so it must be imported after
// happy-dom installs the globals; a static import would evaluate too early.
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { OmpReadSummaryPresetRow } = await import('./OmpReadSummaryPresetRow');

const DEFAULTS = {
  'read.summarize.enabled': null,
  'read.summarize.minBodyLines': null,
  'read.summarize.minCommentLines': null,
  'read.summarize.unfoldUntil': null,
  'read.summarize.unfoldLimit': null,
} satisfies Record<string, OmpSettingValue>;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const render = async (
  values: Record<string, OmpSettingValue>,
  onApply: (changes: Record<string, OmpSettingValue>) => void,
) => {
  await act(async () => {
    root.render(
      <I18nProvider>
        <OmpReadSummaryPresetRow values={values} onApply={onApply} />
      </I18nProvider>,
    );
  });
  const row = container.querySelector<HTMLElement>('[data-settings-item="omp.read.summarize.enabled"]');
  if (!row) throw new Error('preset row missing');
  return row;
};

const openOptions = async (row: HTMLElement) => {
  const trigger = row.querySelector<HTMLElement>('[role="combobox"]');
  if (!trigger) throw new Error('preset select missing');
  await act(async () => {
    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
  });
  return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
};

describe('OmpReadSummaryPresetRow', () => {
  test('shows the stored tuple, with its explanation behind the info hint', async () => {
    const row = await render(DEFAULTS, () => { });
    expect(row.textContent).toContain('Read summary strength');
    expect(row.textContent).toContain('Balanced');

    const hint = row.querySelector<HTMLButtonElement>('button[aria-expanded]');
    if (!hint) throw new Error('info hint missing');
    await act(async () => { hint.click(); });
    expect(document.body.textContent).toContain('four thresholds');
  });

  test('offers four choices, with Custom disabled as a state rather than a choice', async () => {
    const row = await render({ ...DEFAULTS, 'read.summarize.enabled': false }, () => { });
    const options = await openOptions(row);
    expect(options.map((option) => option.textContent)).toEqual(['Off', 'Balanced', 'Aggressive', 'Custom']);
    const custom = options.find((option) => option.textContent === 'Custom');
    expect(custom?.getAttribute('aria-disabled')).toBe('true');
  });

  test('the aggressive preset writes its four thresholds in one change set', async () => {
    const applied: Array<Record<string, OmpSettingValue>> = [];
    const row = await render(DEFAULTS, (changes) => applied.push(changes));
    const options = await openOptions(row);
    const aggressive = options.find((option) => option.textContent === 'Aggressive');
    if (!aggressive) throw new Error('aggressive option missing');
    await act(async () => { aggressive.click(); });
    expect(applied).toEqual([{
      'read.summarize.minBodyLines': 3,
      'read.summarize.minCommentLines': 4,
      'read.summarize.unfoldUntil': 30,
      'read.summarize.unfoldLimit': 60,
    }]);
  });

  test('off writes only the switch and leaves the thresholds alone', async () => {
    const applied: Array<Record<string, OmpSettingValue>> = [];
    const row = await render(DEFAULTS, (changes) => applied.push(changes));
    const options = await openOptions(row);
    const off = options.find((option) => option.textContent === 'Off');
    if (!off) throw new Error('off option missing');
    await act(async () => { off.click(); });
    expect(applied).toEqual([{ 'read.summarize.enabled': false }]);
  });

  test('a tuple that matches no preset shows Custom, and a preset writes only the key that differs', async () => {
    const applied: Array<Record<string, OmpSettingValue>> = [];
    const row = await render({
      'read.summarize.enabled': true,
      'read.summarize.minBodyLines': 5,
      'read.summarize.minCommentLines': 6,
      'read.summarize.unfoldUntil': 50,
      'read.summarize.unfoldLimit': 100,
    }, (changes) => applied.push(changes));
    expect(row.textContent).toContain('Custom');
    const options = await openOptions(row);
    const balanced = options.find((option) => option.textContent === 'Balanced');
    if (!balanced) throw new Error('balanced option missing');
    await act(async () => { balanced.click(); });
    expect(applied).toEqual([{ 'read.summarize.minBodyLines': 4 }]);
  });
});
