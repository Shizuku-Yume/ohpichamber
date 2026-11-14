import * as React from 'react';

import { Icon } from '@/components/icon/Icon';
import type { IconName } from '@/components/icon/icons';
import { SettingsSection } from '@/components/sections/shared/SettingsSection';
import { SettingsInfoHint } from '@/components/sections/shared/SettingsInfoHint';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BUILTIN_BROWSER_PROVIDER, browserProviderGuests } from '@/lib/guests/browser-providers';
import { loadGuestCatalog } from '@/lib/guests/load-catalog';
import { useGuestsStore } from '@/lib/guests/store';
import { updateDesktopSettings } from '@/lib/persistence';
import { useUIStore } from '@/stores/useUIStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ToolRowProps {
  icon: IconName;
  title: string;
  summary: string;
  info: string;
  ariaLabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  settingsItem: string;
}

/**
 * A task-oriented group heading inside the tools card, matching the reference
 * page's split: what runs work, what shows up in the chat, and what the agent
 * remembers. The rows keep their own labels; the group says when a user would
 * reach for them.
 */
const ToolGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="px-4 pt-3 pb-1 typography-ui-label font-medium text-muted-foreground">{title}</div>
    {children}
  </div>
);

/** Icon column width plus gap, so a nested row lines up with the tool text. */
const TOOL_ROW_TEXT_INSET_CLASS = 'ps-[3.75rem]';

const ToolRow: React.FC<ToolRowProps> = ({ icon, title, summary, info, ariaLabel, checked, onChange, settingsItem }) => (
  <div data-settings-item={settingsItem} className="flex items-center gap-3 px-4 py-3">
    {/* The switch alone says "off": dimming the row would read as disabled. */}
    <span className="flex size-8 shrink-0 items-center justify-center oc-tile-inset rounded-lg text-foreground">
      <Icon name={icon} className="size-4" />
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate typography-ui-label font-medium text-foreground">{title}</span>
        <SettingsInfoHint>{info}</SettingsInfoHint>
      </div>
      <p className="typography-meta text-muted-foreground">{summary}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} aria-label={ariaLabel} />
  </div>
);

/**
 * Which OpenChamber capabilities agents are given.
 *
 * Each entry controls a tool or capability exposed to OMP agent sessions via the
 * Host Gateway and Bun Agent Service. Choices belong to the workbench settings
 * rather than raw agent engine flags.
 *
 * Toggles write authoritative configuration via updateDesktopSettings
 * (/api/openchamber/settings), which the Host Gateway synchronizes to Agent Service
 * workers so capability changes take effect live without restarting the runtime.
 *
 * Each tool is a list row with a switch because each one adds or removes a
 * whole capability, and the one-line summary says what without opening the
 * hint. A setting of one tool alone is a nested row under it.
 */
export const OpenChamberToolsSettings: React.FC = () => {
  const { t } = useI18n();
  const agentControlToolEnabled = useUIStore((state) => state.agentControlToolEnabled);
  const setAgentControlToolEnabled = useUIStore((state) => state.setAgentControlToolEnabled);
  const agentWebToolEnabled = useUIStore((state) => state.agentWebToolEnabled);
  const setAgentWebToolEnabled = useUIStore((state) => state.setAgentWebToolEnabled);
  const browserProvider = useUIStore((state) => state.browserProvider);
  const setBrowserProvider = useUIStore((state) => state.setBrowserProvider);
  const guests = useGuestsStore((state) => state.guests);
  const agentKnowledgeToolEnabled = useUIStore((state) => state.agentKnowledgeToolEnabled);
  const setAgentKnowledgeToolEnabled = useUIStore((state) => state.setAgentKnowledgeToolEnabled);
  const agentNotifyToolEnabled = useUIStore((state) => state.agentNotifyToolEnabled);
  const setAgentNotifyToolEnabled = useUIStore((state) => state.setAgentNotifyToolEnabled);
  const agentRenderToolEnabled = useUIStore((state) => state.agentRenderToolEnabled);
  const setAgentRenderToolEnabled = useUIStore((state) => state.setAgentRenderToolEnabled);
  // Absent without an OpenChamber server, like memory.
  const agentWorkflowAvailable = useUIStore((state) => state.agentWorkflowFeatureAvailable);
  const agentWorkflowToolEnabled = useUIStore((state) => state.agentWorkflowToolEnabled);
  const setAgentWorkflowToolEnabled = useUIStore((state) => state.setAgentWorkflowToolEnabled);

  const handleAgentControlToolChange = React.useCallback((enabled: boolean) => {
    setAgentControlToolEnabled(enabled);
    void updateDesktopSettings({ agentControlToolEnabled: enabled });
  }, [setAgentControlToolEnabled]);

  const handleAgentWebToolChange = React.useCallback((enabled: boolean) => {
    setAgentWebToolEnabled(enabled);
    void updateDesktopSettings({ agentWebToolEnabled: enabled });
  }, [setAgentWebToolEnabled]);

  const handleAgentNotifyToolChange = React.useCallback((enabled: boolean) => {
    setAgentNotifyToolEnabled(enabled);
    void updateDesktopSettings({ agentNotifyToolEnabled: enabled });
  }, [setAgentNotifyToolEnabled]);

  const handleAgentRenderToolChange = React.useCallback((enabled: boolean) => {
    setAgentRenderToolEnabled(enabled);
    void updateDesktopSettings({ agentRenderToolEnabled: enabled });
  }, [setAgentRenderToolEnabled]);

  const handleAgentKnowledgeToolChange = React.useCallback((enabled: boolean) => {
    setAgentKnowledgeToolEnabled(enabled);
    void updateDesktopSettings({ agentKnowledgeToolEnabled: enabled });
  }, [setAgentKnowledgeToolEnabled]);

  const handleAgentWorkflowToolChange = React.useCallback((enabled: boolean) => {
    setAgentWorkflowToolEnabled(enabled);
    void updateDesktopSettings({ agentWorkflowToolEnabled: enabled });
  }, [setAgentWorkflowToolEnabled]);

  // The dropdown lists installed extensions, so the catalog has to be loaded
  // here too: this page can be the first thing opened after a fresh start.
  React.useEffect(() => {
    void loadGuestCatalog();
  }, []);
  const providerGuests = React.useMemo(() => browserProviderGuests(guests), [guests]);
  // A selection whose extension is gone shows as the built-in: the server
  // already routes to it and resets the setting on the next action.
  const providerValue = providerGuests.some((guest) => guest.id === browserProvider)
    ? browserProvider
    : BUILTIN_BROWSER_PROVIDER;

  // Read by the server on the next browser action; no OpenCode restart involved.
  const handleBrowserProviderChange = React.useCallback((value: string) => {
    setBrowserProvider(value);
    void updateDesktopSettings({ browserProvider: value });
  }, [setBrowserProvider]);


  return (
    <SettingsSection title={t('settings.openchamber.tools.title')}>
      <div className="max-w-[44rem] oc-tile divide-y divide-[var(--interactive-border)] rounded-xl">
        <ToolGroup title={t('settings.openchamber.tools.group.runningWork')}>
          <ToolRow
            icon="node-tree"
            settingsItem="sessions.agent-control-tool"
            checked={agentControlToolEnabled}
            onChange={handleAgentControlToolChange}
            title={t('settings.openchamber.tools.field.agentControlTool')}
            summary={t('settings.openchamber.tools.field.agentControlToolSummary')}
            info={t('settings.openchamber.tools.field.agentControlToolInfo')}
            ariaLabel={t('settings.openchamber.tools.field.agentControlToolAria')}
          />

          {/* One group, so no divider separates the web tool from its own setting. */}
          <div>
            <ToolRow
              icon="global"
              settingsItem="sessions.agent-web-tool"
              checked={agentWebToolEnabled}
              onChange={handleAgentWebToolChange}
              title={t('settings.openchamber.tools.field.agentWebTool')}
              summary={t('settings.openchamber.tools.field.agentWebToolSummary')}
              info={t('settings.openchamber.tools.field.agentWebToolInfo')}
              ariaLabel={t('settings.openchamber.tools.field.agentWebToolAria')}
            />

            {/* Stays visible with nothing to choose: the hint is how people
              learn that browser-provider extensions exist. */}
            <div
              data-settings-item="sessions.browser-provider"
              className={cn('flex min-w-0 items-center gap-2 pb-3 pe-4', TOOL_ROW_TEXT_INSET_CLASS)}
            >
              <span className="truncate typography-meta text-muted-foreground">
                {t('settings.openchamber.tools.browserProvider.label')}
              </span>
              <SettingsInfoHint>{t('settings.openchamber.tools.browserProvider.info')}</SettingsInfoHint>
              <Select<string>
                value={providerValue}
                onValueChange={handleBrowserProviderChange}
                disabled={!agentWebToolEnabled || providerGuests.length === 0}
              >
                <SelectTrigger
                  className="ms-auto w-auto min-w-0 max-w-[14rem]"
                  aria-label={t('settings.openchamber.tools.browserProvider.aria')}
                >
                  <SelectValue>
                    {(value) => (
                      value === BUILTIN_BROWSER_PROVIDER
                        ? t('settings.openchamber.tools.browserProvider.option.builtin')
                        : providerGuests.find((guest) => guest.id === value)?.name ?? null
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BUILTIN_BROWSER_PROVIDER}>
                    {t('settings.openchamber.tools.browserProvider.option.builtin')}
                  </SelectItem>
                  {providerGuests.map((guest) => (
                    <SelectItem key={guest.id} value={guest.id}>{guest.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </ToolGroup>

        <ToolGroup title={t('settings.openchamber.tools.group.inTheChat')}>
          <ToolRow
            icon="notification-3"
            settingsItem="sessions.agent-notify-tool"
            checked={agentNotifyToolEnabled}
            onChange={handleAgentNotifyToolChange}
            title={t('settings.openchamber.tools.field.agentNotifyTool')}
            summary={t('settings.openchamber.tools.field.agentNotifyToolSummary')}
            info={t('settings.openchamber.tools.field.agentNotifyToolInfo')}
            ariaLabel={t('settings.openchamber.tools.field.agentNotifyToolAria')}
          />

          <ToolRow
            icon="bar-chart-box"
            settingsItem="sessions.agent-render-tool"
            checked={agentRenderToolEnabled}
            onChange={handleAgentRenderToolChange}
            title={t('settings.openchamber.tools.field.agentRenderTool')}
            summary={t('settings.openchamber.tools.field.agentRenderToolSummary')}
            info={t('settings.openchamber.tools.field.agentRenderToolInfo')}
            ariaLabel={t('settings.openchamber.tools.field.agentRenderToolAria')}
          />

        </ToolGroup>

        <ToolGroup title={t('settings.openchamber.tools.group.whatAgentsKnow')}>
          <ToolRow
            icon="sticky-note"
            settingsItem="sessions.agent-knowledge-tool"
            checked={agentKnowledgeToolEnabled}
            onChange={handleAgentKnowledgeToolChange}
            title={t('settings.openchamber.tools.field.agentKnowledgeTool')}
            summary={t('settings.openchamber.tools.field.agentKnowledgeToolSummary')}
            info={t('settings.openchamber.tools.field.agentKnowledgeToolInfo')}
            ariaLabel={t('settings.openchamber.tools.field.agentKnowledgeToolAria')}
          />

          {agentWorkflowAvailable ? (
            <ToolRow
              icon="flow-chart"
              settingsItem="sessions.agent-workflow-tool"
              checked={agentWorkflowToolEnabled}
              onChange={handleAgentWorkflowToolChange}
              title={t('settings.openchamber.tools.field.agentWorkflowTool')}
              summary={t('settings.openchamber.tools.field.agentWorkflowToolSummary')}
              info={t('settings.openchamber.tools.field.agentWorkflowToolInfo')}
              ariaLabel={t('settings.openchamber.tools.field.agentWorkflowToolAria')}
            />
          ) : null}
        </ToolGroup>
      </div>
    </SettingsSection>
  );
};
