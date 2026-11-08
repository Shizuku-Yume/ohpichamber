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
import { useI18n } from '@/lib/i18n';
import { formatShortcutForDisplay, getEffectiveShortcutCombo } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';
import { normalizeContextPanelDirectoryKey, useUIStore } from '@/stores/useUIStore';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { PROJECT_ACTION_ICONS } from '@/lib/projectActions';
import { shownContextModes } from '@/lib/workspace/zones';

export interface HeaderTerminalActionProps {
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
  const shortcutOverrides = useUIStore((state) => state.shortcutOverrides);
  const normalizedDirectory = React.useMemo(
    () => (directory ? normalizeContextPanelDirectoryKey(directory) : ''),
    [directory],
  );

  const isTerminalShown = useUIStore((state) => {
    if (!normalizedDirectory) return false;
    const panel = state.contextPanelByDirectory[normalizedDirectory];
    return shownContextModes(panel, state.contextSurfaceZones).has('terminal');
  });

  const terminalState = useTerminalStore((state) => (
    directory ? state.getDirectoryState(directory) : undefined
  ));

  const tabs = terminalState?.tabs ?? [];
  const activeTabId = terminalState?.activeTabId ?? null;

  const terminalShortcut = React.useMemo(() => (
    formatShortcutForDisplay(getEffectiveShortcutCombo('toggle_terminal', shortcutOverrides), '')
  ), [shortcutOverrides]);

  const tooltipLabel = terminalShortcut
    ? t('header.actions.terminalPanelWithShortcut', { shortcut: terminalShortcut })
    : t('header.actions.toggleTerminalPanelAria');

  const handleToggleTerminal = React.useCallback(() => {
    const dir = directory || '';
    const key = normalizeContextPanelDirectoryKey(dir);
    useUIStore.getState().openContextSurface(key, 'terminal');
  }, [directory]);

  const handleCreateTab = React.useCallback(() => {
    const dir = directory || '';
    const tabId = useTerminalStore.getState().createTab(dir);
    useTerminalStore.getState().setActiveTab(dir, tabId);
    const key = normalizeContextPanelDirectoryKey(dir);
    const uiState = useUIStore.getState();
    const isShown = shownContextModes(uiState.contextPanelByDirectory[key], uiState.contextSurfaceZones).has('terminal');
    if (!isShown) {
      uiState.openContextSurface(key, 'terminal');
    }
  }, [directory]);

  const handleSelectTab = React.useCallback((tabId: string) => {
    const dir = directory || '';
    useTerminalStore.getState().setActiveTab(dir, tabId);
    const key = normalizeContextPanelDirectoryKey(dir);
    const uiState = useUIStore.getState();
    const isShown = shownContextModes(uiState.contextPanelByDirectory[key], uiState.contextSurfaceZones).has('terminal');
    if (!isShown) {
      uiState.openContextSurface(key, 'terminal');
    }
  }, [directory]);

  const handleCloseTab = React.useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const dir = directory || '';
    useTerminalStore.getState().closeTab(dir, tabId);
  }, [directory]);

  return (
    <div className={cn('inline-flex items-center', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleToggleTerminal}
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
                aria-label={t('layout.mainTab.terminal')}
                className={cn(
                  'app-region-no-drag -ms-1 inline-flex h-8 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-interactive-hover hover:text-foreground transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
