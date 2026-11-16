import { act } from 'react';
import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';

test('resolves callable providers from configured catalog and OMP modelRoles', async () => {
  const dom = new Window({ url: 'http://localhost' });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const globals = {
    window: dom, document: dom.document, navigator: dom.navigator, location: dom.location,
    localStorage: dom.localStorage,
    Element: dom.Element, HTMLElement: dom.HTMLElement, Node: dom.Node,
    Event: dom.Event, CustomEvent: dom.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [name, value] of Object.entries(globals)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }

  const { createRoot } = await import('react-dom/client');
  const { useConfigStore } = await import('@/stores/useConfigStore');
  const { useCallableModelProviders } = await import('./useCallableModelProviders');
  let providerIds: string[] | undefined;
  function Harness() {
    providerIds = useCallableModelProviders();
    return null;
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  try {
    // Unloaded: returns undefined
    useConfigStore.setState((state) => ({ ...state, providersLoaded: false, providers: [] }));
    await act(async () => { root.render(<Harness />); });
    expect(providerIds).toBeUndefined();

    // Loaded with catalog and modelRoles: resolves union of callable providers
    await act(async () => {
      useConfigStore.setState((state) => ({
        ...state,
        providersLoaded: true,
        providers: [
          { providerId: 'anthropic', models: [], canonicalAuth: { status: 'configured' } },
          { providerId: 'unconfigured', models: [], canonicalAuth: { status: 'missing' } },
        ] as unknown as typeof state.providers,
        ompSettings: {
          workspaceId: 'ws_1',
          revision: '1',
          totalCount: 1,
          placementCounts: { tuiOnly: 0, boundary: 0, elsewhere: 0 },
          settings: [
            { id: 'modelRoles', type: 'record', value: { smol: 'openai/o3-mini:high' }, default: null, configured: true, placement: { type: 'engine' } },
          ],
        },
      }));
    });
    expect(providerIds?.sort()).toEqual(['anthropic', 'openai']);
  } finally {
    await act(async () => { root.unmount(); });
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
