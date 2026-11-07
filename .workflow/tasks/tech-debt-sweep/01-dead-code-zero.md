# 01: Eliminate inherited dead files, unused exports/types, and knip configuration hints

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** None
**Covers:** W1
**Files:** `knip.json`; `packages/ui/src/components/sections/agents/AgentSelector.tsx`; `packages/ui/src/lib/settings/vscodeNavigation.ts`; `packages/ui/src/components/chat/workflows/WorkflowRunCard.tsx`; `packages/ui/src/sync/workflow-activity.ts`; `packages/ui/src/components/desktop/DesktopInstanceMenu.tsx`; `packages/agent-service/src/worker/catalog-settings.ts`; `packages/ui/src/lib/api/types.ts`
**Read first:** `.workflow/specs/tech-debt-sweep.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-gate-2026-11-07/receipts/gate-deadcode.log`; `.agents/skills/openchamber-change-discipline/SKILL.md`
**Check:** `bun run dead-code && bun run type-check && bun run --cwd packages/ui test` → exits 0 with 0 unused files, 0 unused exports, 0 unused types, and 0 configuration hints.

- [ ] Audit and delete genuinely unused files reported by `bun run dead-code` (18 files, verifying no dynamic/runtime imports or tests rely on them) and delete associated orphaned dead tests if any.
- [ ] Audit and un-export or remove the 65 unused value exports and 69 unused exported types reported by `bun run dead-code` (without touching `IntegrationsCatalogView.tsx`, `useTextareaInlinePicker.tsx`, `useSidebarGroupStatus.ts`, `ChatInput.tsx`, or `DiffWorkerProvider.tsx`).
- [ ] Fix the 3 `knip.json` configuration hints (`packages/mobile`, `fix-deprecation.js`, `packages/web/bin/cli.js`) without adding blanket ignore masks, so `bun run dead-code` exits `0`.
