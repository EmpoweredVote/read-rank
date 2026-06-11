import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { RankRail } from './RankRail';

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
  const { getCurrentTopicProgress } = useReadRankStore();
  const topic = getCurrentTopicProgress();
  const agreed = topic?.agreed ?? [];

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
        <RankRail variant="sheet" />
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
