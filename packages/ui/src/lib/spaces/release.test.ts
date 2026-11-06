import { describe, expect, test } from 'bun:test';

import { useUIStore } from '@/stores/useUIStore';

import { ISOLATED_SPACES_RELEASED, isIsolatedSpacesPageVisible } from './release';

describe('isolated spaces release gate in UI', () => {
  test('is closed, and cannot be bypassed by UI store isolatedSpacesEnabled flag', () => {
    expect(ISOLATED_SPACES_RELEASED).toBe(false);

    useUIStore.setState({ isolatedSpacesEnabled: false });
    expect(isIsolatedSpacesPageVisible()).toBe(false);

    useUIStore.setState({ isolatedSpacesEnabled: true });
    expect(isIsolatedSpacesPageVisible()).toBe(false);

    useUIStore.setState({ isolatedSpacesEnabled: false });
  });
});
