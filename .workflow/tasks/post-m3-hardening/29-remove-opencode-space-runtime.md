# 29: Remove the OpenCode space runtime and keep spaces unreleased

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Isolated spaces keep their container, gatekeeper, code transfer, dispatcher guards and preview, but run no OpenCode runtime. No in-space CLI/plugin install, `opencode.json`, credential rows, engine readiness, engine environment or unmounted proxy remains; spaces stay behind `ISOLATED_SPACES_RELEASED = false` and fail closed with a clear unsupported state.

**Blocked by:** 10

**Files:**
- Server release gate (new): `packages/web/server/lib/spaces/release.js`, or an existing server-owned gate if one exists at claim. The server gate is authoritative and overrides the UI `ISOLATED_SPACES_RELEASED` display flag, `startupSettings.isolatedSpacesEnabled` and the PUT switch route; none of them can enable a space while the server gate is false. `journey.js`, `routes.js`, `manager.js`, `routes.test.js` and `manager.test.js` must enforce it on create/start/repair before any place or container call, and grant routes must refuse model/login grants.
- Runtime and tools: `packages/web/server/lib/spaces/space-opencode.js`, `space-opencode.test.js`; `tools.js` (`openCodePackages` `:56`, version read `:62-73`, registry source `:75-84`, packed source `:94-110`), `tools-filler.js` (`:24-25`, `:52-53`), `tools.test.js`, `tools-filler.test.js`.
- Layout, start, readiness and allowlist: `layout.js` (`TOOLS_PLUGIN_PATH` `:51`, config path `:99-100`, PATH/plugin comments `:130-132`, `OPENCODE_DISABLE_*` `:148-149`, start command `:160-166`), `space-server.js` (`:62-63`, readiness `:75-82`, plugin link `:134`, wait `:176-198`), `space-server.test.js`, `hardening.js` (`:47-58`), `hardening.test.js` (`:82-86`).
- Call sites and the dead session/event path: `host.js` (`:27,148,225`; merge path `:255-334`), `host.test.js`, `journey.js` (`:46,153,395,454-457,765,773-774`), `journey.test.js`, `space-events.js` (`:19-20`), `space-events.test.js`, `space-sessions.js` (merge helpers only), `space-sessions.test.js`, `server/index.js` (`:1846-1848` space event feed wiring only; leave the native archive function and routes at `:1821-1835`).
- Proxy (this task owns the deletion; task 10 leaves `proxy.js` and its tests in place): `packages/web/server/lib/opencode/proxy.js`; `proxy.test.js`, `proxy-agent-wiring.test.js`, `proxy-host-metadata.test.js`; the proxy imports in `spaces/places/grants.docker.live.test.js:19` and `spaces/places/sessions.docker.live.test.js:16`, plus the `space-opencode.js` imports in `grants.docker.live.test.js:23`.
- Manifest: `packages/web/package.json` (`:37-38` `@opencode/client`, `@opencode/schema`).
- Live suites and support: `spaces/places/{grants,sessions,server,packed,dispatcher}.docker.live.test.js`, `spaces/places/docker.test.js`, `spaces/places/contract-suite.js`, `spaces/places/escape-suite.js`, `spaces/places/fake-docker.js`, `spaces/places/memory-place.js`, and every support test that asserts the stale contract.
- Docs: `packages/web/server/lib/spaces/DOCUMENTATION.md`; `packages/web/server/lib/opencode/{DOCUMENTATION.md,RUNTIME_NOTES.md}` (`RUNTIME_NOTES.md:119-122`).
- Out of scope: `Dockerfile:60` (task 15). `packages/ui` is not edited; if wording must change, coordinate with lane G and stop before their edit. No UI change is required while the feature is hidden.

**Read first:** `.workflow/tasks/post-m3-hardening/08-isolated-spaces-runtime.md` (or its archived copy `.workflow/done/post-m3-hardening/08-isolated-spaces-runtime.md` after task 08 closes) and its findings; `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/08-2026-10-23/opencode-coupling-inventory.json`; `.workflow/specs/post-m3-hardening.md` (open question 2, lane table, landing rules); `.workflow/isolated-spaces/DESIGN.md` (boundary rule); `.agents/skills/isolated-space-boundary/SKILL.md`; task 10's Done-when (proxy stays in place); task 15's scope (Dockerfile CLI).
**Covers:** H7

**Check:** `bun run test` passes at the landing commit. A focused unit/real-path test proves create/start/repair refuse through the server gate before any place/container start or the 120-second readiness wait, and that model/login grant routes refuse. A scoped source search, excluding `Dockerfile:60` (task 15), finds no in-space OpenCode install, config, plugin link, readiness key or `OPENCODE_*` environment. Every OpenCode-specific live assertion is migrated or deleted with a recorded reason. No Docker run is claimed if none ran.

## Done when

- [ ] `packages/web` declares no `@opencode/*` dependency and production code imports none. `Dockerfile:60` is left to task 15 and that exception is stated.
- [ ] No space installs the OpenCode CLI/plugin, writes `opencode.json`, links `@opencode/plugin`, reads `isOpenCodeReady`, or sets `OPENCODE_*`; the tools volume and filler require only the web package (and the SDK where already packed).
- [ ] A server-owned release gate refuses create/start/repair before any place or container call while `ISOLATED_SPACES_RELEASED` is false, and overrides the UI flag, `startupSettings.isolatedSpacesEnabled` and the PUT switch route; no 120-second readiness wait and no half-running container. Grant routes refuse model and login grants. The hidden UI needs no change; any wording change follows the lane G rule in Progress.
- [ ] The tools fill fails closed when a private or workspace dependency cannot resolve; no partial tools volume is produced or used.
- [ ] The unmounted `proxy.js`, its three unit tests and both live-test imports are gone; the dead space session merge and `/api/event` source are removed with them.
- [ ] Live Docker suites are migrated as scoped below; remaining suites pass or their deletions carry a recorded reason. No test was deleted to hide a failure.
- [ ] Module docs and comments no longer describe an in-space OpenCode runtime.

## Progress

- Drafted from task 08's maintainer decision on 2026-10-23. No source changed, no code started, no test or Docker run.
- Owner: a dedicated future Spaces Removal owner/lane, not lane F and not an existing lane; the director/maintainer must assign it. This task stays a draft and cannot start until that assignment.
- Coordination: task 10 is coordination only. It moves the retained modules and docs and leaves `proxy.js` and its tests in place; this task owns their deletion, and lane A is not the deletion implementer. The feature is hidden, so no grant-screen or copy change is required. If a wording change becomes necessary, coordinate with lane G and stop before editing their files; do not create a tracking task for UI work. Task 15 owns `Dockerfile:60`, which still installs `@opencode/cli@2.0.25`; this task does not edit it.
- Landing order: task 08 is independent and lands in Lane F order (08 -> 17 -> 21 -> 22 -> 28) once its own review, rebase and full `bun run test` gates pass; it does not wait for this task. This task is gated only on lane A task 01 (active, not landed), then task 10, then the assigned owner. Do not start this draft before the owner assignment.
- Decision recording: the option B decision lives in task 08's Progress. This lane may not edit `decisions.md`, the spec or the glossary; the maintainer or their owner records it there.
- Evidence limit: the audit behind task 08 is source-only. No Docker, runtime, test or network evidence exists for this task yet.

## Fail-closed invariant

- `ISOLATED_SPACES_RELEASED = false` is enforced by the server-owned gate. The gate overrides the UI `ISOLATED_SPACES_RELEASED` display flag, `startupSettings.isolatedSpacesEnabled` and the PUT switch route; none of them can enable a space while the gate is false. The settings UI stays hidden.
- `journey.js`, `routes.js` and `manager.js` consult that gate on create/start/repair before any place or Docker work. If readiness cannot be established, fail with a clear unsupported state; do not wait 120 seconds on `isOpenCodeReady` and do not leave a container running.
- No engine means no grants. Model and login grant routes must refuse; the OpenCode credential-row contract and the placeholder window have no replacement here. No UI copy change is required while the feature is hidden.
- The tools fill must fail closed when a private or workspace dependency cannot resolve; never produce or use a partial volume. The published `@openchamber/web` package was not verified (no network permission); verify it or record it as an accepted limit.
- If the installed web package still refuses to run without `opencode` on PATH, the space must fail closed rather than half-start.
- Keep the gatekeeper, network, filesystem, token and code-transfer boundaries unchanged. Do not add a fallback engine, compatibility alias or engine selector.

## Test and live-suite scope

- Unit/real-path: add a focused test that create, start and repair consult the server gate and return the unsupported state before any place or container call, with no 120-second readiness poll, and that model/login grant routes refuse; the test also proves the gate overrides the UI flag, `startupSettings.isolatedSpacesEnabled` and the PUT switch route. Delete `space-opencode.test.js`; update `tools`, `tools-filler`, `space-server`, `hardening`, `journey`, `host`, `space-events`, `space-sessions`, `routes`, `manager` and `places/docker` tests for removed behavior; update `fake-docker.js`, `memory-place.js` and every other support test that reproduces the stale contract.
- `grants.docker.live.test.js`: remove the proxy import (`:19`), the `space-opencode.js` imports (`:23`) and the OpenCode turn, late-grant and provider-restored cases (`:154`, `:171`, `:189`) with a recorded reason; keep the key-containment and "environment key yes, typed key no" checks.
- `sessions.docker.live.test.js`: remove the proxy import (`:16`, `:85`); the in-space session-list/event case (`:138`) needs a stand-in server or moves to the OMP follow-up; keep terminal, stale-list and killed-space isolation (`:110`, `:176`, `:196`).
- `server.docker.live.test.js`: drop the plugin-load case (`:55-74`) and the `isOpenCodeReady`/`/health` expectations (`:114`); keep token, loopback and process checks.
- `contract-suite.js` (`:135`) and `packed.docker.live.test.js` (`:50`) assert the actual server readiness instead of `isOpenCodeReady`; packed web assertions (`:54-73`) stay.
- `escape-suite.js`: retire the OpenCode checks (`command -v opencode` `:425`, `opencode serve` `:430`, `OPENCODE_DISABLE_*` `:494`, `isOpenCodeReady` `:509,901,1047,1118`, `opencode.db`/`auth.json` `:958,964`); keep gatekeeper, network, filesystem, token, grant-forgery and transfer checks. Record each deletion.
- `dispatcher.docker.live.test.js`: retarget `POST /api/session` (`:88`) and the event stream (`:103`) to whatever contract the in-space server keeps.
- `code-in.docker.live.test.js:171` is a comment only; code-in/code-out behavior is unchanged.
