import { useUIStore } from '@/stores/useUIStore';

// Whether the isolated-spaces feature is released to users. While closed
// (`ISOLATED_SPACES_RELEASED = false`), isolated spaces fail closed authoritatively
// across all client and server surfaces and cannot be bypassed by client flags,
// UI store state, or settings. Flip this in that release; nothing else needs to change.
export const ISOLATED_SPACES_RELEASED = false;

export const isIsolatedSpacesPageVisible = (): boolean =>
  ISOLATED_SPACES_RELEASED && useUIStore.getState().isolatedSpacesEnabled;
