import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { motion, useAnimate, useReducedMotion } from 'framer-motion';
import type { AgreedQuote } from '../store/useReadRankStore';

export interface RankDockProps {
  agreed: AgreedQuote[];
  disagreedCount: number;
  onOpen: () => void;
}

/**
 * Collapsed mobile rank strip (spec: Record). A single slim line so the quote
 * stays the hero during evaluation — it names the ranking, shows the count, and
 * is the one entry point to the RankSheet. Always visible during evaluation.
 */
export const RankDock = React.forwardRef<HTMLButtonElement, RankDockProps>(
  ({ agreed, disagreedCount, onOpen }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const prevCount = useRef(agreed.length);
    const [scope, animate] = useAnimate();

    // Expose the button node to the forwarded ref for focus return / coach-mark targeting
    useImperativeHandle(ref, () => scope.current as HTMLButtonElement);

    useEffect(() => {
      if (agreed.length > prevCount.current && !prefersReducedMotion && scope.current) {
        animate(scope.current, { scale: [1, 1.02, 1] }, { duration: 0.5 });
      }
      prevCount.current = agreed.length;
    }, [agreed.length, animate, prefersReducedMotion, scope]);

    const ranked = agreed.length;
    const countLabel = ranked === 0 ? 'nothing ranked yet' : `${ranked} ranked`;

    return (
      <motion.button
        ref={scope}
        type="button"
        className="rank-dock"
        onClick={onOpen}
        aria-label={`Open your ranking. ${ranked} ranked, ${disagreedCount} disagreed.`}
      >
        <span className="rank-dock-handle" aria-hidden="true" />
        <span className="rank-dock-line" aria-hidden="true">
          <span className="rank-dock-name">Your ranking</span>
          <span className="rank-dock-count">· {countLabel}</span>
          <span className="rank-dock-cta">Rank ›</span>
        </span>
      </motion.button>
    );
  }
);
RankDock.displayName = 'RankDock';
