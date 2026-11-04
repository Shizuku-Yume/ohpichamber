# Context Obligatory Messages

Messages explicitly pinned by the user are stored under
`session.metadata.openchamber.context_obligatory_messages` as `{ id, createdAt,
role }`. The UI uses a fresh-read metadata merge when pinning or unpinning.

The server runtime reads the newest completed `compaction` message through the
canonical Agent Service (`sessionService.history`), fetches every pinned message
by ID, keeps non-empty text, sorts them by the stored creation time, and sends
one synthetic user part through the session service. Missing individual
messages are skipped without discarding the remaining context. Ordinary idle
events perform no work and make no requests.

Project knowledge rides along with the pinned messages: compaction takes both
away and both are restored for the same reason, so they travel as one message —
two synthetic turns back to back would read as the agent being interrupted
twice. The delivered knowledge signature is cleared in the same patch that
writes the cursor, because the summary removed the block the signature
described (`../session-knowledge/DOCUMENTATION.md`).

After a successful send, the runtime merge-writes
`context_obligatory_last_compaction_message_id`. This cursor prevents a
replayed compaction event from reinjecting the same summary. The runtime is
owned by the OpenChamber web backend and therefore is not available to clients without the server.
