import { z } from 'zod';
import type { Session } from '@openchamber/agent-contract';

// How long the last turn ran, recorded by the server under
// `session.metadata.openchamber.turn` when the turn ends
// (`packages/web/server/lib/openchamber-sessions/turn-duration.js`). It lives
// on the session record, so it survives restarts and reaches every device.
const turnMetadataSchema = z.object({
 openchamber: z.object({
  turn: z.object({
   endedAt: z.number(),
   durationMs: z.number().nonnegative(),
  }),
 }),
});

const workbenchSchema = z.object({
 openchamber: z.object({
  workbench: z.object({
   lastIdleAt: z.number().optional(),
  }).optional(),
 }).optional(),
});

/**
 * OpenCode stamps `time.idle` with the time of the event that ended the turn,
 * the same `endedAt` the server records, and moves it forward by a millisecond
 * when two turns end within one.
 */
const SAME_TURN_TOLERANCE_MS = 1_000;

/**
 * Every session row asks on every change of the sessions list, and a record is
 * replaced, never mutated, so the answer is kept per record.
 */
const durationByRecord = new WeakMap<Session, { durationMs: number | undefined }>();

const sessionTimeSchema = z.object({ idle: z.number().optional() });

const readIdleTime = (session: Session): number | undefined => {
 const workbenchIdle = workbenchSchema.safeParse(session.metadata).data?.openchamber?.workbench?.lastIdleAt;
 if (typeof workbenchIdle === 'number' && Number.isFinite(workbenchIdle)) {
  return workbenchIdle;
 }
 if ('time' in session && session.time) {
  const parsed = sessionTimeSchema.safeParse(session.time);
  if (parsed.success && typeof parsed.data.idle === 'number') {
   return parsed.data.idle;
  }
 }
 return session.updatedAt;
};

const readRecordedTurnDurationMs = (session: Session): number | undefined => {
 const idle = readIdleTime(session);
 if (idle === undefined) return undefined;
 const parsed = turnMetadataSchema.safeParse(session.metadata);
 if (!parsed.success) return undefined;
 const { endedAt, durationMs } = parsed.data.openchamber.turn;
 return Math.abs(idle - endedAt) <= SAME_TURN_TOLERANCE_MS ? durationMs : undefined;
};

/**
 * The recorded length of the turn that ended at `time.idle`. A record left by
 * an older turn, such as one that ended while the server was down, does not
 * apply.
 */
export function getRecordedTurnDurationMs(session: Session | undefined): number | undefined {
 if (!session) return undefined;
 const cached = durationByRecord.get(session);
 if (cached) return cached.durationMs;
 const durationMs = readRecordedTurnDurationMs(session);
 durationByRecord.set(session, { durationMs });
 return durationMs;
}
