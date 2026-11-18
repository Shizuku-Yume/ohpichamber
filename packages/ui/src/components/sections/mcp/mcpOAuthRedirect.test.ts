import { describe, expect, test } from 'bun:test';
import { MCP_OAUTH_HOST_CALLBACK_PATH, MCP_OAUTH_LOOPBACK_CALLBACK_PORT, MCP_OAUTH_LOOPBACK_REDIRECT_URI } from '@openchamber/agent-contract';
import { resolveMcpOAuthRedirect, shouldAutoOpenMcpAuthorization, type McpOAuthRedirectContext } from './mcpOAuthRedirect';

const REMOTE = 'https://chamber.example.test';
const LOCAL_HOST = 'http://127.0.0.1:4126';
const SSH_TUNNEL = 'http://127.0.0.1:62545';

const context = (overrides: Partial<McpOAuthRedirectContext>): McpOAuthRedirectContext => ({
  apiBaseUrl: '',
  pageOrigin: LOCAL_HOST,
  runtimeKey: 'local',
  desktopShell: false,
  relayActive: false,
  ...overrides,
});

describe('MCP OAuth redirect choice', () => {
  test('pins the Agent Service loopback callback, not OMP\'s default port', () => {
    expect(MCP_OAUTH_LOOPBACK_CALLBACK_PORT).toBe(38_471);
    expect(MCP_OAUTH_LOOPBACK_REDIRECT_URI).toBe('http://localhost:38471/callback');
  });

  test('a local desktop window uses the loopback callback', () => {
    expect(resolveMcpOAuthRedirect(context({ runtimeKey: 'local', desktopShell: true, pageOrigin: SSH_TUNNEL })))
      .toBe(MCP_OAUTH_LOOPBACK_REDIRECT_URI);
  });

  test('the web UI opened on the Host machine uses the loopback callback', () => {
    expect(resolveMcpOAuthRedirect(context({ runtimeKey: 'local', pageOrigin: LOCAL_HOST })))
      .toBe(MCP_OAUTH_LOOPBACK_REDIRECT_URI);
    expect(resolveMcpOAuthRedirect(context({ runtimeKey: 'url:http://localhost:4126', pageOrigin: 'http://localhost:4126' })))
      .toBe(MCP_OAUTH_LOOPBACK_REDIRECT_URI);
  });

  test('same-origin web on a non-loopback address returns through that address', () => {
    // The Host is bound to the LAN address and the page is served from it, so
    // the instance base is empty and the page origin is the only Host identity.
    expect(resolveMcpOAuthRedirect(context({
      apiBaseUrl: '', pageOrigin: 'http://192.168.1.20:4126', runtimeKey: 'url:http://192.168.1.20:4126',
    }))).toBe(`http://192.168.1.20:4126${MCP_OAUTH_HOST_CALLBACK_PATH}`);
  });

  test('web opened from another machine returns through the Host origin', () => {
    expect(resolveMcpOAuthRedirect(context({ runtimeKey: `url:${REMOTE}`, apiBaseUrl: REMOTE, pageOrigin: REMOTE })))
      .toBe(`${REMOTE}${MCP_OAUTH_HOST_CALLBACK_PATH}`);
  });

  test('mobile returns through the Host origin it is connected to', () => {
    expect(resolveMcpOAuthRedirect(context({
      runtimeKey: 'server:phone-host', apiBaseUrl: 'http://192.168.1.20:4126', pageOrigin: 'capacitor://localhost',
    }))).toBe(`http://192.168.1.20:4126${MCP_OAUTH_HOST_CALLBACK_PATH}`);
  });

  test('a desktop window on another Host returns through that Host, even over its SSH tunnel', () => {
    expect(resolveMcpOAuthRedirect(context({
      runtimeKey: 'host:ssh-castle', desktopShell: true, apiBaseUrl: SSH_TUNNEL, pageOrigin: 'http://localhost:5173',
    }))).toBe(`${SSH_TUNNEL}${MCP_OAUTH_HOST_CALLBACK_PATH}`);
  });

  test('relay mode keeps the loopback callback, since no Host origin is browser-reachable', () => {
    expect(resolveMcpOAuthRedirect(context({
      runtimeKey: 'relay:host@https://relay.example.test', apiBaseUrl: REMOTE, pageOrigin: REMOTE, relayActive: true,
    }))).toBe(MCP_OAUTH_LOOPBACK_REDIRECT_URI);
  });
});

test('a Host served under a subpath keeps that prefix', () => {
  expect(resolveMcpOAuthRedirect(context({
    runtimeKey: 'url:https://example.test/openchamber', apiBaseUrl: 'https://example.test/openchamber/', pageOrigin: 'https://example.test',
  }))).toBe(`https://example.test/openchamber${MCP_OAUTH_HOST_CALLBACK_PATH}`);
});

describe('MCP OAuth automatic browser open', () => {
  test('every runtime but relay may open the authorization page on its own', () => {
    expect(shouldAutoOpenMcpAuthorization({ relayActive: false })).toBe(true);
    // A relay carries only the app's own requests, so no browser can deliver the
    // code; the panel asks for a pasted callback instead of opening a page that
    // could never finish.
    expect(shouldAutoOpenMcpAuthorization({ relayActive: true })).toBe(false);
  });
});
