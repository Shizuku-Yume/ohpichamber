import React from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { getRuntimeKey, subscribeRuntimeEndpointChanged } from '@/lib/runtime-switch';
import { useUIStore } from '@/stores/useUIStore';
import { dismissLegacyNotice, isLegacyNoticeDismissed, readLegacyDataPresence, type LegacyDataPresence } from './legacyDataNoticeHelpers';

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
