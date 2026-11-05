# 09: Add visual selectors for all 16 OMP modelRoles, modelPresets, service tiers, and missing OMP settings

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** None
**Files:** `packages/agent-contract/src/settings.ts`, `packages/agent-contract/src/settings.test.ts`, `packages/agent-service/src/worker/catalog-settings.ts`, `packages/agent-service/src/worker/catalog-settings.test.ts`, `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx`, `packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx`, `packages/ui/src/lib/i18n/messages/ompSettingsI18n.ts`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.4, §2)
**Covers:** W12
**Check:** `bun test packages/agent-contract/src/settings.test.ts packages/agent-service/src/worker/catalog-settings.test.ts packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx` and `bun run type-check` exit 0.
- **Base commit:** 1e903152221e0efef535f8f45bc29458ede64ccb

- [x] Replace the raw JSON `<Textarea>` for `modelRoles` in `OmpSettingsPage.tsx` with dedicated visual model + thinking-effort selectors and fallback indicators for all 16 OMP roles (`default`, `smol`, `slow`, `vision`, `plan`, `commit`, `tiny`, `memory`, `task`, `advisor`, `widget`, `image`, `web`, `speech`, `dictation`, `judge`).
- [x] Expand `OMP_SETTING_IDS` in `packages/agent-contract/src/settings.ts` and `catalog-settings.ts` with `cycleOrder`, `modelPresets`, `modelRoleStorage`, `tier.openai`, `tier.anthropic`, `tier.google`, `tier.subagent`, `tier.advisor`, `out.enabled`, `tui.renderMermaid`, `tui.renderSvg`, `tui.autoGraph`, execution flow modes (`steeringMode`, `followUpMode`, `interruptMode`), and tool/buffer settings, and render their controls in `OmpSettingsPage.tsx`.

## Progress

Check before:
- `bun test packages/agent-contract/src/settings.test.ts packages/agent-service/src/worker/catalog-settings.test.ts packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx`: 11 pass, 0 fail.
- `bun run type-check`: 0 errors in 3,197 files.

Work:
- Expanded `OMP_SETTING_IDS` in `packages/agent-contract/src/settings.ts` with 39 new IDs (`cycleOrder`, `modelPresets`, `modelRoleStorage`, `tier.openai`, `tier.anthropic`, `tier.google`, `tier.subagent`, `tier.advisor`, `out.enabled`, `tui.renderMermaid`, `tui.renderSvg`, `tui.autoGraph`, `steeringMode`, `followUpMode`, `interruptMode`, `composer.predictions`, `composer.predictionAlternatives`, tool buffer caps, and tool execution flags).
- Added unit tests in `settings.test.ts` and `catalog-settings.test.ts` confirming all 39 IDs are registered in OMP without credentials and support atomic write/flush.
- Created `ompModelRoles.ts` defining all 16 roles (`default`, `smol`, `slow`, `vision`, `plan`, `commit`, `tiny`, `memory`, `task`, `advisor`, `widget`, `image`, `web`, `speech`, `dictation`, `judge`), parsing/formatting for `${provider}/${modelId}:${effort}`, and dynamic fallback resolution (`resolveRoleFallback`).
- Replaced the raw JSON `<Textarea>` for `modelRoles` in `OmpSettingsPage.tsx` with dedicated visual model + thinking-effort selectors and dynamic fallback indicators for all 16 roles.
- Added 15-locale native i18n support in `omp-settings.i18n.ts` and created `ompSettingsI18n.ts`.
- Validated via automated tests, typecheck, oxlint, and live browser session on ports 5202/3932 with isolated `m4-b` context.

Check after:
- `bun test packages/agent-contract/src/settings.test.ts packages/agent-service/src/worker/catalog-settings.test.ts packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx`: 14 pass, 0 fail (404 expect calls).
- `bun run type-check`: 0 type errors in 3,199 files across 5 projects.
- `bunx oxlint`: 0 warnings, 0 errors.
- Live browser smoke check on port 5202: all 16 roles rendered with badges, selectors, thinking effort, fallback indicators, and expanded settings.
