import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { useAnimate, useReducedMotion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { RankRail } from './RankRail';

/**
 * Desktop rank surface — the race-wide agreed pile as a draggable podium.
 * Always visible alongside the triage card; ranking is optional and never forced.
 */
export const RankedListSidebar = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const { getCurrentTopicProgress } = useReadRankStore();
  const topic = getCurrentTopicProgress();
  const agreed = topic?.agreed ?? [];

  const prefersReducedMotion = useReducedMotion();
  const prevCount = useRef(agreed.length);
  const [scope, animate] = useAnimate();
  useImperativeHandle(ref, () => scope.current as HTMLDivElement);

  useEffect(() => {
    if (agreed.length > prevCount.current && !prefersReducedMotion && scope.current) {
      animate(scope.current, { scale: [1, 1.015, 1] }, { duration: 0.4 });
    }
    prevCount.current = agreed.length;
  }, [agreed.length, animate, prefersReducedMotion, scope]);

  return (
    <div ref={scope} className="agreed-quotes-sidebar">
      <div className="sidebar-header">
        <span style={{
          fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.75rem',
          letterSpacing: '0.02em', color: 'var(--text-heading)',
        }}>
          Your ranking
        </span>
        {agreed.length > 0 && (
          <span style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.625rem',
            letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-link)',
            backgroundColor: 'var(--agree-bg)', padding: '2px 8px', borderRadius: '4px',
          }}>
            {agreed.length} agreed
          </span>
        )}
      </div>

      <div style={{ padding: '0.75rem' }}>
        <p style={{
          fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', color: 'var(--text-tertiary)',
          margin: '0 0 0.625rem', lineHeight: 1.5,
        }}>
          Drag to rank.&nbsp; Your top 3 carry the most weight.
        </p>
        <div style={{ overflowY: 'auto', maxHeight: '58vh' }}>
          <RankRail variant="sidebar" />
        </div>
      </div>
    </div>
  );
});
RankedListSidebar.displayName = 'RankedListSidebar';

export const AgreedQuotesSidebar = RankedListSidebar;
