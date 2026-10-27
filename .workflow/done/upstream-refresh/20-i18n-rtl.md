# 20: i18n and RTL

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** aa0954a966b5c89572abb15c08e710c63ae2d5be
**Finished:** 2026-10-27

**Delivers:** Arabic and Hebrew locales with mirrored layout, plus the refreshed message catalog and RTL-safe components, work across the shell, chat and settings.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/20.tsv` (109 paths: 66 clean/new, 41 both-side, 27 conflicts; +41.7k lines). Main locations: `packages/ui/src/lib/i18n/`. Deferred from task 10: `components/ui/{OverlayScrollbar.tsx,sonner.tsx,sonner.test.tsx,sortable-tabs-strip.tsx}` (need this task's `direction`/`isRightToLeft`/`getLocaleDirection`), plus the RTL logical-class changes in `components/onboarding/ChooserScreen.tsx` that task 10 kept. Use the shared clock (`components/ui/pause-clock.tsx`, `hooks/useDurationTicker.ts`, `hooks/usePageColors.ts`) for spinners/busy indicators in scope so they are not dead code.

**Read first:** Spec W6; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/lib/i18n/DOCUMENTATION.md`; the fork's locale rules.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the i18n tests pass, and in the running app switching to Arabic mirrors the layout, keeps icons directional, and no label is clipped in the sidebar, chat composer or settings. Real path: send one message in RTL mode.

## Done when

- [x] The layout uses logical CSS properties where the new locales need them; no physical-side duplication.
- [x] Message keys are shared across locales; missing keys fall back visibly.
- [x] The fork's existing locales keep their translations; no key is silently dropped.
- [x] RTL is exercised on the settings and chat surfaces, not only the shell.
- [x] OverlayScrollbar, sonner and the sortable tab strip adopt upstream with the direction helpers; ChooserScreen gets the logical-class changes.
- [x] `pause-clock`, `useDurationTicker` and `usePageColors` have their consumers where this task touches spinners/busy indicators.

## Progress

### Base and Commit Lineage
- Base SHA: `aa0954a966b5c89572abb15c08e710c63ae2d5be`
- Worktree: `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-20`
- Branch: `upstream-refresh/20`

### Catalog Merge Results
1. **Upstream Catalog Adoption**: Adopted upstream 0056bf6a9 message catalog across all domains. Added Arabic (`ar`) and Hebrew (`he`) locale catalogs directly from upstream (`ar.ts`, `ar.settings.ts`, `he.ts`, `he.settings.ts`).
2. **Retained Fork Keys (372 keys)**:
   - Preserved all 372 active fork keys across all 13 existing fork locales (`en`, `de`, `fr`, `nl`, `es`, `ja`, `pt-BR`, `uk`, `ko`, `pl`, `zh-CN`, `zh-TW`, `tr`).
   - Covered Task 15 attachment error strings (`chat.composer.error.binaryAttachmentNotSupported`, `chat.composer.error.textAttachmentTooLarge`), OMP session warming (`settings.openchamber.defaults.warming.*`), legacy data notification (`startup.legacyNotice.*`), native providers (`settings.providers.native.*`), merged worktree cleanup (`settings.openchamber.mergedWorktreeCleanup.*`), and mobile navigation copy.
   - For `ar` and `he`, the 375 fork-only keys without upstream translations fall back visibly through the catalog fallback mechanism (`dictionary[key] ?? enDict[key] ?? key`).
3. **Dropped Keys (27 keys)**: Verified with `git grep` that 27 obsolete/superseded keys had 0 call sites across `packages/ui/src` and the entire repository outside i18n (e.g. `settings.providers.page.openCodeGo.authCookie`, `mobileUpdate.toast.actions.dismiss`, `settings.skills.page.field.disableModelInvocation`, `chat.chatInput.toast.largeTextPaste.*`). Removed from all locales.
4. **Excluded Upstream Engine Keys**: Excluded 15 `opencodeCompatibility.*` keys that name OpenCode as the engine.

### Per-Locale Key Counts (compared to English `en` with 9,083 keys)
- `de`: 9,083 total, 0 missing, 0 extra
- `fr`: 9,083 total, 0 missing, 0 extra
- `nl`: 9,083 total, 0 missing, 0 extra
- `es`: 9,083 total, 0 missing, 0 extra
- `ja`: 9,083 total, 0 missing, 0 extra
- `pt-BR`: 9,083 total, 0 missing, 0 extra
- `uk`: 9,083 total, 0 missing, 0 extra
- `ko`: 9,083 total, 0 missing, 0 extra
- `pl`: 9,083 total, 0 missing, 0 extra
- `zh-CN`: 9,083 total, 0 missing, 0 extra
- `zh-TW`: 9,083 total, 0 missing, 0 extra
- `tr`: 9,083 total, 0 missing, 0 extra
- `ar`: 8,708 total, 375 missing (visible fallback to English), 0 extra
- `he`: 8,708 total, 375 missing (visible fallback to English), 0 extra

### Real Path Evidence
Captured live via `chrome-devtools` against dev server running on port 5280 with isolated data dir and real OMP Gemini 3.8 Flash provider:
- `01-arabic-settings-rtl.png`: Arabic selected in Settings Appearance; `document.documentElement.dir === 'rtl'`; sidebar mirrored to inline-start (right), settings labels unclipped.
- `02-arabic-chat-reply.png`: Sent Arabic prompt "مرحبا، اكتب كلمة واحدة: تأكيد", received model reply "تأكيد" from Gemini 3.8 Flash; work status telemetry, mirrored composer input, and RTL message layout verified.
- `03-arabic-visible-fallback.png`: Visible fallback verified in Sessions settings; fork keys without upstream Arabic translation (e.g. `settings.openchamber.sessionWork.field.keepInGroup`: "Keep tracked sessions in their project group" and `settings.openchamber.mergedWorktreeCleanup.title`: "After a PR is merged") display clean English text instead of raw translation keys.
- `04-hebrew-shell-rtl.png`: Hebrew selected; `document.documentElement.dir === 'rtl'`; shell rendered in Hebrew with mirrored navigation and panel layouts.
- `05-english-restored-ltr.png`: Switched back to English; `document.documentElement.dir === 'ltr'`; layout and LTR direction fully restored.

### Logical CSS Properties & Spinner Consumers
- `OverlayScrollbar.tsx`: `horizontalScrollOrigin` tracks scrollLeft in RTL (negative offset); horizontal thumb transform maps appropriately.
- `sonner.tsx`: `dir={getLocaleDirection(locale)}` bound on Toaster; consumes `<Spinner />` (line 110), which consumes `useSpinnerPhase` from `useDurationTicker.ts:39`.
- `sortable-tabs-strip.tsx`: Mirrors active pill nudge direction in RTL (`towardLater = isRtl ? -PILL_NUDGE_PX : PILL_NUDGE_PX`), uses logical `start`/`end` overflow detection, and logical shadow gradients.
- `ChooserScreen.tsx`: Uses symmetric logical spacing (`p-8`, `px-3`, `py-1.5`, `gap-1`, `items-center`, `justify-center`, `text-center`) with zero physical sides.

### Validation Gates
- `bun install --frozen-lockfile`: exit code 0 (`logs/root-install.log`)
- `bun run type-check`: exit code 0 (`logs/root-type-check.log`)
- `bun run lint`: exit code 0 (`logs/root-lint.log`)
- `bunx oxlint`: exit code 0 (`logs/oxlint-authored.log`)
- `VITEST_MAX_WORKERS=2 bun run test`: exit code 0 across 7/7 workspaces (`logs/root-test.log`):
  - UI: 924/924 test files passed
  - Web: 446/446 test files passed, 7,171 tests passed (9 skipped)
  - Electron: 54/54 test files passed
- `bun run build`: exit code 0 (`logs/root-build.log`)
- `bun run dead-code`: exit code 1 (baseline knip finding count), `diff -u baseline-dead-code.log root-dead-code.log` is completely identical with 0 diff lines (`logs/root-dead-code.log`)
