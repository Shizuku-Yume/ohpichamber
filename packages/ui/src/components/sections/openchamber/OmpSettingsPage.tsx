import React from 'react';
import { JsonObjectSchema, JsonValueSchema, type Model, type OmpSetting, type OmpSettingValue, type OmpSettingsChange, type OmpSettingsState } from '@openchamber/agent-contract';
import { CanonicalApiError, canonicalClient } from '@/api/canonicalClient';
import { z } from 'zod';
import { useSettingsDirectory } from '@/hooks/useSettingsDirectory';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  SettingsCheckboxRow,
  SettingsFieldRow,
  SettingsSection,
  SettingsStackedField,
  SETTINGS_HELPER_CLASS,
  SETTINGS_NUMBER_INPUT_CLASS,
  SETTINGS_SELECT_ROW_TRIGGER_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { SettingsPageLayout } from '@/components/sections/shared/SettingsPageLayout';
import {
  AUTOSAVE_SAVED,
  AUTOSAVE_UNCHANGED,
  autosaveFailed,
  useAutosave,
  type AutosaveResult,
} from '@/components/sections/shared/SettingsAutosave';
interface RoleDefinition {
  id: string;
  tag: string;
  fallbackRole?: string;
}

const OMP_MODEL_ROLES: readonly RoleDefinition[] = [
  { id: 'default', tag: 'DEFAULT' },
  { id: 'smol', tag: 'SMOL', fallbackRole: 'default' },
  { id: 'slow', tag: 'SLOW', fallbackRole: 'default' },
  { id: 'vision', tag: 'VISION', fallbackRole: 'default' },
  { id: 'plan', tag: 'PLAN', fallbackRole: 'default' },
  { id: 'commit', tag: 'COMMIT', fallbackRole: 'smol' },
  { id: 'tiny', tag: 'TINY', fallbackRole: 'smol' },
  { id: 'memory', tag: 'MEMORY', fallbackRole: 'tiny' },
  { id: 'task', tag: 'TASK', fallbackRole: 'default' },
  { id: 'advisor', tag: 'ADVISOR', fallbackRole: 'slow' },
  { id: 'widget', tag: 'WIDGET', fallbackRole: 'smol' },
  { id: 'image', tag: 'IMAGE' },
  { id: 'web', tag: 'WEB', fallbackRole: 'default' },
  { id: 'speech', tag: 'SPEECH' },
  { id: 'dictation', tag: 'DICTATION' },
  { id: 'judge', tag: 'JUDGE', fallbackRole: 'default' },
] as const;

interface ParsedRoleSelector {
  model: string;
  effort: string;
}

function parseRoleSelector(selector: unknown): ParsedRoleSelector {
  if (typeof selector !== 'string') return { model: '', effort: '' };
  const trimmed = selector.trim();
  if (!trimmed) return { model: '', effort: '' };
  const colonIndex = trimmed.lastIndexOf(':');
  if (colonIndex > 0) {
    const base = trimmed.slice(0, colonIndex);
    const suffix = trimmed.slice(colonIndex + 1);
    const knownEfforts = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'auto'];
    if (knownEfforts.includes(suffix.toLowerCase())) {
      return { model: base, effort: suffix };
    }
  }
  return { model: trimmed, effort: '' };
}

function formatRoleSelector(model: string, effort: string): string {
  const trimmedModel = model.trim();
  if (!trimmedModel) return '';
  const trimmedEffort = effort.trim();
  if (!trimmedEffort || trimmedEffort === 'default' || trimmedEffort === '__default__') return trimmedModel;
  return `${trimmedModel}:${trimmedEffort}`;
}

function resolveRoleFallback(
  roleId: string,
  modelRoles: Record<string, string> = {}
): { role: string; model?: string } | null {
  const def = OMP_MODEL_ROLES.find(r => r.id === roleId);
  if (!def || !def.fallbackRole) return null;
  let curr: string | undefined = def.fallbackRole;
  const visited = new Set<string>([roleId]);
  while (curr && !visited.has(curr)) {
    visited.add(curr);
    const configured = modelRoles[curr];
    if (typeof configured === 'string' && configured.trim()) {
      return { role: curr, model: configured.trim() };
    }
    const nextDef = OMP_MODEL_ROLES.find(r => r.id === curr);
    curr = nextDef?.fallbackRole;
  }
  return { role: def.fallbackRole };
}

const ModelRolesRecordSchema = z.record(z.string(), z.string());

/** Safely validate object fields without unjustified type assertions. */
function parseSafeRolesRecord(val: unknown): Record<string, string> {
  const parsed = ModelRolesRecordSchema.safeParse(val);
  if (parsed.success) return parsed.data;
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(val)) {
      if (typeof v === 'string') {
        result[k] = v;
      }
    }
    return result;
  }
  return {};
}

const DEFAULT_EFFORT_OPTIONS: readonly { value: string; labelKey: I18nKey }[] = [
  { value: 'minimal', labelKey: 'settings.omp.modelRoles.effort.minimal' },
  { value: 'low', labelKey: 'settings.omp.modelRoles.effort.low' },
  { value: 'medium', labelKey: 'settings.omp.modelRoles.effort.medium' },
  { value: 'high', labelKey: 'settings.omp.modelRoles.effort.high' },
  { value: 'max', labelKey: 'settings.omp.modelRoles.effort.max' },
] as const;
type Values = Record<string, OmpSettingValue>;
type Drafts = Record<string, string>;
type DraftErrors = Record<string, string | null>;

const ArrayDraftSchema = z.array(JsonValueSchema);
const NullableBooleanSchema = z.boolean().nullable();
const NullableNumberSchema = z.number().nullable();
const NullableStringSchema = z.string().nullable();

const projectSettings = (settings: OmpSetting[]) => {
  const values: Values = {};
  const drafts: Drafts = {};
  for (const setting of settings) {
    values[setting.id] = setting.value;
    if (setting.type === 'array' || setting.type === 'record') {
      drafts[setting.id] = setting.value === null ? '' : JSON.stringify(setting.value, null, 2);
    }
  }
  return { values, drafts };
};

const parseDraft = (setting: OmpSetting, text: string): { value: OmpSettingValue; error: null } | { value: null; error: string } => {
  if (text.trim() === '') return { value: null, error: null };
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { return { value: null, error: 'invalid-json' }; }
  const decoded = setting.type === 'array' ? ArrayDraftSchema.safeParse(parsed) : JsonObjectSchema.safeParse(parsed);
  return decoded.success ? { value: decoded.data, error: null } : { value: null, error: 'invalid-json' };
};
const ROLE_I18N: Record<string, { label: I18nKey; desc: I18nKey }> = {
  default: { label: 'settings.omp.modelRoles.role.default.label', desc: 'settings.omp.modelRoles.role.default.desc' },
  smol: { label: 'settings.omp.modelRoles.role.smol.label', desc: 'settings.omp.modelRoles.role.smol.desc' },
  slow: { label: 'settings.omp.modelRoles.role.slow.label', desc: 'settings.omp.modelRoles.role.slow.desc' },
  vision: { label: 'settings.omp.modelRoles.role.vision.label', desc: 'settings.omp.modelRoles.role.vision.desc' },
  plan: { label: 'settings.omp.modelRoles.role.plan.label', desc: 'settings.omp.modelRoles.role.plan.desc' },
  commit: { label: 'settings.omp.modelRoles.role.commit.label', desc: 'settings.omp.modelRoles.role.commit.desc' },
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

const ModelRolesSection: React.FC<{
  setting: OmpSetting;
  form: Values;
  models: Model[];
  disabled: boolean;
  onChange: (setting: OmpSetting, value: OmpSettingValue) => void;
  onImmediate: () => void;
}> = ({ setting, form, models, disabled, onChange, onImmediate }) => {
  const { t } = useI18n();
  const rawRoles = form[setting.id];
  const rolesMap = parseSafeRolesRecord(rawRoles);

  return (
    <SettingsSection
      title={t('settings.omp.modelRoles.title')}
      divider={false}
      settingsItem="omp.modelRoles"
    >
      <p className="text-sm text-muted-foreground mb-4">
        {t('settings.omp.modelRoles.description')}
      </p>
      <div className="space-y-4">
        {OMP_MODEL_ROLES.map(role => {
          const parsed = parseRoleSelector(rolesMap[role.id]);
          const selectedModelId = parsed.model;
          const selectedEffort = parsed.effort;
          const fallback = resolveRoleFallback(role.id, rolesMap);
          const matchedModel = models.find(m => `${m.provider}/${m.modelId}` === selectedModelId);
          const supportsReasoning =
            matchedModel?.reasoningEffortSupported ||
            (matchedModel?.reasoningOptions && matchedModel.reasoningOptions.length > 0);
          const roleMeta = ROLE_I18N[role.id];
          const roleLabel = roleMeta ? t(roleMeta.label) : role.id;
          const roleDesc = roleMeta ? t(roleMeta.desc) : '';

          const label = (
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{roleLabel}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-muted text-muted-foreground border">
                {role.tag}
              </span>
            </div>
          );

          const description = (
            <span className="block">
              {roleDesc ? <span className="block">{roleDesc}</span> : null}
              {!selectedModelId && fallback && (
                <span className="block text-xs text-muted-foreground font-mono mt-1" data-testid={`fallback-${role.id}`}>
                  {fallback.model
                    ? t('settings.omp.modelRoles.fallbackToWithModel', { role: fallback.role, model: fallback.model })
                    : t('settings.omp.modelRoles.fallbackTo', { role: fallback.role })}
                </span>
              )}
            </span>
          );

          return (
            <SettingsFieldRow
              key={role.id}
              label={label}
              description={description}
              settingsItem={`omp.modelRoles.${role.id}`}
            >

              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Select
                  value={selectedModelId || '__inherit__'}
                  onValueChange={val => {
                    const nextRoles = { ...rolesMap };
                    if (val === '__inherit__') {
                      delete nextRoles[role.id];
                    } else {
                      const nextModel = models.find(m => `${m.provider}/${m.modelId}` === val);
                      const nextSupportsReasoning =
                        nextModel?.reasoningEffortSupported ||
                        (nextModel?.reasoningOptions && nextModel.reasoningOptions.length > 0);
                      const effortToKeep = nextSupportsReasoning ? selectedEffort : '';
                      nextRoles[role.id] = formatRoleSelector(val, effortToKeep);
                    }
                    onChange(setting, nextRoles);
                    onImmediate();
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger
                    className={SETTINGS_SELECT_ROW_TRIGGER_CLASS}
                    aria-label={`${roleLabel} model`}
                  >
                    <SelectValue placeholder={t('settings.omp.modelRoles.inheritFallback')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__inherit__">
                      {t('settings.omp.modelRoles.inheritFallback')}
                    </SelectItem>
                    {models.map(m => {
                      const key = `${m.provider}/${m.modelId}`;
                      return (
                        <SelectItem key={key} value={key}>
                          {m.provider} / {m.name}
                        </SelectItem>
                      );
                    })}
                    {selectedModelId && !models.some(m => `${m.provider}/${m.modelId}` === selectedModelId) && (
                      <SelectItem value={selectedModelId}>
                        {selectedModelId} ({t('settings.omp.modelRoles.customModel')})
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {supportsReasoning && (
                  <Select
                    value={selectedEffort || '__default__'}
                    onValueChange={val => {
                      const nextRoles = { ...rolesMap };
                      const effort = val === '__default__' ? '' : val;
                      nextRoles[role.id] = formatRoleSelector(selectedModelId, effort);
                      onChange(setting, nextRoles);
                      onImmediate();
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger
                      className="w-[140px]"
                      aria-label={`${roleLabel} ${t('settings.omp.modelRoles.thinkingEffort')}`}
                    >
                      <SelectValue placeholder={t('settings.omp.modelRoles.thinkingDefault')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">
                        {t('settings.omp.modelRoles.thinkingDefault')}
                      </SelectItem>
                      {(matchedModel?.reasoningOptions && matchedModel.reasoningOptions.length > 0
                        ? matchedModel.reasoningOptions.map(opt => ({
                            value: opt.reasoningEffort,
                            label: opt.label,
                          }))
                        : DEFAULT_EFFORT_OPTIONS.map(opt => ({
                            value: opt.value,
                            label: t(opt.labelKey),
                          }))
                      ).map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </SettingsFieldRow>
          );
        })}
      </div>
    </SettingsSection>
  );
};


const Group: React.FC<{
  title: string;
  settings: OmpSetting[];
  form: Values;
  drafts: Drafts;
  errors: DraftErrors;
  disabled: boolean;
  first: boolean;
  onChange: (setting: OmpSetting, value: OmpSettingValue) => void;
  onDraft: (setting: OmpSetting, text: string) => void;
  onImmediate: () => void;
}> = ({ title, settings, form, drafts, errors, disabled, first, onChange, onDraft, onImmediate }) => (
  <SettingsSection title={title} divider={!first} settingsItem={first ? 'omp.behaviour' : undefined}>
    <div className="space-y-4">
      {settings.map(setting => {
        const label = setting.label ?? <span className="font-mono">{setting.id}</span>;
        const info = setting.description;
        if (setting.type === 'boolean') {
          return (
            <SettingsCheckboxRow
              key={setting.id}
              checked={NullableBooleanSchema.safeParse(form[setting.id]).data === true}
              onChange={checked => { onChange(setting, checked); onImmediate(); }}
              label={label}
              info={info}
              disabled={disabled}
              settingsItem={`omp.${setting.id}`}
            />
          );
        }
        if (setting.type === 'enum') {
          const options = setting.options ?? (setting.enumValues ?? []).map(value => ({ value, label: value }));
          return (
            <SettingsFieldRow key={setting.id} label={label} info={info} settingsItem={`omp.${setting.id}`}>
              <Select
                value={NullableStringSchema.safeParse(form[setting.id]).data ?? ''}
                onValueChange={value => { onChange(setting, value); onImmediate(); }}
                disabled={disabled}
              >
                <SelectTrigger className={SETTINGS_SELECT_ROW_TRIGGER_CLASS} aria-label={setting.label ?? setting.id}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingsFieldRow>
          );
        }
        if (setting.type === 'number') {
          return (
            <SettingsFieldRow key={setting.id} label={label} info={info} settingsItem={`omp.${setting.id}`}>
              <NumberInput
                className={SETTINGS_NUMBER_INPUT_CLASS}
                value={NullableNumberSchema.safeParse(form[setting.id]).data ?? undefined}
                onValueChange={value => onChange(setting, value)}
                disabled={disabled}
                aria-label={setting.label ?? setting.id}
              />
            </SettingsFieldRow>
          );
        }
        if (setting.type === 'string') {
          return (
            <SettingsFieldRow key={setting.id} label={label} info={info} settingsItem={`omp.${setting.id}`}>
              <Input
                value={NullableStringSchema.safeParse(form[setting.id]).data ?? ''}
                onChange={event => onChange(setting, event.target.value)}
                disabled={disabled}
                aria-label={setting.label ?? setting.id}
              />
            </SettingsFieldRow>
          );
        }
        if (setting.id === 'cycleOrder') {
          const currentList = Array.isArray(form[setting.id]) ? (form[setting.id] as string[]) : [];
          return (
            <SettingsFieldRow key={setting.id} label={label} info={info} settingsItem={`omp.${setting.id}`}>
              <Input
                value={currentList.join(', ')}
                onChange={event => {
                  const items = event.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  onChange(setting, items);
                }}
                disabled={disabled}
                placeholder="smol, default, slow"
                aria-label={setting.label ?? setting.id}
              />
            </SettingsFieldRow>
          );
        }
        const error = errors[setting.id];
        return (
          <SettingsStackedField
            key={setting.id}
            label={label}
            info={info}
            settingsItem={`omp.${setting.id}`}
            controlClassName="max-w-none flex-col items-stretch"
          >
            <Textarea
              value={drafts[setting.id] ?? ''}
              onChange={event => onDraft(setting, event.target.value)}
              disabled={disabled}
              spellCheck={false}
              className="min-h-24 font-mono text-xs"
              aria-label={setting.label ?? setting.id}
              aria-invalid={error ? true : undefined}
            />
            {error ? <p className={`${SETTINGS_HELPER_CLASS} text-destructive`}>{error}</p> : null}
          </SettingsStackedField>
        );
      })}
    </div>
  </SettingsSection>
);

/**
 * Settings → OMP: behaviour settings shared with OMP's own config.yml. The
 * route uses OMP's registry metadata and rejects anything outside the contract
 * allowlist; this page only renders descriptors the Agent Service returned.
 */
export const OmpSettingsPage: React.FC = () => {
  const { t } = useI18n();
  const directory = useSettingsDirectory();
  const [state, setState] = React.useState<OmpSettingsState | null>(null);
  const [form, setForm] = React.useState<Values>({});
  const [drafts, setDrafts] = React.useState<Drafts>({});
  const [errors, setErrors] = React.useState<DraftErrors>({});
  const [loading, setLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [reload, setReload] = React.useState(0);
  const [models, setModels] = React.useState<Model[]>([]);
  const savedRef = React.useRef<OmpSettingsState | null>(null);
  const scopeGeneration = React.useRef(0);

  React.useEffect(() => {
    if (!directory) { savedRef.current = null; setState(null); setLoading(false); setLoadFailed(false); return; }
    const abort = new AbortController();
    const generation = ++scopeGeneration.current;
    savedRef.current = null;
    setState(null);
    setForm({});
    setDrafts({});
    setErrors({});
    setLoading(true);
    setLoadFailed(false);
    const load = async () => {
      try {
        const workspace = await canonicalClient.resolveWorkspace(directory);
        if (abort.signal.aborted || generation !== scopeGeneration.current) return;
        const [snapshot, modelCatalog] = await Promise.all([
          canonicalClient.getOmpSettings(workspace.workspaceId, abort.signal),
          canonicalClient.getModels(workspace.workspaceId).catch(() => null),
        ]);
        if (abort.signal.aborted || generation !== scopeGeneration.current) return;
        savedRef.current = snapshot;
        setState(snapshot);
        if (modelCatalog?.models) setModels(modelCatalog.models);
        const projected = projectSettings(snapshot.settings);
        setForm(projected.values);
        setDrafts(projected.drafts);
        setErrors({});
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
    if (Object.values(errors).some(Boolean)) return autosaveFailed(t('settings.omp.invalidJson'));
    const changes: OmpSettingsChange[] = saved.settings.flatMap(setting => {
      const value = form[setting.id];
      return JSON.stringify(value ?? null) === JSON.stringify(setting.value ?? null) ? [] : [{ id: setting.id, value }];
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
        // Another catalog mutation advanced the workspace revision. Re-read once
        // and retry only the fields that still differ so a stale baseline cannot
        // make every later autosave fail until the page is reloaded.
        const latest = await canonicalClient.getOmpSettings(saved.workspaceId);
        if (generation !== scopeGeneration.current) return AUTOSAVE_SAVED;
        savedRef.current = latest;
        setState(latest);
        applied = changes.filter(change => {
          const setting = latest.settings.find(candidate => candidate.id === change.id);
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
      const projected = projectSettings(next.settings);
      const nextValues = projected.values;
      const nextDrafts = projected.drafts;
      setForm(current => {
        const merged = { ...current };
        for (const change of applied) {
          if (JSON.stringify(current[change.id] ?? null) === JSON.stringify(change.value ?? null)) merged[change.id] = nextValues[change.id];
        }
        return merged;
      });
      setDrafts(current => {
        const merged = { ...current };
        for (const change of applied) {
          const setting = next.settings.find(candidate => candidate.id === change.id);
          if (setting && merged[change.id] === JSON.stringify(change.value, null, 2)) merged[change.id] = nextDrafts[change.id];
        }
        return merged;
      });
      return AUTOSAVE_SAVED;
    } catch (error) {
      return autosaveFailed(error instanceof Error ? error.message : t('settings.omp.saveFailed'));
    }
  }, [errors, form, loading, t]);

  const autosave = useAutosave(save);
  const onChange = React.useCallback((setting: OmpSetting, value: OmpSettingValue) => {
    setForm(current => ({ ...current, [setting.id]: value }));
  }, []);
  const onDraft = React.useCallback((setting: OmpSetting, text: string) => {
    setDrafts(current => ({ ...current, [setting.id]: text }));
    const parsed = parseDraft(setting, text);
    if (parsed.error) {
      setErrors(current => ({ ...current, [setting.id]: t('settings.omp.invalidJson') }));
      return;
    }
    setErrors(current => ({ ...current, [setting.id]: null }));
    setForm(current => ({ ...current, [setting.id]: parsed.value }));
  }, [t]);

  const groups = React.useMemo(() => {
    if (!state) return [];
    const map = new Map<string, OmpSetting[]>();
    const advanced: OmpSetting[] = [];
    for (const setting of state.settings) {
      if (setting.id === 'modelRoles') continue;
      if (setting.group === undefined) { advanced.push(setting); continue; }
      const list = map.get(setting.group);
      if (list) list.push(setting);
      else map.set(setting.group, [setting]);
    }
    // Config-file-only settings have no OMP panel group; keep them together at
    // the end so the labelled behaviour groups lead the page.
    if (advanced.length > 0) map.set(t('settings.omp.advanced'), advanced);
    return [...map.entries()];
  }, [state, t]);

  if (loading && !state) {
    return (
      <SettingsPageLayout title={t('settings.page.omp.title')} description={t('settings.page.omp.description')}>
        <div />
      </SettingsPageLayout>
    );
  }
  if (loadFailed || !state) {
    return (
      <SettingsPageLayout
        title={t('settings.page.omp.title')}
        description={t('settings.page.omp.description')}
        headerEnd={!directory ? undefined : <Button variant="outline" size="sm" onClick={() => setReload(value => value + 1)}>{t('settings.omp.retry')}</Button>}
      >
        <p className={SETTINGS_HELPER_CLASS}>{t('settings.omp.loadFailed')}</p>
      </SettingsPageLayout>
    );
  }

  const modelRolesSetting = state.settings.find(s => s.id === 'modelRoles');
  return (
    <SettingsPageLayout
      title={t('settings.page.omp.title')}
      description={t('settings.page.omp.description')}
      onBlurCapture={autosave.onBlurCapture}
    >
      {modelRolesSetting && (
        <ModelRolesSection
          setting={modelRolesSetting}
          form={form}
          models={models}
          disabled={loading}
          onChange={onChange}
          onImmediate={autosave.requestSave}
        />
      )}
      {groups.map(([title, settings], index) => (
        <Group
          key={title}
          title={title}
          settings={settings}
          form={form}
          drafts={drafts}
          errors={errors}
          disabled={loading}
          first={!modelRolesSetting && index === 0}
          onChange={onChange}
          onDraft={onDraft}
          onImmediate={autosave.requestSave}
        />
      ))}
    </SettingsPageLayout>
  );
};
