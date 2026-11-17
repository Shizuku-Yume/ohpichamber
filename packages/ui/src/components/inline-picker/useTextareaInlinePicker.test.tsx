import { afterEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import { Window } from 'happy-dom';

import type { InlinePicker } from './useInlinePicker';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  Node: browser.Node,
  Element: browser.Element,
  HTMLElement: browser.HTMLElement,
  HTMLTextAreaElement: browser.HTMLTextAreaElement,
  Event: browser.Event,
  InputEvent: browser.InputEvent,
  KeyboardEvent: browser.KeyboardEvent,
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  getComputedStyle: browser.getComputedStyle.bind(browser),
});
// React DOM reads the DOM globals when imported, so happy-dom must be assigned first.
const { createRoot } = await import('react-dom/client');
const { useTextareaInlinePicker } = await import('./useTextareaInlinePicker');

let root: Root | null = null;

const colonPicker: InlinePicker = {
  id: 'colon',
  width: 240,
  match: (value, caret) => {
    const before = value.slice(0, caret);
    const index = before.lastIndexOf(':');
    return index >= 0 ? { from: index, query: before.slice(index + 1) } : null;
  },
  render: ({ query }) => <div data-testid="picker-list">{query}</div>,
};

const pickers = [colonPicker];

function Host({ show = true, fieldKey = 'one' }: { show?: boolean; fieldKey?: string }) {
  const fieldRef = React.useRef<HTMLTextAreaElement>(null);
  const picker = useTextareaInlinePicker(fieldRef, pickers);
  return (
    <div>
      {show ? <textarea key={fieldKey} ref={fieldRef} /> : null}
      {picker}
    </div>
  );
}

const render = async (element: React.ReactElement) => {
  const container = document.createElement('div');
  document.body.append(container);
  await act(async () => {
    root = createRoot(container);
    root.render(element);
  });
  return container;
};

const typeTrigger = async (textarea: HTMLTextAreaElement, text: string) => {
  textarea.value = text;
  textarea.setSelectionRange(text.length, text.length);
  await act(async () => {
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.replaceChildren();
});

describe('useTextareaInlinePicker', () => {
  test('attaches to a conditionally mounted textarea while enabled stays true', async () => {
    const container = await render(<Host show={false} />);
    expect(container.querySelector('textarea')).toBeNull();

    await act(async () => {
      root?.render(<Host show />);
    });
    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();
    if (!textarea) return;

    await typeTrigger(textarea, ':smile');
    expect(document.body.querySelector('[data-testid="picker-list"]')?.textContent).toBe('smile');
  });

  test('follows a textarea that remounts with a new key', async () => {
    const container = await render(<Host fieldKey="first" />);
    const first = container.querySelector('textarea');
    expect(first).not.toBeNull();
    if (!first) return;

    await act(async () => {
      root?.render(<Host fieldKey="second" />);
    });
    const second = container.querySelector('textarea');
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    if (!second) return;

    await typeTrigger(second, ':wave');
    expect(document.body.querySelector('[data-testid="picker-list"]')?.textContent).toBe('wave');
  });
});
