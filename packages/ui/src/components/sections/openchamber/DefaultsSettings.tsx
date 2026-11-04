import React from 'react';
import { canonicalClient } from '@/api/canonicalClient';
import { ModelSelector } from '@/components/sections/agents/ModelSelector';
import {
  SettingsSection,
  SettingsFieldRow,
  SettingsCheckboxRow,
  SettingsInset,
  SettingsGroupTitle,
  SETTINGS_CUSTOM_TRIGGER_CLASS,

  SETTINGS_OPTION_STACK_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { SessionWarmingCheckbox } from './SessionWarmingCheckbox';
import { SettingsInfoHint } from '@/components/sections/shared/SettingsInfoHint';
import { loadDesktopSettings, updateDesktopSettings } from '@/lib/persistence';
import { useConfigStore } from '@/stores/useConfigStore';
import { useUIStore } from '@/stores/useUIStore';
import { useSessionDisplayStore } from '@/stores/useSessionDisplayStore';
import { useI18n } from '@/lib/i18n';
import { parseModelIdentifier } from '@/lib/modelIdentifier';
import { useSettingsDirectory } from '@/hooks/useSettingsDirectory';

const getDisplayModel = (
  storedModel: string | undefined
): { providerId: string; modelId: string } => {
  const parsed = parseModelIdentifier(storedModel);
  if (parsed) {
    return parsed;
  }

  return { providerId: '', modelId: '' };
};

 export const DefaultsSettings: React.FC = () => {
   const { t } = useI18n();
  const settingsDirectory = useSettingsDirectory();
  const showChatsSection = useSessionDisplayStore((state) => state.showChatsSection);
  const setShowChatsSection = useSessionDisplayStore((state) => state.setShowChatsSection);
  const showDeletionDialog = useUIStore((state) => state.showDeletionDialog);
  const setShowDeletionDialog = useUIStore((state) => state.setShowDeletionDialog);
  const modelsMetadata = useConfigStore((state) => state.modelsMetadata);

  const [smallModelUseDefault, setSmallModelUseDefault] = React.useState(true);
  const [smallModelOverride, setSmallModelOverride] = React.useState<string | undefined>();
  const [smallModelProviders, setSmallModelProviders] = React.useState<string[]>([]);
  const [walkthroughModelOverride, setWalkthroughModelOverride] = React.useState<string | undefined>();
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await loadDesktopSettings();
        if (data) {
          if (data.smallModelUseDefault !== undefined) setSmallModelUseDefault(data.smallModelUseDefault);
          const smallOverride = data.smallModelOverride?.trim();
          if (smallOverride) {
            setSmallModelOverride(smallOverride);
          }
          const walkthroughOverride = data.walkthroughModelOverride?.trim();
          if (walkthroughOverride) {
            setWalkthroughModelOverride(walkthroughOverride);
          }
        }
      } catch (error) {
        console.warn('Failed to load defaults settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSmallModelUseDefaultChange = React.useCallback(
    async (useDefault: boolean) => {
      setSmallModelUseDefault(useDefault);
      try {
        await updateDesktopSettings({ smallModelUseDefault: useDefault });
      } catch (error) {
        console.warn('Failed to save small model preference:', error);
      }
    },
    []
  );

  const handleSmallModelOverrideChange = React.useCallback(
    async (providerId: string, modelId: string) => {
      const newValue = providerId && modelId ? `${providerId}/${modelId}` : undefined;
      setSmallModelOverride(newValue);
      try {
        await updateDesktopSettings({ smallModelOverride: newValue ?? '' });
      } catch (error) {
        console.warn('Failed to save small model override:', error);
      }
    },
    []
  );

  const handleWalkthroughModelOverrideChange = React.useCallback(
    async (providerId: string, modelId: string) => {
      const newValue = providerId && modelId ? `${providerId}/${modelId}` : undefined;
      setWalkthroughModelOverride(newValue);
      try {
        // Clearing the picker is how the user goes back to the small model, so
        // an empty value is a real choice rather than a no-op.
        await updateDesktopSettings({ walkthroughModelOverride: newValue ?? '' });
      } catch (error) {
        console.warn('Failed to save walkthrough model override:', error);
      }
    },
    []
  );

  // The walkthrough cannot work at all without schema-shaped output, so models
  // the catalog says cannot do it are hidden rather than offered and then
  // refused. A missing capability is not a "no": roughly half the catalog omits
  // the field, and those models usually work.
  const isStructuredOutputCapable = React.useCallback(
    (providerId: string, modelId: string) =>
      modelsMetadata.get(`${providerId}/${modelId}`)?.structured_output !== false,
    [modelsMetadata]
  );

  const parsedSmallModel = React.useMemo(() => getDisplayModel(smallModelOverride), [smallModelOverride]);
  const parsedWalkthroughModel = React.useMemo(
    () => getDisplayModel(walkthroughModelOverride),
    [walkthroughModelOverride]
  );
  React.useEffect(() => {
    let cancelled = false;
    if (!settingsDirectory) {
      setSmallModelProviders([]);
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const workspace = await canonicalClient.resolveWorkspace(settingsDirectory);
        const catalog = await canonicalClient.getProviders(workspace.workspaceId);
        if (!cancelled) {
          setSmallModelProviders(catalog.providers
            .filter((provider) => provider.auth.status === 'configured')
            .map((provider) => provider.providerId));
        }
      } catch {
        // Fail closed: unavailable canonical catalogs must not offer providers.
        if (!cancelled) setSmallModelProviders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsDirectory]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <SettingsSection title={t('settings.openchamber.defaults.title')} divider={false}>
        <div className="space-y-0">

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

          <div className="space-y-3 pt-6">
            <div className="flex items-center gap-1.5">
              <SettingsGroupTitle>
                {t('settings.openchamber.defaults.smallModel.title')}
              </SettingsGroupTitle>
              <SettingsInfoHint>
                {t('settings.openchamber.defaults.smallModel.description')}
              </SettingsInfoHint>
            </div>

            <SettingsCheckboxRow
              settingsItem="sessions.small-model"
              checked={smallModelUseDefault}
              onChange={(checked) => {
                void handleSmallModelUseDefaultChange(checked);
              }}
              label={t('settings.openchamber.defaults.smallModel.useDefault')}
              ariaLabel={t('settings.openchamber.defaults.smallModel.useDefaultAria')}
            />

            {!smallModelUseDefault ? (
              <SettingsFieldRow label={t('settings.openchamber.defaults.smallModel.overrideModel')}>
                <ModelSelector
                  providerId={parsedSmallModel.providerId}
                  modelId={parsedSmallModel.modelId}
                  onChange={handleSmallModelOverrideChange}
                  allowedProviderIds={smallModelProviders}
                  className={SETTINGS_CUSTOM_TRIGGER_CLASS}
                />
              </SettingsFieldRow>
            ) : null}

            <SettingsInset className={SETTINGS_OPTION_STACK_CLASS}>
              <div className="flex items-center gap-1.5">
                <SettingsGroupTitle>
                  {t('settings.openchamber.defaults.walkthroughModel.title')}
                </SettingsGroupTitle>
                <SettingsInfoHint>
                  {t('settings.openchamber.defaults.walkthroughModel.description')}
                </SettingsInfoHint>
              </div>

              <SettingsFieldRow
                settingsItem="sessions.walkthrough-model"
                label={t('settings.openchamber.defaults.walkthroughModel.overrideModel')}
              >
                <ModelSelector
                  providerId={parsedWalkthroughModel.providerId}
                  modelId={parsedWalkthroughModel.modelId}
                  onChange={handleWalkthroughModelOverrideChange}
                  allowedProviderIds={smallModelProviders}
                  isModelAllowed={isStructuredOutputCapable}
                  placeholder={t('settings.openchamber.defaults.walkthroughModel.usesSmallModel')}
                  className={SETTINGS_CUSTOM_TRIGGER_CLASS}
                />
              </SettingsFieldRow>
            </SettingsInset>
          </div>
        </div>
      </SettingsSection>

    </>
  );
};
