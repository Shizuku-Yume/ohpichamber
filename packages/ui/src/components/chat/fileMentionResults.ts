import { rankByQuery } from '@/lib/search/fuzzySearch';
import type { ProjectFileSearchHit } from '@/lib/host-filesystem';

export type FileMentionHit = ProjectFileSearchHit & { kind: 'file' | 'directory' };

export const tokenizeMentionQuery = (query: string): string[] =>
  (query ?? '')
    .trim()
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

/**
 * The opencode file search takes a single term, so multi-word queries send the
 * most selective (longest) token and the remaining tokens filter client-side.
 */
export const mentionServerQuery = (query: string): string => {
  const tokens = tokenizeMentionQuery(query);
  if (tokens.length === 0) {
    return '';
  }
  return tokens.reduce((longest, token) => (token.length > longest.length ? token : longest));
};

/**
 * Names the server search a mention query needs: the same key means the same
 * results. Null when the query needs none (no directory, nothing typed, or a
 * space, which only a session title holds).
 */
export const mentionSearchKey = (
  directory: string,
  query: string,
  options: { includeHidden: boolean; respectGitignore: boolean },
): string | null => {
  const serverQuery = mentionServerQuery(query);
  if (!directory || !serverQuery || query.includes(' ')) {
    return null;
  }
  return JSON.stringify([directory, serverQuery, options.includeHidden, options.respectGitignore]);
};

type MentionListState = 'rows' | 'loading' | 'empty';

/**
 * Rows while there are any to show, even the last query's while the next one
 * searches; the one-line loading row only with nothing to show yet; "no
 * matches" only once the current query's search has settled.
 */
export const mentionListState = (rowCount: number, pending: boolean): MentionListState => {
  if (rowCount > 0) return 'rows';
  return pending ? 'loading' : 'empty';
};

/**
 * Merge directory and file hits into one list ranked by match quality against
 * the full relative path. Multi-token queries require every token to appear
 * somewhere in the path, in any order.
 */
export function rankFileMentionResults(
  files: ProjectFileSearchHit[],
  directories: ProjectFileSearchHit[],
  query: string,
  limit = 20,
): FileMentionHit[] {
  const merged: FileMentionHit[] = [
    ...directories.map((hit) => ({ ...hit, kind: 'directory' as const })),
    ...files.map((hit) => ({ ...hit, kind: 'file' as const })),
  ];

  const tokens = tokenizeMentionQuery(query);
  if (tokens.length === 0) {
    return merged.slice(0, limit);
  }

  const pathOf = (hit: FileMentionHit) => hit.relativePath || hit.name;
  const candidates = tokens.length === 1
    ? merged
    : merged.filter((hit) => {
        const haystack = pathOf(hit).toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      });

  const primary = tokens.reduce((longest, token) => (token.length > longest.length ? token : longest));
  return rankByQuery(candidates, primary, (hit) => [pathOf(hit)], { limit });
}

export function filterStaleRecentFiles<T extends { path: string }>(
  files: readonly T[],
  stalePaths: ReadonlySet<string>,
): T[] {
  if (stalePaths.size === 0) {
    return [...files];
  }
  return files.filter((file) => !stalePaths.has(file.path));
}

