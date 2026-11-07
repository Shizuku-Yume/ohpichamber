import React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Icon } from "@/components/icon/Icon";
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type PreviewToggleButtonProps = {
 /** Current mode - determines which icon is displayed */
 currentMode: 'preview' | 'edit';
 /** Callback fired when toggle button is clicked */
 onToggle: () => void;
};

/**
 * PreviewToggleButton - A toggle button for switching between preview and edit modes.
 *
 * Displays an eye icon when in preview mode (indicating the content is visible/read-only)
 * and a slashed eye icon when in edit mode (indicating the content can be edited).
 * The pressed state matches the Markdown preview toggle in the file toolbar.
 */
export const PreviewToggleButton: React.FC<PreviewToggleButtonProps> = ({
 currentMode,
 onToggle,
}) => {
 const { t } = useI18n();
 const isPreview = currentMode === 'preview';
 const label = t(isPreview ? 'filesView.editor.switchToEditMode' : 'filesView.editor.switchToPreviewMode');

 return (
  <Tooltip>
   <TooltipTrigger asChild>
    <Button
     variant="ghost"
     size="sm"
     onClick={onToggle}
     aria-label={label}
     title={label}
     className={cn(
      'size-6 p-0 transition-colors hover:bg-[var(--interactive-hover)] focus-visible:bg-[var(--interactive-hover)] active:bg-[var(--interactive-hover)]',
      isPreview
       ? 'bg-[var(--interactive-selection)] text-[var(--interactive-selection-foreground)] hover:bg-[var(--interactive-selection)] focus-visible:bg-[var(--interactive-selection)] active:bg-[var(--interactive-selection)]'
       : 'text-muted-foreground opacity-65 hover:opacity-100',
     )}
    >
     <Icon name={isPreview ? 'eye' : 'eye-off'} className="size-4" aria-hidden="true" />
    </Button>
   </TooltipTrigger>
   <TooltipContent sideOffset={8}>
    {label}
   </TooltipContent>
  </Tooltip>
 );
};
