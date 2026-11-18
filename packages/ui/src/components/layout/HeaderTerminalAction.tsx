import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Icon } from '@/components/icon/Icon';
import type { IconName } from '@/components/icon/icons';
import { toast } from '@/components/ui';
import { useRuntimeAPIs } from '@/hooks/useRuntimeAPIs';
import { useI18n } from '@/lib/i18n';
import { closeTerminalTab } from '@/lib/terminalTabClose';
import { formatShortcutForDisplay, getEffectiveShortcutCombo } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';
import { normalizeContextPanelDirectoryKey, useUIStore } from '@/stores/useUIStore';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { PROJECT_ACTION_ICONS } from '@/lib/projectActions';
import { shownContextModes } from '@/lib/workspace/zones';

interface HeaderTerminalActionProps {
  directory: string | null | undefined;
  className?: string;
}

const resolveTerminalTabIcon = (iconKey?: string | null): IconName => {
  if (!iconKey) return 'terminal-box';
  const matched = PROJECT_ACTION_ICONS.find((entry) => entry.key === iconKey);
  return matched?.Icon ?? 'terminal-box';
};

export const HeaderTerminalAction: React.FC<HeaderTerminalActionProps> = ({
  directory,
  className,
}) => {
  const { t } = useI18n();
  const { terminal } = useRuntimeAPIs();
  const shortcutOverrides = useUIStore((state) => state.shortcutOverrides);
  // One key for the terminal store, the context panel and the surface it shows:
  // the store partitions by directory, so an unresolved one would be a state
  // key nothing on screen ever reads.
  const resolvedDirectory = React.useMemo(
    () => normalizeContextPanelDirectoryKey(directory ?? ''),
    [directory],
  );

  const isTerminalShown = useUIStore((state) => {
    if (!resolvedDirectory) return false;
    const panel = state.contextPanelByDirectory[resolvedDirectory];
    return shownContextModes(panel, state.contextSurfaceZones).has('terminal');
  });

  const terminalState = useTerminalStore((state) => (
    resolvedDirectory ? state.getDirectoryState(resolvedDirectory) : undefined
  ));

  const tabs = terminalState?.tabs ?? [];
  const activeTabId = terminalState?.activeTabId ?? null;
  const hasDirectory = resolvedDirectory.length > 0;

  const terminalShortcut = React.useMemo(() => (
    formatShortcutForDisplay(getEffectiveShortcutCombo('toggle_terminal', shortcutOverrides), '')
  ), [shortcutOverrides]);

  const tooltipLabel = terminalShortcut
    ? t('header.actions.terminalPanelWithShortcut', { shortcut: terminalShortcut })
    : t('header.actions.toggleTerminalPanelAria');

  const handleToggleTerminal = React.useCallback(() => {
    if (!hasDirectory) return;
    useUIStore.getState().openContextSurface(resolvedDirectory, 'terminal');
  }, [hasDirectory, resolvedDirectory]);

  const handleCreateTab = React.useCallback(() => {
    if (!hasDirectory) return;
    const tabId = useTerminalStore.getState().createTab(resolvedDirectory);
    if (!tabId) return;
    useTerminalStore.getState().setActiveTab(resolvedDirectory, tabId);
    const uiState = useUIStore.getState();
    const isShown = shownContextModes(uiState.contextPanelByDirectory[resolvedDirectory], uiState.contextSurfaceZones).has('terminal');
    if (!isShown) {
      uiState.openContextSurface(resolvedDirectory, 'terminal');
    }
  }, [hasDirectory, resolvedDirectory]);

  const handleSelectTab = React.useCallback((tabId: string) => {
    if (!hasDirectory) return;
    useTerminalStore.getState().setActiveTab(resolvedDirectory, tabId);
    const uiState = useUIStore.getState();
    const isShown = shownContextModes(uiState.contextPanelByDirectory[resolvedDirectory], uiState.contextSurfaceZones).has('terminal');
    if (!isShown) {
      uiState.openContextSurface(resolvedDirectory, 'terminal');
    }
  }, [hasDirectory, resolvedDirectory]);

  // The terminal's own tab strip closes through the same lifecycle: the backend
  // shell ends before the tab leaves the store, and a failed close keeps the tab
  // visible so the running shell is never hidden.
  const handleCloseTab = React.useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (!hasDirectory) return;
    const surfaceTab = useUIStore.getState().contextPanelByDirectory[resolvedDirectory]?.tabs
      .find((tab) => tab.mode === 'terminal');
    void closeTerminalTab({
      terminal,
      directory: resolvedDirectory,
      tabId,
      onLastTab: surfaceTab
        ? () => useUIStore.getState().closeContextPanelTab(resolvedDirectory, surfaceTab.id)
        : undefined,
    }).catch((error: unknown) => {
      toast.error(error instanceof Error && error.message ? error.message : t('terminalView.error.sessionEnded'));
    });
  }, [hasDirectory, resolvedDirectory, t, terminal]);

  return (
    <div className={cn('inline-flex items-center', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleToggleTerminal}
            disabled={!hasDirectory}
            aria-label={t('header.actions.toggleTerminalPanelAria')}
            aria-pressed={isTerminalShown}
            className={cn(
              'app-region-no-drag inline-flex h-8 w-8 items-center justify-center rounded-md typography-ui-label font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
              isTerminalShown
                ? 'bg-interactive-hover text-foreground'
                : 'text-muted-foreground hover:bg-interactive-hover hover:text-foreground',
            )}
          >
            <Icon name="terminal-box" className="h-[18px] w-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltipLabel}</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!hasDirectory}
                aria-label={t('layout.mainTab.terminal')}
                className={cn(
                  'app-region-no-drag -ms-1 inline-flex h-8 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-interactive-hover hover:text-foreground transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                <Icon name="arrow-down-s" className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t('layout.mainTab.terminal')}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
          <DropdownMenuItem className="flex items-center gap-2" onClick={handleCreateTab}>
            <Icon name="add" className="h-4 w-4" />
            <span className="typography-ui-label text-foreground flex-1">
              {t('terminalView.tabs.newTabTitle')}
            </span>
          </DropdownMenuItem>
          {tabs.length > 0 ? <DropdownMenuSeparator /> : null}
          {tabs.map((tab) => {
            const isTabActive = isTerminalShown && tab.id === activeTabId;
            const tabIcon = resolveTerminalTabIcon(tab.iconKey);
            return (
              <DropdownMenuItem
                key={tab.id}
                className="group flex items-center justify-between gap-2"
                onClick={() => handleSelectTab(tab.id)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon name={tabIcon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className={cn('typography-ui-label truncate', isTabActive && 'font-medium text-foreground')}>
                    {tab.label || t('layout.mainTab.terminal')}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isTabActive ? <Icon name="check" className="h-4 w-4 text-primary" /> : null}
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="rounded p-0.5 opacity-60 transition-opacity hover:text-destructive hover:opacity-100"
                    aria-label={t('terminalView.tabs.closeTabTitle')}
                  >
                    <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
