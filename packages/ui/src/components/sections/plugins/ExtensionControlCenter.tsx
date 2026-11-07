import React from 'react';
import type { ExtensionInventory, ExtensionItem, ExtensionKind, ExtensionScope } from '@openchamber/agent-contract';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SettingsSection } from '@/components/sections/shared/SettingsSection';
import { SettingsCardChip, SettingsCardPill } from '@/components/sections/shared/SettingsCards';
import { useI18n } from '@/lib/i18n';
import { rankByQuery } from '@/lib/search/fuzzySearch';
import { cn } from '@/lib/utils';

type RowStatus = 'active' | 'disabled' | 'shadowed';

/** Shadowing wins over the switch, so one status drives the dot and the badge. */
const statusOf = (item: ExtensionItem): RowStatus => (item.shadowed ? 'shadowed' : item.enabled ? 'active' : 'disabled');

const StatusDot: React.FC<{ status: RowStatus }> = ({ status }) => (
 <span
  aria-hidden
  className={cn(
   'size-2 shrink-0 rounded-full',
   status === 'active' && 'bg-[var(--status-success)]',
   status === 'disabled' && 'bg-[var(--status-warning)]',
   status === 'shadowed' && 'bg-[var(--interactive-selection)]',
  )}
 />
);

interface KindGroup {
 kind: ExtensionKind;
 label: string;
 items: ExtensionItem[];
}

/** Rows grouped by native kind, following the label order the worker reports. */
const groupByKind = (items: readonly ExtensionItem[], kinds: ExtensionInventory['kinds']): KindGroup[] => {
 const order = new Map(kinds.map((entry, index) => [entry.kind, index]));
 const labelFor = new Map(kinds.map(entry => [entry.kind, entry.label]));
 const groups: KindGroup[] = [];
 for (const item of [...items].sort((left, right) => (order.get(left.kind) ?? 99) - (order.get(right.kind) ?? 99))) {
  const label = labelFor.get(item.kind) ?? item.kind;
  const last = groups.at(-1);
  if (last !== undefined && last.kind === item.kind) last.items.push(item);
  else groups.push({ kind: item.kind, label, items: [item] });
 }
 return groups;
};

const ScopeChip: React.FC<{ scope: ExtensionScope }> = ({ scope }) => {
 const { t } = useI18n();
 const label = scope === 'builtin'
  ? t('settings.extensions.source.bundled')
  : scope === 'user'
   ? t('settings.skills.catalog.conflicts.scope.user')
   : t('settings.skills.catalog.conflicts.scope.project');
 return <SettingsCardChip>{label}</SettingsCardChip>;
};

const Inspector: React.FC<{ item: ExtensionItem }> = ({ item }) => {
 const { t } = useI18n();
 const status = statusOf(item);
 const facts = item.metadata === undefined
  ? []
  : [item.metadata.transport, item.metadata.host, item.metadata.username, item.metadata.port]
   .filter((value): value is string | number => value !== undefined);
 return (
  <div className="min-w-0 space-y-2 text-start">
   <div className="flex min-w-0 flex-wrap items-center gap-1.5">
    <p className="min-w-0 flex-1 truncate typography-ui-label text-foreground">{item.name}</p>
    <SettingsCardPill tone={status === 'active' ? 'success' : 'neutral'}>
     {status === 'shadowed'
      ? t('settings.openchamber.tunnel.state.inactive')
      : t(status === 'active' ? 'settings.extensions.status.enabled' : 'settings.extensions.status.disabled')}
    </SettingsCardPill>
    <ScopeChip scope={item.scope} />
    <SettingsCardChip>{item.providerName}</SettingsCardChip>
   </div>
   {item.triggers.length === 0 ? null : (
    <div className="flex min-w-0 flex-wrap items-center gap-1 pt-0.5">
     {item.triggers.map(trigger => (
      <SettingsCardChip key={trigger} title={trigger} className="max-w-full whitespace-normal break-all">
       {trigger}
      </SettingsCardChip>
     ))}
    </div>
   )}
   {item.shadowedBy === undefined ? null : (
    <div className="flex min-w-0 items-baseline gap-2">
     <span className="shrink-0 typography-micro text-muted-foreground">{t('settings.extensions.detail.field.source')}</span>
     <span className="min-w-0 break-words typography-meta text-foreground">{item.shadowedBy}</span>
    </div>
   )}
   {item.disabledReason === undefined ? null : (
    <p className="typography-micro text-muted-foreground">
     {t(item.disabledReason === 'provider-disabled' ? 'settings.plugins.status.disabled' : 'settings.extensions.status.disabled')}
     {' · '}
     {item.providerName}
    </p>
   )}
   <p className="typography-micro text-muted-foreground">{t('settings.extensions.detail.section.details')}</p>
   <div className="flex min-w-0 items-baseline gap-2">
    <span className="shrink-0 typography-micro text-muted-foreground">{t('settings.extensions.detail.field.source')}</span>
    <span className="min-w-0 break-words typography-meta text-foreground">{item.providerName}</span>
   </div>
   <div className="flex min-w-0 items-baseline gap-2">
    <span className="shrink-0 typography-micro text-muted-foreground">{t('settings.extensions.detail.field.location')}</span>
    <span className="min-w-0 break-all font-mono typography-micro text-foreground">{item.path}</span>
   </div>
   {item.description === undefined ? null : (
    <p className="typography-meta text-foreground">{item.description}</p>
   )}
   {facts.length === 0 ? null : (
    <p className="typography-micro text-muted-foreground">{facts.join(' · ')}</p>
   )}
   {item.content === undefined ? null : (
    <div className="min-w-0 space-y-1">
     <p className="typography-micro text-muted-foreground">{t('settings.skills.page.section.instructions')}</p>
     <pre className="oc-tile-inset max-h-64 overflow-auto whitespace-pre-wrap break-words p-2 typography-micro text-muted-foreground">{item.content}</pre>
    </div>
   )}
  </div>
 );
};

interface ExtensionControlCenterProps {
 inventory: ExtensionInventory;
 disabled: boolean;
 onToggleProvider: (providerId: string, enabled: boolean) => void;
 onToggleUserSource: (providerId: string, enabled: boolean) => void;
 onToggleItem: (providerId: string, extensionId: string, enabled: boolean) => void;
}

/**
 * OMP's Extension Control Center: provider master switches with counts, search,
 * kind-grouped rows with trigger badges, and an inspector that explains where
 * each row came from and what it carries.
 */
export const ExtensionControlCenter: React.FC<ExtensionControlCenterProps> = ({
 inventory, disabled, onToggleProvider, onToggleUserSource, onToggleItem,
}) => {
 const { t } = useI18n();
 const [providerId, setProviderId] = React.useState<string>('all');
 const [query, setQuery] = React.useState('');
 const [selectedId, setSelectedId] = React.useState<string | null>(null);

 const activeProvider = inventory.providers.find(provider => provider.id === providerId);
 const scoped = providerId === 'all' ? inventory.items : inventory.items.filter(item => item.providerId === providerId);
 const filtered = rankByQuery(scoped, query, item => [item.name, item.description ?? '', item.path, item.providerName]);
 // A row from a previous filter must never stay inspected.
 const selected = filtered.find(item => item.id === selectedId) ?? filtered[0] ?? null;
 const groups = groupByKind(filtered, inventory.kinds);
 const countFor = (id: string): number => id === 'all'
  ? inventory.items.length
  : inventory.providers.find(provider => provider.id === id)?.itemCount ?? 0;

 return (
  <SettingsSection
   title={t('settings.page.plugins.title')}
   divider={false}
   headerAction={(
    <Input
     value={query}
     onChange={event => setQuery(event.target.value)}
     placeholder={t('settings.plugins.grid.searchPlaceholder')}
     aria-label={t('settings.plugins.grid.searchPlaceholder')}
     className="max-w-[24ch]"
    />
   )}
   contentClassName="space-y-4"
  >
   <p className="typography-micro uppercase tracking-wide text-muted-foreground">
    {t('settings.skills.catalog.page.section.sources')}
   </p>
   <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
    <Button variant="chip" size="xs" aria-pressed={providerId === 'all'} onClick={() => setProviderId('all')}>
     {t('settings.agents.page.mode.all')} ({countFor('all')})
    </Button>
    {inventory.providers.map(provider => (
     <div key={provider.id} className="flex min-w-0 items-center gap-1.5">
      <Button
       variant="chip"
       size="xs"
       aria-pressed={providerId === provider.id}
       className="min-w-0"
       onClick={() => setProviderId(provider.id)}
      >
       <StatusDot status={provider.enabled ? 'active' : 'disabled'} />
       <span className="truncate">{provider.displayName} ({provider.itemCount})</span>
      </Button>
      <Switch
       checked={provider.enabled}
       disabled={disabled}
       aria-label={t(provider.enabled ? 'settings.extensions.actions.disable.aria' : 'settings.extensions.actions.enable.aria', { name: provider.displayName })}
       onCheckedChange={enabled => onToggleProvider(provider.id, enabled)}
      />
     </div>
    ))}
   </div>

   {activeProvider?.foreignUserSource !== true ? null : (
    <div className="flex items-center gap-2">
     <Switch
      checked={activeProvider.userSourceEnabled}
      disabled={disabled}
      aria-label={t('settings.extensions.detail.field.source')}
      onCheckedChange={enabled => onToggleUserSource(activeProvider.id, enabled)}
     />
     <StatusDot status={activeProvider.userSourceEnabled ? 'active' : 'disabled'} />
     <span className="typography-meta text-foreground">{t('settings.extensions.detail.field.source')}</span>
    </div>
   )}

   {filtered.length === 0 ? (
    <p className="py-4 typography-meta text-muted-foreground">
     {query.trim().length > 0
      ? t('settings.plugins.grid.noMatches', { query: query.trim() })
      : t('settings.extensions.empty')}
    </p>
   ) : (
    <div className="grid min-w-0 gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
     <div className="min-w-0 space-y-3 text-start">
      {groups.map(group => (
       <div key={group.kind} className="min-w-0 space-y-1">
        <p className="typography-micro uppercase tracking-wide text-muted-foreground">{group.label}</p>
        {group.items.map(item => {
         const status = statusOf(item);
         return (
          <div
           key={item.id}
           className={cn('flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5',
            selected?.id === item.id && 'bg-[var(--interactive-selection)]')}
          >
           <StatusDot status={status} />
           <button
            type="button"
            className="min-w-[6rem] flex-1 text-start"
            aria-pressed={selected?.id === item.id}
            onClick={() => setSelectedId(item.id)}
           >
            <span className={cn('block truncate typography-ui-label', !item.enabled && 'text-muted-foreground')}>{item.name}</span>
            <span className="block truncate font-mono typography-micro text-muted-foreground">{item.path}</span>
           </button>
           {item.triggers.length === 0 ? null : (
            <div className="flex max-w-[40%] shrink items-center justify-end gap-1 overflow-hidden @xl:max-w-[45%]">
             {item.triggers.slice(0, 2).map(trigger => (
              <SettingsCardChip key={trigger} title={trigger} className="max-w-[7rem] truncate @xl:max-w-[9rem]">
               {trigger}
              </SettingsCardChip>
             ))}
             {item.triggers.length > 2 ? (
              <SettingsCardChip title={item.triggers.slice(2).join(', ')}>
               +{item.triggers.length - 2}
              </SettingsCardChip>
             ) : null}
            </div>
           )}
           {item.toggleable ? (
            <Switch
             checked={item.enabled}
             disabled={disabled || item.shadowed}
             aria-label={t(item.enabled ? 'settings.extensions.actions.disable.aria' : 'settings.extensions.actions.enable.aria', { name: item.name })}
             onCheckedChange={enabled => onToggleItem(item.providerId, item.id, enabled)}
            />
           ) : null}
          </div>
         );
        })}
       </div>
      ))}
     </div>

     <div className="min-w-0 border-t border-[var(--surface-border)] pt-3 @3xl:border-s @3xl:border-t-0 @3xl:ps-4 @3xl:pt-0">
      {selected === null ? null : <Inspector item={selected} />}
     </div>
    </div>
   )}
  </SettingsSection>
 );
};
