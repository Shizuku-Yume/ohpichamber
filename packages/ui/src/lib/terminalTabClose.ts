import type { TerminalAPI } from '@/lib/api/types';
import { useTerminalStore } from '@/stores/useTerminalStore';

/**
 * Closing a terminal tab, for every surface that offers it: the terminal's own
 * tab strip and the header's terminal menu. Both must end the backend shell
 * first, then drop the tab from the store; a close that fails leaves the tab on
 * screen so the user still sees the shell that would not end. `onLastTab` runs
 * between those steps because the surface holding the terminal has to unmount
 * before the store's replacement tab could start a shell in its place.
 */
export const closeTerminalTab = async ({
 terminal,
 directory,
 tabId,
 beforeClose,
 onLastTab,
}: {
 terminal: Pick<TerminalAPI, 'close'>;
 directory: string;
 tabId: string;
 /** Surface-local teardown, run as the close starts (a stream subscription). */
 beforeClose?: () => void;
 /** The surface to take down when this was the directory's last tab. */
 onLastTab?: () => void;
}): Promise<void> => {
 const state = useTerminalStore.getState().getDirectoryState(directory);
 if (!state) return;
 const tabs = state.tabs;
 const sessionId = tabs.find((tab) => tab.id === tabId)?.terminalSessionId ?? null;
 const isLastTab = tabs.length === 1 && tabs[0]?.id === tabId;

 beforeClose?.();
 if (sessionId) await terminal.close(sessionId, directory);
 if (isLastTab) onLastTab?.();
 useTerminalStore.getState().closeTab(directory, tabId);
};
