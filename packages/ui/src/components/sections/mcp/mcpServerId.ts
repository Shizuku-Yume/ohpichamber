/**
 * OMP's MCP server-name rule: `^[A-Za-z0-9_.-]{1,100}$`. The editor rewrites
 * anything outside it rather than refusing the keystroke, and keeps the case
 * the user typed because OMP matches names as written.
 */
const INVALID_SERVER_ID_CHARACTERS = /[^A-Za-z0-9_.-]/g;
const SERVER_ID_LIMIT = 100;

export function mcpServerIdFrom(value: string): string {
  return value.replace(INVALID_SERVER_ID_CHARACTERS, '-').slice(0, SERVER_ID_LIMIT);
}
