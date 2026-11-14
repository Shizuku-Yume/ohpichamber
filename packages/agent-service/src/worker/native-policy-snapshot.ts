import type { MCPServerConfig } from '@openchamber/agent-contract';
import { HostNativePolicySnapshotSchema, type HostNativePolicySnapshot } from '../native-policy-protocol.ts';
import type { NativeWorkerRuntime } from './native-runtime.ts';
import type { NativeAgents } from './catalog-agents.ts';

/** Captures installed native catalog facts, never Host machine grants or credential material. */
export async function captureNativePolicy(input: { projectId: string; workspaceId: string; cwd: string; agentDirectory: string; agentDirectoryId: string }, runtime: NativeWorkerRuntime, agents: NativeAgents, mcpServers: MCPServerConfig[]): Promise<HostNativePolicySnapshot> {
  const [catalog, providersCatalog, profiles] = await Promise.all([
    runtime.models.readModels(input.workspaceId, '0'),
    runtime.models.readProviders(input.workspaceId, '0'),
    agents.read(input.workspaceId, '0'),
  ]);
  const models = runtime.modelRegistry.getAll('all');
  const providers: HostNativePolicySnapshot['providers'] = [];
  for (const model of catalog.models) {
    if (!model.enabled) continue;
    const native = models.find(candidate => candidate.id === model.modelId && candidate.provider === model.provider);
    if (!native) continue;
    const provider = providersCatalog.providers.find(candidate => candidate.providerId === native.provider);
    const nativeProvider: HostNativePolicySnapshot['providers'][number] = { providerId: native.provider, modelId: native.id };
    const endpoint = 'baseUrl' in native && typeof native.baseUrl === 'string' && native.baseUrl
      ? native.baseUrl
      : provider?.endpoint;
    if (endpoint !== null && endpoint !== undefined) nativeProvider.endpoint = endpoint;
    providers.push(nativeProvider);
  }
  return HostNativePolicySnapshotSchema.parse({ ...input, providers, mcpServers, agentIds: profiles.agents.map(agent => agent.agentId) });
}
