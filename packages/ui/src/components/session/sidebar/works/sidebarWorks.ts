import type { Session } from '@openchamber/agent-contract';
import { isSessionInWork } from '@/lib/sessionWorkMetadata';
import { normalizePath } from '@/lib/pathNormalization';
import type { SessionGroup, SessionNode } from '../types';
import type { ProjectSection } from '../projects/sessionProjectRender';

/**
 * A work is what the sidebar lists as one entry: a linked worktree with all
 * its sessions, or a root session of the project root (or of a space) with
 * the sessions nested under it. See DOCUMENTATION.md next to this file.
 */
export type SidebarWorkRef =
 | { kind: 'worktree'; key: string; projectId: string; group: SessionGroup }
 | { kind: 'session'; key: string; projectId: string; rootSessionId: string };

type SidebarWorktreeWorkRef = Extract<SidebarWorkRef, { kind: 'worktree' }>;

export type SidebarWorkIndex = {
 bySessionId: ReadonlyMap<string, SidebarWorkRef>;
 /** Every worktree work, in section and group order, sessions or not. */
 worktreeWorks: readonly SidebarWorktreeWorkRef[];
};

/** A linked worktree's group: the one kind of group that is a work of its own. */
export const isWorktreeWorkGroup = (group: SessionGroup): boolean => (
 !group.isMain && group.isArchivedBucket !== true && !group.space && group.worktree !== null
);

export const isGroupWork = (group: SessionGroup): boolean => (
 !group.isMain && group.isArchivedBucket !== true && (Boolean(group.space) || group.worktree !== null)
);

const worktreeWorkGroupKey = (projectId: string, group: SessionGroup): string => `${projectId}:${group.id}`;

/**
 * A worktree's entry in a folder of its project root, beside the session ids
 * there. The folder store and the server treat members as opaque ids, so a
 * worktree is filed with the same assign and unassign changes as a session.
 */
export const worktreeFolderMemberId = (directory: string | null): string | null => {
 const normalized = normalizePath(directory);
 return normalized ? `worktree:${normalized}` : null;
};
export type SidebarFolderMembership = { folderId: string; projectId: string };

export const findWorkFolderId = (ref: SidebarWorkRef, folderByMember: ReadonlyMap<string, SidebarFolderMembership>): string | null => {
 const memberId = ref.kind === 'worktree' ? worktreeFolderMemberId(ref.group.directory) : ref.rootSessionId;
 const membership = memberId ? folderByMember.get(memberId) : undefined;
 return membership?.projectId === ref.projectId ? membership?.folderId ?? null : null;
};

export const isFiledInFolder = (ref: SidebarWorkRef, folderByMember: ReadonlyMap<string, SidebarFolderMembership>): boolean => (
 findWorkFolderId(ref, folderByMember) !== null
);

const sessionWorkKey = (rootSessionId: string): string => `session:${rootSessionId}`;

/** Which work each listed session belongs to, from the project sections. */
export const buildSidebarWorkIndex = (sections: readonly ProjectSection[]): SidebarWorkIndex => {
 const bySessionId = new Map<string, SidebarWorkRef>();
 const worktreeWorks: SidebarWorktreeWorkRef[] = [];
 const claim = (node: SessionNode, ref: SidebarWorkRef): void => {
  const stack = [node];
  while (stack.length > 0) {
   const current = stack.pop();
   if (!current || bySessionId.has(current.session.sessionId)) continue;
   bySessionId.set(current.session.sessionId, ref);
   stack.push(...current.children);
  }
 };
 for (const section of sections) {
  const projectId = section.project.id;
  for (const group of section.groups) {
   if (group.isArchivedBucket) continue;
   if (isGroupWork(group)) {
    const ref: SidebarWorktreeWorkRef = { kind: 'worktree', key: worktreeWorkGroupKey(projectId, group), projectId, group };
    worktreeWorks.push(ref);
    group.sessions.forEach((node) => claim(node, ref));
    continue;
   }
   for (const node of group.sessions) {
    claim(node, { kind: 'session', key: sessionWorkKey(node.session.sessionId), projectId, rootSessionId: node.session.sessionId });
   }
  }
 }
 return { bySessionId, worktreeWorks };
};

const EMPTY_ANCHORS: ReadonlyMap<string, number> = new Map();

export const buildSessionRootIndex = (
 rootSessions: readonly Session[],
 childrenMap: ReadonlyMap<string, readonly Session[]>,
): ReadonlyMap<string, string> => {
 const rootOf = new Map<string, string>();
 for (const root of rootSessions) {
  const stack: Session[] = [root];
  while (stack.length > 0) {
   const current = stack.pop();
   if (!current || rootOf.has(current.sessionId)) continue;
   rootOf.set(current.sessionId, root.sessionId);
   stack.push(...(childrenMap.get(current.sessionId) ?? []));
  }
 }
 return rootOf;
};

/**
 * The works In work lists, before Pinned takes its own: a work is in work when
 * its root or a session nested under it, past subagents, is.
 */
export const orderInWorkWorks = (
 orderedSessions: readonly Session[],
 index: SidebarWorkIndex,
 rootOf: ReadonlyMap<string, string>,
 isChatDirectory: (directory: string | null | undefined) => boolean,
): SidebarWorkRef[] => orderSidebarWorks(orderedSessions, index, (session) => (
 !session.parentSessionId && session.archivedAt === undefined && !isChatDirectory(session.displayPath) && isSessionInWork(session)
), EMPTY_ANCHORS, rootOf);

export const buildWorktreeArchiveAnchors = ({
 groupWorks,
 archivedSessions,
 orderedSessions,
 orderValueOf,
 isPinned,
}: {
 groupWorks: readonly SidebarWorktreeWorkRef[];
 archivedSessions: readonly Session[];
 orderedSessions: readonly Session[];
 orderValueOf: (session: Session) => number;
 isPinned: (session: Session) => boolean;
}): ReadonlyMap<string, number> => {
 if (groupWorks.length === 0 || archivedSessions.length === 0) return EMPTY_ANCHORS;
 const keyByDirectory = new Map(groupWorks.flatMap((ref) => {
  const directory = normalizePath(ref.group.directory ?? null);
  return directory ? [[directory, ref.key] as const] : [];
 }));
 const newestByKey = new Map<string, number>();
 for (const session of archivedSessions) {
  if (session.parentSessionId) continue;
  const key = keyByDirectory.get(normalizePath(session.displayPath ?? null) ?? '');
  if (!key) continue;
  newestByKey.set(key, Math.max(newestByKey.get(key) ?? Number.NEGATIVE_INFINITY, orderValueOf(session)));
 }
 if (newestByKey.size === 0) return EMPTY_ANCHORS;
 const tops = orderedSessions.flatMap((session, index) => (
  session.parentSessionId || isPinned(session) ? [] : [{ index, value: orderValueOf(session) }]
 ));
 const anchors = new Map<string, number>();
 for (const [key, newest] of newestByKey) {
  const next = tops.find((entry) => entry.value < newest);
  anchors.set(key, (next?.index ?? orderedSessions.length) - 0.5);
 }
 return anchors;
};

/**
 * The works of the sessions `include` accepts, each once, in the order of the
 * first of their sessions in `orderedSessions` (the sidebar's lifecycle order,
 * so a work moves up when any of its sessions does). With `archiveAnchors`
 * a worktree work also stands where its archived sessions hold it.
 */
export const orderSidebarWorks = (
 orderedSessions: readonly Session[],
 index: SidebarWorkIndex,
 include: (session: Session) => boolean,
 archiveAnchors: ReadonlyMap<string, number> = EMPTY_ANCHORS,
 rootOf?: ReadonlyMap<string, string>,
): SidebarWorkRef[] => {
 const rankByKey = new Map<string, { ref: SidebarWorkRef; rank: number }>();
 orderedSessions.forEach((session, position) => {
  if (!include(session)) return;
  const rootSessionId = rootOf?.get(session.sessionId);
  const ref = index.bySessionId.get(session.sessionId) ?? (rootSessionId ? index.bySessionId.get(rootSessionId) : undefined);
  if (ref && !rankByKey.has(ref.key)) rankByKey.set(ref.key, { ref, rank: position });
 });
 if (archiveAnchors.size === 0) return [...rankByKey.values()].map((entry) => entry.ref);
 for (const ref of index.worktreeWorks) {
  const anchor = archiveAnchors.get(ref.key);
  if (anchor === undefined) continue;
  const listed = rankByKey.get(ref.key);
  rankByKey.set(ref.key, { ref, rank: Math.min(listed?.rank ?? anchor, anchor) });
 }
 return [...rankByKey.values()]
  .sort((a, b) => a.rank - b.rank)
  .map((entry) => entry.ref);
};
