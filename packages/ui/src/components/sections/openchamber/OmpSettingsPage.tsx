import React from 'react';
import {
  type Model,
  type OmpSetting,
  type OmpSettingValue,
  type OmpSettingsChange,
  type OmpSettingsState,
} from '@openchamber/agent-contract';
import { CanonicalApiError, canonicalClient } from '@/api/canonicalClient';
import { z } from 'zod';
import { useSettingsDirectory } from '@/hooks/useSettingsDirectory';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SettingsCheckboxRow,
  SettingsChipGroup,
  SettingsFieldRow,
  SettingsSection,
  SettingsStackedField,
  SETTINGS_HELPER_CLASS,
  SETTINGS_DESCRIPTION_CLASS,
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
import { SortableTabsStrip, type SortableTabsStripItem } from '@/components/ui/sortable-tabs-strip';
import { Icon } from '@/components/icon/Icon';

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

function getGroupSlug(name?: string): string {
  if (!name) return 'general';
  const out: string[] = [];
  for (const ch of name.toLowerCase()) {
    if (ch >= 'a' && ch <= 'z' || ch >= '0' && ch <= '9') {
      out.push(ch);
    } else {
      if (out.length > 0 && out[out.length - 1] !== '_') {
        out.push('_');
      }
    }
  }
  return out.join('').replace(/^_+|_+$/g, '') || 'general';
}

function getSettingTab(id: string): string {
  if (
    id === 'modelRoles' ||
    id === 'modelPresets' ||
    id === 'cycleOrder' ||
    id === 'enabledModels' ||
    id === 'defaultThinkingLevel' ||
    id.startsWith('tier.') ||
    id.startsWith('thinkingBudgets.')
  ) {
    return 'model';
  }
  if (id.startsWith('retry.')) return 'providers';
  if (id.startsWith('compaction.')) return 'context';
  if (id.startsWith('recap.')) return 'interaction';
  if (
    id.startsWith('tools.') ||
    id === 'out.enabled' ||
    id === 'glob.enabled' ||
    id === 'grep.enabled' ||
    id === 'astGrep.enabled' ||
    id === 'astEdit.enabled' ||
    id === 'checkpoint.enabled' ||
    id.startsWith('async.')
  ) {
    return 'shellTools';
  }
  if (id.startsWith('lsp.')) return 'files';
  if (id.startsWith('tui.')) return 'appearance';
  if (
    id.startsWith('task.') ||
    id.startsWith('plan.') ||
    id.startsWith('skills.') ||
    id.startsWith('goal.')
  ) {
    return 'tasks';
  }
  if (
    id.startsWith('ask.') ||
    id === 'steeringMode' ||
    id === 'followUpMode' ||
    id === 'interruptMode' ||
    id.startsWith('composer.')
  ) {
    return 'interaction';
  }
  return 'model';
}

function getSettingGroup(id: string, defaultGroup?: string): string {
  if (defaultGroup) return defaultGroup;
  if (id === 'modelRoles' || id === 'modelPresets' || id === 'cycleOrder' || id === 'enabledModels') return 'Role Models';
  if (id.startsWith('thinkingBudgets.')) return 'Thinking';
  if (id.startsWith('retry.')) return 'Retry & Fallback';
  if (id.startsWith('compaction.')) return 'Compaction';
  if (id.startsWith('task.agent') || id === 'task.disabledAgents') return 'Subagents';
  if (id.startsWith('skills.')) return 'Commands & Skills';
  return 'General';
}

function getOptionSlug(value: unknown, label?: string): string {
  const str = String(label || value || '');
  const out: string[] = [];
  for (const ch of str.toLowerCase()) {
    if (ch >= 'a' && ch <= 'z' || ch >= '0' && ch <= '9') {
      out.push(ch);
    } else {
      if (out.length > 0 && out[out.length - 1] !== '_') {
        out.push('_');
      }
    }
  }
  return out.join('').replace(/^_+|_+$/g, '') || 'opt';
}

function checkModelThresholdKey(key: string): string | undefined {
  const star = key.indexOf('*');
  if (star !== -1 && star !== key.length - 1) return '`*` is only allowed as the last character';
  const slash = key.indexOf('/');
  if (slash <= 0 || slash === key.length - 1) return 'expected `provider/model-id` or a `provider/…*` prefix';
  return undefined;
}

// ---------------------------------------------------------------------------
// 1. Structured Editor: enabledModels
// ---------------------------------------------------------------------------
const EnabledModelsEditor: React.FC<{
  setting: OmpSetting;
  value: unknown;
  models: Model[];
  disabled?: boolean;
  onChange: (setting: OmpSetting, value: string[]) => void;
}> = ({ setting, value, models, disabled, onChange }) => {
  const { t } = useI18n();
  const current = Array.isArray(value) ? (value as string[]) : [];
  const [customPattern, setCustomPattern] = React.useState('');
  const [selectedCatalogModel, setSelectedCatalogModel] = React.useState('');

  const addPattern = (pattern: string) => {
    const trimmed = pattern.trim();
    if (!trimmed || current.includes(trimmed)) return;
    onChange(setting, [...current, trimmed]);
  };

  const removePattern = (index: number) => {
    const next = current.filter((_, i) => i !== index);
    onChange(setting, next);
  };

  return (
    <div className="space-y-3" data-settings-item={`omp.${setting.id}`}>
      <div className="flex flex-wrap items-center gap-1.5 min-h-8 p-2 rounded-md border bg-muted/20">
        {current.length === 0 ? (
          <span className="text-xs text-muted-foreground italic px-1">
            {t('settings.omp.enabledModels.allAllowed')}
          </span>
        ) : (
          current.map((pattern, index) => (
            <span
              key={`${pattern}-${index}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted border font-mono"
            >
              <span>{pattern}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePattern(index)}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                  aria-label={t('settings.omp.actions.remove')}
                >
                  <Icon name="close" className="size-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          {models.length > 0 && (
            <Select
              value={selectedCatalogModel}
              onValueChange={(val) => {
                if (val) {
                  addPattern(val);
                  setSelectedCatalogModel('');
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs max-w-xs">
                <SelectValue placeholder={t('settings.omp.enabledModels.addPattern')} />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => {
                  const selector = `${m.provider}/${m.modelId}`;
                  return (
                    <SelectItem key={selector} value={selector} className="text-xs">
                      {m.name || m.modelId} ({selector})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <Input
              value={customPattern}
              onChange={(e) => setCustomPattern(e.target.value)}
              placeholder={t('settings.omp.enabledModels.patternPlaceholder')}
              className="h-8 text-xs font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPattern(customPattern);
                  setCustomPattern('');
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                addPattern(customPattern);
                setCustomPattern('');
              }}
              disabled={!customPattern.trim()}
            >
              <Icon name="add" className="size-3.5 mr-1" />
              {t('settings.omp.actions.add')}
            </Button>
          </div>

          {current.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange(setting, [])}
            >
              <Icon name="refresh" className="size-3.5 mr-1" />
              {t('settings.omp.actions.reset')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. Structured Editor: modelPresets
// ---------------------------------------------------------------------------
type ModelPresetEntry = {
  modelRoles: Record<string, string>;
  defaultThinkingLevel?: string;
};

const ModelPresetsEditor: React.FC<{
  setting: OmpSetting;
  value: unknown;
  models: Model[];
  disabled?: boolean;
  onChange: (setting: OmpSetting, value: Record<string, ModelPresetEntry>) => void;
}> = ({ setting, value, models, disabled, onChange }) => {
  const { t } = useI18n();
  const presets: Record<string, ModelPresetEntry> = React.useMemo(() => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const res: Record<string, ModelPresetEntry> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const raw = v as { modelRoles?: unknown; defaultThinkingLevel?: unknown };
        const rawRoles = raw.modelRoles;
        const safeRoles: Record<string, string> = {};
        if (rawRoles && typeof rawRoles === 'object' && !Array.isArray(rawRoles)) {
          for (const [rk, rv] of Object.entries(rawRoles)) {
            if (typeof rv === 'string') safeRoles[rk] = rv;
          }
        }
        res[k] = {
          modelRoles: safeRoles,
          defaultThinkingLevel: typeof raw.defaultThinkingLevel === 'string' ? raw.defaultThinkingLevel : undefined,
        };
      }
    }
    return res;
  }, [value]);

  const [newPresetName, setNewPresetName] = React.useState('');
  const [newPresetModel, setNewPresetModel] = React.useState('');
  const [newPresetEffort, setNewPresetEffort] = React.useState('default');
  const [nameError, setNameError] = React.useState<string | null>(null);

  const addPreset = () => {
    const trimmed = newPresetName.trim();
    if (!/^[a-zA-Z][\w-]*$/.test(trimmed)) {
      setNameError(t('settings.omp.modelPresets.invalidName'));
      return;
    }
    setNameError(null);
    const effort = newPresetEffort === 'default' ? undefined : newPresetEffort;
    const next: Record<string, ModelPresetEntry> = {
      ...presets,
      [trimmed]: {
        modelRoles: newPresetModel.trim() ? { default: newPresetModel.trim() } : {},
        defaultThinkingLevel: effort,
      },
    };
    onChange(setting, next);
    setNewPresetName('');
    setNewPresetModel('');
    setNewPresetEffort('default');
  };

  const removePreset = (name: string) => {
    const next = { ...presets };
    delete next[name];
    onChange(setting, next);
  };

  const updatePreset = (name: string, updated: ModelPresetEntry) => {
    onChange(setting, { ...presets, [name]: updated });
  };

  return (
    <div className="space-y-4" data-settings-item={`omp.${setting.id}`}>
      {Object.keys(presets).length === 0 ? (
        <div className="p-3 text-xs text-muted-foreground border rounded-md border-dashed">
          {t('settings.omp.modelPresets.noPresets')}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(presets).map(([name, preset]) => {
            const defaultModel = preset.modelRoles.default || '';
            const effort = preset.defaultThinkingLevel || 'default';

            return (
              <div key={name} className="p-3 rounded-lg border bg-card space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs font-mono">{name}</span>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => removePreset(name)}
                      aria-label={t('settings.omp.actions.remove')}
                    >
                      <Icon name="delete-bin" className="size-3 mr-1" />
                      {t('settings.omp.actions.remove')}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      {t('settings.omp.modelPresets.model')} (default)
                    </label>
                    <Select
                      value={defaultModel}
                      onValueChange={(val) => {
                        updatePreset(name, {
                          ...preset,
                          modelRoles: { ...preset.modelRoles, default: val },
                        });
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => {
                          const selector = `${m.provider}/${m.modelId}`;
                          return (
                            <SelectItem key={selector} value={selector} className="text-xs">
                              {m.name || m.modelId} ({selector})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      {t('settings.omp.modelPresets.thinking')}
                    </label>
                    <Select
                      value={effort}
                      onValueChange={(val) => {
                        updatePreset(name, {
                          ...preset,
                          defaultThinkingLevel: val === 'default' ? undefined : val,
                        });
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default" className="text-xs">
                          {t('settings.omp.modelRoles.thinkingDefault')}
                        </SelectItem>
                        <SelectItem value="auto" className="text-xs">Auto</SelectItem>
                        {DEFAULT_EFFORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {t(opt.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!disabled && (
        <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
          <div className="text-xs font-medium">{t('settings.omp.modelPresets.addPreset')}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              value={newPresetName}
              onChange={(e) => {
                setNewPresetName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder={t('settings.omp.modelPresets.newPreset')}
              className="h-8 text-xs font-mono"
            />
            <Select value={newPresetModel} onValueChange={setNewPresetModel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t('settings.omp.modelPresets.model')} />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => {
                  const selector = `${m.provider}/${m.modelId}`;
                  return (
                    <SelectItem key={selector} value={selector} className="text-xs">
                      {m.name || m.modelId} ({selector})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Select value={newPresetEffort} onValueChange={setNewPresetEffort}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-xs">
                    {t('settings.omp.modelRoles.thinkingDefault')}
                  </SelectItem>
                  <SelectItem value="auto" className="text-xs">Auto</SelectItem>
                  {DEFAULT_EFFORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={addPreset}
                disabled={!newPresetName.trim()}
              >
                <Icon name="add" className="size-3.5 mr-1" />
                {t('settings.omp.actions.add')}
              </Button>
            </div>
          </div>
          {nameError && <p className="text-[11px] text-destructive">{nameError}</p>}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. Structured Editor: retry.fallbackChains
// ---------------------------------------------------------------------------
const RetryFallbackChainsEditor: React.FC<{
  setting: OmpSetting;
  value: unknown;
  models: Model[];
  disabled?: boolean;
  onChange: (setting: OmpSetting, value: Record<string, string[]>) => void;
}> = ({ setting, value, models, disabled, onChange }) => {
  const { t } = useI18n();
  const chains: Record<string, string[]> = React.useMemo(() => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const res: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(value)) {
      if (Array.isArray(v)) {
        res[k] = v.filter((item): item is string => typeof item === 'string');
      }
    }
    return res;
  }, [value]);

  const [newChainKey, setNewChainKey] = React.useState('');
  const [modelInputs, setModelInputs] = React.useState<Record<string, string>>({});

  const addChain = () => {
    const trimmed = newChainKey.trim();
    if (!trimmed || Object.hasOwn(chains, trimmed)) return;
    onChange(setting, { ...chains, [trimmed]: [] });
    setNewChainKey('');
  };

  const removeChain = (key: string) => {
    const next = { ...chains };
    delete next[key];
    onChange(setting, next);
  };

  const addModelToChain = (chainKey: string, modelStr: string) => {
    const trimmed = modelStr.trim();
    if (!trimmed) return;
    const current = chains[chainKey] || [];
    onChange(setting, { ...chains, [chainKey]: [...current, trimmed] });
    setModelInputs((prev) => ({ ...prev, [chainKey]: '' }));
  };

  const removeModelFromChain = (chainKey: string, index: number) => {
    const current = chains[chainKey] || [];
    onChange(setting, {
      ...chains,
      [chainKey]: current.filter((_, i) => i !== index),
    });
  };

  const moveModelInChain = (chainKey: string, fromIndex: number, toIndex: number) => {
    const current = chains[chainKey] || [];
    if (toIndex < 0 || toIndex >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(setting, { ...chains, [chainKey]: next });
  };

  return (
    <div className="space-y-4" data-settings-item={`omp.${setting.id}`}>
      {Object.keys(chains).length === 0 ? (
        <div className="p-3 text-xs text-muted-foreground border rounded-md border-dashed">
          {t('settings.omp.fallbackChains.noChains')}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(chains).map(([key, chain]) => (
            <div key={key} className="p-3 rounded-lg border bg-card space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs font-mono">{key}</span>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-destructive hover:bg-destructive/10 text-xs"
                    onClick={() => removeChain(key)}
                  >
                    <Icon name="delete-bin" className="size-3 mr-1" />
                    {t('settings.omp.actions.remove')}
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                {chain.map((m, idx) => (
                  <div
                    key={`${m}-${idx}`}
                    className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/40 font-mono"
                  >
                    <span className="truncate">
                      {idx + 1}. {m}
                    </span>
                    {!disabled && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-6 p-0"
                          disabled={idx === 0}
                          onClick={() => moveModelInChain(key, idx, idx - 1)}
                          aria-label={t('settings.omp.actions.moveUp')}
                        >
                          <Icon name="arrow-up-s" className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-6 p-0"
                          disabled={idx === chain.length - 1}
                          onClick={() => moveModelInChain(key, idx, idx + 1)}
                          aria-label={t('settings.omp.actions.moveDown')}
                        >
                          <Icon name="arrow-down-s" className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => removeModelFromChain(key, idx)}
                          aria-label={t('settings.omp.actions.remove')}
                        >
                          <Icon name="close" className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!disabled && (
                <div className="flex items-center gap-2 pt-1">
                  <Select
                    value={modelInputs[key] || ''}
                    onValueChange={(val) => {
                      if (val) addModelToChain(key, val);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue placeholder={t('settings.omp.fallbackChains.addModel')} />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => {
                        const selector = `${m.provider}/${m.modelId}`;
                        return (
                          <SelectItem key={selector} value={selector} className="text-xs">
                            {m.name || m.modelId} ({selector})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            value={newChainKey}
            onChange={(e) => setNewChainKey(e.target.value)}
            placeholder={t('settings.omp.fallbackChains.newRoleOrPattern')}
            className="h-8 text-xs font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addChain();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={addChain}
            disabled={!newChainKey.trim()}
          >
            <Icon name="add" className="size-3.5 mr-1" />
            {t('settings.omp.fallbackChains.addChain')}
          </Button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. Structured Editor: retry.fallbackOn
// Note: In OMP registry, retry.fallbackOn is strictly an ENUM ('any' | 'usage-limit' | 'except-usage-limit').
// We render it with SettingsChipGroup in single-select mode to preserve the enum wire format.
// ---------------------------------------------------------------------------
const RetryFallbackOnChipGroup: React.FC<{
  setting: OmpSetting;
  value: unknown;
  disabled?: boolean;
  onChange: (setting: OmpSetting, value: string) => void;
}> = ({ setting, value, disabled, onChange }) => {
  const { t } = useI18n();
  const current = typeof value === 'string' ? value : 'any';

  const options = React.useMemo(() => [
    { value: 'any', label: t('settings.omp.items.retry.fallbackOn.options.any' as I18nKey) },
    { value: 'usage-limit', label: t('settings.omp.items.retry.fallbackOn.options.usage-limit' as I18nKey) },
    { value: 'except-usage-limit', label: t('settings.omp.items.retry.fallbackOn.options.except-usage-limit' as I18nKey) },
  ], [t]);

  return (
    <div data-settings-item={`omp.${setting.id}`}>
      <SettingsChipGroup<string>
        value={current}
        options={options}
        onChange={(val) => {
          if (!disabled) onChange(setting, val);
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// 5. Structured Editor: compaction.methodOrder
// ---------------------------------------------------------------------------
const DEFAULT_METHOD_ORDER = ['remote', 'snapcompact', 'handoff', 'shake', 'soft'];

const CompactionMethodOrderEditor: React.FC<{
  setting: OmpSetting;
  value: unknown;
  disabled?: boolean;
  onChange: (setting: OmpSetting, value: string[]) => void;
}> = ({ setting, value, disabled, onChange }) => {
  const { t } = useI18n();
  const current: string[] = React.useMemo(() => {
    if (Array.isArray(value)) return value as string[];
    return DEFAULT_METHOD_ORDER;
  }, [value]);

  const move = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(setting, next);
  };

  const getMethodLabel = (method: string) => {
    const key = `settings.omp.methodOrder.${method}` as I18nKey;
    const res = t(key);
    return res !== key ? res : method;
  };

  return (
    <div className="space-y-3" data-settings-item={`omp.${setting.id}`}>
      <p className="text-xs text-muted-foreground">{t('settings.omp.methodOrder.hint')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {current.map((method, idx) => (
          <div
            key={method}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-card text-xs"
          >
            <span className="font-medium text-muted-foreground">{idx + 1}.</span>
            <span>{getMethodLabel(method)}</span>
            {!disabled && (
              <div className="flex items-center gap-0.5 ml-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-5 p-0"
                  disabled={idx === 0}
                  onClick={() => move(idx, idx - 1)}
                  aria-label={t('settings.omp.actions.moveUp')}
                >
                  <Icon name="arrow-left-s" className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-5 p-0"
                  disabled={idx === current.length - 1}
                  onClick={() => move(idx, idx + 1)}
                  aria-label={t('settings.omp.actions.moveDown')}
                >
                  <Icon name="arrow-right-s" className="size-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(setting, DEFAULT_METHOD_ORDER)}
        >
          <Icon name="refresh" className="size-3 mr-1" />
          {t('settings.omp.actions.reset')}
        </Button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 6. Structured Editor: compaction.modelThresholds
// ---------------------------------------------------------------------------
const CompactionModelThresholdsEditor: React.FC<{
  setting: OmpSetting;
  value: unknown;
  models: Model[];
  disabled?: boolean;
  onChange: (setting: OmpSetting, value: Record<string, number>) => void;
}> = ({ setting, value, models, disabled, onChange }) => {
  const { t } = useI18n();
  const thresholds: Record<string, number> = React.useMemo(() => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const res: Record<string, number> = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'number' && Number.isSafeInteger(v) && v > 0) {
        res[k] = v;
      }
    }
    return res;
  }, [value]);

  const [newPattern, setNewPattern] = React.useState('');
  const [newTokens, setNewTokens] = React.useState<number | undefined>(90000);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const addThreshold = () => {
    const trimmed = newPattern.trim();
    const keyErr = checkModelThresholdKey(trimmed);
    if (keyErr) {
      setErrorMsg(t('settings.omp.modelThresholds.invalidKey'));
      return;
    }
    if (!newTokens || !Number.isSafeInteger(newTokens) || newTokens <= 0) {
      setErrorMsg(t('settings.omp.modelThresholds.invalidTokens'));
      return;
    }
    setErrorMsg(null);
    onChange(setting, { ...thresholds, [trimmed]: newTokens });
    setNewPattern('');
    setNewTokens(90000);
  };

  const removeThreshold = (key: string) => {
    const next = { ...thresholds };
    delete next[key];
    onChange(setting, next);
  };

  return (
    <div className="space-y-4" data-settings-item={`omp.${setting.id}`}>
      {Object.keys(thresholds).length === 0 ? (
        <div className="p-3 text-xs text-muted-foreground border rounded-md border-dashed">
          {t('settings.omp.modelThresholds.noThresholds')}
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(thresholds).map(([pat, tokens]) => (
            <div
              key={pat}
              className="flex items-center justify-between p-2.5 rounded border bg-card text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{pat}</span>
                <span className="text-muted-foreground">→</span>
                <span>{tokens.toLocaleString()} tokens</span>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeThreshold(pat)}
                  aria-label={t('settings.omp.actions.remove')}
                >
                  <Icon name="close" className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
          <div className="flex flex-wrap items-center gap-2">
            {models.length > 0 && (
              <Select
                value={newPattern}
                onValueChange={(val) => {
                  setNewPattern(val);
                  if (errorMsg) setErrorMsg(null);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[160px]">
                  <SelectValue placeholder="Pick model..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => {
                    const selector = `${m.provider}/${m.modelId}`;
                    return (
                      <SelectItem key={selector} value={selector} className="text-xs">
                        {selector}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            <Input
              value={newPattern}
              onChange={(e) => {
                setNewPattern(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={t('settings.omp.modelThresholds.newPattern')}
              className="h-8 text-xs font-mono flex-1 min-w-[180px]"
            />

            <div className="w-28">
              <NumberInput
                value={newTokens}
                onValueChange={(val: number) => setNewTokens(val)}
                min={1}
                step={1000}
                placeholder={t('settings.omp.modelThresholds.tokenThreshold')}
                className={SETTINGS_NUMBER_INPUT_CLASS}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={addThreshold}
              disabled={!newPattern.trim()}
            >
              <Icon name="add" className="size-3.5 mr-1" />
              {t('settings.omp.modelThresholds.addThreshold')}
            </Button>
          </div>
          {errorMsg && <p className="text-[11px] text-destructive">{errorMsg}</p>}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 7. Structured Editor: Remaining String Arrays
// ---------------------------------------------------------------------------
const StringArrayField: React.FC<{
  setting: OmpSetting;
  value: unknown;
  disabled?: boolean;
  onChange: (setting: OmpSetting, value: string[]) => void;
}> = ({ setting, value, disabled, onChange }) => {
  const { t } = useI18n();
  const current = Array.isArray(value) ? (value as string[]) : [];
  const [newItem, setNewItem] = React.useState('');

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed || current.includes(trimmed)) return;
    onChange(setting, [...current, trimmed]);
    setNewItem('');
  };

  const removeItem = (index: number) => {
    onChange(setting, current.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3" data-settings-item={`omp.${setting.id}`}>
      <div className="flex flex-wrap items-center gap-1.5 min-h-8 p-2 rounded-md border bg-muted/20">
        {current.length === 0 ? (
          <span className="text-xs text-muted-foreground italic px-1">
            {t('settings.omp.stringArray.noItems')}
          </span>
        ) : (
          current.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted border font-mono"
            >
              <span>{item}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                  aria-label={t('settings.omp.actions.remove')}
                >
                  <Icon name="close" className="size-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={t('settings.omp.stringArray.addItem')}
            className="h-8 text-xs font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={addItem}
            disabled={!newItem.trim()}
          >
            <Icon name="add" className="size-3.5 mr-1" />
            {t('settings.omp.actions.add')}
          </Button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 8. Structured Editor: Remaining String Records
// ---------------------------------------------------------------------------
const StringRecordField: React.FC<{
  setting: OmpSetting;
  value: unknown;
  disabled?: boolean;
  onChange: (setting: OmpSetting, value: Record<string, string>) => void;
}> = ({ setting, value, disabled, onChange }) => {
  const { t } = useI18n();
  const record: Record<string, string> = React.useMemo(() => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const res: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string') res[k] = v;
      else if (v !== null && v !== undefined) res[k] = String(v);
    }
    return res;
  }, [value]);

  const [newKey, setNewKey] = React.useState('');
  const [newVal, setNewVal] = React.useState('');

  const addEntry = () => {
    const k = newKey.trim();
    if (!k) return;
    onChange(setting, { ...record, [k]: newVal.trim() });
    setNewKey('');
    setNewVal('');
  };

  const removeEntry = (key: string) => {
    const next = { ...record };
    delete next[key];
    onChange(setting, next);
  };

  return (
    <div className="space-y-3" data-settings-item={`omp.${setting.id}`}>
      {Object.keys(record).length === 0 ? (
        <div className="p-3 text-xs text-muted-foreground border rounded-md border-dashed">
          {t('settings.omp.stringRecord.noEntries')}
        </div>
      ) : (
        <div className="space-y-1.5">
          {Object.entries(record).map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between p-2 rounded border bg-card text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">{k}:</span>
                <span>{v}</span>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeEntry(k)}
                  aria-label={t('settings.omp.actions.remove')}
                >
                  <Icon name="close" className="size-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={t('settings.omp.stringRecord.keyPlaceholder')}
            className="h-8 text-xs font-mono flex-1"
          />
          <Input
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            placeholder={t('settings.omp.stringRecord.valuePlaceholder')}
            className="h-8 text-xs font-mono flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEntry();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={addEntry}
            disabled={!newKey.trim()}
          >
            <Icon name="add" className="size-3.5 mr-1" />
            {t('settings.omp.actions.add')}
          </Button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dedicated Section: Model Roles
// ---------------------------------------------------------------------------
const ModelRolesSection: React.FC<{
  setting: OmpSetting;
  value: unknown;
  models: Model[];
  disabled?: boolean;
  onImmediate: (setting: OmpSetting, value: OmpSettingValue) => void;
}> = ({ setting, value, models, disabled, onImmediate }) => {
  const { t } = useI18n();
  const currentRoles = React.useMemo(() => parseSafeRolesRecord(value), [value]);

  const updateRole = (roleId: string, model: string, effort: string) => {
    const next = { ...currentRoles };
    const formatted = formatRoleSelector(model, effort);
    if (!formatted) {
      delete next[roleId];
    } else {
      next[roleId] = formatted;
    }
    onImmediate(setting, next);
  };

  return (
    <SettingsSection
      title={t('settings.omp.modelRoles.title')}
      settingsItem="omp.modelRoles"
      divider={false}
    >
      <p className={`${SETTINGS_DESCRIPTION_CLASS} -mt-2 mb-4`}>
        {t('settings.omp.modelRoles.description')}
      </p>

      <div className="space-y-4">
        {OMP_MODEL_ROLES.map((role) => {
          const rawSelector = currentRoles[role.id];
          const isExplicit = typeof rawSelector === 'string' && rawSelector.trim().length > 0;
          const parsed = parseRoleSelector(rawSelector);
          const fallback = resolveRoleFallback(role.id, currentRoles);

          const i18n = ROLE_I18N[role.id];
          const roleLabel = i18n ? t(i18n.label) : role.id;
          const roleDesc = i18n ? t(i18n.desc) : undefined;

          const matchedModel = models.find((m) => `${m.provider}/${m.modelId}` === parsed.model);
          const supportsReasoning = matchedModel?.reasoningEffortSupported ?? false;
          const reasoningOptions = matchedModel?.reasoningOptions ?? [];

          return (
            <div
              key={role.id}
              data-settings-item={`omp.modelRoles.${role.id}`}
              className="p-3.5 rounded-lg border bg-card/60 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{roleLabel}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-muted text-muted-foreground border">
                    {role.tag}
                  </span>
                </div>

                {!isExplicit && fallback && (
                  <span className="text-xs text-muted-foreground">
                    {fallback.model
                      ? t('settings.omp.modelRoles.fallbackToWithModel', { role: fallback.role, model: fallback.model })
                      : t('settings.omp.modelRoles.fallbackTo', { role: fallback.role })}
                  </span>
                )}
              </div>

              {roleDesc && <p className="text-xs text-muted-foreground">{roleDesc}</p>}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex-1 min-w-[200px]">
                  <Select
                    value={isExplicit ? parsed.model : '__fallback__'}
                    onValueChange={(val) => {
                      if (val === '__fallback__') {
                        updateRole(role.id, '', '');
                      } else {
                        updateRole(role.id, val, parsed.effort);
                      }
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger
                      className={SETTINGS_SELECT_ROW_TRIGGER_CLASS}
                      aria-label={t('settings.omp.modelRoles.modelAria', { role: roleLabel })}
                    >
                      <SelectValue placeholder={t('settings.omp.modelRoles.inheritFallback')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__fallback__" className="text-xs italic">
                        {t('settings.omp.modelRoles.inheritFallback')}
                      </SelectItem>
                      {models.map((m) => {
                        const selector = `${m.provider}/${m.modelId}`;
                        return (
                          <SelectItem key={selector} value={selector} className="text-xs">
                            {m.name || m.modelId} ({selector})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {isExplicit && supportsReasoning && (
                  <div className="w-[160px]">
                    <Select
                      value={parsed.effort || '__default__'}
                      onValueChange={(val) => {
                        updateRole(role.id, parsed.model, val === '__default__' ? '' : val);
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        className={SETTINGS_SELECT_ROW_TRIGGER_CLASS}
                        aria-label={t('settings.omp.modelRoles.effortAria', { role: roleLabel })}
                      >
                        <SelectValue placeholder={t('settings.omp.modelRoles.thinkingDefault')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__" className="text-xs italic">
                          {t('settings.omp.modelRoles.thinkingDefault')}
                        </SelectItem>
                        {reasoningOptions.length > 0
                          ? reasoningOptions.map((opt) => (
                            <SelectItem key={opt.reasoningEffort} value={opt.reasoningEffort} className="text-xs">
                              {opt.label || opt.reasoningEffort}
                            </SelectItem>
                          ))
                          : DEFAULT_EFFORT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {t(opt.labelKey)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SettingsSection>
  );
};

// ---------------------------------------------------------------------------
// Render Individual Generic or Structured Setting Row
// ---------------------------------------------------------------------------
const SettingItemRenderer: React.FC<{
  setting: OmpSetting;
  form: Values;
  models: Model[];
  disabled?: boolean;
  onChange: (setting: OmpSetting, value: OmpSettingValue) => void;
  onImmediate: (setting: OmpSetting, value: OmpSettingValue) => void;
}> = ({ setting, form, models, disabled, onChange, onImmediate }) => {
  const { t } = useI18n();

  // Localized label and description
  const labelKey = `settings.omp.items.${setting.id}.label` as I18nKey;
  const descKey = `settings.omp.items.${setting.id}.description` as I18nKey;
  const translatedLabel = t(labelKey);
  const label = translatedLabel !== labelKey ? translatedLabel : (setting.label ?? setting.id);
  const translatedDesc = t(descKey);
  const info = translatedDesc !== descKey ? translatedDesc : setting.description;

  const value = form[setting.id] !== undefined ? form[setting.id] : setting.value;

  // 1. enabledModels
  if (setting.id === 'enabledModels') {
    return (
      <SettingsStackedField
        key={setting.id}
        label={label}
        info={info}
        settingsItem={`omp.${setting.id}`}
        controlClassName="max-w-none flex-col items-stretch"
      >
        <EnabledModelsEditor
          setting={setting}
          value={value}
          models={models}
          disabled={disabled}
          onChange={(s, val) => onImmediate(s, val)}
        />
      </SettingsStackedField>
    );
  }

  // 2. modelPresets
  if (setting.id === 'modelPresets') {
    return (
      <SettingsStackedField
        key={setting.id}
        label={label}
        info={info}
        settingsItem={`omp.${setting.id}`}
        controlClassName="max-w-none flex-col items-stretch"
      >
        <ModelPresetsEditor
          setting={setting}
          value={value}
          models={models}
          disabled={disabled}
          onChange={(s, val) => onImmediate(s, val)}
        />
      </SettingsStackedField>
    );
  }

  // 3. retry.fallbackChains
  if (setting.id === 'retry.fallbackChains') {
    return (
      <SettingsStackedField
        key={setting.id}
        label={label}
        info={info}
        settingsItem={`omp.${setting.id}`}
        controlClassName="max-w-none flex-col items-stretch"
      >
        <RetryFallbackChainsEditor
          setting={setting}
          value={value}
          models={models}
          disabled={disabled}
          onChange={(s, val) => onImmediate(s, val)}
        />
      </SettingsStackedField>
    );
  }

  // 4. retry.fallbackOn
  if (setting.id === 'retry.fallbackOn') {
    return (
      <SettingsFieldRow
        key={setting.id}
        label={label}
        info={info}
        settingsItem={`omp.${setting.id}`}
      >
        <RetryFallbackOnChipGroup
          setting={setting}
          value={value}
          disabled={disabled}
          onChange={(s, val) => onImmediate(s, val)}
        />
      </SettingsFieldRow>
    );
  }

  // 5. compaction.methodOrder
  if (setting.id === 'compaction.methodOrder') {
    return (
      <SettingsStackedField
        key={setting.id}
        label={label}
        info={info}
        settingsItem={`omp.${setting.id}`}
        controlClassName="max-w-none flex-col items-stretch"
      >
        <CompactionMethodOrderEditor
          setting={setting}
          value={value}
          disabled={disabled}
          onChange={(s, val) => onImmediate(s, val)}
        />
      </SettingsStackedField>
    );
  }

  // 6. compaction.modelThresholds
  if (setting.id === 'compaction.modelThresholds') {
    return (
      <SettingsStackedField
        key={setting.id}
        label={label}
        info={info}
        settingsItem={`omp.${setting.id}`}
        controlClassName="max-w-none flex-col items-stretch"
      >
        <CompactionModelThresholdsEditor
          setting={setting}
          value={value}
          models={models}
          disabled={disabled}
          onChange={(s, val) => onImmediate(s, val)}
        />
      </SettingsStackedField>
    );
  }

  // 7. Boolean
  if (setting.type === 'boolean') {
    return (
      <SettingsCheckboxRow
        key={setting.id}
        label={label}
        info={info}
        checked={typeof value === 'boolean' ? value : false}
        onChange={(checked: boolean) => onImmediate(setting, checked)}
        disabled={disabled}
        settingsItem={`omp.${setting.id}`}
      />
    );
  }

  // 8. Number
  if (setting.type === 'number') {
    if (setting.options && setting.options.length > 0) {
      const selectedValue = value === null || value === undefined ? '__default__' : String(value);
      return (
        <SettingsFieldRow key={setting.id} label={label} info={info} settingsItem={`omp.${setting.id}`}>
          <Select
            value={selectedValue}
            onValueChange={(val) => {
              if (val === '__default__') onImmediate(setting, null);
              else onImmediate(setting, Number(val));
            }}
            disabled={disabled}
          >
            <SelectTrigger className={SETTINGS_SELECT_ROW_TRIGGER_CLASS} aria-label={label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setting.options.map((opt) => {
                const optKey = `settings.omp.items.${setting.id}.options.${getOptionSlug(opt.value, opt.label)}` as I18nKey;
                const trOpt = t(optKey);
                const optLabel = trOpt !== optKey ? trOpt : (opt.label ?? String(opt.value));
                return (
                  <SelectItem key={String(opt.value)} value={String(opt.value)} className="text-xs">
                    {optLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </SettingsFieldRow>
      );
    }

    return (
      <SettingsFieldRow key={setting.id} label={label} info={info} settingsItem={`omp.${setting.id}`}>
        <div className="w-32">
          <NumberInput
            value={typeof value === 'number' ? value : undefined}
            onValueChange={(val: number) => onImmediate(setting, val)}
            onClear={() => onImmediate(setting, null)}
            disabled={disabled}
            className={SETTINGS_NUMBER_INPUT_CLASS}
            aria-label={label}
          />
        </div>
      </SettingsFieldRow>
    );
  }

  // 9. Enum
  if (setting.type === 'enum') {
    const rawChoices = setting.options || (setting.enumValues || []).map((v) => ({ value: v, label: v }));
    const selected = value === null || value === undefined ? '__default__' : String(value);

    return (
      <SettingsFieldRow key={setting.id} label={label} info={info} settingsItem={`omp.${setting.id}`}>
        <Select
          value={selected}
          onValueChange={(val) => {
            if (val === '__default__') onImmediate(setting, null);
            else onImmediate(setting, val);
          }}
          disabled={disabled}
        >
          <SelectTrigger className={SETTINGS_SELECT_ROW_TRIGGER_CLASS} aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rawChoices.map((opt) => {
              const optKey = `settings.omp.items.${setting.id}.options.${getOptionSlug(opt.value, opt.label)}` as I18nKey;
              const trOpt = t(optKey);
              const optLabel = trOpt !== optKey ? trOpt : (opt.label ?? String(opt.value));
              return (
                <SelectItem key={String(opt.value)} value={String(opt.value)} className="text-xs">
                  {optLabel}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </SettingsFieldRow>
    );
  }

  // 10. cycleOrder (string array, input row matching existing tests)
  if (setting.id === 'cycleOrder') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <SettingsFieldRow key={setting.id} label={label} info={info} settingsItem={`omp.${setting.id}`}>
        <Input
          value={arr.join(', ')}
          onChange={(e) => {
            const parsed = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            onChange(setting, parsed);
          }}
          disabled={disabled}
          placeholder="smol, default, slow"
          className="h-8 text-xs font-mono max-w-sm"
          aria-label={label}
        />
      </SettingsFieldRow>
    );
  }

  // 11. Remaining Arrays
  if (setting.type === 'array') {
    return (
      <SettingsStackedField
        key={setting.id}
        label={label}
        info={info}
        settingsItem={`omp.${setting.id}`}
        controlClassName="max-w-none flex-col items-stretch"
      >
        <StringArrayField
          setting={setting}
          value={value}
          disabled={disabled}
          onChange={(s, val) => onImmediate(s, val)}
        />
      </SettingsStackedField>
    );
  }

  // 12. Remaining Records
  if (setting.type === 'record') {
    return (
      <SettingsStackedField
        key={setting.id}
        label={label}
        info={info}
        settingsItem={`omp.${setting.id}`}
        controlClassName="max-w-none flex-col items-stretch"
      >
        <StringRecordField
          setting={setting}
          value={value}
          disabled={disabled}
          onChange={(s, val) => onImmediate(s, val)}
        />
      </SettingsStackedField>
    );
  }

  // String / Fallback (Input)
  return (
    <SettingsFieldRow key={setting.id} label={label} info={info} settingsItem={`omp.${setting.id}`}>
      <Input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(setting, e.target.value)}
        disabled={disabled}
        className="h-8 text-xs font-mono max-w-sm"
        aria-label={label}
      />
    </SettingsFieldRow>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const OmpSettingsPage: React.FC = () => {
  const { t } = useI18n();
  const directory = useSettingsDirectory();
  const [state, setState] = React.useState<OmpSettingsState | null>(null);
  const [form, setForm] = React.useState<Values>({});
  const [loading, setLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [reload, setReload] = React.useState(0);
  const [models, setModels] = React.useState<Model[]>([]);
  const [activeTab, setActiveTab] = React.useState<string>('model');
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
        const [snapshot, modelCatalog] = await Promise.all([
          canonicalClient.getOmpSettings(workspace.workspaceId, abort.signal),
          canonicalClient.getModels(workspace.workspaceId).catch(() => null),
        ]);
        if (abort.signal.aborted || generation !== scopeGeneration.current) return;
        savedRef.current = snapshot;
        setState(snapshot);
        if (modelCatalog?.models) setModels(modelCatalog.models);

        const initialValues: Values = {};
        for (const s of snapshot.settings) {
          initialValues[s.id] = s.value;
        }
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
      for (const s of next.settings) {
        nextValues[s.id] = s.value;
      }

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

  const onImmediate = React.useCallback(
    (setting: OmpSetting, value: OmpSettingValue) => {
      setForm((current) => ({ ...current, [setting.id]: value }));
      autosave.requestSave();
    },
    [autosave]
  );

  // Group settings by tab and group
  const { settingsByTab } = React.useMemo(() => {
    if (!state) return { settingsByTab: {} };

    const byTab: Record<string, Record<string, OmpSetting[]>> = {
      appearance: {},
      model: {},
      interaction: {},
      context: {},
      memory: {},
      files: {},
      shellTools: {},
      tasks: {},
      providers: {},
    };

    for (const setting of state.settings) {
      const tabId = getSettingTab(setting.id);
      const groupName = getSettingGroup(setting.id, setting.group);
      if (!byTab[tabId]) byTab[tabId] = {};
      if (!byTab[tabId][groupName]) byTab[tabId][groupName] = [];
      byTab[tabId][groupName].push(setting);
    }

    return { settingsByTab: byTab };
  }, [state]);

  // Tab items for SortableTabsStrip
  const tabItems: SortableTabsStripItem[] = React.useMemo(() => [
    { id: 'appearance', label: t('settings.omp.tab.appearance.label') },
    { id: 'model', label: t('settings.omp.tab.model.label') },
    { id: 'interaction', label: t('settings.omp.tab.interaction.label') },
    { id: 'context', label: t('settings.omp.tab.context.label') },
    { id: 'memory', label: t('settings.omp.tab.memory.label') },
    { id: 'files', label: t('settings.omp.tab.files.label') },
    { id: 'shellTools', label: t('settings.omp.tab.shellTools.label') },
    { id: 'tasks', label: t('settings.omp.tab.tasks.label') },
    { id: 'providers', label: t('settings.omp.tab.providers.label') },
  ], [t]);

  // Ensure activeTab is valid: if current activeTab has no settings, select first populated tab
  React.useEffect(() => {
    if (!state || state.settings.length === 0) return;
    const tabHasSettings = (tid: string) => {
      const groups = settingsByTab[tid];
      return groups && Object.values(groups).some((arr) => arr.length > 0);
    };
    if (!tabHasSettings(activeTab) && activeTab !== 'memory') {
      const firstWithSettings = tabItems.find((ti) => tabHasSettings(ti.id))?.id;
      if (firstWithSettings) {
        setActiveTab(firstWithSettings);
      }
    }
  }, [state, activeTab, settingsByTab, tabItems]);

  const modelRolesSetting = state?.settings.find((s) => s.id === 'modelRoles');

  if (loading && !state) {
    return (
      <SettingsPageLayout title={t('settings.page.omp.title')} description={t('settings.page.omp.description')}>
        <div className="py-8 text-center text-sm text-muted-foreground">...</div>
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

  return (
    <SettingsPageLayout
      title={t('settings.page.omp.title')}
      description={t('settings.page.omp.description')}
      onBlurCapture={autosave.onBlurCapture}
    >
      {state ? (
        <div className="space-y-6">
          <div className="h-8 mb-6">
            <SortableTabsStrip
              items={tabItems}
              activeId={activeTab}
              onSelect={setActiveTab}
              pillSize="form"
              variant="active-pill"
              layoutMode="scrollable"
            />
          </div>

          {/* Render all tabs, with active one visible and others hidden to preserve form state and DOM queries */}
          {tabItems.map((tab) => {
            const isVisible = activeTab === tab.id;
            const groupsMap = settingsByTab[tab.id] || {};
            const groupEntries = Object.entries(groupsMap);

            return (
              <div
                key={tab.id}
                className={isVisible ? 'space-y-6' : 'hidden'}
                aria-hidden={!isVisible}
              >
                {tab.id === 'memory' ? (
                  <SettingsSection title={t('settings.omp.tab.memory.label')}>
                    <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed bg-card/40">
                      <h4 className="font-medium text-foreground text-sm mb-1.5">
                        {t('settings.omp.memory.emptyTitle')}
                      </h4>
                      <p className="text-xs max-w-md mx-auto">
                        {t('settings.omp.memory.emptyDescription')}
                      </p>
                    </div>
                  </SettingsSection>
                ) : (
                  <>
                    {/* If tab is 'model', render dedicated ModelRolesSection first */}
                    {tab.id === 'model' && modelRolesSetting && (
                      <ModelRolesSection
                        setting={modelRolesSetting}
                        value={form.modelRoles !== undefined ? form.modelRoles : modelRolesSetting.value}
                        models={models}
                        disabled={loading}
                        onImmediate={onImmediate}
                      />
                    )}

                    {/* Providers tab info notice */}
                    {tab.id === 'providers' && (
                      <p className={`${SETTINGS_DESCRIPTION_CLASS} -mt-2 mb-4`}>
                        {t('settings.omp.providers.emptyDescription')}
                      </p>
                    )}

                    {groupEntries.map(([groupName, groupSettings], gIdx) => {
                      // Filter out modelRoles from ordinary group rendering as it is rendered above
                      const filteredSettings = groupSettings.filter((s) => s.id !== 'modelRoles');
                      if (filteredSettings.length === 0) return null;

                      const gSlug = getGroupSlug(groupName);
                      const gKey = `settings.omp.group.${gSlug}.label` as I18nKey;
                      const trG = t(gKey);
                      const groupTitle = trG !== gKey ? trG : groupName;

                      return (
                        <SettingsSection
                          key={groupName}
                          title={groupTitle}
                          divider={tab.id === 'model' || gIdx > 0}
                          settingsItem={`omp.group.${gSlug}`}
                        >
                          <div className="space-y-4">
                            {filteredSettings.map((s) => (
                              <SettingItemRenderer
                                key={s.id}
                                setting={s}
                                form={form}
                                models={models}
                                disabled={loading}
                                onChange={onChange}
                                onImmediate={onImmediate}
                              />
                            ))}
                          </div>
                        </SettingsSection>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </SettingsPageLayout>
  );
};
