import React from 'react';
import { useI18n } from '@/lib/i18n';
import { useSettingsDirectory } from '@/hooks/useSettingsDirectory';
import { useSettingsModels } from '@/hooks/useSettingsModels';
import { SettingsPageLayout } from '@/components/sections/shared/SettingsPageLayout';
import {
  SettingsSection,
  SETTINGS_OPTION_STACK_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { ModelRoleEditor } from '@/components/sections/shared/ModelRoleEditor';
import { useOmpPageSettings } from '@/components/sections/shared/useOmpPageSettings';
import { OmpRowControl } from '@/components/sections/shared/OmpRowControl';
import { parseRolesRecord, roleSelector } from '@/components/sections/shared/modelRoleSelectors';
import { CanonicalApiError, canonicalClient } from '@/api/canonicalClient';
import type { JsonValue } from '@openchamber/agent-contract';

export const MemoryPage: React.FC = () => {
  const { t } = useI18n();
  const directory = useSettingsDirectory();
  const models = useSettingsModels(directory);

  const { state: ompState, form: ompForm, updateSetting: updateOmpSetting, getSectionSettings, loading: ompLoading } = useOmpPageSettings('memory');

  const modelRolesSetting = ompState?.settings.find((s) => s.id === 'modelRoles');
  const rolesMap = React.useMemo(() => parseRolesRecord(modelRolesSetting?.value), [modelRolesSetting?.value]);
  const roleSelectors = React.useMemo(
    () => Object.fromEntries(Object.entries(rolesMap).map(([role, value]) => [role, roleSelector(value)])),
    [rolesMap],
  );

  const handleMemoryRoleChange = React.useCallback(
    async (selector: string) => {
      if (!ompState) return;
      const nextRoles: Record<string, JsonValue> = { ...rolesMap };
      if (selector) nextRoles.memory = selector;
      else delete nextRoles.memory;
      try {
        await canonicalClient.updateOmpSettings(ompState.workspaceId, {
          expectedRevision: ompState.revision,
          changes: [{ id: 'modelRoles', value: nextRoles }],
        });
      } catch (err) {
        if (err instanceof CanonicalApiError && err.problem.status === 409) {
          const latest = await canonicalClient.getOmpSettings(ompState.workspaceId);
          const latestRoles = parseRolesRecord(latest.settings.find((s) => s.id === 'modelRoles')?.value);
          const merged: Record<string, JsonValue> = { ...latestRoles };
          if (selector) merged.memory = selector;
          else delete merged.memory;
          await canonicalClient.updateOmpSettings(latest.workspaceId, {
            expectedRevision: latest.revision,
            changes: [{ id: 'modelRoles', value: merged }],
          });
        }
      }
    },
    [ompState, rolesMap],
  );

  const backendSettings = getSectionSettings('backend');
  const backendById = React.useMemo(() => {
    const map = new Map<string, (typeof backendSettings)[number]>();
    for (const s of backendSettings) map.set(s.id, s);
    return map;
  }, [backendSettings]);

  const currentBackend = ompForm['memory.backend'] ?? backendById.get('memory.backend')?.value ?? 'off';
  const isEnabled = currentBackend !== 'off';

  const mnemopiKeys = [
    'mnemopi.bank',
    'mnemopi.scoping',
    'mnemopi.embeddingVariant',
    'mnemopi.autoRecall',
    'mnemopi.autoRetain',
    'mnemopi.polyphonicRecall',
    'mnemopi.enhancedRecall',
    'mnemopi.proactiveLinking',
    'mnemopi.noEmbeddings',
    'mnemopi.embeddingModel',
    'mnemopi.llmMode',
    'mnemopi.llmModel',
  ];

  const hindsightKeys = [
    'hindsight.bankId',
    'hindsight.scoping',
    'hindsight.globalScope',
    'hindsight.autoRecall',
    'hindsight.autoRetain',
    'hindsight.retainMode',
    'hindsight.mentalModelsEnabled',
    'hindsight.mentalModelAutoSeed',
  ];

  return (
    <SettingsPageLayout
      title={t('settings.page.memory.title')}
      description={t('settings.page.memory.description')}
      showSaveStatus
    >
      <div className="space-y-6">
        {/* Backend selection */}
        <SettingsSection
          title={t('settings.memory.section.backend.title')}
          description={t('settings.memory.section.backend.description')}
          divider={false}
          settingsItem="memory.section.backend"
        >
          <div className={SETTINGS_OPTION_STACK_CLASS}>
            {backendById.has('memory.backend') ? (
              <OmpRowControl
                setting={backendById.get('memory.backend')!}
                value={currentBackend}
                disabled={ompLoading}
                onChange={(val) => void updateOmpSetting('memory.backend', val)}
              />
            ) : null}

            {isEnabled ? (
              <div className="pt-2">
                <ModelRoleEditor
                  role="memory"
                  roles={roleSelectors}
                  models={models}
                  directory={directory ?? undefined}
                  disabled={ompLoading}
                  label={t('settings.omp.modelRoles.role.memory.label')}
                  info={t('settings.omp.modelRoles.role.memory.desc')}
                  settingsItem="omp.modelRoles.memory"
                  onChange={handleMemoryRoleChange}
                />
              </div>
            ) : null}

            {currentBackend === 'sharpshooter' && backendById.has('sharpshooter.model') ? (
              <OmpRowControl
                setting={backendById.get('sharpshooter.model')!}
                value={ompForm['sharpshooter.model'] !== undefined ? ompForm['sharpshooter.model'] : backendById.get('sharpshooter.model')!.value}
                disabled={ompLoading}
                onChange={(val) => void updateOmpSetting('sharpshooter.model', val)}
              />
            ) : null}
          </div>
        </SettingsSection>

        {/* Autolearn */}
        <SettingsSection
          title={t('settings.memory.section.autolearn.title')}
          description={t('settings.memory.section.autolearn.description')}
          settingsItem="memory.section.autolearn"
        >
          <div className={SETTINGS_OPTION_STACK_CLASS}>
            {['autolearn.enabled', 'autolearn.autoContinue'].map((id) => {
              const s = backendById.get(id);
              if (!s) return null;
              return (
                <OmpRowControl
                  key={id}
                  setting={s}
                  value={ompForm[id] !== undefined ? ompForm[id] : s.value}
                  disabled={ompLoading}
                  onChange={(val) => void updateOmpSetting(id, val)}
                />
              );
            })}
          </div>
        </SettingsSection>

        {/* MnemoPi Options */}
        {(currentBackend === 'mnemopi' || currentBackend === 'off') ? (
          <SettingsSection
            title={t('settings.memory.section.mnemopi.title')}
            description={t('settings.memory.section.mnemopi.description')}
            settingsItem="memory.section.mnemopi"
          >
            <div className={SETTINGS_OPTION_STACK_CLASS}>
              {mnemopiKeys.map((id) => {
                const s = backendById.get(id);
                if (!s) return null;
                return (
                  <OmpRowControl
                    key={id}
                    setting={s}
                    value={ompForm[id] !== undefined ? ompForm[id] : s.value}
                    disabled={ompLoading}
                    onChange={(val) => void updateOmpSetting(id, val)}
                  />
                );
              })}
            </div>
          </SettingsSection>
        ) : null}

        {/* Hindsight Options */}
        {(currentBackend === 'hindsight' || currentBackend === 'off') ? (
          <SettingsSection
            title={t('settings.memory.section.hindsight.title')}
            description={t('settings.memory.section.hindsight.description')}
            settingsItem="memory.section.hindsight"
          >
            <div className={SETTINGS_OPTION_STACK_CLASS}>
              {hindsightKeys.map((id) => {
                const s = backendById.get(id);
                if (!s) return null;
                return (
                  <OmpRowControl
                    key={id}
                    setting={s}
                    value={ompForm[id] !== undefined ? ompForm[id] : s.value}
                    disabled={ompLoading}
                    onChange={(val) => void updateOmpSetting(id, val)}
                  />
                );
              })}
            </div>
          </SettingsSection>
        ) : null}
      </div>
    </SettingsPageLayout>
  );
};
