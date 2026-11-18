# Closeout: rebrand

**Accepted:** 2026-11-18 by maintainer (approved rebrand implementation plan, including unattended landing and closeout)

## Shipped

All seven tasks are archived under `.workflow/done/rebrand/`. The fork ships as OhPiChamber with its own mark, OS identity, package names at `1.0.0`, one stable update channel from `Shizuku-Yume/ohpichamber` Releases, no default calls to upstream-hosted services, OhPiChamber in user-facing copy, and the maintainer's `~/.config/ohpichamber` as real product data.

- **W1 (mark matches the approved master):** pass (task 01). `brand:generate --check` and `bun test scripts/brand` (5 pass) pass; `compare-master.mjs` measured 0.000 % mean per-channel difference at 512 px against `ohpichamber-icon-i2.svg`; the contact sheet covers every drawing at 16/32/64/512 px on dark and light, with small-size sheets in `rebrand-01-2026-11-16/`. Unverified on Linux: committed `Assets.car`, `icon.icns`, `dev-icon.png`, `OCLogoSymbol.symbolset` and the SwiftUI `CubeLogoView` compile; task 05 added `bun run brand:generate` before packaging in the macOS release workflows.
- **W2 (packaged desktop identity, real path):** pass (task 05). `OhPiChamber-1.0.0-linux-x86_64.AppImage` in an isolated `HOME`: title, `WM_CLASS`, icon and `.desktop` say OhPiChamber; data only under `<home>/.config/ohpichamber` and `<home>/.config/OhPiChamber`; `xdg-open ohpichamber://host/local` focuses the app; a real-provider chat completed; `app-update.yml` names `github` / `Shizuku-Yume` / `ohpichamber`.
- **W3 (no upstream endpoints):** pass (tasks 03, 04, 05, 06). Task 05 found 0 runtime `openchamber.dev` / `api.openchamber` / `openchamber/openchamber` endpoints and 0 Phase-A `canary` hits; task 06 moved the remaining `packages/docs/` links to `Shizuku-Yume/ohpichamber`.
- **W4 (packages):** pass (task 02). `npm pack` produced `ohpichamber-1.0.0.tgz` and `ohpichamber-sdk-1.0.0.tgz`; a clean-prefix install prints `1.0.0`; `ohpichamber serve` brought `/api/agent/v1/ready` to 200. The hello-kit build against `ohpichamber-sdk` is not recorded separately.
- **W5 (services off, visible):** pass (tasks 03, 04, 05). About shows `1.0.0` with no channel switch or update-check control; Linear sign-in shows unavailable with `OPENCHAMBER_LINEAR_BROKER_URL` / `linearBrokerUrl`; push reports `relay-url-missing`; bundled release notes render offline for `1.24.2`.
- **W6 (mobile build identity):** partial (task 02). Xcode `PRODUCT_BUNDLE_IDENTIFIER` values are only `dev.ohpichamber.app*`. The Android debug APK and `aapt dump badging` check was waived (no JDK or Android SDK on the Linux host) and moves to M7.
 
## Key decisions & plan changes

- 2026-11-16 - Rename what users and the OS see; keep OPENCHAMBER_* variables and private names.
- 2026-11-16 - Cut the fork off from upstream-hosted services.
- 2026-11-16 - First release is 1.0.0 under the ohpichamber package names, stable channel only.
- 2026-11-16 - Rebrand in two phases around the open UX effort.
- 2026-11-16 - The OhPiChamber mark is the upstream cube with an OMP π folded over its front edge.
- Task 03's Check excludes the vendored Zod build in `packages/sdk/examples/tools-only/mcp.js` from the `canary` scan; task 05's Check moved Phase-B `packages/docs/**` links to task 06 (`59978cbb5f`).

## Waived checks & skipped reviews

- Task 02: Android debug APK and `aapt dump badging` - Check waived, no JDK/Android SDK on the Linux host; deferred to M7 (2026-11-18). No review was skipped.

## Remaining debt & follow-ups

- `packages/web/server/lib/linear/auth.js` keeps upstream's `DEFAULT_LINEAR_CLIENT_ID`, so a broker-only configuration starts Linear sign-in with upstream's app id (task 04 review, open for the maintainer).
- `1.0.0` has no `changelog/` entry yet, so About shows no release notes until release prep (tasks 03, 05).
- macOS `Assets.car`/`icon.icns`/`dev-icon.png`, iOS `OCLogoSymbol.symbolset` and `CubeLogoView`, iOS device checks, and the Android APK are verified only by the CI release jobs or M7 (tasks 01, 02, 05).
- Linux AppImage upload filename and Discord webhook strings in the release workflows belong to M7 release surfaces (task 05 review).
