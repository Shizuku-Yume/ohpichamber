import React from 'react';
import { SettingsChipGroup, SettingsFieldRow, SETTINGS_SELECT_ROW_TRIGGER_CLASS } from '@/components/sections/shared/SettingsSection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { reportSettingsSaveState } from '@/lib/persistence';
import { getRuntimeKey } from '@/lib/runtime-switch';
import { useSessionWarmingStore, WARMING_DURATION_STEPS } from '@/stores/useSessionWarmingStore';

const DURATION_KEYS = {
  30: 'settings.openchamber.defaults.sessionWarming.duration.30',
  60: 'settings.openchamber.defaults.sessionWarming.duration.60',
  120: 'settings.openchamber.defaults.sessionWarming.duration.120',
  180: 'settings.openchamber.defaults.sessionWarming.duration.180',
} as const;

/** The two states this host offers: chosen sessions warm, or nothing warm. */
type WarmingChoice = 'off' | 'session';

/**
 * Per-session warming, owned by the Host (`GET/PUT /api/session-warming`):
 * while a chosen session sits idle, the server sends a small keep-alive
 * request so the provider keeps its cached context. The workspace's own cache
 * warming is the separate `SessionWarmingCheckbox`; this control chooses which
 * sessions take part and how long they stay warm after a reply.
 *
 * A server that does not offer per-session warming (an older Host) reports
 * `unavailable` and the field hides: there is nothing truthful to choose.
 */
export const SessionWarmingModeField: React.FC = () => {
  const { t } = useI18n();
  const status = useSessionWarmingStore((state) => state.status);
  const enabled = useSessionWarmingStore((state) => state.enabled);
  const minutes = useSessionWarmingStore((state) => state.minutes);
  const setMode = useSessionWarmingStore((state) => state.setMode);
  const setMinutes = useSessionWarmingStore((state) => state.setMinutes);
  const refresh = useSessionWarmingStore((state) => state.refresh);
  // The choice shown while a write is in flight, so the chips answer at once.
  const [pendingMode, setPendingMode] = React.useState<WarmingChoice | null>(null);
  const [pendingMinutes, setPendingMinutes] = React.useState<number | null>(null);
  const latestWrite = React.useRef(0);

  React.useEffect(() => {
    const runtimeKey = getRuntimeKey();
    void refresh(() => getRuntimeKey() === runtimeKey).catch((error: unknown) => {
      console.warn('[session-warming] failed to read the snapshot', error);
    });
  }, [refresh]);

  const mode: WarmingChoice | null = pendingMode ?? (status === 'ready' ? (enabled ? 'session' : 'off') : null);
  const selectedMinutes = pendingMinutes ?? minutes;

  /** Runs one write with the shared save feedback; only the newest write settles the chips. */
  const save = React.useCallback(async (write: () => Promise<void>, settle: (latest: boolean) => void) => {
    const id = ++latestWrite.current;
    reportSettingsSaveState('saving');
    try {
      await write();
      reportSettingsSaveState('saved');
    } catch (error) {
      console.warn('[session-warming] failed to save', error);
      reportSettingsSaveState('error');
    } finally {
      settle(id === latestWrite.current);
    }
  }, []);

  const handleModeChange = (next: WarmingChoice) => {
    setPendingMode(next);
    void save(() => setMode(next), (latest) => {
      if (latest) setPendingMode(null);
    });
  };

  const handleMinutesChange = (next: number) => {
    setPendingMinutes(next);
    void save(() => setMinutes('session', next), (latest) => {
      if (latest) setPendingMinutes(null);
    });
  };

  if (status === 'unavailable') return null;

  const step = WARMING_DURATION_STEPS.find((candidate) => candidate === selectedMinutes);
  return (
    <SettingsFieldRow
      settingsItem="sessions.warming"
      label={t('settings.openchamber.defaults.sessionWarming.label')}
      info={t('settings.openchamber.defaults.sessionWarming.info')}
    >
      <SettingsChipGroup<WarmingChoice>
        aria-label={t('settings.openchamber.defaults.sessionWarming.aria')}
        value={mode ?? 'off'}
        onChange={(next) => {
          if (mode !== null && next !== mode) handleModeChange(next);
        }}
        options={[
          { value: 'off', label: t('settings.openchamber.defaults.sessionWarming.off'), disabled: mode === null },
          { value: 'session', label: t('settings.openchamber.defaults.sessionWarming.session'), disabled: mode === null },
        ]}
      />
      {/* Always drawn, disabled while warming is off, so choosing a mode moves nothing. */}
      <Select
        value={step === undefined ? undefined : String(step)}
        onValueChange={(next) => {
          const picked = Number(next);
          if (picked !== selectedMinutes) handleMinutesChange(picked);
        }}
        disabled={mode !== 'session'}
      >
        <SelectTrigger className={SETTINGS_SELECT_ROW_TRIGGER_CLASS} aria-label={t('settings.openchamber.defaults.sessionWarming.durationAria')}>
          <SelectValue placeholder={t('settings.openchamber.defaults.sessionWarming.duration')}>
            {step === undefined ? undefined : t(DURATION_KEYS[step])}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {WARMING_DURATION_STEPS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {t(DURATION_KEYS[option])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsFieldRow>
  );
};
