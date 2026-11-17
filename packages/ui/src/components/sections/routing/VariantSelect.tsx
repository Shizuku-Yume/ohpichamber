import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SETTINGS_WIDTH_SELECT_CLASS } from '@/components/sections/shared/SettingsSection';
import { useI18n } from '@/lib/i18n';
import { knownVariant, useModelReasoningEfforts } from './routingCategoryUtils';

const DEFAULT_VARIANT_VALUE = '__default__';

interface VariantSelectProps {
  providerID: string | null | undefined;
  modelID: string | null | undefined;
  value: string | null;
  onChange: (variant: string | null) => void;
  ariaLabel: string;
  triggerClassName?: string;
}

export const VariantSelect: React.FC<VariantSelectProps> = ({
  providerID,
  modelID,
  value,
  onChange,
  ariaLabel,
  triggerClassName,
}) => {
  const { t } = useI18n();
  const efforts = useModelReasoningEfforts(providerID, modelID);
  const selected = knownVariant(value, efforts) ?? DEFAULT_VARIANT_VALUE;
  const label = (variant: string) => {
    if (variant === DEFAULT_VARIANT_VALUE) return t('settings.routing.thinking.default');
    if (variant === 'off') return t('chat.modelControls.off');
    return variant.charAt(0).toUpperCase() + variant.slice(1);
  };

  return (
    <Select
      value={selected}
      onValueChange={(next) => onChange(next === DEFAULT_VARIANT_VALUE ? null : next)}
      disabled={efforts.length === 0}
    >
      <SelectTrigger className={triggerClassName ?? SETTINGS_WIDTH_SELECT_CLASS} aria-label={ariaLabel}>
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
