import type { TrackedThread, TrackedThreadKind, TrackedWorkItem } from './model';

// The items behind a session's links, in the shape the server follows.

/** A linked issue, discussion or change request on any source-control provider, as the item the server follows. */
export const repositoryThread = <Kind extends TrackedThreadKind>(
  kind: Kind,
  ref: { provider: string; instance: string; owner: string; repo: string; number: number },
): TrackedThread<Kind> => (
  { provider: ref.provider, instance: ref.instance, kind, owner: ref.owner, repo: ref.repo, number: ref.number }
);

/** A tracker's work item, as the item the server follows. */
export const workItem = (provider: string, identifier: string): TrackedWorkItem => (
  { provider, kind: 'work-item', identifier: identifier.toUpperCase() }
);

export const githubThread = (kind: 'pull' | 'issue', ref: { owner: string; repo: string; number: number }) =>
  repositoryThread(kind, { provider: 'github', instance: 'github.com', ...ref });

export const gitlabThread = (kind: 'pull' | 'issue', ref: { owner?: string; repo?: string; projectPath?: string; instance?: string; number: number }) => {
  const owner = ref.owner ?? ref.projectPath?.split('/')[0] ?? '';
  const repo = ref.repo ?? ref.projectPath?.split('/')[1] ?? '';
  return repositoryThread(kind, { provider: 'gitlab', instance: ref.instance ?? 'gitlab.com', owner, repo, number: ref.number });
};

export const linearIssue = (identifier: string) => workItem('linear', identifier);
