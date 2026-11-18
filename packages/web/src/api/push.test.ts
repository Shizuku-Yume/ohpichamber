import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWebPushAPI } from './push';

const fetchMock = vi.fn(async (input: string): Promise<Response> => {
  void input;
  return Response.json({});
});
vi.stubGlobal('fetch', fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

const answerNativeStatus = (body: Record<string, unknown>) => {
  fetchMock.mockImplementation(async (input: string) => (
    input === '/api/push/native-status' ? Response.json(body) : Response.json({})
  ));
};

describe('web push: the server\'s native push status', () => {
  it('reports a configured relay as available', async () => {
    answerNativeStatus({ available: true, reason: null, relaySetting: 'OPENCHAMBER_PUSH_RELAY_URL' });
    await expect(createWebPushAPI().nativeStatus()).resolves.toEqual({ available: true });
  });

  it('reports the relay setting that turns remote push on', async () => {
    answerNativeStatus({ available: false, reason: 'relay-url-missing', relaySetting: 'OPENCHAMBER_PUSH_RELAY_URL' });
    await expect(createWebPushAPI().nativeStatus()).resolves.toEqual({
      available: false,
      reason: 'relay-url-missing',
      relaySetting: 'OPENCHAMBER_PUSH_RELAY_URL',
    });
  });

  it('reports both settings when the relay is disabled and no direct key exists', async () => {
    answerNativeStatus({
      available: false,
      reason: 'direct-config-missing',
      relaySetting: 'OPENCHAMBER_PUSH_RELAY_URL',
      disabledSetting: 'OPENCHAMBER_PUSH_RELAY_DISABLED',
    });
    await expect(createWebPushAPI().nativeStatus()).resolves.toEqual({
      available: false,
      reason: 'direct-config-missing',
      relaySetting: 'OPENCHAMBER_PUSH_RELAY_URL',
      disabledSetting: 'OPENCHAMBER_PUSH_RELAY_DISABLED',
    });
  });

  it('still says remote push is unavailable when it does not know the reason', async () => {
    answerNativeStatus({ available: false, reason: 'something-new', relaySetting: 'OPENCHAMBER_PUSH_RELAY_URL' });
    // Never null: an unavailable server must not look like "nothing to say".
    await expect(createWebPushAPI().nativeStatus()).resolves.toEqual({
      available: false,
      reason: 'relay-url-missing',
      relaySetting: 'OPENCHAMBER_PUSH_RELAY_URL',
    });
  });

  it('answers null when the server does not report availability at all', async () => {
    answerNativeStatus({});
    await expect(createWebPushAPI().nativeStatus()).resolves.toBeNull();
  });
});
