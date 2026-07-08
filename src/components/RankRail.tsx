import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReadRankStore, type BlindQuote } from '../store/useReadRankStore';
import { useMotion, EASE, DUR } from '../motion';
import { RankList } from './RankList';
import { TierIcon } from './TierIcon';

export interface RankRailProps {
  variant: 'sidebar' | 'sheet';
  /** Id of a row currently being landed on by a verdict flight (seamless handoff). */
  landingId?: string | null;
}

export const RankRail: React.FC<RankRailProps> = ({ variant, landingId }) => {
  const { getCurrentTopicProgress, reorderAgreed, reAgree } = useReadRankStore();
  const topic = getCurrentTopicProgress();
  const agreed = topic?.agreed ?? [];
  // Per-topic, like `agreed`: each topic owns its own ranking. Disagreed quotes
  // must not bleed across topics — the next topic starts with an empty pile.
  const disagreed = topic?.disagreed ?? [];
  const [showDisagreed, setShowDisagreed] = useState(false);
  const isSheet = variant === 'sheet';
  const m = useMotion();
  const [recoverMsg, setRecoverMsg] = useState('');
  const handleRecover = (q: BlindQuote) => {
    const stub = q.text.length > 40 ? q.text.slice(0, 40) + '…' : q.text;
    setRecoverMsg(`Moved "${stub}" back to agreed.`);
    reAgree(q);
  };

  return (
    <div className="rank-rail">
      <RankList
        items={agreed}
        onReorder={reorderAgreed}
        longPressDrag={isSheet}
        showGhostSlots
        landingId={landingId}
      />

      {agreed.length === 0 && (
        <p className="sr-only">
          Nothing ranked yet.&nbsp; Agree with quotes and they will file in here, ready to rank.
        </p>
      )}

      {disagreed.length > 0 && (
        <section className="rank-rail-disagreed">
          <button
            type="button"
            className="rank-sheet-disagreed-toggle rank-disagreed-line"
            aria-expanded={showDisagreed}
            aria-label={`${disagreed.length} disagreed.  Review or recover.`}
            onClick={() => setShowDisagreed((p) => !p)}
          >
            <TierIcon tier="disagreed" size={18} />
            <span>{disagreed.length} disagreed<span className="rank-disagreed-sub">&nbsp; — review or recover</span></span>
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
              style={{ transform: showDisagreed ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-standard)' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showDisagreed && (
            <div className="rank-rail-disagreed-list">
              <AnimatePresence initial={false}>
                {disagreed.map((q) => (
                  <motion.div key={q.id}
                    layout={!m.reduced}
                    className="tier-row tier-row-disagreed rank-rail-disagreed-row"
                    {...m.enter({ y: -4 })}
                    exit={m.reduced ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
                    transition={m.transition(DUR.moderate, EASE.standard)}>
                    <TierIcon tier="disagreed" size={13} />
                    <span className="rank-rail-disagreed-stub tier-disagreed-muted">{q.text}</span>
                    <button type="button" className="rank-sheet-disagreed-recover" onClick={() => handleRecover(q)}>
                      Move to agreed
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      )}
      <div className="sr-only" role="status" aria-live="polite">{recoverMsg}</div>
    </div>
  );
};
