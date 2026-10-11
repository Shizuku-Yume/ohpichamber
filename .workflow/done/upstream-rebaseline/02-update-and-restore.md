# 02: Adopt the coherent baseline and restore customization

**Effort:** upstream-rebaseline
**Task type:** feature
**Blocked by:** 01
**Started:** 2026-10-10
**Finished:** 2026-10-11
**Delivers:** A coherent OhPiChamber checkout built from the pinned latest upstream application baseline with its identified customization restored, plus source-level Guest bootstrap verification.
**Files:** Root/package manifests and lockfile, application workspaces, scripts/build configuration, native-shell integration, and fork-owned customization identified by task 01.
**Read first:** .workflow/specs/upstream-rebaseline.md, task 01's source/preservation inventory, .workflow/standards.md, affected package/module documents.
**Covers:** W2, W4
**Check:** Use the refreshed package scripts for install, build, type-check, lint, tests and dead-code; verify the preserved customization inventory; verify Guest bootstrap ordering and run `.workflow/bin/workflow validate` and `.workflow/bin/workflow next --no-color`. Record unavailable external/platform prerequisites separately.

- [x] Adopt the pinned full application/runtime/dependency/build baseline, including the new upstream agent-client contracts and matching callers; remove obsolete old-runtime import paths rather than adding adapters.
- [x] Include Board, environment management, Quake, file-tree moves, Node/build adjustments, Guest lifecycle, isolated-space wiring, and other upstream application changes in the coherent update.
- [x] Preserve and restore every retained OhPiChamber customization from task 01; account explicitly for upstream removals and intentional fork differences.
- [x] Keep fork guidance/workflow/history and licensing/security requirements; do not overwrite unrelated work or restore upstream collaboration machinery.
- [x] Record assembled-runtime, credential, Docker/native, and independent-review limits without claiming unavailable W3 evidence; those checks remain outside this source/document task.
- [x] Verify Guest bootstrap ordering in direct and relay documents. Host bootstrap runs before authored CSP metadata, inert data scripts, and authored scripts; valid private handoff grants the SDK port while iframe `load`, malformed source, missing port, and replacement-document isolation do not.
- [x] Update owning runtime/setup documentation and development evidence for the actual source change without claiming OMP migration gates passed.

## Integration constraint

The new SDK, Shell events, credential APIs, process lifecycle, and build configuration must move together. Do not deliver an intermediate old/new-runtime mixture, permanently empty Guest lifecycle store, disabled substitute feature, or unconnected source dump.

Credentials, Docker/native tools, packaged surfaces, and remote-host access are checked in task 01. Missing prerequisites are explicit blockers for their acceptance, never fabricated success. This implementation conversation executes the queued source update. Changelog/release-note generation and Git commands remain subject to the root guide's authorization rules.

## Pinned integration inputs

- Adopt source `1f9320062c9a3c70925cf3243f1ee0c6e5f16765` from the SHA-addressed archive recorded in task 01. Root/workspace metadata is 2.2.0. Keep the Bun 1.4.2 lockfile, Node `>=24.14.0`, OpenCode CLI 2.0.25, and `@opencode/client`/`@opencode/schema` 2.0.25 coherent across callers, manifests, Dockerfile and desktop packaging.
- The private input workspace is `/tmp/ohpi-rebaseline-3gef9jhv`; it contains the pre-edit snapshot, full path/hash comparison, historical v2.1.1 source and the pinned upstream extraction. Operational configuration and secrets are preserved, not imported or exposed.
- Preserve root guidance/security, workflow/history/skills, union merge attributes, and the two independent native-push/APNs regression files. Reconcile package/module migration notices with new source facts. Detailed host/UI ownership dispositions from task 01 govern any additional restoration.
- Inherit the full application closure, including temporary VS Code source/build callers; final extension retirement is a later OMP cutover, not a selective import exclusion. Do not restore the nine removed collaboration bots, contribution templates, review evidence, queue-triage skills or release notes.
- Use the isolated `/tmp/ohpi-rebaseline-3gef9jhv/node-v24.14.0-linux-x64/bin` toolchain for checks on this machine. The system Node 22.23.1 does not satisfy the new requirement. Stage the real pinned CLI before connected host/Guest/desktop smoke; there is no system `opencode` command.
- Run the root `build`, `type-check`, `lint`, `test` and `dead-code` scripts on the assembled source. Do not run `check:changed` without Git authorization. Keep existing dead-code findings visible; do not weaken the upstream command to make it pass.
- Use the connected browser automation CLI when present and record each W3 route outcome. The inventory check opened an empty Chrome page, not the connected application. Xvfb, xvfb-run, xprop and xdotool are available for desktop smoke. Docker, Android tooling and Xcode/iOS Simulator are unavailable; keep those acceptance boundaries open.

## Progress

Source adoption completed through whole-file writes for 3,043 pinned paths and anchored removal of 95 superseded files. Retained native push declarations/exports and both fork regression suites remain; window guards use the typed global object and TypeScript build-output exclusions were restored. Application imports, manifests, lockfile, Docker/runtime pins, scripts and retained workflows now use the refreshed closure. Read-only release notes and private operational configuration were not touched.

The assembled source passed frozen install, root build, type-check, lint and dead-code with isolated Node 24.14.0. The connected Host Gateway and pinned OpenCode CLI started in scratch HOME/XDG roots; `/health` reported running/ready, the browser rendered the composer and opened Issues and PRs with an explicit account-connection prompt, environment routes exposed names without values, providerless exec read synthetic user/project overlays and exited successfully, and host FS writes plus real shell creation/output completed. A real session shell transitioned running to ended with exit status 0. Scoped Electron bridge, real Guest action/command transport, unsaved-file move UI proof and Xvfb Quake/shortcut smoke passed. Connected Board navigation opened Issues and PRs, selected the Pull requests tab, and opened a Project picker with no project entries; the item area remained `Pick an item to see it here.`. This proves route/tab rendering only, not authenticated Board reads or item actions.

The isolated-space HTTP route test passed with an in-process stand-in: `bun test packages/web/server/lib/spaces/dispatcher.test.js -t 'forwards a prefixed request'` verified a prefixed request, stripped caller URL/client credentials, and used the space session. This is route evidence only, not live Docker isolation. An earlier standalone Bun run of the full dispatcher suite reported 25 pass / 1 fail for pooled-stream-death retry (expected 200, got 502). The configured root `bun run test` later exited 0, including the package test runners; that retry failure did not recur there.

The first root test run stopped at `WorkStatusExtensionSection.test.tsx`: its old fixture sent guest traffic as `window` messages, but `PluginPane` now requires a transferred `MessagePort`. The Work Status, GuestHosts and SDK-example fixtures now use real channels and the actual parent-window identity. UI type-check then caught MessagePort typing/cleanup defects in the earlier GuestHosts and SDK-example fixtures; those are fixed. The root `bun run test` now exits 0. The final focused Guest transport/direct/relay/parity/host run passes 83 tests with 441 expectations: SDK host 49, bootstrap 2, direct HTML 5, relay HTML 7, SDK parity 4, UI SDK examples 11, GuestHosts 3, and Work Status 2. SDK/UI/Web type-checks pass; root dead-code reports no diagnostics.

Other focused checks passed: Electron probe/server/policy 44 tests; guest-frame navigation 23; remote IPC policy 4; UI auth 12; SDK host 49; SDK file-editor/JavaScript 16; native push/APNs suites 23. All 15 SDK example bundles were rebuilt. The changed-file anti-slop run reports five pre-existing findings in `packages/sdk/src/host.ts` (the existing `acceptSource` unknown-parameter seam and shell-output/shell-stop assertions); the new bootstrap code adds no findings. The earlier `chrome-devtools list_pages` attempt failed because `chrome-devtools` was not in `PATH`; no global package was installed. Direct invocation of `/home/shizuku/.local/npm/bin/chrome-devtools` subsequently opened Issues and PRs in the connected application, selected the Pull requests tab, and opened the Project picker with no project entries. The item area remained `Pick an item to see it here.`. Board route/tab rendering was observed, but no authenticated Board read or item action was exercised.

The source/document scope is complete. The pinned upstream application closure was adopted, fork-owned customization and guidance were restored, obsolete baseline wording was removed, and the owning migration documents were reconciled. No OpenCode compatibility adapter, OMP implementation, changelog, Git operation, or unrelated dependency change was added.

Verification passed: frozen install, root build, type-check, lint, test and dead-code; SDK/UI/Web type-checks; focused Guest transport/direct/relay/parity/host tests (83 tests, 441 expectations); Electron/Guest navigation/policy and native push suites; checked-in SDK example parity; `.workflow/bin/workflow validate`; `.workflow/bin/workflow next --no-color`; and `bun run docs:validate`. Existing dead-code/anti-slop findings were reported without weakening checks.

The remaining runtime evidence is intentionally not represented as completed: authenticated Board reads/actions, live Docker containment, Android/iOS builds, provider/remote-host credentials, packaged updater behavior, and a browser-level replacement-document reproduction were unavailable or unexercised. An independent follow-up review was attempted; the security review identified a real Web/PWA self-navigation confidentiality limit, while the chosen early bootstrap ordering itself passed review. These are operational/product-boundary follow-ups, not reasons to keep the source rebaseline task open.

