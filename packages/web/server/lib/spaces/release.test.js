// The server-owned release gate: closed until the OMP space runtime exists.

import { describe, expect, it } from 'vitest';

import { SpaceError } from './errors.js';
import { ISOLATED_SPACES_RELEASED, isSpacesReleased, requireSpacesReleased, spacesHostEnabled } from './release.js';

describe('the isolated-spaces release gate', () => {
  it('is closed, and names the unsupported state', () => {
    expect(ISOLATED_SPACES_RELEASED).toBe(false);
    expect(isSpacesReleased()).toBe(false);

    const error = (() => {
      try {
        requireSpacesReleased();
      } catch (caught) {
        return caught;
      }
      return null;
    })();
    expect(error).toBeInstanceOf(SpaceError);
    expect(error.code).toBe('isolated_spaces_unreleased');
    expect(error.message).toMatch(/not released yet/);
    expect(error.message).toMatch(/no agent runtime/);
  });

  it('overrides a saved isolatedSpacesEnabled setting at start', () => {
    expect(spacesHostEnabled({ isolatedSpacesEnabled: true })).toBe(false);
    expect(spacesHostEnabled({ isolatedSpacesEnabled: false })).toBe(false);
    expect(spacesHostEnabled(null)).toBe(false);
    expect(spacesHostEnabled(undefined)).toBe(false);
  });
});
