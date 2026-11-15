#!/usr/bin/env bun
// Local OAuth-protected MCP fixture.
//
// Models what a hosted OAuth MCP server (Linear, Figma) exposes — protected
// resource metadata, authorization-server metadata, dynamic client
// registration, an authorization endpoint with PKCE S256, a token endpoint,
// and a bearer-protected Streamable HTTP MCP endpoint — so the OpenChamber
// MCP sign-in loop can be driven end to end without a vendor account.
//
// Usage: bun scripts/mcp-oauth-fixture/server.mjs [--port 41441] [--no-dcr]
//          [--challenge-403] [--consent-page]
//
// Everything is in memory, bound to 127.0.0.1, and tokens are random per run.

import { randomBytes } from 'node:crypto';

export const PREREGISTERED_CLIENT_ID = 'fixture-preregistered';

const PROTOCOL_VERSION = '2025-11-25';
const SCOPES = ['mcp:read'];

const usage = `Usage: bun scripts/mcp-oauth-fixture/server.mjs [options]

Options:
  --port <n>        Port to bind on 127.0.0.1 (default 41441; 0 picks a free port)
  --no-dcr          Reject dynamic client registration with 403
                    {"error":"unapproved_client"} (models Figma, which advertises
                    its registration endpoint but only approves listed clients)
  --challenge-403   Answer an unauthenticated MCP request with 403 instead of 401
  --consent-page    Serve a one-button consent page instead of redirecting at once
  --deny            Redirect back with error=access_denied instead of issuing a code
  --help            Print this text
`;

/** Server options; `dynamicRegistration: false` models a provider with closed DCR. */
export function normalizeOptions(partial = {}) {
  return {
    port: partial.port ?? 41441,
    dynamicRegistration: partial.dynamicRegistration ?? true,
    challengeStatus: partial.challengeStatus ?? 401,
    consentPage: partial.consentPage ?? false,
    deny: partial.deny ?? false,
    quiet: partial.quiet ?? false,
  };
}

function parseArguments(argv) {
  const partial = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      process.stdout.write(usage);
      process.exit(0);
    } else if (argument === '--no-dcr') {
      partial.dynamicRegistration = false;
    } else if (argument === '--challenge-403') {
      partial.challengeStatus = 403;
    } else if (argument === '--consent-page') {
      partial.consentPage = true;
    } else if (argument === '--deny') {
      partial.deny = true;
    } else if (argument === '--port' || argument.startsWith('--port=')) {
      const raw = argument === '--port' ? argv[(index += 1)] : argument.slice('--port='.length);
      const port = Number(raw);
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        process.stderr.write(`Invalid --port value: ${String(raw)}\n${usage}`);
        process.exit(2);
      }
      partial.port = port;
    } else {
      process.stderr.write(`Unknown option: ${argument}\n${usage}`);
      process.exit(2);
    }
  }
  return normalizeOptions(partial);
}

/**
 * Decode a JSON string value at the request boundary. The fixture receives
 * untyped JSON, so every field it trusts passes through here instead of being
 * narrowed ad hoc at each use site.
 */
function readString(value) {
  return Object.prototype.toString.call(value) === '[object String]' ? value : undefined;
}

const randomToken = () => randomBytes(32).toString('hex');
const randomId = () => randomBytes(16).toString('hex');
const truncateChallenge = challenge => (challenge.length > 8 ? `${challenge.slice(0, 8)}…` : challenge);

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

function htmlResponse(body) {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
}

function isLoopbackRedirect(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
}

function pkceChallengeFor(verifier) {
  return crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(verifier))
    .then(digest => Buffer.from(digest).toString('base64url'));
}

/**
 * Start one fixture instance on 127.0.0.1.
 * Returns the bound origin plus the debug state the `__state` route serves.
 */
export function createFixture(partialOptions = {}) {
  const options = normalizeOptions(partialOptions);
  const log = message => {
    if (!options.quiet) process.stdout.write(`[fixture] ${message}\n`);
  };

  const clients = new Map();
  const codes = new Map();
  const accessTokens = new Set();
  const refreshTokens = new Set();
  const pendingConsents = new Map();
  const counters = { registrations: 0, authorizationCodes: 0, tokens: 0 };
  let lastAuthorize = null;

  function clientById(clientId) {
    if (clientId === PREREGISTERED_CLIENT_ID) {
      return { clientId, preregistered: true, redirectUris: [] };
    }
    return clients.get(clientId);
  }

  function redirectUriAllowed(client, redirectUri) {
    if (client.preregistered) return isLoopbackRedirect(redirectUri);
    return client.redirectUris.includes(redirectUri);
  }

  function mcpChallenge(base) {
    // RFC 6750 §3: a request that carries no credentials gets the bare
    // challenge; `error="invalid_token"` belongs only to a rejected token.
    return jsonResponse(
      { error: 'unauthorized', error_description: 'Authentication required.' },
      options.challengeStatus,
      {
        'WWW-Authenticate':
          `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/mcp", scope="${SCOPES.join(' ')}"`,
      },
    );
  }

  function protectedResourceMetadata(base) {
    return {
      resource: `${base}/mcp`,
      authorization_servers: [base],
      scopes_supported: SCOPES,
      bearer_methods_supported: ['header'],
      resource_name: 'OAuth MCP fixture',
    };
  }

  function authorizationServerMetadata(base) {
    const metadata = {
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      scopes_supported: SCOPES,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
    };
    // Figma advertises its registration endpoint and rejects every unlisted
    // client with 403 unapproved_client; keeping the field present under
    // --no-dcr reproduces that path instead of the "no DCR advertised" one.
    metadata.registration_endpoint = `${base}/register`;
    return metadata;
  }

  async function registerClient(request) {
    const body = await request.json();
    const redirectUris = Array.isArray(body.redirect_uris)
      ? body.redirect_uris.map(readString).filter(uri => uri !== undefined)
      : [];
    if (redirectUris.length === 0) {
      return jsonResponse({ error: 'invalid_redirect_uri', error_description: 'redirect_uris is required.' }, 400);
    }
    const clientId = `fixture-client-${randomId()}`;
    clients.set(clientId, { clientId, redirectUris, clientName: String(body.client_name ?? '') });
    counters.registrations += 1;
    log(`registered client ${clientId}`);
    return jsonResponse(
      {
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        redirect_uris: redirectUris,
        client_name: body.client_name ?? 'mcp-oauth-fixture-client',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      },
      201,
    );
  }

  /** RFC 6749 §4.1.2.1: a refused authorization returns the error to the client. */
  function issueDenial(params) {
    const location = new URL(params.redirect_uri);
    location.searchParams.set('error', 'access_denied');
    location.searchParams.set('error_description', 'The user denied the request.');
    location.searchParams.set('state', params.state);
    return location.toString();
  }

  function issueCode(params) {
    const code = randomToken();
    codes.set(code, {
      clientId: params.client_id,
      redirectUri: params.redirect_uri,
      state: params.state,
      codeChallenge: params.code_challenge,
      used: false,
    });
    counters.authorizationCodes += 1;
    const location = new URL(params.redirect_uri);
    location.searchParams.set('code', code);
    location.searchParams.set('state', params.state);
    return location.toString();
  }

  function consentPageHtml(requestId, params) {
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Sign in to the MCP fixture</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f5f5f4;color:#1c1917}main{max-width:32rem;padding:2rem;background:#fff;border-radius:0.75rem;box-shadow:0 1px 3px rgba(0,0,0,.12)}code{background:#f5f5f4;padding:.1rem .3rem;border-radius:.25rem}button{margin-top:1rem;padding:.6rem 1.2rem;border:0;border-radius:.5rem;background:#1c1917;color:#fff;font-size:1rem;cursor:pointer}</style>
</head><body><main>
<h1>Sign in to the MCP OAuth fixture</h1>
<p>Client <code>${escapeHtml(params.client_id)}</code> asks to call the fixture's tools.</p>
<p>It will return to <code>${escapeHtml(params.redirect_uri)}</code>.</p>
<form method="get" action="/authorize/consent">
<input type="hidden" name="request_id" value="${escapeHtml(requestId)}">
<button type="submit">Allow</button>
</form>
</main></body></html>`;
  }

  function handleAuthorization(url) {
    const params = Object.fromEntries(url.searchParams);
    lastAuthorize = {
      client_id: params.client_id,
      redirect_uri: params.redirect_uri,
      response_type: params.response_type,
      scope: params.scope,
      state: params.state,
      code_challenge: params.code_challenge ? truncateChallenge(params.code_challenge) : undefined,
      code_challenge_method: params.code_challenge_method,
      resource: params.resource,
    };
    log(`authorize ${JSON.stringify(lastAuthorize)}`);

    const client = clientById(params.client_id);
    if (!client) return jsonResponse({ error: 'invalid_client', error_description: 'Unknown client_id.' }, 400);
    if (params.response_type !== 'code') {
      return jsonResponse({ error: 'unsupported_response_type', error_description: 'response_type must be code.' }, 400);
    }
    if (!params.redirect_uri) {
      return jsonResponse({ error: 'invalid_request', error_description: 'redirect_uri is required.' }, 400);
    }
    if (!redirectUriAllowed(client, params.redirect_uri)) {
      return jsonResponse(
        { error: 'invalid_request', error_description: 'redirect_uri is not registered for this client.' },
        400,
      );
    }
    if (!params.state) return jsonResponse({ error: 'invalid_request', error_description: 'state is required.' }, 400);
    if (!params.code_challenge) {
      return jsonResponse({ error: 'invalid_request', error_description: 'code_challenge is required.' }, 400);
    }
    if (params.code_challenge_method !== 'S256') {
      return jsonResponse(
        { error: 'invalid_request', error_description: 'code_challenge_method must be S256.' },
        400,
      );
    }

    if (options.deny) {
      return new Response(null, { status: 302, headers: { Location: issueDenial(params) } });
    }

    if (!options.consentPage) {
      return new Response(null, { status: 302, headers: { Location: issueCode(params) } });
    }

    const requestId = randomId();
    pendingConsents.set(requestId, params);
    return htmlResponse(consentPageHtml(requestId, params));
  }

  function handleConsent(url) {
    const requestId = url.searchParams.get('request_id');
    const params = requestId ? pendingConsents.get(requestId) : undefined;
    if (!params) return jsonResponse({ error: 'invalid_request', error_description: 'Unknown consent request.' }, 400);
    pendingConsents.delete(requestId);
    return new Response(null, { status: 302, headers: { Location: issueCode(params) } });
  }

  async function handleToken(request) {
    const form = new URLSearchParams(await request.text());
    const grantType = form.get('grant_type');

    if (grantType === 'refresh_token') {
      const refreshToken = form.get('refresh_token');
      if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return jsonResponse({ error: 'invalid_grant', error_description: 'Unknown refresh token.' }, 400);
      }
      refreshTokens.delete(refreshToken);
      const accessToken = randomToken();
      const rotatedRefreshToken = randomToken();
      accessTokens.add(accessToken);
      refreshTokens.add(rotatedRefreshToken);
      counters.tokens += 1;
      log('token grant_type=refresh_token ok');
      return jsonResponse({
        access_token: accessToken,
        refresh_token: rotatedRefreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: SCOPES.join(' '),
      });
    }

    if (grantType !== 'authorization_code') {
      return jsonResponse(
        { error: 'unsupported_grant_type', error_description: `Unsupported grant_type: ${String(grantType)}` },
        400,
      );
    }

    const code = form.get('code');
    const entry = code ? codes.get(code) : undefined;
    if (!entry) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'Unknown authorization code.' }, 400);
    }
    if (entry.used) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'Authorization code was already used.' }, 400);
    }
    if (form.get('client_id') !== entry.clientId) {
      return jsonResponse(
        { error: 'invalid_grant', error_description: 'client_id does not match the authorization request.' },
        400,
      );
    }
    if (form.get('redirect_uri') !== entry.redirectUri) {
      return jsonResponse(
        { error: 'invalid_grant', error_description: 'redirect_uri does not match the authorization request.' },
        400,
      );
    }
    const verifier = form.get('code_verifier');
    if (!verifier) return jsonResponse({ error: 'invalid_grant', error_description: 'code_verifier is required.' }, 400);
    if ((await pkceChallengeFor(verifier)) !== entry.codeChallenge) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'PKCE verification failed.' }, 400);
    }

    entry.used = true;
    const accessToken = randomToken();
    const refreshToken = randomToken();
    accessTokens.add(accessToken);
    refreshTokens.add(refreshToken);
    counters.tokens += 1;
    log('token grant_type=authorization_code ok');
    return jsonResponse({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: SCOPES.join(' '),
    });
  }

  function handleMcpRequest(message) {
    const method = message ? readString(message.method) : undefined;
    if (!message || message.jsonrpc !== '2.0' || method === undefined) {
      return jsonResponse(
        { jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid JSON-RPC request' } },
        400,
      );
    }
    const params = message.params ?? {};
    log(`mcp ${method}${params.name ? ` name=${params.name}` : ''}`);

    if (!Object.hasOwn(message, 'id')) return new Response(null, { status: 202 });
    const reply = result => jsonResponse({ jsonrpc: '2.0', id: message.id, result });

    switch (method) {
      case 'initialize':
        return reply({
          protocolVersion: readString(params.protocolVersion) ?? PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'mcp-oauth-fixture', version: '1.0.0' },
          instructions: 'Local OAuth MCP fixture. The only tool echoes text.',
        });
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({
          tools: [
            {
              name: 'echo',
              description: 'Echo the provided text back.',
              inputSchema: {
                type: 'object',
                properties: { text: { type: 'string' } },
                required: ['text'],
                additionalProperties: false,
              },
            },
          ],
        });
      case 'tools/call':
        if (params.name !== 'echo') {
          return jsonResponse(
            { jsonrpc: '2.0', id: message.id, error: { code: -32602, message: `Unknown tool: ${String(params.name)}` } },
            400,
          );
        }
        return reply({ content: [{ type: 'text', text: String(params.arguments?.text ?? '') }], isError: false });
      default:
        return jsonResponse(
          { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not found: ${method}` } },
          200,
        );
    }
  }

  async function handleMcp(request, base) {
    const authorization = request.headers.get('Authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
    if (!token || !accessTokens.has(token)) return mcpChallenge(base);

    if (request.method === 'GET') {
      return new Response('SSE is not offered by the fixture; send POST requests.', {
        status: 405,
        headers: { Allow: 'POST, DELETE' },
      });
    }
    if (request.method === 'DELETE') return new Response(null, { status: 204 });

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
    }
    if (Array.isArray(body)) {
      return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Batch unsupported' } }, 400);
    }
    return handleMcpRequest(body);
  }

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: options.port,
    idleTimeout: 30,
    async fetch(request) {
      const url = new URL(request.url);
      const base = url.origin;
      const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

      if (path === '/__state' && request.method === 'GET') {
        return jsonResponse({
          base,
          dynamicRegistration: options.dynamicRegistration,
          challengeStatus: options.challengeStatus,
          consentPage: options.consentPage,
          registeredClients: clients.size,
          issuedAuthorizationCodes: counters.authorizationCodes,
          issuedTokens: counters.tokens,
          activeAccessTokens: accessTokens.size,
          activeRefreshTokens: refreshTokens.size,
          lastAuthorize,
        });
      }

      if (path === '/mcp') return handleMcp(request, base);
      if (path === '/.well-known/oauth-protected-resource' || path === '/.well-known/oauth-protected-resource/mcp') {
        return jsonResponse(protectedResourceMetadata(base));
      }
      if (
        path === '/.well-known/oauth-authorization-server' ||
        path === '/.well-known/oauth-authorization-server/mcp'
      ) {
        return jsonResponse(authorizationServerMetadata(base));
      }
      if (path === '/register' && request.method === 'POST') {
        if (!options.dynamicRegistration) {
          return jsonResponse(
            {
              error: 'unapproved_client',
              error_description: 'Dynamic client registration is closed for this provider.',
            },
            403,
          );
        }
        return registerClient(request);
      }
      if (path === '/authorize' && request.method === 'GET') return handleAuthorization(url);
      if (path === '/authorize/consent' && request.method === 'GET') return handleConsent(url);
      if (path === '/token' && request.method === 'POST') return handleToken(request);

      return jsonResponse({ error: 'not_found', error_description: `No route for ${request.method} ${path}` }, 404);
    },
  });

  const origin = `http://127.0.0.1:${server.port}`;
  return {
    origin,
    mcpUrl: `${origin}/mcp`,
    stop: () => server.stop(true),
  };
}

if (import.meta.main) {
  const options = parseArguments(process.argv.slice(2));
  const fixture = createFixture(options);
  process.stdout.write(`[fixture] listening on ${fixture.mcpUrl}\n`);
  process.stdout.write(
    `[fixture] protected resource metadata: ${fixture.origin}/.well-known/oauth-protected-resource/mcp\n`,
  );
  process.stdout.write(
    `[fixture] mode: ${options.dynamicRegistration ? 'dynamic registration' : 'no DCR (preregistered client only)'}, challenge ${options.challengeStatus}, ${options.consentPage ? 'consent page' : 'auto-consent'}\n`,
  );
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      fixture.stop();
      process.exit(0);
    });
  }
}
