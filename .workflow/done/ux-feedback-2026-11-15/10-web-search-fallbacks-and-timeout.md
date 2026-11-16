# 10: Redesign web-search fallbacks and move the timeout to the top

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 07
**Covers:** W8
**Files:** `packages/ui/src/components/sections/websearch/{WebSearchPage.tsx,WebSearchPage.test.tsx}`, `packages/ui/src/lib/i18n/messages/` (web search keys)
**Read first:** `research/feedback-2026-11-15/SettingsLayout.md` (F8, F9, fixes C and D); `.agents/skills/drag-to-reorder/SKILL.md`; `SettingsSortableList.tsx`, `SettingsSortableVisibilityList.tsx`, `ProviderAccounts.tsx`, `ChatSettings.tsx` stepper row
**Check:** `WebSearchPage.test.tsx` covers the empty state, add via menu, icon remove and reorder; `bun run --cwd packages/ui test` exits 0. Real path (1600 px): the timeout row is in the first section with the shared stepper width; with three fallbacks the list spans the row, shows warnings only for missing setup, and keyboard (Space + Arrow) and touch long-press reordering persist after reload; Settings search "timeout" highlights the row.
**Base commit:** 32876d555aac9ebfd7a63457bfc2a9115abc5ad5

- [x] The fallback list uses the full row: drag handle, ordinal, name, a warning pill only when a key or setup is missing, and an icon remove button with an aria label.
- [x] "Add fallback" is a `DropdownMenu` from an outline button with an add icon, disabled with a helper when nothing is addable; an empty list shows one helper line.
- [x] The timeout is a `SettingsFieldRow` in the first section with the shared stepper class, unit and reset; its bottom section is gone.
- [x] Copy in all 15 locales.

## Progress

- Base commit `32876d555aac9ebfd7a63457bfc2a9115abc5ad5`, unchanged since task start.
- **Check before:** `baseline-before.png` (1600 px): the timeout lived in its own bottom section below the fallbacks, the fallback list was capped at 24 rem inside the section row, and every row carried a green "Configured" success pill whether or not it needed attention.
- **Check after** (final tree at HEAD `6b4b8213cb`, after merging `ux-feedback-2026-11-15/integration`):
  - `VITEST_MAX_WORKERS=2 bun test src/components/sections/websearch/WebSearchPage.test.tsx` (packages/ui) → **10 pass, 0 fail**, 33 expect calls. Covers the empty state's single helper line, the add menu's addable-only list and append, the disabled add action with its explanation when nothing is addable, icon-only remove by aria label, warning pills only for a missing key or setup, and keyboard reorder saving the whole chain.
  - `VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test` → **exit 0, 1245/1245 test files passed** (log `ui-test-after-merge.log`).
  - `bun run type-check:ui` → **✓ No type errors in 3,548 files across 2 projects**.
  - `bunx oxlint packages/ui/src/components/sections/websearch/ packages/ui/src/lib/i18n/messages/websearch.i18n.ts` → **exit 0**, no findings.
  - `bun run dead-code` → no web-search finding; the report is unchanged pre-existing backlog (43 unused files, 168 unused exports, 116 unused exported types, 7 configuration hints). The only line matching "configured" is `configuredAgentColor` in `agentColors.ts`, unrelated. Log `dead-code-after-merge.log`.
  - **Real path — 14/14 steps pass** at 1600 px on port 4150 at HEAD `6b4b8213cb`, real Host + Agent Service with isolated `HOME`/`OPENCHAMBER_DATA_DIR`. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task10/` (`NOTES.md`, `results.json`, `measurements.json`, 14 screenshots). Timeout row sits in the first section (`web-search.provider`, index 0); its stepper is **132.48 × 30 px**, identical to the shared Settings → Sessions "Turn limit" stepper; the fallback list and every row measure **744 px**, the full section width, not 24 rem; only Brave (no key) shows a warning pill; keyboard (Space + arrows) and real CDP touch long-press reordering each persisted across a reload; the empty state shows exactly one helper line; the add menu lists only addable providers; timeout 60 → 90 round-trips, survives reload, and Reset returns 60; Settings search "timeout" lists and highlights the row.
  - Reordered by the review round: logical `text-end` for the ordinal, and the "nothing addable" helper suppressed when the list is empty so the empty state stays one line (`d1d743935a`).
- **Review:** pass — `t10-review` (independent reviewer worker session, wrote no code), 2 rounds, no blocking findings. Non-blocking N1, N2, N5, N6 were fixed in `d1d743935a`; N4 was partly fixed in `fb755d3139` (seven web-search native keys added for ar/he), with the remaining pre-existing ar/he gaps (`native.loadFailed`, `native.enabled`, `native.enterprise`, `native.unconfigured`, `section.keys`) left outside this task; N3 (a bespoke gap utility) was skipped as allowed by the layout guard.
- **Merge:** merged `ux-feedback-2026-11-15/integration` (47 commits) with a real merge, no conflicts; both sides' locale keys kept.
- **Stale build note:** the first post-merge `packages/ui` test run failed 8 files and `type-check:ui` reported 9 errors because the gitignored `packages/agent-contract/dist` predated the merged `MCP_OAUTH_*` exports and the new `placementCounts` field. Rebuilding that dependency (`bun run --cwd packages/agent-contract build`, build output only) cleared both; the numbers above are the re-runs.
- **Settings file:** this task changes no settings-registry source. The `web-search.timeout` search anchor already existed at the base commit and is byte-identical now, so the Settings search highlight needed no edit; the `lib/settings/search.ts` diff in the merged range belongs to the OMP-tabs task (`64a2861bc5`), not to this one.
