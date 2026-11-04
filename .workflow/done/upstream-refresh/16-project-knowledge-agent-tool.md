# 16: Project knowledge, memory and agent tool

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 8ee84af280fd86187d97438ba94d1041e3bc3e28

**Started:** 2026-10-29T14:47:41+08:00

**Delivers:** Upstream's notes/todos/plans/memory panel and the project-knowledge agent tool work with the fork's Host storage and canonical API.

**Blocked by:** 10, 22, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/16.tsv` (32 paths: 22 clean/new, 10 both-side, 6 conflicts). Main locations: `packages/web/server/lib/{project-context,session-knowledge,agent-memory,agent-tool,context-obligatory,skills-catalog}`, `packages/ui/src/lib/sessionKnowledge*`, `packages/ui/src/components/sections/{agents,skills}`.

**Read first:** Spec W6; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; architecture persistence rules.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the knowledge tests pass, and in the running app notes/todos/plans can be created, edited and linked to a plan, and an agent turn can read project knowledge through the tool. Real path: ask the agent a question whose answer is only in a note.

## Done when

- [x] Knowledge is stored in the Host's owning store; the agent tool reads through the service boundary.
- [x] Plan links and dependencies persist across restart.
- [x] No OpenCode instruction-file mechanism is used as the only store.
- [x] Deleted entries are not resurrected by a stale cache.

## Progress

### Start

Worktree `upstream-refresh-16`, branch `upstream-refresh/16-project-knowledge-agent-tool`, cut from
integration tip `8ee84af280` (task 21 landed). `Dirty at start: none`.

### Plan

Task 16 owns 32 upstream paths under `packages/web/server/lib/{project-context,agent-memory,
agent-tool,context-obligatory,session-knowledge,skills-catalog}` and
`packages/ui/src/lib/sessionKnowledgeApi*`. Dispositions follow the refresh mechanism (base
`1f9320062`, ours this branch, theirs `0056bf6a9`):

- Adopt whole: `project-context/{runtime,routes,plan-progress,routes.http.test,runtime.test,plan-progress.test}.js`,
  `agent-memory/{actions,runtime}` and their tests (all clean or new), skills-catalog
  `remove-directory.*` and `scan.test.js`.
- Adapt: `session-knowledge/runtime.js` and its tests keep the fork's metadata-delivery design
  (the upstream instruction-entry mechanism is OpenCode surface and cannot be the store), taking
  upstream's text/guidance/checkout behavior; `sessionKnowledgeApi.ts` keeps fetch/report and adds
  the space `directory` option.
- Keep the fork's version: `session-knowledge/routes.js` (upstream replaced the delivered report
  with an instruction-entry sync endpoint), `context-obligatory/runtime.js` (fork's canonical
  Agent Service delivery already carries knowledge with pinned messages).
- Fork-deleted stay deleted: `agent-tool/runtime.js` and its test, because the OpenCode plugin was
  replaced by `lib/openchamber-control`; the knowledge actions port into that service.
- Excluded with reason: `skills-catalog/installed-sources.*`, superseded by the Host
  `skill-catalog-owner` matching installed badges by native authored skill identity.

### Check before

Cannot pass yet: the server had no `/todos` create/patch/delete routes or plan-session link,
`plan-progress.js` (imported by `openchamber-control/project-knowledge.js`) did not exist, the
knowledge actions answered 503 in the control service, and the OMP host-tool bridge exposed no
knowledge tool. Focused runs of the adopted suites were impossible before the files existed.

### Built

- `project-context`: adopted upstream `runtime.js`, `routes.js`, `plan-progress.js` and their tests
  whole (fork had not changed these files since `1f9320062`). Adds todo create/update/delete,
  plan links and dependencies with cycle/plan/duplicate checks, `expected` conflict answers,
  plan checklist progress, plan session links, and plan-link cleanup on delete/move.
- `agent-memory`: adopted upstream `actions.js`/`runtime.js` and tests whole: related-entry
  reports, rewrite-by-`memoryId`, and re-flagging on update.
- `openchamber-control`: wired `createProjectKnowledgeActions` into the service (replacing the 503)
  with `projectContextRuntime`, `resolveProjectContextId`, `showPlan`, `isKnowledgeToolEnabled`
  and a projectId-aware `resolveDirectory`; added the `openchamber_knowledge` tool to the service
  tool map and feature policy (`agentKnowledgeToolEnabled`, on by default).
- OMP bridge: `openchamber_knowledge` is a host tool in
  `packages/agent-service/src/worker/host-tool.ts`, its actions are in the native-policy
  allowlist, and the worker authorization skip list names it. `showPlan` broadcasts
  `openchamber:plan-open-request`, which the refreshed UI already handles.
- `session-knowledge`: kept the fork's metadata-signature delivery (upstream instruction entries
  are OpenCode surface) and adopted upstream's text: memory save/index wording, link guidance,
  render-page and workflow guidance, `r:on`/`w:on` signature parts, and per-source 8,000-character
  truncation so one huge pin cannot crowd out memory or guidance. Availability flags wired to
  `agentRenderToolEnabled`, `agentWorkflowToolEnabled` and workflow feature availability.
- `sessionKnowledgeApi.ts`: kept fetch/report, added the space `directory` routing option to the
  pin and delivery writes, with an adapted test.
- `skills-catalog`: adopted `remove-directory.js` (retrying delete plus stale-clone sweep) into
  the fork's `prepareSkillsFromRepository` flow and `scan.js`, plus the `ls-files -- subpath`
  scan fix; adopted `scan.test.js`.
- Kept the fork's version: `session-knowledge/routes.js` (delivered report instead of the
  instruction-entry sync route) and `context-obligatory/runtime.js` (knowledge rides with pinned
  messages after compaction).
- Stayed deleted: `agent-tool/runtime.js` and `agent-tool/runtime.test.js` (the OpenCode plugin
  was replaced by `lib/openchamber-control`).
- Excluded with reason: `skills-catalog/installed-sources.*`; the Host `skill-catalog-owner`
  already matches the Installed badge by native authored skill identity, so the extra JSON
  provenance registry would be dead code.
- Documentation: merged `project-context` docs; rewrote `session-knowledge` and `agent-tool` docs
  for the OMP delivery and the knowledge tool; updated `context-obligatory` docs; documented the
  temp-folder retry/sweep and the `ls-files` subpath rule in `skills-catalog`.

### Gate repairs found while running the Check

- Root test was already red at `8ee84af280` in
  `packages/web/server/lib/host/settings-helpers.test.js`: task 21's commit
  `b89a566f1b` regenerated `settings-registry.json` with 13 persistable keys the
  server sanitizer dropped (`agentKnowledgeToolEnabled`, `agentRenderToolEnabled`,
  `agentWorkflowToolEnabled`, `agentScheduleToolEnabled`, `layoutAnimations`,
  `openLinksInBrowserPanel`, `liveBrowserTabLimit`, `openTrackerLinksOnBoard`,
  `worktreeArchiveOnDoneEnabled`, `showOpenCodeUpdateNotifications`,
  `mobileReturnKeySends`, `savePastedImagesAsFiles`, `smallModelVariant`). Without
  the repair the knowledge tool's own setting could not be saved and `bun run test`
  could not exit 0. Added the sanitizer branches (booleans; the tab limit clamped to
  the UI's 1..20; a non-empty string for the variant) and the missing fixture values,
  then the file's 59 tests pass.
- The OMP worker authorized `read`/`write` of an `xd://<tool>` URI with the native
  file policy, so every mounted extension tool was refused ("Host policy refused the
  tool operation") in a real turn. `packages/agent-service/src/worker/session.ts` now
  lets the device dispatch through; its inner capability call still checks the live
  session scope and feature policy (`decisions.md: 2026-10-30 - Let a mounted
  extension tool own its xd:// device write`).

### Real path (2026-10-30)

Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-16-2026-10-29/`
(`logs/`, `screenshots/`). App run with isolated `HOME`/`OPENCHAMBER_DATA_DIR`, provider
credentials from the operator's OMP config (values never printed), UI on
`127.0.0.1:3750`, headless Chrome.

1. In the running app, created the note "Release codename for build 16 is
   harbor-lantern-4417. This fact exists only in this note." from the Project knowledge
   panel (`screenshots/03-knowledge-linked-before-restart.png` shows it after restart).
   The codename appears nowhere in the repository or the prompt.
2. Real provider turn (CLIProxyAPI `gpt-6.1-sol`): asked the agent to call
   `openchamber_knowledge` / `knowledge.list`. The agent read the tool device, called
   `knowledge.list`, and answered "harbor-lantern-4417 — knowledge.list"; the tool
   result in the transcript lists `Notes (1)` and the note id
   (`screenshots/02-agent-note-answer.png`, `logs/real-path-transcript.jsonl`).
3. Through the same tool actions, edited the note (with `expected`), created a plan
   with a `## Steps` checklist, linked the note and two todos to the plan, made the
   second todo depend on the first, and completed the first. `logs/knowledge-before-restart.txt`
   records the note's `planId`, both todos' `planId`/`dependsOn`/`completed`, and the
   plan's `progress`.
4. Restarted the app (`logs/dev-restart.log`): `logs/knowledge-after-restart.txt` has
   the same ids, the edited body, the plan links, the dependency, the completed flag
   and `progress { done: 0, total: 2 }`.
5. Deleted the note through `knowledge.delete`: the next list is empty of notes
   (`logs/knowledge-delete-immediate.txt`), and a second restart still shows none
   (`logs/knowledge-delete-after-restart.txt`), with both todos and the plan intact.

### Check after

All gates exit 0 with Bun 1.4.4 (the host default is 1.4.2, which has no
`bun check`; 1.4.4 was fetched into the evidence dir for the run):

| Gate | Log | Result |
|---|---|---|
| `bun install --frozen-lockfile` | — | 1423 packages installed, lockfile unchanged |
| `bun run type-check` | `logs/type-check-final3.log` | exit 0, 3,001 files, 5 projects |
| `bun run lint` | `logs/lint-final3.log` | exit 0 (pre-existing UI warnings only) |
| `bun run test` | `logs/test-final3.log` | exit 0, 7/7 suites, 7,348 passed + 142 skipped |
| Knowledge focused (earlier) | — | project-context/agent-memory/session-knowledge/skills-catalog/openchamber-control 350/350; agent-service 247 passed + 7 skipped; UI knowledge API 3/3 |

### Review

`Review boundary: 8ee84af280 + 35 modified/new paths in this worktree; round: 1 (+ delta round 1, delta round 2); briefs: A,B,security; boundaries: Host knowledge store and service boundary, agent tool authorization (xd device carve-out, openchamber_knowledge), project-context routes/paths, settings sanitizer, skills temp sweep; findings: 2 blocking / 4 nonblocking (round 1)`

- Brief A (requirements/process): pass, 0 findings.
- Brief B (quality): 1 blocking — a knowledge action could override the calling session's project with `projectId`/`directory`. Fixed: `ownerOf` refuses overrides when `contextSessionId` is present; session-less CLI calls keep the explicit target; new `project-knowledge.test.js`. Delta recheck: fixed, no new blocking issue.
- Security pass: 1 blocking (round 1) — the `xd://` carve-out used `startsWith`, so `read "xd://tool;/real/path"` skipped Host authorization. Fixed with a single-device-path predicate and tests. Delta round 2 raised the `:conflict://` rewrite residual (blocking as written); narrowed the pattern to exclude `/` in the name and `/`-leading topics, with tests. Final confirmation: closed, no remaining bypass.
- Security nonblocking: dot-stem project ids climbed one level (`.`, `..`); fixed in `project-context/runtime.js` and the `agent-memory` sibling, guarded after trimming, with tests. Install staging folders were not swept; the sweep pattern now covers `stage`. Host-tool error codes collapsing to `SERVICE_UNAVAILABLE` is pre-existing and recorded in `.workflow/technical-debt.md` ("Host tool errors collapse to SERVICE_UNAVAILABLE").
- The two gate repairs (settings sanitizer/fixture, xd device authorization) were reviewed as part of this boundary and justified in the review; the xd behavior has a decision entry.

**Finished:** 2026-10-30T02:47:00+08:00
