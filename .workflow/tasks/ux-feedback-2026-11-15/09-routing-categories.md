# 09: Rewrite routing categories as a disclosure list that saves only when valid

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 07
**Covers:** W7
**Files:** `packages/ui/src/components/sections/routing/{RoutingPage.tsx,RoutingPage.test.tsx}`, `packages/ui/src/components/sections/shared/SettingsSection.tsx` (`SettingsDisclosure`), `packages/ui/src/components/sections/PATTERNS.md`, `packages/ui/src/lib/i18n/messages/routing.i18n.ts`
**Read first:** `research/feedback-2026-11-15/SettingsLayout.md` (F6, F7, fix B); `decisions.md` 2026-11-15 "Routing categories are a flat disclosure list…"; `packages/web/server/lib/routing/store.js` schema
**Check:** `RoutingPage.test.tsx` adds a case where Add with no description shows the helper and does not call `saveConfig`, then typing one saves a valid payload; `bun run --cwd packages/ui test` exits 0. Real path (isolated data dir): add category "Docs" with a description → status saved and `routing.json` gains `categories.docs` with `{builtin:false,name,description}`; clearing a name or description shows the helper and never sends an invalid save.

- [ ] `SettingsDisclosure` (title, secondary, trailing accessory, expanded, onToggle, children; flat, `aria-expanded`) joins `SettingsSection.tsx` and `PATTERNS.md`; `CategoryRow` wraps it and loses the `divide-y border-y` chrome.
- [ ] Enable is a `SettingsCheckboxRow`.
- [ ] The add row fills its line, submits on Enter or the button, and expands the new category with its description focused.
- [ ] The debounced save runs only for a valid draft; an invalid one shows an inline helper and keeps the save state idle.
- [ ] Removed built-ins restore inline at the end of the list; the readiness line sits above the list.
