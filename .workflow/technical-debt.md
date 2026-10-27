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

## Terminal shutdown test races its own SIGTERM record

- **Where:** `packages/web/server/lib/terminal/shutdown.test.js` ("escalates a noncooperative workload only after the shared deadline"), `packages/web/server/lib/terminal/shutdown.js`
- **Added:** 2026-10-27
- **Priority:** worth-doing
- **Problem:** the test gives a SIGTERM-ignoring child a 350 ms grace while shutdown polls `/proc` in 250 ms steps before SIGKILL. Only about 100 ms is left for the child to be scheduled and append its synchronous `SIGTERM` record, so under machine load the SIGKILL wins and `assert.deepEqual(events, ['ready','SIGTERM'])` fails while the deadline assertion still passes. Reproduced on the pre-refresh tree: at `4d69e299e4` the web suite failed 1 of 3 clean runs with exactly this assertion; at `ce1ba86ffa` the same three-run sample was green, but the root suite flaked on it twice under load, and it passes repeatedly in isolation. `shutdown.js` and its test are unchanged between those commits, so this is a pre-existing timing race, not a refresh regression.
- **Impact:** an unattended `bun run test` can fail on this test alone, hiding real failures and blocking a gate that would otherwise be green.
- **Solution:** make the test wait for the recorded SIGTERM with its own bounded deadline (poll the events file for up to a second) before asserting, or raise the fixture's grace to at least 1000 ms so the 250 ms polling has slack. Keep the production grace and escalation semantics.
- **Cost:** test-only change; no production behavior.

