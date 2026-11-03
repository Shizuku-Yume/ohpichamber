# 27: Docs: German, Spanish, French, Dutch

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** 6fdfd38c8d1b6e18306ce3e5e97ac3f74d6a907f
**Started:** 2026-11-04T07:15:00+08:00
**Finished:** 2026-11-04T08:00:00+08:00

**Delivers:** The de/es/fr/nl documentation is at the upstream revision, with terminology aligned to the refreshed English pages and the fork's engine vocabulary.

**Blocked by:** 26
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/27.tsv` (124 paths: 52 clean/new, 68 both-side, 32 conflicts). Main locations: `packages/docs/content/docs/{de,es,fr,nl}/`.

**Read first:** Spec W7; `packages/docs/README.md`; the English pages changed by task 26; `.agents/skills/locale-ui-patterns/SKILL.md` (for product terminology).
**Covers:** W7

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run docs:validate` exits 0 and the four locales render with no missing-page or broken-link error. Real path: spot-check one changed page per locale against the English page.

## Done when

- [x] No locale page describes a feature that does not exist.
- [x] Engine vocabulary matches the fork's terms; OpenCode is not named as the runtime.
- [x] Deleted upstream pages are removed from navigation in every locale.

## Progress

### Implementation and Verification Evidence (2026-11-04)
- **Base commit & Worktree:** Base commit `6fdfd38c8d1b6e18306ce3e5e97ac3f74d6a907f` (upstream-refresh integration after Task 26). Worktree: `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-27` on branch `upstream-refresh/27`.
- **Path Inventory & Dispositions (124/124 paths fulfilled):**
  - Exactly 124 paths specified in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/27.tsv` (31 distinct documents across `de`, `es`, `fr`, and `nl`).
  - `up_deleted_fork_untouched` (4 paths): `packages/docs/content/docs/{de,es,fr,nl}/commands-snippets.mdx` deleted, following upstream `0056bf6a9` and Task 26.
  - `new_adoptable` (4 paths): `packages/docs/content/docs/{de,es,fr,nl}/chat-input.mdx` adopted with complete localized text, correct frontmatter, and verified internal links.
  - `clean_live` (48 paths): 12 documents across all 4 locales updated to upstream `0056bf6a9` (`desktop-tunnels`, `git-identities`, `git`, `github`, `magic-prompts`, `project-actions`, `reverse-proxy`, `sdk/ui`, `skills`, `tunnels`, `usage`, `worktrees`). In `worktrees.mdx`, Task 35 worktree row archive/restore and snapshot ref documentation (`refs/openchamber/archive/<id>`) was translated natively via the `writer` subagent and incorporated with OMP agent terminology.
  - `both_live` (68 paths): 17 documents across all 4 locales merged and adapted:
    - 36 clean merges (`chats`, `extensions`, `integrations`, `issues-and-prs`, `notes-todos-plans`, `notifications`, `quickstart`, `repository-config`, `scheduled-tasks`) with OMP runtime terminology adaptations.
    - 32 conflicting files resolved (`agent-control-tool`, `classification-providers`, `environment`, `index`, `install`, `security`, `sessions-in-work`, `walkthrough`): preserved fork's Host security, OMP architecture, and unverified feature labels while incorporating upstream feature descriptions (e.g. sent message puts session in work, diff header whole-file comments).
  - Scope constraint strictly respected: 0 files outside the 124-path inventory modified.
- **Terminology & Quality Standard:**
  - Zero OpenCode engine/runtime references across all changed documents; runtime correctly framed as OMP with Host supervisor.
  - 100% genuine translations in German, Spanish, French, and Dutch; zero English placeholder copy.
  - Link integrity: 0 broken internal links in all task-owned paths.
- **Verification Suites:**
  - `bun install --frozen-lockfile` exited 0.
  - `bun run docs:validate` exited 0 (672 pages, 56 sidebar links).
  - `bun run type-check` exited 0 (0 errors in 3,190 files across 5 projects).
  - `bun run lint` exited 0 across all workspaces.
  - `bun run test` all workspace suites passed:
    - `scripts`: 23/23 files passed
    - `sdk`: 26/26 files passed
    - `ui`: 993/993 files passed
    - `agent-contract`: 178/178 tests passed
    - `agent-service`: 265 passed, 7 skipped, 0 failed (43 files)
    - `electron`: 54/54 files passed (with vendor exclusion)
    - `web`: 468 passed, 9 skipped, 7,480 tests passed
- **Real-Path Spot-Checks:**
  - Spot-checked changed documents per locale:
    - `de`: `chat-input.mdx` verified structure and sections against English source.
    - `es`: `worktrees.mdx` verified full Task 35 archival/restore section and snapshot references.
    - `fr`: `reverse-proxy.mdx` verified sign-in proxy `/api/guest-files/` bypass configuration.
    - `nl`: `agent-control-tool.mdx` verified Host boundary action controls.
- **Independent Review:** Subagent `Task27Reviewer` verified git diff, path inventory adherence, terminology, link integrity, and docs validation, issuing a definitive `PASS`.
