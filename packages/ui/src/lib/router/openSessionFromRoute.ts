import type { Session } from '@openchamber/agent-contract';
import { ensureGlobalSessionsLoaded, resolveGlobalSessionDirectory, useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { useBtwStore } from '@/stores/useBtwStore';
import { useSessionUIStore } from '@/sync/session-ui-store';
import { setSessionOpener } from '@/sync/session-navigation';
import { requestMessageFocus } from './messageFocus';

// Only synchronous selection notifications inside a redirect replace history.
let redirecting = false;
export const isSessionOpenRedirect = (): boolean => redirecting;

export type SessionOpenOptions = {
 /** The owning directory when the caller already knows it (a desktop event or a notification carries one). */
 directory?: string | null;
 /** The message a link names. */
 messageId?: string | null;
 /** Native jump-list entries may outlive their session. Unknown IDs do not select anything. */
 requireKnownSession?: boolean;
};

type SessionOpenTarget = {
 sessionId: string;
 directory: string | null;
 btwParentId: string | null;
};

type SessionLike = {
 sessionId?: string;
 id?: string;
 metadata?: unknown;
};

const getBtwOriginalSessionId = (session: SessionLike | undefined): string | null => {
 if (!session) return null;
 const meta = session.metadata as Record<string, unknown> | null | undefined;
 const oc = meta?.openchamber as Record<string, unknown> | null | undefined;
 if (!oc || typeof oc !== 'object') return null;
 if (oc.kind === 'btw' && !oc.btwPromoted && typeof oc.originalSessionID === 'string') {
  return oc.originalSessionID;
 }
 return null;
};

const btwParentOf = (session: SessionLike | undefined): string | null => {
 const parentId = getBtwOriginalSessionId(session);
 const id = session?.sessionId ?? session?.id;
 return parentId && session && parentId !== id ? parentId : null;
};

const sessionMatchesId = (session: SessionLike, id: string): boolean =>
 session.sessionId === id || session.id === id;

/**
 * A `/btw` fork is a side transcript inside its parent's panel, not a session
 * of its own: no list shows it, so opening it by id strands the reader in a
 * transcript with no way back. Resolve it to its parent when that parent still
 * exists; a deleted parent leaves only the fork to open.
 */
const resolveSessionDir = (session: SessionLike | undefined): string | null => {
 if (!session) return null;
 return resolveGlobalSessionDirectory(session as Session) ?? (session as { directory?: string }).directory ?? null;
};

const targetFor = (
 session: SessionLike | undefined,
 fallbackId: string,
 parentExists: (parentId: string) => boolean,
): SessionOpenTarget => {
 const parentId = btwParentOf(session);
 const directory = resolveSessionDir(session);
 return parentId && parentExists(parentId)
  ? { sessionId: parentId, directory, btwParentId: parentId }
  : { sessionId: fallbackId, directory, btwParentId: null };
};

const selectTarget = (target: SessionOpenTarget, directoryHint: string | null): void => {
 const state = useSessionUIStore.getState();
 const directory = directoryHint ?? state.getDirectoryForSession(target.sessionId) ?? target.directory;
 const directoryChanged = directory !== null && directory !== state.currentSessionDirectory;
 if (state.currentSessionId !== target.sessionId || directoryChanged) {
  state.setCurrentSession(target.sessionId, directory);
 }
 if (target.btwParentId) {
  useBtwStore.getState().setPanelState(target.btwParentId, { collapsed: false });
 }
};

/**
 * Opens the session a route, a link, a notification, or a toast names.
 *
 * A message link keeps its named session: the message lives in that
 * transcript, and selecting the parent would not find it.
 */
export async function openSession(sessionId: string, options: SessionOpenOptions = {}): Promise<void> {
 const requestedId = sessionId.trim();
 if (!requestedId) return;
 if (options.requireKnownSession) {
  const selectedBeforeLoad = useSessionUIStore.getState().currentSessionId;
  const snapshot = await ensureGlobalSessionsLoaded().catch(() => null);
  if (useSessionUIStore.getState().currentSessionId !== selectedBeforeLoad) return;
  if (!snapshot || ![...snapshot.activeSessions, ...snapshot.archivedSessions].some((session) => sessionMatchesId(session, requestedId))) return;
 }

 const messageId = options.messageId?.trim() || null;
 if (messageId) requestMessageFocus(requestedId, messageId);

 const initialStore = useGlobalSessionsStore.getState();
 const initialTarget = messageId
  ? { sessionId: requestedId, directory: null, btwParentId: null }
  : targetFor(initialStore.entityById.get(requestedId), requestedId, (parentId) => initialStore.entityById.has(parentId));
 selectTarget(initialTarget, options.directory?.trim() || null);

 // Cold loads often do not know the owning directory, or even the session
 // record, so the first selection can guess. Once the global list is
 // available, re-select with what it says unless the user already moved.
 const snapshot = await ensureGlobalSessionsLoaded().catch(() => null);
 if (!snapshot) return;

 const latest = useSessionUIStore.getState();
 if (latest.currentSessionId !== initialTarget.sessionId) return;

 const sessions = [...snapshot.activeSessions, ...snapshot.archivedSessions];
 const session = sessions.find((entry) => sessionMatchesId(entry, requestedId));
 if (!session) return;
 const target = messageId
  ? { sessionId: requestedId, directory: resolveSessionDir(session), btwParentId: null }
  : targetFor(session, requestedId, (parentId) => sessions.some((entry) => sessionMatchesId(entry, parentId)));
 if (target.sessionId !== latest.currentSessionId) {
  redirecting = true;
  try {
   selectTarget(target, null);
  } finally {
   redirecting = false;
  }
  return;
 }
 if (!target.directory || target.directory === latest.currentSessionDirectory) return;
 latest.setCurrentSession(target.sessionId, target.directory);
}

/**
 * Opens a session link and, for a message link, asks the session's timeline
 * to show that message: on entry, or right away if the session is open.
 */
export function openSessionLink(sessionId: string, messageId: string | null): Promise<void> {
 return openSession(sessionId, { messageId });
}

/**
 * Select a session named by `/?session=`.
 */
export function openSessionFromRoute(sessionId: string): Promise<void> {
 return openSession(sessionId);
}

// Register here to keep the session store independent of the router.
setSessionOpener((sessionId, directory) => {
 void openSession(sessionId, { directory });
});
