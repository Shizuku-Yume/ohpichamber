# 08: Decide how isolated spaces leave OpenCode

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** f72010e3ef453a5218c3464b674b86c0ccc00a04
**Started:** 2026-10-23T12:45:14+08:00
**Finished:** 2026-10-23T21:13:44+08:00

**Question:** what would it cost to run isolated spaces on OMP, versus removing the OpenCode space runtime while spaces stay unreleased?
**Time box:** one read-only source inventory and one source-referenced cost comparison; no Docker probe, no implementation.

**Delivers:** Answer to: what would it cost to run isolated spaces on OMP, versus removing the OpenCode space runtime while spaces stay unreleased? Records the maintainer's option B decision and drafts the removal follow-up, originally numbered task 37.

**Blocked by:** None
**Files:** `packages/web/server/lib/spaces/` (`space-opencode.js`, `tools-filler.js`, `tools.js` lines 56-71); `packages/web/server/lib/opencode/proxy.js` and its live docker tests `spaces/places/grants.docker.live.test.js`, `sessions.docker.live.test.js`; `packages/web/package.json` (`@opencode/client`/`@opencode/schema`); `packages/ui/src/lib/spaces/release.ts`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/isolated-spaces/DESIGN.md`; `.agents/skills/isolated-space-boundary/SKILL.md`; `.workflow/omp-migration/scope.md` (isolated spaces rows); `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/PlanGapAnalysis.md` finding 2
**Covers:** H7

**Check:** `## Findings` answers the question with source references about what ties spaces to OpenCode (in-container CLI/plugin install, `opencode.json`, version read from `@opencode/client`, proxy-based live tests); the maintainer's decision B is recorded; and the removal follow-up is drafted.

## Done when

- [x] Every OpenCode dependency in spaces is listed with its file.
- [x] Both options are costed: OMP Agent Service inside the space (with the security boundary implications), and removal of the OpenCode space runtime plus `proxy.js` and the two `@opencode/*` web dependencies.
- [x] States what the live docker tests need after `proxy.js` is gone.
- [x] No source is changed by this task.

## Progress

- Dirty at start: none.
- Branch/worktree: `post-m3-hardening/08-isolated-spaces-runtime` in `/home/shizuku/Project/ohpichamber-worktrees/lane-f-spikes`, cut from `main` at `f72010e3e`. No task branch for 08 existed before this claim.
- Check before: spike, skipped per `flow-implement` step 1.
- Read: `specs/post-m3-hardening.md` (parallel lanes, open question 2), `.workflow/isolated-spaces/DESIGN.md` (boundary rule, words, architecture), `STAGES.md` (stages 1b-5, delivery rules), `TESTING.md` (evidence rule, test layers, escape list), `packages/web/server/lib/spaces/DOCUMENTATION.md` (Tools volume, The server inside a space, Dispatcher, Grants, Known limits), `.workflow/omp-migration/scope.md` SCOPE-6.4, `PlanGapAnalysis.md` finding 2, the `isolated-space-boundary` skill, `flow-implement`, `spike-tasks.md`, `merge-strategy.md`, `CONVENTIONS.md`.
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/08-2026-10-23/` (`opencode-coupling-inventory.json`, `opencode-coupling-inventory.md`, `inventory-run.log`; `inventory.mjs.sha256` retains the scanner hash). The read-only scanner was removed after the JSON, logs and hash were kept.
- No source, spec, decisions, development, glossary or package file changed. No Docker probe ran. The initial inventory ran no tests; the subsequent authorized full-root gates are recorded below.
- Maintainer decision (2026-10-23): **B** — remove the OpenCode space runtime and keep spaces unreleased until the OMP space runtime is built. Recorded in this task only; no `decisions.md`, spec or glossary edit, because this lane may change task files only.
- Follow-up task draft (originally numbered 37): `.workflow/tasks/post-m3-hardening/38-remove-opencode-space-runtime.md`. Drafted, not started, unassigned until the maintainer designates a dedicated Spaces Removal owner/lane (not lane F or an existing lane).

### Decision and branch-only archive handoff (2026-10-23)

- Decision: the maintainer chose **B** — remove the OpenCode space runtime and keep spaces unreleased until the OMP space runtime is built. Options A and B are costed below; B is the decided path.
- The branch was rebased onto `7cc282d08504afc88d1531b6ba527009de3b0794`; final tested HEAD was `6f50bc8be7e56dd49d4e0d6f1820208ec2baa076`. Full-gate evidence and exact outcomes are recorded below. Archive remains branch-only; no landing or main-worktree change is included.
- Follow-up: `.workflow/tasks/post-m3-hardening/38-remove-opencode-space-runtime.md` is the current draft. It was originally numbered 37 when drafted; after a separate Task37 was created and withdrawn on 2026-10-24, the unused follow-up received the next number, 38. It remains unstarted. Owner: a dedicated future Spaces Removal owner/lane, not lane F and not an existing lane; the director/maintainer must assign it. Task 38 owns deleting `lib/opencode/proxy.js` and its three unit tests; task 10 moves the retained modules and docs but leaves the proxy and its tests in place, so lane A is not the deletion implementer. The feature is hidden, so no grant-screen or copy change is required; any wording change is lane G coordination only, and stops before their edit. Task 15 owns `Dockerfile:60`.
- Branch/worktree: `post-m3-hardening/08-isolated-spaces-runtime` in `/home/shizuku/Project/ohpichamber-worktrees/lane-f-spikes`, cut from `main`. Base `f72010e3ef453a5218c3464b674b86c0ccc00a04`; implementation snapshot `27321b952`; this pause/decision commit is discoverable on the branch. Dirty at start: none. The original task37 follow-up draft was renumbered to task38 on 2026-10-24 after task37 had been used by a separate, subsequently withdrawn task.
- Evidence limit: the inventory and audit are source-only. No Docker probe, runtime start or network fetch ran. The test evidence and limits are recorded below; runtime consequences derived from source remain labeled inference, not observed failures.
- Checklist: the Done-when items are ticked because the findings and the follow-up draft exist. The full test gate passed at the recorded rebased HEAD; no Docker probe or real-space runtime run was performed.
- Historical review boundary: base `f72010e3ef453a5218c3464b674b86c0ccc00a04` + tasks 08 and the then-numbered 37 follow-up draft only; round 2. That historical Brief A (contract) and Brief B (quality) pass is retained as historical provenance, not current approval. Current final-review provenance covers archive base `7cc282d08504afc88d1531b6ba527009de3b0794` through archive commit `0b6bc5b9ae60844d69d10d576c3a377eba8b887f`, scoped to the archived Task08 path and its branch-only metadata; implementation/tested SHA `6f50bc8be7e56dd49d4e0d6f1820208ec2baa076` is the tested implementation snapshot, distinct from the archive commit. Brief A: PASS (`lane-f-task10-preflight`, current archive boundary). Brief B: BLOCKED (`lane-f-archive-brief-b`) pending this narrow metadata correction and one delta review; no current ready-to-land approval is claimed. Neither review is a runtime or security review, and `agent://lane-f-evidence` is not a `flow-verify` review. No implementation test or Docker result is claimed.
- Check after: Findings inventory/options + user B + removal follow-up draft satisfied; `.workflow/bin/workflow validate` passed on the archived task record. Full root `bun run test` history and exact limitations are recorded below.
- Lane F order is 08 -> 17 -> 21 -> 22 -> 28. Current coordinator gating/override: under the latest explicit parent instruction, Task17 is blocked until Task08 lands; this is current workflow authority, not a timeless task invariant. Task17 has not run in this handoff.
- Shared-document sync deliberately not done: this lane may change task files only, so the B decision is not written to the spec, `decisions.md`, `development.md` or the glossary. The maintainer or their owner, outside Lane F, must record it there; this task does not require unrelated docs.
- Original full root `bun run test` exited 1; its evidence remains at `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/08-2026-10-23-rebase-7cc282d/bun-run-test.log`, `bun-run-test.exit` and `completion-receipt.json`. The observed failure was Web `run-command.test.js:344` using the shared `os.tmpdir()` namespace containing stale `/tmp/openchamber-stderr-lldJQG`; this run did not pass.
- Run-01 receipt and full log: `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/08-2026-10-23-rebase-7cc282d/run-01/`; exit 1. The agent-service native plugin fixture returned `INVALID_REQUEST` (cause unresolved); Web `code-in.test.js` failed with `EXDEV` when renaming from `/tmp` to the external artifact TMPDIR on a different device.
- Corrected run-02 receipt and full log: `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/08-2026-10-23-rebase-7cc282d/run-02/`; tested SHA `6f50bc8be7e56dd49d4e0d6f1820208ec2baa076`, base `7cc282d08504afc88d1531b6ba527009de3b0794`, exit 0. It used fresh `/tmp/omp-task08-final-cCiBSf` (0 entries before run); `/tmp` device 54 inode 1, TMPDIR device 54 inode 12611343. All 7/7 suites passed: workspace 22/22, sdk 23/23, ui 804/804, agent-contract 177 pass, agent-service 229 pass/7 skip/0 fail, electron 44/44, web 375 passed/9 skipped (6105 tests passed, 135 skipped). This passing run does not establish why the original shared-`/tmp` run failed or prove that failure is gone.
- Archive commit stages Task08 only. No source, spec, decisions, development, glossary, package or follow-up task file is changed by that archive commit.

## Findings

**Answered question:** what would it cost to run isolated spaces on OMP, versus removing the OpenCode space runtime while spaces stay unreleased?

**Answer:** Option A is a subsystem effort, not a hardening task: the space image, tools volume and in-space server would all have to ship and supervise a private Bun Agent Service, and the dispatcher's session/event contract would change. Option B is a bounded removal across `spaces/`, the unmounted legacy proxy and two web dependencies, at the cost of leaving no agent runtime in spaces. The maintainer chose **B** on 2026-10-23: remove the OpenCode space runtime and keep `ISOLATED_SPACES_RELEASED = false` (`packages/ui/src/lib/spaces/release.ts:6`) until OMP spaces are built as their own effort. The follow-up is currently task 38; it was originally drafted as task 37 before another Task37 was created and withdrawn.

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
- Product consequence: spaces have no agent inside. Model grants and login grants cannot work; server grant routes must refuse them while unreleased, and the hidden UI needs no change. The feature stays behind `ISOLATED_SPACES_RELEASED = false`; do not add a fallback engine or a compatibility alias.
- Fail-closed check: if the registry-shipped `@openchamber/web` still refuses to start without `opencode` (the historical stage-0 behaviour), removal must make space creation fail with a clear unreleased/unsupported state rather than leave a half-running container. This source tree has no such startup check; the published package is unverified without network access.
- Coordination: task 38 owns `proxy.js` deletion; task 10 moves the retained `lib/opencode/` modules and docs but leaves the proxy and its tests in place, so lane A is not the deletion implementer. No lane owns `packages/web/server/lib/spaces/`; the maintainer must assign a dedicated Spaces Removal owner/lane. The feature is hidden, so no grant-screen change is required; any wording change is lane G coordination only, and stops before their edit.
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

**B was chosen by the maintainer on 2026-10-23.** It is the decided option, and task 38 drafts its removal. The reasoning:

- Spaces are unreleased (`release.ts:6`); the spec already rejected releasing them on OpenCode.
- The proxy is unmounted legacy test scaffolding, and `@opencode/client` is only a version pin, so most of the removal is deleting dead weight rather than a cutover.
- Option A would make a second Agent Service boundary inside an untrusted container and would need its own distribution, supervision, grants, events and escape evidence — the definition of a separate effort.
- B leaves an honest state: the retained space infrastructure (containers, gatekeeper, code transfer, preview, journey) stays, no engine runs, and the OMP runtime is built deliberately later.

**Condition:** B must not leave spaces reachable in a half-working state. The follow-up must make create/start fail closed with the release flag and name the removed capability.

### Chosen follow-up (task 38)

**B: remove the OpenCode space runtime and keep spaces unreleased** is drafted as `.workflow/tasks/post-m3-hardening/38-remove-opencode-space-runtime.md`. It remains a draft, unassigned, and does not start until the maintainer assigns a dedicated Spaces Removal owner/lane.

- Scope: the Option B edit surface above; a server-owned release gate (`packages/ui/src/lib/spaces/release.ts` is display-only) that refuses create/start/repair before any place or container start and the 120-second readiness wait; refusal of model/login grants; fail-closed tools fill when a private/workspace dependency cannot resolve; proxy deletion; the live-suite migrations; docs.
- Coordination: lane A is not the deletion implementer; task 10 leaves `proxy.js` and its tests in place. No UI change is required while the feature is hidden; a wording change would be lane G coordination only, with no new tracking task.
- Acceptance: no `@opencode/*` in `packages/web` except `Dockerfile:60` (task 15); no in-space OpenCode runtime; the focused refusal test and full `bun run test` green at the landing commit; remaining live suites pass or have recorded deletions.

**Rejected: A** — the six workstreams above cost it as a separate effort.

### Unknowns and blockers

- No Docker probe ran (director boundary approval and maintainer probe permission pending). Claims above are source-referenced, not live-space evidence. A source-level failure such as the `isOpenCodeReady` mismatch is an inference about runtime, not an observed Docker failure.
- Open question 2b (Docker probe permission: cached image only, pull allowed, or no probe) is also unanswered; no probe ran under any setting.
- The npm registry content for `@openchamber/web@2.2.0` and the OMP packages was not fetched (no outbound permission). Whether the published web build matches this worktree, and whether it still requires `opencode` on PATH, is unverified.
- OMP provider baseURL/override and login-grant support were not exercised; option A's credential cost could rise if the Agent Service lacks an equivalent.
- macOS/Windows/ARM remain unmeasured; this environment is Linux x64.
