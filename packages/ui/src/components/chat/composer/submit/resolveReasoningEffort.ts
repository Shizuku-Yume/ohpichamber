import type { Model } from '@openchamber/agent-contract';

/**
 * The effort a send carries.
 *
 * A queued item captured its effort when it was queued; later session or
 * preference changes must not rewrite it, including a captured `undefined`
 * (OMP's default) or `auto`. A live composer reads, in order, the session's
 * explicit choice, the native transcript's stored level, the draft pick, then
 * OMP's configured default. `auto` is a native resolution mode, not an effort,
 * so it stays off the wire.
 */
export const resolveReasoningEffortToSend = (input: {
  model: Pick<Model, 'reasoningEffortSupported' | 'reasoningOptions'> | undefined;
  /** Present only when the send replays a queue item; it owns the effort. */
  captured?: { reasoningEffort?: string | null } | undefined;
  session?: string | null | undefined;
  native?: string | null | undefined;
  draft?: string | null | undefined;
  ompDefault?: string | null | undefined;
}): string | undefined => {
  const { model } = input;
  if (!model?.reasoningEffortSupported) return undefined;
  const selected = input.captured
    ? input.captured.reasoningEffort ?? undefined
    : input.session ?? input.native ?? input.draft ?? input.ompDefault;
  if (!selected || selected === 'auto') return undefined;
  if (selected !== 'off' && !model.reasoningOptions.some((option) => option.reasoningEffort === selected)) return undefined;
  return selected;
};
