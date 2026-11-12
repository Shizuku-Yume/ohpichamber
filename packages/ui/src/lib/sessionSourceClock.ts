import { z } from 'zod';
import type { Session } from '@openchamber/agent-contract';

/**
 * Host-written timestamps on a session record, and nothing else.
 *
 * `session.updatedAt` is the native transcript file's modification time, which
 * comes from the machine running the Agent Service. `metadata.openchamber.*`
 * stamps are `Date.now()` on the Host. Comparing the two measured the distance
 * between two clocks: touching a session file purged suggestions that still
 * applied, and a skewed clock purged them permanently. Every comparison in this
 * module stays inside one of those clocks.
 */
const hostClocksSchema = z.object({
  openchamber: z.object({
    workbench: z.object({ lastIdleAt: z.number().optional() }).optional(),
    turn: z.object({ endedAt: z.number(), durationMs: z.number().nonnegative() }).optional(),
    reviewOffer: z.object({ at: z.number() }).optional(),
  }).optional(),
});

type HostClocks = z.infer<typeof hostClocksSchema>['openchamber'];

const readHostClocks = (session: Session | null | undefined): HostClocks => (
  hostClocksSchema.safeParse(session?.metadata).data?.openchamber
);

/**
 * When the Host saw the last turn end, from the workbench marker or the recorded
 * turn, whichever is newer. `undefined` means the Host has not stamped a turn
 * end at all, which is not a reason to treat anything as stale.
 */
export const hostTurnEndedAt = (session: Session | null | undefined): number | undefined => {
  const clocks = readHostClocks(session);
  if (!clocks) return undefined;
  const idle = clocks.workbench?.lastIdleAt;
  const ended = clocks.turn?.endedAt;
  return idle === undefined ? ended : ended === undefined ? idle : Math.max(idle, ended);
};

/** When the Host wrote Jev's review offer, in the Host's own clock. */
export const hostReviewOfferAt = (session: Session | null | undefined): number | undefined => (
  readHostClocks(session)?.reviewOffer?.at
);
