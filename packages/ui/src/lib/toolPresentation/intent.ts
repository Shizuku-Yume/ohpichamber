import type { JsonObject } from '@openchamber/agent-contract';

/**
 * The harness's intent field. Every tool call may carry it; OMP renders it as
 * the working line while the call runs, so it outranks the tool's own
 * description.
 */
const INTENT_FIELD = 'i';

/** OMP trims the intent and drops a trailing run of dots ("Reading files..."). */
export const normalizeIntent = (intent: string): string | null => {
    const trimmed = intent.trim().replace(/\s*\.+$/, '').trim();
    return trimmed.length > 0 ? trimmed : null;
};

/** The call's intent, when it carries a usable one. */
export const intentOf = (input: JsonObject): string | null => {
    const value = input[INTENT_FIELD];
    return typeof value === 'string' ? normalizeIntent(value) : null;
};
