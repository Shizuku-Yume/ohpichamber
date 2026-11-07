import { describe, expect, test } from 'bun:test';

describe('image generate route contract', () => {
  test('request schema refuses unnamed models and oversized prompts', async () => {
    const C = await import('@openchamber/agent-contract');
    expect(C.ImageGenerateRequestSchema.safeParse({ workspaceId: 'workspace_1', prompt: 'a cat' }).success).toBe(false);
    expect(C.ImageGenerateRequestSchema.safeParse({ workspaceId: 'workspace_1', selection: { providerId: 'p', modelId: 'm' }, prompt: '' }).success).toBe(false);
    expect(C.ImageGenerateRequestSchema.safeParse({ workspaceId: 'workspace_1', selection: { providerId: 'p', modelId: 'm' }, prompt: 'a cat', count: 9 }).success).toBe(false);
    expect(C.ImageGenerateRequestSchema.safeParse({ workspaceId: 'workspace_1', selection: { providerId: 'p', modelId: 'm' }, prompt: 'a cat', inputImages: [{ data: 'x', mimeType: 'image/svg+xml' }] }).success).toBe(false);
    expect(C.ImageGenerateRequestSchema.safeParse({ workspaceId: 'workspace_1', selection: { providerId: 'p', modelId: 'm' }, prompt: 'a cat', aspectRatio: '16:9' }).success).toBe(true);
  });
});
