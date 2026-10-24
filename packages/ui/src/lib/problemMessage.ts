import { CanonicalApiError } from '@/api/canonicalClient';

/**
 * The canonical Problem Details sentence a person should read. A refusal such
 * as the Agent Service's capacity outcome is already written for that reader;
 * replacing it with "the server may be offline" would hide the actionable cause.
 */
export const canonicalProblemDetail = (error: Error | null): string | null => (
  error instanceof CanonicalApiError ? error.problem.detail || error.problem.title : null
);
