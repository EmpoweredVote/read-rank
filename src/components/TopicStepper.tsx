import React, { useState } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { TopicPickerSheet } from './TopicPickerSheet';

/**
 * The issue header for the current race. A single compact eyebrow (issue
 * position + title) keeps the quote and question as the hero (REDESIGN_SPEC
 * §178); the full issue list lives behind a tap in the TopicPickerSheet
 * rather than a wrapping chip grid that pushed the quote below the fold.
 */
export const TopicStepper: React.FC = () => {
  const { getCurrentRaceProgress } = useReadRankStore();
  const race = getCurrentRaceProgress();
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!race) return null;

  const current = race.currentTopicKey;
  const topic = current ? race.topics[current] : null;
  const total = race.topicOrder.length;
  const position = current ? race.topicOrder.indexOf(current) + 1 : 0;

  return (
    <div>
      <button
        type="button"
        className="issue-eyebrow"
        onClick={() => setPickerOpen(true)}
        aria-label={`Issue ${position} of ${total}${topic ? `, ${topic.title}` : ''}.  Tap to change issue.`}
      >
        <span className="issue-eyebrow-kicker">Issue {position} of {total}</span>
        {topic && <span className="issue-eyebrow-sep" aria-hidden="true">·</span>}
        {topic && <span className="issue-eyebrow-topic">{topic.title}</span>}
        <svg className="issue-eyebrow-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {topic && (
        <div className="question-banner">
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.9375rem', textAlign: 'center' }}>
            {topic.question}
          </h2>
        </div>
      )}

      <TopicPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
};
