import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SessionDraft } from '@/stores/useSessionDraftsStore';
import { useSessionDraftRow } from './useSessionDraftRow';

// The session tree's row geometry, shared with the session rows around it.
const ROW_GUTTER_LEFT_PX = 6;
const ROW_DEPTH_STEP_PX = 14;
const ROW_TEXT_LEFT_PX = ROW_GUTTER_LEFT_PX + 14 + 6;

type Props = {
  draft: SessionDraft;
  depth: number;
  alwaysShowActions?: boolean;
  onNavigate?: () => void;
};

/**
 * A new session's draft not sent yet, where its session would go: a pen in the
 * row's gutter, the start of what was typed, and a cross that throws it away.
 * A click opens it in the composer, where its text goes on in this device's
 * draft for the same directory.
 */
export function SessionDraftRow({ draft, depth, alwaysShowActions = false, onNavigate = () => {} }: Props): React.ReactNode {
  const { t } = useI18n();
  const { isOpen, firstLine, attachmentCount, label, open, discard: discardDraft } = useSessionDraftRow(draft, onNavigate);
  const discard = (event: React.MouseEvent): void => {
    event.stopPropagation();
    discardDraft();
  };

  return (
    <div
      className={cn(
        'group/draft relative my-0.5 flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md py-1 pe-2.5',
        isOpen ? 'bg-interactive-selection/70 text-interactive-selection-foreground' : 'hover:bg-interactive-hover/60',
      )}
      style={{ paddingInlineStart: ROW_TEXT_LEFT_PX + depth * ROW_DEPTH_STEP_PX }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inline-flex size-3.5 items-center justify-center text-muted-foreground/70"
        style={{ insetInlineStart: ROW_GUTTER_LEFT_PX + depth * ROW_DEPTH_STEP_PX }}
      >
        <Icon name="edit" className="h-3 w-3" />
      </span>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          '@container relative flex min-w-0 flex-1 items-center gap-1 focus-visible:outline-none',
          !alwaysShowActions && '[--oc-actions-reserve:0.625rem]',
        )}
        aria-label={t('sessions.sidebar.draft.openAria', { label })}
        onClick={open}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          open();
        }}
      >
        <span
          dir="auto"
          className={cn(
            'oc-ui-start-align min-w-0 flex-1 truncate typography-ui-label italic',
            isOpen ? 'text-interactive-selection-foreground' : 'text-muted-foreground',
            !alwaysShowActions && 'group-hover/draft:oc-actions-mask group-has-[:focus-visible]/draft:oc-actions-mask',
          )}
        >
          {label}
        </span>
        <span className={cn(
          'ms-auto flex flex-shrink-0 items-center gap-1',
          alwaysShowActions ? 'pe-7' : 'transition-opacity group-hover/draft:opacity-0 group-has-[:focus-visible]/draft:opacity-0',
        )}>
          {firstLine && attachmentCount > 0 ? <Icon name="attachment-2" className="h-3 w-3 text-muted-foreground/50" /> : null}
        </span>
      </div>
      <div className={cn(
        'absolute inset-e-1 top-1/2 z-10 flex -translate-y-1/2 items-center transition-opacity',
        alwaysShowActions ? 'opacity-100' : 'opacity-0 group-hover/draft:opacity-100 group-has-[:focus-visible]/draft:opacity-100',
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                alwaysShowActions ? 'h-6 w-6' : 'h-4 w-4',
              )}
              aria-label={t('sessions.sidebar.draft.discard')}
              onClick={discard}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Icon name="close" className={alwaysShowActions ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>{t('sessions.sidebar.draft.discard')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
