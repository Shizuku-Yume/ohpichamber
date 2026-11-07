/**
 * The seam between the Agent Service supervisor and the Host permission policy.
 *
 * The service asks two questions over its IPC channel: which mode does this
 * session resolve to, and may a `safety` request be answered without the user.
 * Both answers belong to the policy runtime this directory owns, but the
 * supervisor is constructed before that runtime and is built by another owner,
 * so it reaches the runtime through this module instead of an injected
 * callback. Until `registerHostPermissionRuntime` runs, every answer fails
 * closed: `ask`, and never an accept.
 */
let permissionRuntime = null;

export function registerHostPermissionRuntime(runtime) {
 permissionRuntime = runtime ?? null;
}

/** The mode the Host policy resolves for a session; unknown policy means `ask`. */
export const resolveHostPermissionMode = async (sessionId) => {
 try {
  return (await permissionRuntime?.resolveSessionMode(sessionId)) ?? 'ask';
 } catch {
  return 'ask';
 }
};

/** The safety verdict for one execution request; no policy runtime means no verdict. */
export const evaluateHostPermission = async (approval) => {
 if (!permissionRuntime) return null;
 try {
  return await permissionRuntime.evaluateSessionPermission(approval?.sessionId, approval);
 } catch {
  return null;
 }
};
