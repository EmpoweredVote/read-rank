import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { RankList } from './RankList';

export interface RankSheetProps {
  open: boolean;
  /** All topics fully evaluated — show the completion header. */
  allDone: boolean;
  onClose: () => void;
  onSeeResults: () => void;
}

/** Mobile bottom-sheet ranking surface (REDESIGN_SPEC §1.3). Mounts only while open. */
export const RankSheet: React.FC<RankSheetProps> = (props) => {
  if (!props.open) return null;
  return <RankSheetDialog {...props} />;
};

const RankSheetDialog: React.FC<RankSheetProps> = ({ allDone, onClose, onSeeResults }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const { getCurrentRaceProgress, reorderAgreed, reAgree } = useReadRankStore();
  const race = getCurrentRaceProgress();
  const agreed = race?.agreed ?? [];
  const disagreed = race ? Object.values(race.topics).flatMap((t) => t.disagreed) : [];
  const [showDisagreed, setShowDisagreed] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="rank-sheet"
      onClose={() => {
        // Ignore stale close events from StrictMode's effect replay.
        if (!ref.current?.open) onClose();
      }}
      onCancel={onClose}
      aria-label={allDone ? 'All quotes read. Review your ranking.' : 'Your ranking'}
    >
      <motion.div
        className="rank-sheet-handle-region"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80) onClose();
        }}
      >
        <span className="rank-sheet-handle" aria-hidden="true" />
      </motion.div>

      <header className="rank-sheet-header">
        <h2 className="rank-sheet-title">
          {allDone ? (
            <>All quotes read.&nbsp; Happy with your order?</>
          ) : (
            'Your ranking'
          )}
        </h2>
        <button type="button" className="rank-sheet-done" onClick={onClose}>
          Done
        </button>
      </header>

      <div className="rank-sheet-body">
        <RankList
          items={agreed}
          onReorder={reorderAgreed}
          compact
          longPressDrag
          showMoveButtons
          emptyHint="Agree with quotes and they will file in here, ready to rank."
        />

        {disagreed.length > 0 && (
          <section className="rank-sheet-iron">
            <button
              type="button"
              className="rank-sheet-iron-toggle"
              aria-label={`Disagreed (${disagreed.length})`}
              aria-expanded={showDisagreed}
              onClick={() => setShowDisagreed((p) => !p)}
            >
              ⊘ Disagreed ({disagreed.length})
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                style={{ transform: showDisagreed ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showDisagreed && (
              <div className="rank-sheet-iron-list">
                {disagreed.map((q) => (
                  <div key={q.id} className="rank-sheet-iron-row">
                    <span className="rank-sheet-iron-stub">{q.text}</span>
                    <button type="button" className="rank-sheet-iron-recover" onClick={() => reAgree(q)}>
                      Move to agreed
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {agreed.length > 0 && (
        <div className="rank-sheet-footer">
          <button type="button" className="ev-button-primary rank-sheet-results" onClick={onSeeResults}>
            See Results
          </button>
        </div>
      )}
    </dialog>
  );
};
