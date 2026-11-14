# 07: Model pickers load without jumping; walkthrough toggle gets its own label

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 06
**Covers:** W6
**Files:** `packages/ui/src/components/sections/shared/ModelRoleEditor.tsx`; `packages/ui/src/components/sections/agents/ModelSelector.tsx`; `packages/ui/src/components/sections/openchamber/{DefaultsSettings,GitSettings}.tsx`; locale keys for the walkthrough toggle
**Read first:** `research/feedback-2026-11-12/03-11-settings-parity.md` (items 5a, 5c); upstream `bc50ba56a:packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx:389-391` and the screenshot #10 map in `00-maintainer-feedback.md`; skills `locale-ui-patterns`, `performance-engineering`
**Check:** a render test shows the loading trigger while the OMP snapshot is pending and the model afterwards, never the "inherit" placeholder in between; the sections tests exit 0. Real path (Web): opening Sessions and Git settings shows the spinner trigger, then the model, with no jump; Sessions shows one "use default small model" checkbox and a separately labelled walkthrough toggle.
**Base commit:** 024cbc63a2bcafee01157aaffc0b229b41b60382

- [x] `ModelRoleEditor` and `ModelSelector` take `loading`, rendering the existing spinner trigger. `DefaultsSettings` and `GitSettings` pass it while their OMP state is null.
- [x] Give the walkthrough toggle its own label and info keys in all locales.

Check before: no render test existed; `ModelRoleEditor`/`ModelSelector` had no `loading` prop at base 024cbc63a (seen in `git diff`); walkthrough toggle keys were missing from locales.

Check after:
- Render test `packages/ui/src/components/sections/shared/ModelRoleEditor.test.tsx`: 1 pass. Loading trigger ("Loading...") while pending, no placeholder; model label after load. Log: `task07/render-test.log`.
- `VITEST_MAX_WORKERS=2 node ../../scripts/run-isolated-tests.mjs src/components/sections` (packages/ui, the project's `test` runner): exit 0, 56/56 test files passed. Log: `task07/sections-tests-isolated.log`. A single-process `bun test` over the same tree had 76 failures from shared module state across files (React duplicate copies, store leakage); those are not present under the isolated runner, so they are not counted.
- `messages.test.ts` + `chinese-token-copy.test.ts`: 19 pass. Log: `task07/locale-tests.log`.
- `bunx oxlint` on the 5 changed TS/TSX paths: exit 0. Log: `task07/oxlint.log`.
- `bun run type-check` (packages/ui): exit 1, 11 errors, all in unrelated files (e.g. `UsageStatsView.test.tsx`). Log: `task07/type-check.log`.
- `bun run dead-code`: exit 1, lists pre-existing unused exports in other modules; none in changed files. Log: `task07/dead-code.log`.
- Real path (Web, port 4107, `HOME=/tmp/ufb07-home`, `OPENCHAMBER_DATA_DIR=/tmp/ufb07-data`): Sessions pending shows "Loading..." in Default, Small and Walkthrough model triggers, then "Use the default model" after load. Git pending shows "Loading...", then the placeholder after load. Sessions shows one "Use default small model" checkbox and a separately labelled "Use default walkthrough model" toggle. Screenshots: `task07/sessions-pending.png`, `sessions-loaded.png`, `sessions-settings.png`, `git-pending.png`, `git-loaded.png`.

## Progress

Check after: run on the final code; results listed in the Check after block above (render test pass, isolated sections 56/56, locale 19 pass, oxlint exit 0, type-check and dead-code exit 1 with pre-existing errors outside changed files).

- Commits: `2a8a1c5da` locale keys (30 files); `64423ca23` render test; `a34cd2339` loading wiring in ModelSelector, ModelRoleEditor, DefaultsSettings, GitSettings. The last was uncommitted work by peer `ufb-07-impl`, which then hit a model quota cooldown; it was reviewed and committed here.
- Touched outside the four component files and the locale files: none.
- Not covered on the real path: a selected model name after load. The isolated HOME has no provider catalog, so the Model list is empty and no model could be picked. The model-shown branch is covered only by the render test.
- Known, not changed: the "Use default small model" and walkthrough checkboxes render as checked while OMP state is pending, before the real value arrives. This is a checkbox state, not a model trigger, and is outside the spinner requirement.

Review: pass. Self-review of `git diff 024cbc63a2bcafee01157aaffc0b229b41b60382`: no blocking findings.
