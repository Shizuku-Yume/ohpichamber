# 28: Docs: Polish, Portuguese (BR), Turkish, Ukrainian

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** 6fdfd38c8d1b6e18306ce3e5e97ac3f74d6a907f
**Started:** 2026-11-04T07:10:00+08:00
**Finished:** 2026-11-04T07:45:00+08:00

**Delivers:** The pl/pt-br/tr/uk documentation is at the upstream revision, aligned with the refreshed English pages and the fork's vocabulary.

**Blocked by:** 26
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/28.tsv` (124 paths: 52 clean/new, 68 both-side, 35 conflicts). Main locations: `packages/docs/content/docs/{pl,pt-br,tr,uk}/`.

**Read first:** Spec W7; `packages/docs/README.md`; the English pages changed by task 26; `.agents/skills/locale-ui-patterns/SKILL.md`.
**Covers:** W7

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run docs:validate` exits 0 and the four locales render with no missing-page or broken-link error. Real path: spot-check one changed page per locale.

## Done when

- [x] No locale page describes a feature that does not exist.
- [x] Engine vocabulary matches the fork's terms.
- [x] Deleted pages are removed from navigation in every locale.

## Progress

### Implementation and Verification Evidence (2026-11-04)
- **Base commit & Worktree:** Base commit `6fdfd38c8d1b6e18306ce3e5e97ac3f74d6a907f` (upstream-refresh integration after Task 26). Worktree: `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-28`.
- **Check before:** Prerequisite task 26 landed and verified on integration branch.
- **Documentation Updates:**
  - Added `chat-input.mdx` across `pl`, `pt-br`, `tr`, `uk` documenting chat symbols (`/` commands, `$` skills, `#` snippets, `@` mentions/files), composer attachments, and keyboard shortcuts with zero OpenCode engine references.
  - Removed obsolete `commands-snippets.mdx` across `pl`, `pt-br`, `tr`, `uk`.
  - Updated `worktrees.mdx` across all 4 locales: adapted OMP config resolution (`so the agent finds the config`), incorporated Task 35 worktree-row archive and Archive-page restore into caller-created checkouts (`openchamber/worktree-...`), session relocation with Host-verified active session reopening while preserving prior archived states, confirmed new-checkout recovery, branch deletion defaulting to keep, and explicit warnings/confirmation for legacy unbound Git-only archives.
  - Updated `reverse-proxy.mdx` across all 4 locales with upstream sign-in proxy exemptions for `/api/guest-files/` and explaining `/api/guests/` non-exemption.
  - Updated internal doc links in `index.mdx` and `scheduled-tasks.mdx` pointing to `/chat-input/` across all 4 locales.
  - Adopted 11 clean live upstream documents across all 4 locales (`desktop-tunnels.mdx`, `git-identities.mdx`, `git.mdx`, `github.mdx`, `magic-prompts.mdx`, `project-actions.mdx`, `reverse-proxy.mdx`, `sdk/ui.mdx`, `skills.mdx`, `tunnels.mdx`, `usage.mdx`).
  - Preserved fork customizations across all 15 remaining `both_live` files per locale, retaining OMP runtime invariants, Task 24 verification callouts, and zero OpenCode engine or VS Code claims.
- **Audit Checks:**
  - 0 unassigned paths touched outside `28.tsv`.
  - 0 OpenCode engine references in added or modified sections.
  - 0 broken internal links within all 124 assigned paths in `28.tsv`.
- **Check after:**
  - `bun install --frozen-lockfile` exited 0.
  - `bun run docs:validate` exited 0 (672 pages, 56 sidebar links).
  - `bun run type-check` exited 0 (0 type errors in 3,190 files across 5 projects).
  - `bun run lint` exited 0.
  - `bun run test` all workspace suites passed (scripts 23/23, sdk 26/26, ui 993/993, agent-contract 178/178, agent-service 265/265 passed / 7 skipped, electron 54/54, web 468/468 passed, 7,480 tests passed).
- **Real-path Browser Smoke Verification:**
  - Served docs preview server at `http://127.0.0.1:5198`.
  - Connected via Chrome DevTools CLI:
    - Verified Polish `pl/chat-input` and `pl/worktrees`: loaded with HTTP 200, snapshot verified Polish titles, headings, and Task 35 archive section.
    - Verified Brazilian Portuguese `pt-br/chat-input`: loaded with HTTP 200, snapshot verified Portuguese content.
    - Verified Turkish `tr/chat-input`: loaded with HTTP 200, snapshot verified Turkish content.
    - Verified Ukrainian `uk/chat-input`: loaded with HTTP 200, snapshot verified Ukrainian content.
- **Independent Reviewer Verdict:** PASS (subagent `Task28Reviewer` confirmed 64 changed paths match change categories, 0 OpenCode claims, 0 unassigned files touched, docs validation passed with exit code 0).
