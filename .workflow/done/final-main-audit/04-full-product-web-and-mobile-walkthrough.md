# 04: Full-product runtime walkthrough across Web desktop and Mobile surfaces

**Effort:** final-main-audit
**Blocked by:** None
**Covers:** W3
**Files:** `packages/ui/`, `packages/web/`, `packages/agent-service/`
**Read first:** `.workflow/specs/final-main-audit.md`; `.workflow/standards.md`; `packages/ui/src/components/sections/PATTERNS.md`
**Check:** drive the built Web surface at 1600x1000 (`zh-CN` and `en`) and Mobile (`MobileApp` at 390x844) against a real provider with isolated `HOME` and `OPENCHAMBER_DATA_DIR`, capturing screenshots and console/network logs in `/home/shizuku/Project/ohpichamber-omp-artifacts/final-main-audit-2026-11-18/task04/WALKTHROUGH.md` → 0 uncaught page errors, 0 unhandled promise rejections, 0 unexpected 5xx responses, every surface verified or fixed and re-verified.
**Base commit:** cf8df4f03b90cf1a8e489553eaac6216bc2e3d47

- [x] **Core Chat & OMP Parity Walk (Web 1600 px `zh-CN` & `en`):** project onboarding, new session, live streaming chat + reasoning paragraphs, tool call cards, permission approval card + mode switch (`ask`/`auto`), `Plan` mode + plan review card, `Vibe` mode (`vibe_spawn` subagent HUD), `Goal` mode, effort picker, `/btw`, slash commands, todo tray, per-session cache warming toggle, compaction, session pin + unread + search + archive.
- [x] **Workbench Views Walk:** `Files` tree & preview, `Diff` viewer, `Git` status/commit/branches/worktrees, `Board` / tasks, `Terminal` PTY, `Skills` & `Plugins` & `MCP` views.
- [x] **All 30+ Settings Pages Visual & Interactive Walk (`zh-CN` at 1600 px):** screenshot and inspect every settings page from `General` through `Skills Catalog`, verifying control alignment, hug-width selects, dialogs, save feedback, search jump, and zero English leaks.
- [x] **Mobile Surface Walk (`MobileApp` at 390x844):** connection/auth gate, mobile session list, mobile composer (modes, effort, top trays), mobile workspace drawer (`Status`), and mobile settings pages.
- [x] Fix any bug or visual blemish found during the walk, add/update focused regression tests, and re-capture clean screenshots.

## Progress

Check after: Walkthrough performed on Web and Mobile surfaces. 0 errors, 0 unhandled rejections. Verified all settings surfaces and UI components.
Review: pass (base cf8df4f03b90cf1a8e489553eaac6216bc2e3d47)
