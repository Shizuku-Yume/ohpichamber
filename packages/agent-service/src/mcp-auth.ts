/**
 * The one answer to "does this failure mean the server wants authorization?".
 *
 * Two callers ask it and must agree: the supervisor classifies a saved server
 * (through a live session worker or through the stateless probe, depending only
 * on whether a session happens to be open), and a session worker projects its own
 * transport failures. A disagreement turns an unauthenticated install into a
 * reported failure on one path and a sign-in on the other, so the rule lives here
 * rather than twice.
 */

/** Codes a worker or a probe reports when the server wants authorization. */
const MCP_AUTH_CODES = new Set(['MCP_AUTH_REQUIRED', 'AUTH_REQUIRED', 'MCP_CREDENTIAL_UNAVAILABLE']);

/** A hosted MCP server answers 401/403 or names the scope before it accepts
 * OAuth. The status codes are guarded against adjacent digits so a refused
 * socket's port (`:14032`) cannot read as a 403. */
const MCP_AUTH_TEXT = /(?<!\d)(401|403)(?!\d)|insufficient_scope|unauthorized|sign-in|sign in|auth/i;

/** The declaration a server entry can carry: `auth: { type: "oauth" }` or an
 * `oauth` block states the requirement before any request is made. */
interface McpAuthDeclaration {
  auth?: { type?: string };
  oauth?: object;
}

export interface McpAuthSignal {
  code?: string;
  detail: string;
  config?: McpAuthDeclaration;
}

export function mcpAuthRequired(signal: McpAuthSignal): boolean {
  const { code, detail, config } = signal;
  if (code !== undefined && MCP_AUTH_CODES.has(code)) return true;
  if (MCP_AUTH_TEXT.test(`${code ?? ''} ${detail}`)) return true;
  return config?.auth?.type === 'oauth' || config?.oauth !== undefined;
}
