/**
 * How far a read of server-owned state has got.
 *
 * `unknown` is a distinct answer, never an empty one: a store that has not
 * been read must not render `ask`, `0` or `false` as if the server had said so.
 */
export type LoadPhase = 'unknown' | 'ready' | 'error';
