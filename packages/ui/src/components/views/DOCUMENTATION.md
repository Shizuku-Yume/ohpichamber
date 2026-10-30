# Retained context views

`ContextPanel` keeps file, diff and walkthrough views mounted to preserve
navigation, expanded sections and editor state. Its `visible` prop combines
the panel's open state with the selected tab. Hiding via CSS alone does not
pause React effects.

File tree ownership and request rules are in `files/DOCUMENTATION.md`.
`DiffView` gates repository discovery, comparisons, per-file reads, viewport
measurement and keyboard navigation on visibility. Hidden refresh hints retain
only dirty paths scoped to runtime and directory; reopening invalidates those
paths and requests fresh status. Completed range diffs remain cached while
pending reservations are cancelled and retried on resume. Hidden tabs never
consume another tab's pending navigation request.

`WalkthroughView` gates discovery and source loading while retaining generated
results and any explicitly started generation job.

## Native turn history and file previews

Web, Electron, hosted mobile and Capacitor do not offer a Last turn diff scope.
The native execution contract supplies no turn-level file preimage or snapshot
from which to reconstruct that comparison. The application does not capture
replacement filesystem snapshots or substitute a working-tree diff for a turn
diff. Native undo changes the transcript branch only; it does not restore files.

Completed-turn changed-file chips open the existing file viewer for the current
file contents, with the mobile Files surface opened where applicable. They do
not promise historical content or a turn comparison. Existing tool file-change
cards remain unchanged. Working, staged, branch, commit and published pull
request comparisons continue to use their existing Git-backed sources.

## Large text files

The 200,000-character threshold selects an initial code preview, not read-only
permissions. Users can switch large text files into editing through the normal
view controls. Markdown, HTML, JSON and Draw.io retain their own preview-mode
preferences. Binary, image and outside-workspace restrictions still apply.
`fileEditorContent.ts` preserves the complete normalized text in both the loaded
snapshot and draft, and restores the detected line ending on save. Preview
limits must never truncate a writable draft or its dirty-comparison baseline.
Large code previews render the current draft and hash its full content only
while previewing, so same-length edits in the middle invalidate cached output.

## Pull request comparisons

DiffView, mobile Changes and walkthrough share `PullRequestComparisonSelector`
and the selection owned by `usePullRequestComparison`. PR mode reads the bound
provider's published patch through `/api/walkthrough/pr-diff`. It includes no local edits
or unpushed commits. `lib/diff/pullRequestDiff.ts` splits the response once;
Board handoffs are accepted only while their own read context matches a fresh
binding; a source from an old account is never adopted under a replacement account.
`useGitComparison` serves file patches from that same snapshot. Snapshot revisions
invalidate the view's patch cache atomically, including edits with unchanged
file names and line counts. Opening a file adds no network request.

PR comparisons retain completed snapshots across panel and mode switches.
`pullRequestSnapshotCache.ts` belongs to the retained view and deduplicates
in-flight reads. It keeps at most eight completed snapshots with a 32 MiB
text target, allowing one oversized PR to remain complete. Eviction drops cache
ownership only, never mounted content or pending requests.

The HTTP Git adapter emits `gitPushEvents` only after a successful push, with
the runtime captured at request start. Matching runtime/directory snapshots are
invalidated synchronously. A visible PR comparison refreshes immediately; a
hidden one waits until activation. Old pre-push reads cannot overwrite the new
snapshot. Explicit Refresh always reads again. Terminal and external-client
pushes require that manual refresh. Local status polls never invalidate PRs.
Walkthrough also retains its last PR read across visibility changes and reloads
after push, source, model or language changes. The PR picker retains its list
on panel switches; opening the picker or changing search still refreshes it.

Working-tree mutations are unavailable for PR snapshots, and "Load full files"
does not apply to them. Expanding collapsed context on one file works: the
expander asks `useGitComparison.fetchFullFile`, which reads both sides of that
file from GitHub through `/api/walkthrough/pr-file` (merge base and PR head),
never from disk, so local edits and unfetched fork commits cannot leak in or
block it. Existing inline comment controls still attach selected code to chat.
Changes hands its PR source to walkthrough; walkthrough's Changes action opens
PR mode with the shared selection. Picking a PR never generates a walkthrough.

Web, Electron, hosted mobile and Capacitor use the server route for PR comparisons.

Most focused tests use Bun. `MultiFileDiffEntry.vitest.tsx` exercises the real
diff component through the web workspace's Vitest runner because its transitive
UI imports require Vite asset transforms. The web test configuration includes
UI `*.vitest.tsx` fixtures; the isolated Bun runner intentionally does not.

## Archive page

`ArchiveView` lists archived top-level sessions. A subsession whose parent is
archived too is left out: it comes back when the parent is restored. A
subsession archived while its parent stays active is listed, indented under a
row with the parent's title, and the subsessions of one parent sit together at
the place of the newest of them. Without that row such a session would show
nowhere: the sidebar hides archived sessions, and the parent is not in the
archive. Restore brings it back on its own, under that parent. One rule,
`isRestorableOnItsOwn` in `sync/session-restore-rule.ts`, decides what the page
lists, when the chat header's session menu offers Restore, and what the restore
action accepts, so the three never disagree.

The page also lists a selected project's archived worktrees above its archived
sessions, and on the phone every project's archived worktrees above the list.
Each row shows the worktree name, branch and archive date with **Restore** and
**Delete** (always visible on touch). Restore creates the checkout on the
recorded branch before the Host applies the archive, then reopens the recorded
sessions; the row's Delete asks before removing the sessions, the archive and
its local branch. The listing is `lib/worktrees/worktreeArchive.ts`; the
repository's archive refs are the record, and a failed listing keeps the last
one instead of showing an empty archive.
