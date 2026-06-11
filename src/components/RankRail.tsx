import React, { useState } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { RankList } from './RankList';
import { TierIcon } from './TierIcon';

export interface RankRailProps {
  variant: 'sidebar' | 'sheet';
}

export const RankRail: React.FC<RankRailProps> = ({ variant }) => {
  const { getCurrentRaceProgress, reorderAgreed, reAgree } = useReadRankStore();
  const race = getCurrentRaceProgress();
  const agreed = race?.agreed ?? [];
  const disagreed = race ? Object.values(race.topics).flatMap((t) => t.disagreed) : [];
  const [showDisagreed, setShowDisagreed] = useState(false);
  const isSheet = variant === 'sheet';

  return (
    <div className="rank-rail">
      <RankList
        items={agreed}
        onReorder={reorderAgreed}
        compact={isSheet}
        longPressDrag={isSheet}
        showMoveButtons
        showGhostSlots
      />

      {agreed.length === 0 && (
        <p className="sr-only">
          Nothing ranked yet.&nbsp; Agree with quotes and they will file in here, ready to rank.
        </p>
      )}

      {disagreed.length > 0 && (
        <section className="rank-rail-disagreed">
          {agreed.length > 0 && (
            <div className="disagreed-divider" role="separator">
              <span>You disagreed with everything below this line</span>
            </div>
          )}
          <button
            type="button"
            className="rank-sheet-disagreed-toggle"
            aria-expanded={showDisagreed}
            aria-label={`Disagreed (${disagreed.length})`}
            onClick={() => setShowDisagreed((p) => !p)}
          >
            <TierIcon tier="disagreed" size={13} />
            Disagreed ({disagreed.length})
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ transform: showDisagreed ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showDisagreed && (
            <div className="rank-rail-disagreed-list">
              {disagreed.map((q) => (
                <div key={q.id} className="tier-row tier-row-disagreed rank-rail-disagreed-row">
                  <TierIcon tier="disagreed" size={13} />
                  <span className="rank-rail-disagreed-stub tier-disagreed-muted">{q.text}</span>
                  <button type="button" className="rank-sheet-disagreed-recover" onClick={() => reAgree(q)}>
                    Move to agreed
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
