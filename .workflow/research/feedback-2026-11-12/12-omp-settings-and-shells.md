# Item 12: OMP settings coverage, ownership, and hollow shells

Repo is clean. All numbers below come from loading OMP's real registry (`config/all-settings` `orderedSettings()`) next to our `OMP_SETTING_PLACEMENTS` (`packages/agent-service/src/worker/settings-ui.ts`). I did not run the GUI.

## (a) Coverage

| Set | Count |
|---|---|
| OMP registry | 602 settings |
| TUI-visible (carry `ui.tab`) | **450** across the 10 registry tabs. Plugins is a separate page in `settings-selector.ts:553`, not a registry tab. 51 of the 450 are `ui.condition`-gated. |
| Not in the TUI panel | 152 (no tab) |
| Contract allowlist `OMP_SETTING_IDS` | 157 (115 TUI-visible, 42 untabbed) |
| Our classification of those 157 | gui **30**, advanced 107, tui-only 13, duplicate 7 |
| Rendered on the OMP page | 28 registry rows plus 11 role pickers. `defaultThinkingLevel`, `default`/`smol`/`slow` roles and `commit` role render on other pages. |

Of the 450 TUI-visible settings:
- **26 are gui.**
- **89 are classified away**: tui-only 11, duplicate 6, advanced 72.
- **335 are not in the allowlist at all.** They are unclassified and unreachable (`catalog-settings.ts:23-42` rejects any id outside the allowlist), not "classified away".

The page copy is misleading. `settings.omp.advancedDescription` (`omp-settings.i18n.ts:20`) says "{count} settings are kept out", and the count is `visible.hiddenCount`, which is 127 (allowlisted non-gui; `OmpSettingsPage.tsx:400`). The real number is 572 (602 minus 30).

### Classified away, by TUI tab

| Tab | tui-only / duplicate (→ owner) / advanced |
|---|---|
| appearance (50) | tui-only: `tui.colorfulMarkdown`, `tui.renderSvg`, `tui.autoGraph`, `tui.spinnerInterval`, `tui.maxFps`, `tui.motion`, `display.shellVisualization`. Duplicate: `tui.renderMermaid`→`chat.mermaid-rendering` |
| model (65) | advanced: `modelRoleStorage`, `tier.{openai,anthropic,google,subagent,advisor}`, `retry.maxDelayMs`, `retry.fallbackChains` |
| interaction (61) | tui-only: `composer.predictions`, `composer.predictionAlternatives`, `update.auto`. Duplicate: `followUpMode`→`chat.follow-up-behavior`, `ask.notify`→`notifications.events`, `recap.enabled` and `recap.idleSeconds`→`chat.session-recap`, `tools.approvalMode`→`sessions.permission-default`. Advanced: `steeringMode`, `interruptMode`, `ask.timeout`, `tools.approval` |
| context (31) | advanced (8): `compaction.{experimentalContextManagement,midTurnEnabled,methodOrder,handoffSaveToDisk,remoteStreamingV2Enabled,asyncEnabled,supersedeReads,dropUseless}` |
| memory (31) | none classified; all 31 unclassified |
| files (28) | advanced: `lsp.{lazy,shared,diagnosticsOnWrite,diagnosticsOnEdit,diagnosticsDeduplicate}` |
| shell (18) | none classified; all 18 unclassified |
| tools (80) | tui-only: `extensionRenderers.transcriptPresenters`. Advanced (29): `tools.artifact*`, `tools.outputMaxColumns`, `glob/grep/astGrep/astEdit/checkpoint/ask/out.enabled`, `tools.intentTracing`, `tools.speculativeExecution.*`, `tools.maxTimeout`, `async.*`, `tools.xdev*`, `mcp.{startupTimeoutMs,renderMarkdownResults,notifications,notificationDebounceMs}`, `spotlight.experiment.enabled` |
| tasks (45) | advanced (17): `task.isolation.{apply,merge,commits}`, `task.{eager,batch,speculativeLaunch,enableEffort,workerThreads,enableLsp,maxRuntimeMs,completionProbe,agentIdleTtlMs,softRequestBudget,softRequestBudgetNotice,maxEffort,prewalk}`, `goal.continuationModes` |
| providers (41) | advanced: `providers.openaiResponsesWebsockets` |

### Unclassified TUI-visible settings (335), by tab and group

- **appearance 42**
  - Theme 4, Composer 2, Status Line 7: TUI-only.
  - Images 3: `images.autoResize` and `images.blockImages` are GUI-relevant.
  - Display 26: mostly TUI-only. GUI-relevant: `display.showTokenUsage`, `showTurnTime`, `hideToolActivity`, `collapseCompacted`, `subagentLivePreview`.
- **model 48**
  - Prewalk 5, Vision 9 (8 are `images.urls.*`), Thinking 12, Prompt 5 (`personality`, `includeWorkspaceTree`, …), Sampling 7, Retry 2, Advisor 8.
- **interaction 49**
  - Startup 9, Git 1 (`git.enabled`), Input 16, Magic Keywords 6, Notifications 2, Power 1, Agent 1.
  - Approvals 1 (`tools.restrictedFolders`), Skills 1, Speech 2.
  - Collab/share/stream 11 (overlaps our Tunnel and remote instances).
- **context 17**
  - `workspace.additionalDirectories`, `contextFiles.extra`, `contextPromotion`, `extendedContext`, `branchSummary`.
  - TTSR rules 8, snapcompact 4.
- **memory 31**
  - `memory.backend`, `sharpshooter.model`, `autolearn.*`, `mnemopi.*` 17, `hindsight.*` 10. Three credentials: `mnemopi.embeddingApiKey`, `mnemopi.llmApiKey`, `hindsight.apiToken`.
- **files 21**
  - `edit.*` 9, `read.*` 11, `lsp.requestTimeout`.
- **shell 18**
  - `bash.*` and `bashInterceptor`/`shellMinimizer` 10.
  - **`eval.*`, `python.*` 8**. `eval.py`, `eval.js` and `eval.tools.enabled` govern code mode (item 17).
- **tools 49**
  - Available Tools toggles 16: `todo`, `find`, `debug`, `launch`, `speechgen`, `generate_image`, `computer`, `ratchet`, `archive`, `fetch`, `vault`, `github`, `web_search`, `security`, `browser`, `ida`.
  - `browser.*`, `computer.*`, `github.cache.*`, `todo.*`, extensions, `ida.*`.
- **tasks 20**
  - Isolation 7 (`isolation.backend`, `worktree.*`), Subagents 4, Modes 5 (including `title.generator`), `commands.enable*` 4.
- **providers 40**
  - Services 24 (`providers.maxInFlightRequests`, speech/tts, `codexResets.*`, `claudeResets.*`, `exa`, `searxng.endpoint`).
  - Protocol/timeouts/privacy ~16 (`telemetry.otlpExportEnabled`, `secrets.enabled`).
- **Untabbed, not allowlisted:** 110. Examples: `auth.broker.*`, `memories.*`, `session.maxCost`.

Misclassifications I found:
- `followUpMode` (OMP: how queued follow-ups are drained, one at a time or all) is not the same concept as `chat.follow-up-behavior` (steer vs queue at send time, `ChatSettings.tsx:423`).
- `recap.enabled` and `recap.idleSeconds` name `chat.session-recap` as owner, but that control is a UI-only display gate (`useUIStore.ts:2714`, `useSessionAssist.ts:80`).
  - Nothing writes OMP `recap.enabled` or `recap.idleSeconds`.
  - OMP's `IdleMaintenance` (`session.ts:228-241`) keeps generating recaps when the box is off, so the user spends tokens.
  - The idle delay has no GUI at all.
- `followUpMode`, `tools.approvalMode`, `enabledModels` and `ask.notify` are never read or written outside tests and the placement table. The "owner" is asserted, not wired.
- `retry.fallbackChains` is "advanced", yet the Sessions page edits it (`DefaultsSettings.tsx:267-297`). `modelRoles` and `defaultThinkingLevel` are edited from two pages.
- `display.smoothStreaming` is TUI-implemented (`modes/controllers/streaming-reveal.ts:274-331`, driven by `event-controller.ts:331`). The SDK emits raw deltas, so the GUI needs its own reveal (relevant to item 16).

## (b) Ownership map and conflicts

| OMP group | Existing owner | Overlap / conflict |
|---|---|---|
| Model roles `default`, `smol`, `slow` | Sessions → Defaults (`DefaultsSettings.tsx:354,458,480`) | Our "walkthrough model" borrows OMP's `slow` role (consumer `walkthrough/index.js:228`). Small model has two rows both tagged `sessions.small-model` (lines 444 and 464): the "use default" checkbox and the picker, which is the item-5 "two small models". |
| Roles `vision`, `plan`, `tiny`, `memory`, `task`, `advisor`, `widget`, `image`, `web`, `speech`, `dictation`, `judge` | OMP page (`OmpSettingsPage.tsx:46-63`) | Several are hollow. The role pickers render, but the toggles that make the features run are not allowlisted: `advisor.enabled` and `speech.enabled` default off, `memory.backend` defaults `off`, `generate_image.enabled` defaults false. |
| Retry/fallback | Sessions "Fallback model" and OMP page `retry.*` | Same `retry.fallbackChains` and `retry.modelFallback` edited from two pages. |
| Compaction, LSP | OMP page (no other owner) | Clean. |
| Goal | Chat → `chat.session-goal` (`sessionGoalEnabled`, checker, turns) and OMP page `goal.enabled` | Two toggles for one feature. |
| Plan | Sessions → `plan-mode-allow-agents` (wired via env, `index.js:587` → `mode.ts:346`), default-mode, and OMP page `plan.enabled` | Overlap. |
| Prompt (`personality`, `includeWorkspaceTree`) vs Behavior page | Behavior (response style, injected at `prompt-delivery-runtime.js:79`; AGENTS.md) | `personality` overlaps response style. |
| Thinking/display (`hideThinkingBlock`, `display.*`, images) | Chat (`chat.reasoning`, `chat.activity-default`, …) | Unclassified. |
| Notifications (`completion.notify`, `error.notify`, `ask.notify`) | Notifications page | Terminal bell semantics vs our push/desktop channels. |
| Speech/STT/TTS | Voice page | Unclassified. |
| Web search (`providers.webSearchTimeoutSeconds`, `exa`, `searxng`, fallbacks) | Web search page via the dedicated `catalog-websearch.ts` route | Good model: an OMP concept owned by one page, outside the allowlist. |
| Git, worktree isolation | Git page and Sessions worktree cleanup | `isolation.backend`, `worktree.*`, `git.enabled`, `session.worktreeScope` have no home. |
| Memory (31) | OpenChamber `memory` tool (host store) | Two unrelated memory systems. The OMP one has no GUI at all. |
| Shell/eval (18), Files `edit.*`/`read.*` (20) | none | Orphans. |
| Tools toggles (16) and `browser.*` | General → OpenChamber Tools, MCP, Web search | `browser.enabled` defaults true and is not allowlisted, so OMP's headless `browser` tool and our `web` panel tool both reach the model. |
| Providers protocol/timeouts, reset auto-redeem | Providers, Usage | Unclassified. |
| Collab/share/stream | Tunnel, Remote instances | Overlap in concept. |
| Plugins | Plugins page | The TUI "Plugins" page maps here. |

Two structural problems:
- The OpenChamber Tools section lives on **General** (`OpenChamberPage.tsx:114`), but its item ids are `sessions.agent-*-tool`.
- The generic OMP page has become the dumping ground, while Defaults silently writes OMP keys on its own.

## (c) Hollow-shell audit

All seven host tools are registered unconditionally in every worker session (`host-tool.ts:44-71`, `loadMode: 'essential'`, `approval: 'exec'`). Enablement is checked only at call time (`service.js:1114-1136`). A disabled tool is still in the model's tool list, costs context, and answers 403 when called. `approval: 'exec'` on every host tool is also a candidate cause for item 1 (yolo still prompting).

| Feature (setting) | Verdict | Evidence | OMP equivalent |
|---|---|---|---|
| Agent control `openchamber` (`agentControlToolEnabled`, default on) | **Wired** | `service.js:1124`, dispatch `:989-1105` | Partial: OMP `task` covers subagents. `session.*` dispatch, `schedule.*`, `file.open` are unique. |
| Web `web` (`agentWebToolEnabled`, on) and Browser provider | **Wired** | `service.js:793-877`, `browser-control/provider.js:97` | OMP `browser` tool: duplicate, both active. |
| Notify (`agentNotifyToolEnabled`, off) | **Wired**, double-gated (`index.js:1483`) | `service.js:948` | None. `ask.notify`/`completion.notify` are TUI alerts. |
| Render (`agentRenderToolEnabled`, on) | **Wired** | `service.js:971`, `host-tool.ts:30-39` | None. |
| Image `openchamber_image` (`agentImageToolEnabled`, off, plus `agentImageModel`) | **Wired, duplicates OMP** | `generate-image.js:124-130`, backend `catalog-models.ts:713` (`generateImage` from pi-ai) | OMP `generate_image` tool (default off, not allowlisted) uses the `image` role (`modelRoles.image`). We have two image-model pickers: Tools → Image model and OMP page → Image role. |
| Knowledge `openchamber_knowledge` (on) | **Wired** | `service.js:933`, `project-knowledge.js` | Overlaps OMP `todo`, plan mode, `retain`, but the tool description separates them. |
| Memory `memory` (`agentMemoryToolEnabled`, off) | **Wired, duplicates OMP** | `service.js:936`, `index.js:853` | OMP `memory.backend` (`off`/`local`/`mnemopi`/`hindsight`/`sharpshooter`), `retain`/`recall`/`reflect`/`memory_edit`. Two systems, neither aware of the other. |
| **Workflow `agentWorkflowToolEnabled`** (on) | **Dead for the agent** | `HostToolActions.openchamber` (`native-policy-protocol.ts:60`) has no `workflow.*`, and no `openchamber_workflow` tool is registered (`host-tool.ts:44`). I ran `HostActionRequestSchema.safeParse`: `workflow.run` and `workflow.answer` → false, `session.list` → true. `host-tool.ts:57` therefore throws before the Host is called. | None. |
| ↳ Workflow toggle itself | **UI-only** | `index.js:1068` passes no `isEnabled`, so `runtime.js:191` defaults to true. The toggle only hides the panel (`availability.ts:9-11`). If the agent path were fixed, `featurePolicy` would gate `workflow.*` on `agentControlToolEnabled`, and the dead `else` branch (`service.js:1135`) would fall to the notify toggle for `openchamber_workflow`. The UI start route `/api/openchamber/workflows/start` works. | n/a |
| Session guidance gates `isSessionLinkingAvailable`, `isPageRenderingAvailable`, `isWorkflowAvailable` (`index.js:927-941`) | **Dead** | `createSessionKnowledgeRuntime` destructures only `isAgentMemoryEnabled` (`session-knowledge/runtime.js:86-96`). Commit 3a802c204 removed the guidance. `ui-blocks-guidance.js` has no importer. | n/a |
| Defaults → Default agent, Auto-apply agent model | **Dead / harmful** | Root prompts require `agentId: null` (`prompt-admission.js:5-10`). `captureDefaultSendSelection` (`defaultSendSelection.ts:55-62`) feeds `agentName` to app-started sessions (`memoryTidy.ts:60`) → [INFERENCE] 400 once a default agent is set. OMP agents are task subagents only. | OMP has no root persona. |
| Sessions → Fallback model | **Wired to OMP**, overlaps the OMP-page `retry.*` rows | `DefaultsSettings.tsx:267-297` | n/a |
| Orphan `web/server/lib/limit-failover/` | **Dead code** | Not imported anywhere. It is an OpenCode plugin with an OpenCode-era DOCUMENTATION. | Superseded by `retry.*`. |
| Sessions → Plan mode allow agents | **Wired** | `index.js:587` → `mode.ts:245-346`. Applies only to workers started after the change. | n/a |
| Chat → Session recap | **Display gate only** | See (a). | OMP `recap.*` |
| Chat → Session suggestion | **Display gate** | `useSessionAssist.ts:86`, `session-assist/runtime.js:27` | `composer.predictions` is TUI-only. |
| Behavior → Response style | **Wired** | `prompt-delivery-runtime.js:79` | Overlaps OMP `personality`. |
| Chat → Session goal (checker, turns) | **Wired** | env at `index.js:582-587` → `mode.ts:243-251` | OMP `goal.enabled` duplicates the toggle. |

Not audited: Routing/Jev, Magic prompts, message search, Classification, the other General items.

## Two IA proposals

**A. Concept-owned (distribute).**
- Replace `surface` with a target `page` and `section` in the placement table. OMP settings land on the OpenChamber page that already owns the concept.
- Sessions gets retry/fallback, compaction, plan/goal, steering/follow-up, isolation and worktree, and recap/title.
- Chat gets display, thinking, images and tokens.
- Behavior gets prompt, personality and context files.
- Agents gets task, prewalk and advisor.
- Providers/Usage gets protocol and resets.
- New **Tools** page in the Agent group replaces General → OpenChamber Tools. It carries one row per capability, merging our host tools with OMP's:
  - image = OMP `generate_image` plus the `image` role.
  - web = `browser` plus `web_search`.
  - memory = backend.
  - todo, github, and the rest.
- New **Memory** page and a **Code & Shell** page (bash/eval/python/edit/read/LSP).
- **Engine (OMP)** shrinks to an advanced, searchable long tail.
- Pros: no duplicates, natural placement. Cons: large change, and OMP users can't find "their" tab (mitigate with settings search).

**B. Engine hub, schema-driven.**
- Make the OMP page a `split` page. The sidebar uses task names, not TUI tabs: Models & thinking, Context, Memory, Files & editing, Shell & runtimes, Tools, Subagents & modes, Network.
- Derive the allowlist from the OMP registry instead of hand-listing ids, so the 335 gaps and future OMP additions appear automatically.
- Render type → control, group → section, condition → visibility, with OMP's label and description plus locale overrides.
- Settings already owned elsewhere become a "Managed in Sessions → Fallback model" link row, never a second control.
- TUI-only settings hide behind "Show terminal settings".
- Pros: near-complete coverage, follows OMP upgrades. Cons: a second home for similar concepts, and it risks the "TUI transplant" look you rejected.

**Recommendation:** A for the roughly 15 concepts OpenChamber already owns (Sessions, Chat, Behavior, Agents, Web search, Voice, Notifications, Git) plus the new Tools and Memory pages. B's schema-driven renderer serves the Engine long tail. Both need the allowlist derived rather than hand-listed.

Fixing the hollow shells (workflow schema, the dead guidance deps, the orphan failover module, default agent, tool toggles that only 403) is independent of either IA and needs no decision from you beyond choosing image/memory unification.

**Decision for you:** for image and memory, keep our host tools, or switch to OMP's `generate_image` and `memory.backend` (needs a chat card mapping for OMP's tool results)? I recommend switching image to OMP's tool, and for memory choosing one backend and mapping the other onto it.