# 09: Rewrite routing categories as a disclosure list that saves only when valid

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 07
**Covers:** W7
**Files:** `packages/ui/src/components/sections/routing/{RoutingPage.tsx,RoutingPage.test.tsx}`, `packages/ui/src/components/sections/shared/SettingsSection.tsx` (`SettingsDisclosure`), `packages/ui/src/components/sections/PATTERNS.md`, `packages/ui/src/components/sections/references/layout.md`, `packages/ui/src/lib/i18n/messages/routing.i18n.ts`
**Read first:** `research/feedback-2026-11-15/SettingsLayout.md` (F6, F7, fix B); `decisions.md` 2026-11-15 "Routing categories are a flat disclosure list…"; `packages/web/server/lib/routing/store.js` schema
**Check:** `RoutingPage.test.tsx` adds a case where Add with no description shows the helper and does not call `saveConfig`, then typing one saves a valid payload; `bun run --cwd packages/ui test` exits 0. Real path (isolated data dir): add category "Docs" with a description → status saved and `routing.json` gains `categories.docs` with `{builtin:false,name,description}`; clearing a name or description shows the helper and never sends an invalid save.
**Base commit:** 07c9e1dffa8417eff33ba0e2b34a7d7eeb5efa14

- [x] `SettingsDisclosure` (title, secondary, trailing accessory, expanded, onToggle, children; flat, `aria-expanded`) joins `SettingsSection.tsx` and `PATTERNS.md`; `CategoryRow` wraps it and loses the `divide-y border-y` chrome.
- [x] Enable is a `SettingsCheckboxRow`.
- [x] The add row fills its line, submits on Enter or the button, and expands the new category with its description focused.
- [x] The debounced save runs only for a valid draft; an invalid one shows an inline helper and keeps the save state idle.
- [x] Removed built-ins restore inline at the end of the list; the readiness line sits above the list.

## Progress

- Check before: the old code created a category with `description: ''`, which the server rejects (400), so the page reported "Save failed" and re-sent the invalid config on every later edit; removing the validity gate from `flush()` and rerunning `RoutingPage.test.tsx` reproduces it (`saveConfig` receives the invalid draft, one call). Research F6 plus that negative check are the pre-change evidence.
- Check after: `cd packages/ui && bun test src/components/sections/routing/RoutingPage.test.tsx` -> 8 pass, 0 fail. `VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test` -> 1240/1240 test files passed, exit 0 (log `ux-feedback-2026-11-16/task09/checks-ui-test-r2.log`). Real path over the real Host on port 41490 with an isolated throwaway data dir: 37/37 assertions pass, receipts in `ux-feedback-2026-11-16/task09/RESULTS.md`; `routing.json` gained `categories.docs` as `{builtin:false,name,description}` and clearing a name or description showed the helper without sending a save. Scoped-check caveat: `bun run dead-code` exits 1 on the repo's pre-existing backlog, with no finding in this diff (log `ux-feedback-2026-11-16/task09/checks-dead-code.log`).
- Review: pass (two rounds, independent reviewer worker `reviewer-09`); all blocking findings fixed, all non-blocking items fixed.
- Task 09 also touched `packages/ui/src/components/sections/shared/SettingsSection.tsx` (the shared `SettingsDisclosure` primitive), `packages/ui/src/components/sections/PATTERNS.md`, `packages/ui/src/components/sections/references/layout.md`, and the routing keys in `packages/ui/src/lib/i18n/messages/routing.i18n.ts` (new keys in all 15 locales).
