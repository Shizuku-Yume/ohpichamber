import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readNativeMcpConfigurationIfPresent,
  writeNativeMcpConfiguration,
  NativeMcpError,
} from './mcp.ts';
import type { MCPConfigurationState } from '@openchamber/agent-contract';

describe('MCP configuration management and unmanaged projection', () => {
  test('returns null when configuration file is absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-test-'));
    try {
      const configPath = join(dir, 'mcp.json');
      const result = await readNativeMcpConfigurationIfPresent(configPath, 'workspace-1');
      expect(result).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('projects hand-written unmanaged mcp.json read-only with redacted secrets and sanitized paths/urls', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-test-'));
    try {
      const configPath = join(dir, 'mcp.json');
      const unmanagedContent = JSON.stringify({
        mcpServers: {
          'local-tool': {
            type: 'stdio',
            command: '/usr/local/bin/custom-mcp',
            args: ['--debug', '--port', '8080'],
            env: {
              API_KEY: 'super-secret-key-123',
              TOKEN: 'bearer-secret',
            },
          },
          'remote-tool': {
            type: 'sse',
            url: 'https://admin:secret123@mcp.example.com/events?token=sensitive-query#frag',
            headers: {
              Authorization: 'Bearer top-secret-token',
              'X-Custom-Secret': 'confidential',
            },
          },
        },
        disabledServers: ['remote-tool'],
      }, null, 2);

      await writeFile(configPath, unmanagedContent, 'utf8');

      const projected = await readNativeMcpConfigurationIfPresent(configPath, 'workspace-1');
      expect(projected).not.toBeNull();
      expect(projected?.workspaceId).toBe('workspace-1');
      expect(projected?.persistedRevision).toBe('0');

      const servers = projected!.config.servers;
      expect(servers).toHaveLength(2);

      const local = servers.find(s => s.serverId === 'local-tool');
      expect(local).toBeDefined();
      expect(local?.managed).toBe(false);
      expect(local?.enabled).toBe(true);
      expect(local?.label).toBe('local-tool');
      expect(local?.transport.type).toBe('stdio');
      if (local?.transport.type === 'stdio') {
        expect(local.transport.command).toBe('custom-mcp');
        expect(local.transport.args).toEqual(['--debug', '--port', '8080']);
        expect(local.transport.envCredentialRefs).toBeUndefined();
      }

      const remote = servers.find(s => s.serverId === 'remote-tool');
      expect(remote).toBeDefined();
      expect(remote?.managed).toBe(false);
      expect(remote?.enabled).toBe(false);
      expect(remote?.transport.type).toBe('sse');
      if (remote?.transport.type === 'sse') {
        expect(remote.transport.url).toBe('https://mcp.example.com/events');
        expect(remote.transport.credentialRef).toBeUndefined();
        expect(remote.transport.headerCredentialRefs).toBeUndefined();
      }

      // Assert no secret substrings leaked in serialized projection
      const serialized = JSON.stringify(projected);
      expect(serialized).not.toContain('super-secret-key-123');
      expect(serialized).not.toContain('bearer-secret');
      expect(serialized).not.toContain('secret123');
      expect(serialized).not.toContain('sensitive-query');
      expect(serialized).not.toContain('top-secret-token');
      expect(serialized).not.toContain('confidential');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('refuses in-place mutation of unmanaged file, preserving exact bytes on disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-test-'));
    try {
      const configPath = join(dir, 'mcp.json');
      const unmanagedRaw = JSON.stringify({
        mcpServers: {
          sqlite: {
            command: 'uvx',
            args: ['mcp-server-sqlite'],
            env: { DB_PASS: 'raw-secret' },
          },
        },
      }, null, 2);

      await writeFile(configPath, unmanagedRaw, 'utf8');

      const mutationAttempt: MCPConfigurationState = {
        workspaceId: 'workspace-1',
        persistedRevision: '1',
        config: {
          servers: [
            {
              serverId: 'sqlite',
              label: 'sqlite',
              enabled: true,
              transport: {
                type: 'stdio',
                command: 'uvx',
                args: ['mcp-server-sqlite'],
              },
            },
          ],
        },
      };

      await expect(writeNativeMcpConfiguration(configPath, mutationAttempt))
        .rejects
        .toThrow(NativeMcpError);

      try {
        await writeNativeMcpConfiguration(configPath, mutationAttempt);
      } catch (error) {
        expect(error).toBeInstanceOf(NativeMcpError);
        expect((error as NativeMcpError).code).toBe('CATALOG_CONFLICT');
      }

      // File on disk must be identical byte-for-byte
      const preservedBytes = await readFile(configPath, 'utf8');
      expect(preservedBytes).toBe(unmanagedRaw);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('writes and reads managed configuration correctly', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-test-'));
    try {
      const configPath = join(dir, 'mcp.json');
      const managedState: MCPConfigurationState = {
        workspaceId: 'workspace-1',
        persistedRevision: '1',
        config: {
          servers: [
            {
              serverId: 'server-one',
              label: 'Server One',
              enabled: true,
              scope: 'project' as const,
              transport: {
                type: 'stdio',
                command: 'node',
                args: ['server.js'],
              },
            },
          ],
        },
      };

      const committed = await writeNativeMcpConfiguration(configPath, managedState);
      expect(committed).toEqual(managedState);

      const readBack = await readNativeMcpConfigurationIfPresent(configPath, 'workspace-1');
      expect(readBack).toEqual(managedState);

      // Mutating managed state succeeds
      const updatedState: MCPConfigurationState = {
        ...managedState,
        persistedRevision: '2',
        config: {
          servers: [
            {
              ...managedState.config.servers[0]!,
              label: 'Updated Label',
            },
          ],
        },
      };
      const updated = await writeNativeMcpConfiguration(configPath, updatedState);
      expect(updated).toEqual(updatedState);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('fails closed with MCP_CONFIG_READ_FAILED on malformed JSON or unreadable file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-test-'));
    try {
      const configPath = join(dir, 'mcp.json');
      await writeFile(configPath, '{ not valid json', 'utf8');

      await expect(readNativeMcpConfigurationIfPresent(configPath, 'workspace-1'))
        .rejects
        .toThrow(NativeMcpError);

      try {
        await readNativeMcpConfigurationIfPresent(configPath, 'workspace-1');
      } catch (error) {
        expect(error).toBeInstanceOf(NativeMcpError);
        expect((error as NativeMcpError).code).toBe('MCP_CONFIG_READ_FAILED');
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('scope round-trip: writes user scope to userConfigPath in OMP format and project scope to projectConfigPath', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-scope-test-'));
    try {
      const projectPath = join(dir, 'project-mcp.json');
      const userPath = join(dir, 'user-mcp.json');

      const state: MCPConfigurationState = {
        workspaceId: 'workspace-1',
        persistedRevision: '1',
        config: {
          servers: [
            {
              serverId: 'proj-server',
              label: 'Project Server',
              enabled: true,
              scope: 'project',
              transport: { type: 'stdio', command: 'node', args: ['proj.js'] },
            },
            {
              serverId: 'user-server',
              label: 'User Server',
              enabled: true,
              scope: 'user',
              transport: { type: 'http', url: 'https://user-mcp.example/api' },
            },
          ],
        },
      };

      await writeNativeMcpConfiguration(projectPath, state, userPath);

      // Check project file content
      const projectRaw = JSON.parse(await readFile(projectPath, 'utf8'));
      expect(projectRaw.openchamber).toBeDefined();
      expect(projectRaw.mcpServers['proj-server']).toBeDefined();
      expect(projectRaw.mcpServers['user-server']).toBeUndefined();

      // Check user file content (OMP format: NO openchamber property)
      const userRaw = JSON.parse(await readFile(userPath, 'utf8'));
      expect(userRaw.openchamber).toBeUndefined();
      expect(userRaw.mcpServers['user-server']).toBeDefined();
      expect(userRaw.mcpServers['proj-server']).toBeUndefined();

      // Read back with both paths
      const readBack = await readNativeMcpConfigurationIfPresent(projectPath, 'workspace-1', userPath);
      expect(readBack).not.toBeNull();
      expect(readBack?.config.servers).toHaveLength(2);

      const projRead = readBack?.config.servers.find(s => s.serverId === 'proj-server');
      expect(projRead?.scope).toBe('project');

      const userRead = readBack?.config.servers.find(s => s.serverId === 'user-server');
      expect(userRead?.scope).toBe('user');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('user-scope MCP storage in a temp HOME keeps native entries and credentials', () => {
  const workspaceId = 'workspace-1';
  async function withHome(run: (paths: { home: string; userPath: string; projectPath: string }) => Promise<void>): Promise<void> {
    const home = await mkdtemp(join(tmpdir(), 'mcp-home-'));
    try {
      const userPath = join(home, '.omp', 'agent', 'mcp.json');
      await mkdir(join(home, '.omp', 'agent'), { recursive: true });
      await run({ home, userPath, projectPath: join(home, 'project', '.omp', 'mcp.json') });
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  }

  test('a project save leaves the pre-seeded user mcp.json byte-identical', async () => {
    await withHome(async ({ userPath, projectPath }) => {
      const seeded = `${JSON.stringify({
        mcpServers: {
          'native-http': { type: 'http', url: 'https://native.example/mcp', headers: { 'X-Key': 'raw-header' }, auth: { type: 'apikey' } },
          'native-stdio': { command: 'uvx', args: ['mcp-x'], env: { TOKEN: 'raw-env' } },
        },
        enabledServers: ['native-stdio'],
      }, null, 2)}\n`;
      await writeFile(userPath, seeded, 'utf8');
      const visible = await readNativeMcpConfigurationIfPresent(projectPath, workspaceId, userPath);
      if (!visible) throw new Error('seeded configuration must be readable');
      expect(visible.config.servers.map(server => server.serverId).sort()).toEqual(['native-http', 'native-stdio']);
      const project = { serverId: 'proj-only', label: 'Project only', enabled: true, scope: 'project' as const, transport: { type: 'stdio' as const, command: 'node', args: ['p.js'] } };
      await writeNativeMcpConfiguration(projectPath, { workspaceId, persistedRevision: '1', config: { servers: [...visible.config.servers, project] } }, userPath);
      expect(await readFile(userPath, 'utf8')).toBe(seeded);
    });
  });

  test('a global server shadowed by a project server survives, and a user edit keeps native fields', async () => {
    await withHome(async ({ userPath, projectPath }) => {
      const seeded = `${JSON.stringify({
        mcpServers: {
          shadowed: { type: 'http', url: 'https://global.example/mcp', headers: { 'X-Key': 'raw' } },
          'native-stdio': { command: 'uvx', args: ['mcp-x'], env: { TOKEN: 'raw-env' } },
        },
        enabledServers: ['native-stdio'],
      }, null, 2)}\n`;
      const shadowing = { serverId: 'shadowed', label: 'Project shadow', enabled: true, scope: 'project' as const, transport: { type: 'stdio' as const, command: 'proj', args: [] } };
      await writeNativeMcpConfiguration(projectPath, { workspaceId, persistedRevision: '1', config: { servers: [shadowing] } }, userPath);
      await writeFile(userPath, seeded, 'utf8');
      expect(await readFile(userPath, 'utf8')).toBe(seeded);

      const read = await readNativeMcpConfigurationIfPresent(projectPath, workspaceId, userPath);
      if (!read) throw new Error('configuration must be readable');
      expect(read.config.servers.map(server => server.serverId).sort()).toEqual(['native-stdio', 'shadowed']);
      await writeNativeMcpConfiguration(projectPath, {
        workspaceId,
        persistedRevision: '2',
        config: { servers: read.config.servers.map(server => server.serverId === 'native-stdio' ? { ...server, enabled: false } : server) },
      }, userPath);

      const userRaw = JSON.parse(await readFile(userPath, 'utf8'));
      expect(userRaw.mcpServers.shadowed).toEqual({ type: 'http', url: 'https://global.example/mcp', headers: { 'X-Key': 'raw' } });
      expect(userRaw.mcpServers['native-stdio'].env).toEqual({ TOKEN: 'raw-env' });
      expect(userRaw.enabledServers).toEqual(['native-stdio']);
      expect(userRaw.disabledServers).toEqual(['native-stdio']);
    });
  });

  test('user-scope credential references survive a reread and a second session', async () => {
    await withHome(async ({ userPath, projectPath }) => {
      const httpTransport = { type: 'http' as const, url: 'https://mcp.figma.example/mcp', credentialRef: 'credential-figma', headerCredentialRefs: { 'X-Team': 'credential-team' } };
      const stdioTransport = { type: 'stdio' as const, command: 'node', args: ['s.js'], envCredentialRefs: { TOKEN: 'credential-token' } };
      const state = {
        workspaceId,
        persistedRevision: '1',
        config: {
          servers: [
            { serverId: 'figma', label: 'Figma', enabled: true, scope: 'user' as const, transport: httpTransport },
            { serverId: 'local-env', label: 'Local env', enabled: true, scope: 'user' as const, transport: stdioTransport },
          ]
        },
      };
      await writeNativeMcpConfiguration(projectPath, state, userPath);
      const userRaw = await readFile(userPath, 'utf8');
      expect(userRaw).not.toContain('secret');
      const first = await readNativeMcpConfigurationIfPresent(projectPath, workspaceId, userPath);
      const second = await readNativeMcpConfigurationIfPresent(projectPath, workspaceId, userPath);
      expect(second).toEqual(first);
      expect(first?.config.servers.find(server => server.serverId === 'figma')?.transport).toEqual(httpTransport);
      expect(first?.config.servers.find(server => server.serverId === 'local-env')?.transport).toEqual(stdioTransport);
    });
  });
});
