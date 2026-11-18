// The server's release gate for isolated spaces. The UI has a display flag of its own
// (`ISOLATED_SPACES_RELEASED` in packages/ui), but it only hides the switch: this one is the
// authority. While it is closed, the server builds no spaces host, ignores a saved
// `isolatedSpacesEnabled`, refuses the PUT switch route, and refuses every create, start, repair
// and grant before a place, a container or the server's readiness wait is touched. There is no
// agent runtime inside a space until the OMP space runtime is built, so a space would only be a
// container that cannot do the work it exists for. Flip this together with that runtime; nothing
// else in this module needs to change.

import { SpaceError } from './errors.js';

export const ISOLATED_SPACES_RELEASED = false;

const ISOLATED_SPACES_UNRELEASED_MESSAGE = 'Isolated spaces are not released yet: a space has no agent runtime until the OMP space runtime is built. OhPiChamber creates, starts and repairs none, and gives a space no model or login grant.';

/** Whether spaces may be made and run. The one answer every entry point asks. */
export const isSpacesReleased = () => ISOLATED_SPACES_RELEASED;

/** Refuses with the feature's one unsupported state. Call before any place, container or wait. */
export function requireSpacesReleased() {
  if (!isSpacesReleased()) {
    throw new SpaceError('isolated_spaces_unreleased', ISOLATED_SPACES_UNRELEASED_MESSAGE);
  }
}

/**
 * Whether a start may build the spaces host. The saved switch is the user's answer, and it only
 * counts while the gate is open: a settings.json from an earlier build, or one edited by hand,
 * cannot bring a space up.
 */
export const spacesHostEnabled = (settings) => isSpacesReleased() && settings?.isolatedSpacesEnabled === true;
