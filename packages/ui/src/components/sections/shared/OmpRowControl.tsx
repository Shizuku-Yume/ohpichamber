import React from 'react';
import type { OmpSetting, OmpSettingValue } from '@openchamber/agent-contract';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SettingsCheckboxRow,
  SettingsChipGroup,
  SettingsStackedField,
  SETTINGS_NUMBER_INPUT_CLASS,
  SETTINGS_NUMBER_UNIT_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { NumberInput } from '@/components/ui/number-input';
import { inferUnit, isSentinelOption, optionSlug } from './ompRowHelpers';

/** One registry row: label and description from the locale, control from type/options. */
export const OmpRowControl: React.FC<{
  setting: OmpSetting;
  value: OmpSettingValue;
  disabled?: boolean;
  onChange: (value: OmpSettingValue) => void;
}> = ({ setting, value, disabled, onChange }) => {
  const { t } = useI18n();
  const labelKey = `settings.omp.items.${setting.id}.label` as I18nKey;
  // The locale is the only user-facing name. `settings-ui.test.ts` fails when an
  // exposed row has no copy, so the OMP label is a fallback only a new setting
  // could reach, and the id never becomes prose: `modelRoles` used to render as
  // a raw id because its OMP label is empty.
  const label = t(labelKey) === labelKey ? (setting.label || setting.id.replace(/\./g, ' ')) : t(labelKey);
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

