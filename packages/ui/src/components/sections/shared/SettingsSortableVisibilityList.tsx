import React from 'react';
import { SettingsCheckboxRow } from './SettingsSection';
import { SettingsSortableList } from './SettingsSortableList';

interface SortableVisibilityItem {
  id: string;
  label: string;
  visible: boolean;
  /** Its checkbox cannot change, such as the last item that must stay shown. */
  locked?: boolean;
  /** Opens a new group: a divider sits above it. */
  groupStart?: boolean;
}

/**
 * A list the user orders by dragging and filters with checkboxes: the rail's
 * panels on desktop, the workspace tabs on a phone. The drag mechanics live in
 * `SettingsSortableList`; this adds the visibility checkbox to each row.
 */
export const SettingsSortableVisibilityList: React.FC<{
  items: SortableVisibilityItem[];
  onVisibleChange: (id: string, visible: boolean) => void;
  /** The new order of every listed id, after a drop that moved something. */
  onReorder: (ids: string[]) => void;
  /** Each row's `data-settings-item` is this prefix plus the item id. */
  settingsItemPrefix: string;
  /** What a screen reader hears about picking a row up with the keyboard. */
  dragInstructions: string;
  /** For a host that must not close or steal arrow keys mid-drag, such as a dialog. */
  onDraggingChange?: (dragging: boolean) => void;
}> = ({ items, onVisibleChange, onReorder, settingsItemPrefix, dragInstructions, onDraggingChange }) => (
  <SettingsSortableList
    items={items}
    onReorder={onReorder}
    dragInstructions={dragInstructions}
    onDraggingChange={onDraggingChange}
    renderRow={(item) => (
      <SettingsCheckboxRow
        settingsItem={`${settingsItemPrefix}${item.id}`}
        checked={item.visible}
        onChange={(visible) => onVisibleChange(item.id, visible)}
        disabled={item.locked}
        label={item.label}
        ariaLabel={item.label}
        className="min-w-0 flex-1"
      />
    )}
  />
);
