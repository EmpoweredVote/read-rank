import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BlindQuote } from '../store/useReadRankStore';
import { useMotion, EASE, DUR } from '../motion';
import { RankList } from './RankList';
import { useRankSource } from './RankSource';

export interface RankRailProps {
  variant: 'sidebar' | 'sheet';
  /** Id of a row currently being landed on by a verdict flight (seamless handoff). */
  landingId?: string | null;
  /** Show the "names and parties stay hidden" footer (default true). */
  showPrivacyNote?: boolean;
}

export const RankRail: React.FC<RankRailProps> = ({ variant, landingId, showPrivacyNote = true }) => {
  const { agreed, disagreed, reorder: reorderAgreed, toggleTie, reAgree, rankedCount, setRankedCount } = useRankSource();
  const [showDisagreed, setShowDisagreed] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const isSheet = variant === 'sheet';
  const m = useMotion();
  const [recoverMsg, setRecoverMsg] = useState('');

  const handleRecover = (q: BlindQuote) => {
    const stub = q.text.length > 40 ? q.text.slice(0, 40) + '…' : q.text;
    setRecoverMsg(`Moved "${stub}" to your ranking.`);
    reAgree(q);
  };

  // Tap-to-assign: place a quote at a 1-based podium position.
  const handleAssign = (id: string, position: number) => {
    const ids = agreed.map((q) => q.id);
    const from = ids.indexOf(id);
    if (from === -1) return;
    ids.splice(from, 1);
    ids.splice(position - 1, 0, id);
    reorderAgreed(ids);
  };

  return (
    <div className="rank-rail">
      {agreed.length < 2 && (
        <p className="rank-panel-sub">
          {agreed.length === 0 ? 'Quotes you agree with land here.' : 'Agree with more quotes to compare them here.'}
        </p>
      )}
      {agreed.length >= 2 && (
        <div className="rank-toolbar">
          <span className="rank-toolbar-hint">
            {reorderMode ? 'Drag the handles to reorder.' : 'Tap a number to place it in your top three.'}
          </span>
          <button
            type="button"
            className={`rank-reorder-btn${reorderMode ? ' is-done' : ''}`}
            aria-pressed={reorderMode}
            onClick={() => setReorderMode((p) => !p)}
          >
            {reorderMode ? 'Done' : 'Reorder'}
          </button>
        </div>
      )}

      <RankList
        items={agreed}
        onReorder={reorderAgreed}
        onAssign={handleAssign}
        onToggleTie={toggleTie}
        reorderMode={reorderMode}
        longPressDrag={isSheet}
        landingId={landingId}
        rankedCount={rankedCount ?? agreed.length}
        onSetRankedCount={setRankedCount}
      />

      {agreed.length === 0 && (
        <div className="rank-empty">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          <p>Agree with a quote to add it here. Then put the one you trust most on top.</p>
        </div>
      )}

      {!reorderMode && disagreed.length > 0 && (
        <section className="rank-dis">
          <button
            type="button"
            className="rank-dis-bar"
            aria-expanded={showDisagreed}
            aria-label={`${disagreed.length} disagreed.  Review or recover.`}
            onClick={() => setShowDisagreed((p) => !p)}
          >
            <span className="rank-dis-ic" aria-hidden="true" />
            <span className="rank-dis-txt">
              <span className="rank-dis-lab">{disagreed.length} disagreed</span>
              <span className="rank-dis-sub">Review or recover</span>
            </span>
            <svg
              className="rank-dis-chev"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showDisagreed && (
            <div className="rank-dis-list">
              <AnimatePresence initial={false}>
                {disagreed.map((q) => (
                  <motion.div
                    key={q.id}
                    layout={!m.reduced}
                    className="tier-row tier-row-disagreed rank-dis-row"
                    {...m.enter({ y: -4 })}
                    exit={m.reduced ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
                    transition={m.transition(DUR.moderate, EASE.standard)}
                  >
                    <span className="rank-dis-row-stub tier-disagreed-muted">{q.text}</span>
                    <button type="button" className="rank-dis-recover" onClick={() => handleRecover(q)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
                      Move to my ranking
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      )}
      {showPrivacyNote && (
        <p className="rank-privacy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Names and parties stay hidden until you see your full ballot.
        </p>
      )}
      <div className="sr-only" role="status" aria-live="polite">{recoverMsg}</div>
    </div>
  );
};
