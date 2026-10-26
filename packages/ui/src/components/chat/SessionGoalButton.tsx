import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSessionGoal } from '@/hooks/useSessionGoal';
import { useSessionGoalArmStore } from '@/stores/useSessionGoalArmStore';
import { SESSION_GOAL_OBJECTIVE_CHAR_LIMIT } from '@/lib/sessionGoalMetadata';
import { SessionGoalDialog } from '@/components/chat/SessionGoalDialog';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface SessionGoalButtonProps {
  sessionId: string | null;
  directory?: string;
  /** Session draft is open — the goal arms for the session the draft creates. */
  draftOpen?: boolean;
  footerIconButtonClass: string;
  iconSizeClass: string;
  withTooltip?: boolean;
}

// Composer target control. Arming makes the submitted text the goal objective;
// submission creates a goal directly and the server starts its execution.
export const SessionGoalButton: React.FC<SessionGoalButtonProps> = React.memo(({
  sessionId,
  directory,
  draftOpen = false,
  footerIconButtonClass,
  iconSizeClass,
  withTooltip = false,
}) => {
  const { t } = useI18n();
  const { mode, enabled } = useSessionGoal(sessionId ?? '', directory);
  const armed = useSessionGoalArmStore((state) => state.armed);
  const setArmed = useSessionGoalArmStore((state) => state.setArmed);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  if (!enabled || (!sessionId && !draftOpen)) {
    return null;
  }

  const isEngaged = armed || Boolean(mode);
  const iconColor = mode ? (mode.status === 'complete' ? 'var(--status-success)' : 'var(--status-info)') : (armed ? 'var(--status-info)' : undefined);
  const label = mode ? t('chat.goal.button.manageAria') : (armed ? t('chat.goal.button.disarmAria') : t('chat.goal.button.armAria'));
  const handleClick = () => {
    if (mode) {
      setDialogOpen(true);
      return;
    }
    setArmed(!armed, null, !armed);
  };

  const button = (
    <button
      type="button"
      className={footerIconButtonClass}
      style={iconColor ? { color: iconColor } : undefined}
      onClick={handleClick}
      // Same guard as PermissionAutoAcceptButton, but only for the ARM
      // toggle: arming happens mid-typing (the next message IS the
      // objective), so that tap must not dismiss the soft keyboard or
      // trigger the Android keyboard-close relayout that moves the button
      // before the click lands. Opening the manage sheet (goal exists) is a
      // context switch — there the keyboard should close as usual.
      onMouseDown={(event) => {
        if (!mode) event.preventDefault();
      }}
      onPointerDownCapture={(event) => {
        if (!mode && event.pointerType === 'touch') {
          event.preventDefault();
        }
      }}
      aria-label={label}
      aria-pressed={isEngaged}
      {...(withTooltip ? {} : { title: label })}
    >
      {isEngaged || mode ? (
        <Icon name="target-fill" className={cn(iconSizeClass, 'text-current')} aria-hidden="true" />
      ) : (
        <Icon name="target" className={cn(iconSizeClass, 'text-current')} aria-hidden="true" />
      )}
    </button>
  );

  return (
    <>
      {withTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>{label}</TooltipContent>
        </Tooltip>
      ) : button}
      {sessionId ? (
        <SessionGoalDialog open={dialogOpen} onOpenChange={setDialogOpen} sessionId={sessionId} directory={directory} />
      ) : null}
    </>
  );
});

SessionGoalButton.displayName = 'SessionGoalButton';

interface SessionGoalObjectiveCounterProps {
  /** Current composer text length — the armed message becomes the objective. */
  length: number;
}

// Isolate the typed objective counter from the rest of the footer's render path.
// Renders null when not armed, so normal typing shows nothing.
export const SessionGoalObjectiveCounter: React.FC<SessionGoalObjectiveCounterProps> = React.memo(({ length }) => {
  const { t } = useI18n();
  const armed = useSessionGoalArmStore((state) => state.armed);

  if (!armed || length === 0) {
    return null;
  }

  const over = length > SESSION_GOAL_OBJECTIVE_CHAR_LIMIT;
  return (
    <span
      className={cn(
        'flex-shrink-0 self-center typography-micro tabular-nums',
        over ? 'text-[var(--status-error)]' : 'text-muted-foreground/70',
      )}
      aria-label={t('chat.goal.counter.aria')}
      title={t('chat.goal.counter.aria')}
    >
      {length}/{SESSION_GOAL_OBJECTIVE_CHAR_LIMIT}
    </span>
  );
});

SessionGoalObjectiveCounter.displayName = 'SessionGoalObjectiveCounter';
