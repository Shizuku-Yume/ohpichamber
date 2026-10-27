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

## Archived sessions of a removed worktree are not listed

- **Where:** `packages/web/server/lib/host/agent-scope-runtime.js` (workspace catalog and `validateDirectoryPath`), `packages/web/server/lib/openchamber-sessions/routes.js` (archive/listing projection), `packages/ui/src/stores/useGlobalSessionsStore.ts` and `packages/ui/src/components/views/ArchiveView.tsx`; the Host worktree-archive endpoints and `packages/ui/src/lib/worktrees/worktreeArchive.ts`, `components/views/archive/{ArchivedWorktreeRow,useWorktreeArchiveActions}.tsx` are not created.
- **Added:** 2026-10-27
- **Priority:** fix-now
- **Problem:** Removing a worktree that has sessions archives the sessions first (the Host `session_archive` row and the OMP session file are kept, and the removal dialog says “archives 1 linked session”), but the Archive page shows “0 archived sessions” after a reload. Once the checkout path is gone, the Host workspace catalog cannot validate it, and `GET /api/agent/v1/sessions?workspaceId=<removed workspace>` returns `{errors:{<workspace>:"METADATA_READ_FAILED"}}` with no items; the global list therefore never projects `archivedAt` and the empty result is rendered as an authoritative empty archive. Reproduced on the landed tree (`39a60fd5b1`) and on the pre-refresh tree (`4d69e299e4`): pre-refresh is worse, because its removal runs the checkout first, so the archive request itself fails 500 `METADATA_READ_FAILED` and the session is left unarchived. The refresh fixed the archive write order, not the listing. No open task lands the Host worktree-archive endpoints: task 24's and 25's path lists contain no `packages/web/server` worktree/archive files, and tasks 01/22 are archived (22 adopted only session archive-store/session-archive). Lane 08 deferred the archive worktree rows to task 09, whose `worktreeArchive.ts` needs these endpoints.
- **Impact:** the removal promise is false in the UI: the session survives on disk but cannot be found, restored or deleted from the Archive page; any metadata read failure in discovery is indistinguishable from a genuinely empty archive, so an outage silently hides every archived session.
- **Solution:** add Host worktree-archive records/endpoints that keep archived sessions of removed checkouts resolvable (an archived-worktree scope projected into the session list, or an archive-store listing that does not require the checkout path), port the deferred `worktreeArchive` UI and archive worktree rows, and surface discovery errors (`METADATA_READ_FAILED` and any `errors` map) in the Archive page as an explicit error state with retry.
- **Acceptance:** after removing a worktree with sessions, the Archive page lists them after reload, and a metadata read failure renders an explicit error state, never “0 archived sessions”.
- **Cost:** Host workspace/archive store and contract change, a new API plus UI listing and error state, and tests on both the Host route and the Archive page.

## Session create cannot set a parent link

- **Where:** `packages/agent-contract/src/session.ts` (`SessionCreateRequestSchema`, line 86), `packages/agent-service/src/supervisor/host-authorization-protocol.ts` (`HostSessionBootstrapSchema`, line 17), `packages/web/server/lib/openchamber-sessions/routes.js` (`create`, line 98)
- **Added:** 2026-10-27
- **Priority:** worth-doing
- **Problem:** `RuntimeSession.parentSessionId` exists and archive restore already preserves it (task 01), but no create path can set it: the canonical create request is `{ projectId, workspaceId, options, metadata }` and the Host bootstrap is `WorkerBootstrapSchema` with no parent field. Only the Agent Service's own subagent tool writes a parent (`sessions/registry.ts:290-303`). Task 17's workflow agents therefore run as root sessions, unlike upstream's OpenCode child sessions, and a server-initiated fan-out cannot nest under the session that proposed it.
- **Impact:** workflow agents appear as ordinary sessions; the chat can only hide or group them from the run record (`agents[].sessionId`). Any future server-side fan-out (multi-run, dispatched audits) repeats the same workaround.
- **Solution:** add an optional `parentSessionId` to `SessionCreateRequestSchema` and `HostSessionBootstrapSchema`, validate it against the caller's authorized scope and the parent's workspace in the service, persist it on the runtime session and the journal, and let the session list expose the parent it already projects. Then task 17 can create workflow agents under the proposing session.
- **Cost:** a contract change across the Host, the Agent Service and both session lists, with archive/journal and scope-validation tests; needs a data-model decision on whether non-subagent children are allowed.
