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
- **Explicit override**: If `PI_CODING_AGENT_DIR` is set in the environment, that directory is used directly.
- **Named profile**: If running with a named profile (`OMP_PROFILE=<profile>` or `PI_PROFILE=<profile>`), the agent directory is `<HOME>/.omp/profiles/<profile>/agent`.
- **Default fallback**: If neither variable is set, `<XDG_DATA_HOME>/omp` is used if present, otherwise `<HOME>/.omp/agent`.

When executing backup and restore procedures, operators using named profiles or custom directories must ensure `OMP_PROFILE`, `PI_PROFILE`, or `PI_CODING_AGENT_DIR` is set in the environment so commands resolve the intended directory.
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
   if [ ! -d "$DATA_DIR" ]; then
     echo "Error: Host data directory not found or not a directory: $DATA_DIR" >&2
     exit 1
   fi

   # Define concrete backup root (override with OPENCHAMBER_BACKUP_DIR or default to $HOME/openchamber-backups):
   BACKUP_ROOT="${OPENCHAMBER_BACKUP_DIR:-$HOME/openchamber-backups}"
   mkdir -p "$BACKUP_ROOT" || { echo "Error: Failed to create backup root directory: $BACKUP_ROOT" >&2; exit 1; }
   if [ ! -w "$BACKUP_ROOT" ]; then
     echo "Error: Backup root directory is not writable: $BACKUP_ROOT" >&2
     exit 1
   fi

   TIMESTAMP="$(date +%Y%m%d%H%M%S)"
   BACKUP_DEST="$BACKUP_ROOT/openchamber-host-$TIMESTAMP"
   mkdir -p "$BACKUP_DEST" || { echo "Error: Failed to create Host backup destination directory: $BACKUP_DEST" >&2; exit 1; }

   # Copy Host SQLite databases and sidecars
   cp -p "$DATA_DIR"/host-metadata.sqlite* "$BACKUP_DEST/" || { echo "Error: Failed to copy host-metadata database" >&2; exit 1; }
   cp -p "$DATA_DIR"/host-approval-policies.sqlite* "$BACKUP_DEST/" || { echo "Error: Failed to copy host-approval-policies database" >&2; exit 1; }

   # Copy attachments and settings
   [ -d "$DATA_DIR/attachments" ] && cp -rp "$DATA_DIR/attachments" "$BACKUP_DEST/"
   [ -d "$DATA_DIR/projects" ] && cp -rp "$DATA_DIR/projects" "$BACKUP_DEST/"
   [ -f "$DATA_DIR/settings.json" ] && cp -p "$DATA_DIR/settings.json" "$BACKUP_DEST/"
   [ -f "$DATA_DIR/message-queue.json" ] && cp -p "$DATA_DIR/message-queue.json" "$BACKUP_DEST/"
   ```

4. **Archive OMP session transcripts (content)**:
   ```bash
   # Resolve the active OMP directory:
   ACTIVE_PROFILE="${OMP_PROFILE:-$PI_PROFILE}"
   if [ -n "$PI_CODING_AGENT_DIR" ]; then
     OMP_DIR="$PI_CODING_AGENT_DIR"
   elif [ -n "$ACTIVE_PROFILE" ]; then
     OMP_DIR="$HOME/.omp/profiles/$ACTIVE_PROFILE/agent"
   elif [ -n "$XDG_DATA_HOME" ] && [ -d "$XDG_DATA_HOME/omp" ]; then
     OMP_DIR="$XDG_DATA_HOME/omp"
   else
     OMP_DIR="$HOME/.omp/agent"
   fi

   if [ ! -d "$OMP_DIR" ]; then
     echo "Error: OMP agent directory not found or not a directory: $OMP_DIR" >&2
     exit 1
   fi

   BACKUP_ROOT="${OPENCHAMBER_BACKUP_DIR:-$HOME/openchamber-backups}"
   OMP_BACKUP_DEST="$BACKUP_ROOT/omp-sessions-${TIMESTAMP:-$(date +%Y%m%d%H%M%S)}"
   mkdir -p "$OMP_BACKUP_DEST" || { echo "Error: Failed to create OMP backup destination directory: $OMP_BACKUP_DEST" >&2; exit 1; }
   if [ ! -w "$OMP_BACKUP_DEST" ]; then
     echo "Error: OMP backup directory is not writable: $OMP_BACKUP_DEST" >&2
     exit 1
   fi

   # Copy session transcripts
   if [ -d "$OMP_DIR/sessions" ]; then
     cp -rp "$OMP_DIR/sessions" "$OMP_BACKUP_DEST/" || { echo "Error: Failed to copy OMP sessions" >&2; exit 1; }
   fi
   ```

5. **Optional: Archive OMP credentials (secure storage only)**:
   ```bash
   # ONLY if backing up to secure, encrypted, single-user storage:
   if [ -f "$OMP_DIR/agent.db" ]; then
     SECURE_DEST="${OPENCHAMBER_SECURE_VAULT:-$HOME/.config/openchamber-vault}/omp-credentials"
     mkdir -p "$SECURE_DEST" || { echo "Error: Failed to create secure vault directory: $SECURE_DEST" >&2; exit 1; }
     if [ ! -w "$SECURE_DEST" ]; then
       echo "Error: Secure vault directory is not writable: $SECURE_DEST" >&2
       exit 1
     fi
     cp -p "$OMP_DIR"/agent.db* "$SECURE_DEST/" || { echo "Error: Failed to copy agent credentials to secure vault" >&2; exit 1; }
     chmod 600 "$SECURE_DEST"/agent.db*
   fi
   ```

---

## 4. Restore Procedure

1. **Ensure all OpenChamber and Agent Service processes are stopped** on the target machine.
2. **Prepare clean restore destination and restore Host data**:
   **IMPORTANT:** Never copy SQLite databases into a destination that contains stale `-wal` or `-shm` sidecar files from a previous run or different database instance. Merging a restored database with mismatched sidecars can corrupt the database upon recovery. If restoring into an existing data directory, remove any existing `*.sqlite*` files before copying:
   ```bash
   if [ -z "$BACKUP_DEST" ] || [ ! -d "$BACKUP_DEST" ]; then
     echo "Error: BACKUP_DEST is not set or not a valid directory (e.g. export BACKUP_DEST=\"$HOME/openchamber-backups/openchamber-host-<timestamp>\")" >&2
     exit 1
   fi

   RESTORE_DIR="${OPENCHAMBER_DATA_DIR:-$HOME/.config/openchamber}"
   mkdir -p "$RESTORE_DIR" || { echo "Error: Failed to create restore directory: $RESTORE_DIR" >&2; exit 1; }
   if [ ! -w "$RESTORE_DIR" ]; then
     echo "Error: Restore directory is not writable: $RESTORE_DIR" >&2
     exit 1
   fi
   chmod 700 "$RESTORE_DIR"

   # Remove any existing SQLite files and sidecars to prevent stale WAL merges
   rm -f "$RESTORE_DIR"/host-metadata.sqlite* "$RESTORE_DIR"/host-approval-policies.sqlite*

   cp -p "$BACKUP_DEST"/host-metadata.sqlite* "$RESTORE_DIR/" || { echo "Error: Failed to restore Host SQLite databases" >&2; exit 1; }
   cp -p "$BACKUP_DEST"/host-approval-policies.sqlite* "$RESTORE_DIR/" || { echo "Error: Failed to restore Host approval policies database" >&2; exit 1; }
   [ -d "$BACKUP_DEST/attachments" ] && cp -rp "$BACKUP_DEST/attachments" "$RESTORE_DIR/"
   [ -d "$BACKUP_DEST/projects" ] && cp -rp "$BACKUP_DEST/projects" "$RESTORE_DIR/"
   [ -f "$BACKUP_DEST/settings.json" ] && cp -p "$BACKUP_DEST/settings.json" "$RESTORE_DIR/"
   [ -f "$BACKUP_DEST/message-queue.json" ] && cp -p "$BACKUP_DEST/message-queue.json" "$RESTORE_DIR/"

   # Ensure tight permissions
   chmod 600 "$RESTORE_DIR"/*.sqlite* 2>/dev/null || true
   ```

3. **Restore OMP session transcripts**:
   ```bash
   if [ -z "$OMP_BACKUP_DEST" ] || [ ! -d "$OMP_BACKUP_DEST" ]; then
     echo "Error: OMP_BACKUP_DEST is not set or not a valid directory (e.g. export OMP_BACKUP_DEST=\"$HOME/openchamber-backups/omp-sessions-<timestamp>\")" >&2
     exit 1
   fi

   # Resolve the active OMP restore destination:
   ACTIVE_PROFILE="${OMP_PROFILE:-$PI_PROFILE}"
   if [ -n "$PI_CODING_AGENT_DIR" ]; then
     OMP_RESTORE_DIR="$PI_CODING_AGENT_DIR"
   elif [ -n "$ACTIVE_PROFILE" ]; then
     OMP_RESTORE_DIR="$HOME/.omp/profiles/$ACTIVE_PROFILE/agent"
   elif [ -n "$XDG_DATA_HOME" ] && [ -d "$XDG_DATA_HOME/omp" ]; then
     OMP_RESTORE_DIR="$XDG_DATA_HOME/omp"
   else
     OMP_RESTORE_DIR="$HOME/.omp/agent"
   fi
   mkdir -p "$OMP_RESTORE_DIR" || { echo "Error: Failed to create OMP restore directory: $OMP_RESTORE_DIR" >&2; exit 1; }
   if [ ! -w "$OMP_RESTORE_DIR" ]; then
     echo "Error: OMP restore directory is not writable: $OMP_RESTORE_DIR" >&2
     exit 1
   fi
   chmod 700 "$OMP_RESTORE_DIR"

   if [ -d "$OMP_BACKUP_DEST/sessions" ]; then
     cp -rp "$OMP_BACKUP_DEST/sessions" "$OMP_RESTORE_DIR/" || { echo "Error: Failed to restore OMP session transcripts" >&2; exit 1; }
   fi

   # If restoring credentials:
   if [ -n "$SECURE_DEST" ]; then
     if [ ! -d "$SECURE_DEST" ]; then
       echo "Error: SECURE_DEST is set but not a directory: $SECURE_DEST" >&2
       exit 1
     fi
     if [ -f "$SECURE_DEST/agent.db" ]; then
       cp -p "$SECURE_DEST"/agent.db* "$OMP_RESTORE_DIR/" || { echo "Error: Failed to restore credentials" >&2; exit 1; }
       chmod 600 "$OMP_RESTORE_DIR"/agent.db*
     fi
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
