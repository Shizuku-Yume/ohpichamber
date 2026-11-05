import { describe, expect, test } from 'bun:test';
import { captureNativePolicy } from './native-policy-snapshot.ts';
import type { NativeWorkerRuntime } from './native-runtime.ts';
import type { NativeAgents } from './catalog-agents.ts';

describe('captureNativePolicy endpoint resolution', () => {
  test('includes model.baseUrl and provider.endpoint in authorized providers list', async () => {
    const input = {
      projectId: 'proj-1',
      workspaceId: 'ws-1',
      cwd: '/workspace',
      agentDirectory: '/agent',
      agentDirectoryId: 'ad-1',
    };

    const mockRuntime = {
      models: {
        readModels: async () => ({
          workspaceId: 'ws-1',
          revision: '1',
          models: [
            { provider: 'CLIProxyAPI', modelId: 'gpt-6-astra', enabled: true },
            { provider: 'anthropic', modelId: 'claude-3-5-sonnet', enabled: true },
          ],
        }),
        readProviders: async () => ({
          workspaceId: 'ws-1',
          revision: '1',
          providers: [
            { providerId: 'CLIProxyAPI', endpoint: 'https://cli.example.com/v1' },
            { providerId: 'anthropic', endpoint: 'https://api.anthropic.com' },
          ],
        }),
      },
      modelRegistry: {
        getAll: () => [
          {
            id: 'gpt-6-astra',
            provider: 'CLIProxyAPI',
            baseUrl: 'https://cli.example.com/backend-api',
          },
          {
            id: 'claude-3-5-sonnet',
            provider: 'anthropic',
          },
        ],
      },
    } as unknown as NativeWorkerRuntime;

    const mockAgents = {
      read: async () => ({
        workspaceId: 'ws-1',
        revision: '1',
        agents: [],
      }),
    } as unknown as NativeAgents;

    const snapshot = await captureNativePolicy(input, mockRuntime, mockAgents, []);
    expect(snapshot.providers.length).toBeGreaterThanOrEqual(2);

    // Verify model-specific baseUrl is authorized for gpt-6-astra
    const astraCustom = snapshot.providers.find(
      p => p.providerId === 'CLIProxyAPI' && p.modelId === 'gpt-6-astra' && p.endpoint === 'https://cli.example.com/backend-api'
    );
    expect(astraCustom).toBeDefined();

    // Verify provider-level fallback endpoint is NOT permitted when model has explicit baseUrl (fail-closed)
    const astraProvider = snapshot.providers.find(
      p => p.providerId === 'CLIProxyAPI' && p.modelId === 'gpt-6-astra' && p.endpoint === 'https://cli.example.com/v1'
    );
    expect(astraProvider).toBeUndefined();

    // Verify model without custom baseUrl uses provider.endpoint
    const sonnet = snapshot.providers.find(
      p => p.providerId === 'anthropic' && p.modelId === 'claude-3-5-sonnet'
    );
    expect(sonnet).toBeDefined();
    expect(sonnet?.endpoint).toBe('https://api.anthropic.com');
  });
});
