/* eslint-disable react-refresh/only-export-components */
import React from 'react';

export type MobileAppActions = {
  /** Open the Changes surface as a modal and (optionally) navigate it to a specific diff. */
  openChanges: (options?: { diffPath?: string | null; staged?: boolean }) => void;
  /** Open the Files surface as a modal. */
  openFiles: () => void;
  /** Open the Settings surface as a modal. */
  openSettings: () => void;
  /** Open the issues and PRs board page; what it shows is set in its store first. */
  openSourceBoard: () => void;
};

type MobileSettingsStage = 'nav' | 'page-content';

/**
 * The mobile shell's app-level Settings surface contract: switching to Settings
 * also seeds the stage its SettingsView mounts at (the legacy notice needs the
 * Providers page directly). Shared so rendered tests exercise the same action.
 */
export const useMobileSettingsSurfaceOpener = (
  setInitialMobileStage: (stage: MobileSettingsStage) => void,
  openSurface: (surface: 'settings') => void,
): ((stage: MobileSettingsStage) => void) => React.useCallback((stage) => {
  setInitialMobileStage(stage);
  openSurface('settings');
}, [openSurface, setInitialMobileStage]);

const DedicatedMobileAppContext = React.createContext<MobileAppActions | null>(null);

export const DedicatedMobileAppProvider: React.FC<{
  actions: MobileAppActions;
  children: React.ReactNode;
}> = ({ actions, children }) => (
  <DedicatedMobileAppContext.Provider value={actions}>{children}</DedicatedMobileAppContext.Provider>
);

/**
 * Returns the dedicated mobile app's surface-opening actions, or null when
 * not inside the dedicated mobile root. Components living in shared chat /
 * input code can use this to route navigation to mobile-native surfaces
 * (e.g. open the Changes diff for a file) instead of
 * desktop sidebars.
 */
export const useMobileAppActions = (): MobileAppActions | null => React.useContext(DedicatedMobileAppContext);
