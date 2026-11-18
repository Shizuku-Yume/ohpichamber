import * as C from '@openchamber/agent-contract';

/**
 * The Host's share of an MCP sign-in that a browser finishes on another
 * machine.
 *
 * A local desktop runtime keeps the Agent Service loopback, so the code lands
 * on the same machine that runs the worker. Remote Web, mobile, and a desktop
 * attached to a remote Host cannot reach that loopback, so the UI hands the
 * provider the Host's own callback URL instead. That URL is public (the
 * provider's redirect carries no UI bearer), which means the only thing that
 * can authorize the handoff is a `state` this Host issued.
 *
 * The Host learns that state from the `start` response it proxied: the pending
 * flow's authorization URL carries the state the worker generated and expects
 * back. It records it here, in memory, together with the owner a later
 * `complete` must address. The map is deliberately small, swept on use, and
 * bounded: a stale entry is worthless after the flow's five-minute budget, and
 * a browser that keeps reloading a callback must not grow Host memory.
 */

/** The public redirect the UI writes into a remote flow's `redirectUri`. The
 * path itself lives in the contract, which the UI reads too, so the two sides
 * cannot drift; this name keeps the Host modules' existing spelling. */
export const MCP_OAUTH_CALLBACK_PATH = C.MCP_OAUTH_HOST_CALLBACK_PATH;

/** The worker's own budget for one browser handoff; a state never outlives it. */
const FLOW_BUDGET_MS = 5 * 60_000;

const escapeHtml = (value) => String(value)
 .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
 .replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;')
 .replace(/'/g, '&#39;');

/** A small, self-contained page: the browser shows it, nothing else renders it. */
export const renderMcpOAuthCallbackPage = ({ title, message }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — OhPiChamber</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: Canvas; color: CanvasText; }
  main { max-width: 34rem; padding: 2.5rem 2rem; text-align: center; }
  h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
  p { margin: 0; line-height: 1.5; opacity: 0.85; overflow-wrap: anywhere; }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(message)}</p>
</main>
</body>
</html>`;

/**
 * The pending-state map. `record` ignores an authorization URL without a state
 * (there is nothing to validate later) and a state already in flight (the
 * first flow owns it; a second start must not retarget the first one's
 * callback). `take` consumes: a replayed callback finds nothing.
 */
export const createMcpOAuthPendingFlows = ({
 currently = Date.now, ttlMs = FLOW_BUDGET_MS, maxEntries = 100,
} = {}) => {
 const now = currently;
 const entries = new Map();
 const invalidate = (entry) => entry.expiresAt <= now();
 const sweep = () => {
  for (const [state, entry] of entries) if (invalidate(entry)) entries.delete(state);
 };
 const take = (state) => {
  if (typeof state !== 'string' || !state) return null;
  sweep();
  const entry = entries.get(state);
  if (!entry) return null;
  entries.delete(state);
  return entry;
 };
 /** Record one pending flow; the returned entry is what `complete` addresses. */
 const record = ({ authorizationUrl, completionPath, workspaceId, serverId, flowId, persistedRevision, workerGeneration }) => {
  if (typeof authorizationUrl !== 'string' || typeof completionPath !== 'string' || !completionPath.startsWith('/')) return null;
  let state;
  try { state = new URL(authorizationUrl).searchParams.get('state'); } catch { return null; }
  if (!state || state.length > 512 || entries.has(state)) return null;
  sweep();
  while (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
  const entry = {
   completionPath, workspaceId, serverId, flowId, persistedRevision, workerGeneration,
   expiresAt: now() + Math.min(ttlMs, FLOW_BUDGET_MS),
  };
  entries.set(state, entry);
  return entry;
 };
 /** Remove every pending state of one server; a terminal answer ends all of them. */
 const dropServer = (workspaceId, serverId) => {
  for (const [state, entry] of entries) {
   if (entry.workspaceId === workspaceId && entry.serverId === serverId) entries.delete(state);
  }
 };
 return { record, take, dropServer, size: () => entries.size };
};

/**
 * Rebuild the callback URL from what this Host knows: its own scheme, host and
 * route, plus the query the provider appended. A client cannot supply a target
 * that the Host would then present as its own.
 */
export const callbackUrlForRequest = (req) => {
 // `req.protocol` and `req.host` honour the app's `trust proxy` setting, so a
 // direct client cannot spoof the address the Host reports as its own; only a
 // trusted proxy's `X-Forwarded-Proto`/`X-Forwarded-Host` is read.
 const proto = typeof req.protocol === 'string' && req.protocol ? req.protocol : 'http';
 const host = typeof req.host === 'string' ? req.host : '';
 const original = typeof req.originalUrl === 'string' ? req.originalUrl : MCP_OAUTH_CALLBACK_PATH;
 const queryIndex = original.indexOf('?');
 const search = queryIndex === -1 ? '' : original.slice(queryIndex);
 const target = `${MCP_OAUTH_CALLBACK_PATH}${search}`;
 return host ? `${proto}://${host}${target}` : target;
};

const queryValue = (query, name) => {
 const value = query?.[name];
 return typeof value === 'string' ? value : undefined;
};

const boundedDetail = (value) => (value === undefined ? undefined : String(value).slice(0, 300));

/**
 * Validate one callback and, when it is valid, hand its code to the worker's
 * `complete` action. Returns the page to render; it never throws toward the
 * caller and never logs the code or the state.
 */
export const completeMcpOAuthCallback = async ({ service, pendingFlows, query, callbackUrl }) => {
 const state = queryValue(query, 'state');
 const entry = pendingFlows.take(state);
 if (!entry) {
  return {
   status: 400,
   title: 'Sign-in link is invalid',
   message: 'This sign-in link is unknown, has expired, or was already used. Start the sign-in again from OhPiChamber.',
  };
 }
 const providerError = queryValue(query, 'error');
 const providerDescription = boundedDetail(queryValue(query, 'error_description'));
 if (providerError === undefined && queryValue(query, 'code') === undefined) {
  return { status: 400, title: 'Sign-in was not completed', message: 'The provider did not return an authorization code.' };
 }
 if (service.getState().phase !== 'ready') {
  return { status: 503, title: 'Sign-in could not finish', message: 'The Agent Service is not running. Start OhPiChamber again and retry the sign-in.' };
 }
 const body = {
  action: 'complete',
  persistedRevision: entry.persistedRevision,
  workerGeneration: entry.workerGeneration,
  flowId: entry.flowId,
  callbackInput: callbackUrl,
 };
 try {
  const response = await service.request(entry.completionPath, {
   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  // A refused consent carries no code, so `complete` aborts the flow with its
  // own failure sentence; the pending poll reports that to the panel. The
  // browser still gets the provider's words here.
  if (providerError !== undefined) {
   await response.text().catch(() => '');
   return {
    status: 400,
    title: 'Sign-in was not completed',
    message: providerDescription ? `${boundedDetail(providerError)}: ${providerDescription}` : boundedDetail(providerError),
   };
  }
  if (!response.ok) {
   const parsed = C.ProblemDetailsSchema.safeParse(await response.json().catch(() => null));
   const detail = parsed.success ? parsed.data.detail : `The Agent Service answered HTTP ${response.status}.`;
   return { status: 502, title: 'Sign-in could not finish', message: boundedDetail(detail) };
  }
  const result = C.MCPOAuthResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) {
   return { status: 502, title: 'Sign-in could not finish', message: 'The Agent Service returned an unexpected answer.' };
  }
  if (result.data.status === 'authenticated') {
   return { status: 200, title: 'Sign-in complete', message: 'You can close this tab and return to OhPiChamber.' };
  }
  const detail = result.data.status === 'unauthenticated' ? result.data.error?.detail : undefined;
  return {
   status: 400,
   title: 'Sign-in was not completed',
   message: boundedDetail(detail) ?? 'The provider rejected the sign-in. Start it again from OhPiChamber.',
  };
 } catch {
  return { status: 502, title: 'Sign-in could not finish', message: 'The Agent Service could not be reached. Start OhPiChamber again and retry the sign-in.' };
 }
};
