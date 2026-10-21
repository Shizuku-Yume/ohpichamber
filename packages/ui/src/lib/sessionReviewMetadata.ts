import type { Session, SessionMetadata } from '@openchamber/agent-contract';
import { omitKeys } from '@/lib/omitKeys';

export type SessionMetadataRecord = SessionMetadata;

export const getSessionMetadata = (session: Pick<Session, 'metadata'> | null | undefined): SessionMetadataRecord => session?.metadata ?? {};

export const getReviewSessionID = (session: Pick<Session, 'metadata'> | null | undefined): string | null => session?.metadata?.openchamber?.reviewSessionID ?? null;
export const getOriginalSessionID = (session: Pick<Session, 'metadata'> | null | undefined): string | null => session?.metadata?.openchamber?.originalSessionID ?? null;
export const isReviewSession = (session: Pick<Session, 'metadata'> | null | undefined): boolean => session?.metadata?.openchamber?.kind === 'review' && getOriginalSessionID(session) !== null;

export const withReviewSessionLink = (metadata: SessionMetadata, reviewSessionID: string): SessionMetadata => ({
  ...metadata,
  openchamber: { ...(metadata.openchamber ?? {}), reviewSessionID },
});

export const withReviewSessionMarker = (metadata: SessionMetadata, originalSessionID: string): SessionMetadata => ({
  ...metadata,
  openchamber: { ...(metadata.openchamber ?? {}), kind: 'review', originalSessionID },
});

export const withoutReviewSessionLink = (metadata: SessionMetadata, reviewSessionID: string): SessionMetadata => {
  if (metadata.openchamber?.reviewSessionID !== reviewSessionID) return metadata;
  const rest = omitKeys(metadata.openchamber, ['reviewSessionID']);
  if (Object.keys(rest).length > 0) return { ...metadata, openchamber: rest };
  const without = omitKeys(metadata, ['openchamber']);
  return without;
};
