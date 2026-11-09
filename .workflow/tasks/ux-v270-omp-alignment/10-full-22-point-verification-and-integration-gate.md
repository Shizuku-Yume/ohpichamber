# 10: Run full 22-point workspace static, performance, and live Web + packaged Electron verification gate

**Effort:** ux-v270-omp-alignment
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09
**Covers:** W1, W2, W3, W4, W5, W6, W7, W8, W9, W10, W11, W12, W13, W14, W15, W16, W17, W18, W19, W20, W21, W22
**Files:** `.workflow/development.md`; `.workflow/specs/ux-v270-omp-alignment.md`
**Read first:** `.workflow/specs/ux-v270-omp-alignment.md`; `.claude/skills/flow-verify/SKILL.md`; `.claude/skills/openchamber-change-discipline/SKILL.md`
**Check:** `bun run dead-code && bun run type-check && bun run lint && bun run docs:validate && VITEST_MAX_WORKERS=2 bun run test && bun --cwd packages/electron run prepare:agent-runtime && bun --cwd packages/electron run verify:agent-runtime && bun run electron:build && .workflow/bin/workflow validate` → exits 0 with live Web + packaged Electron real-path screenshots and verification receipt covering all 22 feedback items (`W1`–`W22`)

- [ ] Run `bun run dead-code`, `bun run type-check`, `bun run lint`, `bunx oxlint` across all touched TS/JS files, `bun run docs:validate`, `VITEST_MAX_WORKERS=2 bun run test`, and `.workflow/bin/workflow validate`, fixing any cross-task integration or lint/dead-code regression.
- [ ] Stage the Agent Runtime and build the packaged Desktop app (`bun --cwd packages/electron run prepare:agent-runtime && bun --cwd packages/electron run verify:agent-runtime && bun run electron:build`), then launch and drive the live Web/Desktop UI with real provider credentials (`~/.config/ohpichamber/omp-m0-provider.env`), capturing screenshot evidence for every single item across `W1`–`W22` (SidebarHeader + SectionsManager, General Files & Editor + ThemeSchematic, spinning running indicator, Usage analytics + WebSearch cards, OMP Settings Model Roles + 0 English strings + instant tab switch, Agents/Commands/Plugins pages, Composer mode/effort/shield/opaque glass/suggestion/title sync, collapsed TodoTray, live thinking/text streaming, OMP status + tool summaries, inline `openchamber_render` HTML preview, full 9-metric Turn Stats + clean Context modal, and working Integrations Catalog MCP install).
- [ ] Record the complete verification evidence in `.workflow/development.md` and mark `.workflow/specs/ux-v270-omp-alignment.md` `**Status:** done`.
