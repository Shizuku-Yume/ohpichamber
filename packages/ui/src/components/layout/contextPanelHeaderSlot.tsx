import React from 'react';
import { ContextPanelHeaderSlotContext } from './contextPanelHeaderSlotContext';

/**
 * Lets the active context-panel surface put its own toolbar into the panel
 * header instead of stacking a second row under it. ContextPanel provides the
 * header element only to the surface on screen; everywhere else (inactive
 * tabs, the mobile drawer, other hosts) the value is null and the toolbar
 * renders inline where it always did.
 */
export function ContextPanelHeaderSlotProvider({ value, children }: { value: HTMLElement | null; children: React.ReactNode }): React.ReactNode {
  return <ContextPanelHeaderSlotContext.Provider value={value}>{children}</ContextPanelHeaderSlotContext.Provider>;
}
