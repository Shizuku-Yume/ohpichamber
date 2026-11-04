import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import { useBtwStore } from '@/stores/useBtwStore';
import { useBtwPanelState, type BtwPanelState } from './useBtwPanelState';

const browser = new Window({ url: 'http://runtime.test' });
const descriptors = new Map<string, PropertyDescriptor | undefined>();
for (const [name, value] of Object.entries({
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  HTMLElement: browser.HTMLElement,
  Element: browser.Element,
  Node: browser.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
})) {
  descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}


describe('useBtwPanelState', () => {
  let host: HTMLElement;
  let root: Root | null = null;

  beforeEach(() => {
    useBtwStore.setState({ byParent: {} });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterAll(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });

  test('returns default idle state when no panel entry exists', async () => {
    let panelState: BtwPanelState | undefined;
    const TestComponent = () => {
      panelState = useBtwPanelState('parent-none');
      return null;
    };
    await act(async () => {
      root?.render(React.createElement(TestComponent));
    });
    expect(panelState).toEqual({
      collapsed: false,
      pending: false,
      ephemeralRecordId: null,
      ephemeralText: '',
      ephemeralStatus: 'idle',
    });
  });

  test('reads active panel state for the parent session', async () => {
    useBtwStore.getState().setPanelState('parent-1', {
      collapsed: true,
      pending: true,
      ephemeralRecordId: 'rec-1',
      ephemeralText: 'Answer preview',
      ephemeralStatus: 'running',
    });
    let panelState: BtwPanelState | undefined;
    const TestComponent = () => {
      panelState = useBtwPanelState('parent-1');
      return null;
    };
    await act(async () => {
      root?.render(React.createElement(TestComponent));
    });
    expect(panelState).toEqual({
      collapsed: true,
      pending: true,
      ephemeralRecordId: 'rec-1',
      ephemeralText: 'Answer preview',
      ephemeralStatus: 'running',
    });
  });

  test('transitions to failed status upon stream interruption', async () => {
    useBtwStore.getState().setPanelState('parent-1', {
      collapsed: false,
      pending: false,
      ephemeralRecordId: 'rec-1',
      ephemeralText: 'Partial output',
      ephemeralStatus: 'running',
    });
    useBtwStore.getState().completeEphemeral('parent-1', 'rec-1', 'failed', 'Partial output');
    let panelState: BtwPanelState | undefined;
    const TestComponent = () => {
      panelState = useBtwPanelState('parent-1');
      return null;
    };
    await act(async () => {
      root?.render(React.createElement(TestComponent));
    });
    expect(panelState).toEqual({
      collapsed: false,
      pending: false,
      ephemeralRecordId: 'rec-1',
      ephemeralText: 'Partial output',
      ephemeralStatus: 'failed',
    });
  });
});
