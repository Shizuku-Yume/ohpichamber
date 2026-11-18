import { describe, expect, test } from 'bun:test';

import { OPENCHAMBER_SDK_API_VERSION, OPENCHAMBER_SDK_CHANNEL } from 'ohpichamber-sdk';

import { isLegacyGuestSdkMessage } from './legacy-guest-sdk.ts';

describe('legacy guest SDK detection', () => {
  test('recognizes only the old unconditional hello envelope', () => {
    expect(isLegacyGuestSdkMessage({ channel: OPENCHAMBER_SDK_CHANNEL, v: 1, type: 'hello' })).toBe(true);
    expect(isLegacyGuestSdkMessage({ channel: OPENCHAMBER_SDK_CHANNEL, v: 1, type: 'list-projects', id: 'legacy-1' })).toBe(false);
    expect(isLegacyGuestSdkMessage({ channel: OPENCHAMBER_SDK_CHANNEL, v: 1, type: 'request' })).toBe(false);
  });

  test('does not treat the current port envelope or junk as legacy', () => {
    expect(isLegacyGuestSdkMessage({ channel: OPENCHAMBER_SDK_CHANNEL, v: OPENCHAMBER_SDK_API_VERSION, type: 'hello' })).toBe(false);
    expect(isLegacyGuestSdkMessage({ channel: 'other', v: 1, type: 'hello' })).toBe(false);
    expect(isLegacyGuestSdkMessage({ channel: OPENCHAMBER_SDK_CHANNEL, v: 1 })).toBe(false);
    expect(isLegacyGuestSdkMessage({ channel: OPENCHAMBER_SDK_CHANNEL, v: 1, type: 1 })).toBe(false);
    expect(isLegacyGuestSdkMessage(null)).toBe(false);
    expect(isLegacyGuestSdkMessage('openchamber.sdk')).toBe(false);
    expect(isLegacyGuestSdkMessage([])).toBe(false);
  });
});
