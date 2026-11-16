import express from 'express';
import { z } from 'zod';
import { ProblemDetailsSchema } from '@openchamber/agent-contract';
import { isEnterpriseMode } from '../enterprise-mode.js';

/**
 * Model info for auto-fill: OMP's bundled catalog answers first, and the Host
 * answers for the ids it misses from OpenRouter's public model list.
 *
 * The outbound request is a plain GET of the public list: no model ids, no
 * keys, no cookies, no conversation content. Ids are matched here, locally.
 * Enterprise mode refuses the request before it is made; the UI then reports
 * the catalog-only result.
 */

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8000;
// The full public list is well under a megabyte; the cap only stops a
// surprise response from filling memory.
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

const ModelIdSchema = z.string().trim().min(1).max(256);

const ModelInfoRequestSchema = z.strictObject({
  modelIds: z.array(ModelIdSchema).min(1).max(200),
});

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** USD per token in the public list; the catalog price is USD per million tokens. */
const perMillion = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  // Six decimals keep a third-of-a-cent price from carrying binary noise.
  return Math.round(parsed * 1_000_000 * 1_000_000) / 1_000_000;
};

/**
 * An id with its variant suffix folded: `xiaomi/mimo-v2-flash:free` and
 * `xiaomi/mimo-v2-flash` share an identity, while `other/jamba` does not
 * become `acme/jamba`. Variant folding never joins two publishers.
 */
const foldVariant = (id) => String(id).trim().toLowerCase().replace(/:/g, '-').replace(/-(free|cloud)$/, '');

/**
 * The key an id is matched by: the segment after the last `/`, lowercased,
 * with `:` written as `-` and a `free`/`cloud` variant suffix dropped.
 * OpenRouter publishes variants such as `xiaomi/mimo-v2-flash:free`; a
 * models.yml entry usually names the base id.
 */
const matchKey = (id) => foldVariant(id).split('/').pop() ?? '';

// One index per fetched list, so repeat lookups walk nothing.
const indexes = new WeakMap();

const buildIndex = (models) => {
  const cached = indexes.get(models);
  if (cached) return cached;
  const exact = new Map();
  const byKey = new Map();
  for (const model of models) {
    const id = typeof model?.id === 'string' ? model.id : null;
    if (!id) continue;
    const lowered = id.toLowerCase();
    if (!exact.has(lowered)) exact.set(lowered, model);
    const key = matchKey(id);
    if (!key) continue;
    const entry = byKey.get(key) ?? { identities: new Set(), candidates: [] };
    entry.identities.add(foldVariant(id));
    entry.candidates.push(model);
    byKey.set(key, entry);
  }
  const unique = new Map();
  for (const [key, entry] of byKey) {
    // A bare basename answers only when one publisher owns it; two publishers
    // with the same basename stay distinguishable by their exact ids.
    if (entry.identities.size !== 1) continue;
    const [preferred] = [...entry.candidates].sort((left, right) => (left.id.includes(':') ? 1 : 0) - (right.id.includes(':') ? 1 : 0) || left.id.length - right.id.length);
    unique.set(key, preferred);
  }
  const index = { exact, byKey: unique };
  indexes.set(models, index);
  return index;
};

/** The public model list this id would match, by exact id first and then by a unique base id. */
const findModel = (index, modelId) => index.exact.get(modelId.toLowerCase()) ?? index.byKey.get(matchKey(modelId)) ?? null;

const inputModalities = (model) => {
  const declared = Array.isArray(model?.architecture?.input_modalities)
    ? model.architecture.input_modalities
    : typeof model?.architecture?.modality === 'string'
      ? model.architecture.modality.split('->')[0].split('+')
      : [];
  const inputs = new Set(declared.filter((entry) => entry === 'text' || entry === 'image'));
  return [...inputs];
};

/**
 * Projects one public model to the catalog info auto-fill writes, or `null`
 * when the listed model cannot answer without invented numbers.
 */
const toCatalogInfo = (model) => {
  const contextWindow = isPositiveInteger(model?.top_provider?.context_length)
    ? model.top_provider.context_length
    : isPositiveInteger(model?.context_length)
      ? model.context_length
      : null;
  const maxTokens = isPositiveInteger(model?.top_provider?.max_completion_tokens)
    ? model.top_provider.max_completion_tokens
    : null;
  const input = inputModalities(model);
  const inputPrice = perMillion(model?.pricing?.prompt);
  const outputPrice = perMillion(model?.pricing?.completion);
  if (contextWindow === null || maxTokens === null || input.length === 0 || inputPrice === null || outputPrice === null) return null;

  const cost = {
    input: inputPrice,
    output: outputPrice,
    // The shared catalog contract wants a number in every slot; OMP's own
    // catalog writes 0 for a price it does not publish.
    cacheRead: perMillion(model?.pricing?.input_cache_read) ?? 0,
    cacheWrite: perMillion(model?.pricing?.input_cache_write) ?? 0,
  };
  const supportedParameters = Array.isArray(model?.supported_parameters) ? model.supported_parameters : null;
  const toolsSupported = supportedParameters
    ? supportedParameters.includes('tools') || supportedParameters.includes('tool_choice')
    : undefined;

  return {
    source: 'openrouter',
    input,
    contextWindow,
    maxTokens,
    cost,
    reasoning: Boolean(model?.reasoning) || Boolean(supportedParameters?.includes('reasoning')) || Boolean(supportedParameters?.includes('include_reasoning')),
    ...(toolsSupported === undefined ? {} : { toolsSupported }),
  };
};

const fetchModels = async ({ url, fetchImpl, timeoutMs }) => {
  if (!isHttpsUrl(url)) {
    throw new Error('OpenRouter model info requires an https URL');
  }
  // The signal asks a real fetch to stop; the race keeps a fetch that ignores
  // its signal from holding the route open.
  const request = (async () => {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`OpenRouter responded with status ${response.status}`);
    }
    const declaredLength = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      throw new Error('OpenRouter returned an oversized payload');
    }
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error('OpenRouter returned an oversized payload');
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('OpenRouter returned invalid JSON');
    }
    if (!Array.isArray(payload?.data)) {
      throw new Error('OpenRouter returned an unexpected payload');
    }
    return payload.data;
  })();

  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('OpenRouter did not answer in time')), timeoutMs);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
    // A late answer has nowhere to go; keep its rejection from becoming fatal.
    request.catch(() => { });
  }
};

/**
 * Remembers OpenRouter's public model list for a short while, so repeated
 * auto-fill clicks do not refetch it. A failed fetch is never cached as an
 * empty list: the caller gets the error and answers 502.
 */
export const createOpenRouterModelCatalog = ({
  fetchImpl = globalThis.fetch,
  url = OPENROUTER_MODELS_URL,
  ttlMs = DEFAULT_TTL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = Date.now,
} = {}) => {
  let models = null;
  let fetchedAt = 0;
  let inflight = null;

  const load = async () => {
    const current = now();
    if (models && current - fetchedAt < ttlMs) return models;
    if (!inflight) {
      inflight = fetchModels({ url, fetchImpl, timeoutMs })
        .then((fetched) => {
          models = fetched;
          fetchedAt = now();
          return fetched;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  };

  return {
    /** Matched ids only, in request order; unknown ids are left out. */
    async lookup(modelIds) {
      const fetched = await load();
      const index = buildIndex(fetched);
      const seen = new Set();
      const result = [];
      for (const requested of modelIds) {
        const modelId = requested.trim();
        if (seen.has(modelId)) continue;
        seen.add(modelId);
        const model = findModel(index, modelId);
        if (!model) continue;
        const catalog = toCatalogInfo(model);
        if (!catalog) continue;
        result.push({ modelId, catalog });
      }
      return result;
    },
  };
};

const problem = (res, status, code, detail, title = 'Model info unavailable') => {
  res.setHeader('Cache-Control', 'no-store');
  res.type('application/problem+json');
  return res.status(status).json(ProblemDetailsSchema.parse({
    type: `urn:ohpichamber:problem:${code}`,
    title,
    status,
    detail,
    code,
    retryable: status >= 500,
  }));
};

/**
 * `POST /api/openchamber/openrouter/model-info` with `{ modelIds }`. The route
 * is registered by Host composition; the enterprise refusal is decided here,
 * at the request that crosses the boundary. `enterprisePolicyOptions` is for
 * tests that inject a policy instead of setting the environment.
 */
export const registerOpenRouterModelInfoRoute = (app, {
  fetchImpl,
  enterprisePolicyOptions,
  url,
  ttlMs,
  timeoutMs,
  now,
} = {}) => {
  const catalog = createOpenRouterModelCatalog({ fetchImpl, url, ttlMs, timeoutMs, now });
  const refusals = {
    enterprise: (res) => problem(res, 403, 'enterprise_mode', 'Model info from OpenRouter is not available in enterprise mode.'),
    invalid: (res) => problem(res, 400, 'INVALID_REQUEST', 'Send 1 to 200 modelIds, each a non-empty string of at most 256 characters.', 'Model info request invalid'),
  };
  const refuseInEnterpriseMode = (req, res, next) => (isEnterpriseMode(enterprisePolicyOptions)
    ? refusals.enterprise(res)
    : next());
  // A body the parser rejects (malformed JSON, wrong content type, too large)
  // is answered like the route's own validation failures.
  const jsonBody = (req, res, next) => express.json({ limit: '64kb', strict: true })(req, res, (error) => {
    if (!error) return next();
    if (error.status === 413) return problem(res, 413, 'PAYLOAD_TOO_LARGE', 'The model info request body exceeds 64 KiB.', 'Model info request invalid');
    return refusals.invalid(res);
  });

  app.post(
    '/api/openchamber/openrouter/model-info',
    refuseInEnterpriseMode,
    jsonBody,
    async (req, res) => {
      const parsed = ModelInfoRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return refusals.invalid(res);
      }
      try {
        const models = await catalog.lookup(parsed.data.modelIds);
        res.setHeader('Cache-Control', 'no-store');
        return res.json({ models });
      } catch (error) {
        console.warn('Failed to fetch OpenRouter model info:', error?.message || error);
        return problem(res, 502, 'PROVIDER_UNAVAILABLE', 'OpenRouter model info is unavailable');
      }
    },
  );
};
