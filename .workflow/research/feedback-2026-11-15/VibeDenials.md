# VibeDenials — Host permissions deny OMP tools in Vibe mode

## 1. Findings

### F1 — "Vibe mode" is an OMP **session mode**, not a permission mode. The denial has nothing to do with approvals.
- Composer mode: `main | plan | vibe | goal` — `packages/ui/src/components/chat/composer/ui/modePickerOptions.ts:3-14`, canonical control `mode.set {mode}` in `packages/agent-contract/src/session.ts:68,222`, client `packages/ui/src/canonicalClient.ts:324`.
- Worker `ModeController.set('vibe')` → `enterVibe()` (`packages/agent-service/src/worker/mode.ts:473-511`): activates **only** `read` (+`todo`) + `vibe_spawn`, `vibe_send`, `vibe_wait`, `vibe_kill`, `vibe_list` — everything else (`bash`, `write`, `edit`, `eval`, `task`, MCP…) is removed for the director.
- Permission mode is a *separate* axis: `ask | safety | auto` (`packages/web/server/lib/permission-auto-accept/modes.js:16`), UI label "Permissions: accept everything" for `auto` (`packages/ui/src/lib/i18n/messages/en.ts:3579-3581`, `components/chat/composer/ui/PermissionAutoAcceptButton.tsx:31-37`). The maintainer's isolated Host has `permissionDefaultMode: "auto"` (`~/.local/share/ohpichamber-iso/data/settings.json:55`), so sessions start in "accept everything".
- Confidence: high. Vibe mode never writes a permission mode and `auto` never reaches the authorizer's decision (see F2).

### F2 — Real evidence: `vibe_spawn`/`vibe_list` die on the authorizer's **final fallthrough deny**, not on an approval.
Session `d5d901e5-1dde-40fa-9c11-586dc389aed4` (isolated app chat, 2026-11-15T14:38, runtime 18.18.0, cwd `~/.local/share/ohpichamber-iso/chats/2026-11-15/session-d5d901…`):
- `…/2026-11-15T14-38-18-678Z_01a1dfa5….jsonl:7` — `"type":"mode_change","mode":"vibe"` at 14:38:23.
- line 18 `vibe_spawn` → `"The workspace policy does not allow this tool request"` (isError). line 24 `vibe_list` → same. line 34 `vibe_spawn` (retry) → same. line 49 `vibe_spawn` (`fast` cli) → same.
- Model's own summary (line 26/61, Chinese): "工作区策略拒绝了 `vibe_spawn` 和 `vibe_list`… 我在这个会话里没有直接写文件的工具" — it had no way to do anything.
- Producer: `packages/web/server/lib/host/worker-operation-authorizer.js:259` — `return denied('The workspace policy does not allow this tool request');`. Confirmed present in the packaged build: `/home/shizuku/.local/opt/ohpichamber/squashfs-root/resources/app.asar:459553`.
- Session `151b6640…` (vibe, 14:37) only used `read` (outside-cwd Steam paths — those are *approvalRequired*, auto-answered, hence success at `…151b6640….jsonl:17-48`). Confidence: high.

Root cause chain:
1. `vibe_spawn`/`vibe_send`/`vibe_wait`/`vibe_kill`/`vibe_list` are declared with OMP tiers — `exec`, `exec`, `read`, `read`, `read` (`packages/agent-service/node_modules/@oh-my-pi/pi-coding-agent/src/tools/vibe.ts:86-88,107-109,133-135,210-212,236-238`) — but they are **ephemeral tools installed by `activateVibeTools`**, so they are absent from `BUILTIN_TOOL_NAMES` (`…/src/tools/builtin-names.ts:1-32`) and from `HIDDEN_TOOL_NAMES`.
2. The Host authorizer classifies by hard-coded name sets only: exec `:227`, `mcp__*` `:230`, write tier `:237-245`, read tier `:247-258`. `vibe_*` matches none → `:259`.
3. The tier-coverage test that was supposed to prevent exactly this iterates `BUILTIN_TOOL_NAMES` only (`packages/web/server/lib/host/worker-operation-authorizer.test.js:511-525`), so it can never see vibe (or autoresearch / plugin / `browser` / `computer`) tool names.
4. Blast radius in vibe mode is total: the director has no other tools, so one fallthrough deny = the mode cannot work at all. Same trap remains for extension-registered tools (`autoresearch` `init_experiment|run_experiment|log_experiment|update_notes`, `src/autoresearch/index.ts:120-123`), `computer`/`browser` preludes, and any user plugin tool. [INFERENCE for plugins: same code path, not exercised in the data.]

### F3 — The authorizer is intentionally mode-blind: `auto`/`yolo` cannot bypass a deny.
- The authorizer never receives the permission mode. `authorizeWorkerOperation(trustedScope, request, descriptor)` (`lib/host/worker-authorization-channel.js:71-73`) has no mode parameter; `createWorkerOperationAuthorizer` derives only scope/policy/descriptor (`worker-operation-authorizer.js:86-261`).
- Mode is consulted **after** a denial would have been raised, only to auto-answer `approvalRequired` cards: `manager.reconsider` (`packages/agent-service/src/interaction/manager.ts:150-208`), mode read over IPC (`interaction/host-policy.ts:84-90`) answered by the Host (`lib/host/agent-service-supervisor.js:244-258`). Hard `denied()` never reaches that path.
- So "auto" (and any future "yolo") changes *cards*, never *denials*. That is the maintainer's experience in one sentence.
- Confidence: high.

### F4 — Every remaining hard-deny route a vibe/auto session can still hit
| # | Message | Code | Bypassed by `auto`? | Verdict |
|---|---|---|---|---|
| 1 | `The workspace policy does not allow this tool request` | `worker-operation-authorizer.js:259` | no | **Bug.** Missing classification (F2). |
| 2 | `The operation targets a path outside the authorized workspace` (write/edit) | `:189`, `:196` | no, even with an approval grant (test `worker-operation-authorizer.test.js:594-603`) | Intentional (ADR-05); message is the actionable one. |
| 3 | same, read | `:194` + `:189` | yes (card → auto) | Works as designed. |
| 4 | `An approval policy denies this exact tool request` | `:116` | no | User's own "always deny" row (`host-approval-policies.sqlite` currently 0 rows). |
| 5 | `Enterprise mode refuses …` / `The workspace does not allow provider credential entry` | `:133-136` | no | Intentional. |
| 6 | `The MCP server is not in the workspace configuration` | `:233` (also `:142-144`) | no | Intentional, but a disabled/renamed server reads like a policy bug. |
| 7 | `Isolated task delegation bypasses the Host authorization hooks` | `:182` | no | Intentional. |
| 8 | `The workspace does not grant file reads/writes` | `:242`, `:255` | n/a | Dead in practice: `agent-runtime.js:89` hardcodes `fileTools: ['read','write']`. |
| 9 | `Selected agent profile does not permit this tool` | `worker/session.ts:446` | no | Different gate (profile `allowedTools`); unrelated to approvals. |
| 10 | `Native command approval was rejected` / `… is unavailable` | `worker/native-bash-policy.ts:37,39`, reached from `interaction.requestNativeGrant` returning false when there is **no current turn** (`worker/interaction.ts:295-297`) | no | **Latent bug for vibe workers**: they run as async jobs after `vibe_spawn` returns, so the director's turn is closed. [INFERENCE — vibe spawn never succeeded in the real data, so unobserved; the code path is unambiguous: `currentTurn()` is `projection.currentTurn()?.turnId`, `projection.ts:559`.]
| 11 | Mode lookup fails closed to `ask` (`interaction/host-policy.ts:84-90`; scope not yet admitted → `agent-service-supervisor.js:236-243`) | — | card at worst | Flakiness source, not a deny. |

### F5 — OMP's own permission system: what it can and cannot express
Installed SDK read: `@oh-my-pi/pi-coding-agent` **18.18.0** (`packages/agent-service/node_modules/…`). The source checkout `/home/shizuku/Project/oh-my-pi` is **18.8.9** — I did not use it for API claims.

- Modes: `tools.approvalMode: always-ask | always-ask-cached | write | yolo`, **default `yolo`** (`…/src/tools/settings.ts:314-318`).
- Per-tool rules: `tools.approval.<tool>: allow | deny | prompt`, honoured in every mode; deny is absolute (`…/src/tools/approval.ts:366-560`; schema `settings.ts:295-299`).
- Folder rules: `tools.restrictedFolders` — every action on those folders prompts in every mode (`settings.ts:354-373`, matcher `approval.ts:577-620`). This is the **only** path-scoped mechanism.
- Tool-declared tiers `read|write|exec`, optionally per-args, incl. `reason`, `override`, `policy`, `policyKey` (`@oh-my-pi/pi-agent-core/src/types.ts:1075-1111`).
- Resolution entry point usable from the SDK: `resolveApproval(tool, args, mode, userPolicies, grants, restrictions, context)` and `resolveApprovalFromContext({settings|autoApprove})` (`tools/approval.ts:111-113,366`), plus `ApprovalMode` (`:37-38`), `isApprovalMode`, `getApprovalGrants`.
- **What it cannot express**: any notion of "outside the session cwd". `read`'s tier comes from `InternalUrlRouter.readTier(path)` (`tools/read.ts:1105-1110`), `write`'s from `writeTier` (`tools/write.ts:587-596`) — neither compares against cwd. No realpath, no symlink containment, no command parsing. So OMP alone cannot satisfy ADR-05 (`architecture.md:58-63`, `scope.md:371-372`, `SCOPE-6.3`).
- Its native ACP gate is narrow: `PERMISSION_REQUIRED_TOOLS = {bash, edit, delete, move}` (`src/session/acp-permission-gate.ts:7-12`), and non-bash tools are skipped entirely under explicit yolo (`src/session/session-tools.ts:1057-1060`). It is not a per-tool permission system for the whole toolset.
- How the fork hooks in today: worker `observer` extension `tool_call` handler → `authorizeTool` → Host (`worker/session.ts:443-521`); ACP bridge via `NativePermissionBridge` + `setClientBridge` (`worker/native-permission-bridge.ts`, `session.ts:596`), with `allow_always` cached **for bash only** (`native-permission-bridge.ts:83-100`). `tools.approvalMode` is classified `tui-only` (`worker/settings-ui.ts:129`), so the GUI never writes it; the isolated OMP config only sets `tools.approval.bash: allow` (`~/.omp/agent/config.yml:110-113`).
- Child sessions: vibe workers are real subagents spawned with `preloadedPreparedExtensions: session.preparedExtensions` (`…/src/vibe/runtime.ts:1322-1324`) and inline caller factories are rebindable (`src/sdk.ts:3070-3090`), so the fork's `observer` re-binds and **child tool calls re-enter the Host authorizer under the root session's scope**. They also run with `tools.approvalMode: "yolo"` forced (`src/task/executor.ts:1249-1251`), so inside a vibe worker only the Host can say no.

### F6 — Does the UI mode reach the authorizer? Partially, and it is not the bug.
- Session mode (`vibe/plan/main`): never reaches the Host authorizer; it only changes the worker's active tool set (`mode.ts:492-511`). Applied *after* creation, fire-and-forget with `console.warn` on failure (`packages/ui/src/sync/session-ui-store.ts:1190-1199`) — a race can leave a first prompt in Main. Not implicated in this report's evidence (mode_change landed before the first prompt).
- Permission mode (`ask/safety/auto`): resolved **per root session** over IPC at approval time (`host-policy.ts:69-90`), child/vibe lineages inherit via `resolveSessionMode` lineage walk (`permission-auto-accept/runtime.js:216-247`), and worker approvals are keyed to `entry.info.rootSessionId` (`supervisor/workers.ts:1205-1230`), so subagents inherit correctly. Failures fail closed to `ask` (`modes.js`, `agent-service-supervisor.js:236-243`). Correct, but irrelevant to hard denials (F3).
- One real plumbing hazard found: `permissionAutoAccept` is **not** a settings-registry key (`packages/web/server/lib/host/settings-registry.json` has only `permissionDefaultMode:40`; `packages/ui/src/lib/settings/registry.ts:248` likewise) while `sanitizeSettingsUpdate` still accepts it (`settings-helpers.js:297-313`) and then drops everything not in the registry (`:976-982`, `isPersistableSettingsKey` at `:18-26`). The policy runtime writes through `persistSettings` (`permission-auto-accept/runtime.js:68-77`), which **is** gated by that sanitizer (`settings-runtime.js:1047`). `~/.local/share/ohpichamber-iso/data/settings.json` contains no `permissionAutoAccept` key at all, despite the UI writing it four times on 2026-11-15 (`profile/logs/main.log:567,569,573,575`). [INFERENCE, medium-high: the per-session mode write is silently dropped, so a session's `auto`/`ask` choice may only live in memory and vanish on restart — the default `permissionDefaultMode: auto` masks it.] This is worth its own task.

## 2. Proposed fix

### 2.1 Delete name-list classification; make OMP's declared tier the default (owner: Host authorizer + worker policy request)
1. **Contract**: add `declaredTier: 'read'|'write'|'exec'` (and optional `declaredPolicy: 'allow'|'deny'|'prompt'`) to `NativePolicyContext` (`packages/agent-service/src/native-policy-protocol.ts:22-26`) — already carried on `policy.request` (`protocol.ts:210`), so no new IPC family.
2. **Worker** (`worker/session.ts:430-440`): compute it from the live registry it already has — `session.getToolByName(name)?.approval`, resolving the function form with the call args — and send it with every `hostAuthorize` tool request. Unknown/unresolvable → `exec`.
3. **Host** (`worker-operation-authorizer.js`): replace `:237-259` with:
   - `deny` declared by the tool or an exact policy row → deny (keep `:116`);
   - path check unchanged (`:189-199`);
   - `write` → allow when destination paths pass and `fileTools` includes `write`; `read` → allow after the source-path check; `exec`/unknown → `approvalRequired`.
   - Delete the hard-coded `isWriteTier`/`isReadTier` arrays *except* for specials that need extra arguments (`edit` effective mode, `context_notes` text, `retain` global, `learn` global, `ast_*`, `generate_image`, `lsp`, `bash`, `provider.use`, `task`, `web_search`, MCP).
   Result for the observed case: `vibe_spawn`/`vibe_send` → `approvalRequired` (auto answers, `ask` shows a card), `vibe_wait`/`vibe_kill`/`vibe_list` → allowed.
4. **Test that cannot drift again** (`worker-operation-authorizer.test.js:511`): replace the `BUILTIN_TOOL_NAMES` loop with a booted worker's `getAllToolNames()` (OMP `registry.ts`/`session-tools.ts:872`) enumerated in **main, plan and vibe** modes plus MCP and one extension tool, asserting: no result is `allowed:false` without `approvalRequired`, and each result matches the tool's declared tier.
5. **Message**: `:259` should name the tool and say the Host has no rule for it, e.g. `The Host has no authorization rule for <tool>` — the maintainer currently gets a sentence that sounds like a workspace policy decision and cannot act on it.

### 2.2 Second fix in the same effort (F4 row 10)
`interaction.requestNativeGrant` (`:295-297`) must not require an active turn; treat a missing turn like `approveTool` does (`turn-0`) but keep the CAS/grant tied to `toolCallId`. Otherwise bash inside a vibe worker/async child can still be rejected after OMP's own gate allowed it.

### 2.3 Verification (runnable Check)
- Unit: `bun run --cwd packages/web test -- server/lib/host` and `bun test --timeout 15000 src/worker src/supervisor src/interaction` in `packages/agent-service`; the new registry-coverage test must fail on the pre-fix authorizer and pass after.
- Real path (isolated data dir `OHPICHAMBER_DATA_DIR=~/.local/share/ohpichamber-iso-test`, Web on a spare port, real provider via CLIProxyAPI as the maintainer uses):
  1. new chat → switch composer to **Vibe** → "create `x.html` with an SVG" → expect `vibe_spawn` to succeed, worker to write the file, director to `read` it; screenshot + transcript.
  2. same turn with `ask` permission mode → one card for `vibe_spawn`, none for `vibe_list`.
  3. with `auto`, ask the worker to write outside the workspace → Host denies with the outside-workspace message (unchanged invariant).
  4. grep the new session JSONL for `The workspace policy does not allow this tool request` → must be zero.
- Also re-run the F6 probe: restart the Host, reopen the session, confirm its permission mode survived (it currently does not).

## 3. Open choices for the maintainer

**Q1 — Who decides ask/allow: the Host's tiers or OMP's `tools.approvalMode`?**
- **A (recommended): Host keeps tiers; OMP's declared tier replaces the hard-coded lists; OMP mode stays unused for approval, `ask/auto/safety` keep owning cards.** Denials left: out-of-workspace write/edit, explicit deny rows, enterprise, MCP-not-configured, isolated delegation. Vibe works in `auto`, prompts once per `vibe_spawn` in `ask`.
- **B: Host enforces only hard invariants (workspace containment, realpath, credential paths, enterprise, MCP config, isolated delegation) and lets OMP's mode + `tools.approval` decide allow/prompt.** Denials left: the invariants only — strictly fewer than A; but the GUI's `ask` shield would become advisory (it maps to `always-ask`, so cards appear via the ACP gate for bash/edit only, not for `eval`/`mcp__*`). This is the literal answer to "use OMP's instead", and it cannot cover ADR-05, so the invariants must stay Host-side.
- **C: keep lists, add `vibe_*` (and autoresearch/plugin names) explicitly.** Smallest diff; the same denial returns with the next OMP tool. Not recommended.

**Q2 — Should Vibe mode be unattended by construction?** Vibe is a delegation mode where the director has no shell/file tools; its workers already force OMP `yolo`.
- **A (recommended):** leave approvals as-is (per-call cards for `vibe_spawn/send` only under `ask`/`safety`); no mode-specific policy.
- **B:** treat vibe like `task` (no card, because the delegation itself is the authorization boundary). Fewer prompts, but a `vibe_spawn` the user never saw can then run arbitrary work in the workspace (still inside the workspace write grant).

**Q3 — The `permissionAutoAccept` persistence gap (F6).** Independent of the above; needs a decision on whether the per-session mode is a registry setting (profile) or stays a runtime-only policy.
- **A (recommended):** add `permissionAutoAccept` to the registry as `profile` (like `permissionDefaultMode`) so the write survives; add the drift-test fixture line (`settings-helpers.test.js:789`).
- **B:** move the policy to SQLite beside `host-approval-policies.sqlite` and stop routing it through settings.
