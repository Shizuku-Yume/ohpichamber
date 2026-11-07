export type SessionLike = {
 id?: string;
 sessionId?: string;
 parentID?: string;
 parentSessionId?: string;
 metadata?: unknown;
};

const getBtwOriginalSessionId = (session: SessionLike): string | undefined => {
 const meta = session.metadata as Record<string, unknown> | null | undefined;
 const oc = meta?.openchamber as Record<string, unknown> | null | undefined;
 if (!oc || typeof oc !== 'object') return undefined;
 if (oc.kind === 'btw' && !oc.btwPromoted && typeof oc.originalSessionID === 'string') {
  return oc.originalSessionID;
 }
 return undefined;
};

/**
 * A session and the ones above it: the session a subagent or a `/btw` side chat
 * works under, and so on up. It stops at a session it cannot read. `/btw` links
 * are session metadata anyone can write, so a link that loops ends the walk.
 */
export const sessionLineage = async <T extends SessionLike>(
 sessionId: string,
 readSession: (sessionId: string) => Promise<T | null | undefined>,
): Promise<T[]> => {
 const lineage: T[] = [];
 const visited = new Set<string>();
 let current: string | null | undefined = sessionId;
 while (current && !visited.has(current)) {
  visited.add(current);
  const session = await readSession(current);
  if (!session) break;
  lineage.push(session);
  current = session.parentSessionId ?? session.parentID ?? getBtwOriginalSessionId(session);
 }
 return lineage;
};

export const fileNameOf = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path;
