# Technical Debt

Code that makes the next change expensive, one entry per finding, so reviews don't
rediscover it and the reason it wasn't fixed yet is kept. `flow-architect` adds
entries; any skill that finds debt may add one.

## Format

Each entry is a level-2 heading naming the concrete symptom, under `## Entries`.
Refer to an entry by its heading.

```markdown
## Order total computed in three places

- **Where:** <files or modules>
- **Added:** <YYYY-MM-DD>
- **Priority:** fix-now | worth-doing | only-if-grows
- **Problem:** <what is wrong, with evidence>
- **Impact:** <what gets harder while it stays>
- **Solution:** <the change, in plain terms>
- **Cost:** <what the fix risks, how big it is>
```

An entry leaves this file in one of two ways:

- Fixed: the task that fixes it deletes the entry in its own commit.
- Declined by the user: delete the entry and append a decision entry to
  `decisions.md` (Decided: not fixing <symptom>; Instead of: fixing it; Because;
  Mine: no; Revisit when), so reviews don't re-propose it.

## Entries

## Session unread state has no OMP source

- **Where:** `packages/ui/src/sync/session-unread.ts` (deferred by task 23; not created)
- **Added:** 2026-10-27
- **Priority:** worth-doing
- **Problem:** upstream marks a session unread from its OpenCode `time.idle`/viewed state. OMP exposes no viewed watermark, so task 23 deferred `session-unread` rather than faking an OpenCode field.
- **Impact:** upstream's unread markers and "unread finished sessions across restarts" cannot be adopted; later syncs will keep re-deferring the same file.
- **Solution:** define a Host-owned viewed watermark on the canonical session/event contract, persist it with the other session state, then port the upstream unread store and UI.
- **Cost:** touches canonical events, Host persistence and the session list; needs a data-model decision.

## Session pins have no OMP source

- **Where:** `packages/ui/src/sync/session-pins.ts`, `packages/ui/src/lib/sessionPins.ts` (deferred by task 23; not created)
- **Added:** 2026-10-27
- **Priority:** worth-doing
- **Problem:** upstream pins sessions through OpenCode session metadata. The fork has no pin flow, so task 23 deferred `session-pins` instead of faking the metadata.
- **Impact:** pinned sessions, pin ordering in the sidebar and the palette's pin actions stay fork-version-only; upstream changes in that path cannot be adopted.
- **Solution:** add Host-owned pin state (canonical session metadata or a Host store), expose it through the session API, then port the upstream pin store and UI.
- **Cost:** Host storage and contract change plus sidebar/palette consumers.

## Session restore rejects native usage with reasoningTokens

- **Where:** `packages/agent-service/src/worker/projection.ts` (`TokenUsageSchema.parse(message.usage)`), `packages/agent-contract/src/messages.ts` (`TokenUsageSchema`)
- **Added:** 2026-10-27
- **Priority:** fix-now
- **Problem:** After a reload, `GET /api/agent/v1/sessions/<id>/snapshot` answers 503 `SESSION_RESTORE_FAILED` and the UI shows "Session could not be loaded" even though the session file is intact. The worker bootstrap parses the native assistant usage with the canonical strict `TokenUsageSchema`, but OMP 18.8.9 writes `{ input, output, cacheRead, cacheWrite, totalTokens, reasoningTokens, cost }`; `reasoningTokens` is an unrecognized key, so the Zod parse throws and the worker reports `SESSION_RESTORE_FAILED`. Reproduced on the pre-refresh baseline `524a6b5351` with Bun 1.4.2 and on `4d69e299`/`3dc9b8a`, so it predates the refresh and is not caused by tasks 01, 02 or 23. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-23-2026-10-27/session-restore-worker-error.log` and `real-path-main524a-reload-error.png`.
- **Impact:** Every session whose provider reports reasoning tokens cannot be reopened after a page reload or Host restart, which blocks the W6 reload row for every UI task and hides transcripts the user can no longer view.
- **Solution:** Map the native usage fields into the canonical object in the projection adapter (dropping reasoning tokens if the contract does not expose them), or extend `TokenUsageSchema`/`TokenUsage` with an explicit optional reasoning field and thread it through. Add a fixture whose native usage includes `reasoningTokens` and assert snapshot restore succeeds.
- **Cost:** One adapter change plus a contract decision; small if the field is dropped, larger if reasoning tokens must be exposed to the UI.
