import crypto from 'node:crypto';
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

afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

describe('Host and Agent backup and restore verification', () => {
  it('restores Host metadata, prompt queue, approval policies, and OMP transcripts on disposable HOME', async () => {
    // 1. Setup disposable source home
    const sourceHome = makeDir('backup-source-home-');
    const sourceDataDir = path.join(sourceHome, '.config', 'openchamber');
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
        agentId: 'agent-1',
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
    const restoreDataDir = path.join(restoreHome, '.config', 'openchamber');
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
