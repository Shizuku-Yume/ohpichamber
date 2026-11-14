import React from 'react';
import {
  JsonObjectSchema,
  MODEL_ROLE_IDS,
  type OmpSetting,
  type OmpSettingValue,
  type OmpSettingsChange,
  type OmpSettingsState,
} from '@openchamber/agent-contract';
import { CanonicalApiError, canonicalClient } from '@/api/canonicalClient';
import { useSettingsDirectory } from '@/hooks/useSettingsDirectory';
import { useSettingsModels } from '@/hooks/useSettingsModels';
import { useRuntimeAPIs } from '@/hooks/useRuntimeAPIs';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SettingsCheckboxRow,
  SettingsChipGroup,
  SettingsSection,
  SettingsTwoColumn,
  SettingsStackedField,
  SETTINGS_DESCRIPTION_CLASS,
  SETTINGS_HELPER_CLASS,
  SETTINGS_NUMBER_INPUT_CLASS,
  SETTINGS_NUMBER_UNIT_CLASS,
  SETTINGS_OPTION_STACK_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { NumberInput } from '@/components/ui/number-input';
import { SettingsPageLayout } from '@/components/sections/shared/SettingsPageLayout';
import {
  AUTOSAVE_SAVED,
  AUTOSAVE_UNCHANGED,
  autosaveFailed,
  useAutosave,
  type AutosaveResult,
} from '@/components/sections/shared/SettingsAutosave';
import { ModelRoleEditor } from '@/components/sections/shared/ModelRoleEditor';
import { Icon } from '@/components/icon/Icon';

/**
 * Roles this page assigns. Defaults owns `default`/`smol`/`slow` and Git owns
 * `commit`, so a role here is one no other page draws; the shared
 * `ModelRoleEditor` renders each of them the same way those pages render theirs.
 */
const PAGE_ROLES = MODEL_ROLE_IDS.filter(
  (role) => role !== 'default' && role !== 'smol' && role !== 'slow' && role !== 'commit',
);

const ROLE_LABEL_KEYS: Record<string, { label: I18nKey; desc: I18nKey }> = {
  vision: { label: 'settings.omp.modelRoles.role.vision.label', desc: 'settings.omp.modelRoles.role.vision.desc' },
  plan: { label: 'settings.omp.modelRoles.role.plan.label', desc: 'settings.omp.modelRoles.role.plan.desc' },
  tiny: { label: 'settings.omp.modelRoles.role.tiny.label', desc: 'settings.omp.modelRoles.role.tiny.desc' },
  memory: { label: 'settings.omp.modelRoles.role.memory.label', desc: 'settings.omp.modelRoles.role.memory.desc' },
  task: { label: 'settings.omp.modelRoles.role.task.label', desc: 'settings.omp.modelRoles.role.task.desc' },
  advisor: { label: 'settings.omp.modelRoles.role.advisor.label', desc: 'settings.omp.modelRoles.role.advisor.desc' },
  widget: { label: 'settings.omp.modelRoles.role.widget.label', desc: 'settings.omp.modelRoles.role.widget.desc' },
  image: { label: 'settings.omp.modelRoles.role.image.label', desc: 'settings.omp.modelRoles.role.image.desc' },
  web: { label: 'settings.omp.modelRoles.role.web.label', desc: 'settings.omp.modelRoles.role.web.desc' },
  speech: { label: 'settings.omp.modelRoles.role.speech.label', desc: 'settings.omp.modelRoles.role.speech.desc' },
  dictation: { label: 'settings.omp.modelRoles.role.dictation.label', desc: 'settings.omp.modelRoles.role.dictation.desc' },
  judge: { label: 'settings.omp.modelRoles.role.judge.label', desc: 'settings.omp.modelRoles.role.judge.desc' },
};

interface ResolvedSection {
  readonly id: string;
  readonly titleKey?: I18nKey;
  readonly descriptionKey?: I18nKey;
  readonly label: string;
  readonly rows: readonly OmpSetting[];
}

const SECTION_METADATA: Record<string, { titleKey?: I18nKey; descriptionKey?: I18nKey; label: string }> = {
  retry: {
    titleKey: 'settings.omp.group.retry_fallback.label',
    descriptionKey: 'settings.omp.section.retry.description',
    label: 'Retry & Fallback',
  },
  compaction: {
    titleKey: 'settings.omp.group.compaction.label',
    descriptionKey: 'settings.omp.section.compaction.description',
    label: 'Compaction',
  },
  lsp: {
    titleKey: 'settings.omp.group.lsp.label',
    descriptionKey: 'settings.omp.section.lsp.description',
    label: 'LSP',
  },
  tasks: {
    titleKey: 'settings.omp.section.subagents.title',
    descriptionKey: 'settings.omp.section.subagents.description',
    label: 'Subagents',
  },
  modes: {
    titleKey: 'settings.omp.group.modes.label',
    descriptionKey: 'settings.omp.section.modes.description',
    label: 'Modes',
  },
  commands: {
    titleKey: 'settings.omp.group.commands_skills.label',
    descriptionKey: 'settings.omp.section.commands.description',
    label: 'Commands & Skills',
  },
  integrations: {
    titleKey: 'settings.omp.section.integrations.title',
    descriptionKey: 'settings.omp.section.integrations.description',
    label: 'Integrations',
  },
};

function resolveSectionInfo(setting: OmpSetting): { id: string; titleKey?: I18nKey; descriptionKey?: I18nKey; label: string } {
  if (setting.id.startsWith('retry.')) return { id: 'retry', ...SECTION_METADATA.retry };
  if (setting.id.startsWith('compaction.') || setting.group === 'Compaction') return { id: 'compaction', ...SECTION_METADATA.compaction };
  if (setting.id.startsWith('lsp.') || setting.group === 'LSP') return { id: 'lsp', ...SECTION_METADATA.lsp };
  if (setting.id.startsWith('task.') || setting.group === 'Subagents') return { id: 'tasks', ...SECTION_METADATA.tasks };
  if (setting.id.startsWith('plan.') || setting.id.startsWith('goal.') || setting.group === 'Modes') return { id: 'modes', ...SECTION_METADATA.modes };
  if (setting.id.startsWith('skills.') || setting.group === 'Commands & Skills') return { id: 'commands', ...SECTION_METADATA.commands };
  if (setting.id.startsWith('mcp.') || setting.group === 'Discovery & MCP') return { id: 'integrations', ...SECTION_METADATA.integrations };
  const slug = optionSlug(setting.group || 'general');
  return {
    id: slug,
    label: setting.group || 'General',
  };
}

function inferUnit(id: string): 'percent' | 'seconds' | 'tokens' | undefined {
  if (id.endsWith('Percent') || id.endsWith('Pct')) return 'percent';
  if (id.endsWith('Seconds') || id.endsWith('Sec')) return 'seconds';
  if (id.endsWith('Tokens')) return 'tokens';
  return undefined;
}

/** Lower-case, hyphenated slug the option-label keys use. */
function optionSlug(value: unknown): string {
  const out: string[] = [];
  for (const ch of String(value ?? '').toLowerCase()) {
    if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) out.push(ch);
    else if (out.length > 0 && out[out.length - 1] !== '-') out.push('-');
  }
  return out.join('').replace(/^-+|-+$/g, '') || 'opt';
}

/** OMP's own sentinel: `-1` or `default`, both shown as the Default option. */
function isSentinelOption(value: string): boolean {
  return value === 'default' || value === '-1';
}

/** The native `modelRoles` record read as plain selectors; malformed entries are dropped. */
function readRoleSelectors(value: OmpSettingValue): Record<string, string> {
  const record = JsonObjectSchema.safeParse(value);
  if (!record.success) return {};
  return Object.fromEntries(
    Object.entries(record.data).flatMap(([role, entry]) => {
      const selector = typeof entry === 'string'
        ? entry
        : Array.isArray(entry) && typeof entry[0] === 'string' ? entry[0] : '';
      return selector ? [[role, selector]] : [];
    }),
  );
}

type Values = Record<string, OmpSettingValue>;

/** One registry row: label and description from the locale, control from type/options. */
const OmpRowControl: React.FC<{
  setting: OmpSetting;
  value: OmpSettingValue;
  disabled?: boolean;
  onChange: (value: OmpSettingValue) => void;
}> = ({ setting, value, disabled, onChange }) => {
  const { t } = useI18n();
  const labelKey = `settings.omp.items.${setting.id}.label` as I18nKey;
  const label = t(labelKey) === labelKey ? (setting.label ?? setting.id) : t(labelKey);
  const descriptionKey = `settings.omp.items.${setting.id}.description` as I18nKey;
  const description = t(descriptionKey) === descriptionKey ? setting.description : t(descriptionKey);
  const anchor = `omp.${setting.id}`;

  if (setting.type === 'boolean') {
    return (
      <SettingsCheckboxRow
        settingsItem={anchor}
        checked={value === true}
        onChange={onChange}
        disabled={disabled}
        label={label}
        info={description}
        ariaLabel={label}
      />
    );
  }

  if (setting.type === 'number') {
    if (setting.options && setting.options.length > 0) {
      const sentinelOption = setting.options.find((opt) => isSentinelOption(opt.value));
      const isSentinel = value === -1 || value === 'default' || value === null;
      const currentValue = isSentinel ? (sentinelOption?.value ?? 'default') : String(value);
      const selectedOption = setting.options.find((opt) => opt.value === currentValue);
      const selectedLabel = selectedOption
        ? (isSentinelOption(selectedOption.value) ? t('settings.omp.value.default') : selectedOption.label)
        : isSentinel ? t('settings.omp.value.default') : currentValue;

      return (
        <SettingsStackedField label={label} info={description} settingsItem={anchor}>
          <Select
            value={currentValue}
            onValueChange={(next) => {
              if (isSentinelOption(next)) {
                onChange(-1);
              } else {
                const num = Number(next);
                onChange(Number.isNaN(num) ? next : num);
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger className="w-48" aria-label={label}>
              <SelectValue>{selectedLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {setting.options.map((opt) => {
                const displayLabel = isSentinelOption(opt.value) ? t('settings.omp.value.default') : opt.label;
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    {displayLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </SettingsStackedField>
      );
    }

    const unit = inferUnit(setting.id);
    return (
      <SettingsStackedField label={label} info={description} settingsItem={anchor}>
        <div className="flex items-center gap-2">
          <NumberInput
            value={typeof value === 'number' && value !== -1 ? value : undefined}
            placeholder={t('settings.omp.value.default')}
            onValueChange={onChange}
            onClear={() => onChange(null)}
            disabled={disabled}
            className={SETTINGS_NUMBER_INPUT_CLASS}
            aria-label={label}
          />
          {unit ? <span className={SETTINGS_NUMBER_UNIT_CLASS}>{t(`settings.omp.unit.${unit}` as I18nKey)}</span> : null}
        </div>
      </SettingsStackedField>
    );
  }

  if (setting.type === 'string') {
    return (
      <SettingsStackedField label={label} info={description} settingsItem={anchor}>
        <Input
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="max-w-md"
          aria-label={label}
        />
      </SettingsStackedField>
    );
  }

  const choices = setting.options ?? (setting.enumValues ?? []).map((choice) => ({ value: choice, label: choice }));
  const current = value === null || value === undefined ? '' : String(value);
  return (
    <SettingsStackedField label={label} info={description} settingsItem={anchor}>
      <SettingsChipGroup
        value={current}
        aria-label={label}
        options={choices.map((choice) => {
          const key = `settings.omp.items.${setting.id}.options.${optionSlug(choice.value)}` as I18nKey;
          const translated = t(key);
          return { value: String(choice.value), label: translated === key ? choice.label : translated };
        })}
        onChange={(next) => onChange(next)}
      />
    </SettingsStackedField>
  );
};

export const OmpSettingsPage: React.FC = () => {
  const { t } = useI18n();
  const directory = useSettingsDirectory();
  const files = useRuntimeAPIs().files;
  const [state, setState] = React.useState<OmpSettingsState | null>(null);
  const [form, setForm] = React.useState<Values>({});
  const [loading, setLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [reload, setReload] = React.useState(0);
  // The catalog loader already read this directory's models; fetching them
  // again here duplicated the slowest request the page made.
  const models = useSettingsModels(directory);
  const savedRef = React.useRef<OmpSettingsState | null>(null);
  const scopeGeneration = React.useRef(0);

  React.useEffect(() => {
    if (!directory) {
      savedRef.current = null;
      setState(null);
      setLoading(false);
      setLoadFailed(false);
      return;
    }
    const abort = new AbortController();
    const generation = ++scopeGeneration.current;
    savedRef.current = null;
    setState(null);
    setForm({});
    setLoading(true);
    setLoadFailed(false);

    const load = async () => {
      try {
        const workspace = await canonicalClient.resolveWorkspace(directory);
        if (abort.signal.aborted || generation !== scopeGeneration.current) return;
        const snapshot = await canonicalClient.getOmpSettings(workspace.workspaceId, abort.signal);
        if (abort.signal.aborted || generation !== scopeGeneration.current) return;
        savedRef.current = snapshot;
        setState(snapshot);

        const initialValues: Values = {};
        for (const setting of snapshot.settings) initialValues[setting.id] = setting.value;
        setForm(initialValues);
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'AbortError') setLoadFailed(true);
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => abort.abort();
  }, [directory, reload]);

  const save = React.useCallback(async (): Promise<AutosaveResult> => {
    const saved = savedRef.current;
    const generation = scopeGeneration.current;
    if (!saved || loading) return AUTOSAVE_UNCHANGED;

    const changes: OmpSettingsChange[] = saved.settings.flatMap((setting) => {
      const val = form[setting.id];
      return JSON.stringify(val ?? null) === JSON.stringify(setting.value ?? null)
        ? []
        : [{ id: setting.id, value: val }];
    });
    if (changes.length === 0) return AUTOSAVE_UNCHANGED;

    try {
      let applied = changes;
      let next: OmpSettingsState;
      try {
        next = await canonicalClient.updateOmpSettings(saved.workspaceId, {
          expectedRevision: saved.revision,
          changes: applied,
        });
      } catch (error) {
        if (!(error instanceof CanonicalApiError) || error.problem.status !== 409) throw error;
        const latest = await canonicalClient.getOmpSettings(saved.workspaceId);
        if (generation !== scopeGeneration.current) return AUTOSAVE_SAVED;
        savedRef.current = latest;
        setState(latest);
        applied = changes.filter((change) => {
          const setting = latest.settings.find((candidate) => candidate.id === change.id);
          return setting !== undefined && JSON.stringify(setting.value ?? null) !== JSON.stringify(change.value ?? null);
        });
        if (applied.length === 0) return AUTOSAVE_SAVED;
        next = await canonicalClient.updateOmpSettings(latest.workspaceId, {
          expectedRevision: latest.revision,
          changes: applied,
        });
      }

      if (generation !== scopeGeneration.current) return AUTOSAVE_SAVED;
      savedRef.current = next;
      setState(next);

      const nextValues: Values = {};
      for (const setting of next.settings) nextValues[setting.id] = setting.value;
      setForm((current) => {
        const merged = { ...current };
        for (const change of applied) {
          if (JSON.stringify(current[change.id] ?? null) === JSON.stringify(change.value ?? null)) {
            merged[change.id] = nextValues[change.id];
          }
        }
        return merged;
      });
      return AUTOSAVE_SAVED;
    } catch (error) {
      return autosaveFailed(error instanceof Error ? error.message : t('settings.omp.saveFailed'));
    }
  }, [form, loading, t]);

  const autosave = useAutosave(save);

  const onChange = React.useCallback((setting: OmpSetting, value: OmpSettingValue) => {
    setForm((current) => ({ ...current, [setting.id]: value }));
  }, []);

  // A picker or a toggle is a decision the user has made: write it now instead
  // of waiting for blur, so a condition over that setting refreshes with it.
  const onImmediate = React.useCallback(
    (setting: OmpSetting, value: OmpSettingValue) => {
      setForm((current) => ({ ...current, [setting.id]: value }));
      autosave.requestSave();
    },
    [autosave]
  );

  /** Rows the page draws: engine placement, in the snapshot, and condition holds. */
  const visible = React.useMemo(() => {
    if (!state) return null;
    const byId = new Map(state.settings.map((setting) => [setting.id, setting]));
    const engineSettings = state.settings.filter((setting) => {
      if (setting.placement.type !== 'engine') return false;
      if (setting.conditionActive === false) return false;
      if (setting.id === 'modelRoles') return false;
      return true;
    });

    const sectionOrder: string[] = [];
    const sectionMap = new Map<string, { id: string; titleKey?: I18nKey; descriptionKey?: I18nKey; label: string; rows: OmpSetting[] }>();

    for (const setting of engineSettings) {
      const info = resolveSectionInfo(setting);
      if (!sectionMap.has(info.id)) {
        sectionOrder.push(info.id);
        sectionMap.set(info.id, { ...info, rows: [] });
      }
      sectionMap.get(info.id)!.rows.push(setting);
    }

    const sections: ResolvedSection[] = sectionOrder.map((id) => sectionMap.get(id)!);
    const total = state.totalCount;
    const shownCount = engineSettings.length + (byId.has('modelRoles') ? 1 : 0);
    const hiddenCount = Math.max(0, total - shownCount);

    return {
      sections,
      modelRoles: byId.get('modelRoles'),
      hiddenCount,
    };
  }, [state]);

  const roles = React.useMemo(
    () => readRoleSelectors(form.modelRoles !== undefined ? form.modelRoles : null),
    [form.modelRoles]
  );

  /** What a role with no level of its own runs at, per OMP's session default. */
  const globalThinkingLevel = React.useMemo(() => {
    const value = state?.settings.find((setting) => setting.id === 'defaultThinkingLevel')?.value;
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }, [state]);

  const onRoleChange = React.useCallback((role: string, selector: string) => {
    setForm((current) => {
      const nextRoles: Record<string, string> = { ...readRoleSelectors(current.modelRoles ?? null) };
      if (selector) nextRoles[role] = selector;
      else delete nextRoles[role];
      return { ...current, modelRoles: nextRoles };
    });
    autosave.requestSave();
  }, [autosave]);

  const revealConfig = React.useCallback(() => {
    const path = state?.configPath;
    if (!path || !files.revealPath) return;
    void files.revealPath(path).catch(() => {
      // The path stays on screen, so a refused reveal still tells the user
      // where the file is.
    });
  }, [files, state?.configPath]);

  if (loading && !state) {
    return (
      <SettingsPageLayout title={t('settings.page.omp.title')} description={t('settings.page.omp.description')}>
        <div className="py-8 text-center text-sm text-muted-foreground">...</div>
      </SettingsPageLayout>
    );
  }
  if (loadFailed || !state || !visible) {
    return (
      <SettingsPageLayout
        title={t('settings.page.omp.title')}
        description={t('settings.page.omp.description')}
        headerEnd={!directory ? undefined : <Button variant="outline" size="sm" onClick={() => setReload((value) => value + 1)}>{t('settings.omp.retry')}</Button>}
      >
        <p className={SETTINGS_HELPER_CLASS}>{t('settings.omp.loadFailed')}</p>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout
      title={t('settings.page.omp.title')}
      description={t('settings.page.omp.description')}
      onBlurCapture={autosave.onBlurCapture}
    >
      <div className="space-y-6">
        <SettingsSection
          title={t('settings.omp.modelRoles.title')}
          description={t('settings.omp.modelRoles.description')}
          divider={false}
          settingsItem="omp.modelRoles"
        >
          <SettingsTwoColumn>
            {PAGE_ROLES.map((role) => {
              const keys = ROLE_LABEL_KEYS[role];
              if (keys === undefined) return null;
              return (
                <ModelRoleEditor
                  key={role}
                  role={role}
                  roles={roles}
                  models={models}
                  directory={directory ?? undefined}
                  globalLevel={globalThinkingLevel}
                  layout="stacked"
                  disabled={loading}
                  label={t(keys.label)}
                  info={t(keys.desc)}
                  settingsItem={`omp.modelRoles.${role}`}
                  onChange={(selector) => onRoleChange(role, selector)}
                />
              );
            })}
          </SettingsTwoColumn>
        </SettingsSection>

        {visible.sections.map((section) => (
          <SettingsSection
            key={section.id}
            title={section.titleKey ? t(section.titleKey) : section.label}
            description={section.descriptionKey ? t(section.descriptionKey) : undefined}
            settingsItem={`omp.section.${section.id}`}
          >
            <div className={SETTINGS_OPTION_STACK_CLASS}>
              {section.rows.map((setting) => (
                <OmpRowControl
                  key={setting.id}
                  setting={setting}
                  value={form[setting.id] !== undefined ? form[setting.id] : setting.value}
                  disabled={loading}
                  onChange={(value) => {
                    const isSelectNumber = setting.type === 'number' && Boolean(setting.options && setting.options.length > 0);
                    if (setting.type === 'number' && !isSelectNumber) {
                      onChange(setting, value);
                    } else {
                      onImmediate(setting, value);
                    }
                  }}
                />
              ))}
            </div>
          </SettingsSection>
        ))}

        <SettingsSection
          title={t('settings.omp.advanced')}
          settingsItem="omp.advanced"
          headerAction={state.configPath && files.revealPath ? (
            <Button variant="outline" size="sm" onClick={revealConfig}>
              <Icon name="file-text" className="size-3.5 mr-1" />
              {t('settings.omp.openConfig')}
            </Button>
          ) : undefined}
        >
          <p className={SETTINGS_DESCRIPTION_CLASS}>
            {t('settings.omp.advancedDescription', { count: visible.hiddenCount })}
          </p>
          {state.configPath ? (
            <p className={`${SETTINGS_HELPER_CLASS} font-mono break-all`}>{state.configPath}</p>
          ) : null}
        </SettingsSection>
      </div>
    </SettingsPageLayout>
  );
};
