// The server-owned release gate: closed until the OMP space runtime exists.

import { describe, expect, it } from 'vitest';

import { SpaceError } from './errors.js';
import { createSpacesHost } from './host.js';
import { createSpaceJourney } from './journey.js';
import { createSpaceManager } from './manager.js';
import { createMemoryPlace } from './places/memory-place.js';
import { createPlaceRegistry } from './places/registry.js';
import { ISOLATED_SPACES_RELEASED, isSpacesReleased, requireSpacesReleased, spacesHostEnabled } from './release.js';
import { createSwitchController } from './routes.js';

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

  it('refuses to build spaces host while gate is closed', () => {
    expect(() => createSpacesHost({ dataDir: '/tmp', logger: { warn: () => { } } })).toThrowError(
      expect.objectContaining({ code: 'isolated_spaces_unreleased' }),
    );
  });

  it('refuses create and start in space manager before place is called', async () => {
    const placeCalls = [];
    const place = {
      ...createMemoryPlace(),
      create: async () => { placeCalls.push('create'); },
      start: async () => { placeCalls.push('start'); },
    };
    const manager = createSpaceManager({
      registry: createPlaceRegistry([place]),
    });
    await expect(manager.createSpace({ placeId: 'memory', projectDirectory: '/tmp/proj', name: 'test' })).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    await expect(manager.startSpace({ placeId: 'memory', spaceId: 'a1b2c3d4e5f6' })).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    expect(placeCalls).toEqual([]);
  });

  it('refuses create, start, repair, and grants in space journey before place or gatekeeper is called', async () => {
    const calls = [];
    const place = {
      id: 'test-place',
      create: async () => { calls.push('place.create'); },
      start: async () => { calls.push('place.start'); },
      stop: async () => { calls.push('place.stop'); },
      list: async () => [{ id: 'a1b2c3d4e5f6', state: 'running' }],
    };
    const gatekeeper = {
      addGrant: async () => { calls.push('gatekeeper.addGrant'); },
      setNetwork: async () => { calls.push('gatekeeper.setNetwork'); },
    };
    const manager = {
      createSpace: async () => { calls.push('manager.createSpace'); },
      startSpace: async () => { calls.push('manager.startSpace'); },
      stopSpace: async () => { calls.push('manager.stopSpace'); },
      listSpaces: async () => [{ id: 'a1b2c3d4e5f6', state: 'running' }],
    };
    const records = {
      read: () => ({ status: 'ok', record: { grants: [] } }),
      update: () => ({ status: 'ok' }),
    };
    const journey = createSpaceJourney({
      manager,
      place,
      gatekeeper,
      codeIn: { bringCodeIn: async () => { calls.push('bringCodeIn'); } },
      codeOut: { fetchQuarantine: async () => { calls.push('fetchQuarantine'); } },
      records,
      serverInside: { writeToken: async () => { calls.push('writeToken'); } },
    });

    await expect(journey.createSpace({ projectDirectory: '/tmp/proj', name: 'test', start: 'clean', network: { mode: 'open' } })).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    await expect(journey.startSpace('a1b2c3d4e5f6')).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    await expect(journey.restartSpace('a1b2c3d4e5f6')).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    await expect(journey.grantAccess('a1b2c3d4e5f6', { kind: 'model', provider: 'anthropic', upstream: 'https://api.anthropic.com/v1', secret: { kind: 'typed', value: 'sk-test' } })).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    await expect(journey.grantAccess('a1b2c3d4e5f6', { kind: 'login', provider: 'openai' })).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    await expect(journey.grantAccess('a1b2c3d4e5f6', { kind: 'domain', upstream: 'https://registry.npmjs.org/' })).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    await expect(journey.openDomain('a1b2c3d4e5f6', { domain: 'registry.npmjs.org' })).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    await expect(journey.restoreLostGrants()).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });

    expect(calls).toEqual([]);
  });

  it('refuses switch activation and persists nothing when PUT settings request arrives', async () => {
    let persisted = false;
    let built = false;
    const controller = createSwitchController({
      getHost: () => null,
      setHost: () => { },
      buildHost: () => { built = true; return {}; },
      startHost: () => { },
      persist: async () => { persisted = true; },
    });

    expect(await controller.readSwitch()).toEqual({ enabled: false, spaces: [] });
    await expect(controller.setSwitch(true)).rejects.toMatchObject({
      code: 'isolated_spaces_unreleased',
    });
    expect(persisted).toBe(false);
    expect(built).toBe(false);
  });
});
