import React from 'react';
import { cn } from '@/lib/utils';

import { Icon } from '@/components/icon/Icon';
import { WalkthroughView } from '@/components/views/walkthrough/WalkthroughView';
import { useI18n } from '@/lib/i18n';
import type { WalkthroughTarget } from '@/lib/walkthrough/types';
import { MOBILE_HEADER_BUTTON_CLASS, MOBILE_HEADER_CLASS, MOBILE_HEADER_TITLE_CLASS } from '@/components/ui/mobileHeader';

/**
 * The walkthrough of what the phone's Changes shows, pushed over its list the
 * way a file's diff is. Wraps the real workbench WalkthroughView with mobile
 * header chrome and back navigation.
 */
export const MobileWalkthroughScreen: React.FC<{
 directory: string;
 target?: WalkthroughTarget;
 /** What is being walked through, such as "Commit · e1d7e102". */
 subtitle?: string;
 /** Moves when the subject's content moves, so the walkthrough reads again. */
 revision?: string;
 visible?: boolean;
 onBack: () => void;
}> = ({ directory, subtitle, visible = true, onBack }) => {
 const { t } = useI18n();

 return (
  <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
   <header className={cn(MOBILE_HEADER_CLASS, 'border-b border-edge text-foreground')}>
    <button
     type="button"
     className={MOBILE_HEADER_BUTTON_CLASS}
     aria-label={t('header.actions.backAria')}
     onClick={onBack}
    >
     <Icon name="arrow-left" className="size-5" />
    </button>
    <div className="min-w-0 flex-1 px-1">
     <h2 className={cn('truncate', MOBILE_HEADER_TITLE_CLASS)}>{t('contextPanel.mode.walkthrough')}</h2>
     {subtitle ? <p className="truncate typography-meta text-muted-foreground">{subtitle}</p> : null}
    </div>
   </header>

   <div className="min-h-0 flex-1 overflow-hidden">
    <WalkthroughView directory={directory} visible={visible} />
   </div>
  </div>
 );
};
