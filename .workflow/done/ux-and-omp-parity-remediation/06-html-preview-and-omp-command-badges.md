# 06: Fix HTML live preview controls and replace OPENCODE slash command badges with OMP

**Effort:** ux-and-omp-parity-remediation
**Task type:** bugfix
**Blocked by:** None
**Covers:** W12, W23
**Files:** `packages/ui/src/components/views/FilesView.tsx`; `packages/ui/src/components/views/PreviewToggleButton.tsx`; `packages/ui/src/components/chat/CommandAutocomplete.tsx`; `packages/ui/src/components/chat/composer/ui/AutocompleteRowParts.tsx`; `packages/ui/src/lib/i18n/messages/autocomplete-scope.i18n.ts`; `packages/ui/src/lib/i18n/messages/en.ts`; `packages/ui/src/lib/i18n/messages/zh-CN.ts`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.agents/skills/locale-ui-patterns/SKILL.md`
**Check:** `bun run --cwd packages/ui test src/components/chat/CommandAutocomplete.test.tsx && bun run --cwd packages/ui type-check` → exits 0; verifies `OMP` badges on built-in commands including `/btw` and localized HTML preview toggle controls.
- **Base commit:** 5ed41c2c184ba2131c6201db37ccff884bc97d69

- [x] In `packages/ui/src/components/views/PreviewToggleButton.tsx` and `FilesView.tsx`, localize the preview/edit toggle labels, match toolbar button sizing (`size-6`) and active selection styling (`bg-[var(--interactive-selection)]`) with Markdown preview, and ensure HTML files opened from chat preview links or preview mode render live HTML preview cleanly.
- [x] In `packages/ui/src/components/chat/composer/ui/AutocompleteRowParts.tsx`, `CommandAutocomplete.tsx`, `autocomplete-scope.i18n.ts`, and all 15 locale message files, replace the `'opencode'` (`OPENCODE`) built-in command scope badge with `'omp'` (`OMP`).
- [x] In `packages/ui/src/components/chat/CommandAutocomplete.tsx`, reclassify `/btw` as a native OMP built-in command (`source: 'native'`, `isBuiltIn: true`) so it displays the `OMP` badge rather than `OPENCHAMBER`.

## Progress

- **Check before:** `bunx bun test src/components/chat/CommandAutocomplete.test.tsx` passed 2 tests and `bun run --cwd packages/ui type-check` was clean. Baseline defects: `PreviewToggleButton.tsx` hardcoded `Switch to edit mode` / `Switch to preview mode` with `h-5 w-5` sizing and no active state; `FilesView.tsx` defaulted HTML to `edit` unless the text-first setting was on and persisted that default; built-in commands rendered the `opencode` badge through `AutocompleteRowParts.tsx`; `/btw` was an `openchamber` command with `isOpenChamber: true`.
- **Work:** localized the toggle through `filesView.editor.switchToEditMode` / `switchToPreviewMode`, matched Markdown toolbar sizing (`size-6 p-0 transition-colors` plus `bg-[var(--interactive-selection)]` while previewing), defaulted HTML files to live preview and dropped the now-dead HTML mode localStorage default; replaced the `opencode` scope with `omp` in `AutocompleteRowParts.tsx`, `CommandAutocomplete.tsx`, `autocomplete-scope.i18n.ts` and all 15 locale dictionaries; reclassified `/btw` as `source: 'native'`, `isBuiltIn: true` deduplicated against `builtinCommandNames`.
- **Check after:** `bunx bun test src/components/chat/CommandAutocomplete.test.tsx` passed 3 tests (new `/btw` and built-in `omp` badge assertions), `bun run --cwd packages/ui type-check` reported no type errors, `bunx bun test src/lib/i18n/messages.test.ts src/lib/i18n/messages/autocomplete-scope.i18n.test.ts` passed 11 tests, and `bunx oxlint -c oxlint.config.ts` on every changed file exited 0.
