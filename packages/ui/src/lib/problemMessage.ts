import { CanonicalApiError } from '@/api/canonicalClient';

/**
 * The sentence a person should read for a failed operation.
 *
 * The Agent Service and the Host already write a cause for the reader: a refusal
 * such as the capacity outcome, or the check that refused an authorization. That
 * sentence is the message; the translated fallback only speaks when the failure
 * carried no cause of its own, so a toast never replaces a known reason with
 * "something went wrong".
 */
export const problemMessage = (error: unknown, fallback: string): string => {
  if (error instanceof CanonicalApiError) return error.problem.detail || error.problem.title;
  if (error instanceof Error && error.message.trim()) return error.message;
  // A store that already reduced its failure to a sentence hands that sentence
  // back, so the caller need not know whether it caught an Error or a string.
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
};
