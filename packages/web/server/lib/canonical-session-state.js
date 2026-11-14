// Where a session stands, read through the canonical Host session service.
//
// The auto-review loop and the pull request wake ask this before they send:
// a session that is running, or whose subagents run, is not theirs to
// interrupt. A read that fails is `null`, and unknown is never idle.

const ACTIVE_STATUSES = new Set(['running', 'awaiting_approval', 'awaiting_input']);

const isNotFound = (error) => error?.statusCode === 404 || error?.status === 404;

/** Whether a running session is a descendant of `sessionID` in the listed sessions. */
const hasRunningDescendant = (sessionID, items) => {
  const children = new Map();
  for (const item of items) {
    if (!item.parentSessionId) continue;
    children.set(item.parentSessionId, [...(children.get(item.parentSessionId) ?? []), item]);
  }
  const seen = new Set([sessionID]);
  const pending = [sessionID];
  while (pending.length > 0) {
    for (const child of children.get(pending.shift()) ?? []) {
      if (ACTIVE_STATUSES.has(child.runtimeStatus)) return true;
      if (seen.has(child.sessionId)) continue;
      seen.add(child.sessionId);
      pending.push(child.sessionId);
    }
  }
  return false;
};

/**
 * `{ kind }` with `running`, `subagents` (a descendant runs), `idle` or
 * `deleted`; `null` when the session could not be read.
 */
export const createCanonicalSessionState = ({ sessionService }) => {
  if (!sessionService || typeof sessionService.open !== 'function' || typeof sessionService.list !== 'function') {
    throw new TypeError('session state requires the canonical session service');
  }
  return {
    async read(sessionID) {
      let snapshot;
      try {
        snapshot = await sessionService.open(sessionID);
      } catch (error) {
        return isNotFound(error) ? { kind: 'deleted' } : null;
      }
      const session = snapshot?.session;
      if (!session) return null;
      if (ACTIVE_STATUSES.has(session.runtimeStatus)) return { kind: 'running' };
      let listed;
      try {
        listed = await sessionService.list(session.workspaceId);
      } catch {
        return null;
      }
      if (!Array.isArray(listed?.items)) return null;
      return { kind: hasRunningDescendant(sessionID, listed.items) ? 'subagents' : 'idle' };
    },
  };
};

/**
 * Keeps `sessionIDs` observed by the hub under one lease key. The hub delivers
 * a session's events only while it is observed. Resolves to a release function;
 * a partly acquired set is released before the failure is thrown.
 */
export const retainSessions = async (hub, leaseKey, sessionIDs) => {
  const acquired = [];
  try {
    for (const sessionID of sessionIDs) acquired.push(await hub.retainSession(sessionID, leaseKey));
  } catch (error) {
    await Promise.all(acquired.map((lease) => lease.release()));
    throw error;
  }
  return () => Promise.all(acquired.map((lease) => lease.release())).then(() => undefined, () => undefined);
};
