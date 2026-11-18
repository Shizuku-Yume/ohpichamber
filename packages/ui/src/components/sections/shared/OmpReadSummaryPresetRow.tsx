import React from 'react';
import type { OmpSettingValue } from '@openchamber/agent-contract';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsFieldRow, SETTINGS_WIDTH_SELECT_CLASS } from '@/components/sections/shared/SettingsSection';
import { readSummaryPresetChanges, readSummaryPresetOf, type ReadSummaryPreset } from './ompRowHelpers';

/** Every value the picker shows, in the order it shows them. */
const PRESET_VALUES: readonly ReadSummaryPreset[] = ['off', 'balanced', 'aggressive', 'custom'];

const PRESET_LABEL_KEYS = {
  off: 'settings.omp.preset.readSummary.options.off',
  balanced: 'settings.omp.preset.readSummary.options.balanced',
  aggressive: 'settings.omp.preset.readSummary.options.aggressive',
  custom: 'settings.omp.preset.readSummary.options.custom',
} satisfies Record<ReadSummaryPreset, I18nKey>;

const isReadSummaryPreset = (value: string): value is ReadSummaryPreset =>
  PRESET_VALUES.some((preset) => preset === value);

/**
 * Read-summary preset: one picker over the four threshold rows that stay
 * editable under Advanced.
 *
 * The stored tuple is the source of truth, so the picker always shows what the
 * config actually is; Custom is a state, never a choice, and is shown as a
 * disabled item. Applying a preset writes only the keys that differ, in one
 * change set, so a value the user already has is never rewritten.
 */
export const OmpReadSummaryPresetRow: React.FC<{
  values: Readonly<Record<string, OmpSettingValue>>;
  disabled?: boolean;
  onApply: (changes: Record<string, OmpSettingValue>) => void;
}> = ({ values, disabled, onApply }) => {
  const { t } = useI18n();
  const preset = readSummaryPresetOf(values);
  const label = t('settings.omp.preset.readSummary.label');

  return (
    <SettingsFieldRow
      label={label}
      info={t('settings.omp.preset.readSummary.description')}
      settingsItem="omp.read.summarize.enabled"
    >
      <Select
        value={preset}
        onValueChange={(next) => {
          if (!isReadSummaryPreset(next)) return;
          const changes = readSummaryPresetChanges(next, values);
          // A preset that changes nothing (Balanced on OMP's defaults) writes
          // nothing: an empty change set is refused by the update contract.
          if (Object.keys(changes).length > 0) onApply(changes);
        }}
        disabled={disabled}
      >
        <SelectTrigger className={SETTINGS_WIDTH_SELECT_CLASS} aria-label={label}>
          <SelectValue>{t(PRESET_LABEL_KEYS[preset])}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRESET_VALUES.map((option) => (
            <SelectItem
              key={option}
              value={option}
              // Custom is the current state when the tuple matches no preset,
              // not a choice: selecting it would have nothing to write.
              disabled={option === 'custom'}
            >
              {t(PRESET_LABEL_KEYS[option])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsFieldRow>
  );
};
