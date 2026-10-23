import { afterEach, describe, expect, test } from 'bun:test';
import { dismissLegacyNotice, isLegacyNoticeDismissed } from './LegacyDataNotice';
import { getSafeStorage } from '@/stores/utils/safeStorage';

const storageKey = 'legacy-data-notice-dismissed:task20-test';

describe('legacy notice persistence', () => {
  afterEach(() => getSafeStorage().removeItem(storageKey));

  test('dismissal survives a component remount and remains runtime-scoped', () => {
    expect(isLegacyNoticeDismissed('task20-test')).toBe(false);
    dismissLegacyNotice('task20-test');
    expect(isLegacyNoticeDismissed('task20-test')).toBe(true);
    expect(isLegacyNoticeDismissed('another-runtime')).toBe(false);
  });
});
