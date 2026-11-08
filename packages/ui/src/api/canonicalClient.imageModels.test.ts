import { describe, expect, mock, spyOn, test } from 'bun:test';
import { canonicalClient } from './canonicalClient';

let fetchMockResult: unknown;
mock.module('../lib/runtime-fetch', () => ({
  runtimeFetch: async () => Response.json(fetchMockResult),
}));

describe('canonicalClient image models and generation', () => {
  const workspaceId = 'workspace_123';

  test('listImageModels returns imageModels from model catalog', async () => {
    const mockImageModels = [
      {
        modelId: 'flux-schnell',
        provider: 'replicate',
        name: 'FLUX.1 [schnell]',
        enabled: true,
        status: 'active' as const,
      },
    ];

    const getModelsSpy = spyOn(canonicalClient, 'getModels').mockResolvedValue({
      workspaceId,
      revision: '1',
      models: [],
      imageModels: mockImageModels,
      defaults: { model: null, thinkingLevel: null },
      planRoleAvailable: false,
    });

    try {
      const result = await canonicalClient.listImageModels(workspaceId);
      expect(result).toEqual(mockImageModels);
      expect(getModelsSpy).toHaveBeenCalledWith(workspaceId);
    } finally {
      getModelsSpy.mockRestore();
    }
  });

  test('generateImage validates ModelSelection {providerId, modelId} and returns result', async () => {
    const expected = {
      model: { providerId: 'replicate', modelId: 'flux-schnell' },
      images: [{ data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', mimeType: 'image/png' as const }],
      text: 'A generated image',
    };
    fetchMockResult = expected;

    const result = await canonicalClient.generateImage(workspaceId, {
      selection: { providerId: 'replicate', modelId: 'flux-schnell' },
      prompt: 'A sunset over the mountains',
    });

    expect(result.model.providerId).toBe('replicate');
    expect(result.model.modelId).toBe('flux-schnell');
    expect(result.images).toHaveLength(1);
  });
});
