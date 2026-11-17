# 15: Remove small-print audit lines from the OMP config.yml footer

**Effort:** ux-feedback-2026-11-15
**Task type:** bugfix
**Blocked by:** None
**Covers:** W13
**Files:** `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx`; `packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx`; `packages/ui/src/components/sections/shared/SettingsSection.tsx` (only if making `SettingsSection` `children` optional); `packages/ui/src/lib/i18n/messages/omp-settings.i18n.ts`; `packages/ui/src/lib/i18n/messages.test.ts`; `packages/agent-contract/src/catalogs.ts`; `packages/agent-service/src/worker/settings-ui.ts`; `packages/agent-service/src/worker/settings-ui.test.ts`
**Read first:** `.workflow/specs/ux-feedback-2026-11-15.md` (2026-11-18 follow-up amendment) (item 2, W13); decisions.md 2026-11-18 "Drop the placementCounts breakdown from the OMP config.yml footer"; `/home/shizuku/Project/ohpichamber-omp-artifacts/feedback-2026-11-18/` (`6-pasted-image-f9160c60526d2e46.png`); `AGENTS.md` OMP surface rules
**Check:** `bun test packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx packages/ui/src/lib/i18n/messages.test.ts packages/agent-service/src/worker/settings-ui.test.ts && bun run --cwd packages/agent-contract test && bun run --cwd packages/ui type-check` → all exit 0; real path on Web at 1600 px (`zh-CN`): open Settings → OMP → 高级, scroll to bottom, screenshot `omp.configFile` showing only `仍需在 config.yml 中修改` and the `打开 config.yml` button with zero small-print paragraphs underneath.

- [ ] Remove the three placement-count `<p>` lines (`tuiOnly`, `elsewhere`, `boundary`) and the raw `state.configPath` `<p>` from `OmpSettingsPage.tsx`'s `omp.configFile` section on the 高级 tab, keeping a clean divider row/header with `settings.omp.configFile.title`, `data-settings-item="omp.configFile"`, and the `打开 config.yml` button wired to `revealPath(state.configPath)`.
- [ ] Verify via LSP/grep whether any other caller reads `placementCounts`; if none, remove `placementCounts` cleanly from `OmpSettingsStateSchema` (`packages/agent-contract/src/catalogs.ts`), `packages/agent-service/src/worker/settings-ui.ts` (and rebuild `packages/agent-service/dist`), and tests.
- [ ] Delete the obsolete `settings.omp.configFile.{terminal,elsewhere,egress}` keys across all 15 locales in `omp-settings.i18n.ts` and update `messages.test.ts` and `OmpSettingsPage.test.tsx`.
