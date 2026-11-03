import { createJSONStorage } from 'zustand/middleware';
import { afterAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'window');
const testWindow = new Window();
Object.defineProperty(globalThis, 'window', { configurable: true, value: testWindow });
const { defaultSidebarViewMode, migrateSessionDisplayState, resolveSidebarGrouping, useSessionDisplayStore } = await import('./useSessionDisplayStore');
afterAll(() => {
  testWindow.close();
  if (previousStorage) Object.defineProperty(globalThis, 'window', previousStorage);
  else Reflect.deleteProperty(globalThis, 'window');
});

describe('useSessionDisplayStore worktree sorting', () => {
  test('defaults to manual ordering', () => {
    expect(useSessionDisplayStore.getState().worktreeSortOrder).toBe('manual');
  });

  test('v8→v9 starts existing users on manual ordering', () => {
    expect(migrateSessionDisplayState({}, 8).worktreeSortOrder).toBe('manual');
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

  test('resolveSidebarGrouping resolves explicit grouping or falls back to timeline/projects', () => {
    expect(resolveSidebarGrouping({ sidebarGrouping: 'time', sidebarViewMode: 'projects', listSessionGrouping: 'project' })).toBe('time');
    expect(resolveSidebarGrouping({ sidebarGrouping: null, sidebarViewMode: 'timeline', listSessionGrouping: 'time' })).toBe('time');
    expect(resolveSidebarGrouping({ sidebarGrouping: null, sidebarViewMode: 'timeline', listSessionGrouping: 'project' })).toBe('project');
    expect(resolveSidebarGrouping({ sidebarGrouping: null, sidebarViewMode: 'projects', listSessionGrouping: 'time' })).toBe('project');
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
    expect(migrated.showRecentSection).toBe(false);
    expect('showArchivedSessions' in migrated).toBe(false);
  });

  test('v9→v10 drops the inline archive preference without changing sort order', () => {
    const migrated = migrateSessionDisplayState({ showArchivedSessions: true, worktreeSortOrder: 'a-z' }, 9);
    expect('showArchivedSessions' in migrated).toBe(false);
    expect(migrated.worktreeSortOrder).toBe('a-z');
  });
});

describe('useSessionDisplayStore project display', () => {
  test('defaults to showing all projects without a selected single project', () => {
    expect(useSessionDisplayStore.getState().projectDisplayMode).toBe('all');
    expect(useSessionDisplayStore.getState().singleProjectId).toBeNull();
  });

  test('stores the single-project mode independently from the view mode', () => {
    useSessionDisplayStore.getState().setProjectDisplayMode('single');
    useSessionDisplayStore.getState().setSingleProjectId('project-alpha');
    useSessionDisplayStore.getState().setSidebarViewMode('timeline');

    expect(useSessionDisplayStore.getState().projectDisplayMode).toBe('single');
    expect(useSessionDisplayStore.getState().singleProjectId).toBe('project-alpha');
    expect(useSessionDisplayStore.getState().sidebarViewMode).toBe('timeline');

    useSessionDisplayStore.setState({
      projectDisplayMode: 'all',
      singleProjectId: null,
      sidebarViewMode: 'projects',
    });
  });
});

describe('useSessionDisplayStore view mode', () => {
  test('defaults to the grouped projects view outside the phone surface', () => {
    expect(defaultSidebarViewMode()).toBe('projects');
  });

  test('v7→v8 turns the recent section off', () => {
    const migrated = migrateSessionDisplayState({ showRecentSection: true, projectSortOrder: 'a-z' }, 7);

    expect(migrated.showRecentSection).toBe(false);
    expect(migrated.projectSortOrder).toBe('a-z');
  });

  test('v5→v6 drops the removed grouping key and keeps the rest', () => {
    const migrated = migrateSessionDisplayState(
      { sessionGroupingMode: 'flat', projectSortOrder: 'a-z', showRecentSection: false },
      5,
    );

    expect('sessionGroupingMode' in migrated).toBe(false);
    expect(migrated.projectSortOrder).toBe('a-z');
    expect(migrated.showRecentSection).toBe(false);
  });
});


describe('useSessionDisplayStore animated activity', () => {
  test('hydrates existing v8 data with motion off and retains saved choices', async () => {
    const initialState = useSessionDisplayStore.getState();
    const originalStorage = useSessionDisplayStore.persist.getOptions().storage;
    let stored = JSON.stringify({ version: 8, state: { sidebarViewMode: 'timeline', showRecentSection: false, showArchivedSessions: true } });
    const storage = createJSONStorage<Partial<ReturnType<typeof useSessionDisplayStore.getState>>>(() => ({
      getItem: () => stored,
      setItem: (_name, value) => { stored = value; },
      removeItem: () => { stored = ''; },
    }));
    useSessionDisplayStore.persist.setOptions({ storage });
    try {
      await useSessionDisplayStore.persist.rehydrate();
      expect(useSessionDisplayStore.getState().animatedActivityIndicators).toBe(false);
      expect(useSessionDisplayStore.getState().sidebarViewMode).toBe('timeline');
      expect(useSessionDisplayStore.persist.getOptions().version).toBe(12);
      expect('showArchivedSessions' in useSessionDisplayStore.getState()).toBe(false);
      useSessionDisplayStore.getState().setAnimatedActivityIndicators(true);
      const enabledSnapshot = stored;
      expect(JSON.parse(enabledSnapshot)).toMatchObject({
        version: 12,
        state: { animatedActivityIndicators: true, sidebarViewMode: 'timeline', showRecentSection: false },
      });
      expect('showArchivedSessions' in JSON.parse(enabledSnapshot).state).toBe(false);
      useSessionDisplayStore.setState({ animatedActivityIndicators: false });
      stored = enabledSnapshot;
      await useSessionDisplayStore.persist.rehydrate();
      expect(useSessionDisplayStore.getState().animatedActivityIndicators).toBe(true);
      expect(useSessionDisplayStore.getState().showRecentSection).toBe(false);
    } finally {
      useSessionDisplayStore.persist.setOptions({ storage: originalStorage });
      useSessionDisplayStore.setState(initialState);
    }
  });
});
