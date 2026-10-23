import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import {
  openApprovalPolicyStore,
  ensureApprovalPolicySchema,
  ApprovalPolicySchemaTooNewError,
  CURRENT_APPROVAL_POLICY_SCHEMA_VERSION,
} from './approval-policy-store.js';

const roots = [];
const makeRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-policy-test-'));
  roots.push(root);
  return root;
};
afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop(), { recursive: true, force: true });
});
const posixTest = process.platform === 'win32' ? it.skip : it;
const mode = (file) => fs.statSync(file).mode & 0o777;

describe('approval policy database permissions and sidecars', () => {
  posixTest('creates private database and WAL sidecars under umask 022', () => {
    const parent = makeRoot();
    const root = path.join(parent, 'data');
    const previous = process.umask(0o022);
    let store;
    try {
      store = openApprovalPolicyStore({ dataDir: root });
      store.commit({
        scope: 'workspace',
        sessionId: 'sess-1',
        projectId: 'proj-1',
        workspaceId: 'ws-1',
        decision: 'deny',
        target: { toolName: 'bash', pattern: 'rm -rf *' },
      });
      const dbPath = path.join(root, 'host-approval-policies.sqlite');
      expect(mode(root)).toBe(0o700);
      expect(mode(dbPath)).toBe(0o600);
      for (const suffix of ['-wal', '-shm']) {
        if (fs.existsSync(`${dbPath}${suffix}`)) {
          expect(mode(`${dbPath}${suffix}`)).toBe(0o600);
        }
      }
    } finally {
      if (store) store.close();
      process.umask(previous);
    }
  });

  posixTest('tightens pre-existing database and sidecars without changing existing root mode', () => {
    const root = makeRoot();
    fs.chmodSync(root, 0o755);
    const filePath = path.join(root, 'host-approval-policies.sqlite');
    let seed = new DatabaseSync(filePath);
    try {
      seed.exec("PRAGMA journal_mode = WAL; CREATE TABLE records (id INTEGER PRIMARY KEY, value TEXT); INSERT INTO records(value) VALUES ('durable');");
      fs.chmodSync(filePath, 0o644);
      expect(fs.existsSync(`${filePath}-wal`)).toBe(true);
      expect(fs.existsSync(`${filePath}-shm`)).toBe(true);
      fs.chmodSync(`${filePath}-wal`, 0o644);
      fs.chmodSync(`${filePath}-shm`, 0o644);

      const store = openApprovalPolicyStore({ dataDir: root, databasePath: filePath });
      try {
        expect(mode(root)).toBe(0o755);
        expect(mode(filePath)).toBe(0o600);
        expect(mode(`${filePath}-wal`)).toBe(0o600);
        expect(mode(`${filePath}-shm`)).toBe(0o600);
      } finally {
        store.close();
      }
    } finally {
      seed.close();
    }
  });
});

describe('approval policy database schema versioning and migrations', () => {
  it('fresh database gets current schema version and creates table and indexes', () => {
    const root = makeRoot();
    const store = openApprovalPolicyStore({ dataDir: root });
    try {
      const dbPath = path.join(root, 'host-approval-policies.sqlite');
      expect(fs.existsSync(dbPath)).toBe(true);

      const db = new DatabaseSync(dbPath);
      try {
        const version = Number(db.prepare('PRAGMA user_version').get()?.user_version);
        expect(version).toBe(CURRENT_APPROVAL_POLICY_SCHEMA_VERSION);

        const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='approval_policies'").get();
        expect(table).toBeDefined();

        const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(r => r.name);
        expect(indexes).toContain('approval_policies_session');
        expect(indexes).toContain('approval_policies_workspace');
      } finally {
        db.close();
      }
    } finally {
      store.close();
    }
  });

  it('old-version fixture with legacy policies migrates once and preserves existing data', () => {
    const root = makeRoot();
    const filePath = path.join(root, 'host-approval-policies.sqlite');

    // Create legacy v0 database
    const seed = new DatabaseSync(filePath);
    seed.exec(`
      CREATE TABLE approval_policies (
        policy_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, session_id TEXT, root_session_id TEXT, project_id TEXT, workspace_id TEXT,
        scope TEXT NOT NULL, decision TEXT NOT NULL, tool_name TEXT NOT NULL, pattern TEXT NOT NULL,
        UNIQUE(scope, session_id, workspace_id, project_id, tool_name, pattern)
      );
      INSERT INTO approval_policies VALUES ('pol-1', 1, 'sess-1', 'root-1', 'proj-1', 'ws-1', 'session', 'allow', 'bash', 'npm test');
      PRAGMA user_version = 0;
    `);
    seed.close();

    const store = openApprovalPolicyStore({ dataDir: root });
    try {
      // Data in pre-existing table was preserved
      const listed = store.list({ sessionId: 'sess-1', projectId: 'proj-1', workspaceId: 'ws-1' });
      expect(listed.length).toBe(1);
      expect(listed[0].policyId).toBe('pol-1');
      expect(listed[0].decision).toBe('allow');
      expect(listed[0].target.toolName).toBe('bash');

      // Version bumped to current
      const db = new DatabaseSync(filePath);
      try {
        expect(Number(db.prepare('PRAGMA user_version').get()?.user_version)).toBe(CURRENT_APPROVAL_POLICY_SCHEMA_VERSION);
      } finally {
        db.close();
      }
    } finally {
      store.close();
    }
  });

  it('reopening an already-migrated database is idempotent', () => {
    const root = makeRoot();
    const first = openApprovalPolicyStore({ dataDir: root });
    first.commit({
      scope: 'workspace',
      sessionId: 'sess-1',
      projectId: 'proj-1',
      workspaceId: 'ws-1',
      decision: 'deny',
      target: { toolName: 'write', pattern: '*.secret' },
    });
    first.close();

    const second = openApprovalPolicyStore({ dataDir: root });
    try {
      const listed = second.list({ sessionId: 'sess-1', projectId: 'proj-1', workspaceId: 'ws-1' });
      expect(listed.length).toBe(1);
      expect(listed[0].decision).toBe('deny');
      expect(listed[0].target.pattern).toBe('*.secret');
    } finally {
      second.close();
    }
  });

  it('newer schema version is refused with an explicit error and no write', () => {
    const root = makeRoot();
    const filePath = path.join(root, 'host-approval-policies.sqlite');

    // Create a database with user_version higher than current
    const seed = new DatabaseSync(filePath);
    seed.exec(`
      PRAGMA user_version = 999;
      CREATE TABLE future_approval (id TEXT PRIMARY KEY, test TEXT);
      INSERT INTO future_approval VALUES ('f1', 'future');
    `);
    seed.close();

    expect(() => openApprovalPolicyStore({ dataDir: root })).toThrow(ApprovalPolicySchemaTooNewError);

    // Verify database was untouched: no approval_policies table created, user_version unchanged
    const verify = new DatabaseSync(filePath);
    try {
      expect(Number(verify.prepare('PRAGMA user_version').get()?.user_version)).toBe(999);
      expect(verify.prepare("SELECT test FROM future_approval WHERE id='f1'").get()?.test).toBe('future');
      const table = verify.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='approval_policies'").get();
      expect(table).toBeUndefined();
    } finally {
      verify.close();
    }
  });
});
