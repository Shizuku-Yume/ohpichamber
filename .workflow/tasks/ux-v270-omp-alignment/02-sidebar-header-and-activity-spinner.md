# 02: Align SidebarHeader with OpenChamber v2.7.0 and fix running session spinner animation

**Effort:** ux-v270-omp-alignment
**Blocked by:** None
**Covers:** W1, W3
**Files:** `packages/ui/src/components/session/sidebar/shell/SidebarHeader.tsx`; `packages/ui/src/components/session/sidebar/shell/SidebarSectionsManager.tsx`; `packages/ui/src/components/session/sidebar/rows/SessionNodeItem.tsx`; `packages/ui/src/components/session/SessionActivityIndicator.tsx`; `packages/ui/src/components/session/SessionActivityIndicator.test.tsx`; `packages/ui/src/lib/i18n/messages/sidebar-sections.i18n.ts`; `packages/ui/src/lib/i18n/messages/sidebar-work.i18n.ts`
**Read first:** `.workflow/specs/ux-v270-omp-alignment.md`; `packages/ui/src/lib/theme/STYLING.md`; `.claude/skills/locale-ui-patterns/SKILL.md`
**Check:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/components/session/ && bun --cwd packages/ui run type-check && bun --cwd packages/ui run lint` → exits 0 with SidebarHeader v2.7.0 action order, SectionsManager custom sections trigger, MarkAllReadItem, worktreeNameByBranch, and `animate-spin` running indicator verified

- [ ] Align `SidebarHeader.tsx` with upstream OpenChamber `v2.7.0` (`bc50ba56a`): compact 4-control header `[Search] [New Project / Folder+] [Filter / Equalizer] [...]` in `ms-[3px] flex min-h-8 items-center gap-1.5`, moving inline `Overview / Source Board / Scheduled Tasks / Archive / Stats / Integrations` buttons into the trailing `[...]` More menu (matching `upstream/main:packages/ui/src/components/session/sidebar/shell/SidebarHeader.tsx`).
- [ ] Restore all missing Filter/Equalizer dropdown items from `v2.7.0`: `自定义分区…` (`openSectionsManager()` + `<SectionsManager anchor={headerRef} />`), `选择会话` / `退出选择`, `会话: [按项目 | 按时间]`, `排序项目`, `显示项目`, `详细行`, `按分支命名 worktree` (`worktreeNameByBranch`), `全部折叠`, `全部展开`, and `全部标为已读` (`MarkAllReadItem`), plus `v2.7.0` sidebar worktree icon and right-click row menu polish (`8e63ab6c6f`, `a043454f32`).
- [ ] Fix `SessionActivityIndicator.tsx` so when `running && animated` (`animatedActivityIndicators` enabled), `<Icon name="loader-4" />` includes `animate-spin` (respecting `motion-reduce:animate-none`) and visibly rotates, with unit test asserting actual spin animation class presence.
