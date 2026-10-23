# 08: Decide how isolated spaces leave OpenCode

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** f72010e3ef453a5218c3464b674b86c0ccc00a04
**Started:** 2026-10-23T12:45:14+08:00
**Status:** paused

**Delivers:** Answer to: what would it cost to run isolated spaces on OMP, versus removing the OpenCode space runtime while spaces stay unreleased? Includes options, costs and a recommendation for the maintainer.

**Blocked by:** None
**Files:** `packages/web/server/lib/spaces/` (`space-opencode.js`, `tools-filler.js`, `tools.js` lines 56-71); `packages/web/server/lib/opencode/proxy.js` and its live docker tests `spaces/places/grants.docker.live.test.js`, `sessions.docker.live.test.js`; `packages/web/package.json` (`@opencode/client`/`@opencode/schema`); `packages/ui/src/lib/spaces/release.ts`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/isolated-spaces/DESIGN.md`; `.agents/skills/isolated-space-boundary/SKILL.md`; `.workflow/omp-migration/scope.md` (isolated spaces rows); `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/PlanGapAnalysis.md` finding 2
**Covers:** H7

**Check:** `## Findings` answers the question with source references, lists what still ties spaces to OpenCode (in-container CLI/plugin install, `opencode.json`, version read from `@opencode/client`, proxy-based live tests), and drafts the follow-up task for the chosen option after the maintainer answers spec open question 2.

## Done when

- [ ] Every OpenCode dependency in spaces is listed with its file.
- [ ] Both options are costed: OMP Agent Service inside the space (with the security boundary implications), and removal of the OpenCode space runtime plus `proxy.js` and the two `@opencode/*` web dependencies.
- [ ] States what the live docker tests need after `proxy.js` is gone.
- [ ] No source is changed by this task.

## Progress

- Dirty at start: none.
- Branch/worktree: `post-m3-hardening/08-isolated-spaces-runtime` in `/home/shizuku/Project/ohpichamber-worktrees/lane-f-spikes`, cut from `main` at `f72010e3e`. No task branch for 08 existed before this claim.
- Check before: spike, skipped per `flow-implement` step 1.
- Read: `specs/post-m3-hardening.md` (parallel lanes, open question 2), `.workflow/isolated-spaces/DESIGN.md` (boundary rule, words, architecture), `STAGES.md` (stages 1b-5, delivery rules), `TESTING.md` (evidence rule, test layers, escape list), `packages/web/server/lib/spaces/DOCUMENTATION.md` (Tools volume, The server inside a space, Dispatcher, Grants, Known limits), `.workflow/omp-migration/scope.md` SCOPE-6.4, `PlanGapAnalysis.md` finding 2, the `isolated-space-boundary` skill, `flow-implement`, `spike-tasks.md`, `merge-strategy.md`, `CONVENTIONS.md`.
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/08-2026-10-23/` (`inventory.mjs`, `opencode-coupling-inventory.json`, `opencode-coupling-inventory.md`, `inventory-run.log`). The script is read-only: it reads files and git metadata and writes only under that external evidence directory.
- No source, spec, decisions, development, glossary or package file changed. No test or Docker probe ran: the landing rule and the director's probe permission gate both still apply.
- Follow-up task draft: pending the answer to spec open question 2. Both option scopes are written below so one maintainer answer is enough.

### Pause handoff (2026-10-23, external decision wait)

- Paused, not technically blocked: the maintainer was asked spec open question 2 — A, move spaces to OMP as a standalone effort, or B, remove the OpenCode space runtime while spaces stay unreleased. No answer yet. The recommendation is B; no decision has been made.
- Branch/worktree: `post-m3-hardening/08-isolated-spaces-runtime` in `/home/shizuku/Project/ohpichamber-worktrees/lane-f-spikes`, cut from `main`. Base and HEAD are unchanged at `f72010e3ef453a5218c3464b674b86c0ccc00a04`. Dirty at start: none. Current dirty: this task file only. No stash.
- Done: source-referenced OpenCode inventory, both option costs with security implications, recommendation B, a precise follow-up scope for each option, and this writer prose revision. Evidence is in `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/08-2026-10-23/` (`opencode-coupling-inventory.json`, `opencode-coupling-inventory.md`, `inventory-run.log`, `08-task-file.diff`). The inventory is source evidence only: no Docker, runtime, test or network step ran.
- Next after the answer: choose A or B and create one follow-up task file. Re-read the highest used task number at that time; 28 is the highest known now, so do not assume 29. Then tick the Done-when items and assign the follow-up owner (the director names it; no lane owns `packages/web/server/lib/spaces/` today).
- Completion gates, all required before this task can complete, archive or land: the maintainer's answer to open question 2; the follow-up task draft; a rebase on current `main`; `bun run test` green against the landing commit; and the outstanding reviews. Leave the checklist unticked while these are pending.
- Review: none run yet. Two review briefs are outstanding and NOT run. Neither this writer prose pass nor the independent read-only audit (`agent://lane-f-evidence`) is a `flow-verify` review. Review boundary: base SHA `f72010e3e` plus this task path only. The deliverable is a source audit and options; no security boundary changed.
- Lane F order is 08 -> 17 -> 21 -> 22 -> 28. Do not start 17 until 08 is answered and landed. Lane A 01 is not established as landed and the root suite has not been re-run green.
- Shared-document sync deliberately not done: lane authorization is task-file only, so no spec, decisions, development or glossary edit is made here. If the owner wants this inventory recorded there, assign it to an owner; this task does not require unrelated docs.
- Immediate handoff: `.workflow/bin/workflow validate` passes (116 task files). The task-file-only pause commit awaits the director. Do not land or merge.

## Findings

**Question:** what would it cost to run isolated spaces on OMP, versus removing the OpenCode space runtime while spaces stay unreleased?

**Answer:** Option A is a subsystem effort, not a hardening task: the space image, tools volume and in-space server would all have to ship and supervise a private Bun Agent Service, and the dispatcher's session/event contract would change. Option B is a bounded removal across `spaces/`, the unmounted legacy proxy and two web dependencies, at the cost of leaving no agent runtime in spaces. Recommendation: **B**, keep `ISOLATED_SPACES_RELEASED = false` (`packages/ui/src/lib/spaces/release.ts:6`), and build OMP spaces as their own effort. The final choice is open question 2.

### Method

Read-only source inventory at `f72010e3e` by `inventory.mjs`. Counts: 80 files under `packages/web/server/lib/spaces/`; 32 mention OpenCode, split by filename into 15 non-`.test.js` files and 17 `.test.js` files. Five of the 15 non-test files are test support (`contract-suite.js`, `escape-suite.js`, `docker-live-support.js`, `fake-docker.js`, `memory-place.js`), so 10 shipped source files mention OpenCode. Mentions: 106 in non-`.test.js` files (29 of those in the five test-support files, 77 in shipped source) and 157 in `.test.js` files; 9 Docker live suites; 2 consumers of `proxy.js`. Both the scanner and the independent audit read source only: no Docker probe, runtime start, test run or network fetch backs this inventory. Runtime consequences derived from source are labelled inference and were not observed.

### Every OpenCode dependency in spaces

**1. Declared engine packages (`packages/web/package.json`)**

- `@opencode/client` `2.0.25` and `@opencode/schema` `2.0.25` at lines 37-38.
- `@opencode/schema/location` is imported only by `packages/web/server/lib/opencode/proxy.js:4` and `proxy-host-metadata.test.js:6`.
- `@opencode/client` is declared in `packages/web/package.json:37`, but no source file imports it. It is read only as a version string: `tools.js:60,71`; the test `tools.test.js:37` pins the range-rejection case. The UI `.tsbuild` type artifacts mention it; no source file uses it.

**2. In-container CLI/plugin install (tools volume)**

- `tools.js:56` `openCodePackages` pins `@opencode/cli` and `@opencode/plugin` to one version; `tools.js:62-73` reads that version from `@opencode/client`; `tools.js:75-84` adds both to the registry source; `tools.js:94-110` adds both to the packed source. The volume contents are documented as `@openchamber/web` (this repo's web package), `@opencode/cli`, `@opencode/plugin` (`DOCUMENTATION.md:152`).
- `tools-filler.js:24-25` explains the install script; `:52` runs `node postinstall.mjs` in `node_modules/@opencode/cli`; `:53` fails the fill unless `node_modules/.bin/openchamber`, `node_modules/.bin/opencode` and `node_modules/@opencode/plugin/package.json` exist.
- `layout.js:51` `TOOLS_PLUGIN_PATH`; `layout.js:132` puts the tools bin directory on `PATH`; `layout.js:130` comment: the image has no `openchamber` and no `opencode`.
- `space-server.js:63,134` links `@opencode/plugin` into `/spaces/<id>/node_modules/@opencode` after start.

**3. `opencode.json` and the login row**

- `layout.js:99-100` define `$HOME/.config/opencode` and `opencode.json`.
- `space-opencode.js:12-19` writes the file through a temporary name; `:24-38` builds `{$schema: https://opencode.ai/config.json, provider}` with each provider's `options.baseURL` at the space window and a placeholder `apiKey`; `:41-46` maps the three OpenAI login methods to upstreams; `:71-77` builds the OpenCode credential row; `:83-120` writes/removes provider config and login rows through `requestInside` (`POST/DELETE /api/credential`).
- Call sites: `host.js:27,148,225`; `journey.js:46,153,395,454-457,765,773-774`.
- `layout.js:148-149` `OPENCODE_DISABLE_MODELS_FETCH` and `OPENCODE_DISABLE_AUTOUPDATE`; `hardening.js:48-49` reasons about `OPENCODE_CONFIG_CONTENT`.

**4. Readiness and server start**

- `layout.js:160-166` starts `openchamber serve --foreground --api-only`; `space-server.js:75-82` requires `/health` to answer `isOpenCodeReady === true`, and `:176-198` fails after 120 seconds otherwise.
- `DOCUMENTATION.md:231` records the historical reason the tools bin is last on `PATH`: the server refused to start without `opencode`. The current fork source at this commit no longer contains that startup check (no `command -v opencode` or spawn in `packages/web/server/**`, searched); its `/health` is `core-routes.js:222-232` plus `index.js:1719-1723`, which reports `agentService`, not `isOpenCodeReady`. The canonical Host gateway health (`lib/host/canonical-routes.js:142-152`) reports `engine: 'omp'` and `agent.ready`. The space channel was not updated to either shape. Inference, not observed: if the package installed in a space matches this tree, the readiness probe would never pass and create/start/repair would fail `space_server_not_ready` after 120 seconds. No Docker run has confirmed that.
- Caveat: a real space installs `@openchamber/web` at the version in `packages/web/package.json` (2.2.0) from the npm registry, not this worktree. Whether the published 2.2.0 is the OMP build, and what its `/health` returns, was not verified (no network permission). This is a release/versioning gap, not only a spaces gap.

**5. Dispatcher and event contract**

- `dispatcher.js:204-216` reads `x-opencode-directory` and its URI encoding; the guards and route rules (`DOCUMENTATION.md:457-486`) forward `/api/session`, `/api/event`, `/api/global/event/ws`, `/api/event/ws` and four WebSocket paths. `space-sessions.js` merges `/api/session`; `space-events.js` reads `/api/event`. These are OpenCode's route shapes, not the OMP `/api/agent/v1` contract.
- `idle-stop.js:46` observes OpenCode's status semantics.

**6. `proxy.js` and its live tests**

- `packages/web/server/lib/opencode/proxy.js` is 1054 lines, imports `@opencode/schema/location`, `http-proxy-middleware` and `zod`, and exports `createOpenCodeProxyAgent`, `createDirectoryQueryCanonicalizer`, `normalizeForwardedDirectoryHeaders`, `registerOpenCodeProxy`.
- It is **not mounted in production**: `lib/opencode/DOCUMENTATION.md:204` says `registerOpenCodeProxy` is unmounted; production sessions use `/api/agent/v1`. `ui-api-decoupling/references/implementation-map.md:20,37` calls it an "unmounted legacy proxy fixture for M5 spaces tests; not a production fallback."
- Its only consumers are `spaces/places/grants.docker.live.test.js:19,98` and `spaces/places/sessions.docker.live.test.js:16,85`; its own `proxy.test.js`, `proxy-agent-wiring.test.js` and `proxy-host-metadata.test.js`.

### Option A: run isolated spaces on the OMP Agent Service

**Cost: own effort.** It is the M3 Agent Service cutover repeated inside a hostile container, across at least six workstreams:

1. **Packaging and distribution.** `@openchamber/agent-service` is `"private": true`, engines `bun >= 1.3.14`, builds with `bun build --target=bun` and starts with `bun --no-env-file`. It has 12 `file:` dependencies under `vendor/omp/c9de2b02/tarballs/` and native dependencies (`onnxruntime-node`, `fastembed`, `@oh-my-pi/pi-natives`). The tools volume is an npm-registry project (`tools.js`, `tools-filler.js`) and the packed source supports only the web and SDK tarballs (`tools.js:94-110`). A space would need Bun plus the private service plus platform native modules in the tools volume or image; the pinned base image is `node@sha256:3d27e5c...` with no Bun. This overlaps lane D's native-package target problem (task 12).
2. **In-space process ownership.** Today the host supervisor (`lib/host/agent-service-supervisor.js`) spawns the service on the host with a managed-process registry, entrypoint, env and loopback announcement. Inside a space, that owner must exist either in the in-space server or as a second host-owned path over `docker exec`. Crash restart, process cleanup and the env allowlist (lane B 04/05/13/18) would need space-specific evidence.
3. **Contract and routing.** The in-space server must expose the canonical `/api/agent/v1` contract and the dispatcher must forward it; the merged session list and event sources must move from `/api/session` and `/api/event` to the OMP session/event shapes; WebSocket allowlists, route rules, auth and event sanitisation all change. This is `dispatcher.js`, `space-sessions.js`, `space-events.js`, `websocket.js` plus the Host canonical gateway.
4. **Grants and credentials.** `space-opencode.js` disappears. Model grants must be delivered to the Agent Service as a provider endpoint override (the window must stay the enforcement point) or through whatever provider-entry mechanism the service supports; login grants were an OpenCode credential-row contract and have no OMP equivalent yet. Provider catalog, baseURL override and auth-header behaviour must be verified in the Agent Service source and in a live turn.
5. **Security boundary.** The Agent Service inside the space is untrusted code. Its native approval policy runs inside the attacker's control, so the Host cannot treat it as authority; host actions, skill sources and file tools must not be delegated across the boundary. "Uses without seeing" still depends on the gatekeeper window, not on agent configuration. New escape checks are needed for the OMP auth/provider store, process environment, config files and worker env. The existing escape corpus targets `opencode.db`, `auth.json`, `opencode.json` and `command -v opencode`, so it would not prove the new runtime.
6. **Tests and docs.** Rewrite `contract-suite` (`isOpenCodeReady`), `server.docker.live`, `grants.docker.live` (OpenCode turn, late-grant measurement), `sessions.docker.live` (`/api/session`, `/api/event`), `packed.docker.live`, and the relevant escape cases; add OMP-specific escape and grant tests. Real Docker on Linux is the only platform available here; macOS/Windows would remain unverified. The spaces module documentation and STAGES obligations need a rewrite (not owned by lane F).

**Security implications, stated plainly:** the container still isolates the host, and the gatekeeper still owns the network and secrets, but the in-space Agent Service becomes a second implementation of the SDK-owning boundary. Its config, env, approval policy and process list are all writable by the agent. Any guarantee that relies on the service cooperating is not a guarantee under the boundary rule (`DESIGN.md`, "The boundary rule"). Option A must prove model calls still travel through the window and that no key, host token, host action or host session identity crosses the boundary, on a real Docker run.

### Option B: remove the OpenCode space runtime and keep spaces unreleased

**Cost: bounded removal.** Concrete edit surface:

- Delete `space-opencode.js` (121 lines) and `space-opencode.test.js` (106 lines); remove `host.js:27,148,225` wiring and the `journey.js` login/provider calls at `:46,153,395,454-457,765,773-774`.
- `tools.js`: remove `openCodePackages` (`:56`), the `openCodeVersion` parameters and version read (`:62-73`, `:75-84`, `:94-110`); the tools volume becomes web + SDK only.
- `tools-filler.js`: remove the postinstall (`:52`) and the `opencode`/plugin checks (`:53`), keeping `openchamber`.
- `layout.js`: remove `TOOLS_PLUGIN_PATH` (`:51`), the config directory/path (`:99-100`), the `OPENCODE_DISABLE_*` variables (`:148-149`) and the PATH/plugin comments; `space-server.js`: remove `LINK_PLUGIN_SCRIPT`/`linkPlugin` (`:63,134`) and replace the `isOpenCodeReady` readiness test (`:75-82`) with a server-level readiness contract that matches the actual in-space server.
- `packages/web/package.json`: remove `@opencode/client` and `@opencode/schema`.
- Delete `packages/web/server/lib/opencode/proxy.js` (1054 lines), its three named unit tests (`proxy.test.js`, `proxy-agent-wiring.test.js`, `proxy-host-metadata.test.js`), and the two live-test imports.
- Keep `x-opencode-directory` only as long as the dispatcher and UI still speak it; it is a wire header, not an engine runtime. Removing it is a UI-contract change, not required for the runtime removal.
- Product consequence: spaces have no agent inside. Model grants and login grants cannot work; the grant UI must hide or refuse them while unreleased. The feature stays behind `ISOLATED_SPACES_RELEASED = false`; do not add a fallback engine or a compatibility alias.
- Fail-closed check: if the registry-shipped `@openchamber/web` still refuses to start without `opencode` (the historical stage-0 behaviour), removal must make space creation fail with a clear unreleased/unsupported state rather than leave a half-running container. This source tree has no such startup check; the published package is unverified without network access.
- Coordination: `packages/web/server/lib/opencode/` is lane A's move territory (task 10); the removal follow-up rebases after task 10 or is assigned to lane A. `packages/ui` grant screens are lane G territory. No lane in the current table owns `packages/web/server/lib/spaces/`; the director must name the follow-up owner.
- Tests: `bun run test` must stay green, and the old proxy unit tests go away with the fixture. This is a net test-count reduction that must be named in the follow-up, not hidden.

**What the live Docker tests need after `proxy.js` is gone**

- `grants.docker.live.test.js`: its host Express app uses `registerOpenCodeProxy` (`:19,98`) only to serve the merged session list and the host event stream; replace it with the explicit routes the test needs (`GET /api/session`, `GET /api/event`) or with the Host canonical gateway test double. The OpenCode-specific cases (`:154` turn through the window, `:171` late-grant measurement, `:189` provider config restored) lose their subject and must be deleted with a recorded reason. The key-containment cases (`:128`) and the "environment key yes, typed key no" record test still apply.
- `sessions.docker.live.test.js`: same replacement for the host proxy (`:16,85`). The test that lists the space's session and forwards its events (`:138`) currently depends on OpenCode inside; it needs an in-space stand-in server that implements the same session/event endpoints, or it moves to the OMP follow-up. The terminal, stale-list and killed-space isolation cases (`:110,176,196`) remain valid and should stay.
- `server.docker.live.test.js`: `/health` assertion (`:114`), the plugin-load case (`:55-74`) and `isOpenCodeReady` expectations must be removed or rewritten; token, loopback and process tests stay.
- `contract-suite.js`: the `isOpenCodeReady` assertion at `:135` becomes a plain server readiness assertion; the rest of the place contract is engine-neutral.
- `escape-suite.js`: remove or mark historical the OpenCode-specific checks — `command -v opencode` (`:425`), the `opencode serve` process match (`:430`), `OPENCODE_DISABLE_*` (`:494`), `isOpenCodeReady` (`:509,901,1047,1118`), `opencode.db`/`auth.json` credential searches (`:958,964`). The gatekeeper, network, filesystem, token, grant-forgery and code-transfer checks stay; replacing the credential-store checks with OMP stores is a follow-up obligation, not a deletion.
- `packed.docker.live.test.js`: health assertion (`:50`) changes; the packed web/SDK assertions (`:54-73`) stay.
- `dispatcher.docker.live.test.js`: its `POST /api/session` create (`:88`) and event stream (`:103`) are OpenCode route shapes; the dispatcher follow-up must retarget them to whatever readiness/session contract the in-space server keeps.
- `code-in`/`code-out` have no engine dependency beyond one comment (`code-in.docker.live.test.js:171`) and stay.

### Recommendation

The maintainer was asked spec open question 2 (A versus B) and has not answered. This is a recommendation, not a decision, and no follow-up is started.

**B**, because:

- Spaces are unreleased (`release.ts:6`); the spec already rejected releasing them on OpenCode.
- The proxy is unmounted legacy test scaffolding, and `@opencode/client` is only a version pin, so most of the removal is deleting dead weight rather than a cutover.
- Option A would make a second Agent Service boundary inside an untrusted container and would need its own distribution, supervision, grants, events and escape evidence — the definition of a separate effort.
- B leaves an honest state: the retained space infrastructure (containers, gatekeeper, code transfer, preview, journey) stays, no engine runs, and the OMP runtime is built deliberately later.

**Condition:** B must not leave spaces reachable in a half-working state. The follow-up must make create/start fail closed with the release flag and name the removed capability.

### Draft follow-up scopes (one is chosen after open question 2)

**If A: "Run isolated spaces on the OMP Agent Service"** (one new task; re-read the highest used task number at that time, 28 as of this pause, rather than assume 29; owner to be named by the director)
- Package Bun + `@openchamber/agent-service` + native modules for the space image/tools volume; extend the tools source and filler, keep the gatekeeper as the only network path.
- Start and supervise the service inside the space (or over `exec`) with the allowlisted environment; map `/api/agent/v1` session/event/model/provider routes through the dispatcher and merged session/event sources.
- Replace OpenCode grants with OMP provider-entry/window configuration; decide the login-grant contract or declare it unsupported.
- Rewrite contract/escape/grants/sessions/server/packed live suites for OMP, including secret-containment and approval-authority checks.
- Acceptance: real Docker Linux create → code arrives → a model prompt completes through the gatekeeper window → session/events visible in the UI → no key/token in env, files, process list or container metadata → contract and escape suites pass; macOS/Windows named unverified. Blocked by lane D 12 (native packages), lane B 04/05/13/18, and the distribution decision.

**If B: "Remove the OpenCode space runtime while spaces stay unreleased"** (one new task with the same re-read-the-highest rule; owner to be named by the director)
- Apply the edit surface above: delete `space-opencode.js`/test, remove tools/plugin/version installs, `opencode.json`, `OPENCODE_*` env, plugin link, readiness key, the unmounted proxy and its three named unit tests, and the two `@opencode/*` web dependencies.
- Replace in-space server readiness with the actual server contract; make create/start fail closed while `ISOLATED_SPACES_RELEASED` is false; hide or refuse model/login grants.
- Retire or rewrite the OpenCode-specific live assertions with reasons recorded; keep gatekeeper/network/filesystem/token/transfer coverage.
- Acceptance: no `@opencode` dependency or in-space OpenCode process/config in the repo; `bun run test` green; remaining live suites pass or have recorded deletions; no user-visible string or path claims a working space runtime. Rebase after lane A 10 and coordinate lane G for grant-screen text.

### Unknowns and blockers

- No Docker probe ran (director boundary approval and maintainer probe permission pending). Claims above are source-referenced, not live-space evidence. A source-level failure such as the `isOpenCodeReady` mismatch is an inference about runtime, not an observed Docker failure.
- Open question 2b (Docker probe permission: cached image only, pull allowed, or no probe) is also unanswered; no probe ran under any setting.
- The npm registry content for `@openchamber/web@2.2.0` and the OMP packages was not fetched (no outbound permission). Whether the published web build matches this worktree, and whether it still requires `opencode` on PATH, is unverified.
- OMP provider baseURL/override and login-grant support were not exercised; option A's credential cost could rise if the Agent Service lacks an equivalent.
- macOS/Windows/ARM remain unmeasured; this environment is Linux x64.
