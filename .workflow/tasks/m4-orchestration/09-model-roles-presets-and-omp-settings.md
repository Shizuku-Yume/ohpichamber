# 09: Add visual selectors for all 16 OMP modelRoles, modelPresets, service tiers, and missing OMP settings

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** None
**Files:** `packages/agent-contract/src/settings.ts`, `packages/agent-contract/src/settings.test.ts`, `packages/agent-service/src/worker/catalog-settings.ts`, `packages/agent-service/src/worker/catalog-settings.test.ts`, `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx`, `packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx`, `packages/ui/src/lib/i18n/messages/ompSettingsI18n.ts`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.4, §2)
**Covers:** W12
**Check:** `bun test packages/agent-contract/src/settings.test.ts packages/agent-service/src/worker/catalog-settings.test.ts packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx` and `bun run type-check` exit 0.

- [ ] Replace the raw JSON `<Textarea>` for `modelRoles` in `OmpSettingsPage.tsx` with dedicated visual model + thinking-effort selectors and fallback indicators for all 16 OMP roles (`default`, `smol`, `slow`, `vision`, `plan`, `commit`, `tiny`, `memory`, `task`, `advisor`, `widget`, `image`, `web`, `speech`, `dictation`, `judge`).
- [ ] Expand `OMP_SETTING_IDS` in `packages/agent-contract/src/settings.ts` and `catalog-settings.ts` with `cycleOrder`, `modelPresets`, `modelRoleStorage`, `tier.openai`, `tier.anthropic`, `tier.google`, `tier.subagent`, `tier.advisor`, `out.enabled`, `tui.renderMermaid`, `tui.renderSvg`, `tui.autoGraph`, execution flow modes (`steeringMode`, `followUpMode`, `interruptMode`), and tool/buffer settings, and render their controls in `OmpSettingsPage.tsx`.
