import { expect, spyOn, test } from 'bun:test';
import { getRuntimeApiBaseUrl, getRuntimeKey, initializeRuntimeEndpoint } from '@/lib/runtime-switch';
import { useConfigStore } from './useConfigStore';
import { useQuotaStore } from './useQuotaStore';

test('Electron dev loads usage through its same-origin proxy before Settings opens', async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousInitialized = useConfigStore.getState().isInitialized;
  const previousWorkspaceId = useConfigStore.getState().workspaceId;
  const events = new EventTarget();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { origin: 'http://localhost:5173', href: 'http://localhost:5173/' },
      __OPENCHAMBER_LOCAL_ORIGIN__: 'http://localhost:3901',
      __OPENCHAMBER_ELECTRON__: { runtime: 'electron' },
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
    },
  });
  const requests: string[] = [];
  const network = spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = input.toString();
    requests.push(path);
    const pathname = new URL(path, 'http://localhost').pathname;
    if (pathname === '/api/config/settings') {
      return Response.json({ usageDropdownProviders: ['codex'] });
    }
    if (pathname === '/api/quota/extensions') {
      return Response.json({ extensions: [] });
    }
    if (pathname === '/api/quota/providers') return Response.json({ providers: ['codex'] });
    if (pathname === '/api/quota/codex') {
      return Response.json({
        providerId: 'codex', providerName: 'Codex', ok: true, configured: true, fetchedAt: 123,
        usage: { windows: { '5h': {
          usedPercent: 42, remainingPercent: 58, windowSeconds: 18000,
          resetAfterSeconds: 100, resetAt: 1000, resetAtFormatted: null, resetAfterFormatted: null,
        } } },
      });
    }
    throw new Error(`Unexpected request: ${path}`);
  });

  try {
    // Electron deliberately omits the API base when Vite proxies the backend.
    initializeRuntimeEndpoint({ apiBaseUrl: '', runtimeKey: null });
    // The Host resolves each quota read through a workspace, so a ready
    // instance publishes one before its first read. Publishing it is what
    // starts the load, so the reset comes first and the store's own scope
    // subscription performs the read the test then awaits.
    useQuotaStore.getState().resetForRuntimeSwitch();
    useConfigStore.setState({ isInitialized: true, workspaceId: 'ws_same_origin' });
    await useQuotaStore.getState().ensureLoadedForRuntime();

    // Every read carries the workspace the Host resolves its credential catalog through.
    expect(requests).toEqual([
      '/api/config/settings?surface=desktop', '/api/quota/extensions',
      '/api/quota/providers?workspaceId=ws_same_origin', '/api/quota/codex?workspaceId=ws_same_origin',
    ]);
    expect(getRuntimeKey()).toBe('local');
    expect(getRuntimeApiBaseUrl()).toBe('');
    expect(useQuotaStore.getState().loadedRuntimeKey).toBe('local');
    expect(useQuotaStore.getState().results[0]?.usage?.windows['5h'].remainingPercent).toBe(58);

    await useQuotaStore.getState().ensureLoadedForRuntime();
    expect(requests).toHaveLength(4);
  } finally {
    useQuotaStore.getState().resetForRuntimeSwitch();
    useConfigStore.setState({ isInitialized: previousInitialized, workspaceId: previousWorkspaceId });
    network.mockRestore();
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
