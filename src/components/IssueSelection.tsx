import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { track } from '../lib/analytics';
import { useMotion, EASE, DUR, STAGGER } from '../motion';

export const IssueSelection: React.FC = () => {
  const { getCurrentRaceProgress, setSelectedTopics, confirmIssueSelection } = useReadRankStore();
  const race = getCurrentRaceProgress();

  // Hooks must run unconditionally and in the same order on every render — the
  // useMemo below cannot sit behind an early return. When "All races" clears
  // currentRaceId while this (exiting) view is still mounted, race becomes null;
  // bailing out before the hook would drop the hook count and trigger React #300.
  const topicData = useMemo(() => {
    if (!race) return [];
    return race.topicOrder.map((key) => {
      const topic = race.topics[key];
      const uniqueTokens = new Set(topic.quotesToEvaluate.map((q) => q.candidateToken));
      return {
        topicKey: topic.topicKey,
        title: topic.title,
        quoteCount: topic.quotesToEvaluate.length,
        isScored: uniqueTokens.size > 1,
      };
    });
  }, [race]);

  const m = useMotion();

  if (!race) return null;

  const selectedKeys = race.selectedTopicKeys ?? race.topicOrder;

  const selectedScorableCount = topicData
    .filter((t) => t.isScored && selectedKeys.includes(t.topicKey))
    .length;

  const totalSelectedQuotes = topicData
    .filter((t) => t.isScored && selectedKeys.includes(t.topicKey))
    .reduce((sum, t) => sum + t.quoteCount, 0);

  const estimatedMinutes = Math.ceil(totalSelectedQuotes / 8);

  const toggleTopic = (key: string) => {
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key];
    setSelectedTopics(next);
  };

  const handleConfirm = () => {
    track('readrank_issue_selection_confirmed', {
      race_id: race.raceId,
      topics_selected: selectedScorableCount,
      total_quotes: totalSelectedQuotes,
      estimated_minutes: estimatedMinutes,
    });
    confirmIssueSelection();
  };

  return (
    <div className="issue-selection">
      <h1 className="issue-selection-title">Choose your issues.</h1>
      <p className="issue-selection-subtitle">
        Every issue keeps its own ranking. Rank them all, or just the ones you care about.
      </p>

      <div className="issue-selection-list">
        {topicData.map((topic, i) => {
          if (!topic.isScored) {
            return (
              <motion.div key={topic.topicKey} className="issue-row issue-row-unscored"
                {...m.enter({ y: 10 })}
                transition={m.transition(DUR.base, EASE.settle, { delay: i * (STAGGER.gridCell / 1000) })}>
                <span className="issue-check-tile" aria-hidden="true" />
                <span className="issue-topic-name">{topic.title}</span>
                <span className="issue-not-scored-label">NOT SCORED</span>
              </motion.div>
            );
          }

          const isSelected = selectedKeys.includes(topic.topicKey);
          return (
            <motion.button
              key={topic.topicKey}
              {...m.enter({ y: 10 })}
              transition={m.transition(DUR.base, EASE.settle, { delay: i * (STAGGER.gridCell / 1000) })}
              type="button"
              className={`issue-row issue-row-toggle ${isSelected ? 'issue-row-selected' : ''}`}
              onClick={() => toggleTopic(topic.topicKey)}
              aria-pressed={isSelected}
              aria-label={`${topic.title}, ${topic.quoteCount} quotes`}
            >
              <motion.span className={`issue-check-tile ${isSelected ? 'issue-check-tile-selected' : ''}`} aria-hidden="true"
                animate={m.reduced ? undefined : { scale: isSelected ? [1, 1.18, 1] : 1 }}
                transition={m.transition(DUR.fast, EASE.overshoot)}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--action-primary-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </motion.span>
              <span className="issue-topic-name">{topic.title}</span>
              <span className="issue-quote-count">{topic.quoteCount} quotes</span>
            </motion.button>
          );
        })}
      </div>

      <div className="issue-selection-footer">
        <button
          type="button"
          className="ev-button-primary"
          style={{ width: '100%', maxWidth: '28rem', fontSize: '1rem', padding: '0.875rem 1.5rem' }}
          disabled={selectedScorableCount === 0}
          onClick={handleConfirm}
        >
          {selectedScorableCount === 0
            ? 'Select at least one issue'
            : `Start · ${totalSelectedQuotes} quotes · about ${estimatedMinutes} min`}
        </button>
      </div>
    </div>
  );
};
