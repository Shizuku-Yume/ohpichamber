/**
 * "Try to preserve cache usage". A provider keeps a prompt cache per model, so
 * switching models mid-session makes the new model read the whole context
 * uncached, and the old model's cache goes cold while the session is away from
 * it. While the model that wrote the last answer likely still holds a warm
 * cache, Auto stays on it instead of moving down to a lower category; moving up
 * is never held back.
 *
 * "Lower" is the built-in category order: trivial < research < implement <
 * hard. Categories the user added have no place in that order, so a send routed
 * to one of them switches as it always did.
 */
import { BUILTIN_CATEGORIES } from './defaults.js';

/** How long a provider keeps a prompt cache after its last use. */
export const PROMPT_CACHE_TTL_MS = 5 * 60 * 1000;

const RANK = new Map(BUILTIN_CATEGORIES.map((category, index) => [category.id, index]));

const rankOf = (category) => (category.builtin ? RANK.get(category.id) ?? null : null);

const sameModel = (a, b) => a.providerID === b.providerID && a.modelID === b.modelID;

/**
 * The category Auto keeps instead of `chosen`, or null to switch as Jev said.
 * `current` is the model that wrote the session's last answer. Several
 * categories can share that model; the highest of them is where the session
 * is, so a choice below it is a move down. Only a category that runs the same
 * agent as `chosen` is kept: another agent sends another system prompt, which
 * misses the cache anyway, and would run the request with tools it did not ask
 * for (a planning agent for an edit).
 */
export const cacheHoldCategory = ({ categories, fallback, composerAgent, chosen, current }) => {
  const chosenRank = chosen ? rankOf(chosen) : null;
  if (chosenRank === null || !current) return null;
  const modelOf = (category) => category.model ?? fallback.model;
  const agentOf = (category) => category.agent || composerAgent || null;
  if (sameModel(modelOf(chosen), current)) return null;
  let held = null;
  for (const category of categories) {
    const rank = rankOf(category);
    if (rank === null || !sameModel(modelOf(category), current) || agentOf(category) !== agentOf(chosen)) continue;
    if (!held || rank > rankOf(held)) held = category;
  }
  return held && rankOf(held) > chosenRank ? held : null;
};
