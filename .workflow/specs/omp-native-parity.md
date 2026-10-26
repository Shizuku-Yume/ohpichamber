# OMP-native parity: sessions, prompt, defaults, modes

**Status:** in progress
**Priority:** high
**Integration branch:** omp-native-parity/integration (cut from omp-native-chat/integration at b309346934)

## What this is for

A real-provider run on 2026-10-26 (session `d452f783`, screenshots 06-12 in `/home/shizuku/Project/ohpichamber-omp-artifacts/onc-acceptance-2026-10-26/`) showed that chat on `omp-native-chat/integration` still does not behave like plain OMP:

- Sessions are listed only from the Agent Service reference file, titles are all "Untitled", sessions created by the `omp` CLI are missing, and opening an old session is slow because every read starts an SDK worker. Boot and sidebar prefetch open every persisted session, fill the five-worker cap and then sends fail with 503 "SDK worker operation failed".
- The model sees text OMP never sends: session-link and memory-save guidance injected as `ohpichamber.context` developer messages, and Host tools mounted as `xd://` devices that the Host policy then refuses to read. OMP internal URLs (`proc://`, `agent://`, `history://`, `local://`, `xd://`) fail with "Host policy refused", so `wait`, `read agent://` and `read proc://` break.
- Defaults do not come from OMP. The worker forces thinking `off` when the client sends none, the UI shows "High" but sends `reasoningEffort: null`, a reload shows "Off", and sending `variant: 'high'` gets 422. OMP's own defaults (`defaultThinkingLevel`, `modelRoles.default` in `~/.omp/agent/config.yml`) are ignored.
- The Plan/Vibe/Goal mode buttons sit stacked left of the composer, are disabled in a draft chat, and use the native `title` tooltip. The maintainer wants a single mode dropdown in the old agent-picker slot on the right ("Main ▾", searchable).
- The bash approval card says "native tool operation requires approval" and "Always allow native-input" instead of naming the command and the tool.

The rule for this effort: for the same input and the same OMP config, a chat in OhPiChamber sends the model what plain `omp` sends and shows the user what OMP knows (session list, title, thinking level, mode).

## What it does

- The sidebar lists the project's OMP sessions from OMP's session storage, including sessions created by the `omp` CLI, with OMP's titles. A new chat gets OMP's auto-generated title.
- Listing, opening and scrolling a session reads its JSONL directly. No SDK worker starts until the user sends, changes mode or runs another mutating control. Boot opens no sessions. Opening a long session is fast enough to feel instant.
- A chat's context contains only what plain OMP would build for the same session, plus the user's own pins and attachments. OMP internal URLs work as they do in the TUI.
- New chats use OMP's default model role and default thinking level. The effort shown in the composer is the effort sent, and it survives reload.
- Settings gets an OMP section for settings that change agent behaviour (compaction, retry, approval, ask, task, plan/goal, MCP, skills, LSP, thinking budgets, model roles, enabled models). They read and write the OMP config, so the TUI and the app share one configuration. TUI appearance settings stay out.
- The composer's right side has one mode dropdown (Main, Plan, Vibe, Goal) where the agent picker was. It works in a draft chat, applies the mode when the session is created, and uses the app's Radix tooltip.
- An approval card names the tool and the command, and "Always allow" names what will be allowed.

## How it is built

Every change keeps the existing path: UI `canonicalClient` → Host session routes (authorization only) → Agent Service supervisor → session registry → worker. OMP pieces come from the pinned package exports; line numbers below are from the 2026-10-26 trace on `b309346934` and must be re-read before use.

### Sessions come from OMP storage (tasks 01, 02)

- The Agent Service lists a directory's sessions from OMP storage with OMP's listing code and returns OMP's title. Sessions created by the `omp` CLI appear. The reference file keeps only what OMP does not store; a JSONL without a reference is still listed. `RuntimeSession.title` carries OMP's title; Host metadata keeps Host-owned facts (pin, archive, folder) and no longer stores a title. A rename writes the OMP title through `SessionManager.setSessionName`, using the live worker when the root is open and OMP's cold session manager otherwise.
- New chats get OMP's own title generation, not the UI heuristic. The manual AI-rename action still generates a title with the small model, then saves it through the same OMP rename path.
- Listing reads OMP JSONL headers and timestamps without starting a worker; the live projection publishes OMP's later auto-title through `session.updated`.
- Reads never start a worker. Host snapshot/history (`routes.js:234-235`) authorize and forward; list, snapshot, history and messages read the JSONL through the registry's cold projection (`registry.ts:521` `coldProjection`, `:604` `coldHistory`). The Host owns the mutation boundary: send/run calls `reopen(scope)` after prompt capture and validation (`routes.js:167`), non-abort controls at `:420`, and delete at `:428`; fork and branch already reopen. Abort, steer, follow-up and approval/question replies require an existing live run and do not reopen. The canonical proxy guard (`canonical-routes.js:290-307`) still reopens other proxied session mutations. Rename stays worker-free: the live manager when the root is live, OMP's cold `SessionManager` otherwise (`routes.js:272`). A listed native session is promoted into the reference index by its first reopen (`registry.ts:149`), bound to the listed workspace and root identity; a mismatched scope or a native child addressed as a root is refused before any reference write.
- Boot opens nothing: `web/server/index.js:1287` `ensureGlobalWatcherStarted` stops opening every persisted session, and the sidebar prefetch (`useSessionPrefetch.ts:96,177`, `SessionNodeItem.tsx:1145`) and dispatch results (`dispatch-results/runtime.js:230-250`) read cold.
- A send while `maxActiveRootWorkers` (5, `workers.ts:55`) are live evicts the least recently used idle worker instead of failing with 503. If a capacity decision from `post-m3-hardening/18` is recorded in `decisions.md`, follow it.
- The UI loader waterfall (`session-message-loader.ts:592-663`) loads the newest page first and older pages on scroll.

### The model sees what OMP builds (task 03)

- Remove the injected guidance: `session-knowledge/runtime.js` `SESSION_LINK_GUIDANCE` (:74-76) and `MEMORY_SAVE_GUIDANCE` (:52-58, :83-102), sent as custom `ohpichamber.context` messages that the worker turns into developer messages (`worker/session.ts:341-345`). User pins and attachments still reach the model.
- Host tools (`host-tool.ts:13-39`: openchamber, web, memory, notify) are registered without `loadMode: 'essential'`, so OMP mounts them as `xd://` devices whose docs the Host policy refuses to read. They become ordinary callable tools whose only text is their own tool description, with no added prompt text.
- `native-policy-descriptor.ts:16` throws on any `://` path. OMP internal URL schemes (`agent`, `history`, `artifact`, `local`, `proc`, `skill`, `xd`, `mcp`, `omp`, `issue`, `pr`) are passed to OMP, which resolves them itself; other schemes keep today's refusal.

### Defaults come from OMP (tasks 04, 05)

- The worker stops forcing `off` (`worker/session.ts:297-301, 323-325`, `selectedReasoning ?? 'off'`). With no client choice, OMP's own resolution applies: `modelRoles.default` and `defaultThinkingLevel` (`cfgDefaultThinkingLevel`, OMP `session/settings.ts:197`).
- The catalog response carries the OMP defaults (model and thinking level). A draft chat shows them; the effort the composer shows is the effort it sends as `reasoningEffort`; a reload shows the session's stored level. The UI never sends an effort as `variant` (today `variant:'high'` gets 422; variants are routing destinations only, `catalog-models.ts:130-138`).
- App-level defaults (`DefaultsSettings`, desktop settings default model/effort) are retired in favour of OMP's.
- An OMP settings endpoint in the Agent Service reads and writes an allowlist of behaviour settings through OMP's Settings API, so `~/.omp/agent/config.yml` stays the only store. Allowlist: compaction, retry, `tools.approvalMode` and `tools.approval.*`, `ask.*`, `task.*`, plan/goal, MCP, skills, LSP, `thinkingBudgets`, `modelRoles`, `enabledModels`, `defaultThinkingLevel`. Appearance and TUI-only keys are excluded. Host routes authorize; the Settings UI gets an "OMP" section following `components/sections/PATTERNS.md`.
- Settings pages that only configured OpenCode behaviour and have no effect on OMP (candidates: classification, routing, magic prompts, snippets) are removed once each is confirmed dead.

### Mode dropdown (task 06)

- `composer/ui/ComposerModeSelector.tsx` (the stacked selector currently disables itself when there is no `sessionId` or snapshot) and `SessionGoalButton.tsx` become one dropdown on the composer's right side, in the slot of the removed agent picker. Historical correction: the composer picker was removed by `5d1fd2a` (`ModelControls.tsx` `renderAgentSelector` and `MobileAgentButton.tsx`); `2f4836e839`/`30c7f58f51` removed other agent selectors. Desktop uses the retired picker's `DropdownMenu` + search `Input` + `ScrollableOverlay`; mobile uses the same searchable list in a bottom sheet. It is keyboard operable and uses the Radix tooltip pattern in `FocusModeButton.tsx:33-55`.
- In a draft the chosen mode is held by the draft state and applied with `mode.set` after the session is created and before the first prompt; Goal asks for the objective first and creates the native goal instead of a prompt. When the plan role is missing (`mode.ts:178` returns 422), the workspace model catalog reports it and Plan is disabled with the reason in a Radix tooltip.

### Approvals and small defects (task 07)

- The approval projection carries the tool name and a one-line summary of the input (the bash command, the file path), and "Always allow" names the tool or rule it allows, with OMP's own scope.
- Chat directories that are not repositories stop producing 422 from `GET /api/source-control/binding`, and the sidebar shows "Could not refresh sessions" only when a refresh actually failed.

## What it must not do

- Must not start an SDK worker for a read, or open sessions at boot.
- Must not add prompt text, developer messages or tool descriptions that plain OMP would not send, other than user pins, attachments and the Host tools' own descriptions.
- Must not keep a second store for OMP settings or defaults, or copy OMP's settings schema by hand where the package exports it.
- Must not add compatibility layers, dual paths or fallback engines (`standards.md`).
- Must not write the maintainer's real `~/.omp/agent/config.yml` in automated tests; use an isolated OMP profile or agent dir.

## Rejected

- Keeping the reference file as the list source and importing CLI sessions into it: two sources of truth for one list.
- Warming workers in the background to hide cold-open latency: it is what fills the capacity cap today.
- Keeping the guidance text but moving it into the system prompt: still differs from plain OMP.
- App-owned defaults that override OMP's: the TUI and the app would disagree on the same session.

## How we will know it works

Worker behaviour is tested against a real OMP `AgentSession` with the local `Bun.serve` chat-completions fixture used by `worker/session-native.test.ts`. Host routes get `packages/web` tests; UI gets component tests. W11 uses the real provider (`~/.config/ohpichamber/omp-m0-provider.env`) and the maintainer's real OMP config, with the `gemini-3.8-flash` model at `high` for sends.

- **W1.** In a project with a session created by `omp` CLI and one created in the app, the sidebar lists both with OMP's titles. A new app chat gets OMP's generated title. A rename in the app is what `omp --resume` shows.
- **W2.** After a Host start over 20 persisted sessions, no SDK worker is running. Opening, scrolling and prefetching 10 sessions starts none. A send starts one. Sending in 7 different sessions in a row never returns 503; the least recently used idle worker is evicted.
- **W3.** Opening a cold session with at least 2,000 JSONL entries shows its newest messages within 1 s on the dev machine, measured in the browser, before and after recorded.
- **W4.** For the same first prompt and config, the fixture-recorded request from an app chat and from plain OMP have the same system and developer messages, apart from the user's pins and attachments; no `ohpichamber.context`. Host tools appear as callable tools, never as `xd://` devices.
- **W5.** In an app chat, `read agent://<id>`, `read history://<id>`, `read proc://`, `read local://x.md` and `wait` behave as in the TUI. `read file:///etc/passwd`-style non-OMP schemes are still refused.
- **W6.** With `defaultThinkingLevel: high` and `modelRoles.default` set, a draft shows that model and High; a send with no change runs at `high` (fixture-recorded); a reload shows High; choosing Off sends `off`. No effort is sent as `variant`.
- **W7.** Changing a behaviour setting in the app's OMP section writes the OMP config file of the profile in use, and a new session uses it; editing the file shows in the app after reopening Settings. Appearance keys are not offered. Removed settings pages are confirmed to have had no effect on OMP.
- **W8.** The mode dropdown sits on the composer's right side on desktop and mobile, opens with keyboard, filters by typing and shows Radix tooltips. Choosing Plan in a draft and sending creates the session in plan mode and the first turn has the plan tools. With no plan role, Plan is disabled with a reason.
- **W9.** With `tools.approvalMode: always-ask`, a bash call shows a card naming `bash` and the command; "Always allow" names what it allows and behaves as OMP's choice of the same name.
- **W10.** Opening chats in a non-repository directory makes no 422 request; the sidebar shows no refresh error on a healthy host.
- **W11.** At the integration tip with `bun run dev` and the real provider: W1, W2 (send in 7 sessions), W6, W8 (Plan from a draft), and a turn that runs a `task` subagent and reads its result with `read agent://` complete with no red tool errors. Screenshots and timings go to `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-<date>/`.

## Open questions

None blocking. Implementers decide within this spec, record each choice that a reviewer would ask about in `decisions.md`, and do not stop to ask the maintainer.

## Notes

- Trace sources: subagent reports from the 2026-10-26 session (InjectedPrompt, SessionHistory, OmpSettings, ModeSwitcherUI, WorkerCapacityLeak); the line references above are their findings.
- OMP installed globally is 18.11.3; the repository pins its own OMP package version. Read the pinned package under `node_modules/@oh-my-pi/` for exports.
- Tasks: `tasks/omp-native-parity/`. Landing: local merge into `omp-native-parity/integration`; that branch lands on `omp-native-chat/integration` after W11.
