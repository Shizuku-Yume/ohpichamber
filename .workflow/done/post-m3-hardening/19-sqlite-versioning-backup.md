# 19: Version Host SQLite schemas and document backup

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 7cc282d08504afc88d1531b6ba527009de3b0794
**Reviewed functional commit:** ef4e7da3cb9d6441caa1857d7269e9dc6371cf14
**Final evidence receipt:** `/home/shizuku/Project/ohpichamber-omp-artifacts/task19-2026-10-23/receipt.json` records the final commit SHA, the exact current-commit and `7cc282d08504afc88d1531b6ba527009de3b0794` base-to-HEAD path manifests, gate logs, and independent review receipts. A commit cannot embed its own hash, so this record cites that stable artifact path; the receipt is updated after each metadata-only commit.
**Base-to-HEAD paths (`7cc282d08504afc88d1531b6ba527009de3b0794..final`):**
- `.workflow/done/post-m3-hardening/19-sqlite-versioning-backup.md`
- `.workflow/tasks/post-m3-hardening/19-sqlite-versioning-backup.md` (moved to `done/` by this task)
- `docs/BACKUP_AND_RESTORE.md`
- `packages/web/server/lib/host/approval-policy-store.js`
- `packages/web/server/lib/host/approval-policy-store.test.js`
- `packages/web/server/lib/host/backup-restore.test.js`
- `packages/web/server/lib/host/metadata-sqlite.js`
- `packages/web/server/lib/host/metadata-sqlite.test.js`
- `packages/web/server/lib/message-queue/sqlite-store.js`
**Started:** 2026-10-23T10:35:00Z
**Finished:** 2026-10-23T15:25:00Z

**Delivers:** Host SQLite stores carry a schema version with ordered migrations, refuse to open a newer schema, and have a documented backup and restore procedure that covers OMP data too.

**Blocked by:** None
**Files:** `packages/web/server/lib/host/metadata-sqlite.js` (44-120); the queue store and `approval-policy-store.js`; operator docs in `packages/docs` or `docs/`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``PlanGapAnalysis.md` finding 12; `.agents/skills/sync-state-invariants/SKILL.md`
**Covers:** H11

**Check:** Regressions: a fresh database gets the current `user_version`; an old-version fixture migrates once; a newer version is refused with an explicit error and no write. Then follow the documented backup and restore steps on a disposable `HOME` and confirm sessions, queue and metadata come back.

## Done when

- [x] Backup covers Host SQLite files, OMP `agent.db` and session JSONL locations without exposing credentials.
- [x] The leftover `message-queue.json` after conversion is documented (kept, renamed or removed) with its reason.

## Progress

Dirty at start: none

Implementation:
- Added ordered, versioned SQLite schema migrations (`user_version = 1`) to `packages/web/server/lib/host/metadata-sqlite.js` with `CURRENT_HOST_METADATA_VERSION = 1` and `ensureHostMetadataSchema(db)`.
- Added ordered, versioned SQLite schema migrations (`user_version = 1`) to `packages/web/server/lib/host/approval-policy-store.js` with `CURRENT_APPROVAL_POLICY_SCHEMA_VERSION = 1` and `ensureApprovalPolicySchema(db)`.
- Enforced strict refusal of newer schemas before writing: both stores read `PRAGMA user_version` and throw explicit typed errors (`MetadataSchemaTooNewError`, `ApprovalPolicySchemaTooNewError`) before any schema or data write.
- Preserved per-connection durability settings (`PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;` in metadata-sqlite, `PRAGMA journal_mode = WAL;` in approval-policy-store) on every accepted connection open, including reopened connections at current version.
- Inside transactions (`withTransaction` and `BEGIN IMMEDIATE`), re-checks `user_version` under lock so concurrent openers cannot re-execute already committed migrations.
- Centralized queue tables (`prompt_queue_owner`, `prompt_queue_item`, `prompt_queue_command`, `prompt_queue_conversion`) under the single shared Host metadata database schema, ensuring unified transaction boundaries without separate queue user_version.
- Created root operator documentation `docs/BACKUP_AND_RESTORE.md` covering:
  - Host Gateway data locations (`host-metadata.sqlite`, `host-approval-policies.sqlite`, `attachments/`, `settings.json`, `projects/`, `message-queue.json`, `message-search.sqlite`).
  - OMP Agent data locations (`sessions/**/session.jsonl`, `agent.db`).
  - Security and credential separation: `agent.db` contains provider secrets/keys/OAuth tokens and is strictly isolated from standard session transcript backups.
  - Consistent WAL-safe step-by-step backup procedure.
  - Step-by-step restore procedure requiring clean/empty target or explicit removal of existing sidecars to prevent stale WAL merges.
  - Legacy `message-queue.json` disposition: retained as immutable conversion source and safety net, skipped on subsequent starts via `prompt_queue_conversion` receipts, with manual operator cleanup guidance once verified.
- Added comprehensive automated regression tests:
  - `packages/web/server/lib/host/metadata-sqlite.test.js`: fresh database user_version, legacy migrations, reopening idempotency, newer schema version refusal without write.
  - `packages/web/server/lib/host/approval-policy-store.test.js`: fresh database schema version, legacy migrations, reopening idempotency, newer schema version refusal without write, umask 022 private sidecar creation, pre-existing sidecar tightening, and a concurrent/recreation regression (`recreates private sidecars across concurrent opens and reopen under umask 022`) that runs four child processes through repeated open/commit/close cycles and then reopens after deleting both sidecars, asserting the data directory is `0700` and main/WAL/SHM are `0600` throughout.
  - `packages/web/server/lib/host/backup-restore.test.js`: end-to-end disposable-HOME backup and restore verification using real public APIs (`getState(scope)` with revision, items, options, status assertions; `list(scope)`, `openHostMetadataDatabase`, OMP JSONL transcripts, and isolated `agent.db` credentials).
- Made approval policy SQLite permissions safe at creation, not just after the fact: `packages/web/server/lib/host/approval-policy-store.js` creates the main database and both sidecars with `O_CREAT` and mode `0600` before `node:sqlite` opens the database, then tightens pre-existing files with `chmod`. Because umask can only clear bits from the requested mode, a newly created inode can never be broader than `0600`; pre-creating `-wal`/`-shm` prevents SQLite from creating them before a post-open chmod. No process-global umask mutation is used.
- Documented the exact OMP agent directory precedence in `docs/BACKUP_AND_RESTORE.md`: the Host captures `path.join(os.homedir(), '.omp', 'agent')` (no `PI_CODING_AGENT_DIR`/XDG lookup), workers force `PI_CODING_AGENT_DIR` to it, and `openNativeRuntime` prefers a named `OMP_PROFILE`/`PI_PROFILE` via `setProfile` (selecting `$HOME/.omp/profiles/<profile>/agent`) or otherwise calls `setAgentDir(capturedAgentDirectory)`. Settings, credential discovery, and default session resolution keep the captured directory explicitly, so Host-managed sessions and `agent.db` remain under `$HOME/.omp/agent`.

### Final evidence and review

The stable artifact receipt `/home/shizuku/Project/ohpichamber-omp-artifacts/task19-2026-10-23/receipt.json` records the final commit SHA, the exact current-commit and base-to-HEAD path manifests, gate logs, and independent review receipts with their exact reviewed boundaries. A commit cannot embed its own hash, so this record cites that artifact path; the receipt is updated after each metadata-only commit.

`ef4e7da3cb9d6441caa1857d7269e9dc6371cf14` is the functional code/docs/test commit. Later commits only correct this task record and the operator documentation. The base-to-HEAD path manifest is recorded above. Review receipts are stored as `brief-a-receipt.json` and `brief-b-receipt.json` in the artifact directory, preserving prior reviewed-SHA receipts under distinct names; each receipt names the commit it reviewed so the archive, receipt, and review boundary can be checked together.

Check after:
- `bun run --cwd packages/web vitest run server/lib/host/metadata-sqlite.test.js server/lib/host/approval-policy-store.test.js server/lib/host/backup-restore.test.js`: 14 passed (14 tests across 3 files).
- `node --test packages/web/server/lib/message-queue/sqlite-store.test.js`: 4 passed (4 tests).
- Standalone disposable-HOME backup and restore smoke script: exit 0 (`disposable-home-smoke.log`).
- `bun run dead-code`: 0 findings (`dead-code.log`).
- `bun run lint`: exit 0 on all packages (`lint.log`).
- `bun run type-check`: exit 0 on all packages (`type-check.log`).
- `bun run docs:validate`: 672 pages, 56 links passed.
- `.workflow/bin/workflow validate --no-color`: exit 0, 120 task files valid.
- `bun run test`: 7/7 suites passed, exit 0 (`root-test-final.log`).
- `bun run --cwd packages/web test`: 377 passed | 9 skipped files (386), 6117 passed | 135 skipped tests (6252).
- Final metadata/docs commit: no implementation code changed after functional commit `ef4e7da3cb9d6441caa1857d7269e9dc6371cf14`; docs validation, workflow validation, and the disposable-HOME smoke were rerun for the final docs revision (`docs-validate-final.log`, `workflow-validate-final.log`, `disposable-home-smoke-final.log`).
- Evidence logs: `/home/shizuku/Project/ohpichamber-omp-artifacts/task19-2026-10-23/`.
