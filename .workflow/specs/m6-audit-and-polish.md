# M6: Full-codebase audit, OpenChamber UX restoration, missing OMP capabilities, and UI compliance

**Status:** in progress
**Priority:** high
**Integration branch:** m6-audit-and-polish/integration

## What this is for

Across earlier migration efforts (`omp-through-m3`, `upstream-refresh`, `omp-native-chat`, `omp-native-parity`, and `m4-orchestration`), three systemic quality gaps accumulated:
1. **Dogmatic feature cuts:** Genuine OpenChamber frontend/Host capabilities (such as `GeneralWorkspaceSettings`, `DesktopAppSettings`, `DefaultsSettings` items, cross-device `session-pins`, persistent `session-unread` watermarks + turn duration badges, and `BehaviorPage` response-style presets) were deleted or deferred simply because the standalone OMP CLI had no 1:1 field or under overly rigid prompt-purity rules.
2. **Unwired OMP capabilities:** Non-chat or cross-session capabilities built into OMP `18.16.0` (such as session `Recap` / archive recaps paired with `SessionRecapSpacer`, `Agent Hub` in `modes/agent-hub-runtime.ts`, and `Marketplace` in `extensibility/plugins/marketplace/*`) were overlooked.
3. **Substandard UI craftsmanship:** Newly authored or heavily rewritten Settings pages—most visibly **Providers (`ProvidersPage.tsx`)**, **Web Search (`WebSearch`)**, and **OMP Settings (`OmpSettingsPage.tsx`)**—were built to satisfy unit tests rather than following OpenChamber's layout, row anatomy, typography, control, and save-feedback standards (`packages/ui/src/components/sections/PATTERNS.md` and `packages/ui/src/lib/theme/STYLING.md`).

M6 systematically audits the entire repository against `upstream/main` (`0056bf6a9`), `vendor/omp/650f3a10`, and the UI design specs, presents the complete findings to the maintainer alongside the maintainer's own hands-on trial feedback, and executes the approved restorations, capability integrations, and UI overhauls before final M7 release testing.

## What it does

- **Phase 1 — Exhaustive Three-Pillar Read-Only Audit:**
  - **Audit List A (Mistakenly Cut/Deferred OpenChamber UX):** File-by-file comparison of `upstream/main..HEAD` across `packages/ui` and `packages/web` to catalog every deleted or gutted OpenChamber frontend/Host feature that does not exist merely as an OpenCode workaround (explicitly covering `sections/openchamber/*` General/Desktop/Defaults controls, `#1 session-pins`, `#2 session-unread` + `session-turn-duration` + tray/widget sync, and `#4 BehaviorPage.tsx`; keeping per-session cache warming and bundled `ripgrep` excluded per maintainer decision).
  - **Audit List B (Missing OMP 18.16.0 Capabilities):** Module-by-module inventory of `vendor/omp/650f3a10` (`pi-coding-agent`, `pi-ai`, `pi-tui`) against current Agent Service and UI surfaces, covering `Recap` (`archive/archive.ts`, `prompts/system/recap-user.md`, `SessionRecapSpacer.tsx`), `Agent Hub` (`modes/agent-hub-runtime.ts`), `Marketplace` (`extensibility/plugins/marketplace/*`), and any other unwired native capabilities.
  - **Audit List C (UI Design & `PATTERNS.md` / `STYLING.md` Violations):** Visual and structural review of every fork-authored or fork-modified page/component against `upstream/main`, `PATTERNS.md`, and `STYLING.md`, starting with `ProvidersPage`, `WebSearch` settings, `OmpSettingsPage`, and chat/composer additions.
- **Phase 2 — Maintainer Review & Hands-On Feedback Merge:** Combine the three audit lists with the maintainer's live-app feedback into a concrete, approved task breakdown (`flow-break`).
- **Phase 3 — Implementation & Visual/Runtime Verification:**
  - Restore approved OpenChamber UX features on Canonical + Host SQLite (`host-metadata.sqlite` + `openchamber-control` SSE for cross-client `session-pins` and `session-unread`/`viewedAt`; `BehaviorPage.tsx` with `default` = zero injection; restored OpenChamber General/Desktop settings).
  - Wire approved OMP native capabilities (`Recap`, `Agent Hub`, `Marketplace`, etc.) through `@openchamber/agent-contract` and the Agent Service worker.
  - Rebuild non-compliant Settings and UI surfaces (`ProvidersPage`, `WebSearch`, `OmpSettingsPage`, etc.) to match OpenChamber's exact design grammar and interaction polish.

## How it is built

- Host-owned GUI workbench state (`pinned`, `lastIdleAt`, `viewedAt`, `lastTurnOutcome`, user UI preferences) lives in `packages/web/server/lib/openchamber-sessions/session-metadata-store.js` (`host-metadata.sqlite`) and `settings.json`, broadcast over `openchamber-control` SSE so Desktop, Web, and Mobile stay synchronized without touching OMP's transcript format.
- Optional user-selected `BehaviorPage` style instructions remain strictly opt-in (`default` sends zero extra prompt text; explicit non-default presets deliver the user's chosen preference cleanly).
- Every Settings section rewrite follows `packages/ui/src/components/sections/PATTERNS.md` and `packages/ui/src/lib/theme/STYLING.md`, reusing upstream OpenChamber's shared row/card primitives rather than bespoke one-off markup, and is verified visually in a real browser/Electron window with screenshots.

## What it must not do

- Restore genuine OpenCode-only shims or duplicate authorities (such as the retired Host Goal Supervisor, Root Agent Picker, dual tool-permission mode switches, OpenCode Folder Trust, per-session cache warming, or bundled `ripgrep`).
- Start blind implementation before the Phase 1 three-pillar audit report and maintainer feedback list are reviewed and broken into tasks.
- Ship unstyled or test-only settings forms that deviate from `PATTERNS.md` and `STYLING.md`.

## How we will know it works

- **W1 (Complete Audit & Maintainer Sign-Off).** The three-pillar audit report cites exact files/diffs across `upstream/main`, `vendor/omp/650f3a10`, and `packages/ui`, and the resulting task list incorporates the maintainer's review and hands-on feedback.
- **W2 (Restored OpenChamber Frontend UX).** Cross-client `session-pins`, persistent `session-unread` watermarks + turn duration badges, `BehaviorPage` (zero injection on `default`, active when selected), and all approved OpenChamber General/Desktop settings work end-to-end across reloads and connected clients.
- **W3 (OMP Capability Completeness).** Approved OMP capabilities (`Recap`, `Agent Hub`, `Marketplace`, etc.) operate end-to-end through the Canonical API and UI on a live provider/runtime.
- **W4 (Design System & Visual Parity).** Rebuilt `ProvidersPage`, `WebSearch`, `OmpSettingsPage`, and audited UI surfaces conform to `PATTERNS.md` and `STYLING.md`, verified with live UI inspection and screenshots across light/dark themes, and `bun run type-check`, `bun run lint`, `bun run test`, and `bun run docs:validate` exit 0.
