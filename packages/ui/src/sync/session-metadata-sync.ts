import { subscribeOpenchamberEvents } from '@/lib/openchamberEvents';
import { getRuntimeKey } from '@/lib/runtime-switch';
import { applyCanonicalMetadataEvent } from './session-actions';

/**
 * Session metadata (pins, notes, folder, assist recap/suggestion) is stored by the Host.
 * The server announces metadata updates via 'openchamber:session-metadata'.
 * This sync owner reduces the authoritative metadata state into the active session
 * sync stores without requiring a page reload or session switch.
 */
export const subscribeSessionMetadataSync = (runtimeKey: string): (() => void) => (
 subscribeOpenchamberEvents((event) => {
  if (runtimeKey !== getRuntimeKey()) return;
  if (event.type === 'session-metadata') {
   applyCanonicalMetadataEvent(event.state);
  }
 })
);
