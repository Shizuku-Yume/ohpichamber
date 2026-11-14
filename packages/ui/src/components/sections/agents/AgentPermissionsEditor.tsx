import React from 'react';
import type { ToolCatalogEntry, ToolTier } from '@openchamber/agent-contract';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/icon/Icon';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  SettingsCheckboxRow,
  SettingsChipGroup,
  SETTINGS_HELPER_CLASS,
} from '@/components/sections/shared/SettingsSection';
import {
  categorizeTool,
  TOOL_PERMISSION_GROUPS,
  GROUP_DESCRIPTIONS,
  getToolOneLineDescription,
  toolPresentation,
} from '@/lib/toolPresentation';

export interface AgentPermissionsEditorProps {
  allowedTools: string[] | null;
  toolsCatalog: ToolCatalogEntry[];
  onChange: (allowedTools: string[] | null) => void;
  disabled?: boolean;
}

const TIER_CLASSES = {
  read: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  write: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10',
  exec: 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10',
} as const;

const GROUP_DESC_KEYS = {
  files_and_search: 'settings.agents.page.toolPermissions.groupDesc.files_and_search',
  execution: 'settings.agents.page.toolPermissions.groupDesc.execution',
  web_and_external: 'settings.agents.page.toolPermissions.groupDesc.web_and_external',
  planning_and_memory: 'settings.agents.page.toolPermissions.groupDesc.planning_and_memory',
  multi_agent: 'settings.agents.page.toolPermissions.groupDesc.multi_agent',
  openchamber: 'settings.agents.page.toolPermissions.groupDesc.openchamber',
  mcp_and_extensions: 'settings.agents.page.toolPermissions.groupDesc.mcp_and_extensions',
} as const;

const TierChip: React.FC<{ tier: ToolTier }> = ({ tier }) => {
  const { t } = useI18n();
  const label = t(`settings.agents.page.toolPermissions.tier.${tier}`);
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border leading-none select-none',
        TIER_CLASSES[tier],
      )}
    >
      {label}
    </span>
  );
};

export const AgentPermissionsEditor: React.FC<AgentPermissionsEditorProps> = ({
  allowedTools,
  toolsCatalog,
  onChange,
  disabled = false,
}) => {
  const { t } = useI18n();

  // Collapsed state for each group
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Build the complete tool list combining toolsCatalog with any existing tools in allowedTools
  const tools = React.useMemo(() => {
    const list: ToolCatalogEntry[] = [...toolsCatalog];
    const catalogNames = new Set(toolsCatalog.map((tool) => tool.name));
    if (allowedTools) {
      for (const name of allowedTools) {
        if (!catalogNames.has(name)) {
          const presentation = toolPresentation(name);
          list.push({
            name,
            label: presentation.label || name,
            description: getToolOneLineDescription(name),
            tier: 'exec',
            availability: false,
          });
        }
      }
    }
    return list;
  }, [toolsCatalog, allowedTools]);

  const availableTools = React.useMemo(
    () => tools.filter((tool) => Boolean(tool.availability)),
    [tools],
  );

  // Group tools into the 7 fork-owned categories
  const groupedTools = React.useMemo(() => {
    const files_and_search: ToolCatalogEntry[] = [];
    const execution: ToolCatalogEntry[] = [];
    const web_and_external: ToolCatalogEntry[] = [];
    const planning_and_memory: ToolCatalogEntry[] = [];
    const multi_agent: ToolCatalogEntry[] = [];
    const openchamber: ToolCatalogEntry[] = [];
    const mcp_and_extensions: ToolCatalogEntry[] = [];
    for (const tool of tools) {
      const groupKey = categorizeTool(tool.name);
      if (groupKey === 'files_and_search') files_and_search.push(tool);
      else if (groupKey === 'execution') execution.push(tool);
      else if (groupKey === 'web_and_external') web_and_external.push(tool);
      else if (groupKey === 'planning_and_memory') planning_and_memory.push(tool);
      else if (groupKey === 'multi_agent') multi_agent.push(tool);
      else if (groupKey === 'openchamber') openchamber.push(tool);
      else mcp_and_extensions.push(tool);
    }
    return {
      files_and_search,
      execution,
      web_and_external,
      planning_and_memory,
      multi_agent,
      openchamber,
      mcp_and_extensions,
    };
  }, [tools]);

  // Determine active quick action
  const quickActionValue = React.useMemo(() => {
    if (allowedTools === null) return 'inherit';
    if (allowedTools.length === 0) return 'none';
    const availableNames = availableTools.map((t) => t.name);
    if (
      availableNames.length > 0 &&
      availableNames.every((name) => allowedTools.includes(name)) &&
      allowedTools.every((name) => availableNames.includes(name))
    ) {
      return 'all';
    }
    return 'custom';
  }, [allowedTools, availableTools]);

  const handleQuickAction = (value: string) => {
    if (disabled) return;
    if (value === 'inherit') {
      onChange(null);
    } else if (value === 'all') {
      // Select ONLY available tools
      onChange(availableTools.map((t) => t.name));
    } else if (value === 'none') {
      onChange([]);
    }
  };

  const isToolChecked = (toolName: string): boolean => {
    if (allowedTools === null) return true;
    return allowedTools.includes(toolName);
  };

  const toggleTool = (toolName: string, checked: boolean) => {
    if (disabled) return;
    const tool = tools.find((t) => t.name === toolName);
    if (checked && (!tool || !tool.availability)) return;
    const currentList = allowedTools === null ? availableTools.map((t) => t.name) : [...allowedTools];
    const nextList = checked
      ? [...new Set([...currentList, toolName])]
      : currentList.filter((name) => name !== toolName);
    onChange(nextList);
  };

  const toggleGroup = (groupTools: ToolCatalogEntry[], nextChecked: boolean) => {
    if (disabled) return;
    const currentList = new Set(
      allowedTools === null ? availableTools.map((t) => t.name) : allowedTools,
    );
    for (const tool of groupTools) {
      if (nextChecked) {
        if (tool.availability) currentList.add(tool.name);
      } else {
        currentList.delete(tool.name);
      }
    }
    onChange([...currentList]);
  };

  return (
    <div className="space-y-4">
      {/* Quick actions chip group */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SettingsChipGroup<string>
          value={quickActionValue}
          options={[
            {
              value: 'inherit',
              label: t('settings.agents.page.toolPermissions.quickActions.inherit'),
              disabled,
            },
            {
              value: 'all',
              label: t('settings.agents.page.toolPermissions.quickActions.all'),
              disabled,
            },
            {
              value: 'none',
              label: t('settings.agents.page.toolPermissions.quickActions.none'),
              disabled,
            },
          ]}
          onChange={handleQuickAction}
          aria-label={t('settings.agents.page.field.allowedTools')}
        />
        {allowedTools === null && (
          <span className={cn(SETTINGS_HELPER_CLASS, 'text-xs')}>
            {t('settings.agents.page.field.allowedToolsInherit')}
          </span>
        )}
      </div>

      {/* Collapsible tool groups */}
      <div className="space-y-3">
        {TOOL_PERMISSION_GROUPS.map((groupKey) => {
          const groupToolList = groupedTools[groupKey];
          if (groupToolList.length === 0) return null;

          const isCollapsed = Boolean(collapsedGroups[groupKey]);
          const selectedTools = groupToolList.filter((tool) => isToolChecked(tool.name));
          const isAllChecked = selectedTools.length === groupToolList.length && groupToolList.length > 0;
          const isIndeterminate = selectedTools.length > 0 && selectedTools.length < groupToolList.length;

          // Unique tiers in this group
          const groupTiers = Array.from(new Set(groupToolList.map((tool) => tool.tier)));

          const groupTitle = t(`settings.agents.page.toolPermissions.group.${groupKey}`);
          const groupDescription = t(GROUP_DESC_KEYS[groupKey]) || GROUP_DESCRIPTIONS[groupKey];
          const countLabel = t('settings.agents.page.toolPermissions.selectedCount', {
            selected: selectedTools.length,
            total: groupToolList.length,
          });

          return (
            <div
              key={groupKey}
              className="rounded-lg border border-border/50 bg-[var(--surface-subtle)]/40 overflow-hidden"
            >
              {/* Group Header */}
              <div
                className="flex items-center justify-between gap-3 px-3 py-2 bg-[var(--surface-subtle)]/60 cursor-pointer select-none hover:bg-[var(--surface-subtle)] transition-colors"
                onClick={() => toggleGroupCollapse(groupKey)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    aria-label={isCollapsed ? t('settings.agents.page.toolPermissions.expandSection') : t('settings.agents.page.toolPermissions.collapseSection')}
                    className="flex items-center justify-center size-5 text-muted-foreground hover:text-foreground transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupCollapse(groupKey);
                    }}
                  >
                    <Icon
                      name="arrow-right-s"
                      className={cn(
                        'size-3.5 transition-transform duration-200',
                        !isCollapsed && 'rotate-90',
                      )}
                    />
                  </button>

                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isAllChecked}
                      indeterminate={isIndeterminate}
                      disabled={disabled}
                      onChange={(checked) => toggleGroup(groupToolList, checked)}
                      ariaLabel={groupTitle}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground truncate">
                        {groupTitle}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {countLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {groupDescription}
                    </p>
                  </div>
                </div>

                {/* Tier chips summary */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {groupTiers.map((tier) => (
                    <TierChip key={tier} tier={tier} />
                  ))}
                </div>
              </div>

              {/* Group Body (Tool Rows) */}
              {!isCollapsed && (
                <div className="divide-y divide-border/20 px-3 py-1 space-y-1">
                  {groupToolList.map((tool) => {
                    const checked = isToolChecked(tool.name);
                    const description = tool.description || '';
                    return (
                      <SettingsCheckboxRow
                        key={tool.name}
                        checked={checked}
                        disabled={disabled || !tool.availability}
                        onChange={(nextChecked) => toggleTool(tool.name, nextChecked)}
                        label={
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs">{tool.label || tool.name}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">({tool.name})</span>
                            {!tool.availability && (
                              <span className="text-[10px] uppercase font-mono tracking-wider px-1 py-0.5 rounded border border-border/40 text-muted-foreground bg-muted/20">
                                {t('common.unavailable')}
                              </span>
                            )}
                          </span>
                        }
                        description={description ? <span className="text-xs text-muted-foreground">{description}</span> : undefined}
                        labelAccessory={<TierChip tier={tool.tier} />}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
