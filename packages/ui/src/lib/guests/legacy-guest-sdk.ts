import { OPENCHAMBER_SDK_CHANNEL } from '@openchamber/sdk';

/**
 * Wire version of the pre-M3 Guest SDK. It posted `hello` and every call to
 * `window.parent`; the current host accepts capabilities only from the private
 * MessagePort bootstrap. The value is never accepted — it only identifies the
 * old envelope so the pane can show an explicit version-mismatch instead of
 * letting the old guest time out.
 */
const LEGACY_GUEST_SDK_WIRE_VERSION = 1;

export const isLegacyGuestSdkMessage = (data: unknown): boolean => {
  if (Object(data) !== data || Array.isArray(data)) return false;
  const wire = data as Record<string, unknown>;
  return wire.channel === OPENCHAMBER_SDK_CHANNEL
    && wire.v === LEGACY_GUEST_SDK_WIRE_VERSION
    && typeof wire.type === 'string';
};
