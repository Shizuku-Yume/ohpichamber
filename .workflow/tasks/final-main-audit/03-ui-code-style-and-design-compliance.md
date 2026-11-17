# 03: Audit and polish packages/ui code style, design tokens, layout, and 15-locale copy

**Effort:** final-main-audit
**Task type:** refactor
**Blocked by:** None
**Covers:** W2
**Files:** `packages/ui/**`
**Read first:** `.workflow/specs/final-main-audit.md`; `packages/ui/src/components/sections/PATTERNS.md`; `packages/ui/src/components/sections/references/layout.md`; `packages/ui/src/components/sections/references/controls.md`; `packages/ui/src/lib/theme/STYLING.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`
**Check:** `bun run --cwd packages/ui lint 2>&1 | tee /tmp/audit03-lint.log && ! grep -qE ': warning ' /tmp/audit03-lint.log && bun run --cwd packages/ui type-check && bun test packages/ui/src/components/sections/settingsLayoutGuard.test.ts packages/ui/src/lib/i18n/messages.test.ts && VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test` → all exit 0 with 0 warnings.

- [ ] Audit fork-created and fork-modified files in `packages/ui/src/{api,sync,stores,components,lib,apps}` with `bunx oxlint`: fix every fork-authored `anti-slop` finding, hook dependency issue, or sync-state / hot-path hazard without touching untouched upstream backlog files or silencing lint rules.
- [ ] Audit all `packages/ui/src/components/sections/**` and chat/OMP components against `PATTERNS.md` and `STYLING.md`: verify zero hardcoded Tailwind palette colors (`emerald-*`, `amber-*`, `rose-*`, etc. where semantic tokens belong), zero layout-guard violations, and consistent typography/spacing.
- [ ] Audit all 15 locales in `packages/ui/src/lib/i18n/messages/*` for missing keys, leftover `OpenChamber` product strings outside the About credit, `Token` capitalization in Chinese, or raw English leaks in `zh-CN`.
