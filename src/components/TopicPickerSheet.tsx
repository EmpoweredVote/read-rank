import React, { useEffect, useRef } from 'react';
import { useReadRankStore, getActiveTopicKeys } from '../store/useReadRankStore';

export interface TopicPickerSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Issue picker (REDESIGN_SPEC §52: issue selection is its own surface, not a
 * chip grid crammed onto the evaluation screen). Opened from the issue eyebrow.
 * Lists every issue with its one-line question and per-issue progress; tapping
 * jumps to that issue. Mounts only while open.
 */
export const TopicPickerSheet: React.FC<TopicPickerSheetProps> = ({ open, onClose }) => {
  if (!open) return null;
  return <TopicPickerDialog onClose={onClose} />;
};

const TopicPickerDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const { getCurrentRaceProgress, setCurrentTopic } = useReadRankStore();
  const race = getCurrentRaceProgress();

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  if (!race) return null;
  const current = race.currentTopicKey;
  const activeKeys = getActiveTopicKeys(race);

  const choose = (key: string) => {
    setCurrentTopic(key);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="topic-picker-sheet"
      onClose={() => {
        // Ignore stale close events from StrictMode's effect replay.
        if (!ref.current?.open) onClose();
      }}
      onCancel={onClose}
      aria-label="Jump to an issue"
    >
      <div className="topic-picker-handle-region" aria-hidden="true">
        <span className="topic-picker-handle" />
      </div>

      <header className="topic-picker-header">
        <h2 className="topic-picker-title">Jump to an issue</h2>
        <button type="button" className="topic-picker-done" onClick={onClose}>
          Done
        </button>
      </header>

      <div className="topic-picker-body">
        {activeKeys.map((key) => {
          const t = race.topics[key];
          const total = t.quotesToEvaluate.length;
          const seen = Math.min(t.currentIndex, total);
          const done = t.currentIndex >= total;
          const isCurrent = key === current;
          return (
            <button
              key={key}
              type="button"
              className={`topic-picker-row${isCurrent ? ' topic-picker-row-current' : ''}${done ? ' topic-picker-row-done' : ''}`}
              aria-current={isCurrent || undefined}
              onClick={() => choose(key)}
            >
              <span className="topic-picker-dot" aria-hidden="true">
                {done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="topic-picker-row-main">
                <span className="topic-picker-row-title">{t.title}</span>
                <span className="topic-picker-row-q">{t.question}</span>
              </span>
              <span className="topic-picker-row-count">{seen}/{total}</span>
            </button>
          );
        })}
      </div>
    </dialog>
  );
};
