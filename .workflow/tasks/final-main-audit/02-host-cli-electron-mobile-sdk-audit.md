# 02: Audit and polish Host server, CLI, Electron, Mobile, SDK, and scripts

**Effort:** final-main-audit
**Task type:** refactor
**Blocked by:** None
**Covers:** W1
**Files:** `packages/web/**`; `packages/electron/**`; `packages/mobile/**`; `packages/sdk/**`; `packages/extensions/**`; `scripts/**`
**Read first:** `.workflow/specs/final-main-audit.md`; `AGENTS.md`; `.agents/skills/enterprise-boundary/SKILL.md`; `.agents/skills/desktop-shell/SKILL.md`; `.agents/skills/clack-cli-patterns/SKILL.md`; `.agents/skills/relay-transport/SKILL.md`
**Check:** `bunx oxlint packages/web/server/lib/host packages/web/server/lib/openchamber-sessions packages/web/server/lib/openchamber-control packages/electron packages/mobile/scripts packages/sdk/src && bun run --cwd packages/electron type-check && bun run --cwd packages/mobile type-check && bun run --cwd packages/sdk test && VITEST_MAX_WORKERS=2 bun run --cwd packages/web test && bun run --cwd packages/electron test` → all exit 0.

- [ ] Audit fork-authored and fork-modified modules across `packages/web` (Host canonical routes, worker authorization channel, Gatekeeper, enterprise mode, MCP OAuth callback, CLI `ohpichamber`), `packages/electron` (IPC, deep links, updater, process cleanup), `packages/mobile`, `packages/sdk` (`ohpichamber-sdk`), `packages/extensions`, and `scripts/`: fix any `oxlint` / `anti-slop` violation, security gap, stale OpenCode/VS Code/`openchamber.dev` reference, or doc mismatch.
- [ ] Verify `.workflow/upstream-deltas.tsv` (`bun run check`) stays green for any touched upstream-tracked file, and run web, electron, mobile, and SDK checks.
