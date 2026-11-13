# Research: maintainer feedback 2026-11-12

Seventeen items the maintainer reported on the installed build of `main` at `97284e9cf`. Each item's root cause is located in source; the reports below cite file and line. Screenshots: `~/.omp/agent/sessions/-Project-ohpichamber/2026-11-05T05-15-23-885Z_01a1aa22-196d-7067-87ff-720a5f864276/local/`.

| Item | Report |
|---|---|
| 1 Denials and prompts under YOLO | [01-permissions.md](01-permissions.md) |
| 2 Marketplace fake install; 6 toast on Integrations; 8 local machine as remote device | [02-integrations-remote.md](02-integrations-remote.md) |
| 3 Page titles; 4 missing option; 5 Sessions page; 9 description overflow; 10 fallback search; 11 词元 and -1 | [03-11-settings-parity.md](03-11-settings-parity.md) |
| 7 Usage page and chat usage | [07-usage.md](07-usage.md) |
| 12 OMP settings coverage, ownership, hollow shells | [12-omp-settings-and-shells.md](12-omp-settings-and-shells.md) |
| 12 What the TUI implements versus the SDK | [12-tui-vs-sdk.md](12-tui-vs-sdk.md) |
| 13 Agent tool permissions; 14 Plugins page; 17 eval display | [17-eval-permissions-plugins.md](17-eval-permissions-plugins.md) |
| 15 Slow suggestions; 16 new-chat stall and chunky streaming | [15-16-streaming-latency.md](15-16-streaming-latency.md) |

## Settled

Recorded in `decisions.md` on 2026-11-13 (effort `ux-feedback-2026-11-12`):

- Tier-based tool authorization; reads outside the workspace become approval cards; the Host reason reaches the model.
- MCP installs choose project or user scope.
- Settings pages show title and description.
- Usage is an OMP-native dashboard.
- OMP settings live on the page that owns the concept; new Tools and Memory pages; the OMP page renders the long tail from the registry.
- OMP owns image generation and agent memory.
- Suggestions run at turn end from the session model or the small model, on by default, no quiet timer.
- Streaming updates every 33 ms.
- Chinese copy writes "Token".

## Ruled out

- Adding `eval` to the descriptor-free allow list: it would bypass `ask` and `safety`.
- Hiding settings titles as upstream main does.
- Keeping two memory systems or two image tools.

## Cross-cutting findings

- **The v2.7.0 merge dropped Host wiring and overwrote fork fixes.** UI calls with no server route: `/api/auto-review`, `/api/pr-watch`, `/api/small-model`, `/api/diagnostics/local-files`, `/api/diagnostics/opencode-load`. `registerNotificationChannelRoutes` is defined but never registered, and extension trackers, quota providers and notification channels are unwired. Overwritten or dropped: the `pairedDevices` filter (item 8), quota `workspaceId` (item 7), `terminalCloseOnExit` and `sessionTabsPerWorkspace` (item 4). Reintroduced: the root default-agent control (item 5). A mechanical audit should diff every upstream route registration, `settingsItem` and settings key against the fork.
- **Performance budgets measured the wrong path.** The R8 harness times `POST /runs` but not `POST /sessions` (~1 s), so the new-chat stall passed W9.
- **Allowlists written for the tools known at the time.** Every new OMP tool falls through the Host's default deny; no test checks the real authorizer against OMP's built-in tool list.

## Open questions

None. Unanswered details follow the reports' recommendations.
