/**
 * FeSCo Motion & Timing Tokens
 *
 * All state transitions use Ease-Out with a 300ms timing curve
 * as specified in Document 2 (UI/UX Design System).
 */

export const motion = {
  durations: {
    instant: 0,
    fast: 150,
    normal: 300, // Master 300ms spec
    slow: 500,
    pulsePeriod: 1200,
  },
  curves: {
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: {
      damping: 15,
      stiffness: 120,
    },
  },
} as const;

export type Motion = typeof motion;
