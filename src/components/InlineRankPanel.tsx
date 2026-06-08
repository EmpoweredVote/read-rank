import React from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { RankList } from './RankList';

interface InlineRankPanelProps {
  onDismiss: () => void;
}

/** Mobile rank surface — same draggable podium as desktop, in an expandable panel. */
export const InlineRankPanel = React.forwardRef<HTMLDivElement, InlineRankPanelProps>(
  ({ onDismiss }, ref) => {
    const { getCurrentRaceProgress, reorderAgreed } = useReadRankStore();
    const race = getCurrentRaceProgress();
    const agreed = race?.agreed ?? [];

    return (
      <div ref={ref} className="inline-rank-panel">
        <p style={{
          fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', fontWeight: 700,
          color: 'var(--text-heading)', marginBottom: '0.25rem', marginTop: 0,
        }}>
          Your ranking
        </p>
        <p style={{
          fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', color: 'var(--text-tertiary)',
          margin: '0 0 0.75rem',
        }}>
          Drag to rank. Top 3 are your podium.
        </p>

        <RankList items={agreed} onReorder={reorderAgreed} compact />

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button
            onClick={onDismiss}
            className="ev-button-secondary"
            style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem' }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }
);
InlineRankPanel.displayName = 'InlineRankPanel';
