import React from 'react';

/**
 * Reports a sortable drag to the Settings window that hosts it. The window
 * is a Base UI dialog: it stops arrow keys at its popup and closes on Escape,
 * while dnd-kit reads both on the document. The window uses the report to
 * keep those keys for the drag. Null outside a Settings window.
 */
export const SettingsDialogDragContext = React.createContext<((dragging: boolean) => void) | null>(null);
