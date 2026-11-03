import { createJSONStorage } from 'zustand/middleware';
import { afterAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'window');
const testWindow = new Window();
Object.defineProperty(globalThis, 'window', { configurable: true, value: testWindow });
const { migrateSessionDisplayState, resolveSidebarGrouping, useSessionDisplayStore } = await import('./useSessionDisplayStore');
afterAll(() => {
  testWindow.close();
  if (previousStorage) Object.defineProperty(globalThis, 'window', previousStorage);
  else Reflect.deleteProperty(globalThis, 'window');
});

describe('useSessionDisplayStore field removals', () => {
  test('v12→v13 drops worktreeSortOrder, sidebarViewMode, and showRecentSection from persisted state', () => {
    const migrated = migrateSessionDisplayState({
      worktreeSortOrder: 'manual',
      sidebarViewMode: 'timeline',
      showRecentSection: true,
      projectSortOrder: 'a-z',
    }, 12);
    expect('worktreeSortOrder' in migrated).toBe(false);
    expect('sidebarViewMode' in migrated).toBe(false);
    expect('showRecentSection' in migrated).toBe(false);
    expect(migrated.projectSortOrder).toBe('a-z');
  });
});
describe('useSessionDisplayStore one-view preferences', () => {
  test('defaults to one-view initial state', () => {
    const state = useSessionDisplayStore.getState();
    expect(state.showWorkSection).toBe(true);
    expect(state.showPinnedSection).toBe(true);
    expect(state.keepWorkInPlace).toBe(false);
    expect(state.listSessionGrouping).toBe('project');
    expect(state.sidebarGrouping).toBeNull();
  });

  test('v10→v11 preserves legacy timeline preference while default and projects stay project', () => {
    const timelineUser = migrateSessionDisplayState({ sidebarViewMode: 'timeline' }, 10);
    expect(timelineUser.showWorkSection).toBe(true);
    expect(timelineUser.showPinnedSection).toBe(true);
    expect(timelineUser.keepWorkInPlace).toBe(false);
    expect(timelineUser.sidebarGrouping).toBe('time');
    expect(timelineUser.listSessionGrouping).toBe('time');
    expect(resolveSidebarGrouping(timelineUser as Parameters<typeof resolveSidebarGrouping>[0])).toBe('time');

    const projectsUser = migrateSessionDisplayState({ sidebarViewMode: 'projects' }, 10);
    expect(projectsUser.showWorkSection).toBe(true);
    expect(projectsUser.showPinnedSection).toBe(true);
    expect(projectsUser.keepWorkInPlace).toBe(false);
    expect(projectsUser.sidebarGrouping).toBeNull();
    expect(projectsUser.listSessionGrouping).toBe('project');
    expect(resolveSidebarGrouping(projectsUser as Parameters<typeof resolveSidebarGrouping>[0])).toBe('project');

    const defaultUser = migrateSessionDisplayState({ showRecentSection: true }, 10);
    expect(defaultUser.showWorkSection).toBe(true);
    expect(defaultUser.showPinnedSection).toBe(true);
    expect(defaultUser.keepWorkInPlace).toBe(false);
    expect(defaultUser.sidebarGrouping).toBeNull();
    expect(defaultUser.listSessionGrouping).toBe('project');
    expect(resolveSidebarGrouping(defaultUser as Parameters<typeof resolveSidebarGrouping>[0])).toBe('project');
  });

  test('v11→v12 sets detailedZoneRows for mobile surface on non-project view', () => {
    expect(migrateSessionDisplayState({ sidebarViewMode: 'timeline' }, 11, 'mobile').detailedZoneRows).toBe(true);
    expect(migrateSessionDisplayState({ sidebarViewMode: 'projects' }, 11, 'mobile').detailedZoneRows).toBeUndefined();
    expect(migrateSessionDisplayState({ sidebarViewMode: 'timeline' }, 11, 'desktop').detailedZoneRows).toBeUndefined();
  });

  test('resolveSidebarGrouping resolves explicit grouping or falls back to listSessionGrouping', () => {
    expect(resolveSidebarGrouping({ sidebarGrouping: 'time', listSessionGrouping: 'project' })).toBe('time');
    expect(resolveSidebarGrouping({ sidebarGrouping: 'project', listSessionGrouping: 'time' })).toBe('project');
    expect(resolveSidebarGrouping({ sidebarGrouping: null, listSessionGrouping: 'time' })).toBe('time');
    expect(resolveSidebarGrouping({ sidebarGrouping: null, listSessionGrouping: 'project' })).toBe('project');
  });
});


describe('useSessionDisplayStore project sorting', () => {
  test('defaults to manual ordering', () => {
    expect(useSessionDisplayStore.getState().projectSortOrder).toBe('manual');
  });

  test('migrates the v2 recent default to manual', () => {
    const migrated = migrateSessionDisplayState({ projectSortOrder: 'recent' }, 2);

    expect(migrated.projectSortOrder).toBe('manual');
  });

  for (const projectSortOrder of ['manual', 'a-z', 'z-a', 'date-added'] as const) {
    test(`preserves the v2 ${projectSortOrder} sort order`, () => {
      const migrated = migrateSessionDisplayState({ projectSortOrder }, 2);

      expect(migrated.projectSortOrder).toBe(projectSortOrder);
    });
  }

  test('drops removed display keys while preserving retained preferences', () => {
    const migrated = migrateSessionDisplayState(
      { displayMode: 'default', projectSortOrder: 'a-z', showRecentSection: false, showArchivedSessions: true },
      3,
    );

    expect('displayMode' in migrated).toBe(false);
    expect(migrated.projectSortOrder).toBe('a-z');
    expect('showRecentSection' in migrated).toBe(false);
    expect('showArchivedSessions' in migrated).toBe(false);
  });

  test('v9→v10 drops the inline archive preference without changing sort order', () => {
    const migrated = migrateSessionDisplayState({ showArchivedSessions: true, worktreeSortOrder: 'a-z' }, 9);
    expect('showArchivedSessions' in migrated).toBe(false);
    expect('worktreeSortOrder' in migrated).toBe(false);
  });
});

describe('useSessionDisplayStore project display', () => {
  test('defaults to showing all projects without a selected single project', () => {
    expect(useSessionDisplayStore.getState().projectDisplayMode).toBe('all');
    expect(useSessionDisplayStore.getState().singleProjectId).toBeNull();
  });

  test('stores the single-project mode independently', () => {
    useSessionDisplayStore.getState().setProjectDisplayMode('single');
    useSessionDisplayStore.getState().setSingleProjectId('project-alpha');

    expect(useSessionDisplayStore.getState().projectDisplayMode).toBe('single');
    expect(useSessionDisplayStore.getState().singleProjectId).toBe('project-alpha');

    useSessionDisplayStore.setState({
      projectDisplayMode: 'all',
      singleProjectId: null,
    });
  });
});




describe('useSessionDisplayStore animated activity', () => {
  test('hydrates existing v8 data with motion off and retains saved choices', async () => {
    const initialState = useSessionDisplayStore.getState();
    const originalStorage = useSessionDisplayStore.persist.getOptions().storage;
    let stored = JSON.stringify({ version: 8, state: { showRecentSection: false, showArchivedSessions: true } });
    const storage = createJSONStorage<Partial<ReturnType<typeof useSessionDisplayStore.getState>>>(() => ({
      getItem: () => stored,
      setItem: (_name, value) => { stored = value; },
      removeItem: () => { stored = ''; },
    }));
    useSessionDisplayStore.persist.setOptions({ storage });
    try {
      await useSessionDisplayStore.persist.rehydrate();
      expect(useSessionDisplayStore.getState().animatedActivityIndicators).toBe(false);
      expect(useSessionDisplayStore.persist.getOptions().version).toBe(13);
      expect('showArchivedSessions' in useSessionDisplayStore.getState()).toBe(false);
      useSessionDisplayStore.getState().setAnimatedActivityIndicators(true);
      const enabledSnapshot = stored;
      expect(JSON.parse(enabledSnapshot)).toMatchObject({
        version: 13,
        state: { animatedActivityIndicators: true },
      });
      expect('showArchivedSessions' in JSON.parse(enabledSnapshot).state).toBe(false);
      useSessionDisplayStore.setState({ animatedActivityIndicators: false });
      stored = enabledSnapshot;
      await useSessionDisplayStore.persist.rehydrate();
      expect(useSessionDisplayStore.getState().animatedActivityIndicators).toBe(true);

    } finally {
      useSessionDisplayStore.persist.setOptions({ storage: originalStorage });
      useSessionDisplayStore.setState(initialState);
    }
  });
});
