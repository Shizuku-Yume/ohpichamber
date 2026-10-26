import { z } from 'zod';
import type { JsonObject, JsonValue } from '@openchamber/agent-contract';

/** One-line summaries are narrow enough for a card and a policy label. */
export const APPROVAL_SUMMARY_MAX_CHARS = 200;
const APPROVAL_REASON_MAX_CHARS = 500;
const REDACTED = '[REDACTED]';

/**
 * Remove values a command line commonly carries credentials in. The card
 * shows the command so the user can judge it, and the projected summary
 * crosses into browser-visible events, so neither may expose a secret.
 */
function redactApprovalText(value: string): string {
  return value
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED]')
    .replace(/(authorization\s*[:=]\s*)(?:(?:basic|bearer|digest|negotiate|token)\s+)?(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1[REDACTED]')
    .replace(/\b[A-Za-z][A-Za-z0-9-]*(?:token|auth|key|secret|password)[A-Za-z0-9-]*\s*:\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '[REDACTED]')
    .replace(/(\b["']?[a-z0-9-]*(?:api[-_]?key|auth[-_]?token|access[-_]?token|private[-_]?token|security[-_]?token|secret|password|credential)[a-z0-9-]*["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1[REDACTED]')
    .replace(/\b((?:mysql|mysqldump|mysqladmin|sshpass)\b[^|;&\n]*?\s-p(?:\s+)?)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1[REDACTED]')
    .replace(/\b(redis-cli\b[^|;&\n]*?\s-a\s+)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1[REDACTED]')
    .replace(/\b(basic|bearer|digest|negotiate)\s+[A-Za-z0-9+/=._~-]{6,}/gi, '$1 [REDACTED]')
    .replace(/\b([A-Za-z_][A-Za-z0-9_]*)=("[^"]*"|'[^']*'|[^\s,;]+)/g, '$1=[REDACTED]')
    .replace(/(-u|--user)(=|\s+)("[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1$2[REDACTED]')
    .replace(/(--?[a-z0-9-]*(?:token|secret|password|passwd|passphrase|passin|passout|api-key|apikey|key|auth))(=|\s+)("[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1$2[REDACTED]')
    .replace(/([?&](?:access_token|token|api_key|apikey|secret|password|security[-_]?token|signature|sig|key|auth|code|ticket)=)[^&#\s]+/gi, '$1[REDACTED]')
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/gi, '$1[REDACTED]@')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[A-Z0-9]{16}|ASIA[A-Z0-9]{16})\b/g, '[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, '[REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED]')
    .replace(/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, '[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{8,}\b(?![=:])/g, match => (
      /secret|token|password|credential/i.test(match) ? '[REDACTED]' : match
    ))
    .replace(/\b[a-f0-9]{32,}\b/gi, '[REDACTED]');
}

/** Redact, flatten line breaks, and bound a value shown on the approval card. */
export function oneLineApprovalText(value: string, maxChars = APPROVAL_SUMMARY_MAX_CHARS): string {
  const singleLine = redactApprovalText(value).replace(/\s+/g, ' ').trim();
  return singleLine.length > maxChars ? `${singleLine.slice(0, maxChars - 1)}…` : singleLine;
}

type ApprovalActionType = 'bash_command' | 'file_write' | 'network_request' | 'custom_tool';

const stringValue = (value: JsonValue | undefined): string | undefined => {
  const parsed = z.string().safeParse(value);
  return parsed.success && parsed.data.trim().length > 0 ? parsed.data : undefined;
};

function firstPath(input: JsonObject): string | undefined {
  const direct = stringValue(input.path) ?? stringValue(input.file_path) ?? stringValue(input.file);
  if (direct) return direct;
  for (const key of ['paths', 'files']) {
    const values = input[key];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      const candidate = stringValue(value);
      if (candidate) return candidate;
    }
  }
  return undefined;
}

/**
 * The tool input a person needs to recognize the call: a shell command, a
 * file path, or a URL. Other fields are omitted because they can hold file
 * contents or credentials.
 */
export function approvalInputSummary(actionType: ApprovalActionType, input: JsonObject): string {
  const raw = actionType === 'bash_command'
    ? stringValue(input.command)
    : actionType === 'file_write'
      ? firstPath(input)
      : actionType === 'network_request'
        ? stringValue(input.url) ?? stringValue(input.href)
        : undefined;
  return raw ? oneLineApprovalText(raw) : '';
}

/** The card details a browser may see: a reason and the same safe summary. */
export function publicApprovalDetails(actionType: ApprovalActionType, summary: string, reason?: string): JsonObject {
  const details: JsonObject = {};
  if (reason) details.reason = oneLineApprovalText(reason, APPROVAL_REASON_MAX_CHARS);
  if (summary && actionType === 'bash_command') details.command = summary;
  else if (summary && actionType === 'file_write') details.path = summary;
  return details;
}
