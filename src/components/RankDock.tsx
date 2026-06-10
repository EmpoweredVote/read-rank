import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { motion, useAnimate, useReducedMotion } from 'framer-motion';
import type { AgreedQuote } from '../store/useReadRankStore';

const GHOST_LABELS = ['1st', '2nd', '3rd'];

export interface RankDockProps {
  agreed: AgreedQuote[];
  disagreedCount: number;
  onOpen: () => void;
}

/**
 * Collapsed mobile rank strip (REDESIGN_SPEC §1.3): a live, glanceable
 * scoreboard of the top 3 + overflow/disagreed counters, and the single
 * entry point to the RankSheet. Always visible during mobile evaluation.
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

    const overflow = Math.max(0, agreed.length - 3);

    return (
      <motion.button
        ref={scope}
        type="button"
        className="rank-dock"
        onClick={onOpen}
        aria-label={`Open your ranking. ${agreed.length} ranked, ${disagreedCount} disagreed.`}
      >
        <span className="rank-dock-handle" aria-hidden="true" />
        <span className="rank-dock-row">
          {[0, 1, 2].map((i) => {
            const q = agreed[i];
            return (
              <span key={i} className={`rank-dock-slot ${q ? '' : 'rank-dock-slot-empty'}`}>
                <span className="rank-dock-slot-rank" aria-hidden="true">{i + 1}</span>
                {q ? (
                  <span className="rank-dock-slot-stub">{q.text}</span>
                ) : (
                  <span className="rank-dock-slot-ghost">{GHOST_LABELS[i]}</span>
                )}
              </span>
            );
          })}
          {overflow > 0 && <span className="rank-dock-counter">+{overflow}</span>}
          {disagreedCount > 0 && (
            <span className="rank-dock-counter rank-dock-counter-iron">⊘ {disagreedCount}</span>
          )}
          <svg className="rank-dock-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </span>
      </motion.button>
    );
  }
);
RankDock.displayName = 'RankDock';
