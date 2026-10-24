import { describe, expect, test } from 'bun:test';

import { CanonicalApiError } from '@/api/canonicalClient';
import { canonicalProblemDetail } from './problemMessage';

describe('canonicalProblemDetail', () => {
  test('shows the capacity outcome instead of hiding the refusal', () => {
    const error = new CanonicalApiError({
      type: 'urn:ohpichamber:problem:SERVICE_UNAVAILABLE',
      title: 'Agent Service unavailable',
      status: 503,
      detail: 'Session capacity is full (5 of 5 active). Close another session or try again later.',
      code: 'SERVICE_UNAVAILABLE',
      retryable: true,
    });
    expect(canonicalProblemDetail(error)).toBe('Session capacity is full (5 of 5 active). Close another session or try again later.');
  });

  test('an ordinary error has no canonical message', () => {
    expect(canonicalProblemDetail(new Error('offline'))).toBeNull();
    expect(canonicalProblemDetail(null)).toBeNull();
  });
});
