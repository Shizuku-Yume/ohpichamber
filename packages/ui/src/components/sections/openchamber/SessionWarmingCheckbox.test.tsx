import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import type { CacheWarmingApplyResult, CacheWarmingState } from '@openchamber/agent-contract';

let warmingState: CacheWarmingState = {
  workspaceId: 'workspace:/project',
  revision: '1',
  mode: 'off',
};
const updateCalls: Array<{ workspaceId: string; payload: unknown }> = [];

const canonicalClientModule = await import('@/api/canonicalClient');
mock.module('@/api/canonicalClient', () => ({
  ...canonicalClientModule,
  canonicalClient: {
    resolveWorkspace: async (directory: string) => ({
      workspaceId: `workspace:${directory}`,
      projectId: 'project',
      name: 'Project',
    }),
    readCacheWarming: async (workspaceId: string) => {
      return { ...warmingState, workspaceId };
    },
    updateCacheWarming: async (workspaceId: string, payload: { expectedRevision: string; mode: 'off' | 'idle' }) => {
      updateCalls.push({ workspaceId, payload });
      const nextRevision = String(Number(warmingState.revision) + 1);
      warmingState = {
        workspaceId,
        revision: nextRevision,
        mode: payload.mode,
      };
      const result: CacheWarmingApplyResult = {
        status: 'applied',
        persisted: warmingState,
        workers: [],
      };
      return result;
    },
  },
}));

mock.module('@/hooks/useSettingsDirectory', () => ({
  useSettingsDirectory: () => '/project',
}));

mock.module('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

mock.module('@/lib/persistence', () => ({
  reportSettingsSaveState: () => {},
}));

mock.module('@/components/sections/shared/SettingsSection', () => ({
  SettingsCheckboxRow: ({
    children,
    label,
    checked,
    onChange,
  }: {
    children?: React.ReactNode;
    label?: React.ReactNode;
    checked?: boolean;
    onChange?: (checked: boolean) => void;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label}
      {children}
    </label>
  ),
  SETTINGS_HELPER_CLASS: '',
}));

const { SessionWarmingCheckbox } = await import('./SessionWarmingCheckbox');

describe('SessionWarmingCheckbox', () => {
  let windowInstance: Window;
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    warmingState = {
      workspaceId: 'workspace:/project',
      revision: '1',
      mode: 'off',
    };
    updateCalls.length = 0;
    windowInstance = new Window({ url: 'http://localhost/' });
    Object.assign(globalThis, {
      window: windowInstance,
      document: windowInstance.document,
      navigator: windowInstance.navigator,
      Node: windowInstance.Node,
      Element: windowInstance.Element,
      HTMLElement: windowInstance.HTMLElement,
      Event: windowInstance.Event,
      MouseEvent: windowInstance.MouseEvent,
      MutationObserver: windowInstance.MutationObserver,
      getComputedStyle: windowInstance.getComputedStyle.bind(windowInstance),
      requestAnimationFrame: windowInstance.requestAnimationFrame.bind(windowInstance),
      cancelAnimationFrame: windowInstance.cancelAnimationFrame.bind(windowInstance),
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    windowInstance.close();
  });

  test('mounts, reads cache warming, toggles off to idle, and persists updated revision', async () => {
    await act(async () => {
      root.render(<SessionWarmingCheckbox />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const checkbox = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
    if (!checkbox) throw new Error('Checkbox not found');
    expect(checkbox.checked).toBe(false);

    // Toggle to idle
    await act(async () => {
      checkbox.click();
      await Promise.resolve();
    });

    expect(updateCalls).toEqual([
      {
        workspaceId: 'workspace:/project',
        payload: { expectedRevision: '1', mode: 'idle' },
      },
    ]);
    expect(warmingState.mode).toBe('idle');
    expect(warmingState.revision).toBe('2');

    // Re-mount / reload reads the persisted state
    await act(async () => {
      root.render(<SessionWarmingCheckbox key="reloaded" />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const reloadedCheckbox = host.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(reloadedCheckbox).not.toBeNull();
    if (!reloadedCheckbox) throw new Error('Reloaded checkbox not found');
    expect(reloadedCheckbox.checked).toBe(true);
  });
});
