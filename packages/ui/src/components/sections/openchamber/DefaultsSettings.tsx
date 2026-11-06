import React from 'react';
import { CanonicalApiError, canonicalClient } from '@/api/canonicalClient';
import type { Model, OmpSettingsState } from '@openchamber/agent-contract';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SettingsSection,
  SettingsFieldRow,
  SettingsCheckboxRow,
  SettingsInset,
  SETTINGS_OPTION_STACK_CLASS,
  SETTINGS_SELECT_ROW_TRIGGER_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { SessionWarmingCheckbox } from './SessionWarmingCheckbox';
import { useSettingsDirectory } from '@/hooks/useSettingsDirectory';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { updateDesktopSettings } from '@/lib/persistence';
import { useSessionDisplayStore } from '@/stores/useSessionDisplayStore';
import { useUIStore } from '@/stores/useUIStore';

type SessionModeValue = 'main' | 'plan' | 'vibe' | 'goal';

const SESSION_MODE_OPTIONS: readonly { value: SessionModeValue; labelKey: I18nKey }[] = [
  { value: 'main', labelKey: 'chat.chatInput.mode.main' },
  { value: 'plan', labelKey: 'chat.chatInput.mode.plan' },
  { value: 'vibe', labelKey: 'chat.chatInput.mode.vibe' },
  { value: 'goal', labelKey: 'chat.chatInput.mode.goal' },
] as const;


const DEFAULT_EFFORT_OPTIONS: readonly { value: string; labelKey: I18nKey }[] = [
  { value: 'minimal', labelKey: 'settings.omp.modelRoles.effort.minimal' },
  { value: 'low', labelKey: 'settings.omp.modelRoles.effort.low' },
  { value: 'medium', labelKey: 'settings.omp.modelRoles.effort.medium' },
  { value: 'high', labelKey: 'settings.omp.modelRoles.effort.high' },
  { value: 'max', labelKey: 'settings.omp.modelRoles.effort.max' },
] as const;

function parseRoleSelector(selector: unknown): { model: string; effort: string } {
  if (typeof selector !== 'string') return { model: '', effort: '' };
  const trimmed = selector.trim();
  if (!trimmed) return { model: '', effort: '' };
  const colonIndex = trimmed.lastIndexOf(':');
  if (colonIndex > 0) {
    const base = trimmed.slice(0, colonIndex);
    const suffix = trimmed.slice(colonIndex + 1);
    const knownEfforts = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'auto'];
    if (knownEfforts.includes(suffix.toLowerCase())) {
      return { model: base, effort: suffix };
    }
  }
  return { model: trimmed, effort: '' };
}

function formatRoleSelector(model: string, effort: string): string {
  const trimmedModel = model.trim();
  if (!trimmedModel) return '';
  const trimmedEffort = effort.trim();
  if (!trimmedEffort || trimmedEffort === 'default' || trimmedEffort === '__default__') return trimmedModel;
  return `${trimmedModel}:${trimmedEffort}`;
}

function parseSafeRolesRecord(val: unknown): Record<string, string> {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(val)) {
      if (typeof v === 'string') {
        result[k] = v;
      }
    }
    return result;
  }
  return {};
}

export const DefaultsSettings: React.FC = () => {
  const { t } = useI18n();
  const directory = useSettingsDirectory();

  const showChatsSection = useSessionDisplayStore((state) => state.showChatsSection);
  const setShowChatsSection = useSessionDisplayStore((state) => state.setShowChatsSection);
  const showDeletionDialog = useUIStore((state) => state.showDeletionDialog);
  const setShowDeletionDialog = useUIStore((state) => state.setShowDeletionDialog);
  const defaultSessionMode = useUIStore((state) => state.defaultSessionMode);
  const setDefaultSessionMode = useUIStore((state) => state.setDefaultSessionMode);
  const [ompState, setOmpState] = React.useState<OmpSettingsState | null>(null);
  const [models, setModels] = React.useState<Model[]>([]);
  const [isSavingOmp, setIsSavingOmp] = React.useState(false);


  const ompStateRef = React.useRef<OmpSettingsState | null>(null);
  ompStateRef.current = ompState;

  React.useEffect(() => {
    if (!directory) {
      setOmpState(null);
      setModels([]);
      return;
    }

    const abort = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        const workspace = await canonicalClient.resolveWorkspace(directory);
        if (cancelled || abort.signal.aborted) return;
        const [snapshot, modelCatalog] = await Promise.all([
          canonicalClient.getOmpSettings(workspace.workspaceId, abort.signal),
          canonicalClient.getModels(workspace.workspaceId).catch(() => null),
        ]);
        if (cancelled || abort.signal.aborted) return;
        setOmpState(snapshot);
        if (modelCatalog?.models) {
          setModels(modelCatalog.models);
        }
      } catch (err) {
        if (!cancelled && !(err instanceof Error && err.name === 'AbortError')) {
          setOmpState(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [directory]);

  const modelRolesSetting = ompState?.settings.find((s) => s.id === 'modelRoles');
  const rolesMap = React.useMemo(
    () => parseSafeRolesRecord(modelRolesSetting?.value),
    [modelRolesSetting?.value],
  );

  const { model: selectedModelId, effort: selectedEffort } = React.useMemo(
    () => parseRoleSelector(rolesMap.default),
    [rolesMap.default],
  );

  const matchedModel = React.useMemo(
    () => models.find((m) => `${m.provider}/${m.modelId}` === selectedModelId),
    [models, selectedModelId],
  );

  const supportsReasoning = Boolean(
    matchedModel?.reasoningEffortSupported ||
      (matchedModel?.reasoningOptions && matchedModel.reasoningOptions.length > 0),
  );

  const updateRolesOnServer = React.useCallback(
    async (nextRoles: Record<string, string>) => {
      const currentState = ompStateRef.current;
      if (!currentState) return;
      setIsSavingOmp(true);
      try {
        let next: OmpSettingsState;
        try {
          next = await canonicalClient.updateOmpSettings(currentState.workspaceId, {
            expectedRevision: currentState.revision,
            changes: [{ id: 'modelRoles', value: nextRoles }],
          });
        } catch (error) {
          if (error instanceof CanonicalApiError && error.problem.status === 409) {
            const latest = await canonicalClient.getOmpSettings(currentState.workspaceId);
            const latestRoles = parseSafeRolesRecord(latest.settings.find((s) => s.id === 'modelRoles')?.value);
            const merged = { ...latestRoles, default: nextRoles.default };
            next = await canonicalClient.updateOmpSettings(latest.workspaceId, {
              expectedRevision: latest.revision,
              changes: [{ id: 'modelRoles', value: merged }],
            });
          } else {
            throw error;
          }
        }
        setOmpState(next);
      } catch (err) {
        console.warn('Failed to update default model role:', err);
      } finally {
        setIsSavingOmp(false);
      }
    },
    [],
  );

  const handleDefaultModelChange = React.useCallback(
    (val: string) => {
      const nextRoles = { ...rolesMap };
      if (val === '__inherit__') {
        delete nextRoles.default;
      } else {
        const nextModel = models.find((m) => `${m.provider}/${m.modelId}` === val);
        const nextSupportsReasoning = Boolean(
          nextModel?.reasoningEffortSupported ||
            (nextModel?.reasoningOptions && nextModel.reasoningOptions.length > 0),
        );
        const effortToKeep = nextSupportsReasoning ? selectedEffort : '';
        nextRoles.default = formatRoleSelector(val, effortToKeep);
      }
      void updateRolesOnServer(nextRoles);
    },
    [models, rolesMap, selectedEffort, updateRolesOnServer],
  );

  const handleDefaultEffortChange = React.useCallback(
    (val: string) => {
      const nextRoles = { ...rolesMap };
      const effort = val === '__default__' ? '' : val;
      nextRoles.default = formatRoleSelector(selectedModelId, effort);
      void updateRolesOnServer(nextRoles);
    },
    [rolesMap, selectedModelId, updateRolesOnServer],
  );

  return (
    <SettingsSection title={t('settings.openchamber.defaults.title')} divider={false}>
      <div className="space-y-4">
        <SettingsFieldRow
          settingsItem="sessions.default-model"
          label={t('settings.openchamber.defaults.field.defaultModel')}
        >
          <div className="flex flex-col @xl:flex-row gap-2 items-start @xl:items-center">
            <Select
              value={selectedModelId || '__inherit__'}
              onValueChange={handleDefaultModelChange}
              disabled={isSavingOmp || !ompState}
            >
              <SelectTrigger
                className={SETTINGS_SELECT_ROW_TRIGGER_CLASS}
                aria-label={t('settings.openchamber.defaults.field.defaultModel')}
              >
                <SelectValue placeholder={t('settings.omp.modelRoles.inheritFallback')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__inherit__">
                  {t('settings.omp.modelRoles.inheritFallback')}
                </SelectItem>
                {models.map((m) => {
                  const id = `${m.provider}/${m.modelId}`;
                  return (
                    <SelectItem key={id} value={id}>
                      {m.name || m.modelId} ({m.provider})
                    </SelectItem>
                  );
                })}
                {selectedModelId && !models.some((m) => `${m.provider}/${m.modelId}` === selectedModelId) && (
                  <SelectItem value={selectedModelId}>
                    {selectedModelId} ({t('settings.omp.modelRoles.customModel')})
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {supportsReasoning && (
              <Select
                value={selectedEffort || '__default__'}
                onValueChange={handleDefaultEffortChange}
                disabled={isSavingOmp || !ompState}
              >
                <SelectTrigger
                  className={SETTINGS_SELECT_ROW_TRIGGER_CLASS}
                  aria-label={t('settings.openchamber.defaults.field.defaultThinking')}
                >
                  <SelectValue placeholder={t('settings.omp.modelRoles.thinkingDefault')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">
                    {t('settings.omp.modelRoles.thinkingDefault')}
                  </SelectItem>
                  {(matchedModel?.reasoningOptions && matchedModel.reasoningOptions.length > 0
                    ? matchedModel.reasoningOptions.map((opt) => ({
                        value: opt.reasoningEffort,
                        label: opt.label,
                      }))
                    : DEFAULT_EFFORT_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: t(opt.labelKey),
                      }))
                  ).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </SettingsFieldRow>

        <SettingsFieldRow
          settingsItem="sessions.default-mode"
          label={t('chat.chatInput.mode.label')}
        >
          <Select value={defaultSessionMode} onValueChange={(val) => setDefaultSessionMode(val as SessionModeValue)}>
            <SelectTrigger
              className={SETTINGS_SELECT_ROW_TRIGGER_CLASS}
              aria-label={t('chat.chatInput.mode.label')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_MODE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsFieldRow>

        <SettingsInset className={SETTINGS_OPTION_STACK_CLASS}>
          <SettingsCheckboxRow
            settingsItem="sessions.deletion-dialog"
            checked={showDeletionDialog}
            onChange={(checked) => {
              setShowDeletionDialog(checked);
              void updateDesktopSettings({ showDeletionDialog: checked });
            }}
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
      </div>
    </SettingsSection>
  );
};
