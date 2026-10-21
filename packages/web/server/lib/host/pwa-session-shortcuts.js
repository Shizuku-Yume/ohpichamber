import path from 'node:path';

const isWithin = (parent, candidate) => {
  const relative = path.relative(parent, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

/**
 * Canonical recent-session source for the PWA manifest.
 * A preferred directory maps to already-registered Host workspace scopes; it
 * never admits a new directory. Without one, the service's global list applies.
 */
export const listPwaSessions = async ({ directory, listWorkspaces, listSessions }) => {
  if (!directory) return listSessions();
  const scopes = await listWorkspaces();
  const workspaceIds = scopes.items
    .filter((scope) => isWithin(directory, scope.cwd))
    .map((scope) => scope.workspaceId);
  if (workspaceIds.length === 0) return { items: [], errors: scopes.errors };
  const pages = await Promise.all(workspaceIds.map(async (workspaceId) => {
    try {
      return await listSessions(workspaceId);
    } catch {
      return { items: [], errors: { [workspaceId]: 'SERVICE_UNAVAILABLE' } };
    }
  }));
  return {
    items: pages.flatMap((page) => page.items),
    errors: Object.assign({}, scopes.errors, ...pages.map((page) => page.errors)),
  };
};
