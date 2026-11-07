import React from 'react';

import type { GitCommitExtrasFailure } from '@/lib/api/types';
import type { DesktopSettings } from '@/lib/desktop';
import { GitCommitExtrasError } from '@/lib/gitApiHttp';
import { loadDesktopSettings, updateDesktopSettings, type SettingsSyncedDetail } from '@/lib/persistence';

/**
 * How a commit is made: whether the commit panel offers message generation,
 * whether that completion asks the model to reason, and whether the commit
 * itself carries a Git note and a Change-Id trailer.
 *
 * Generation stays on by default: it is what every install did before these
 * settings existed. The other three stay off so a commit keeps touching only
 * what the user staged — a trailer or a note is an explicit choice.
 */
export const COMMIT_SETTING_DEFAULTS = {
 generateCommitMessages: true,
 commitMessageReasoning: false,
 commitMessageNotes: false,
 commitMessageChangeId: false,
} as const;

type CommitSettingKey = keyof typeof COMMIT_SETTING_DEFAULTS;
type CommitSettings = { -readonly [K in CommitSettingKey]: boolean };

const COMMIT_SETTING_KEYS = Object.keys(COMMIT_SETTING_DEFAULTS) as CommitSettingKey[];

/**
 * Resolve the effective choice. A stored value wins even when it is `false`;
 * only an absent value falls back to the documented default. A malformed value
 * is absent, not inverted.
 */
export const readCommitSettings = (settings: DesktopSettings | null | undefined): CommitSettings => {
 const result = { ...COMMIT_SETTING_DEFAULTS } as CommitSettings;
 if (!settings) return result;
 for (const key of COMMIT_SETTING_KEYS) {
  const value = settings[key];
  if (typeof value === 'boolean') result[key] = value;
 }
 return result;
};

/**
 * Live commit settings for the current window. Every consumer (the settings
 * page, the desktop commit panel, the mobile changes surface) reads from this
 * hook, so a toggle reaches all of them through the synced settings document,
 * and a window that never loaded the document still gets the defaults.
 */
export const useCommitSettings = (): {
 settings: CommitSettings;
 isLoading: boolean;
 /**
  * Apply a toggle once, locally and on the server. The local write makes the
  * checkbox respond immediately; the synced document that comes back is the
  * authority, and a refused write restores the previous value.
  */
 setSetting: (key: CommitSettingKey, value: boolean) => void;
} => {
 const [settings, setSettings] = React.useState<CommitSettings>(() => readCommitSettings(null));
 const [isLoading, setIsLoading] = React.useState(true);

 React.useEffect(() => {
  let active = true;
  void loadDesktopSettings()
   .then((document) => {
    if (!active) return;
    setSettings(readCommitSettings(document));
   })
   .catch((error) => {
    // A failed read keeps the defaults: they describe the behavior this
    // install already has, so the panel stays usable.
    console.warn('Failed to load commit settings:', error);
   })
   .finally(() => {
    if (active) setIsLoading(false);
   });

  const handleSynced = (event: Event) => {
   const detail = (event as CustomEvent<SettingsSyncedDetail>).detail;
   if (!detail?.settings) return;
   setSettings(readCommitSettings(detail.settings));
  };
  window.addEventListener('openchamber:settings-synced', handleSynced);
  return () => {
   active = false;
   window.removeEventListener('openchamber:settings-synced', handleSynced);
  };
 }, []);

 const setSetting = React.useCallback((key: CommitSettingKey, value: boolean) => {
  setSettings((current) => ({ ...current, [key]: value }));
  void updateDesktopSettings({ [key]: value }).then((result) => {
   if (!result.ok) setSettings((current) => ({ ...current, [key]: !value }));
  });
 }, []);

 return { settings, isLoading, setSetting };
};

/** The translated warning for a commit whose requested extras did not all apply. */
export const commitExtrasFailureKey = (failure: GitCommitExtrasFailure): 'gitView.toast.commitExtrasBoth' | 'gitView.toast.commitExtrasChangeId' | 'gitView.toast.commitExtrasNotes' => {
 const extras = new Set(failure.extras.failed.map((entry) => entry.extra));
 if (extras.size > 1) return 'gitView.toast.commitExtrasBoth';
 return extras.has('changeId') ? 'gitView.toast.commitExtrasChangeId' : 'gitView.toast.commitExtrasNotes';
};

/**
 * The commit that was created even though a requested extra did not apply.
 * `null` means a plain failed commit; anything else means the commit exists and
 * only these extras are missing.
 */
export const readCommitExtrasFailure = (error: unknown): GitCommitExtrasFailure | null => (
 error instanceof GitCommitExtrasError ? error.result : null
);
