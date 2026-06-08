import React from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { RankList } from './RankList';

/**
 * Desktop rank surface — the race-wide agreed pile as a draggable podium.
 * Always visible alongside the triage card; ranking is optional and never forced.
 */
export const RankedListSidebar = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const { getCurrentRaceProgress, reorderAgreed } = useReadRankStore();
  const race = getCurrentRaceProgress();
  const agreed = race?.agreed ?? [];
  const disagreedCount = race
    ? Object.values(race.topics).reduce((n, t) => n + t.disagreed.length, 0)
    : 0;

  return (
    <div ref={ref} className="agreed-quotes-sidebar">
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
          Drag to rank. Your top 3 are your podium — the rest count too.
        </p>
        <div style={{ overflowY: 'auto', maxHeight: '58vh' }}>
          <RankList items={agreed} onReorder={reorderAgreed} />
        </div>

        {disagreedCount > 0 && (
          <p style={{
            fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', color: 'var(--text-tertiary)',
            margin: '0.75rem 0 0', textAlign: 'center',
          }}>
            {disagreedCount} disagreed
          </p>
        )}
      </div>
    </div>
  );
});
RankedListSidebar.displayName = 'RankedListSidebar';

export const AgreedQuotesSidebar = RankedListSidebar;
