import React from 'react';
import { ModelSelector } from '@/components/sections/agents/ModelSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  SETTINGS_CUSTOM_TRIGGER_CLASS,
  SETTINGS_DESCRIPTION_CLASS,
  SETTINGS_SPACE_ROW_CLASS,
  SETTINGS_HELPER_CLASS,
  SETTINGS_SPACE_CHECKBOX_CLASS,
  SETTINGS_WIDTH_SELECT_CLASS,
  SettingsCheckboxRow,
  SettingsControlGroup,
  SettingsDisclosure,
  SettingsFieldRow,
  SettingsSection,
  SettingsStackedField,
  SettingsTwoColumn,
} from '@/components/sections/shared/SettingsSection';
import { SettingsPageLayout } from '@/components/sections/shared/SettingsPageLayout';
import { useI18n } from '@/lib/i18n';
import { reportSettingsSaveState } from '@/lib/persistence';
import { getRuntimeKey } from '@/lib/runtime-switch';
import type { RoutingCategory, RoutingConfig } from '@/lib/routing/routingApi';
import { useConfigStore } from '@/stores/useConfigStore';
import { parseModelSelector } from '@openchamber/agent-contract';
import { isAutoModel } from '@/lib/routing/autoModel';
import { useRoutingStore } from '@/stores/useRoutingStore';
import { JevAccessNote } from '@/components/sections/classification/JevAccessNote';

const DEFAULT_VARIANT_VALUE = '__default__';
const SAVE_DEBOUNCE_MS = 500;


/**
 * Whether the server's copy is the draft as the server stores it. The server
 * trims names and descriptions, so a mid-typing "- " or trailing newline comes
 * back without it; adopting that copy would eat what the user just typed.
 */
const isStoredFormOf = (server: RoutingConfig, draft: RoutingConfig): boolean => {
  const trimmed = (config: RoutingConfig) => JSON.stringify({
    ...config,
    categories: config.categories.map((category) => ({ ...category, name: category.name.trim(), description: category.description.trim() })),
  });
  return trimmed(server) === trimmed(draft);
};

/**
 * Ids of the categories the server would reject: it trims both fields and
 * requires each to be non-empty. The save gate and the page's own signal use
 * the same list, so what the page says and what it sends cannot drift apart.
 */
const invalidCategoryIds = (config: RoutingConfig): string[] => config.categories
  .filter((category) => category.name.trim().length === 0 || category.description.trim().length === 0)
  .map((category) => category.id);

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
/** The thinking efforts OMP reports for one model; 'off' plus reasoningOptions. Empty when the model has none. */
const useModelReasoningEfforts = (providerID: string | null | undefined, modelID: string | null | undefined): string[] => {
  const providers = useConfigStore((state) => state.providers);
  return React.useMemo(() => {
    if (!providerID || !modelID) return [];
    const provider = providers.find((entry) => entry.providerId === providerID);
    const model = provider?.models.find((entry) => entry.modelId === modelID);
    if (!model?.reasoningEffortSupported && !model?.reasoningOptions?.length) return [];
    return ['off', ...model.reasoningOptions.map((option) => option.reasoningEffort).filter((effort) => effort !== 'off')];
  }, [modelID, providerID, providers]);
};

/**
 * The saved level, or null when the model does not list it: list positions
 * saved before #4133 run as the model's default on the server, so they read
 * as Default here too. A model with no known levels keeps what was saved.
 */
const knownVariant = (value: string | null | undefined, variants: string[]): string | null => (
  value && (variants.length === 0 || variants.includes(value)) ? value : null
);

const VariantSelect: React.FC<{
  providerID: string | null | undefined;
  modelID: string | null | undefined;
  value: string | null;
  onChange: (variant: string | null) => void;
  ariaLabel: string;
  className?: string;
}> = ({ providerID, modelID, value, onChange, ariaLabel, className }) => {
  const { t } = useI18n();
  const efforts = useModelReasoningEfforts(providerID, modelID);
  const selected = knownVariant(value, efforts) ?? DEFAULT_VARIANT_VALUE;
  const label = (variant: string) => {
    if (variant === DEFAULT_VARIANT_VALUE) return t('settings.routing.thinking.default');
    if (variant === 'off') return t('chat.modelControls.off');
    return variant.charAt(0).toUpperCase() + variant.slice(1);
  };
  return (
    <Select value={selected} onValueChange={(next) => onChange(next === DEFAULT_VARIANT_VALUE ? null : next)} disabled={efforts.length === 0}>
      <SelectTrigger className={cn(SETTINGS_WIDTH_SELECT_CLASS, className)} aria-label={ariaLabel}>
        <SelectValue>{label(selected)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT_VARIANT_VALUE}>{label(DEFAULT_VARIANT_VALUE)}</SelectItem>
        {efforts.map((effort) => (
          <SelectItem key={effort} value={effort}>{label(effort)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};


/** One category: a flat disclosure row that expands into its editor. */
const CategoryRow: React.FC<{
  category: RoutingCategory;
  expanded: boolean;
  autoFocusDescription: boolean;
  onDescriptionFocused: () => void;
  onToggle: () => void;
  onChange: (patch: Partial<RoutingCategory>) => void;
  onReset: (() => void) | null;
  onRemove: () => void;
}> = ({ category, expanded, autoFocusDescription, onDescriptionFocused, onToggle, onChange, onReset, onRemove }) => {
  const { t } = useI18n();
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
  const efforts = useModelReasoningEfforts(category.model?.providerID, category.model?.modelID);
  const shownVariant = knownVariant(category.variant, efforts);
  const errorId = React.useId();
  const nameErrorId = `${errorId}-name`;
  const descriptionErrorId = `${errorId}-description`;
  const summary = category.model
    ? `${category.model.modelID}${shownVariant ? ` / ${shownVariant}` : ''}`
    : undefined;
  const missingName = category.name.trim().length === 0;
  const missingDescription = category.description.trim().length === 0;

  // A freshly added category opens with its description empty, which is what
  // the user must fill first; put the caret there instead of making them hunt.
  React.useEffect(() => {
    if (!expanded || !autoFocusDescription) return;
    descriptionRef.current?.focus();
    onDescriptionFocused();
  }, [expanded, autoFocusDescription, onDescriptionFocused]);

  return (
    <SettingsDisclosure
      title={category.name || category.id}
      secondary={summary}
      accessory={(
        <SettingsCheckboxRow
          checked={category.enabled}
          onChange={(checked) => onChange({ enabled: checked })}
          label={<span className="sr-only">{t('settings.routing.category.enabled')}</span>}
          ariaLabel={t('settings.routing.category.enabledAria', { name: category.name || category.id })}
        />
      )}
      expanded={expanded}
      onToggle={onToggle}
      className={cn(!category.enabled && 'opacity-60')}
    >
      <SettingsTwoColumn>
        <SettingsStackedField label={t('settings.routing.category.name')}>
          <div className="w-full">
            <Input
              value={category.name}
              onChange={(event) => onChange({ name: event.target.value })}
              aria-label={t('settings.routing.category.name')}
              aria-invalid={missingName || undefined}
              aria-describedby={missingName ? nameErrorId : undefined}
              inputSize="compact"
              className="w-full"
              maxLength={60}
            />
            {missingName ? (
              <p id={nameErrorId} className="mt-1 typography-meta text-[var(--status-error)]">
                {t('settings.routing.category.nameRequired')}
              </p>
            ) : null}
          </div>
        </SettingsStackedField>
        <SettingsStackedField label={t('settings.routing.category.model')} info={t('settings.routing.category.modelInfo')}>
          <ModelSelector
            providerId={category.model?.providerID ?? ''}
            modelId={category.model?.modelID ?? ''}
            onChange={(providerID, modelID) => onChange({ model: { providerID, modelID }, variant: null })}
            className={cn(SETTINGS_CUSTOM_TRIGGER_CLASS, 'w-full')}
            placeholder={t('settings.routing.model.useFallback')}
          />
        </SettingsStackedField>
      </SettingsTwoColumn>
      <SettingsFieldRow label={t('settings.routing.category.thinking')} settingsItem="routing.category-thinking">
        <VariantSelect
          providerID={category.model?.providerID}
          modelID={category.model?.modelID}
          value={category.variant}
          onChange={(variant) => onChange({ variant })}
          ariaLabel={t('settings.routing.category.thinking')}
        />
      </SettingsFieldRow>
      <SettingsStackedField
        label={t('settings.routing.category.description')}
        info={t('settings.routing.category.descriptionInfo')}
      >
        <div className="w-full">
          <Textarea
            ref={descriptionRef}
            value={category.description}
            onChange={(event) => onChange({ description: event.target.value })}
            aria-label={t('settings.routing.category.description')}
            aria-invalid={missingDescription || undefined}
            aria-describedby={missingDescription ? descriptionErrorId : undefined}
            rows={5}
            maxLength={2000}
            className="w-full"
          />
          {missingDescription ? (
            <p id={descriptionErrorId} className="mt-1 typography-meta text-[var(--status-error)]">
              {t('settings.routing.category.descriptionRequired')}
            </p>
          ) : null}
        </div>
      </SettingsStackedField>
      <div className="flex flex-wrap items-center gap-2">
        {onReset ? (
          <Button size="xs" variant="outline" onClick={onReset}>{t('settings.routing.category.reset')}</Button>
        ) : null}
        <Button size="xs" variant="ghost" onClick={onRemove}>{t('settings.routing.category.remove')}</Button>
      </div>
    </SettingsDisclosure>
  );
};

export const RoutingPage: React.FC = () => {
  const { t } = useI18n();
  const available = useRoutingStore((state) => state.available);
  const autoReady = useRoutingStore((state) => state.autoReady);
  const serverConfig = useRoutingStore((state) => state.config);
  const builtins = useRoutingStore((state) => state.builtins);
  const loaded = useRoutingStore((state) => state.loaded);
  const loadError = useRoutingStore((state) => state.loadError);
  const load = useRoutingStore((state) => state.load);
  const saveConfig = useRoutingStore((state) => state.saveConfig);

  const [draft, setDraft] = React.useState<RoutingConfig | null>(serverConfig);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [expandedIds, setExpandedIds] = React.useState<string[]>([]);
  // The category just added: its editor opens and its description takes focus.
  const [focusCategoryId, setFocusCategoryId] = React.useState<string | null>(null);
  // A pending edit remembers the server it was made against; a save that would
  // run after a runtime switch is dropped rather than sent to the new server.
  const pendingRef = React.useRef<{ config: RoutingConfig; runtimeKey: string } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Saves run one after another, and the server's copy is adopted only while
  // nothing is pending or in flight, so an older response cannot replace a
  // newer draft.
  const saveChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const savesInFlightRef = React.useRef(0);

  React.useEffect(() => {
    void load();
  }, [load]);

  // The server is authoritative; adopt its config whenever nothing is mid-edit,
  // unless it is only the trimmed form of what is already on screen.
  React.useEffect(() => {
    if (pendingRef.current || savesInFlightRef.current > 0) return;
    setDraft((current) => (current && serverConfig && isStoredFormOf(serverConfig, current) ? current : serverConfig));
  }, [serverConfig]);

  const flush = React.useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return saveChainRef.current;
    // The server trims both fields and rejects an empty one with a 400. Sending
    // the draft anyway would report a failure on every keystroke and leave the
    // config unsaveable, so an invalid draft stays pending for the next edit.
    if (invalidCategoryIds(pending.config).length > 0) {
      return saveChainRef.current;
    }
    pendingRef.current = null;
    if (pending.runtimeKey !== getRuntimeKey()) return saveChainRef.current;
    savesInFlightRef.current += 1;
    reportSettingsSaveState('saving');
    const run = saveChainRef.current.then(async () => {
      try {
        if (pending.runtimeKey !== getRuntimeKey()) {
          reportSettingsSaveState('saved');
          return;
        }
        await saveConfig(pending.config);
        reportSettingsSaveState('saved');
      } catch {
        reportSettingsSaveState('error');
      } finally {
        savesInFlightRef.current -= 1;
      }
    });
    saveChainRef.current = run;
    return run;
  }, [saveConfig]);

  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flush();
  }, [flush]);

  // A first visit starts from the session defaults: the model the user already
  // chose for new sessions is the natural fallback, and it saves a required step.
  const settingsDefaultModel = useConfigStore((state) => state.settingsDefaultModel);
  const prefilledRef = React.useRef(false);
  React.useEffect(() => {
    if (prefilledRef.current || !loaded || !serverConfig || serverConfig.fallback) return;
    const parsed = parseModelSelector(settingsDefaultModel);
    // A default of Auto is what this fallback exists to resolve; nothing to prefill from it.
    if (!parsed || isAutoModel(parsed.providerId, parsed.modelId)) return;
    prefilledRef.current = true;
    update((config) => (config.fallback ? config : {
      ...config,
      fallback: { model: { providerID: parsed.providerId, modelID: parsed.modelId }, variant: null },
    }));
    // `update` is stable; the effect keys on what decides whether to prefill.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, serverConfig, settingsDefaultModel]);

  const update = React.useCallback((mutate: (config: RoutingConfig) => RoutingConfig) => {
    setDraft((current) => {
      if (!current) return current;
      const next = mutate(current);
      pendingRef.current = { config: next, runtimeKey: getRuntimeKey() };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { timerRef.current = null; void flush(); }, SAVE_DEBOUNCE_MS);
      return next;
    });
  }, [flush]);

  const updateCategory = React.useCallback((id: string, patch: Partial<RoutingCategory>) => {
    update((config) => ({ ...config, categories: config.categories.map((category) => (category.id === id ? { ...category, ...patch } : category)) }));
  }, [update]);

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name || !draft) return;
    const base = slugify(name) || `category-${Date.now()}`;
    let id = base;
    let counter = 2;
    // A built-in id is never stored as a user category, so a new category must
    // not take the id of a built-in the user removed.
    while (draft.categories.some((category) => category.id === id) || builtins.some((builtin) => builtin.id === id)) {
      id = `${base}-${counter++}`;
    }
    update((config) => ({
      ...config,
      categories: [...config.categories, { id, builtin: false, enabled: true, name, description: '', model: null, variant: null, agent: null }],
    }));
    setNewCategoryName('');
    setExpandedIds((current) => (current.includes(id) ? current : [...current, id]));
    setFocusCategoryId(id);
  };

  const toggleCategory = (id: string) => {
    setExpandedIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  };

  const resetCategory = (id: string) => {
    const builtin = builtins.find((entry) => entry.id === id);
    if (!builtin) return;
    updateCategory(id, { name: builtin.name, description: builtin.description, model: null, variant: null, agent: null, enabled: true });
  };

  const restoreCategory = (id: string) => {
    const builtin = builtins.find((entry) => entry.id === id);
    if (!builtin) return;
    update((config) => ({
      ...config,
      categories: [...config.categories, { id, builtin: true, enabled: true, name: builtin.name, description: builtin.description, model: null, variant: null, agent: null }],
    }));
  };

  const removeCategory = (id: string) => {
    update((config) => ({ ...config, categories: config.categories.filter((category) => category.id !== id) }));
  };

  // An invalid draft blocks the whole-config save, so the offending rows stay
  // open and the section says why: collapsing the row must not hide the reason
  // unrelated edits are not being sent.
  const invalidIds = draft ? invalidCategoryIds(draft) : [];
  const invalidDraft = invalidIds.length > 0;

  const enabledCount = draft?.categories.filter((category) => category.enabled).length ?? 0;
  const removedBuiltins = builtins.filter((builtin) => !draft?.categories.some((category) => category.id === builtin.id));

  const readinessText = !draft?.enabled
    ? t('settings.routing.status.disabled')
    : !draft.fallback
      ? t('settings.routing.status.noFallback')
      : enabledCount < 2
        ? t('settings.routing.status.tooFewCategories')
        : autoReady
          ? t('settings.routing.status.ready')
          : t('settings.routing.status.notReady');

  return (
    <SettingsPageLayout
      title={t('settings.page.routing.title')}
      description={t('settings.page.routing.description')}
      showSaveStatus
    >
      {loadError ? <p className={SETTINGS_DESCRIPTION_CLASS}>{t('settings.routing.loadError', { error: loadError })}</p> : null}
      {!loaded || !draft ? null : !available ? (
        <p className={SETTINGS_DESCRIPTION_CLASS}>{t('settings.routing.unavailable')}</p>
      ) : (
        <>
          <SettingsSection title={t('settings.routing.auto.title')} divider={false}>
            <div className={SETTINGS_SPACE_ROW_CLASS}>
              <JevAccessNote />
              <div className={SETTINGS_SPACE_CHECKBOX_CLASS}>
                <SettingsCheckboxRow
                  settingsItem="routing.enabled"
                  checked={draft.enabled}
                  onChange={(checked) => update((config) => ({ ...config, enabled: checked }))}
                  label={t('settings.routing.auto.enable')}
                  ariaLabel={t('settings.routing.auto.enable')}
                  info={t('settings.routing.auto.enableInfo')}
                />
                {draft.preserveCache === undefined ? null : (
                  <SettingsCheckboxRow
                    settingsItem="routing.preserve-cache"
                    checked={draft.preserveCache}
                    onChange={(checked) => update((config) => ({ ...config, preserveCache: checked }))}
                    label={t('settings.routing.auto.preserveCache')}
                    ariaLabel={t('settings.routing.auto.preserveCache')}
                    info={t('settings.routing.auto.preserveCacheInfo')}
                  />
                )}
              </div>
              <SettingsFieldRow
                settingsItem="routing.fallback-model"
                label={t('settings.routing.auto.fallbackModel')}
                info={t('settings.routing.auto.fallbackModelInfo')}
              >
                <ModelSelector
                  providerId={draft.fallback?.model.providerID ?? ''}
                  modelId={draft.fallback?.model.modelID ?? ''}
                  onChange={(providerID, modelID) => update((config) => ({ ...config, fallback: { model: { providerID, modelID }, variant: null } }))}
                  className={SETTINGS_CUSTOM_TRIGGER_CLASS}
                  placeholder={t('settings.routing.model.placeholder')}
                />
              </SettingsFieldRow>
              <SettingsFieldRow
                settingsItem="routing.fallback-thinking"
                label={t('settings.routing.auto.fallbackThinking')}
                info={t('settings.routing.auto.fallbackThinkingInfo')}
              >
                <VariantSelect
                  providerID={draft.fallback?.model.providerID}
                  modelID={draft.fallback?.model.modelID}
                  value={draft.fallback?.variant ?? null}
                  onChange={(variant) => update((config) => (config.fallback ? { ...config, fallback: { ...config.fallback, variant } } : config))}
                  ariaLabel={t('settings.routing.auto.fallbackThinking')}
                />
              </SettingsFieldRow>
            </div>
          </SettingsSection>

          <SettingsSection title={t('settings.routing.categories.title')}>
            <div className={SETTINGS_SPACE_ROW_CLASS}>
              <p className={SETTINGS_HELPER_CLASS}>{t('settings.routing.categories.description')}</p>
              <p className={SETTINGS_HELPER_CLASS}>{readinessText}</p>
              {invalidDraft ? (
                <p className={SETTINGS_HELPER_CLASS}>{t('settings.routing.categories.invalidDraft')}</p>
              ) : null}
              <div>
                {draft.categories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    expanded={expandedIds.includes(category.id) || invalidIds.includes(category.id)}
                    autoFocusDescription={focusCategoryId === category.id}
                    onDescriptionFocused={() => setFocusCategoryId(null)}
                    onToggle={() => toggleCategory(category.id)}
                    onChange={(patch) => updateCategory(category.id, patch)}
                    onReset={category.builtin ? () => resetCategory(category.id) : null}
                    onRemove={() => removeCategory(category.id)}
                  />
                ))}
              </div>
              {removedBuiltins.length > 0 ? (
                <SettingsControlGroup title={t('settings.routing.categories.removedTitle')}>
                  <div className="flex flex-wrap items-center gap-2">
                    {removedBuiltins.map((builtin) => (
                      <Button key={builtin.id} size="xs" variant="ghost" onClick={() => restoreCategory(builtin.id)}>
                        {t('settings.routing.category.restore', { name: builtin.name })}
                      </Button>
                    ))}
                  </div>
                </SettingsControlGroup>
              ) : null}
              <SettingsFieldRow label={t('settings.routing.categories.addLabel')} settingsItem="routing.add-category">
                <Input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) addCategory(); }}
                  placeholder={t('settings.routing.categories.addPlaceholder')}
                  aria-label={t('settings.routing.categories.addLabel')}
                  inputSize="compact"
                  className="min-w-0 flex-1"
                  maxLength={60}
                />
                <Button size="xs" variant="outline" onClick={addCategory} disabled={newCategoryName.trim().length === 0}>
                  {t('settings.routing.categories.add')}
                </Button>
              </SettingsFieldRow>
            </div>
          </SettingsSection>
        </>
      )}
    </SettingsPageLayout>
  );
};
