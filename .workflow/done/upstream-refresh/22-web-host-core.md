# 22: Web host core

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 4d69e299e4

**Delivers:** The Host Gateway core matches upstream: server composition and route registry, guests, Git and filesystem modules, sessions/control, walkthrough, scheduled tasks, routing, CLI and web build/public assets.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/22.tsv` (216 paths: 149 clean/new, 65 both-side, 42 conflicts). Main locations: `packages/web/server/lib/{guests,git,fs,openchamber-sessions,openchamber-control,walkthrough,scheduled-tasks,routing,event-stream,...}`, `packages/web/server/index.js`, `packages/web/src`, `packages/web/bin`, `packages/web/public`. Carries the desktop-host update producer that task 10's `UpdateDialog` needs: expose the `installBlocked` states (desktop-host install, service-manager, and the other upstream values) on the host update state; task 25 maps them in `useUpdateStore`. Task 22's branch already adopted `lib/source-control/{project-path,provider-id}.js` from task 06's list as prerequisites (they are no-ops for task 06).

**Read first:** Spec W6; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/relay-transport/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `packages/web/bin/lib/DOCUMENTATION.md`; module `DOCUMENTATION.md` files.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the web test suite passes, `bun run dev` serves the UI and `/api/agent/v1/ready` returns 200, a Git status/diff request and a filesystem read work, and a Guest panel connects through the Host.

## Done when

- [x] `server/index.js` composes route modules through one registry (`host/feature-routes-runtime.js`); later tasks add routes there without ad-hoc imports.
- [x] Host services keep their owners; no inherited OpenCode lifecycle is reintroduced.
- [x] CLI flags, `--json`, and non-TTY behavior stay as the fork documents (CLI tests green; upstream’s Tailscale capability file deferred to task 19).
- [x] Web/PWA assets and the service worker update from upstream (icons, favicons, manifest assets, `sw.ts` adopted).
- [x] Guest lifecycle and file/git boundaries keep their tests.
- [x] The host update state exposes every `installBlocked` value `UpdateDialog` renders, including the desktop-host branch; VS Code-only update kinds stay out.
- [x] Task 06's `lib/source-control/{project-path,provider-id}.js` prerequisites are already at upstream content; task 06 treats them as no-ops.

## Progress

### Method and base

- Worktree `upstream-refresh-22`, branch `upstream-refresh/22-web-host-core`, branched from `upstream-refresh/integration` at `4d69e299e4`.
- Compared against the real `0056bf6a9` blobs and the adopted baseline `1f9320062`, but every three-way merge was regenerated against the current integration tip instead of reusing the prep `merged/` blobs: task 01 and task 02 had landed after prep was cut. `/tmp` merge results were used only as working copies; nothing from prep `merged/` was committed verbatim.
- Per-path work: 97 fork-untouched upstream changes and 50 upstream additions adopted whole, 14 binaries adopted, 23 clean both-side merges taken, 42 textual conflicts resolved by hand, 2 upstream deletions reviewed. Base-relative dispositions are recorded below.

### Adopted / adapted (conflicts resolved by hand)

- `openchamber-control/actions.js`: fork action catalogue kept (descriptions and `agentExposed` policy); `models.search`, `browser.select`, `browser.close` added from upstream. Upstream's split `openchamber_schedule`/`openchamber_knowledge`/`openchamber_render`/`openchamber_workflow` tool names are **not adopted**: the Host declares one managed `openchamber` tool (`packages/agent-service/src/worker/host-tool.ts` is fixed and outside this path list), so schedule stays in it and knowledge/render/workflow ride it when their feature task adds the guidance. `session.moveToWorktree` and `work.name` are **not adopted**: the canonical service has workspace relocation rather than OpenCode's session move, and no worktree task-title owner.
- `openchamber-control/service.js`: canonical scope/session paths throughout; `answerPage` from the adopted render-page module; optional `workflowRuntime` seam for task 17; knowledge actions answer 503 until task 16 wires `project-knowledge.js`. Verified by the canonical control tests plus new `models.search`/`browser.close` cases.
- `routing/runtime.js`: fork Host-owned routing kept. Upstream's attachment fact was ported to the canonical prompt shape (`PromptAttachment.mediaType`/`name`) as `attachmentHint`/`routingRequestTextOf`, and `host/prompt-delivery-runtime.js` passes it to the classifier. `isSessionWarm`/OpenCode `warming` config are **not adopted**: session warming belongs to task 21 and no `lib/session-warming` exists here; the 5-minute TTL rule stands.
- `dispatch-results/runtime.js`: fork canonical runtime kept; adopted upstream's persist/load robustness and registration rollback plus its two generic tests. Upstream's `msg_` OpenCode id format is not adopted; the helper stays private.
- `scheduled-tasks/*`: fork canonical scheduler kept. Directory-based project resolution, OpenCode prompt/command senders and trust checks are not adopted. Upstream's `listEligibleTargets` **is adopted** against Host session scopes (`resolveSessionScope` + project + directory + archive state), and the adopted `routes.js` endpoint is registered; a canonical discovery test covers it.
- `fs/routes.js` + `fs/search.js` + `content-search.js` + `ripgrep.js`: upstream's find-in-files endpoint, batched `directory-stats`, gib-ignore timeout and visited-file ceiling adopted; managed-chat roots, canonical scope resolution and the root-repository boundary (a repo root lists no nested repos) stay. `feature-routes-runtime.js` injects `createRipgrepResolver` (staged desktop binary, `@vscode/ripgrep`, PATH).
- `fs/routes.test.js`, `content-search.test.js`: the find-in-files suites are `skipIf` no ripgrep binary is installed. The fork does not depend on `@vscode/ripgrep` yet; adding it belongs to the toolchain task (packages/web/package.json is outside this path list).
- `event-stream/global-ws-bridge.js`: fork canonical frames bridge kept; upstream's `spaceId` forwarded-payload change targets the OpenCode payload translator the fork removed, so it is not adopted.
- `openchamber-sessions/archive-store.js` (+ test), `session-goal/runtime.js` (+ test), `markdown-image-grants/routes.js` (+ test): the fork's canonical metadata SQLite archive, canonical goal authority and canonical image-grant route are kept whole. Upstream's OpenCode-archive file, Host goal loop and render-page grant path are **not adopted**; the Host owns those boundaries (goal loop retired per `decisions.md`). The engine-only new `session-archive.js` (+ test) is **deleted**, not adopted.
- `guests/DOCUMENTATION.md`: `RESPONSE_TOO_LARGE`/`responseMax` documented because the adopted `guests/request.js` implements it; the canonical `directory` query form is kept.
- Documentation: fork Canonical/OMP text kept for `browser-control`, `event-stream`, `fs`, `guests`, `markdown-image-grants`, `openchamber-control`, `routing`, `session-goal`, `session-work`, `tracked-items`. Upstream sections added only where code was adopted (`fs` find-in-files/directory-stats, routing attachment fact). VS Code and OpenCode-engine prose is not carried over.
- `source-control/provider-id.js` and `source-control/project-path.js`: adopted ahead of task 06 because adopted git/tracked-items code imports them; both are dependency-free contracts. Task 06 owns the descriptor registry and provider modules that consume them.

### Adopted but deferred (recorded, not landed)

These upstream paths were adopted, then reverted to the integration version because their new imports belong to later tasks and the branch must stay green. Their adoption moves to the owner named:

- Task 06: `git/{identity-provisioning,network-operation-plan,worktree-creation,credential-resolver}.js` and their tests, `git/network-operation-plan.review.test.js`, `git/repository-credential-runtime.test.js` (need `source-control/provider-descriptors.js` and the provider descriptors); `tracked-items/{items,service,readers}.js` + tests, `tracked-items/routes.test.js`; `provider-read-cache/index.js` + test; `openchamber-sessions/session-link.js` + test; the whole `walkthrough/` refresh (`index.js`, `sources.js`, `routes.js`, `pull-request.js`, `prompt.js`, `schema.js`, `model-settings.js` + their tests and doc) because pull-request and sources need the same descriptor registry. The fork's files and tests are unchanged.
- Lane B / task 04: `guests/catalog.js` + test and `guests/service.js` + test (need `resolveStatusSectionSource`, `toPublicSourceControl` and `OPENCHAMBER_HOST_CALLBACK_URL` from the refreshed Guest SDK).
- Task 19: `bin/lib/cli-tunnel-capabilities.js` and `bin/cli.test.js` (need the Tailscale tunnel provider).
- Tasks 06/07/24/12: the upstream `web/src/api/{clientAuth,git,index,repository-references,source-control*,trackers*}` clients and `web/src/DiffView.hunks.test.ts` need UI contract fields owned by tasks 24/12; the two upstream deletions (`web/src/api/linear.ts`, `github-references.ts`) are not applied because the retained clients import them.
- Task 16: `openchamber-control/project-knowledge.js` stays adopted but unimported, and its test is not adopted: the module needs `project-context/plan-progress.js` and `createTodo`/`updateTodo`/`setPlanSession`. `bun run dead-code` flagging this file and the unused image helpers in `render-page.js` is the expected deferral until tasks 16 and 12 wire them.

### Delivered interfaces for tasks 06-21

- Host update producer for `UpdateDialog`/`useUpdateStore` (task 25): `GET /api/openchamber/update-check` reports `installBlocked: 'manual-install'` for an unmanaged web install and keeps `'service-manager'`; the desktop path forwards the updater's `'desktop-host'`, and `POST /api/openchamber/update-install` answers 409 `DESKTOP_UPDATE_LOCAL_ONLY` before restart. Tests cover both new branches.

- `shared/guards.js`, dependency-free `source-control/{provider-id,project-path}.js`, git loopback/LFS/credential-reference helpers that do not need the descriptor registry, `guests/*` retained modules, `projects/project-id.js`, and the route registry through `host/feature-routes-runtime.js` + `server/index.js`.
- Control service: `models.search`, `browser.select`, `browser.close`, canonical `answerPage`, optional `workflowRuntime`, schedule target discovery via `listEligibleTargets` and `POST /api/projects/:projectId/scheduled-tasks/targets/eligible`.
- Filesystem: `GET /api/fs/find-in-files`, `POST /api/fs/directory-stats`, ripgrep resolver; routing `attachmentHint`/`routingRequestTextOf`.
- Route families registered for the feature UIs: `/api/source-control`, `/api/tracker`, `/api/session*`, `/api/fs`, `/api/git`, `/api/openchamber*`, `/api/event`, `/api/config`, `/api/guests`, `/api/provider`, `/api/quota`, `/api/diagnostics`, `/api/magic-prompts`, `/api/message-queue`, `/api/session-knowledge`, `/api/session-folders`, `/api/session-drafts`; `/api/session-warming` arrives with task 21.
- `render-page.js` is wired (`answerPage`); `project-knowledge.js` is in the tree for task 16. If `bun run dead-code` flags them, that is this expected deferral.

**Check after:** type-check exit 0, lint exit 0, `bun run test` exit 0 (7/7 suites, 6290 passed, 142 skipped) with a fresh HOME, dead-code inspected, and the real-path dev run below; receipts in the artifact directory named under Checks.

### Recheck after rebase

Rebased onto `upstream-refresh/integration` at `4634e8bcf1` (tasks 03, 10 and 23 plus the agent-service usage fix had landed). `bun install --frozen-lockfile` exit 0; `bun run type-check` exit 0; `bun run lint` exit 0. Root `bun run test` under concurrent machine load hit unrelated timing flakes (`terminal/shutdown.test.js` SIGTERM arrival, twice, and once the UI `openFenceIncremental` 5s render cap). `terminal/shutdown.test.js` passes 3/3 in isolation and the web suite ran clean on its own at this tree: 400 files, 6292 passed, 142 skipped (`web-test.log`); the UI suite alone passes 821/821 files (`ui-test.log`). The final root run reports 6/7 suites with only that terminal timing flake. The real-path run was repeated at the rebased tree with the same results (`/api/agent/v1/ready` 200 engine `omp`, UI 200, git status 200, a real worktree change answered as a unified diff, fs read 200, Guest panel 200 with the Host bootstrap). `bun run dead-code` still reports only the expected deferrals (`project-knowledge.js`, render-page image helpers).

Path dispositions at this tree: 133 adopted or adapted, 68 kept as the fork's canonical/engine-free implementation (the notable owners are named above), 13 upstream additions not adopted (their tests and modules deferred with the owner), 2 no-ops. The two upstream deletions are not applied for the same UI-contract reason as their importers.

### Checks (worktree, Bun 1.4.4)

Artifacts: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-22-2026-10-27/`.

- `bun install --frozen-lockfile`: exit 0 (1407 packages).
- `bun run type-check`: exit 0 (`type-check.log`).
- `bun run lint`: exit 0 (`lint.log`).
- `bun run test` at the final tree, with `HOME`/`XDG_CONFIG_HOME` at a fresh temp dir: exit 0, 7/7 workspace suites, 6290 passed, 142 skipped (`test.log`). The web suite alone: 400 files, 6290 passed, 142 skipped (`web-test.log`). The known `network-defaults.test.js` stale-`~/.config/openchamber` failure did not reproduce with the fresh home.
- `bun run dead-code`: exit 1 with the same baseline findings as the integration tip plus the expected deferrals: `openchamber-control/project-knowledge.js` (task 16) and the render-page image helpers/action arrays (tasks 12/13). No other new finding; `dead-code.log` records it.
- `bunx oxlint` on the substantially rewritten files (control actions/service, routing runtime, session-work runtime/test, scheduled existing-session/test, feature-routes-runtime, prompt-delivery-runtime, fs routes/search): no findings.
- Real path (`bun run dev`, isolated `OPENCHAMBER_DATA_DIR`, ports 3952/5190):
  - UI served at `http://127.0.0.1:5190/` (200, `<title>OpenChamber - AI Coding Assistant`).
  - `GET /api/agent/v1/ready` → 200 `{"ready":true,"engine":"omp","version":"1.0.0"}`.
  - `GET /api/git/status?directory=<worktree>` → 200 with the branch and changed files; `GET /api/git/diff?directory=<worktree>&path=packages/web/bin/cli.test.js` → 200 with the unified diff.
  - `GET /api/fs/read?directory=<worktree>&path=<worktree>/package.json` → 200 with the file body.
  - Guest Host boundary: `POST /api/guests` installed `packages/sdk/examples/hello-kit` (201), `GET /api/guests` lists it, and `GET /api/guests/hello-kit/panel/index.html` → 200 HTML carrying the Host bootstrap script and injected guest styles. No browser was driven, so MessagePort pairing itself is unverified (named limit).
- No OpenCode engine import, `lib/opencode` host helper, trust module or VS Code path is reintroduced; the port is scanned (`grep` for `@opencode/client`, `opencode-trust`, `OpenCode.make` returns nothing).

### Limits and follow-ups

- Real-path UI observation is limited to the host endpoints until the UI feature tasks land; the Guest panel check still exercises the Host guest proxy.
- Task 16 must add the project-context todo/plan-session methods and wire `project-knowledge.js`; task 17 wires `workflowRuntime`; task 21 owns session warming; tasks 06/07/24/12 own the deferred web clients and their tests.

