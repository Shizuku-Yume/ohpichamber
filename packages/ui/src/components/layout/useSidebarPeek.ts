import type React from 'react';

/**
 * `in` while the collapsed sidebar is shown over the chat, `out` while it
 * slides back, `false` when it is away.
 */
export type SidebarPeekState = false | 'in' | 'out';

export interface SidebarPeek {
  state: SidebarPeekState;
  /** How long the slide takes; zero without layout animations or with reduced motion. */
  animationMs: number;
  overlayRef: React.RefObject<HTMLElement | null>;
  overlayHandlers: {
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onAnimationEnd: (event: React.AnimationEvent) => void;
  };
}
