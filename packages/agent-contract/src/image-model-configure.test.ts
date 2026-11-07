import { describe, expect, test } from 'bun:test';
import { ImageModelConfigureRequestSchema, ImageModelMutationResultSchema } from './catalogs.ts';

describe('image model configuration contract', () => {
  test('an image generator carries no token budget and needs a real api', () => {
    const request = {
      expectedRevision: '7',
      model: { modelId: 'gpt-image-1', provider: 'openai', name: 'GPT Image 1', enabled: true },
    };
    expect(ImageModelConfigureRequestSchema.safeParse(request).success).toBe(true);
    // A text model's token budget is not part of this record, so carrying it fails.
    const padded = { ...request, model: { ...request.model, contextWindow: 128000, maxOutputTokens: 4096 } };
    expect(ImageModelConfigureRequestSchema.safeParse(padded).success).toBe(false);
    expect(ImageModelMutationResultSchema.safeParse({ revision: '8', selection: { providerId: 'openai', modelId: 'gpt-image-1' }, model: request.model }).success).toBe(true);
  });
});
