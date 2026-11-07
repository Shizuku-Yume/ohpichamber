import type { Message, Provider, Model } from '@openchamber/agent-contract';

/** The window a session is measured against when its catalog omits one. */
export const DEFAULT_CONTEXT_LIMIT = 200_000;

type ContextProvider = Provider & { models: Model[] };

type ProviderModelDisplay = {
 providerName: string;
 modelName: string;
 contextLimit: number;
};

type ModelPair = { providerId: string; modelId: string };

/** Both halves and nothing empty: a partial pair is not a model. */
export const completePair = (pair: ModelPair | null | undefined): ModelPair | null => (
  pair && pair.providerId && pair.modelId ? pair : null
);

/**
 * Describes the model a session is measured against.
 *
 * The newest assistant answer is the authority once one exists. Before an
 * answer, the session's own model selection wins, then the configured pair of
 * the session's directory — never a pair mixed from different sources, and
 * never one directory's pair beside another directory's session, so the label
 * cannot name a provider/model combination no session ever used.
 */
export const resolveContextModel = (input: {
  providers: readonly ContextProvider[];
  answering?: ModelPair | null;
  sessionSelection?: ModelPair | null;
  configured?: ModelPair | null;
}): ProviderModelDisplay => {
  const pair = completePair(input.answering)
    ?? completePair(input.sessionSelection)
    ?? completePair(input.configured);
  if (!pair) {
    return { providerName: '-', modelName: '-', contextLimit: DEFAULT_CONTEXT_LIMIT };
  }
  const provider = input.providers.find((entry) => entry.providerId === pair.providerId);
  const model = provider?.models?.find((entry) => entry.modelId === pair.modelId);
  return {
    providerName: provider?.name || pair.providerId,
    modelName: model?.name || pair.modelId,
    // A catalog record without a window still describes a live model; an
    // absent limit would print `- / -` and 0.0% beside a real transcript.
    contextLimit: model?.contextWindow && model.contextWindow > 0 ? model.contextWindow : DEFAULT_CONTEXT_LIMIT,
  };
};

export type SidebarTokenBreakdown = {
 input: number;
 output: number;
 reasoning: number;
 cacheRead: number;
 cacheWrite: number;
 total: number;
};

export const EMPTY_TOKEN_BREAKDOWN: SidebarTokenBreakdown = {
 input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0,
};

/**
 * Token counters of one message. `reasoning` is provider-reported and
 * informational: `total` is the provider's own count, so reasoning is never
 * added to it here.
 */
export const readTokenBreakdown = (usage: Message['usage'] | undefined): SidebarTokenBreakdown => {
 if (!usage) return EMPTY_TOKEN_BREAKDOWN;
 return {
  input: usage.input,
  output: usage.output,
  reasoning: usage.reasoning ?? 0,
  cacheRead: usage.cacheRead,
  cacheWrite: usage.cacheWrite,
  total: usage.totalTokens,
 };
};
