import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createFeatureRoutesRuntime } from './feature-routes-runtime.js';
import { createThemeRuntime } from './theme-runtime.js';
import { createNotificationEmitterRuntime } from '../notifications/emitter-runtime.js';

describe('theme watch over host control SSE stream', () => {
  const cleanups = [];
  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((c) => c()));
  });

  it('broadcasts openchamber:themes-changed on the control stream when theme files change and cleans up on dispose', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'theme-host-sse-'));
    const themesDir = path.join(root, 'themes');
    await fs.mkdir(themesDir);

    const clients = new Set();
    const emitter = createNotificationEmitterRuntime({
      process,
      getDesktopNotifyEnabled: () => false,
      desktopNotifyPrefix: '',
      getUiNotificationClients: () => new Set(),
      getOpenChamberEventClients: () => clients,
    });

    const themeRuntime = createThemeRuntime({
      fsPromises: fs,
      path,
      themesDir,
      maxThemeJsonBytes: 512 * 1024,
      logger: { warn: () => { }, error: () => { } },
    });

    const featureRuntime = createFeatureRoutesRuntime();
    const app = express();
    app.use(express.json());

    // Minimal route dependencies needed by featureRoutesRuntime.registerRoutes
    await featureRuntime.registerRoutes(app, {
      themesDir,
      openchamberUserConfigRoot: root,
      openchamberDataDir: root,
      fsPromises: fs,
      path,
      crypto: await import('node:crypto'),
      os,
      spawn: (await import('node:child_process')).spawn,
      readCustomThemesFromDisk: themeRuntime.readCustomThemesFromDisk,
      saveImportedTheme: themeRuntime.saveImportedTheme,
      deleteImportedTheme: themeRuntime.deleteImportedTheme,
      getOpenChamberEventClients: () => clients,
      writeSseEvent: emitter.writeSseEvent,
      isRequestOriginAllowed: () => true,
      openChamberSessionService: { list: () => [], open: async () => ({}), history: async () => ({}) },
      resolveSessionScope: async () => ({}),
      resolveHostSessionScope: async () => ({}),
      listQueueScopes: () => [],
      readSettingsFromDisk: async () => ({}),
      readSettingsFromDiskMigrated: async () => ({}),
      persistSettings: async () => { },
      sanitizeProjects: (p) => p ?? [],
      sanitizeSkillCatalogs: (c) => c ?? [],
      getOwnPorts: () => [],
      devServerScanner: { scan: () => [] },
      buildAugmentedPath: () => process.env.PATH,
      resolveGitBinaryForSpawn: () => 'git',
      environmentStore: { get: () => null },
      environmentRuntime: { get: () => null },
      listConfiguredProjects: () => [],
      projectConfigRuntime: {},
      projectContextRuntime: {},
      agentMemoryRuntime: {},
      isAgentMemoryEnabled: () => false,
      sessionKnowledgeRuntime: {},
      scheduledTasksRuntime: {},
      scheduledTaskService: {},
      openChamberControlService: {},
      worktreeBootstrapStore: {},
      messageQueueRuntime: {},
      routingRuntime: {},
      globalEventHub: null,
      resolveWorkspaceScope: async () => ({}),
      resolveWorkspaceDirectory: () => root,
      resolveRepositoryWorkspace: async () => ({}),
      resolveQuotaSelection: () => null,
      listQuotaSelections: () => [],
      resolveCredential: () => null,
      resolvePrimaryWorktreeRoot: () => root,
      resolveWorktreeTopLevel: () => root,
      openchamberVersion: '1.0.0',
      messageSearchRuntime: {},
      sessionFoldersStore: {},
      createFsSearchRuntime: () => ({}),
      onGuestDeactivated: () => { },
      surfaceViewerHeaders: {},
      normalizeDirectoryPath: (p) => p,
      resolveProjectDirectory: () => root,
      resolveOptionalProjectDirectory: () => null,
      validateDirectoryPath: () => true,
    });

    // Mock an active SSE client connected to the control stream
    const sseEvents = [];
    const mockSseClient = {
      write: (chunk) => {
        sseEvents.push(chunk);
      },
    };
    clients.add(mockSseClient);

    cleanups.push(async () => {
      featureRuntime.dispose();
      clients.delete(mockSseClient);
      await fs.rm(root, { recursive: true, force: true });
    });

    // Verify initial state
    expect(clients.size).toBe(1);
    expect(sseEvents).toHaveLength(0);

    // Write a valid theme file
    const validTheme = {
      metadata: { id: 'streamed-theme', name: 'Streamed', variant: 'dark' },
      colors: {
        primary: { base: '#0055ff' },
        surface: { background: '#111111', foreground: '#eeeeee', muted: '#181818', mutedForeground: '#999999', elevated: '#222222' },
        interactive: { border: '#333333' },
        status: { error: '#ff6666', warning: '#ffcc66', success: '#66cc66', info: '#66aaff' },
        syntax: { base: { comment: '#888888', keyword: '#aa88ff', string: '#88cc66', number: '#ffcc66', function: '#66aaff', variable: '#eeeeee', type: '#66dddd', operator: '#ff6677' } },
      },
    };
    const themePath = path.join(themesDir, 'streamed.json');
    await fs.writeFile(themePath, JSON.stringify(validTheme, null, 2), 'utf8');

    // Wait for the watcher to settle and notify
    for (let i = 0; i < 40; i++) {
      if (sseEvents.some((e) => e.includes('openchamber:themes-changed'))) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const matchingEvent = sseEvents.find((e) => e.includes('openchamber:themes-changed'));
    expect(matchingEvent).toBeDefined();
    expect(matchingEvent).toContain('data: {"type":"openchamber:themes-changed","properties":{}}');

    // Verify dispose cleanly stops watch
    featureRuntime.dispose();
    sseEvents.length = 0;

    await fs.writeFile(themePath, JSON.stringify({ ...validTheme, metadata: { ...validTheme.metadata, name: 'Ignored' } }), 'utf8');
    await new Promise((r) => setTimeout(r, 200));
    expect(sseEvents).toHaveLength(0);
  });
});
