# Permission Auto-Accept Runtime

This module owns the authoritative Host-side per-session permission policy (`ask`, `safety`, `auto`) and the seam the Agent Service uses to have tool execution approvals answered without a card.

## Modes

- `ask`: every tool execution request waits for the user.
- `safety`: the Host safety net (`routingRuntime.evaluatePermission`, Jev) decides. Only an `accept` verdict answers the request; `hold`, a missing classifier, a timeout and any error leave the card on screen.
- `auto`: tool execution requests are approved immediately.

An explicit workspace or session deny always wins: it rejects at request time and is re-checked immediately before every programmatic approval, including after an asynchronous safety verdict.

## Which approvals participate

Only tool execution approvals. The Agent Service marks them with `permissionRequest: true`, set by the native ACP permission gate and by the native approval extension's shared `requestApproval` path (`approveBash`, `ui.approve`, an observed `ui.select`). Questions, plan review, unobserved `ui.select`, `confirm`/`input`/`askDialog`, native-grant re-authorization and provider/Host authorization never reach that path, so this module never answers them.

## State and persistence

The policy lives under the `permissionAutoAccept` settings key:

```json
{ "permissionAutoAccept": { "sessions": { "ses_root_1": "auto", "ses_root_2": "safety" }, "revision": 3 } }
```

Pre-modes `true`/`false` entries are converted on first read; `true` becomes `safety` when the old global safety net was on, otherwise `auto`. Writes are serialized and each one increments `revision`.

A new top-level session enrolls once, at creation, in the `permissionDefaultMode` setting (default `ask`); a mode the creating flow already set wins. Subagents inherit the nearest explicit ancestor mode through `parentSessionId` lineage. A failed lineage lookup is unknown lineage: it writes nothing and does not cache a root, so a transient error cannot stop inheritance.

`GET /api/permission-auto-accept` returns `{ sessions, modes, revision }`, where `sessions` is the boolean compatibility map (`isAutoAnsweringMode`) and `modes` the typed modes.

`PUT /api/permission-auto-accept/sessions/:sessionId` takes `{ mode, directory? }` or, from pre-modes clients, `{ enabled }`. It persists the write, broadcasts `openchamber:permission-auto-accept.updated` with the snapshot, and pushes the new mode to the Agent Service at `POST /internal/sessions/:sessionId/permission-mode` so approvals already waiting are reconsidered. An invalid mode is a 400.

Events published by this module:

- `openchamber:permission-auto-accept.updated` — `{ sessions, modes, revision }`.
- `openchamber:permission-auto-accept.left-for-user` — `{ permissionId, sessionId, directory }`, emitted once per held safety request so the UI can explain why a card appeared.

## Supervisor seam (`host-channel.js`)

The supervisor is constructed before this runtime and is built elsewhere, so it cannot import it. `host-channel.js` carries the registration instead:

- `registerHostPermissionRuntime(runtime)` — called from `index.js` right after construction.
- `resolveHostPermissionMode(sessionId)` — the mode this session's lineage resolves to.
- `evaluateHostPermission(approval)` — the safety verdict for one request.

Before registration and on any thrown error every answer fails closed: `mode: 'ask'`, `verdict: 'unavailable'` / no verdict. Nothing is ever accepted without a live policy runtime.
