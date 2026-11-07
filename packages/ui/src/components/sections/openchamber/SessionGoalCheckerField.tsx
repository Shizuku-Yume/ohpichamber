import React from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon/Icon';
import { NumberInput } from '@/components/ui/number-input';
import {
 SettingsChipGroup,
 SettingsFieldRow,
 SETTINGS_HELPER_CLASS,
 SETTINGS_ICON_BUTTON_CLASS,
 SETTINGS_NUMBER_INPUT_CLASS,
 SETTINGS_NUMBER_STEPPER_ROW_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { SettingsInlineLink } from '@/components/sections/classification/JevAccessNote';
import { useI18n } from '@/lib/i18n';
import { DEFAULT_SESSION_GOAL_MAX_AUTO_TURNS, SESSION_GOAL_MAX_AUTO_TURNS_LIMIT } from '@/lib/sessionGoalTurnLimit';
import { useUIStore } from '@/stores/useUIStore';

const openSmallModelSettings = (): void => {
 useUIStore.getState().requestSettingsJump('sessions', 'sessions.small-model');
};

/**
 * Who checks goal progress after each turn: the native `judge` model role (Jev,
 * or whatever that role resolves to on this session) or the small model.
 *
 * This is OMP's own model-role configuration, not the Host routing classifier,
 * so the saved choice is always what the worker uses. The small model falls
 * back through `smol`, `tiny` and `default` inside the worker; Jev needs the
 * `judge` role to resolve to a judgment backend, which the model-roles page
 * configures.
 */
export const SessionGoalCheckerField: React.FC<{ disabled?: boolean }> = ({ disabled = false }) => {
 const { t } = useI18n();
 const checker = useUIStore((state) => state.sessionGoalChecker);
 const setChecker = useUIStore((state) => state.setSessionGoalChecker);

 return (
  <div className="space-y-1">
   <SettingsFieldRow
    settingsItem="chat.session-goal-checker"
    label={t('settings.openchamber.visual.goal.checkerLabel')}
    info={t('settings.openchamber.visual.goal.checkerInfo')}
   >
    <SettingsChipGroup
     aria-label={t('settings.openchamber.visual.goal.checkerLabel')}
     value={checker}
     onChange={setChecker}
     options={[
      { value: 'classifier', label: 'Jev', disabled },
      { value: 'small-model', label: t('settings.openchamber.visual.goal.checker.smallModel'), disabled },
     ]}
    />
   </SettingsFieldRow>
   {checker === 'classifier' ? (
    <p className={SETTINGS_HELPER_CLASS}>
     {t('settings.openchamber.visual.goal.checker.jevMissing')}
    </p>
   ) : (
    <p className={SETTINGS_HELPER_CLASS}>
     {t('settings.openchamber.visual.goal.checker.viaSmallModel')}
     {' '}
     <SettingsInlineLink onClick={openSmallModelSettings}>{t('settings.openchamber.visual.goal.checker.smallModelLink')}</SettingsInlineLink>
    </p>
   )}
  </div>
 );
};

/** How many automatic turns a goal takes before it stops and hands back to the user. */
export const SessionGoalMaxTurnsField: React.FC<{ disabled?: boolean }> = ({ disabled = false }) => {
 const { t } = useI18n();
 const maxTurns = useUIStore((state) => state.sessionGoalMaxAutoTurns);
 const setMaxTurns = useUIStore((state) => state.setSessionGoalMaxAutoTurns);

 return (
  <SettingsFieldRow
   settingsItem="chat.session-goal-max-turns"
   label={t('settings.openchamber.visual.goal.maxTurnsLabel')}
   info={t('settings.openchamber.visual.goal.maxTurnsInfo')}
  >
   <div className={SETTINGS_NUMBER_STEPPER_ROW_CLASS}>
    <NumberInput
     value={maxTurns}
     onValueChange={(value) => setMaxTurns(Math.floor(value))}
     min={1}
     max={SESSION_GOAL_MAX_AUTO_TURNS_LIMIT}
     step={1}
     disabled={disabled}
     className={SETTINGS_NUMBER_INPUT_CLASS}
     aria-label={t('settings.openchamber.visual.goal.maxTurnsLabel')}
    />
    <Button
     size="sm"
     type="button"
     variant="ghost"
     onClick={() => setMaxTurns(DEFAULT_SESSION_GOAL_MAX_AUTO_TURNS)}
     disabled={disabled || maxTurns === DEFAULT_SESSION_GOAL_MAX_AUTO_TURNS}
     className={SETTINGS_ICON_BUTTON_CLASS}
     aria-label={t('settings.openchamber.visual.goal.maxTurnsResetAria')}
     title={t('settings.common.actions.reset')}
    >
     <Icon name="restart" className="h-3.5 w-3.5" />
    </Button>
   </div>
  </SettingsFieldRow>
 );
};
