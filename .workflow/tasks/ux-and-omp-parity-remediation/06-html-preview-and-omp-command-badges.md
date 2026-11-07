# 06: Fix HTML live preview controls and replace OPENCODE slash command badges with OMP

**Effort:** ux-and-omp-parity-remediation
**Task type:** bugfix
**Blocked by:** None
**Covers:** W12, W23
**Files:** `packages/ui/src/components/views/FilesView.tsx`; `packages/ui/src/components/views/PreviewToggleButton.tsx`; `packages/ui/src/components/chat/CommandAutocomplete.tsx`; `packages/ui/src/components/chat/composer/ui/AutocompleteRowParts.tsx`; `packages/ui/src/lib/i18n/messages/autocomplete-scope.i18n.ts`; `packages/ui/src/lib/i18n/messages/en.ts`; `packages/ui/src/lib/i18n/messages/zh-CN.ts`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.agents/skills/locale-ui-patterns/SKILL.md`
**Check:** `bun run --cwd packages/ui test src/components/chat/CommandAutocomplete.test.tsx && bun run --cwd packages/ui type-check` → exits 0; verifies `OMP` badges on built-in commands including `/btw` and localized HTML preview toggle controls.

- [ ] In `packages/ui/src/components/views/PreviewToggleButton.tsx` and `FilesView.tsx`, localize the preview/edit toggle labels, match toolbar button sizing (`size-6`) and active selection styling (`bg-[var(--interactive-selection)]`) with Markdown preview, and ensure HTML files opened from chat preview links or preview mode render live HTML preview cleanly.
- [ ] In `packages/ui/src/components/chat/composer/ui/AutocompleteRowParts.tsx`, `CommandAutocomplete.tsx`, `autocomplete-scope.i18n.ts`, and all 15 locale message files, replace the `'opencode'` (`OPENCODE`) built-in command scope badge with `'omp'` (`OMP`).
- [ ] In `packages/ui/src/components/chat/CommandAutocomplete.tsx`, reclassify `/btw` as a native OMP built-in command (`source: 'native'`, `isBuiltIn: true`) so it displays the `OMP` badge rather than `OPENCHAMBER`.
