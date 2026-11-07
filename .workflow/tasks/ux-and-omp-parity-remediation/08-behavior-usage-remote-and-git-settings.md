# 08: Restore Behavior, Usage, Remote Instances, and Git settings pages to upstream design compliance

**Effort:** ux-and-omp-parity-remediation
**Task type:** bugfix
**Blocked by:** None
**Covers:** W13, W14, W15, W16
**Files:** `packages/ui/src/components/sections/behavior/BehaviorPage.tsx`; `packages/ui/src/components/sections/usage/UsagePage.tsx`; `packages/ui/src/components/sections/usage/usagePageState.ts`; `packages/ui/src/components/sections/remote-instances/RemoteInstancesPage.tsx`; `packages/web/server/lib/host/core-routes.js`; `packages/ui/src/components/sections/openchamber/GitSettings.tsx`; `packages/ui/src/components/sections/git-identities/GitPage.tsx`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `packages/ui/src/components/sections/PATTERNS.md`; `packages/ui/src/lib/theme/STYLING.md`
**Check:** `bun run --cwd packages/ui test && bun run --cwd packages/ui type-check && npx vitest run packages/web/server/lib/host/core-routes.test.js` → exits 0; verifies compliant BehaviorPage, UsagePage banners, filtered `desktop-local` client list, and restored GitSettings checkboxes.

- [ ] Rewrite `packages/ui/src/components/sections/behavior/BehaviorPage.tsx` to strictly follow `PATTERNS.md` and upstream `0056bf6a9`: remove `alignEnd={false}` on the preset `SettingsFieldRow` so the `Select` aligns right, wrap multiline editors in `SettingsStackedField` with capped widths instead of full-bleed `max-h-[70vh]`, render the custom instructions textarea only when `preset === 'custom'`, and restore the section `info` tooltip.
- [ ] In `packages/ui/src/components/sections/usage/UsagePage.tsx` and `usagePageState.ts`, restore the upstream `0056bf6a9` unconfigured-provider warning callout banner (`bg-[var(--status-warning-background)]`), `ClaudeCodeSignIn` prompt card, and styled error callout container (`bg-[var(--status-error-background)]`).
- [ ] In `packages/ui/src/components/sections/remote-instances/RemoteInstancesPage.tsx` (and/or `core-routes.js`), filter internal `clientKind === 'desktop-local'` loopback records out of the user-facing Paired Devices ("已配对的设备") list in Host Access Control so the local machine never appears as a paired remote device.
- [ ] In `packages/ui/src/components/sections/openchamber/GitSettings.tsx` and `GitPage.tsx`, restore the deleted `生成提交消息` (`generateCommitMessages`) and `用于提交消息的推理` (`commitMessageReasoning`) checkboxes alongside git notes and Change-Id, add a Commit Message Model selector bound to OMP's `commit` model role, and match upstream section spacing.
