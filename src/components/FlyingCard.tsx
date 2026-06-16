// src/components/FlyingCard.tsx
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

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
  /** Target rect (the pile: sidebar on desktop, dock on mobile). */
  to: FlyRect;
  /** Flight duration in milliseconds. */
  durationMs: number;
}

/**
 * A fixed-position, portaled clone of the quote card that arcs from the live
 * card into the ranking pile. Purely presentational — it self-animates and is
 * unmounted by its parent. The store commit is timed by the parent, not by this
 * component's animation lifecycle, so behavior is deterministic in tests.
 */
export function FlyingCard({ text, from, to, durationMs }: FlyingCardProps) {
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);

  return createPortal(
    <motion.div
      data-testid="flying-card"
      className="ev-quote-card"
      aria-hidden="true"
      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      animate={{ x: dx, y: dy, scale: 0.12, opacity: 0.2 }}
      transition={{ duration: durationMs / 1000, ease: [0.5, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        top: from.top,
        left: from.left,
        width: from.width,
        margin: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div className="ev-quote-text" style={{ fontSize: 'clamp(1.0625rem, 2.5vw, 1.25rem)' }}>
        {text}
      </div>
    </motion.div>,
    document.body,
  );
}
