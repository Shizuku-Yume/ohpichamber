# 26: Product docs: English

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** 93cd252778d09f6a298d5410a6d72f3dd5148570
**Started:** 2026-11-04T06:30:00+08:00
**Finished:** 2026-11-04T07:10:00+08:00

**Delivers:** The English product documentation and `sidebar.config.json` describe the refreshed UI and OMP behavior, with no OpenCode engine claims.

**Blocked by:** 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 31, 32, 35
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/26.tsv` (34 English docs). Main locations: `packages/docs/content/docs/*.mdx` and `packages/docs/sidebar.config.json`; doc assets belong to task 29.

**Read first:** Spec W7; `packages/docs/README.md`; `.workflow/STYLE.md`; the task files of the features whose pages changed; `bun run docs:validate`.
**Covers:** W7

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run docs:validate` exits 0, every changed page renders in the docs build, and a link check finds no broken internal link. Real path: read the changed pages against the running app and correct any claim that does not match.

## Done when

- [x] Every page describes behavior that exists after the refresh; unverified platform behavior is labelled.
- [x] No page names OpenCode as the engine or links a removed VS Code surface.
- [x] Navigation covers the new pages and removes deleted ones.
- [x] `worktrees.mdx` documents worktree-row archive and Archive-page restore into a caller-created checkout after task 35: Host-verified active sessions reopen after the changes, while previously archived sessions remain archived. Explain confirmed new-checkout recovery, branch deletion defaulting to keep, and legacy unbound Git-only restore/delete with explicit warnings that sessions are not moved, unarchived or deleted and confirmation for unverified branch deletion.
- [x] Images and badges resolve locally; no upstream evidence images are restored.

## Progress

### Implementation and Verification Evidence (2026-11-04)
- **Base commit & Worktree:** Base commit `93cd252778d09f6a298d5410a6d72f3dd5148570` (upstream-refresh integration after Task 32). Worktree: `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-26`.
- **Check before:** Prerequisite tasks 31, 32, and 35 landed and verified on integration branch.
- **Documentation Updates:**
  - Added `packages/docs/content/docs/chat-input.mdx` documenting chat symbols (`/` commands, `$` skills, `#` snippets, `@` mentions/files), composer attachments, and keybindings.
  - Removed obsolete `packages/docs/content/docs/commands-snippets.mdx`.
  - Updated `packages/docs/content/docs/worktrees.mdx` to detail Task 35 worktree-row archival, uncommitted snapshot storage (`refs/openchamber/archive/<id>`), and Archive-page restore into caller-created checkouts (`openchamber/worktree-...`). Explains session relocation where Host-verified active sessions reopen in the new checkout while previously archived sessions remain archived, confirmed new-checkout recovery, branch deletion defaulting to keep, and explicit warnings/confirmation for legacy unbound Git-only archives.
  - Updated `packages/docs/content/docs/reverse-proxy.mdx` with upstream sign-in proxy exemptions for `/api/guest-files/` and explaining `/api/guests/` non-exemption.
  - Updated internal doc links in `index.mdx`, `projects.mdx`, `scheduled-tasks.mdx`, and `skills.mdx` pointing to `/chat-input/`.
  - Updated `packages/docs/sidebar.config.json` replacing `Commands & Snippets` with `Chat Input` across all 11 locale translations.
- **Audit Checks:**
  - No page names OpenCode as the engine; no page links removed VS Code surfaces.
  - 0 broken internal links across root English MDX docs.
  - 0 missing images or broken asset references.
- **Check after:**
  - `bun install --frozen-lockfile` exited 0.
  - `bun run docs:validate` exited 0 (672 pages, 56 sidebar links).
  - `bun run type-check` exited 0 (0 type errors in 3,190 files across 5 projects).
  - `bun run lint` exited 0.
  - `bun run test` exited 0 across all workspaces (scripts 23/23, sdk 26/26, ui 993/993, agent-contract 178/178, agent-service 265/265, electron 54/54, web 468/468 passed, 7,480 tests passed).
- **Real-path Web UI Verification:**
  - Started web HMR dev server at `http://127.0.0.1:5180` with backend API on port 3902.
  - Connected via Chrome DevTools CLI:
    - Verified desktop and mobile viewports.
    - Verified sidebar one-view with Chats and Projects sections, project worktrees, and Archive page navigation.
    - Verified chat input: typing `/` opens commands popup (`catch-up`, `craft-goal`, `debug`, `explore`, `init`, etc.); typing `$` opens skills popup (`chrome-devtools-cli`, `clack-cli-patterns`, `desktop-shell`, etc.).
    - Verified Archive view navigation and search UI.
- **Independent Reviewer Verdict:** PASS (subagent `Task26Reviewer` confirmed correctness of documentation, link integrity, and task acceptance criteria with 0 blocking issues).
