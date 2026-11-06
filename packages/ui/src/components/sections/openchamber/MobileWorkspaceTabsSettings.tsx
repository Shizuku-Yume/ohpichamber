import React from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SettingsCheckboxRow, SettingsSection } from '@/components/sections/shared/SettingsSection';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { orderMobileWorkspaceTabs, shownMobileWorkspaceTabs, type MobileWorkspaceTab } from '@/lib/mobileWorkspaceTabs';
import { useUIStore } from '@/stores/useUIStore';

const TAB_LABEL_KEYS = {
  status: 'chat.workStatus.ariaLabel',
  changes: 'mobile.menu.git',
  files: 'mobile.menu.files',
  terminal: 'mobile.menu.terminal',
  notes: 'contextRail.surface.notes',
} satisfies Record<MobileWorkspaceTab, I18nKey>;

interface SortableVisibilityItem {
  id: MobileWorkspaceTab;
  label: string;
  visible: boolean;
  /** Its checkbox cannot change, such as the last item that must stay shown. */
  locked?: boolean;
}

const SortableVisibilityRow: React.FC<{
  item: SortableVisibilityItem;
  settingsItem: string;
  onVisibleChange: (visible: boolean) => void;
}> = ({ item, settingsItem, onVisibleChange }) => {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative flex items-center gap-2', isDragging && 'z-10 opacity-60')}
    >
      <Button
        ref={setActivatorNodeRef}
        variant="ghost"
        size="icon"
        {...attributes}
        {...listeners}
        aria-label={t('contextRail.configure.reorder', { label: item.label })}
        className="shrink-0 touch-none select-none cursor-grab text-muted-foreground hover:bg-transparent active:cursor-grabbing"
      >
        <Icon name="draggable" className="size-4" />
      </Button>
      <SettingsCheckboxRow
        settingsItem={settingsItem}
        checked={item.visible}
        onChange={onVisibleChange}
        disabled={item.locked}
        label={item.label}
        ariaLabel={item.label}
        className="min-w-0 flex-1"
      />
    </div>
  );
};

const SettingsSortableVisibilityList: React.FC<{
  items: SortableVisibilityItem[];
  onVisibleChange: (id: MobileWorkspaceTab, visible: boolean) => void;
  onReorder: (ids: MobileWorkspaceTab[]) => void;
  settingsItemPrefix: string;
  dragInstructions: string;
}> = ({ items, onVisibleChange, onReorder, settingsItemPrefix, dragInstructions }) => {
  const { t } = useI18n();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to).map((item) => item.id));
  };
  const accessibility = React.useMemo(() => {
    const position = (activeId: string | number, overId: string | number = activeId) => {
      const item = items.find((entry) => entry.id === activeId);
      if (!item) return undefined;
      return t('contextRail.configure.position', {
        label: item.label,
        position: items.findIndex((entry) => entry.id === overId) + 1,
        count: items.length,
      });
    };
    const announcements: Announcements = {
      onDragStart: ({ active }) => position(active.id),
      onDragOver: ({ active, over }) => (over ? position(active.id, over.id) : undefined),
      onDragEnd: ({ active, over }) => (over ? position(active.id, over.id) : t('contextRail.configure.dragCancelled')),
      onDragCancel: () => t('contextRail.configure.dragCancelled'),
    };
    return { screenReaderInstructions: { draggable: dragInstructions }, announcements };
  }, [dragInstructions, items, t]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={accessibility}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">
          {items.map((item) => (
            <SortableVisibilityRow
              key={item.id}
              item={item}
              settingsItem={`${settingsItemPrefix}${item.id}`}
              onVisibleChange={(visible) => onVisibleChange(item.id, visible)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

/**
 * Order and visibility of the phone's workspace panel tabs. Stored per
 * device: a phone and a laptop are set up apart. The last tab shown cannot be
 * hidden.
 */
export const MobileWorkspaceTabsSettings: React.FC = () => {
  const { t } = useI18n();
  const order = useUIStore((state) => state.mobileWorkspaceTabOrder);
  const hidden = useUIStore((state) => state.mobileWorkspaceHiddenTabs);
  const setOrder = useUIStore((state) => state.setMobileWorkspaceTabOrder);
  const setVisible = useUIStore((state) => state.setMobileWorkspaceTabVisible);

  const items = React.useMemo(() => {
    const shown = shownMobileWorkspaceTabs(order, hidden);
    return orderMobileWorkspaceTabs(order).map((id) => ({
      id,
      label: t(TAB_LABEL_KEYS[id]),
      visible: shown.includes(id),
      locked: shown.length === 1 && shown.includes(id),
    }));
  }, [hidden, order, t]);

  return (
    <SettingsSection
      title={t('settings.layout.general.mobileTabs.title')}
      info={t('settings.layout.general.mobileTabs.info')}
      settingsItem="layout.mobile-workspace-tabs"
    >
      <SettingsSortableVisibilityList
        items={items}
        onVisibleChange={(id, visible) => {
          setVisible(id, visible);
        }}
        onReorder={setOrder}
        settingsItemPrefix="layout.mobile-workspace-tabs."
        dragInstructions={t('settings.layout.general.mobileTabs.dragInstructions')}
      />
    </SettingsSection>
  );
};
