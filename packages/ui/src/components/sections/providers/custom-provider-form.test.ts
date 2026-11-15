import { expect, test } from 'bun:test';
import type { Model, ProviderConfigurationRead } from '@openchamber/agent-contract';
import {
  buildCustomProviderRequest,
  createEmptyCustomProviderForm,
  createModelRow,
  isCustomProviderProtocol,
  isValidProviderID,
  modelModalitiesForKind,
  normalizeModelModalities,
  validateCustomProviderForm,
  type CustomProviderTranslator,
} from './custom-provider-form';

const translate: CustomProviderTranslator = (key) => key;

test('the protocol guard admits only the native provider protocols', () => {
  expect(isCustomProviderProtocol('responses')).toBe(true);
  expect(isCustomProviderProtocol('generate-content')).toBe(true);
  expect(isCustomProviderProtocol('openai-chat')).toBe(false);
});

test('discovering only an identity does not invent model limits that can be saved', () => {
  const form = createEmptyCustomProviderForm();
  form.providerId = 'campus';
  form.name = 'Campus';
  form.endpoint = 'https://models.example.edu/v1';
  form.models = [createModelRow({ modelId: 'research', name: 'Research' })];

  expect(() => buildCustomProviderRequest(form, '4')).toThrow();

  // The user reviews and supplies the missing native execution limits before saving.
  form.models[0]!.contextWindow = '32768';
  form.models[0]!.maxOutputTokens = '4096';
  expect(buildCustomProviderRequest(form, '4').request.models?.[0]).toMatchObject({
    modelId: 'research', contextWindow: 32768, maxOutputTokens: 4096,
  });
});

test('editing provider connection settings preserves reviewed canonical model capabilities', () => {
  const model: Model = {
    modelId: 'research', provider: 'campus', name: 'Research', modalities: ['text', 'image'],
    contextWindow: 32768, maxOutputTokens: 4096, reasoningEffortSupported: true,
    reasoningOptions: [{ reasoningEffort: 'high', label: 'High', budgetTokens: 2048 }],
    variants: [{ variant: 'deep', label: 'Deep', reasoningEffort: 'high' }],
    toolsSupported: false, enabled: true, status: 'beta',
    pricing: {
      inputPerMillionTokens: 1, outputPerMillionTokens: 3,
      cacheReadPerMillionTokens: 0.1, cacheWritePerMillionTokens: null
    },
  };
  const initial: ProviderConfigurationRead = {
    revision: '4', configuration: {
      providerId: 'campus', name: 'Campus',
      endpoint: 'https://models.example.edu/v1', protocol: 'responses', credentialRef: null
    },
    headerNames: ['X-Tenant'], models: [model], imageModels: [],
  };
  const form = createEmptyCustomProviderForm(initial);
  form.endpoint = 'https://models.example.edu/v2';

  const saved = buildCustomProviderRequest(form, '4');
  expect(saved.request.configuration.endpoint).toBe(form.endpoint);
  expect(saved.request.models).toEqual([model]);
});

test('model controls update only the edited native fields', () => {
  const model: Model = {
    modelId: 'research', provider: 'campus', name: 'Research', modalities: ['text'],
    contextWindow: 32768, maxOutputTokens: 4096, reasoningEffortSupported: true,
    reasoningOptions: [{ reasoningEffort: 'high', label: 'High', budgetTokens: 2048 }],
    variants: [], toolsSupported: false,
    pricing: {
      inputPerMillionTokens: 1, outputPerMillionTokens: 3,
      cacheReadPerMillionTokens: 0.1, cacheWritePerMillionTokens: null
    },
  };
  const form = createEmptyCustomProviderForm({
    revision: '4', configuration: {
      providerId: 'campus', name: 'Campus',
      endpoint: 'https://models.example.edu/v1', protocol: 'chat-completions', credentialRef: null
    },
    headerNames: [], models: [model], imageModels: [],
  });
  form.models[0]!.modalities = ['text', 'image'];
  form.models[0]!.toolsSupported = true;

  expect(buildCustomProviderRequest(form, '4').request.models?.[0]).toMatchObject({
    modalities: ['text', 'image'],
    toolsSupported: true,
    reasoningOptions: model.reasoningOptions,
    pricing: model.pricing,
  });
});

test('validation points at duplicate model identities and invalid limits before submit', () => {
  const form = createEmptyCustomProviderForm();
  form.providerId = 'campus';
  form.name = 'Campus';
  form.endpoint = 'https://models.example.edu/v1';
  form.models = [
    { ...createModelRow(), modelId: 'research', name: 'Research', contextWindow: '100', maxOutputTokens: '200' },
    { ...createModelRow(), modelId: 'research', name: 'Research copy', contextWindow: '100', maxOutputTokens: '50' },
  ];

  const validation = validateCustomProviderForm(form, new Set(), false, translate);
  expect(validation.valid).toBe(false);
  expect(validation.models[0]?.maxOutputTokens).toBe('settings.providers.native.invalidConfiguration');
  expect(validation.models[1]?.modelId).toBe('settings.providers.page.custom.error.duplicate');
});

test('the provider id rule follows OMP\'s selector grammar', () => {
  expect(isValidProviderID('Campus.2')).toBe(true);
  expect(isValidProviderID('campus_2-alpha')).toBe(true);

  for (const invalid of ['a/b', 'a#b', 'a@b', 'a:b', 'a b', '__proto__', 'constructor', 'prototype', '', 'a'.repeat(129)]) {
    expect(isValidProviderID(invalid)).toBe(false);
  }
  expect(isValidProviderID('a'.repeat(128))).toBe(true);

  expect(validateCustomProviderForm({ ...createEmptyCustomProviderForm(), providerId: 'a/b' }, new Set(), false, translate)
    .fields.providerId).toBe('settings.providers.page.custom.error.providerID.format');
});

test('provider ids are unique regardless of case', () => {
  const form = { ...createEmptyCustomProviderForm(), providerId: 'Campus.2' };
  expect(validateCustomProviderForm(form, new Set(['campus.2']), false, translate).fields.providerId)
    .toBe('settings.providers.page.custom.error.providerID.exists');
  expect(validateCustomProviderForm(form, new Set(['campus.3']), false, translate).fields.providerId)
    .toBeUndefined();
});

test('the request builder keeps a gateway query string unchanged', () => {
  const form = createEmptyCustomProviderForm();
  form.providerId = 'Campus.2';
  form.name = 'Campus';
  form.endpoint = 'https://res.openai.azure.com/openai/v1?api-version=2024-10-21';
  form.models[0]!.modelId = 'research';
  form.models[0]!.name = 'Research';
  form.models[0]!.contextWindow = '32768';
  form.models[0]!.maxOutputTokens = '4096';

  expect(validateCustomProviderForm(form, new Set(), false, translate).fields.endpoint).toBeUndefined();
  expect(buildCustomProviderRequest(form, '4').request.configuration.endpoint)
    .toBe('https://res.openai.azure.com/openai/v1?api-version=2024-10-21');
});

test('the base URL still refuses fragments and embedded credentials', () => {
  for (const endpoint of [
    'https://user:secret@models.example.edu/v1',
    'https://user@models.example.edu/v1',
    'https://models.example.edu/v1#section',
    'ftp://models.example.edu/v1',
  ]) {
    const form = { ...createEmptyCustomProviderForm(), endpoint };
    expect(validateCustomProviderForm(form, new Set(), false, translate).fields.endpoint)
      .toBe('settings.providers.page.custom.error.baseURL.format');
  }
});

test('audio and embedding chips follow the native kind the writer accepts', () => {
  expect(modelModalitiesForKind('chat')).toEqual(['text', 'image']);
  expect(modelModalitiesForKind('tts')).toEqual(['text', 'image', 'audio']);
  expect(modelModalitiesForKind('stt')).toEqual(['text', 'image', 'audio']);
  expect(modelModalitiesForKind('embedding')).toEqual(['text', 'image', 'embedding']);

  // A saved chat row can still carry an audio modality; the request drops it
  // instead of sending a combination the writer rejects with 422.
  expect(normalizeModelModalities('chat', ['text', 'audio'])).toEqual(['text']);
  expect(normalizeModelModalities('embedding', ['text', 'audio'])).toEqual(['text']);
  expect(normalizeModelModalities('tts', ['audio'])).toEqual(['text', 'audio']);
});

test('a tts row keeps audio in the built request', () => {
  const form = createEmptyCustomProviderForm();
  form.providerId = 'speech';
  form.name = 'Speech';
  form.endpoint = 'https://models.example.edu/v1';
  form.models[0]!.modelId = 'voice';
  form.models[0]!.name = 'Voice';
  form.models[0]!.contextWindow = '4096';
  form.models[0]!.maxOutputTokens = '1024';
  form.models[0]!.nativeKind = 'tts';
  form.models[0]!.modalities = ['text', 'audio'];

  expect(buildCustomProviderRequest(form, '4').request.models?.[0]?.modalities).toEqual(['text', 'audio']);
});

test('a row carries the native kind a saved model implies', () => {
  const embedding = createModelRow({
    modelId: 'embed', provider: 'campus', name: 'Embed', modalities: ['text', 'embedding'],
    contextWindow: 8192, maxOutputTokens: 1024, reasoningEffortSupported: false,
    reasoningOptions: [], variants: [], pricing: null,
  });
  expect(embedding.nativeKind).toBe('embedding');
  expect(embedding.modalities).toEqual(['text', 'embedding']);

  const speech = createModelRow({
    modelId: 'voice', provider: 'campus', name: 'Voice', modalities: ['text', 'audio'],
    contextWindow: 8192, maxOutputTokens: 1024, reasoningEffortSupported: false,
    reasoningOptions: [], variants: [], pricing: null,
  });
  // OMP publishes audio only for a tts/stt runner, so the modality identifies
  // the kind and the row keeps offering the audio chip.
  expect(speech.nativeKind).toBe('tts');
  expect(speech.modalities).toEqual(['text', 'audio']);
});

test('validation rejects a taken provider id only when creating', () => {
  const form = createEmptyCustomProviderForm();
  form.providerId = 'campus';
  form.name = 'Campus';
  form.endpoint = 'https://models.example.edu/v1';
  form.models[0]!.modelId = 'research';
  form.models[0]!.name = 'Research';
  form.models[0]!.contextWindow = '1024';
  form.models[0]!.maxOutputTokens = '512';

  expect(validateCustomProviderForm(form, new Set(['campus']), false, translate).fields.providerId)
    .toBe('settings.providers.page.custom.error.providerID.exists');
  expect(validateCustomProviderForm(form, new Set(['campus']), true, translate).fields.providerId)
    .toBeUndefined();
});
