import { MCP_OAUTH_LOOPBACK_REDIRECT_URI } from '@openchamber/agent-contract';
import { isDesktopShell } from '@/lib/desktop';
import { isRelayModeActive } from '@/lib/relay/runtime-tunnel';
import { getRuntimeApiBaseUrl, getRuntimeKey } from '@/lib/runtime-switch';

/**
 * Where the provider returns the authorization code for MCP sign-in.
 *
 * The Agent Service holds the only listener that can hand the code to the flow,
 * so the redirect has to reach the machine that runs it:
 * - the local runtime (packaged desktop, a Host opened on its own machine):
 *   the Agent Service's pinned loopback callback;
 * - everything else (web on a remote Host, mobile, a desktop window on another
 *   Host): the public Host route, which receives the code on the Host and hands
 *   it to the `complete` action.
 * Relay mode has no browser-reachable Host origin (the tunnel only carries the
 * app's own requests), so it keeps the Agent Service callback and the panel's
 * pasted-callback fallback.
 */

/** The Host route that receives the code for a non-local runtime. The Host owns
 * it (`packages/web/server/lib/host/mcp-oauth-callback.js`); the UI only names
 * it in the redirect it hands the provider. */
export const MCP_OAUTH_HOST_CALLBACK_PATH = '/api/agent/v1/mcp/oauth/callback';

const LOOPBACK_HOSTNAMES: Record<string, true> = {
  localhost: true,
  '127.0.0.1': true,
  '::1': true,
  '[::1]': true,
  '0.0.0.0': true,
};

export interface McpOAuthRedirectContext {
  /** The connected instance's API base; empty on same-origin web. */
  readonly apiBaseUrl: string;
  /** The page the UI is loaded from. */
  readonly pageOrigin: string;
  readonly runtimeKey: string;
  readonly desktopShell: boolean;
  readonly relayActive: boolean;
}

/** The connected instance's base without a trailing slash: origin plus any subpath it is served under. */
const httpBase = (value: string): string | null => {
  if (!value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
};

const isLoopbackBase = (base: string): boolean => {
  try {
    return LOOPBACK_HOSTNAMES[new URL(base).hostname.toLowerCase()] === true;
  } catch {
    return false;
  }
};

export const resolveMcpOAuthRedirect = (context: McpOAuthRedirectContext): string => {
  const base = httpBase(context.apiBaseUrl) ?? httpBase(context.pageOrigin);
  if (!base || context.relayActive) return MCP_OAUTH_LOOPBACK_REDIRECT_URI;
  if (context.runtimeKey === 'local') return MCP_OAUTH_LOOPBACK_REDIRECT_URI;
  // A desktop window on another Host reaches that Host either directly or
  // through its SSH tunnel, and a loopback origin there is the tunnel, not this
  // machine's Host: the code has to go through that origin.
  if (context.desktopShell) return `${base}${MCP_OAUTH_HOST_CALLBACK_PATH}`;
  if (isLoopbackBase(base)) return MCP_OAUTH_LOOPBACK_REDIRECT_URI;
  return `${base}${MCP_OAUTH_HOST_CALLBACK_PATH}`;
};

/** The redirect for the runtime this UI is connected to right now. */
export const currentMcpOAuthRedirect = (): string => resolveMcpOAuthRedirect({
  apiBaseUrl: getRuntimeApiBaseUrl(),
  pageOrigin: typeof window !== 'undefined' ? window.location.origin : '',
  runtimeKey: getRuntimeKey(),
  desktopShell: isDesktopShell(),
  relayActive: isRelayModeActive(),
});
