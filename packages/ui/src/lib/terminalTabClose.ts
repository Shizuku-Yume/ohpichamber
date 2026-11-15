import type { TerminalAPI } from '@/lib/api/types';
import { useTerminalStore } from '@/stores/useTerminalStore';

/**
 * Closing a terminal tab, for every surface that offers it: the terminal's own
 * tab strip and the header's terminal menu. Both must end the backend shell
 * first, then drop the tab from the store; a close that fails leaves the tab on
 * screen so the user still sees the shell that would not end. `onLastTab` runs
 * between those steps because the surface holding the terminal has to unmount
 * before the store's replacement tab could start a shell in its place.
 * `processExited` is for a tab whose process is already gone: the tab goes
 * at once and the server's record is released after without blocking tab removal.
 */
export const closeTerminalTab = async ({
 terminal,
 directory,
 tabId,
 beforeClose,
 onLastTab,
 processExited = false,
}: {
 terminal: Pick<TerminalAPI, 'close'>;
 directory: string;
 tabId: string;
 /** Surface-local teardown, run as the close starts (a stream subscription). */
 beforeClose?: () => void;
 /** The surface to take down when this was the directory's last tab. */
 onLastTab?: () => void;
 /** True when the process is already gone; tab drops at once and session is released asynchronously. */
 processExited?: boolean;
}): Promise<void> => {
 const state = useTerminalStore.getState().getDirectoryState(directory);
 if (!state) return;
 const tabs = state.tabs;
 const sessionId = tabs.find((tab) => tab.id === tabId)?.terminalSessionId ?? null;
 const isLastTab = tabs.length === 1 && tabs[0]?.id === tabId;

 beforeClose?.();
 if (processExited) {
  if (isLastTab) onLastTab?.();
  useTerminalStore.getState().closeTab(directory, tabId);
  if (sessionId) void terminal.close(sessionId, directory).catch(() => undefined);
  return;
 }
 if (sessionId) await terminal.close(sessionId, directory);
 if (isLastTab) onLastTab?.();
 useTerminalStore.getState().closeTab(directory, tabId);
};
