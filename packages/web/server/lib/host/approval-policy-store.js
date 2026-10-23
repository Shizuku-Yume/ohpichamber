import { createRequire } from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const require = createRequire(import.meta.url);
const loadDatabaseSync = () => {
  const { DatabaseSync } = process.getBuiltinModule?.('node:sqlite') ?? require('node:sqlite');
  return DatabaseSync;
};

// Create each SQLite file before the connection opens. O_CREAT with mode 0600
// means a new inode never exists with broader access: umask can only clear bits
// from the requested mode. The chmod tightens files left by an earlier release;
// it is not what protects a new file. Pre-creating the sidecars also stops
// SQLite from creating them itself before any post-open chmod can run. This uses
// no process-global umask mutation, so concurrent openers cannot race.
const ensurePrivateSqliteFile = (fsImpl, filePath) => {
  if (!fsImpl.existsSync(filePath)) fsImpl.closeSync(fsImpl.openSync(filePath, 'a', 0o600));
  fsImpl.chmodSync(filePath, 0o600);
};

const normalize = (value) => typeof value === 'string' && value.length > 0 ? value : null;
const validatePolicy = (policy) => {
  if (!policy || !['session', 'workspace'].includes(policy.scope) || (policy.scope === 'session' ? policy.decision !== 'allow' : policy.decision !== 'deny')) return null;
  const toolName = normalize(policy.target?.toolName);
  const pattern = normalize(policy.target?.pattern);
  if (!toolName || !pattern) return null;
  return { ...policy, target: { toolName, pattern } };
};

class ApprovalPolicyWriteError extends Error {
  constructor(message, cause) { super(message, cause ? { cause } : undefined); this.name = 'ApprovalPolicyWriteError'; this.code = 'APPROVAL_POLICY_WRITE_FAILED'; }
}

export class ApprovalPolicySchemaTooNewError extends ApprovalPolicyWriteError {
  constructor(message, cause) { super(message, cause); this.name = 'ApprovalPolicySchemaTooNewError'; this.code = 'APPROVAL_POLICY_SCHEMA_TOO_NEW'; }
}

export const CURRENT_APPROVAL_POLICY_SCHEMA_VERSION = 1;

const APPROVAL_POLICY_MIGRATIONS = [
  // Migration 1: baseline approval_policies table and indexes
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS approval_policies (
        policy_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, session_id TEXT, root_session_id TEXT, project_id TEXT, workspace_id TEXT,
        scope TEXT NOT NULL, decision TEXT NOT NULL, tool_name TEXT NOT NULL, pattern TEXT NOT NULL,
        UNIQUE(scope, session_id, workspace_id, project_id, tool_name, pattern)
      );
      CREATE INDEX IF NOT EXISTS approval_policies_session ON approval_policies(session_id);
      CREATE INDEX IF NOT EXISTS approval_policies_workspace ON approval_policies(workspace_id);
    `);
  },
];

export const ensureApprovalPolicySchema = (db) => {
  const versionRow = db.prepare('PRAGMA user_version').get();
  const currentVersion = Number(versionRow?.user_version ?? 0);
  if (currentVersion > CURRENT_APPROVAL_POLICY_SCHEMA_VERSION) {
    throw new ApprovalPolicySchemaTooNewError(
      `Approval policy database schema version ${currentVersion} is newer than supported version ${CURRENT_APPROVAL_POLICY_SCHEMA_VERSION}`
    );
  }
  db.exec('PRAGMA journal_mode = WAL;');
  if (currentVersion === CURRENT_APPROVAL_POLICY_SCHEMA_VERSION) {
    return currentVersion;
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    const lockedVersionRow = db.prepare('PRAGMA user_version').get();
    const lockedVersion = Number(lockedVersionRow?.user_version ?? 0);
    if (lockedVersion > CURRENT_APPROVAL_POLICY_SCHEMA_VERSION) {
      throw new ApprovalPolicySchemaTooNewError(
        `Approval policy database schema version ${lockedVersion} is newer than supported version ${CURRENT_APPROVAL_POLICY_SCHEMA_VERSION}`
      );
    }
    for (let v = lockedVersion; v < CURRENT_APPROVAL_POLICY_SCHEMA_VERSION; v++) {
      APPROVAL_POLICY_MIGRATIONS[v](db);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    }
    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    if (error instanceof ApprovalPolicyWriteError) throw error;
    throw new ApprovalPolicyWriteError('Could not migrate approval policy schema', error);
  }
  return CURRENT_APPROVAL_POLICY_SCHEMA_VERSION;
};

export const openApprovalPolicyStore = ({ dataDir, databasePath, fsImpl = fs, path: nodePath = path } = {}) => {
  const filePath = databasePath ?? nodePath.join(dataDir, 'host-approval-policies.sqlite');
  const directoryPath = nodePath.dirname(filePath);
  const sidecarPaths = [`${filePath}-wal`, `${filePath}-shm`];
  try {
    fsImpl.mkdirSync(directoryPath, { recursive: true, mode: 0o700 });
    ensurePrivateSqliteFile(fsImpl, filePath);
    // Pre-create both sidecars so SQLite reuses 0600 inodes instead of creating
    // its own. Concurrent openers may race on creation, but O_CREAT with 0600
    // means every winner's inode is already private.
    for (const sidecarPath of sidecarPaths) ensurePrivateSqliteFile(fsImpl, sidecarPath);
    const db = new (loadDatabaseSync())(filePath, { timeout: 5000 });
    try {
      ensureApprovalPolicySchema(db);
      for (const sidecarPath of sidecarPaths) {
        if (fsImpl.existsSync(sidecarPath)) fsImpl.chmodSync(sidecarPath, 0o600);
      }
    } catch (error) {
      try { db.close(); } catch {}
      throw error;
    }
    return {
      commit({ scope, sessionId, rootSessionId, projectId, workspaceId, decision, target }) {
        const policy = validatePolicy({ scope, decision, target });
        if (!policy || !normalize(workspaceId) || !normalize(projectId) || (scope === 'session' && !normalize(sessionId))) throw new ApprovalPolicyWriteError('Invalid approval policy');
        let revision;
        let policyId;
        try {
          db.exec('BEGIN IMMEDIATE');
          const revisionQuery = db.prepare('SELECT revision FROM approval_policies ORDER BY revision DESC LIMIT 1');
          revisionQuery.setReadBigInts(true);
          revision = (revisionQuery.get()?.revision ?? 0n) + 1n;
          const existing = db.prepare('SELECT policy_id FROM approval_policies WHERE scope=? AND session_id IS ? AND workspace_id=? AND project_id=? AND tool_name=? AND pattern=?').get(scope, scope === 'session' ? sessionId : null, workspaceId, projectId, target.toolName, target.pattern);
          policyId = existing?.policy_id ?? crypto.randomUUID();
          db.prepare(`INSERT INTO approval_policies(policy_id,revision,session_id,root_session_id,project_id,workspace_id,scope,decision,tool_name,pattern) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(policy_id) DO UPDATE SET revision=excluded.revision,decision=excluded.decision`).run(policyId, revision, scope === 'session' ? sessionId : null, rootSessionId ?? null, projectId, workspaceId, scope, decision, target.toolName, target.pattern);
          db.exec('COMMIT');
        } catch (error) {
          try { db.exec('ROLLBACK'); } catch {}
          throw new ApprovalPolicyWriteError('Could not write approval policy', error);
        }
        for (const sidecarPath of sidecarPaths) {
          try {
            if (fsImpl.existsSync(sidecarPath)) fsImpl.chmodSync(sidecarPath, 0o600);
          } catch { /* sidecar tightening is best-effort post-commit */ }
        }
        return { policyId, revision: String(revision), scope, decision, target: { toolName: target.toolName, pattern: target.pattern } };
      },
      list({ sessionId, projectId, workspaceId }) {
        if (!normalize(sessionId) || !normalize(projectId) || !normalize(workspaceId)) throw new ApprovalPolicyWriteError('Invalid approval policy scope');
        try {
          const query = db.prepare(`SELECT policy_id AS policyId, revision, scope, decision, tool_name AS toolName, pattern FROM approval_policies WHERE workspace_id=? AND project_id=? AND (scope='workspace' OR (scope='session' AND session_id=?)) ORDER BY revision ASC`);
          query.setReadBigInts(true);
          return query.all(workspaceId, projectId, sessionId).map((row) => ({ policyId: row.policyId, revision: String(row.revision), scope: row.scope, decision: row.decision, target: { toolName: row.toolName, pattern: row.pattern } }));
        } catch (error) { throw new ApprovalPolicyWriteError('Could not read approval policies', error); }
      },
      close() { db.close(); },
    };
  } catch (error) { if (error instanceof ApprovalPolicyWriteError) throw error; throw new ApprovalPolicyWriteError('Could not open approval policy store', error); }
};
