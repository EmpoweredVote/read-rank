import { useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

/** Cubic-bezier easing curves. The product's motion vocabulary. */
export const EASE = {
  /** Primary decelerate-to-rest. Entrances, reveals, phase transitions. */
  settle: [0.22, 1, 0.36, 1],
  /** Accelerate-out / decelerate-in. The verdict dock flight. */
  flight: [0.45, 0, 0.18, 1],
  /** Gentle overshoot (settle, not bounce). Medal/badge/check pop. */
  overshoot: [0.34, 1.45, 0.6, 1],
  /** Generic UI: hovers, fades, color transitions. */
  standard: [0.4, 0, 0.2, 1],
  /** Reveal particle burst only. */
  burst: [0.25, 0.46, 0.45, 0.94],
} as const;

/** Durations in milliseconds. */
export const DUR = {
  instant: 0,
  fast: 150,
  base: 250,
  moderate: 400,
  flight: 580,
  burst: 800,
} as const;

/** Stagger / sub-stagger delays in milliseconds. */
export const STAGGER = {
  gridCell: 90,
  cascade: 420,
  badge: 80,
  avatar: 140,
  name: 200,
  evidence: 320,
} as const;

/** Drag-to-reorder layout spring. */
export const SPRING_REORDER: Transition = { type: 'spring', stiffness: 500, damping: 35 };

export type Ease = readonly [number, number, number, number];

export interface Motion {
  /** True when the user prefers reduced motion. */
  reduced: boolean;
  /** A duration in ms, collapsed to 0 when reduced. */
  dur(ms: number): number;
  /** An easing curve, collapsed to 'linear' when reduced. */
  ease(curve: Ease): Ease | string;
  /**
   * A framer-motion Transition (duration in SECONDS), reduced-aware.
   * `extra` is for fields like `delay`/`repeat` — do NOT pass `duration` or
   * `ease` in it, as they would override the reduced-motion collapse.
   */
  transition(ms: number, curve?: Ease, extra?: Partial<Transition>): Transition;
  /** The reorder spring, or an instant transition when reduced. */
  spring(): Transition;
  /**
   * Entrance initial/animate pair. When reduced, `initial` is `false` so the
   * element renders at its final state with no transform.
   */
  enter(offset?: { x?: number; y?: number }): {
    initial: false | Record<string, number>;
    animate: Record<string, number>;
  };
  /** A whileHover value, or undefined when reduced. */
  hover<T>(value: T): T | undefined;
  /** A whileTap value, or undefined when reduced. */
  tap<T>(value: T): T | undefined;
}

/**
 * The only sanctioned way to read motion config in a component. Wraps
 * framer-motion's useReducedMotion so JS-driven transforms respect the
 * preference (the CSS reset does not catch them).
 */
export function useMotion(): Motion {
  const reduced = !!useReducedMotion();
  return {
    reduced,
    dur: (ms) => (reduced ? DUR.instant : ms),
    ease: (curve) => (reduced ? 'linear' : curve),
    transition: (ms, curve = EASE.settle, extra = {}) => ({
      duration: (reduced ? DUR.instant : ms) / 1000,
      ease: reduced ? 'linear' : curve,
      ...extra,
    }),
    spring: () => (reduced ? { duration: 0 } : SPRING_REORDER),
    enter: (offset = { y: 8 }) => ({
      initial: reduced ? false : { opacity: 0, ...offset },
      animate: {
        opacity: 1,
        ...(offset.x !== undefined ? { x: 0 } : {}),
        ...(offset.y !== undefined ? { y: 0 } : {}),
      },
    }),
    hover: (value) => (reduced ? undefined : value),
    tap: (value) => (reduced ? undefined : value),
  };
}
