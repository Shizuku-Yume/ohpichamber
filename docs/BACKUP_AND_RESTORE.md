# Host and Agent Backup and Restore Guide

This guide describes the operator procedure for backing up and restoring OpenChamber Host state and Oh-My-Pi (OMP) agent state, including SQLite databases, attachments, session transcripts, and credentials.

---

## 1. Data Inventory and File Locations

OpenChamber state is divided between the **Host Gateway data directory** and the **OMP Agent directory**.

### Host Gateway Data Directory
Default location: `~/.config/openchamber` (or the directory specified by `OPENCHAMBER_DATA_DIR`).

- **`host-metadata.sqlite`** (plus `-wal` and `-shm` sidecars):
  - Schema: Managed by `packages/web/server/lib/host/metadata-sqlite.js` with `PRAGMA user_version = 1`.
  - Contents: Project registrations, workspace bindings, session operational metadata, folder hierarchies, attachment metadata, direct command claims, and durable prompt queues (`prompt_queue_*` tables).
- **`host-approval-policies.sqlite`** (plus `-wal` and `-shm` sidecars):
  - Schema: Managed by `packages/web/server/lib/host/approval-policy-store.js` with `PRAGMA user_version = 1`.
  - Contents: Persistent tool approval allow and deny decisions.
- **`attachments/`**:
  - Binary storage for uploaded prompt attachments referenced by `host_attachments` records.
- **`settings.json`**, **`projects/`**:
  - Four-tier user and workspace settings, project configurations, and personal worktree references.
- **`message-queue.json`** (legacy):
  - Retained immutable conversion source (see [Legacy Queue JSON Disposition](#5-legacy-message-queuejson-disposition)).
- **`message-search.sqlite`** (derived):
  - Full-text search index (FTS5). This database is strictly derived from session events and is automatically rebuilt if absent; it does not need to be preserved in backups.

### OMP Agent Directory
The OMP agent directory contains conversation transcripts and provider credentials. Its location is resolved as follows:
- **Explicit override**: If `PI_CODING_AGENT_DIR` is set in the environment, that directory is used.
- **Named profile**: If running with a named profile (`PI_PROFILE=<profile>`), the directory is `<HOME>/.omp/profiles/<profile>/agent`.
- **Default fallback**: If neither variable is set, `<XDG_DATA_HOME>/omp` is used if present, otherwise `<HOME>/.omp/agent`.

When executing backup and restore procedures, operators using named profiles or non-default directories must set `PI_CODING_AGENT_DIR` (or `PI_PROFILE`) explicitly in the environment so commands resolve the intended directory.
- **`sessions/**/session.jsonl`**:
  - Canonical agent conversation transcripts and turn history in JSON Lines format.
- **`agent.db`**:
  - SQLite database used by OMP AuthStorage (`@oh-my-pi/pi-ai`) holding provider credentials, API keys, and OAuth tokens.

---

## 2. Security and Credential Separation

**CRITICAL:** `agent.db` is a credential-bearing database containing provider secrets, API keys, and OAuth tokens.

- **Never include `agent.db` in shareable or unencrypted backups.**
- If creating an archive for bug reporting, team migration, or non-secure transport, exclude `agent.db`.
- When restoring to a new machine or environment without `agent.db`, the Host and Agent Service will start normally, and the user can re-authenticate providers in Settings.
- File permissions for all SQLite files, sidecars, and `agent.db` must remain restricted to the owning user (`mode 0600`, directories `mode 0700`).

---

## 3. Consistent, WAL-Safe Backup Procedure

All Host SQLite databases operate in WAL (`Write-Ahead Logging`) mode (`PRAGMA journal_mode = WAL`). When active, uncommitted or recently committed transactions reside in the `-wal` file. Copying a live SQLite database while processes are actively writing can produce a corrupt or inconsistent backup.

### Step-by-Step Backup

1. **Stop all running processes**:
   Stop the OpenChamber server, Electron desktop shell, the Bun Agent Service, and any spawned worker processes. Verify no process holds open file descriptors on the data directory.
   ```bash
   # Ensure all OpenChamber and Agent Service processes are stopped
   pkill -f "openchamber" || true
   pkill -f "agent-service" || true
   ```

2. **Verify / Checkpoint WAL sidecars (if offline copying)**:
   When cleanly shut down, SQLite automatically checkpoints and flushes transactions. However, always preserve the sidecar files if they exist:
   - For `host-metadata.sqlite`, include `host-metadata.sqlite`, `host-metadata.sqlite-wal`, and `host-metadata.sqlite-shm`.
   - For `host-approval-policies.sqlite`, include `host-approval-policies.sqlite`, `host-approval-policies.sqlite-wal`, and `host-approval-policies.sqlite-shm`.

3. **Archive Host Gateway data**:
   ```bash
   DATA_DIR="${OPENCHAMBER_DATA_DIR:-$HOME/.config/openchamber}"
   BACKUP_DEST="/path/to/backup/openchamber-host-$(date +%Y%m%d%H%M%S)"
   mkdir -p "$BACKUP_DEST"

   # Copy Host SQLite databases and sidecars
   cp -p "$DATA_DIR"/host-metadata.sqlite* "$BACKUP_DEST/"
   cp -p "$DATA_DIR"/host-approval-policies.sqlite* "$BACKUP_DEST/"

   # Copy attachments and settings
   [ -d "$DATA_DIR/attachments" ] && cp -rp "$DATA_DIR/attachments" "$BACKUP_DEST/"
   [ -d "$DATA_DIR/projects" ] && cp -rp "$DATA_DIR/projects" "$BACKUP_DEST/"
   [ -f "$DATA_DIR/settings.json" ] && cp -p "$DATA_DIR/settings.json" "$BACKUP_DEST/"
   [ -f "$DATA_DIR/message-queue.json" ] && cp -p "$DATA_DIR/message-queue.json" "$BACKUP_DEST/"
   ```

4. **Archive OMP session transcripts (content)**:
   ```bash
   # Resolve the active OMP directory:
   if [ -n "$PI_CODING_AGENT_DIR" ]; then
     OMP_DIR="$PI_CODING_AGENT_DIR"
   elif [ -n "$PI_PROFILE" ]; then
     OMP_DIR="$HOME/.omp/profiles/$PI_PROFILE/agent"
   elif [ -n "$XDG_DATA_HOME" ] && [ -d "$XDG_DATA_HOME/omp" ]; then
     OMP_DIR="$XDG_DATA_HOME/omp"
   else
     OMP_DIR="$HOME/.omp/agent"
   fi
   OMP_BACKUP_DEST="/path/to/backup/omp-sessions-$(date +%Y%m%d%H%M%S)"
   mkdir -p "$OMP_BACKUP_DEST"

   # Copy session transcripts
   if [ -d "$OMP_DIR/sessions" ]; then
     cp -rp "$OMP_DIR/sessions" "$OMP_BACKUP_DEST/"
   fi
   ```

5. **Optional: Archive OMP credentials (secure storage only)**:
   ```bash
   # ONLY if backing up to secure, encrypted, single-user storage:
   if [ -f "$OMP_DIR/agent.db" ]; then
     SECURE_DEST="/path/to/secure-vault/omp-credentials"
     mkdir -p "$SECURE_DEST"
     cp -p "$OMP_DIR/agent.db"* "$SECURE_DEST/"
     chmod 600 "$SECURE_DEST"/agent.db*
   fi
   ```

---

## 4. Restore Procedure

1. **Ensure all OpenChamber and Agent Service processes are stopped** on the target machine.
2. **Prepare clean restore destination and restore Host data**:
   **IMPORTANT:** Never copy SQLite databases into a destination that contains stale `-wal` or `-shm` sidecar files from a previous run or different database instance. Merging a restored database with mismatched sidecars can corrupt the database upon recovery. If restoring into an existing data directory, remove any existing `*.sqlite*` files before copying:
   ```bash
   RESTORE_DIR="${OPENCHAMBER_DATA_DIR:-$HOME/.config/openchamber}"
   mkdir -p "$RESTORE_DIR"
   chmod 700 "$RESTORE_DIR"

   # Remove any existing SQLite files and sidecars to prevent stale WAL merges
   rm -f "$RESTORE_DIR"/host-metadata.sqlite* "$RESTORE_DIR"/host-approval-policies.sqlite*

   cp -p "$BACKUP_DEST"/host-metadata.sqlite* "$RESTORE_DIR/"
   cp -p "$BACKUP_DEST"/host-approval-policies.sqlite* "$RESTORE_DIR/"
   [ -d "$BACKUP_DEST/attachments" ] && cp -rp "$BACKUP_DEST/attachments" "$RESTORE_DIR/"
   [ -d "$BACKUP_DEST/projects" ] && cp -rp "$BACKUP_DEST/projects" "$RESTORE_DIR/"
   [ -f "$BACKUP_DEST/settings.json" ] && cp -p "$BACKUP_DEST/settings.json" "$RESTORE_DIR/"
   [ -f "$BACKUP_DEST/message-queue.json" ] && cp -p "$BACKUP_DEST/message-queue.json" "$RESTORE_DIR/"

   # Ensure tight permissions
   chmod 600 "$RESTORE_DIR"/*.sqlite* 2>/dev/null || true
   ```

3. **Restore OMP session transcripts**:
   ```bash
   # Resolve the active OMP restore destination:
   if [ -n "$PI_CODING_AGENT_DIR" ]; then
     OMP_RESTORE_DIR="$PI_CODING_AGENT_DIR"
   elif [ -n "$PI_PROFILE" ]; then
     OMP_RESTORE_DIR="$HOME/.omp/profiles/$PI_PROFILE/agent"
   elif [ -n "$XDG_DATA_HOME" ] && [ -d "$XDG_DATA_HOME/omp" ]; then
     OMP_RESTORE_DIR="$XDG_DATA_HOME/omp"
   else
     OMP_RESTORE_DIR="$HOME/.omp/agent"
   fi
   chmod 700 "$OMP_RESTORE_DIR"

   if [ -d "$OMP_BACKUP_DEST/sessions" ]; then
     cp -rp "$OMP_BACKUP_DEST/sessions" "$OMP_RESTORE_DIR/"
   fi

   # If restoring credentials:
   if [ -f "$SECURE_DEST/agent.db" ]; then
     cp -p "$SECURE_DEST"/agent.db* "$OMP_RESTORE_DIR/"
     chmod 600 "$OMP_RESTORE_DIR"/agent.db*
   fi
   ```

4. **Start OpenChamber**:
   - `openHostMetadataDatabase` checks `PRAGMA user_version`. If the database came from an older version, ordered migrations are executed within an atomic transaction.
   - If the database was created by a newer version than this build supports, startup refuses to open it with an explicit `METADATA_SCHEMA_TOO_NEW` error and makes no schema or data writes.
   - `openApprovalPolicyStore` performs the identical check with `APPROVAL_POLICY_SCHEMA_TOO_NEW`.

---

## 5. Legacy `message-queue.json` Disposition

When upgrading an existing installation, the Host Gateway converts legacy prompts in `message-queue.json` into the `prompt_queue_*` tables in `host-metadata.sqlite`.

- **Why it is kept**: The original `message-queue.json` is retained unmodified as an immutable historical record and fallback safety net.
- **No duplicate replay**: For each converted session, an entry is written into the `prompt_queue_conversion` table in `host-metadata.sqlite`. On subsequent restarts, `convertLegacy` skips sessions that already have conversion receipts.
- **Manual cleanup**: Once the operator confirms that active queues appear correctly in the UI, `message-queue.json` may be manually archived or deleted.
