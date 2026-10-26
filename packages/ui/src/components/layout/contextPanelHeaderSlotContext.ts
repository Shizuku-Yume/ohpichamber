import React from 'react';

/**
 * The panel header element the surface on screen may render its toolbar into,
 * or null everywhere else. See contextPanelHeaderSlot.tsx.
 */
export const ContextPanelHeaderSlotContext = React.createContext<HTMLElement | null>(null);
