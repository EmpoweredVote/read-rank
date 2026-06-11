import React from 'react';
import { useReadRankStore } from '../store/useReadRankStore';

/** Horizontal topic progress for the current race. Tap a topic to jump to it. */
export const TopicStepper: React.FC = () => {
  const { getCurrentRaceProgress, setCurrentTopic } = useReadRankStore();
  const race = getCurrentRaceProgress();
  if (!race) return null;

  const current = race.currentTopicKey;
  const topic = current ? race.topics[current] : null;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.875rem' }}>
        {race.topicOrder.map((key) => {
          const t = race.topics[key];
          const done = t.currentIndex >= t.quotesToEvaluate.length;
          const isCurrent = key === current;
          return (
            <button
              key={key}
              onClick={() => setCurrentTopic(key)}
              title={t.title}
              className={isCurrent ? 'topic-chip topic-chip-current' : 'topic-chip'}
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: '0.6875rem',
                fontWeight: isCurrent ? 700 : 500,
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                cursor: 'pointer',
                border: `1px solid ${isCurrent ? 'var(--text-link)' : 'var(--border-subtle)'}`,
                backgroundColor: isCurrent ? 'var(--agree-bg)' : done ? 'var(--surface-raised)' : 'var(--surface-card)',
                color: isCurrent ? 'var(--text-link)' : done ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                whiteSpace: 'nowrap',
                position: 'relative',
              }}
            >
              {done && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
              {t.title}
            </button>
          );
        })}
      </div>

      {topic && (
        <div className="question-banner">
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.9375rem', textAlign: 'center' }}>
            {topic.question}
          </h2>
        </div>
      )}
    </div>
  );
};
