import { describe, expect, test } from 'bun:test';
import { dismissLegacyNotice, isLegacyNoticeDismissed } from './LegacyDataNotice';
import { getSafeStorage } from '@/stores/utils/safeStorage';

describe('legacy notice state', () => {
  test('keeps dismissal across reloads scoped to the host runtime', () => {
    const storage = getSafeStorage();
    storage.removeItem('legacy-data-notice-dismissed:task20-test');
    expect(isLegacyNoticeDismissed('task20-test')).toBe(false);
    dismissLegacyNotice('task20-test');
    expect(isLegacyNoticeDismissed('task20-test')).toBe(true);
    expect(isLegacyNoticeDismissed('another-runtime')).toBe(false);
    storage.removeItem('legacy-data-notice-dismissed:task20-test');
  });
});
