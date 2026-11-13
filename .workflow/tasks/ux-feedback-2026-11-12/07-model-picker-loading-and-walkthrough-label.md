# 07: Model pickers load without jumping; walkthrough toggle gets its own label

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 06
**Covers:** W6
**Files:** `packages/ui/src/components/sections/shared/ModelRoleEditor.tsx`; `packages/ui/src/components/sections/agents/ModelSelector.tsx`; `packages/ui/src/components/sections/openchamber/{DefaultsSettings,GitSettings}.tsx`; locale keys for the walkthrough toggle
**Read first:** `research/feedback-2026-11-12/03-11-settings-parity.md` (items 5a, 5c); upstream `bc50ba56a:packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx:389-391` and the screenshot #10 map in `00-maintainer-feedback.md`; skills `locale-ui-patterns`, `performance-engineering`
**Check:** a render test shows the loading trigger while the OMP snapshot is pending and the model afterwards, never the "inherit" placeholder in between; the sections tests exit 0. Real path (Web): opening Sessions and Git settings shows the spinner trigger, then the model, with no jump; Sessions shows one "use default small model" checkbox and a separately labelled walkthrough toggle.

- [ ] `ModelRoleEditor` and `ModelSelector` take `loading`, rendering the existing spinner trigger. `DefaultsSettings` and `GitSettings` pass it while their OMP state is null.
- [ ] Give the walkthrough toggle its own label and info keys in all locales.
