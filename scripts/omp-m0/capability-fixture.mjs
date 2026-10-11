import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ProbeError } from './envelope.mjs';

export function sourceImport(context, relative) {
  return import(pathToFileURL(join(context.sourceDir, relative)).href);
}

export function requireObservation(condition, code) {
  if (!condition) throw new ProbeError(code);
}

// These markers cannot authenticate with any provider. Never replace them with
// environment values: this suite deliberately does not perform provider smoke.
export const credentialCases = [
  { provider: 'anthropic', format: 'api_key', value: { type: 'api_key', key: 'm0-non-authenticating-fixture' } },
  { provider: 'openai', format: 'api_key', value: { type: 'api_key', key: 'm0-non-authenticating-fixture' } },
  { provider: 'google', format: 'api_key', value: { type: 'api_key', key: 'm0-non-authenticating-fixture' } },
  ...['anthropic', 'openai-codex', 'github-copilot', 'google-gemini-cli'].map(provider => ({
    provider, format: 'oauth', value: {
      type: 'oauth', access: 'm0-non-authenticating-access', refresh: 'm0-non-authenticating-refresh', expires: 4102444800000,
    },
  })),
];

export async function withCompletionProvider(context, run) {
  const [mock, registry, completion] = await Promise.all([
    sourceImport(context, 'packages/ai/src/providers/mock.ts'),
    sourceImport(context, 'packages/ai/src/api-registry.ts'),
    sourceImport(context, 'packages/ai/src/stream.ts'),
  ]);
  const sourceId = 'omp-m0-capabilities';
  mock.registerMockApi(sourceId);
  try { return await run({ ...mock, ...completion }); }
  finally { registry.unregisterCustomApis(sourceId); }
}

export function completionContext() {
  return { systemPrompt: ['Controlled M0 stateless fixture.'], messages: [{ role: 'user', content: 'Return the fixture result.', timestamp: 0 }] };
}
