# 39: Fix the packaged live-region latency

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** bc836586c0eb45359292d3823904b72ce6b1bac2

**Delivers:** The packaged Electron app exposes the chat streaming status (`role="status"`, `aria-live="polite"`, atomic) within 400 ms of the user sending a prompt, and a packaged session completes normally.

**Blocked by:** None
**Files:** the chat status live-region component (`packages/ui/src/components/chat/message/parts/WorkingPlaceholder.tsx`) and the packaged Agent runtime worker restore path (`packages/electron/scripts/prepare-agent-runtime.mjs`, `packages/agent-service/src/worker/session.ts`)

**Read first:** `.workflow/done/post-m3-hardening/22-packaged-live-region.md`; `.workflow/specs/post-m3-hardening.md` H12; `.workflow/done/omp-through-m3/retrospective.md` W7

**Check:** On an AppImage built from the fixed tree, three consecutive sends show a `role=status`, `aria-live=polite` accessibility node within 400 ms of the send, and all three sessions reach `idle` with an assistant reply; evidence recorded in `## Findings` with the receipt path.

## Context observed by task 22

- Packaged AppImage, real configured provider: first polite status node appeared 709-3916 ms after run acceptance (`Calculating`, `Calibrating`, `Computing`), never inside 400 ms.
- Only one of five packaged attempts completed; the others stayed `running`, while the packaged Agent Service logged hundreds of `Worker initialization failed (SESSION_RESTORE_FAILED)` entries for those sessions.
- Web surface, same prompt and AX definition: first polite status (`Warming up`) at 1368 ms, also outside 400 ms, with the same non-completing provider session.
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/task22-2026-10-24/` (`appimage-run-1.json`, `appimage-run-2.json`, `appimage-run-3.json`, `appimage-retry-1.json`, `appimage-retry-2.json`, `web-run-1.json`, `appimage-app-3.log`, `measurement-receipt.json`).

## Done when

- [ ] Packaged AX timing is inside 400 ms on three consecutive sends.
- [ ] Packaged sessions complete, with no `SESSION_RESTORE_FAILED` for a fresh session.

## Findings
