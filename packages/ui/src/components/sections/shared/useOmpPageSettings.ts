import React from 'react';
import type {
  OmpSetting,
  OmpSettingsState,
  OmpSettingValue,
} from '@openchamber/agent-contract';
import { CanonicalApiError, canonicalClient } from '@/api/canonicalClient';
import { useSettingsDirectory } from '@/hooks/useSettingsDirectory';

export interface UseOmpPageSettingsResult {
  readonly state: OmpSettingsState | null;
  readonly form: Record<string, OmpSettingValue>;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly pageSettings: readonly OmpSetting[];
  readonly getSectionSettings: (section: string) => readonly OmpSetting[];
  readonly updateSetting: (settingOrId: OmpSetting | string, value: OmpSettingValue) => Promise<void>;
  readonly setState: React.Dispatch<React.SetStateAction<OmpSettingsState | null>>;
  readonly setForm: React.Dispatch<React.SetStateAction<Record<string, OmpSettingValue>>>;
}

/**
 * Loads, filters and updates OMP settings placed on a specific OpenChamber page.
 * Manages optimistic local updates and 409 CAS retries against the Host Gateway.
 */
export function useOmpPageSettings(page: string): UseOmpPageSettingsResult {
  const directory = useSettingsDirectory();
  const [state, setState] = React.useState<OmpSettingsState | null>(null);
  const [form, setForm] = React.useState<Record<string, OmpSettingValue>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const stateRef = React.useRef<OmpSettingsState | null>(null);
  const scopeGeneration = React.useRef(0);

  React.useEffect(() => {
    let active = true;
    const generation = ++scopeGeneration.current;

    const load = async () => {
      if (!directory) {
        stateRef.current = null;
        setState(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const workspace = await canonicalClient.resolveWorkspace(directory);
        if (!active || generation !== scopeGeneration.current) return;
        const snapshot = await canonicalClient.getOmpSettings(workspace.workspaceId);
        if (!active || generation !== scopeGeneration.current) return;
        stateRef.current = snapshot;
        setState(snapshot);
        const values: Record<string, OmpSettingValue> = {};
        for (const s of snapshot.settings) {
          values[s.id] = s.value;
        }
        setForm(values);
      } catch (err) {
        console.warn(`Failed to load OMP settings for page ${page}:`, err);
      } finally {
        if (active && generation === scopeGeneration.current) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [directory, page]);

  const updateSetting = React.useCallback(
    async (settingOrId: OmpSetting | string, value: OmpSettingValue) => {
      const id = typeof settingOrId === 'string' ? settingOrId : settingOrId.id;
      const current = stateRef.current;
      if (!current) return;
      setForm((prev) => ({ ...prev, [id]: value }));
      setSaving(true);
      try {
        const next = await canonicalClient.updateOmpSettings(current.workspaceId, {
          expectedRevision: current.revision,
          changes: [{ id, value }],
        });
        stateRef.current = next;
        setState(next);
        setForm((prev) => ({ ...prev, [id]: next.settings.find((s) => s.id === id)?.value ?? value }));
      } catch (error) {
        if (error instanceof CanonicalApiError && error.problem.status === 409) {
          try {
            const latest = await canonicalClient.getOmpSettings(current.workspaceId);
            const next = await canonicalClient.updateOmpSettings(latest.workspaceId, {
              expectedRevision: latest.revision,
              changes: [{ id, value }],
            });
            stateRef.current = next;
            setState(next);
            setForm((prev) => ({ ...prev, [id]: next.settings.find((s) => s.id === id)?.value ?? value }));
            return;
          } catch {
            // Re-throw or fall back
          }
        }
        console.warn(`Failed to persist OMP setting ${id}:`, error);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const pageSettings = React.useMemo(() => {
    if (!state) return [];
    return state.settings.filter(
      (s) => s.placement.type === 'page' && s.placement.page === page,
    );
  }, [state, page]);

  const getSectionSettings = React.useCallback(
    (section: string) => {
      return pageSettings.filter((s) => s.placement.type === 'page' && s.placement.section === section);
    },
    [pageSettings],
  );

  return {
    state,
    form,
    loading,
    saving,
    pageSettings,
    getSectionSettings,
    updateSetting,
    setState,
    setForm,
  };
}
