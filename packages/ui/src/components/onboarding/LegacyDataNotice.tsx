import React from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { runtimeFetch } from '@/lib/runtime-fetch';
import { getRuntimeKey, subscribeRuntimeEndpointChanged } from '@/lib/runtime-switch';
import { getSafeStorage } from '@/stores/utils/safeStorage';
import { useUIStore } from '@/stores/useUIStore';

type LegacyDataPresence = 'present' | 'absent' | 'error';
const dismissalKey = (runtimeKey: string) => `legacy-data-notice-dismissed:${runtimeKey}`;

const isLegacyNoticeDismissed = (runtimeKey: string): boolean => {
  try {
    return getSafeStorage().getItem(dismissalKey(runtimeKey)) === 'true';
  } catch {
    return false;
  }
};

const dismissLegacyNotice = (runtimeKey: string): void => {
  getSafeStorage().setItem(dismissalKey(runtimeKey), 'true');
};

const readLegacyDataPresence = async (signal: AbortSignal): Promise<'present' | 'absent'> => {
  const response = await runtimeFetch('/api/host/legacy-data', { signal });
  if (!response.ok) throw new Error('Legacy presence unavailable');
  const value: unknown = await response.json();
  if (typeof value !== 'object' || value === null || !('present' in value) || typeof value.present !== 'boolean' || Object.keys(value).length !== 1) {
    throw new Error('Invalid legacy presence response');
  }
  return value.present ? 'present' : 'absent';
};

type LegacyDataNoticeProps = {
  /** Mobile shell hook: switching Settings must also open its app-level surface. */
  onOpenSettings?: (stage: 'nav' | 'page-content') => void;
};

export const LegacyDataNotice: React.FC<LegacyDataNoticeProps> = ({ onOpenSettings }) => {
  const { t } = useI18n();
  const [runtimeKey, setRuntimeKey] = React.useState(getRuntimeKey);
  const [state, setState] = React.useState<'loading' | LegacyDataPresence>('loading');
  const [dismissed, setDismissed] = React.useState(() => isLegacyNoticeDismissed(runtimeKey));

  React.useEffect(() => subscribeRuntimeEndpointChanged(() => setRuntimeKey(getRuntimeKey())), []);
  React.useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    const alreadyDismissed = isLegacyNoticeDismissed(runtimeKey);
    setDismissed(alreadyDismissed);
    if (alreadyDismissed) {
      setState('absent');
      return () => controller.abort();
    }
    void readLegacyDataPresence(controller.signal).then(result => {
      if (!controller.signal.aborted) setState(result);
    }, () => {
      if (!controller.signal.aborted) setState('error');
    });
    return () => controller.abort();
  }, [runtimeKey]);

  if (dismissed || state !== 'present') return null;
  const dismiss = () => {
    dismissLegacyNotice(runtimeKey);
    setDismissed(true);
  };
  const configureProviders = () => {
    const ui = useUIStore.getState();
    ui.setSettingsProvidersConnectRequested(true);
    ui.setSettingsPage('providers');
    ui.setSettingsDialogOpen(true);
    onOpenSettings?.('page-content');
    dismiss();
  };
  return (
    <aside role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-lg border bg-background p-4 shadow-lg">
      <h2 className="typography-ui-header">{t('startup.legacyNotice.title')}</h2>
      <p className="mt-2 typography-body text-muted-foreground">{t('startup.legacyNotice.descriptionGeneric')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={configureProviders}>{t('startup.legacyNotice.action')}</Button>
        <Button variant="outline" onClick={dismiss}>{t('startup.legacyNotice.dismiss')}</Button>
      </div>
    </aside>
  );
};
