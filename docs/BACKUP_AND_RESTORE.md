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
OpenChamber assigns each workspace a captured agent directory. The Host default is `$HOME/.omp/agent`: `packages/web/server/lib/host/agent-scope-runtime.js` builds `path.join(os.homedir(), '.omp', 'agent')` and does not consult `PI_CODING_AGENT_DIR` or XDG variables when forming that default. The Host passes the captured path to the agent service, which forces every worker's `PI_CODING_AGENT_DIR` to it.

Inside a worker, `openNativeRuntime` (`packages/agent-service/src/worker/native-runtime.ts`) applies this precedence:
1. **Named profile:** use `OMP_PROFILE` when it is defined, otherwise `PI_PROFILE`. An empty value or `default` selects no profile; an invalid name throws. When a profile resolves, `setProfile(profile)` selects `$HOME/.omp/profiles/<profile>/agent` in OMP's process-wide path resolver, and that resolver ignores the captured agent directory.
2. **Captured agent directory:** with no named profile, `setAgentDir(capturedAgentDirectory)` makes the Host-captured directory authoritative for OMP's resolver and sets `PI_CODING_AGENT_DIR` to it.

In both branches the worker passes the captured agent directory explicitly to settings, credential discovery, and default session-directory resolution. The Host-managed credential database is therefore `<captured agent directory>/agent.db`, and Host-managed session transcripts are under `<captured agent directory>/sessions`. For the default Host setup, the backup target described below is `$HOME/.omp/agent`.
- **`sessions/**/session.jsonl`**:
  - Canonical agent conversation transcripts and turn history in JSON Lines format.
- **`agent.db`**:
  - SQLite database used by OMP AuthStorage (`@oh-my-pi/pi-ai`) holding provider credentials, API keys, and OAuth tokens.

---

## 2. Security and Credential Separation

**CRITICAL:** `agent.db` is a credential-bearing database containing provider secrets, API keys, and OAuth tokens.

- **Never include `agent.db` in shareable or unencrypted backups.**
- If creating an archive for bug reporting, team migration, or non-secure transport, exclude `agent.db`.
- Standard session transcript backups must never contain `agent.db`. Credential backups require an explicitly specified, operator-controlled encrypted destination volume (`ENCRYPTED_CREDENTIALS_DEST`) or direct encryption pipeline (e.g. `gpg`).
- When restoring to a new machine or environment without `agent.db`, the Host and Agent Service start normally, and the operator or user can re-authenticate providers in Settings.
- File permissions for all SQLite files, sidecars, and `agent.db` must remain restricted to the owning user (`mode 0600`, directories `mode 0700`).

---

## 3. Consistent, WAL-Safe Backup Procedure

All Host SQLite databases operate in WAL (`Write-Ahead Logging`) mode (`PRAGMA journal_mode = WAL`). When active, uncommitted or recently committed transactions reside in the `-wal` file. Copying a live SQLite database with shell tools while processes are actively writing is unsafe because sequential file copies cannot guarantee a point-in-time coherent snapshot between the database file, WAL index, and WAL log frames.

A coherent snapshot requires either:
1. **Verifiable Full Quiescence (Offline Snapshot)**: Stopping all processes, verifying complete termination so all write locks and open descriptors are released, and copying the quiescent database and any present sidecars.
2. **SQLite-Level Atomic Snapshot**: Using SQLite's native atomic snapshot capability (`VACUUM INTO 'destination.sqlite'`) through `node:sqlite` or the SQLite API, which checkpoints all WAL state into a single consistent database file without stopping readers.

### Step-by-Step Verifiable Offline Backup

1. **Stop all running processes and verify full quiescence**:
   Signal all OpenChamber and Agent Service processes to stop, then verify that all processes have exited:
   ```bash
   # Terminate running Host and Agent Service processes
   pkill -TERM -f "openchamber" 2>/dev/null || true
   pkill -TERM -f "agent-service" 2>/dev/null || true

   # Wait and verify complete termination
   timeout_counter=0
   while pgrep -f "openchamber" >/dev/null || pgrep -f "agent-service" >/dev/null; do
     if [ "$timeout_counter" -ge 10 ]; then
       echo "Warning: Processes did not terminate cleanly after 10s; sending SIGKILL" >&2
       pkill -KILL -f "openchamber" 2>/dev/null || true
       pkill -KILL -f "agent-service" 2>/dev/null || true
       sleep 1
       break
     fi
     sleep 1
     timeout_counter=$((timeout_counter + 1))
   done

   # Verify no processes remain running
   if pgrep -f "openchamber" >/dev/null || pgrep -f "agent-service" >/dev/null; then
     echo "Error: Failed to stop OpenChamber processes; aborting backup to prevent incoherent state" >&2
     exit 1
   fi
   ```

2. **Verify / Checkpoint WAL sidecars**:
   When cleanly shut down, SQLite automatically checkpoints transactions into the main database. However, offline copying must preserve any remaining sidecar files (`-wal` and `-shm`) if present, copying each file explicitly without wildcard expansion.

3. **Archive Host Gateway data**:
   ```bash
   DATA_DIR="${OPENCHAMBER_DATA_DIR:-$HOME/.config/openchamber}"
   if [ ! -d "$DATA_DIR" ]; then
     echo "Error: Host data directory not found or not a directory: $DATA_DIR" >&2
     exit 1
   fi

   # Define concrete backup root (default to $HOME/openchamber-backups, override with OPENCHAMBER_BACKUP_DIR):
   BACKUP_ROOT="${OPENCHAMBER_BACKUP_DIR:-$HOME/openchamber-backups}"
   mkdir -p "$BACKUP_ROOT" || { echo "Error: Failed to create backup root directory: $BACKUP_ROOT" >&2; exit 1; }
   if [ ! -w "$BACKUP_ROOT" ]; then
     echo "Error: Backup root directory is not writable: $BACKUP_ROOT" >&2
     exit 1
   fi

   TIMESTAMP="$(date +%Y%m%d%H%M%S)"
   BACKUP_DEST="$BACKUP_ROOT/openchamber-host-$TIMESTAMP"
   mkdir -p "$BACKUP_DEST" || { echo "Error: Failed to create Host backup destination directory: $BACKUP_DEST" >&2; exit 1; }
   chmod 700 "$BACKUP_DEST"

   # Guard required Host databases and copy main files
   for db_file in "host-metadata.sqlite" "host-approval-policies.sqlite"; do
     src_db="$DATA_DIR/$db_file"
     if [ ! -f "$src_db" ]; then
       echo "Error: Required Host database not found: $src_db" >&2
       exit 1
     fi
     cp -p "$src_db" "$BACKUP_DEST/" || { echo "Error: Failed to copy database: $src_db" >&2; exit 1; }
     chmod 600 "$BACKUP_DEST/$db_file"

     # Copy present sidecar files explicitly (avoiding unmatched wildcards)
     for suffix in "-wal" "-shm"; do
       src_sidecar="$src_db$suffix"
       if [ -f "$src_sidecar" ]; then
         cp -p "$src_sidecar" "$BACKUP_DEST/" || { echo "Error: Failed to copy sidecar: $src_sidecar" >&2; exit 1; }
         chmod 600 "$BACKUP_DEST/$db_file$suffix"
       fi
     done
   done

   # Copy attachments, projects, settings, and legacy queue
   [ -d "$DATA_DIR/attachments" ] && cp -rp "$DATA_DIR/attachments" "$BACKUP_DEST/"
   [ -d "$DATA_DIR/projects" ] && cp -rp "$DATA_DIR/projects" "$BACKUP_DEST/"
   [ -f "$DATA_DIR/settings.json" ] && cp -p "$DATA_DIR/settings.json" "$BACKUP_DEST/"
   [ -f "$DATA_DIR/message-queue.json" ] && cp -p "$DATA_DIR/message-queue.json" "$BACKUP_DEST/"
   ```

4. **Archive OMP session transcripts (content)**:
   ```bash
   # Host-captured agent directory used for OpenChamber-managed sessions and credentials.
   # The current Host default is fixed; named OMP profiles do not relocate it.
   OMP_DIR="$HOME/.omp/agent"

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
   chmod 700 "$OMP_BACKUP_DEST"

   # Copy session transcripts
   if [ -d "$OMP_DIR/sessions" ]; then
     cp -rp "$OMP_DIR/sessions" "$OMP_BACKUP_DEST/" || { echo "Error: Failed to copy OMP sessions" >&2; exit 1; }
   fi
   ```

5. **Optional: Archive OMP credentials (secure encrypted storage only)**:
   Credentials in `agent.db` must NEVER be copied into standard or shared backups. An operator requiring credential backup MUST explicitly supply an encrypted destination directory:
   ```bash
   # Operator MUST explicitly set ENCRYPTED_CREDENTIALS_DEST (e.g. an encrypted filesystem mount)
   if [ -z "$ENCRYPTED_CREDENTIALS_DEST" ]; then
     echo "Notice: ENCRYPTED_CREDENTIALS_DEST is not set. Skipping credential backup."
     echo "        Provider credentials in agent.db remain on this machine only."
   else
     if [ ! -d "$ENCRYPTED_CREDENTIALS_DEST" ]; then
       echo "Error: ENCRYPTED_CREDENTIALS_DEST is set but not an existing directory: $ENCRYPTED_CREDENTIALS_DEST" >&2
       exit 1
     fi
     if [ ! -w "$ENCRYPTED_CREDENTIALS_DEST" ]; then
       echo "Error: ENCRYPTED_CREDENTIALS_DEST is not writable: $ENCRYPTED_CREDENTIALS_DEST" >&2
       exit 1
     fi

     # Enforce restrictive directory permissions on the encrypted destination
     chmod 700 "$ENCRYPTED_CREDENTIALS_DEST"

     if [ -f "$OMP_DIR/agent.db" ]; then
       cp -p "$OMP_DIR/agent.db" "$ENCRYPTED_CREDENTIALS_DEST/" || { echo "Error: Failed to copy agent.db" >&2; exit 1; }
       chmod 600 "$ENCRYPTED_CREDENTIALS_DEST/agent.db"

       for suffix in "-wal" "-shm"; do
         if [ -f "$OMP_DIR/agent.db$suffix" ]; then
           cp -p "$OMP_DIR/agent.db$suffix" "$ENCRYPTED_CREDENTIALS_DEST/" || { echo "Error: Failed to copy agent.db$suffix" >&2; exit 1; }
           chmod 600 "$ENCRYPTED_CREDENTIALS_DEST/agent.db$suffix"
         fi
       done
     else
       echo "Notice: agent.db does not exist in $OMP_DIR; no credentials to archive."
     fi
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

   # Restore required Host databases and any present sidecars
   for db_file in "host-metadata.sqlite" "host-approval-policies.sqlite"; do
     backup_db="$BACKUP_DEST/$db_file"
     if [ ! -f "$backup_db" ]; then
       echo "Error: Required database not found in backup: $backup_db" >&2
       exit 1
     fi
     cp -p "$backup_db" "$RESTORE_DIR/" || { echo "Error: Failed to restore $db_file" >&2; exit 1; }
     chmod 600 "$RESTORE_DIR/$db_file"

     for suffix in "-wal" "-shm"; do
       backup_sidecar="$backup_db$suffix"
       if [ -f "$backup_sidecar" ]; then
         cp -p "$backup_sidecar" "$RESTORE_DIR/" || { echo "Error: Failed to restore $db_file$suffix" >&2; exit 1; }
         chmod 600 "$RESTORE_DIR/$db_file$suffix"
       fi
     done
   done

   [ -d "$BACKUP_DEST/attachments" ] && cp -rp "$BACKUP_DEST/attachments" "$RESTORE_DIR/"
   [ -d "$BACKUP_DEST/projects" ] && cp -rp "$BACKUP_DEST/projects" "$RESTORE_DIR/"
   [ -f "$BACKUP_DEST/settings.json" ] && cp -p "$BACKUP_DEST/settings.json" "$RESTORE_DIR/"
   [ -f "$BACKUP_DEST/message-queue.json" ] && cp -p "$BACKUP_DEST/message-queue.json" "$RESTORE_DIR/"

   # Ensure tight permissions on all restored SQLite files
   chmod 600 "$RESTORE_DIR"/*.sqlite* 2>/dev/null || true
   ```

3. **Restore OMP session transcripts**:
   ```bash
   if [ -z "$OMP_BACKUP_DEST" ] || [ ! -d "$OMP_BACKUP_DEST" ]; then
     echo "Error: OMP_BACKUP_DEST is not set or not a valid directory (e.g. export OMP_BACKUP_DEST=\"$HOME/openchamber-backups/omp-sessions-<timestamp>\")" >&2
     exit 1
   fi

   # Host-captured agent directory used for OpenChamber-managed sessions and credentials.
   # The current Host default is fixed; named OMP profiles do not relocate it.
   OMP_RESTORE_DIR="$HOME/.omp/agent"
   mkdir -p "$OMP_RESTORE_DIR" || { echo "Error: Failed to create OMP restore directory: $OMP_RESTORE_DIR" >&2; exit 1; }
   if [ ! -w "$OMP_RESTORE_DIR" ]; then
     echo "Error: OMP restore directory is not writable: $OMP_RESTORE_DIR" >&2
     exit 1
   fi
   chmod 700 "$OMP_RESTORE_DIR"

   if [ -d "$OMP_BACKUP_DEST/sessions" ]; then
     cp -rp "$OMP_BACKUP_DEST/sessions" "$OMP_RESTORE_DIR/" || { echo "Error: Failed to restore OMP session transcripts" >&2; exit 1; }
   fi

   # If restoring credentials from secure encrypted vault:
   if [ -n "$ENCRYPTED_CREDENTIALS_SRC" ]; then
     if [ ! -d "$ENCRYPTED_CREDENTIALS_SRC" ]; then
       echo "Error: ENCRYPTED_CREDENTIALS_SRC is not a valid directory: $ENCRYPTED_CREDENTIALS_SRC" >&2
       exit 1
     fi
     if [ -f "$ENCRYPTED_CREDENTIALS_SRC/agent.db" ]; then
       cp -p "$ENCRYPTED_CREDENTIALS_SRC/agent.db" "$OMP_RESTORE_DIR/" || { echo "Error: Failed to restore agent.db" >&2; exit 1; }
       chmod 600 "$OMP_RESTORE_DIR/agent.db"

       for suffix in "-wal" "-shm"; do
         if [ -f "$ENCRYPTED_CREDENTIALS_SRC/agent.db$suffix" ]; then
           cp -p "$ENCRYPTED_CREDENTIALS_SRC/agent.db$suffix" "$OMP_RESTORE_DIR/" || { echo "Error: Failed to restore agent.db$suffix" >&2; exit 1; }
           chmod 600 "$OMP_RESTORE_DIR/agent.db$suffix"
         fi
       done
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
