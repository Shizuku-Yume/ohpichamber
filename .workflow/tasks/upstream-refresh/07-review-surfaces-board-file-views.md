# 07: Review surfaces, Board and file/Git views

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The UI renders upstream's Board, PR/review and tracker surfaces, references and comments, plus the Files, Git, worktree and diff views, on top of the refreshed server.

**Blocked by:** 06, 10
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/07.tsv` (268 paths: 235 clean/new, 18 both-side, 9 conflicts; +24k lines). Main locations: `packages/ui/src/components/{sourceBoard,comments,references,sourceControl,github,views}`, `packages/ui/src/lib/{source-control,trackers}`, and the host-related settings sections (`git-identities`, `projects`, `routing`, `remote-instances`). Deferred ownership from task 10: `components/ui/{JsonTreeViewer.tsx,JsonTreeView.tsx,JsonTreeView.test.tsx}` (needs this task's `views/files/FileTreeRowParts`/`fileTreeRow` and task 25's `lib/jsonTreeUtils`). Deferred from task 23: `stores/{useTrackerAuthStore,useTrackedItemsStore,useSourceBoardStore,useSourceControlAuthStore,useGitHubPrStatusStore}.ts` (+tests), `stores/{useChangeRequestContextStore,useInlineCommentDraftStore,useGitStore,useWalkthroughStore}.ts` (upstream reworks on this task's descriptors/DTOs); `stores/useLinearAuthStore(.test).ts` is deleted here once tasks 08/11/24 drop their imports.

**Read first:** Spec W5; task 31 consumes `views/files/FileTreeRowParts`/`fileTreeRow` — keep them exported; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `packages/ui/src/components/views/DOCUMENTATION.md`.
**Covers:** W5

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the affected UI tests pass, and in the running app the Board lists issues/PRs for a fixture repository, a PR diff renders, the Files tree opens a file, and a review comment thread can be created. Real path: one real host with credentials if available; otherwise the fixture and the limit are named.

## Done when

- [ ] Board, tracker and review components use the canonical client and task 06's routes; no direct provider fetch in the browser.
- [ ] Files/Git/diff views open the fixture repository and show changed files, hunks and the sticky scrollbar behavior.
- [ ] References and comments work across sessions and worktrees.
- [ ] View tests pass; large lists use the upstream virtualization.
- [ ] `JsonTreeViewer`/`JsonTreeView` adopt upstream on this task's file-tree pieces and task 25's `jsonTreeUtils`; no fork copy remains.
- [ ] The deferred stores (`useTrackerAuthStore`, `useTrackedItemsStore`, `useSourceBoardStore`, `useSourceControlAuthStore`, `useGitHubPrStatusStore`, `useChangeRequestContextStore`, `useInlineCommentDraftStore`, `useGitStore`, `useWalkthroughStore`) are reworked from upstream on the new registry/DTO shapes; no OpenCode-shaped field is faked.
- [ ] `useLinearAuthStore` is deleted after tasks 08/11/24 remove their imports (each task edits only its own files; coordinate the landing order).
- [ ] Session pins stay deferred: the missing Host source is the technical-debt entry `Session pins have no OMP source`; do not fake it.
