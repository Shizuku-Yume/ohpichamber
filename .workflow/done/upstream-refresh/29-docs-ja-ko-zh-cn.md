# 29: Docs: Japanese, Korean, Chinese and doc assets

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** 6fdfd38c8d1b6e18306ce3e5e97ac3f74d6a907f
**Started:** 2026-11-04T07:00:00+08:00
**Finished:** 2026-11-04T07:45:00+08:00

**Delivers:** The ja/ko/zh-cn documentation and the remaining doc assets are at the upstream revision, aligned with the refreshed English pages.

**Blocked by:** 26
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/29.tsv` (110 paths: 52 clean/new, 52 both-side, 25 conflicts; includes `docs/references/` images). Main locations: `packages/docs/content/docs/{ja,ko,zh-cn}/`, `docs/references/`.

**Read first:** Spec W7; `packages/docs/README.md`; the English pages changed by task 26; `.agents/skills/locale-ui-patterns/SKILL.md`.
**Covers:** W7

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run docs:validate` exits 0 and the three locales render with no missing-page or broken-link error. Real path: spot-check one changed page per locale and one image reference.

## Done when

- [x] No locale page describes a feature that does not exist.
- [x] Engine vocabulary matches the fork's terms.
- [x] Doc images resolve from the repository; no external hotlink is introduced.

## Progress

### Implementation and Verification Evidence (2026-11-04)
- **Base commit & Worktree:** Base commit `6fdfd38c8d1b6e18306ce3e5e97ac3f74d6a907f` (tip of `upstream-refresh/integration`). Worktree: `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-29` (branch `upstream-refresh/29`).
- **Exact Path Ownership (`plan-paths/29.tsv`, 110 paths total):**
  - **Doc Assets (`docs/references/`, 16 paths):**
    - Updated badges (3): `openchamber-logo-dark.png`, `openchamber-logo-dark.svg`, `openchamber-logo-light.svg` checked out from upstream `0056bf6a9`.
    - Brand animations & screenshots (10): `brand/cube-levitation.html`, `brand/cube-tumble.html`, `desktop_dark.png`, `desktop_light.png`, `mobile/{chat,context_usage,new_session}_{dark,light}.png` adopted.
    - Upstream deletions (3): `chat_example.png`, `pwa_chat_example.png`, `pwa_diff_example.png` removed.
    - Exclusions verified: `pr-evidence/`, `pr-4002/`, and upstream review images excluded.
  - **Locale Pages (`packages/docs/content/docs/{ja,ko,zh-cn}/`, 31 paths each = 93 paths):**
    - Upstream deletions (3): `commands-snippets.mdx` (ja, ko, zh-cn) removed.
    - New adoptable (3): `chat-input.mdx` (ja, ko, zh-cn) adopted from `0056bf6a9`, verified free of OpenCode engine claims.
    - Clean adoptable (36): 10 per locale checked out (`desktop-tunnels`, `git-identities`, `git`, `github`, `reverse-proxy`, `sdk/ui`, `skills`, `tunnels`, `usage`), and 2 per locale (`magic-prompts`, `project-actions`) adapted to remove VS Code references.
    - Both-live clean merges & adaptations (51): `chats`, `extensions`, `integrations`, `issues-and-prs`, `notes-todos-plans`, `notifications`, `repository-config`, `scheduled-tasks`, `quickstart`, `index`, `agent-control-tool`, `classification-providers`, `environment`, `install`, `security`, `sessions-in-work`, `walkthrough` across all 3 locales verified preserving fork invariants (OMP-only runtime, Host credentials/egress security, no VS Code).
    - Worktree archive sections added in `ja`, `ko`, and `zh-cn` translating Task 35 Host worktree-row archive, uncommitted snapshot references (`refs/openchamber/archive/<id>`), and Archive-page restore contracts.
  - **Sidebar Configuration (`packages/docs/sidebar.config.json`, 1 path):**
    - Added missing `zh-CN` and `ko` translations for `Multi-run` and `Git & GitHub`.
- **Audit Checks:**
  - No page names OpenCode as the engine; no page links removed VS Code surfaces.
  - 0 broken internal links across all 672 MDX docs.
  - 0 missing images or broken asset references.
- **Verification Evidence:**
  - `bun install --frozen-lockfile` exited 0 (137 packages installed/verified).
  - `bun run docs:validate` exited 0 (672 pages, 56 sidebar links).
  - `bun run type-check` exited 0 (0 type errors in 3,190 files across 5 projects).
  - `bun run lint` exited 0 across all 7 workspace packages.
  - `bun run test` exited 0 across all workspaces (7/7 suites passed: scripts 23/23, sdk 26/26, ui 993/993, agent-contract 178/178, agent-service 265/265, electron 54/54, web 468/468 passed, 7,480 tests passed).
- **Real-path Browser Spot-Checks:**
  - Served rendered pages locally via HTTP server and verified via Chrome DevTools CLI:
    - `zh-cn/chat-input.mdx` rendered; screenshot at `/home/shizuku/Project/ohpichamber-omp-artifacts/task29-2026-11-04/browser-spotcheck-zh-cn.png`.
    - `ja/worktrees.mdx` rendered; screenshot at `/home/shizuku/Project/ohpichamber-omp-artifacts/task29-2026-11-04/browser-spotcheck-ja.png`.
    - `ko/reverse-proxy.mdx` rendered; screenshot at `/home/shizuku/Project/ohpichamber-omp-artifacts/task29-2026-11-04/browser-spotcheck-ko.png`.
    - Logo badges (`openchamber-logo-dark.{png,svg}`); screenshot at `.../browser-spotcheck-assets.png`.
    - Brand animation asset (`brand/cube-levitation.html`); screenshot at `.../browser-spotcheck-brand.png`.
- **Independent Reviewer Verdict:** PASS (subagent `Task29Reviewer` verified all 110 paths, translation fidelity, fork invariant preservation, and absence of unassigned assets; verified duplicate setup step resolution in `integrations.mdx` with 0 remaining findings).
