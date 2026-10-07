import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { useAnimate, useReducedMotion } from 'framer-motion';
import { useScrollFade } from '../hooks/useScrollFade';
import { RankRail } from './RankRail';
import { useRankSource } from './RankSource';

/**
 * Desktop rank surface — the race-wide agreed pile as a draggable podium.
 * Always visible alongside the triage card; ranking is optional and never forced.
 */
interface RankedListSidebarProps {
  /** Id of a row currently being landed on by a verdict flight (seamless handoff). */
  landingId?: string | null;
  showPrivacyNote?: boolean;
}

export const RankedListSidebar = React.forwardRef<HTMLDivElement, RankedListSidebarProps>(({ landingId, showPrivacyNote = true }, ref) => {
  const { agreed } = useRankSource();

  const prefersReducedMotion = useReducedMotion();
  const prevCount = useRef(agreed.length);
  const [scope, animate] = useAnimate();
  const scrollRef = useScrollFade<HTMLDivElement>();
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
        <h2 className="rank-panel-title">Your ranking</h2>
        {agreed.length > 0 && <span className="rank-panel-count">{agreed.length} agreed</span>}
      </div>

      <div style={{ padding: '0.75rem' }}>
        <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: '58vh' }}>
          <RankRail variant="sidebar" landingId={landingId} showPrivacyNote={showPrivacyNote} />
        </div>
      </div>
    </div>
  );
});
RankedListSidebar.displayName = 'RankedListSidebar';
