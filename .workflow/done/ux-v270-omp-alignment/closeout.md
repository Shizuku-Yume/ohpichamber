# Closeout: ux-v270-omp-alignment

**Accepted:** 2026-11-12 by the maintainer ("直接合到main吧"), on the task 29 acceptance record without a separate hands-on walkthrough.

## Shipped

- Upstream OpenChamber v2.7.0 (`bc50ba56a`) merged as one real merge commit (`8327e6403`, parents `main` and `bc50ba56a`); the disposition ledger is derived from git by `scripts/upstream-drift.mjs` and runs in `bun run check` (W1).
- The merged tree builds and runs: `bun check --all`, type-check, lint and the full test suite pass; Web and packaged Electron completed a real-provider chat (W2, task 19).
- Class cutovers R2-R8 (tasks 20-28): one model-selector grammar, error cause end to end with proposed-state authorization, boot hydration registry, canonical tool results and step timings, one OMP tool presentation registry with OMP status and streaming cadence, curated OMP Settings with one role editor, rebuilt Commands/Plugins/Agents/Usage pages, settings-effect and CSS-class guardrails, measured performance (W3-W9).
- Reference acceptance (task 29, W10): 33 side-by-side pairs judged by a non-implementing reviewer in two rounds, no blocking difference left; the 22 reported items as 25 assertions pass 25/25 on Web and 24/25 on packaged Electron (the spinner probe read `animationName: none`; a standalone probe on the same app read `webkit-spin 1s`). Final gate on the integration tip: `bun run check` 4/4, type-check, lint, `VITEST_MAX_WORKERS=2 bun run test` 7/7, `docs:validate`, `workflow validate`. `bun run check` and the drift check re-run by the coordinator on `9e6f30993`: exit 0.

## Key decisions & plan changes

- `decisions.md: 2026-11-10 - Merge upstream OpenChamber with a real git merge` and `2026-11-10 - OMP TUI parity means function and display parity…` reshaped the effort from 22 point fixes into an upstream merge plus eight root-cause classes.
- Plan amendment 2026-11-11: conflict lanes landed with 1,130 type errors and 646 unowned differing paths; repair tasks 30-35 were added before task 19.
- The lane 13 chat presentation decision was re-attributed to the agent after the maintainer confirmed no instruction was given.
- Other lane and class decisions are recorded under 2026-11-11 and 2026-11-12 in `decisions.md`.

## Waived checks & skipped reviews

None. Chat states were compared against the OMP TUI rather than v2.7.0 (the reference needs the OpenCode CLI, which is not installed), and the maintainer's 34 screenshots were not available to the acceptance window.

## Remaining debt & follow-ups

- Real-path runs in task windows started Host servers without an isolated data directory, so they wrote fork state into `~/.config/openchamber`, the data directory of the maintainer's installed OpenChamber 2.6.1 (logs `openchamber-4121.log`, `openchamber-4127.log`; a `/tmp/v270-24-scratch` project in its `settings.json`). The fork's default data directory and Electron profile name are still OpenChamber's, so any unwrapped run collides. A backup of both OpenChamber directories taken on 2026-11-12 is in `/home/shizuku/Project/ohpichamber-omp-artifacts/data-backup-2026-11-12/`.
- The tmux server hosting the task windows exited twice during the run (cause not found); the dispatcher now relaunches lost windows in place.
