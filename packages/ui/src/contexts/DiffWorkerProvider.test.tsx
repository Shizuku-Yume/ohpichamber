import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, spyOn, test, type Mock } from 'bun:test';
import { plugin } from 'bun';
import { Window } from 'happy-dom';
import type { WorkerPoolManager, WorkerRequest } from '@pierre/diffs/worker';

import { getDefaultTheme, themes } from '@/lib/theme/themes';
import { ThemeSystemContext, type ThemeContextValue } from './theme-system-context';

plugin({
  name: 'diff-worker-url-stub',
  setup(build) {
    build.onResolve({ filter: /\?worker&url$/ }, ({ path }) => ({ path, namespace: 'worker-url' }));
    build.onLoad({ filter: /.*/, namespace: 'worker-url' }, () => ({
      contents: 'export default "blob:test-diff-worker";',
      loader: 'js',
    }));
  },
});

import { DiffWorkerProvider, useWorkerPool, useWorkerPoolState, type WorkerPoolState } from './DiffWorkerProvider';

type WorkerMode = 'success' | 'timeout' | 'error' | 'render-options-error';

let currentWorkerMode: WorkerMode = 'success';
const createdWorkers: ControllableWorker[] = [];

const NativeEventTarget = globalThis.EventTarget;
const NativeMessageEvent = globalThis.MessageEvent;
const NativeErrorEvent = globalThis.ErrorEvent;

class ControllableWorker extends NativeEventTarget {
  terminated = false;

  constructor() {
    super();
    createdWorkers.push(this);
  }

  postMessage(data: WorkerRequest): void {
    if (this.terminated) return;

    if (currentWorkerMode === 'timeout') {
      // Simulate unresponsive worker to trigger workerInitializationTimeout
      return;
    }

    if (currentWorkerMode === 'error') {
      queueMicrotask(() => {
        if (this.terminated) return;
        this.dispatchEvent(
          new NativeErrorEvent('error', {
            error: new Error('Simulated worker failure'),
            message: 'Simulated worker failure',
          }),
        );
      });
      return;
    }

    if (data.type === 'initialize' || data.type === 'set-render-options') {
      const { type, id } = data;
      queueMicrotask(() => {
        if (this.terminated) return;
        const isRenderOptionsError =
          currentWorkerMode === 'render-options-error' && type === 'set-render-options';
        const responseData = {
          type: isRenderOptionsError ? 'error' : 'success',
          requestType: type,
          id,
          error: isRenderOptionsError ? 'Simulated setRenderOptions failure' : undefined,
          sentAt: Date.now(),
        };
        this.dispatchEvent(new NativeMessageEvent('message', { data: responseData }));
      });
    }
  }

  terminate(): void {
    this.terminated = true;
  }
}

const sleep = (ms: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
};

const createThemeContextValue = (darkThemeId: string): ThemeContextValue => {
  const lightTheme = getDefaultTheme(false);
  const darkTheme = themes.find((theme) => theme.metadata.id === darkThemeId) ?? getDefaultTheme(true);
  return {
    currentTheme: darkTheme,
    availableThemes: themes,
    customThemeIds: [],
    setTheme: () => { },
    customThemesLoading: false,
    reloadCustomThemes: async () => { },
    importTheme: async () => darkTheme,
    deleteImportedTheme: async () => { },
    isSystemPreference: false,
    setSystemPreference: () => { },
    themeMode: 'dark',
    setThemeMode: () => { },
    lightThemeId: lightTheme.metadata.id,
    darkThemeId: darkTheme.metadata.id,
    setLightThemePreference: () => { },
    setDarkThemePreference: () => { },
  };
};

describe('DiffWorkerProvider & useWorkerPool', () => {
  let dom: Window;
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const unhandledRejections: unknown[] = [];
  const idleCleanups = new Map<number, () => void>();
  let nextIdleId = 1;
  let warnSpy: Mock<typeof console.warn>;

  const onProcessUnhandled = (cause: unknown) => {
    unhandledRejections.push(cause);
  };

  beforeEach(() => {
    unhandledRejections.length = 0;
    createdWorkers.length = 0;
    idleCleanups.clear();
    nextIdleId = 1;
    currentWorkerMode = 'success';
    DiffWorkerProvider._resetPoolsForTesting?.();
    DiffWorkerProvider._setWorkerInitTimeoutForTesting?.(50);

    warnSpy = spyOn(console, 'warn').mockImplementation(() => { });
    process.on('unhandledRejection', onProcessUnhandled);

    dom = new Window({ url: 'http://localhost' });
    const requestIdleCallback = (cb: IdleRequestCallback): number => {
      const id = nextIdleId++;
      const timer = setTimeout(() => {
        idleCleanups.delete(id);
        cb({ didTimeout: false, timeRemaining: () => 50 });
      }, 10);
      idleCleanups.set(id, () => clearTimeout(timer));
      return id;
    };
    const cancelIdleCallback = (id: number): void => {
      const cancel = idleCleanups.get(id);
      if (cancel !== undefined) {
        cancel();
        idleCleanups.delete(id);
      }
    };

    Object.defineProperty(dom, 'requestIdleCallback', {
      configurable: true,
      writable: true,
      value: requestIdleCallback,
    });
    Object.defineProperty(dom, 'cancelIdleCallback', {
      configurable: true,
      writable: true,
      value: cancelIdleCallback,
    });

    for (const [name, value] of Object.entries({
      window: dom,
      Window: dom.Window,
      document: dom.document,
      navigator: dom.navigator,
      Element: dom.Element,
      HTMLElement: dom.HTMLElement,
      Node: dom.Node,
      Event: dom.Event,
      CustomEvent: dom.CustomEvent,
      MessageEvent: dom.MessageEvent,
      ErrorEvent: dom.ErrorEvent,
      customElements: dom.customElements,
      Worker: ControllableWorker,
      getComputedStyle: dom.getComputedStyle.bind(dom),
      requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
      cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
      requestIdleCallback,
      cancelIdleCallback,
      IS_REACT_ACT_ENVIRONMENT: true,
    })) {
      originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
      Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    }
  });

  afterEach(async () => {
    process.off('unhandledRejection', onProcessUnhandled);
    warnSpy.mockRestore();
    for (const cancel of idleCleanups.values()) {
      cancel();
    }
    idleCleanups.clear();
    for (const worker of createdWorkers) {
      worker.terminate();
    }
    DiffWorkerProvider._resetPoolsForTesting?.();

    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    originals.clear();
    await dom.happyDOM.close();
  });

  test('initializes worker pool normally when workers succeed with zero warnings or rejections', async () => {
    currentWorkerMode = 'success';

    let capturedPool: WorkerPoolManager | undefined;
    let capturedState: WorkerPoolState | undefined;
    const seenStatuses: WorkerPoolState['status'][] = [];
    function Probe() {
      capturedPool = useWorkerPool('unified');
      capturedState = useWorkerPoolState('unified');
      if (seenStatuses[seenStatuses.length - 1] !== capturedState.status) {
        seenStatuses.push(capturedState.status);
      }
      return null;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <DiffWorkerProvider>
          <Probe />
        </DiffWorkerProvider>,
      );
    });

    const start = Date.now();
    while (!capturedPool && Date.now() - start < 3000) {
      await act(async () => {
        await sleep(25);
      });
    }

    expect(capturedPool).toBeDefined();
    expect(capturedPool?.isWorkingPool()).toBe(true);
    expect(capturedState).toEqual({ status: 'ready', pool: capturedPool });
    expect(seenStatuses).toEqual(['pending', 'ready']);
    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(unhandledRejections).toHaveLength(0);

    await act(async () => {
      root.unmount();
    });
  });

  test('guards worker initialization error across unified and split pools, falls back to failed/undefined, and logs once', async () => {
    currentWorkerMode = 'error';

    let unifiedPool: WorkerPoolManager | undefined;
    let splitPool: WorkerPoolManager | undefined;
    let unifiedState: WorkerPoolState | undefined;
    let splitState: WorkerPoolState | undefined;
    const seenUnifiedStatuses: WorkerPoolState['status'][] = [];
    function Probe() {
      unifiedPool = useWorkerPool('unified');
      splitPool = useWorkerPool('split');
      unifiedState = useWorkerPoolState('unified');
      splitState = useWorkerPoolState('split');
      if (seenUnifiedStatuses[seenUnifiedStatuses.length - 1] !== unifiedState.status) {
        seenUnifiedStatuses.push(unifiedState.status);
      }
      return null;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <DiffWorkerProvider>
          <Probe />
        </DiffWorkerProvider>,
      );
    });

    await act(async () => {
      await sleep(150);
    });

    expect(unhandledRejections).toHaveLength(0);
    expect(unifiedPool).toBeUndefined();
    expect(splitPool).toBeUndefined();
    expect(unifiedState).toEqual({ status: 'failed', pool: undefined });
    expect(splitState).toEqual({ status: 'failed', pool: undefined });
    expect(seenUnifiedStatuses).toEqual(['pending', 'failed']);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    for (const worker of createdWorkers) {
      expect(worker.terminated).toBe(true);
    }

    await act(async () => {
      root.unmount();
    });
  });

  test('guards worker initialization timeout across unified and split pools, terminates workers, and logs once', async () => {
    currentWorkerMode = 'timeout';

    let unifiedPool: WorkerPoolManager | undefined;
    let splitPool: WorkerPoolManager | undefined;
    let unifiedState: WorkerPoolState | undefined;
    let splitState: WorkerPoolState | undefined;
    function Probe() {
      unifiedPool = useWorkerPool('unified');
      splitPool = useWorkerPool('split');
      unifiedState = useWorkerPoolState('unified');
      splitState = useWorkerPoolState('split');
      return null;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <DiffWorkerProvider>
          <Probe />
        </DiffWorkerProvider>,
      );
    });

    await act(async () => {
      await sleep(200);
    });

    expect(unhandledRejections).toHaveLength(0);
    expect(unifiedPool).toBeUndefined();
    expect(splitPool).toBeUndefined();
    expect(unifiedState).toEqual({ status: 'failed', pool: undefined });
    expect(splitState).toEqual({ status: 'failed', pool: undefined });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(createdWorkers.length).toBeGreaterThan(0);
    for (const worker of createdWorkers) {
      expect(worker.terminated).toBe(true);
    }

    await act(async () => {
      root.unmount();
    });
  });

  test('guards setRenderOptions failure during init, falls back to failed/undefined, and logs once', async () => {
    currentWorkerMode = 'render-options-error';

    let unifiedPool: WorkerPoolManager | undefined;
    let splitPool: WorkerPoolManager | undefined;
    let unifiedState: WorkerPoolState | undefined;
    let splitState: WorkerPoolState | undefined;
    function Probe() {
      unifiedPool = useWorkerPool('unified');
      splitPool = useWorkerPool('split');
      unifiedState = useWorkerPoolState('unified');
      splitState = useWorkerPoolState('split');
      return null;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ThemeSystemContext.Provider value={createThemeContextValue('openchamber-dark')}>
          <DiffWorkerProvider>
            <Probe />
          </DiffWorkerProvider>
        </ThemeSystemContext.Provider>,
      );
    });

    await act(async () => {
      await sleep(150);
    });

    expect(unhandledRejections).toHaveLength(0);
    expect(unifiedPool).toBeUndefined();
    expect(splitPool).toBeUndefined();
    expect(unifiedState).toEqual({ status: 'failed', pool: undefined });
    expect(splitState).toEqual({ status: 'failed', pool: undefined });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    for (const worker of createdWorkers) {
      expect(worker.terminated).toBe(true);
    }

    await act(async () => {
      root.unmount();
    });
  });

  test('evicts pool back to undefined without unhandled rejections and logs once when setRenderOptions fails on theme change', async () => {
    currentWorkerMode = 'success';

    let capturedPool: WorkerPoolManager | undefined;
    function Probe() {
      capturedPool = useWorkerPool('unified');
      return null;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ThemeSystemContext.Provider value={createThemeContextValue('openchamber-dark')}>
          <DiffWorkerProvider>
            <Probe />
          </DiffWorkerProvider>
        </ThemeSystemContext.Provider>,
      );
    });

    const start = Date.now();
    while (!capturedPool && Date.now() - start < 3000) {
      await act(async () => {
        await sleep(25);
      });
    }

    expect(capturedPool).toBeDefined();
    expect(warnSpy).toHaveBeenCalledTimes(0);

    currentWorkerMode = 'render-options-error';

    await act(async () => {
      root.render(
        <ThemeSystemContext.Provider value={createThemeContextValue('flexoki-dark')}>
          <DiffWorkerProvider>
            <Probe />
          </DiffWorkerProvider>
        </ThemeSystemContext.Provider>,
      );
    });

    await act(async () => {
      await sleep(150);
    });

    expect(unhandledRejections).toHaveLength(0);
    expect(capturedPool).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });
});
