import { beforeEach, describe, expect, test } from 'bun:test';
import { useBtwStore } from './useBtwStore';

describe('useBtwStore', () => {
  beforeEach(() => {
    useBtwStore.setState({ byParent: {} });
  });

  test('starts empty', () => {
    expect(useBtwStore.getState().byParent).toEqual({});
  });

  test('keeps transient panel state independent per parent', () => {
    useBtwStore.getState().setPanelState('parent-1', { pending: true });
    useBtwStore.getState().setPanelState('parent-2', { collapsed: true });
    expect(useBtwStore.getState().byParent).toEqual({
      'parent-1': { pending: true },
      'parent-2': { collapsed: true },
    });
  });

  test('applies stream deltas and completion to the active record', () => {
    useBtwStore.getState().applyEphemeralDelta('parent-1', 'record-1', 'first');
    useBtwStore.getState().applyEphemeralDelta('parent-1', 'record-1', ' second');
    expect(useBtwStore.getState().byParent['parent-1']).toMatchObject({
      ephemeralRecordId: 'record-1', ephemeralText: 'first second', ephemeralStatus: 'running',
    });
    useBtwStore.getState().completeEphemeral('parent-1', 'record-1', 'completed', 'first second');
    expect(useBtwStore.getState().byParent['parent-1']).toMatchObject({ ephemeralStatus: 'completed', ephemeralText: 'first second' });
  });

  test('clearPanelState removes only its parent entry and is a no-op when missing', () => {
    useBtwStore.getState().setPanelState('parent-1', { collapsed: true });
    useBtwStore.getState().setPanelState('parent-2', { pending: true });
    useBtwStore.getState().clearPanelState('parent-1');
    expect(useBtwStore.getState().byParent).toEqual({ 'parent-2': { pending: true } });
    const before = useBtwStore.getState().byParent;
    useBtwStore.getState().clearPanelState('missing');
    expect(useBtwStore.getState().byParent).toBe(before);
  });
});
