// src/components/FlyingCard.tsx
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useMotion, DUR, EASE } from '../motion';

export interface FlyRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface FlyingCardProps {
  /** Quote text to show in the flying clone. */
  text: string;
  /** Source rect (the live quote card), from getBoundingClientRect(). */
  from: FlyRect;
  /** Target rect — the destination ROW box (full size), not a point. */
  to: FlyRect;
}

/**
 * A fixed-position, portaled clone of the quote card that travels from the live
 * card into the ranking and resizes to land exactly on the destination row's
 * box — one connected motion (no shrink-to-dot, no fade-to-nothing). Purely
 * presentational: the parent times mount/unmount and keeps the real destination
 * row hidden during the flight, so the handoff is seamless and deterministic
 * (not dependent on an animation callback). Not rendered under reduced motion.
 */
export function FlyingCard({ text, from, to }: FlyingCardProps) {
  const m = useMotion();
  if (m.reduced) return null;

  return createPortal(
    <motion.div
      data-testid="flying-card"
      className="ev-quote-card flying-card-connected"
      aria-hidden="true"
      initial={{ top: from.top, left: from.left, width: from.width, height: from.height }}
      animate={{ top: to.top, left: to.left, width: to.width, height: to.height }}
      transition={{ duration: m.dur(DUR.flight) / 1000, ease: EASE.flight }}
      style={{
        position: 'fixed',
        margin: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div className="ev-quote-text" style={{ fontSize: 'clamp(1.0625rem, 2.5vw, 1.25rem)' }}>
        {text}
      </div>
    </motion.div>,
    document.body,
  );
}
