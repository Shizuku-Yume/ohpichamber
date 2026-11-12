import { describe, expect, test } from 'bun:test';
import { SERVER_STATE_BOOT_ENTRIES, getServerStateBootPhases, subscribeServerStateBoot } from './serverStateBoot';

describe('server state boot registry', () => {
  test('every entry declares a reset and a unique id', () => {
    const ids = SERVER_STATE_BOOT_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of SERVER_STATE_BOOT_ENTRIES) {
      expect(typeof entry.reset).toBe('function');
      expect(entry.id.length).toBeGreaterThan(0);
    }
  });

  test('every store whose content is the server\'s answer declares a hydrator', () => {
    // Directory- or event-scoped projections have nothing to read at boot:
    // they follow the directory in use or an announcement. Each still carries
    // a per-directory phase where a consumer renders one (MCP), and reset-only
    // entries clear the previous instance's values.
    const eventOnly = new Set(['advisor', 'cleanse', 'mcp', 'skills', 'skills-catalog']);
    for (const entry of SERVER_STATE_BOOT_ENTRIES) {
      if (eventOnly.has(entry.id)) {
        expect(entry.hydrate).toBeUndefined();
        continue;
      }
      expect(typeof entry.hydrate).toBe('function');
    }
  });

  test('the orphaned permission sync path is not a boot entry', () => {
    // `sync/permission-mode-sync.ts` had no production importer; the policy is
    // read here and applied from the control stream instead.
    expect(SERVER_STATE_BOOT_ENTRIES.some((entry) => entry.id.includes('permission-mode-sync'))).toBe(false);
  });

  test('boot phases stay empty until a pass runs, so nothing reads as ready', () => {
    expect(getServerStateBootPhases()).toEqual({});
    const unsubscribe = subscribeServerStateBoot(() => undefined);
    unsubscribe();
  });
});
