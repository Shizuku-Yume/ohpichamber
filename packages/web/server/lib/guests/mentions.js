import {
  MENTIONS_IDLE_MS as sdkIdleMs,
  MENTIONS_ITEMS_MAX as sdkItemsMax,
  MENTIONS_RESOLVE_PATH as sdkResolvePath,
  MENTIONS_RESOLVE_TIMEOUT_MS as sdkResolveTimeoutMs,
  MENTIONS_SEARCH_PATH as sdkSearchPath,
  MENTIONS_SEARCH_TIMEOUT_MS as sdkSearchTimeoutMs,
  MENTION_TEXT_MAX as sdkMentionTextMax,
  isGuestApproved,
  requestedGuestCapabilities,
} from '@openchamber/sdk';
import * as fallbackConstants from './service-host-schemas.js';

const MENTIONS_IDLE_MS = sdkIdleMs ?? fallbackConstants.MENTIONS_IDLE_MS;
const MENTIONS_ITEMS_MAX = sdkItemsMax ?? fallbackConstants.MENTIONS_ITEMS_MAX;
const MENTIONS_RESOLVE_PATH = sdkResolvePath ?? fallbackConstants.MENTIONS_RESOLVE_PATH;
const MENTIONS_RESOLVE_TIMEOUT_MS = sdkResolveTimeoutMs ?? fallbackConstants.MENTIONS_RESOLVE_TIMEOUT_MS;
const MENTIONS_SEARCH_PATH = sdkSearchPath ?? fallbackConstants.MENTIONS_SEARCH_PATH;
const MENTIONS_SEARCH_TIMEOUT_MS = sdkSearchTimeoutMs ?? fallbackConstants.MENTIONS_SEARCH_TIMEOUT_MS;
const MENTION_TEXT_MAX = sdkMentionTextMax ?? fallbackConstants.MENTION_TEXT_MAX;
import { mentionItemSchema as sdkMentionItemSchema, mentionsResolveResultSchema as sdkMentionsResolveResultSchema } from '@openchamber/sdk/schemas';
import { mentionItemSchema as fallbackMentionItemSchema, mentionsResolveResultSchema as fallbackMentionsResolveResultSchema } from './service-host-schemas.js';
const mentionItemSchema = sdkMentionItemSchema ?? fallbackMentionItemSchema;
const mentionsResolveResultSchema = sdkMentionsResolveResultSchema ?? fallbackMentionsResolveResultSchema;

import { proxyGuestServiceRequest } from './service.js';

/**
 * The composer's `@` menu asks every active extension that declared
 * `contributes.mentions`. A slow or failing service adds no rows and never
 * holds the menu up; a row picked and then unreadable at send time is a
 * failure the composer shows, since the message would go out without what the
 * user chose.
 */

// A character is at most six bytes as an escaped JSON string; the envelope adds little.
const RESOLVE_ANSWER_MAX = MENTION_TEXT_MAX * 6 + 1_024;
const SEARCH_ANSWER_MAX = 256_000;

export const isMentionGuest = (guest) => guest.enabled !== false
  && guest.capabilityGrants?.includes('service') === true
  && isGuestApproved({ requested: requestedGuestCapabilities(guest), granted: guest.capabilityGrants });

const askService = (guest, persistPath, params, callService = proxyGuestServiceRequest) => callService({
  guestId: guest.id,
  guestName: guest.name,
  packageRoot: guest.packageRoot,
  service: guest.service,
  granted: guest.capabilityGrants,
  persistPath,
  method: 'POST',
  idleStopMs: guest.service.keepRunning ? undefined : MENTIONS_IDLE_MS,
  ...params,
});

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const searchOne = async (guest, query, directory, persistPath, callService, signal) => {
  try {
    const answer = await askService(guest, persistPath, {
      path: MENTIONS_SEARCH_PATH,
      body: JSON.stringify({ query, directory }),
      timeoutMs: MENTIONS_SEARCH_TIMEOUT_MS,
      responseMax: SEARCH_ANSWER_MAX,
      signal,
    }, callService);
    const items = answer.status === 200 ? parseJson(answer.body)?.items : null;
    if (!Array.isArray(items)) return [];
    return items.slice(0, MENTIONS_ITEMS_MAX).flatMap((item) => {
      const parsed = mentionItemSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
};

/**
 * @param {{ guests: object[], query: string, directory: string | null, persistPath: string, callService?: typeof proxyGuestServiceRequest, signal?: AbortSignal }} params
 * @returns {Promise<Array<{ guestId: string, label: string, items: Array<{ id: string, title: string, subtitle?: string }> }>>}
 */
export const searchGuestMentions = async ({ guests, query, directory, persistPath, callService, signal }) => {
  const asked = guests.filter((guest) => guest.mentions && guest.service && isMentionGuest(guest));
  const answers = await Promise.all(asked.map((guest) => searchOne(guest, query, directory, persistPath, callService, signal)));
  return asked
    .map((guest, index) => ({ guestId: guest.id, label: guest.mentions.label, items: answers[index] }))
    .filter((group) => group.items.length > 0);
};

/**
 * The context of a picked row. Throws when the service cannot give it.
 * @param {{ guest: object, id: string, persistPath: string, callService?: typeof proxyGuestServiceRequest }} params
 * @returns {Promise<string>}
 */
export const resolveGuestMention = async ({ guest, id, persistPath, callService }) => {
  const answer = await askService(guest, persistPath, {
    path: MENTIONS_RESOLVE_PATH,
    body: JSON.stringify({ id }),
    timeoutMs: MENTIONS_RESOLVE_TIMEOUT_MS,
    responseMax: RESOLVE_ANSWER_MAX,
  }, callService);
  const parsed = answer.status === 200 ? mentionsResolveResultSchema.safeParse(parseJson(answer.body)) : null;
  if (!parsed?.success) throw Object.assign(new Error('The service gave no text for this row.'), { code: 'MENTION_FAILED' });
  return parsed.data.text;
};
