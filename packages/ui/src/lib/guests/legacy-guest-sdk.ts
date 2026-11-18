import { OPENCHAMBER_SDK_CHANNEL } from 'ohpichamber-sdk';

/**
 * Wire version of the pre-M3 Guest SDK. It posted `hello` and every call to
 * `window.parent`; the current host accepts capabilities only from the private
 * MessagePort bootstrap. The value is never accepted — the old SDK's
 * unconditional `hello` identifies the incompatible pane so it can show an
 * explicit version mismatch instead of timing out. Later calls are not used
 * because panels may wait for host state before making one.
 */
const LEGACY_GUEST_SDK_WIRE_VERSION = 1;

export const isLegacyGuestSdkMessage = (data: unknown): boolean => {
  if (Object(data) !== data || Array.isArray(data)) return false;
  const wire = data as Record<string, unknown>;
  return wire.channel === OPENCHAMBER_SDK_CHANNEL
    && wire.v === LEGACY_GUEST_SDK_WIRE_VERSION
    && wire.type === 'hello';
};
