import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { openHostMetadataDatabase, CURRENT_HOST_METADATA_VERSION } from './metadata-sqlite.js';
import { openApprovalPolicyStore, CURRENT_APPROVAL_POLICY_SCHEMA_VERSION } from './approval-policy-store.js';
import { createPromptQueueStore } from '../message-queue/sqlite-store.js';

const roots = [];
const makeDir = (prefix) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(dir);
  return dir;
};
const posixTest = process.platform === 'win32' ? it.skip : it;
const restoreFileNames = [
  'host-metadata.sqlite', 'host-metadata.sqlite-wal', 'host-metadata.sqlite-shm',
  'host-approval-policies.sqlite', 'host-approval-policies.sqlite-wal', 'host-approval-policies.sqlite-shm',
];

const documentedRestoreStaging = () => {
  const docs = fs.readFileSync(new URL('../../../../../docs/BACKUP_AND_RESTORE.md', import.meta.url), 'utf8');
  const startMarker = '   # Stage both required databases';
  const endMarker = '   rm -rf "$STAGE_DIR" "$ROLLBACK_DIR" || { echo "Error: Failed to remove restore staging directories" >&2; exit 1; }';
  const start = docs.indexOf(startMarker);
  const end = docs.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Documented restore staging block was not found');
  return docs.slice(start, end + endMarker.length)
    .split('\n')
    .map((line) => line.startsWith('   ') ? line.slice(3) : line)
    .join('\n');
};

const writeFileSet = (dir, files) => {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
};
const snapshotFiles = (dir) => Object.fromEntries(restoreFileNames.map((name) => {
  const file = path.join(dir, name);
  const stats = fs.lstatSync(file, { throwIfNoEntry: false });
  if (!stats) return [name, null];
  if (stats.isSymbolicLink()) return [name, { kind: 'symlink', target: fs.readlinkSync(file) }];
  if (!stats.isFile()) return [name, { kind: 'directory' }];
  return [name, { content: fs.readFileSync(file, 'utf8'), mode: stats.mode & 0o777 }];
}));
const makeFailingBin = (root) => {
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(bin, 'cp'), [
    '#!/bin/sh',
    'if [ -n "${FAIL_CP_BASENAME:-}" ]; then',
    '  for arg in "$@"; do',
    '    case "$arg" in *"/${FAIL_CP_BASENAME}") exit 1 ;; esac',
    '  done',
    'fi',
    'exec /bin/cp "$@"',
    '',
  ].join('\n'), { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'chmod'), [
    '#!/bin/sh',
    'if [ -n "${FAIL_CHMOD_BASENAME:-}" ]; then',
    '  for arg in "$@"; do',
    '    case "$arg" in *".host-restore-stage"*"/${FAIL_CHMOD_BASENAME}") exit 1 ;; esac',
    '  done',
    'fi',
    'if [ -n "${FAIL_CHMOD_DIR_MATCH:-}" ]; then',
    '  for arg in "$@"; do',
    '    case "$arg" in *"${FAIL_CHMOD_DIR_MATCH}"*) exit 1 ;; esac',
    '  done',
    'fi',
    'exec /bin/chmod "$@"',
    '',
  ].join('\n'), { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'mv'), [
    '#!/bin/sh',
    'source_arg=""',
    'for arg in "$@"; do',
    '  case "$arg" in -*) ;; *) source_arg="$arg"; break ;; esac',
    'done',
    'if [ -n "${FAIL_MV_BASENAME:-}" ]; then',
    '  case "$source_arg" in *".host-restore-stage"*"/${FAIL_MV_BASENAME}") exit 1 ;; esac',
    'fi',
    'if [ -n "${FAIL_MV_SOURCE:-}" ]; then',
    '  case "$source_arg" in "$FAIL_MV_SOURCE") exit 1 ;; esac',
    'fi',
    'if [ -n "${FAIL_MV_ROLLBACK_BASENAME:-}" ]; then',
    '  case "$source_arg" in *".host-restore-rollback"*"/${FAIL_MV_ROLLBACK_BASENAME}") exit 1 ;; esac',
    'fi',
    'exec /bin/mv "$@"',
    '',
  ].join('\n'), { mode: 0o755 });
  return bin;
};
const runDocumentedRestore = ({ root, backupDir, restoreDir, failureEnv = {} }) => {
  const bin = makeFailingBin(root);
  return spawnSync('bash', ['-c', `set -u\n${documentedRestoreStaging()}\n`], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, BACKUP_DEST: backupDir, RESTORE_DIR: restoreDir, ...failureEnv },
    encoding: 'utf8',
  });
};


afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

describe('Host and Agent backup and restore verification', () => {
  it('restores Host metadata, prompt queue, approval policies, and OMP transcripts on disposable HOME', async () => {
    // 1. Setup disposable source home
    const sourceHome = makeDir('backup-source-home-');
    const sourceDataDir = path.join(sourceHome, '.config', 'ohpichamber');
    const sourceOmpDir = path.join(sourceHome, '.omp', 'agent');
    fs.mkdirSync(sourceDataDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(sourceOmpDir, { recursive: true, mode: 0o700 });

    const scope = {
      sessionId: 'sess-exercise-1',
      projectId: 'proj-exercise-1',
      workspaceId: 'ws-exercise-1',
    };

    // 2. Populate source Host metadata database and prompt queue
    const metaDbInfo = openHostMetadataDatabase({ dataDir: sourceDataDir });
    metaDbInfo.db.prepare(
      'INSERT INTO session_metadata (session_id, revision, payload) VALUES (?, ?, ?)'
    ).run(scope.sessionId, 1, JSON.stringify({ title: 'Backup Test Session', customTag: 'verified' }));
    metaDbInfo.db.prepare(
      'INSERT INTO host_agent_projects (project_id, host_project_id, directory, name) VALUES (?, ?, ?, ?)'
    ).run(scope.projectId, 'host-proj-1', '/path/to/project', 'Test Project');
    metaDbInfo.db.prepare(
      'INSERT INTO host_agent_workspaces (workspace_id, project_id, cwd, agent_directory_id) VALUES (?, ?, ?, ?)'
    ).run(scope.workspaceId, scope.projectId, '/path/to/project', 'agent-dir-1');

    // Use prompt queue store on source
    const queueStore = createPromptQueueStore({ dataDir: sourceDataDir, database: metaDbInfo.db, closeDatabase: false });
    const commandId = crypto.randomUUID();
    const promptRequest = {
      input: {
        text: 'Hello from queued message',
        attachments: [],
        context: [],
      },
      options: {
        providerId: 'provider-1',
        modelId: 'model-1',
        agentId: null,
        variant: 'variant-1',
        reasoningEffort: 'high',
      },
    };
    const appendResult = await queueStore.append(scope, commandId, {
      expectedRevision: '0',
      content: 'Hello from queued message',
      request: promptRequest,
    });
    expect(appendResult.items.length).toBe(1);

    // Save attachment file and metadata
    const attachmentsDir = path.join(sourceDataDir, 'attachments');
    fs.mkdirSync(attachmentsDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(attachmentsDir, 'attachment-1.bin'), Buffer.from('attachment binary data'));
    metaDbInfo.db.prepare(
      'INSERT INTO host_attachments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('att-1', scope.projectId, scope.workspaceId, 'agent-dir-1', 'test.bin', 'application/octet-stream', 22, 'attachment-1.bin', Date.now());

    // Legacy queue JSON file
    fs.writeFileSync(path.join(sourceDataDir, 'message-queue.json'), JSON.stringify({ legacy: true, notes: 'preserved' }));

    // Settings file
    fs.writeFileSync(path.join(sourceDataDir, 'settings.json'), JSON.stringify({ theme: 'dark', customSetting: true }));

    // Close metadata DB to simulate offline backup
    metaDbInfo.db.close();

    // 3. Populate source Approval Policies
    const approvalStore = openApprovalPolicyStore({ dataDir: sourceDataDir });
    approvalStore.commit({
      scope: 'workspace',
      sessionId: scope.sessionId,
      projectId: scope.projectId,
      workspaceId: scope.workspaceId,
      decision: 'deny',
      target: { toolName: 'bash', pattern: 'rm -rf *' },
    });
    approvalStore.commit({
      scope: 'session',
      sessionId: scope.sessionId,
      projectId: scope.projectId,
      workspaceId: scope.workspaceId,
      decision: 'allow',
      target: { toolName: 'read', pattern: '*.json' },
    });
    approvalStore.close();

    // 4. Populate source OMP agent data
    const sessionDir = path.join(sourceOmpDir, 'sessions', scope.sessionId);
    fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });
    const jsonlContent = [
      JSON.stringify({ type: 'session_start', id: scope.sessionId, timestamp: 1700000000000 }),
      JSON.stringify({ type: 'turn', id: 'turn-1', role: 'user', content: [{ type: 'text', text: 'Initialize project' }] }),
      JSON.stringify({ type: 'turn', id: 'turn-2', role: 'assistant', content: [{ type: 'text', text: 'Project initialized.' }] }),
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(sessionDir, 'session.jsonl'), jsonlContent);

    // Populate source OMP credentials in agent.db
    const agentDbPath = path.join(sourceOmpDir, 'agent.db');
    const agentDb = new DatabaseSync(agentDbPath);
    agentDb.exec(`
      CREATE TABLE credentials (provider_id TEXT PRIMARY KEY, token TEXT);
      INSERT INTO credentials VALUES ('provider-1', 'secret-token-xyz');
    `);
    agentDb.close();

    // 5. Execute documented backup procedure into backup directories
    const backupDir = makeDir('backup-dest-');
    const hostBackupDir = path.join(backupDir, 'host');
    const ompBackupDir = path.join(backupDir, 'omp-sessions');
    const encryptedVaultDir = makeDir('encrypted-vault-');
    fs.mkdirSync(hostBackupDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(ompBackupDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(encryptedVaultDir, 0o700);

    // Host guarded backup
    for (const dbName of ['host-metadata.sqlite', 'host-approval-policies.sqlite']) {
      const srcDb = path.join(sourceDataDir, dbName);
      expect(fs.existsSync(srcDb)).toBe(true);
      fs.copyFileSync(srcDb, path.join(hostBackupDir, dbName));
      fs.chmodSync(path.join(hostBackupDir, dbName), 0o600);
      for (const suffix of ['-wal', '-shm']) {
        const sidecar = `${srcDb}${suffix}`;
        if (fs.existsSync(sidecar)) {
          fs.copyFileSync(sidecar, path.join(hostBackupDir, `${dbName}${suffix}`));
          fs.chmodSync(path.join(hostBackupDir, `${dbName}${suffix}`), 0o600);
        }
      }
    }

    if (fs.existsSync(path.join(sourceDataDir, 'attachments'))) {
      fs.cpSync(path.join(sourceDataDir, 'attachments'), path.join(hostBackupDir, 'attachments'), { recursive: true });
    }
    if (fs.existsSync(path.join(sourceDataDir, 'projects'))) {
      fs.cpSync(path.join(sourceDataDir, 'projects'), path.join(hostBackupDir, 'projects'), { recursive: true });
    }
    if (fs.existsSync(path.join(sourceDataDir, 'settings.json'))) {
      fs.copyFileSync(path.join(sourceDataDir, 'settings.json'), path.join(hostBackupDir, 'settings.json'));
    }
    if (fs.existsSync(path.join(sourceDataDir, 'message-queue.json'))) {
      fs.copyFileSync(path.join(sourceDataDir, 'message-queue.json'), path.join(hostBackupDir, 'message-queue.json'));
    }

    // OMP session copy (unencrypted)
    fs.cpSync(path.join(sourceOmpDir, 'sessions'), path.join(ompBackupDir, 'sessions'), { recursive: true });

    // Secure credentials copy (kept strictly separate in operator-provided encrypted vault)
    expect(fs.existsSync(agentDbPath)).toBe(true);
    fs.copyFileSync(agentDbPath, path.join(encryptedVaultDir, 'agent.db'));
    fs.chmodSync(path.join(encryptedVaultDir, 'agent.db'), 0o600);

    // Verify credential was NOT copied to standard session backup
    expect(fs.existsSync(path.join(ompBackupDir, 'agent.db'))).toBe(false);

    // 6. Execute documented restore procedure into fresh disposable target home
    const restoreHome = makeDir('restore-dest-home-');
    const restoreDataDir = path.join(restoreHome, '.config', 'ohpichamber');
    const restoreOmpDir = path.join(restoreHome, '.omp', 'agent');
    fs.mkdirSync(restoreDataDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(restoreOmpDir, { recursive: true, mode: 0o700 });

    // Clean existing SQLite files in destination before restore
    for (const f of fs.readdirSync(restoreDataDir)) {
      if (f.endsWith('.sqlite') || f.includes('.sqlite-')) {
        fs.unlinkSync(path.join(restoreDataDir, f));
      }
    }

    // Restore Host data with guarded checks
    for (const dbName of ['host-metadata.sqlite', 'host-approval-policies.sqlite']) {
      const backupDb = path.join(hostBackupDir, dbName);
      expect(fs.existsSync(backupDb)).toBe(true);
      fs.copyFileSync(backupDb, path.join(restoreDataDir, dbName));
      fs.chmodSync(path.join(restoreDataDir, dbName), 0o600);
      for (const suffix of ['-wal', '-shm']) {
        const sidecar = `${backupDb}${suffix}`;
        if (fs.existsSync(sidecar)) {
          fs.copyFileSync(sidecar, path.join(restoreDataDir, `${dbName}${suffix}`));
          fs.chmodSync(path.join(restoreDataDir, `${dbName}${suffix}`), 0o600);
        }
      }
    }

    if (fs.existsSync(path.join(hostBackupDir, 'attachments'))) {
      fs.cpSync(path.join(hostBackupDir, 'attachments'), path.join(restoreDataDir, 'attachments'), { recursive: true });
    }
    if (fs.existsSync(path.join(hostBackupDir, 'projects'))) {
      fs.cpSync(path.join(hostBackupDir, 'projects'), path.join(restoreDataDir, 'projects'), { recursive: true });
    }
    if (fs.existsSync(path.join(hostBackupDir, 'settings.json'))) {
      fs.copyFileSync(path.join(hostBackupDir, 'settings.json'), path.join(restoreDataDir, 'settings.json'));
    }
    if (fs.existsSync(path.join(hostBackupDir, 'message-queue.json'))) {
      fs.copyFileSync(path.join(hostBackupDir, 'message-queue.json'), path.join(restoreDataDir, 'message-queue.json'));
    }

    // Restore OMP sessions
    fs.cpSync(path.join(ompBackupDir, 'sessions'), path.join(restoreOmpDir, 'sessions'), { recursive: true });

    // Restore credentials from secure encrypted vault
    fs.copyFileSync(path.join(encryptedVaultDir, 'agent.db'), path.join(restoreOmpDir, 'agent.db'));
    fs.chmodSync(path.join(restoreOmpDir, 'agent.db'), 0o600);
    // 7. Verify restored Host metadata and prompt queue
    const restoredMeta = openHostMetadataDatabase({ dataDir: restoreDataDir });
    try {
      const version = Number(restoredMeta.db.prepare('PRAGMA user_version').get()?.user_version);
      expect(version).toBe(CURRENT_HOST_METADATA_VERSION);

      const sessionRow = restoredMeta.db.prepare(
        'SELECT payload FROM session_metadata WHERE session_id = ?'
      ).get(scope.sessionId);
      expect(sessionRow).toBeDefined();
      const parsedSession = JSON.parse(sessionRow.payload);
      expect(parsedSession.title).toBe('Backup Test Session');
      expect(parsedSession.customTag).toBe('verified');

      const attachmentRow = restoredMeta.db.prepare(
        'SELECT * FROM host_attachments WHERE attachment_id = ?'
      ).get('att-1');
      expect(attachmentRow.name).toBe('test.bin');
      expect(attachmentRow.size).toBe(22);
      expect(fs.existsSync(path.join(restoreDataDir, 'attachments', 'attachment-1.bin'))).toBe(true);

      // Verify prompt queue via real public API
      const restoredQueueStore = createPromptQueueStore({
        dataDir: restoreDataDir,
        database: restoredMeta.db,
        closeDatabase: false,
      });
      const queueState = await restoredQueueStore.getState(scope);
      expect(queueState.sessionId).toBe(scope.sessionId);
      expect(queueState.revision).toBe('1');
      expect(queueState.items.length).toBe(1);
      expect(queueState.items[0].queueItemId).toBeDefined();
      expect(queueState.items[0].text).toBe('Hello from queued message');
      expect(queueState.items[0].content).toBe('Hello from queued message');
      expect(queueState.items[0].options).toEqual(promptRequest.options);
      expect(queueState.items[0].status).toBe('queued');
    } finally {
      restoredMeta.db.close();
    }

    // 8. Verify restored Approval Policies
    const restoredApproval = openApprovalPolicyStore({ dataDir: restoreDataDir });
    try {
      const policies = restoredApproval.list(scope);
      expect(policies.length).toBe(2);
      const denyBash = policies.find(p => p.decision === 'deny');
      expect(denyBash).toBeDefined();
      expect(denyBash.target.toolName).toBe('bash');
      expect(denyBash.target.pattern).toBe('rm -rf *');

      const allowRead = policies.find(p => p.decision === 'allow');
      expect(allowRead).toBeDefined();
      expect(allowRead.target.toolName).toBe('read');
      expect(allowRead.target.pattern).toBe('*.json');
      const approvalDbPath = path.join(restoreDataDir, 'host-approval-policies.sqlite');
      for (const suffix of ['-wal', '-shm']) {
        const sidecar = `${approvalDbPath}${suffix}`;
        if (fs.existsSync(sidecar)) {
          expect(fs.statSync(sidecar).mode & 0o777).toBe(0o600);
        }
      }
    } finally {
      restoredApproval.close();
    }
    // 9. Verify restored legacy files and settings
    expect(fs.existsSync(path.join(restoreDataDir, 'message-queue.json'))).toBe(true);
    const legacyQueue = JSON.parse(fs.readFileSync(path.join(restoreDataDir, 'message-queue.json'), 'utf8'));
    expect(legacyQueue.legacy).toBe(true);

    const restoredSettings = JSON.parse(fs.readFileSync(path.join(restoreDataDir, 'settings.json'), 'utf8'));
    expect(restoredSettings.theme).toBe('dark');

    // 10. Verify restored OMP transcripts
    const restoredJsonlPath = path.join(restoreOmpDir, 'sessions', scope.sessionId, 'session.jsonl');
    expect(fs.existsSync(restoredJsonlPath)).toBe(true);
    const restoredLines = fs.readFileSync(restoredJsonlPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    expect(restoredLines.length).toBe(3);
    expect(restoredLines[0].type).toBe('session_start');
    expect(restoredLines[1].role).toBe('user');
    expect(restoredLines[1].content[0].text).toBe('Initialize project');
    expect(restoredLines[2].role).toBe('assistant');
    expect(restoredLines[2].content[0].text).toBe('Project initialized.');

    // 11. Verify restored credentials
    const restoredAgentDb = new DatabaseSync(path.join(restoreOmpDir, 'agent.db'));
    try {
      const credRow = restoredAgentDb.prepare('SELECT token FROM credentials WHERE provider_id = ?').get('provider-1');
      expect(credRow.token).toBe('secret-token-xyz');
    } finally {
      restoredAgentDb.close();
    }
  });
});

describe('documented Host restore staging', () => {
  const oldFiles = {
    'host-metadata.sqlite': 'old-meta-main',
    'host-metadata.sqlite-wal': 'old-meta-wal',
    'host-metadata.sqlite-shm': 'old-meta-shm',
    'host-approval-policies.sqlite': 'old-approval-main',
    'host-approval-policies.sqlite-wal': 'old-approval-wal',
    'host-approval-policies.sqlite-shm': 'old-approval-shm',
  };
  const backupFiles = {
    'host-metadata.sqlite': 'new-meta-main',
    'host-metadata.sqlite-wal': 'new-meta-wal',
    'host-metadata.sqlite-shm': 'new-meta-shm',
    'host-approval-policies.sqlite': 'new-approval-main',
  };
  const leftoverStageDirs = (dir) => fs.readdirSync(dir).filter((name) => name.startsWith('.host-restore-'));

  posixTest('installs a coherent staged set and removes stale destination sidecars', () => {
    const root = makeDir('restore-stage-success-');
    const backupDir = path.join(root, 'backup');
    const restoreDir = path.join(root, 'restore');
    writeFileSet(backupDir, backupFiles);
    writeFileSet(restoreDir, oldFiles);

    const result = runDocumentedRestore({ root, backupDir, restoreDir });
    expect(result.status, result.stderr).toBe(0);
    const installed = snapshotFiles(restoreDir);
    expect(installed['host-metadata.sqlite']).toMatchObject({ content: 'new-meta-main', mode: 0o600 });
    expect(installed['host-metadata.sqlite-wal']).toMatchObject({ content: 'new-meta-wal', mode: 0o600 });
    expect(installed['host-metadata.sqlite-shm']).toMatchObject({ content: 'new-meta-shm', mode: 0o600 });
    expect(installed['host-approval-policies.sqlite']).toMatchObject({ content: 'new-approval-main', mode: 0o600 });
    expect(installed['host-approval-policies.sqlite-wal']).toBeNull();
    expect(installed['host-approval-policies.sqlite-shm']).toBeNull();
    expect(leftoverStageDirs(restoreDir)).toEqual([]);
  });

  const expectFailurePreservesDestination = ({ failureEnv, failureEnvFor, mutateBackup, expectedStderr }) => {
    const root = makeDir('restore-stage-failure-');
    const backupDir = path.join(root, 'backup');
    const restoreDir = path.join(root, 'restore');
    writeFileSet(backupDir, backupFiles);
    if (mutateBackup) mutateBackup(backupDir);
    writeFileSet(restoreDir, oldFiles);
    const before = snapshotFiles(restoreDir);

    const resolvedFailureEnv = failureEnvFor ? failureEnvFor({ root, backupDir, restoreDir }) : failureEnv;
    const result = runDocumentedRestore({ root, backupDir, restoreDir, failureEnv: resolvedFailureEnv });
    expect(result.status, result.stderr).not.toBe(0);
    if (expectedStderr) expect(result.stderr).toContain(expectedStderr);
    expect(snapshotFiles(restoreDir)).toEqual(before);
    expect(leftoverStageDirs(restoreDir)).toEqual([]);
  };

  posixTest('preserves the existing database set on staged copy, chmod, and sidecar-coherence failures', () => {
    expectFailurePreservesDestination({
      failureEnv: { FAIL_CP_BASENAME: 'host-approval-policies.sqlite' },
      expectedStderr: 'Failed to stage host-approval-policies.sqlite',
    });
    expectFailurePreservesDestination({
      failureEnv: { FAIL_CHMOD_BASENAME: 'host-metadata.sqlite' },
      expectedStderr: 'Failed to restrict staged host-metadata.sqlite permissions',
    });
    expectFailurePreservesDestination({
      mutateBackup: (dir) => fs.rmSync(path.join(dir, 'host-metadata.sqlite-shm')),
      expectedStderr: 'Incomplete sidecar set for host-metadata.sqlite',
    });
    expectFailurePreservesDestination({
      failureEnvFor: ({ restoreDir }) => ({ FAIL_MV_SOURCE: path.join(restoreDir, 'host-metadata.sqlite-wal') }),
      expectedStderr: 'Failed to move existing host-metadata.sqlite-wal aside',
    });
    for (const dirMatch of ['.host-restore-stage', '.host-restore-rollback']) {
      expectFailurePreservesDestination({
        failureEnv: { FAIL_CHMOD_DIR_MATCH: dirMatch },
        expectedStderr: 'permissions',
      });
    }
  });

  posixTest('rolls back installed files when a staged rename fails', () => {
    expectFailurePreservesDestination({
      failureEnv: { FAIL_MV_BASENAME: 'host-approval-policies.sqlite' },
      expectedStderr: 'Failed to install staged host-approval-policies.sqlite',
    });
  });

  posixTest('rejects non-regular fixed destination entries without touching other files', () => {
    for (const kind of ['directory', 'symlink']) {
      const root = makeDir('restore-non-regular-');
      const backupDir = path.join(root, 'backup');
      const restoreDir = path.join(root, 'restore');
      writeFileSet(backupDir, backupFiles);
      writeFileSet(restoreDir, oldFiles);
      const target = path.join(restoreDir, 'host-approval-policies.sqlite');
      fs.rmSync(target);
      if (kind === 'directory') {
        fs.mkdirSync(target);
      } else {
        fs.mkdirSync(path.join(restoreDir, 'symlink-target'));
        fs.symlinkSync('symlink-target', target);
      }
      const before = snapshotFiles(restoreDir);

      const result = runDocumentedRestore({ root, backupDir, restoreDir });
      expect(result.status, result.stderr).not.toBe(0);
      expect(result.stderr).toContain('Existing restore target is not a regular file');
      expect(snapshotFiles(restoreDir)).toEqual(before);
      expect(leftoverStageDirs(restoreDir)).toEqual([]);
    }
  });

  posixTest('preserves the rollback directory when rollback itself fails (no state-file append dependency)', () => {
    const root = makeDir('restore-rollback-failure-');
    const backupDir = path.join(root, 'backup');
    const restoreDir = path.join(root, 'restore');
    writeFileSet(backupDir, backupFiles);
    writeFileSet(restoreDir, oldFiles);

    const result = runDocumentedRestore({
      root, backupDir, restoreDir,
      failureEnv: {
        FAIL_MV_BASENAME: 'host-approval-policies.sqlite',
        FAIL_MV_ROLLBACK_BASENAME: 'host-metadata.sqlite',
      },
    });
    expect(result.status, result.stderr).not.toBe(0);
    expect(result.stderr).toContain('Restore rollback was incomplete');
    const leftovers = leftoverStageDirs(restoreDir);
    const rollbackDirs = leftovers.filter((name) => name.startsWith('.host-restore-rollback'));
    expect(leftovers.filter((name) => name.startsWith('.host-restore-stage'))).toEqual([]);
    expect(rollbackDirs.length).toBe(1);
    expect(fs.readFileSync(path.join(restoreDir, rollbackDirs[0], 'host-metadata.sqlite'), 'utf8')).toBe('old-meta-main');
    expect(fs.readFileSync(path.join(restoreDir, 'host-metadata.sqlite'), 'utf8')).toBe('new-meta-main');
  });
});
