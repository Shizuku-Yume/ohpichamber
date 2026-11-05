import React from 'react';
import {
  SettingsSection,
  SettingsCheckboxRow,
  SettingsInset,
  SETTINGS_OPTION_STACK_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { SessionWarmingCheckbox } from './SessionWarmingCheckbox';
import { updateDesktopSettings } from '@/lib/persistence';
import { useUIStore } from '@/stores/useUIStore';
import { useSessionDisplayStore } from '@/stores/useSessionDisplayStore';
import { useI18n } from '@/lib/i18n';

export const DefaultsSettings: React.FC = () => {
  const { t } = useI18n();
  const showChatsSection = useSessionDisplayStore((state) => state.showChatsSection);
  const setShowChatsSection = useSessionDisplayStore((state) => state.setShowChatsSection);
  const showDeletionDialog = useUIStore((state) => state.showDeletionDialog);
  const setShowDeletionDialog = useUIStore((state) => state.setShowDeletionDialog);

  return (
    <SettingsSection title={t('settings.openchamber.defaults.title')} divider={false}>
      <SettingsInset className={SETTINGS_OPTION_STACK_CLASS}>
        <SettingsCheckboxRow
          settingsItem="sessions.deletion-dialog"
          checked={showDeletionDialog}
          onChange={setShowDeletionDialog}
          label={t('settings.openchamber.defaults.field.showDeletionDialog')}
          ariaLabel={t('settings.openchamber.defaults.field.showDeletionDialogAria')}
        />
        <SessionWarmingCheckbox />
        <SettingsCheckboxRow
          settingsItem="sessions.show-chats"
          checked={showChatsSection}
          onChange={(checked) => {
            setShowChatsSection(checked);
            void updateDesktopSettings({ sidebarShowChatsSection: checked });
          }}
          label={t('settings.openchamber.defaults.field.showChats')}
          ariaLabel={t('settings.openchamber.defaults.field.showChats')}
        />
      </SettingsInset>
    </SettingsSection>
  );
};
