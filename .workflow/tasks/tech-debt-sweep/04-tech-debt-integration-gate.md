# 04: Final gate and close-ready record

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** 01, 02, 03, 05, 06, 07, 08, 09, 10
**Covers:** W1, W2, W3, W4, W8, W10, W11
**Files:** `.workflow/development.md`; `.workflow/technical-debt.md` (check only)
**Read first:** `.workflow/specs/tech-debt-sweep.md`; `.claude/skills/flow-verify/SKILL.md`; `.claude/skills/flow-close/SKILL.md`
**Check:** on the integration tip, `bun install --frozen-lockfile && bun run check && bun run type-check && bun run lint && bun run dead-code && bun run docs:validate && VITEST_MAX_WORKERS=2 bun run test && .workflow/bin/workflow validate` → every command exits 0, lint prints no warning, dead-code prints nothing. Logs and `SUMMARY.txt` (command, exit, seconds, HEAD) in the evidence directory.

- [ ] Run the full gate once on the integration tip. A failure goes back to its owning task's area and is fixed here with a focused commit; then rerun the failing command and, once green, the whole gate once more.
- [ ] Walk the main user flow on the Web surface built from the tip: open a project, send a chat that completes through the real provider, open a diff, toggle per-session warming, trigger a compaction.
- [ ] Get an independent `flow-verify` review in effort close mode across the effort's diff (`main...tech-debt-sweep/integration`).
- [ ] `development.md` records the sweep's result in its Current state, replacing stale debt lines rather than appending a transcript.
- [ ] Do not mark the spec done and do not land on `main`: the maintainer accepts at `flow-close`. Write `READY.md` in the evidence directory with the gate table, review result and anything waived.
