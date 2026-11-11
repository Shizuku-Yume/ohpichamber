import React from 'react';
import { formatModelRef, parseModelSelector, type Model } from '@openchamber/agent-contract';
import { ModelSelector } from '@/components/sections/agents/ModelSelector';
import {
  SettingsFieldRow,
  SettingsStackedField,
  SETTINGS_SELECT_ROW_TRIGGER_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import {
  concreteEffort,
  listModelEfforts,
  splitRoleSelector,
  formatRoleSelector,
  modelForSelector,
} from '@/components/sections/shared/modelRoleSelectors';

export interface ModelEffortPickerProps {
  model: Model | undefined;
  /** The level the selector carries explicitly; empty means "the model's own". */
  effort: string;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (level: string) => void;
}

/**
 * The one effort control: lists the model's concrete levels and shows the
 * level that currently runs. There is no synthetic "default" row, so what the
 * trigger says is what a send would carry.
 */
export const ModelEffortPicker: React.FC<ModelEffortPickerProps> = ({
  model, effort: explicitEffort, disabled, ariaLabel, onChange,
}) => {
  const { t } = useI18n();
  const efforts = React.useMemo(() => listModelEfforts(model, t), [model, t]);
  if (efforts.length === 0) return null;
  const current = concreteEffort(model, explicitEffort);
  const currentLabel = efforts.find((entry) => entry.level === current)?.label ?? current;
  return (
    <Select value={current} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={SETTINGS_SELECT_ROW_TRIGGER_CLASS} aria-label={ariaLabel}>
        <SelectValue>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {efforts.map((entry) => (
          <SelectItem key={entry.level} value={entry.level}>{entry.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export interface ModelRoleEditorProps {
  /** Role id this row writes, for example `vision` or `commit`. */
  role: string;
  /** The whole `modelRoles` record, so an unset role can say what it inherits. */
  roles: Readonly<Record<string, string>>;
  models: readonly Model[];
  label: React.ReactNode;
  description?: React.ReactNode;
  info?: React.ReactNode;
  /** Anchor for the model control. */
  settingsItem?: string;
  /** Anchor for the effort control, when it is a control of its own. */
  effortSettingsItem?: string;
  effortLabel?: string;
  disabled?: boolean;
  /** Row layout: a field row in a section, or a stacked cell in a two-column grid. */
  layout?: 'row' | 'stacked';
  /** '' clears the role, which is OMP's explicit inherit state. */
  onChange: (selector: string) => void;
}

/**
 * One editor for every model role a Settings page assigns.
 *
 * The old page rebuilt this per surface: a 16-card grid on the OMP page, a
 * select per role on Defaults, another on Git, each with its own parser,
 * `__inherit__`/`__default__` sentinel and duplicated effort list. Assigning a
 * role means picking a catalog model and, for a model that reasons, a level;
 * the selector grammar and the effort vocabulary live here once.
 */
export const ModelRoleEditor: React.FC<ModelRoleEditorProps> = ({
  role, roles, models, label, description, info, settingsItem, effortSettingsItem, effortLabel,
  disabled, layout = 'row', onChange,
}) => {
  const { t } = useI18n();
  const selector = roles[role] ?? '';
  const { model: modelId, effort } = React.useMemo(
    () => splitRoleSelector(selector, models),
    [selector, models],
  );
  const model = React.useMemo(() => modelForSelector(models, modelId), [models, modelId]);
  const parsed = React.useMemo(() => parseModelSelector(modelId), [modelId]);

  const onModelChange = React.useCallback(
    (providerId: string, nextModelId: string) => {
      if (!providerId || !nextModelId) {
        onChange('');
        return;
      }
      const nextModel = models.find((candidate) => candidate.provider === providerId && candidate.modelId === nextModelId);
      const nextEfforts = nextModel?.reasoningEffortSupported ? nextModel.reasoningOptions : [];
      const keepsEffort = effort !== '' && (nextEfforts.length === 0 || nextEfforts.some((option) => option.reasoningEffort === effort));
      onChange(formatRoleSelector(formatModelRef({ provider: providerId, modelId: nextModelId }), keepsEffort ? effort : ''));
    },
    [effort, models, onChange],
  );

  const onEffortChange = React.useCallback(
    (level: string) => onChange(formatRoleSelector(modelId, level)),
    [modelId, onChange],
  );

  const controls = (
    <>
      <ModelSelector
        providerId={parsed?.providerId ?? ''}
        modelId={parsed?.modelId ?? ''}
        onChange={onModelChange}
        directory={undefined}
        placeholder={t('settings.omp.modelRoles.inheritFallback')}
        className={SETTINGS_SELECT_ROW_TRIGGER_CLASS}
      />
      <ModelEffortPicker
        model={model}
        effort={effort}
        disabled={disabled}
        ariaLabel={effortLabel ?? t('settings.omp.modelRoles.effortAria', { role: String(label) })}
        onChange={onEffortChange}
      />
    </>
  );

  const effortAnchor = effortSettingsItem === undefined
    ? null
    : <span className="hidden" data-settings-item={effortSettingsItem} />;

  if (layout === 'stacked') {
    return (
      <SettingsStackedField
        label={label}
        description={description}
        info={info}
        settingsItem={settingsItem}
        controlClassName="max-w-none"
      >
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          {effortAnchor}
        </div>
      </SettingsStackedField>
    );
  }
  return (
    <SettingsFieldRow
      label={label}
      description={description}
      info={info}
      settingsItem={settingsItem}
    >
      {controls}
      {effortAnchor}
    </SettingsFieldRow>
  );
};
