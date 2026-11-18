import React from 'react';
import { isDesktopShell, restartDesktopApp } from '@/lib/desktop';
import { DesktopConnectionRecovery, type RecoveryVariant } from './DesktopConnectionRecovery';
import { RemoteConnectionForm } from './RemoteConnectionForm';
import { desktopHostsGet, desktopHostsSet } from '@/lib/desktopHosts';

type RecoveryScreenProps = {
  /** Recovery variant */
  variant: RecoveryVariant;
  /** Host URL for recovery context */
  hostUrl?: string;
  /** Host label for recovery context */
  hostLabel?: string;
  /** Callback when user chooses remote */
  onChooseRemote?: () => void;
  /** Whether to show the remote connection form */
  showRemoteForm?: boolean;
  /** Callback when closing remote form */
  onCloseRemoteForm?: () => void;
  /** Whether retry action is in progress */
  isRetrying?: boolean;
  localAvailable?: boolean;
};

export function RecoveryScreen({
  variant,
  hostUrl,
  hostLabel,
  onChooseRemote,
  showRemoteForm = false,
  onCloseRemoteForm,
  isRetrying = false,
  localAvailable = true,
}: RecoveryScreenProps) {
  // Persist the user's first choice (local or remote)
  const persistFirstChoice = React.useCallback(async (choice: 'local' | 'remote') => {
    if (!isDesktopShell()) return;

    const config = await desktopHostsGet();
    await desktopHostsSet({
      ...config,
      // Only change defaultHostId when switching to local; remote keeps
      // whatever was there (or null) until a successful connect.
      ...(choice === 'local' ? { defaultHostId: 'local' } : {}),
      initialHostChoiceCompleted: true,
    });
  }, []);

  const handleRecoveryRetry = React.useCallback(async () => {
    // In desktop boot flow, restart the app so the native host can
    // re-evaluate the boot outcome.
    if (isDesktopShell()) {
      await restartDesktopApp();
      return;
    }

    window.location.reload();
  }, []);

  const handleRecoveryUseLocal = React.useCallback(async () => {
    // switch-default-to-local → persist local choice and restart
    await persistFirstChoice('local');

    if (isDesktopShell()) {
      await restartDesktopApp();
      return;
    }

    window.location.reload();
  }, [persistFirstChoice]);

  const handleRecoveryUseRemote = React.useCallback(() => {
    onChooseRemote?.();
  }, [onChooseRemote]);

  // Recovery mode — show recovery component first; only switch to remote form on explicit user action
  if (showRemoteForm) {
    // For remote-wrong-service, do NOT auto-populate the known bad URL
    const prefillUrl = variant === 'remote-wrong-service' ? '' : (hostUrl || '');
    const prefillLabel = variant === 'remote-wrong-service' ? '' : (hostLabel || '');
    return (
      <RemoteConnectionForm
        onBack={onCloseRemoteForm || (() => onChooseRemote?.())}
        initialUrl={prefillUrl}
        initialLabel={prefillLabel}
        isRecoveryMode={true}
        showInstancePicker={!localAvailable}
        onSwitchToLocal={localAvailable ? () => void handleRecoveryUseLocal() : undefined}
      />
    );
  }

  return (
    <DesktopConnectionRecovery
      variant={variant}
      hostLabel={hostLabel}
      hostUrl={hostUrl}
      onRetry={handleRecoveryRetry}
      onUseLocal={localAvailable ? handleRecoveryUseLocal : undefined}
      onUseRemote={handleRecoveryUseRemote}
      isRetrying={isRetrying}
    />
  );
}
