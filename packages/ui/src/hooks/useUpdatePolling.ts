import React from 'react';

import { isElectronShell } from '@/lib/desktop';
import { useUpdateStore } from '@/stores/useUpdateStore';

const INITIAL_DELAY_MS = 3000;
const INTERVAL_MS = 60 * 60 * 1000;

/**
 * Checks the desktop app's own update feed an hour after launch and then
 * hourly. Nothing runs outside the Electron shell, which is the only runtime
 * that updates itself from here.
 */
export function useUpdatePolling() {
  const checkForUpdates = useUpdateStore((state) => state.checkForUpdates);

  React.useEffect(() => {
    if (!isElectronShell()) return;
    let disposed = false;
    let timer: number | null = null;

    const schedule = (delayMs: number) => {
      timer = window.setTimeout(() => {
        if (disposed) return;
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          schedule(INTERVAL_MS);
          return;
        }
        void useUpdateStore.getState().checkForUpdates().finally(() => {
          if (!disposed) schedule(INTERVAL_MS);
        });
      }, delayMs);
    };

    schedule(INITIAL_DELAY_MS);
    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [checkForUpdates]);
}
