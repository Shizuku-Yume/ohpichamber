import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dropdownTriggerVariants } from '@/components/ui/dropdown-trigger';
import { Icon } from '@/components/icon/Icon';
import { useDeviceInfo } from '@/lib/device';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type ThinkingPillProps = {
  value: string;
  options: string[];
  /**
   * The level the model runs at when the pill's own value is empty. The
   * trigger shows it, so the pill names the effort that will actually be
   * sent instead of a bare "Default".
   */
  defaultLevel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export const ThinkingPill = ({ value, options, defaultLevel, disabled, onChange }: ThinkingPillProps) => {
  const { t } = useI18n();
  const { isMobile } = useDeviceInfo();
  const defaultLabel = defaultLevel || t('rightSidebar.contextNotesTodo.sendDialog.variant.default');
  const label = value || defaultLabel;

  const trigger = (
    <div
      className={cn(
        dropdownTriggerVariants({ size: isMobile ? 'mobile' : 'default' }),
        'w-fit',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <span className="typography-micro whitespace-nowrap font-medium capitalize">{label}</span>
      <Icon name="arrow-down-s" className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
    </div>
  );

  if (disabled) return trigger;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-[220px]" portalToBody>
        <DropdownMenuItem className="typography-meta" onSelect={() => onChange('')}>
          <span className={cn('font-medium', !value && 'text-primary')}>
            {defaultLabel}
          </span>
        </DropdownMenuItem>
        {options.map((option) => (
          <DropdownMenuItem
            key={option}
            className="typography-meta"
            onSelect={() => onChange(option)}
          >
            <span className={cn('font-medium capitalize', value === option && 'text-primary')}>
              {option}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
