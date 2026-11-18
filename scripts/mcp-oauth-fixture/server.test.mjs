import { afterEach, describe, expect, test } from 'bun:test';
import { createFixture, PREREGISTERED_CLIENT_ID } from './server.mjs';

const running = [];
afterEach(() => {
  while (running.length > 0) running.pop().stop();
});

function startFixture(options = {}) {
  const fixture = createFixture({ port: 0, quiet: true, ...options });
  running.push(fixture);
  return fixture;
}

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

async function pkcePair() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

function authorizationUrl(origin, params) {
  const url = new URL('/authorize', origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url;
}

function tokenRequest(origin, form) {
  return fetch(new URL('/token', origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(form).toString(),
  });
}

function mcpRequest(origin, body, token) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(new URL('/mcp', origin), { method: 'POST', headers, body: JSON.stringify(body) });
}

function redirectQuery(location) {
  return Object.fromEntries(new URL(location).searchParams);
}

// The OMP SDK lives in the agent-service dependency tree. Resolve it from there
// so the fixture is exercised by the same client the app uses, and skip the
// check when that dependency tree is not installed rather than failing.
const agentServiceEntry = new URL('../../packages/agent-service/src/worker/mcp.ts', import.meta.url);
const ompClient = await (async () => {
  try {
    return await import(import.meta.resolve('@oh-my-pi/pi-coding-agent/mcp/client', agentServiceEntry.href));
  } catch {
    return null;
  }
})();

async function mintAccessToken(origin) {
  const redirectUri = 'http://127.0.0.1:38998/callback';
  const client = await (
    await fetch(new URL('/register', origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_uris: [redirectUri] }),
    })
  ).json();
  const { verifier, challenge } = await pkcePair();
  const authorize = await fetch(
    authorizationUrl(origin, {
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: redirectUri,
      state: 'omp-client',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }),
    { redirect: 'manual' },
  );
  const code = redirectQuery(authorize.headers.get('Location')).code;
  const token = await (
    await tokenRequest(origin, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: client.client_id,
      code_verifier: verifier,
    })
  ).json();
  return token.access_token;
}

describe('OAuth MCP fixture', () => {
  test('serves the challenge, discovery metadata, DCR, PKCE exchange and an MCP session', async () => {
    const fixture = startFixture();
    const { origin } = fixture;

    // 1. Unauthenticated MCP traffic is challenged with the protected-resource URL.
    const challenge = await mcpRequest(origin, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    expect(challenge.status).toBe(401);
    expect(challenge.headers.get('WWW-Authenticate')).toBe(
      `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp", scope="mcp:read"`,
    );

    // 2. Protected-resource metadata names this origin as the authorization server.
    const resourceMetadata = await (await fetch(new URL('/.well-known/oauth-protected-resource/mcp', origin))).json();
    expect(resourceMetadata).toEqual({
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      scopes_supported: ['mcp:read'],
      bearer_methods_supported: ['header'],
      resource_name: 'OAuth MCP fixture',
    });
    const originRootMetadata = await (await fetch(new URL('/.well-known/oauth-protected-resource', origin))).json();
    expect(originRootMetadata.resource).toBe(`${origin}/mcp`);

    // 3. Authorization-server metadata advertises DCR, PKCE S256 and public clients.
    const serverMetadata = await (await fetch(new URL('/.well-known/oauth-authorization-server', origin))).json();
    expect(serverMetadata).toMatchObject({
      issuer: origin,
      authorization_endpoint: `${origin}/authorize`,
      token_endpoint: `${origin}/token`,
      registration_endpoint: `${origin}/register`,
      code_challenge_methods_supported: ['S256'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      response_types_supported: ['code'],
      token_endpoint_auth_methods_supported: ['none'],
    });
    const pathSuffixed = await (await fetch(new URL('/.well-known/oauth-authorization-server/mcp', origin))).json();
    expect(pathSuffixed.issuer).toBe(origin);

    // 4. Dynamic client registration echoes the loopback redirect it was given.
    const redirectUri = 'http://127.0.0.1:38991/callback';
    const registration = await fetch(new URL('/register', origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'omp-coding-agent',
        redirect_uris: [redirectUri],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        application_type: 'native',
      }),
    });
    expect(registration.status).toBe(201);
    const client = await registration.json();
    expect(client.client_id).toStartWith('fixture-client-');
    expect(client.redirect_uris).toEqual([redirectUri]);

    // 5. The authorize request is auto-consented with a 302 back to the redirect URI.
    const { verifier, challenge: codeChallenge } = await pkcePair();
    const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));
    const authorize = await fetch(
      authorizationUrl(origin, {
        response_type: 'code',
        client_id: client.client_id,
        redirect_uri: redirectUri,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: 'mcp:read',
        resource: `${origin}/mcp`,
      }),
      { redirect: 'manual' },
    );
    expect(authorize.status).toBe(302);
    const callback = redirectQuery(authorize.headers.get('Location'));
    expect(callback.state).toBe(state);
    expect(callback.code).toMatch(/^[0-9a-f]{64}$/);

    // The debug route reports the authorize parameters without the raw challenge.
    const stateBody = await (await fetch(new URL('/__state', origin))).json();
    expect(stateBody.lastAuthorize).toMatchObject({
      client_id: client.client_id,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      code_challenge_method: 'S256',
    });
    expect(stateBody.lastAuthorize.code_challenge).toBe(`${codeChallenge.slice(0, 8)}…`);
    expect(stateBody.registeredClients).toBe(1);

    // 6. The token endpoint verifies PKCE and returns a bearer token.
    const tokenResponse = await tokenRequest(origin, {
      grant_type: 'authorization_code',
      code: callback.code,
      redirect_uri: redirectUri,
      client_id: client.client_id,
      code_verifier: verifier,
    });
    expect(tokenResponse.status).toBe(200);
    const tokens = await tokenResponse.json();
    expect(tokens.token_type).toBe('Bearer');
    expect(tokens.expires_in).toBe(3600);
    expect(tokens.access_token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokens.refresh_token).toMatch(/^[0-9a-f]{64}$/);

    // 7. The bearer token opens the MCP session: initialize, initialized, tools/list, tools/call.
    const initialize = await mcpRequest(
      origin,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-11-25', capabilities: { roots: { listChanged: false } }, clientInfo: { name: 'fixture-check', version: '1' } },
      },
      tokens.access_token,
    );
    expect(initialize.status).toBe(200);
    const initialized = await initialize.json();
    expect(initialized.result.serverInfo.name).toBe('mcp-oauth-fixture');
    expect(initialized.result.protocolVersion).toBe('2025-11-25');

    const notification = await fetch(new URL('/mcp', origin), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
    });
    expect(notification.status).toBe(202);

    const listed = await mcpRequest(origin, { jsonrpc: '2.0', id: 2, method: 'tools/list' }, tokens.access_token);
    const tools = (await listed.json()).result.tools;
    expect(tools.map(tool => tool.name)).toEqual(['echo']);

    const called = await mcpRequest(
      origin,
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'echo', arguments: { text: 'fixture-ok' } } },
      tokens.access_token,
    );
    const call = await called.json();
    expect(call.result.content[0].text).toBe('fixture-ok');

    // 8. Refresh rotates the refresh token; the old one stops working.
    const refreshed = await tokenRequest(origin, { grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
    expect(refreshed.status).toBe(200);
    const rotated = await refreshed.json();
    expect(rotated.access_token).not.toBe(tokens.access_token);
    expect(rotated.refresh_token).not.toBe(tokens.refresh_token);
    const staleRefresh = await tokenRequest(origin, {
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    });
    expect(staleRefresh.status).toBe(400);

    // 9. GET /mcp is refused so the client does not hold an SSE stream open.
    const sse = await fetch(new URL('/mcp', origin), {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'text/event-stream' },
    });
    expect(sse.status).toBe(405);

    const finalState = await (await fetch(new URL('/__state', origin))).json();
    expect(finalState).toMatchObject({
      registeredClients: 1,
      issuedAuthorizationCodes: 1,
      issuedTokens: 2,
      activeAccessTokens: 2,
      activeRefreshTokens: 1,
    });
  });

  test('a wrong PKCE verifier and a reused code are both refused', async () => {
    const fixture = startFixture();
    const { origin } = fixture;
    const redirectUri = 'http://127.0.0.1:38992/callback';
    const client = await (
      await fetch(new URL('/register', origin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_uris: [redirectUri] }),
      })
    ).json();

    const { verifier, challenge } = await pkcePair();
    const authorize = await fetch(
      authorizationUrl(origin, {
        response_type: 'code',
        client_id: client.client_id,
        redirect_uri: redirectUri,
        state: 'state-1',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }),
      { redirect: 'manual' },
    );
    const code = redirectQuery(authorize.headers.get('Location')).code;
    const exchange = form => tokenRequest(origin, { redirect_uri: redirectUri, client_id: client.client_id, ...form });

    const mismatch = await exchange({ grant_type: 'authorization_code', code, code_verifier: 'not-the-verifier' });
    expect(mismatch.status).toBe(400);
    expect((await mismatch.json()).error_description).toBe('PKCE verification failed.');

    const accepted = await exchange({ grant_type: 'authorization_code', code, code_verifier: verifier });
    expect(accepted.status).toBe(200);

    const reused = await exchange({ grant_type: 'authorization_code', code, code_verifier: verifier });
    expect(reused.status).toBe(400);
    expect((await reused.json()).error_description).toBe('Authorization code was already used.');
  });

  test('authorize rejects an unregistered redirect and a missing S256 challenge', async () => {
    const fixture = startFixture();
    const { origin } = fixture;
    const redirectUri = 'http://127.0.0.1:38993/callback';
    const client = await (
      await fetch(new URL('/register', origin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_uris: [redirectUri] }),
      })
    ).json();
    const { challenge } = await pkcePair();

    const wrongRedirect = await fetch(
      authorizationUrl(origin, {
        response_type: 'code',
        client_id: client.client_id,
        redirect_uri: 'http://127.0.0.1:38994/callback',
        state: 's',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }),
    );
    expect(wrongRedirect.status).toBe(400);
    expect((await wrongRedirect.json()).error).toBe('invalid_request');

    const plainChallenge = await fetch(
      authorizationUrl(origin, {
        response_type: 'code',
        client_id: client.client_id,
        redirect_uri: redirectUri,
        state: 's',
        code_challenge: challenge,
        code_challenge_method: 'plain',
      }),
    );
    expect(plainChallenge.status).toBe(400);
    expect((await plainChallenge.json()).error_description).toBe('code_challenge_method must be S256.');
  });

  test('--consent-page renders a one-button page that then redirects', async () => {
    const fixture = startFixture({ consentPage: true });
    const { origin } = fixture;
    const redirectUri = 'http://127.0.0.1:38995/callback';
    const client = await (
      await fetch(new URL('/register', origin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_uris: [redirectUri] }),
      })
    ).json();
    const { challenge } = await pkcePair();
    const authorizeUrl = authorizationUrl(origin, {
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: redirectUri,
      state: 'consent-state',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    const page = await fetch(authorizeUrl, { redirect: 'manual' });
    expect(page.status).toBe(200);
    expect(page.headers.get('Content-Type')).toStartWith('text/html');
    const markup = await page.text();
    const requestId = markup.match(/name="request_id" value="([^"]+)"/)?.[1];
    expect(requestId).toBeString();

    const consent = await fetch(new URL(`/authorize/consent?request_id=${requestId}`, origin), {
      redirect: 'manual',
    });
    expect(consent.status).toBe(302);
    expect(redirectQuery(consent.headers.get('Location')).state).toBe('consent-state');
  });

  test('--no-dcr models a closed registration endpoint and accepts the preregistered client', async () => {
    const fixture = startFixture({ dynamicRegistration: false });
    const { origin } = fixture;

    // Figma advertises the endpoint and refuses the POST, so the client can
    // report the rejection instead of "no registration endpoint was advertised".
    const metadata = await (await fetch(new URL('/.well-known/oauth-authorization-server', origin))).json();
    expect(metadata.registration_endpoint).toBe(`${origin}/register`);

    const registration = await fetch(new URL('/register', origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_uris: ['http://127.0.0.1:38996/callback'] }),
    });
    expect(registration.status).toBe(403);
    expect(await registration.json()).toMatchObject({ error: 'unapproved_client' });

    // The preregistered client accepts any loopback redirect, as a manually
    // configured client id has no DCR-issued URI list.
    const redirectUri = 'http://localhost:38997/callback';
    const { verifier, challenge } = await pkcePair();
    const authorize = await fetch(
      authorizationUrl(origin, {
        response_type: 'code',
        client_id: PREREGISTERED_CLIENT_ID,
        redirect_uri: redirectUri,
        state: 'preregistered',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }),
      { redirect: 'manual' },
    );
    expect(authorize.status).toBe(302);
    const code = redirectQuery(authorize.headers.get('Location')).code;

    const tokenResponse = await tokenRequest(origin, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: PREREGISTERED_CLIENT_ID,
      code_verifier: verifier,
    });
    expect(tokenResponse.status).toBe(200);
    const tokens = await tokenResponse.json();
    const listed = await mcpRequest(origin, { jsonrpc: '2.0', id: 1, method: 'tools/list' }, tokens.access_token);
    expect((await listed.json()).result.tools[0].name).toBe('echo');

    const unapprovedRedirect = await fetch(
      authorizationUrl(origin, {
        response_type: 'code',
        client_id: PREREGISTERED_CLIENT_ID,
        redirect_uri: 'https://example.test/callback',
        state: 's',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }),
    );
    expect(unapprovedRedirect.status).toBe(400);
  });

  test('--deny redirects back with error=access_denied instead of a code', async () => {
    const fixture = startFixture({ deny: true });
    const { origin } = fixture;
    const redirectUri = 'http://localhost:38998/callback';
    const { challenge } = await pkcePair();
    const authorize = await fetch(
      authorizationUrl(origin, {
        response_type: 'code',
        client_id: PREREGISTERED_CLIENT_ID,
        redirect_uri: redirectUri,
        state: 'denied',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }),
      { redirect: 'manual' },
    );
    expect(authorize.status).toBe(302);
    const redirected = redirectQuery(authorize.headers.get('Location'));
    expect(redirected.error).toBe('access_denied');
    expect(redirected.state).toBe('denied');
    expect(redirected.code).toBeUndefined();
    expect((await (await fetch(new URL('/__state', origin))).json()).issuedAuthorizationCodes).toBe(0);
  });

  test('--challenge-403 answers 403 with the same bearer challenge', async () => {
    const fixture = startFixture({ challengeStatus: 403 });
    const { origin } = fixture;
    const response = await mcpRequest(origin, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(response.status).toBe(403);
    expect(response.headers.get('WWW-Authenticate')).toContain(
      `resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`,
    );
    expect((await response.json()).error).toBe('unauthorized');
    const state = await (await fetch(new URL('/__state', origin))).json();
    expect(state.challengeStatus).toBe(403);
  });

  // Proves the fixture is connectable by the client the app actually runs, not
  // only by plain fetch: OMP's Streamable HTTP transport initializes, sends
  // notifications/initialized, opens (and tolerates the 405 on) the optional
  // GET SSE stream, then lists and calls a tool.
  test.skipIf(ompClient === null)('the OMP SDK MCP client connects, lists and calls the fixture tool', async () => {
    const fixture = startFixture();
    const accessToken = await mintAccessToken(fixture.origin);
    const connection = await ompClient.connectToServer('mcp-oauth-fixture', {
      type: 'http',
      url: fixture.mcpUrl,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    try {
      expect(connection.serverInfo.name).toBe('mcp-oauth-fixture');
      expect((await ompClient.listTools(connection)).map(tool => tool.name)).toEqual(['echo']);
      const result = await ompClient.callTool(connection, 'echo', { text: 'omp-client-ok' });
      expect(result.content[0].text).toBe('omp-client-ok');
    } finally {
      await ompClient.disconnectServer(connection);
    }

    const state = await (await fetch(new URL('/__state', fixture.origin))).json();
    expect(state.issuedTokens).toBe(1);
  });
});
