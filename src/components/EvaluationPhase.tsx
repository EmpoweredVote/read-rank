import React from 'react';
import { useReadRankStore, getActiveTopicKeys, type BlindQuote } from '../store/useReadRankStore';
import { track } from '../lib/analytics';
import { TopicStepper } from './TopicStepper';
import { EvaluationSurface } from './EvaluationSurface';
import { useRaceRankSource } from './RankSource';

export const EvaluationPhase: React.FC = () => {
  const {
    agree,
    disagree,
    revealBallot,
    nextTopic,
    getCurrentRaceProgress,
    getCurrentTopicProgress,
    coachMarksCompleted,
    completeCoachMarks,
  } = useReadRankStore();

  const race = getCurrentRaceProgress();
  const topic = getCurrentTopicProgress();
  const source = useRaceRankSource();

  const agreed = topic?.agreed ?? [];
  const quotesToEvaluate = topic?.quotesToEvaluate ?? [];
  const currentIndex = topic?.currentIndex ?? 0;
  const currentQuote = quotesToEvaluate[currentIndex];

  const activeTopicKeys = race ? getActiveTopicKeys(race) : [];
  const currentTopicIdx = race?.currentTopicKey ? activeTopicKeys.indexOf(race.currentTopicKey) : 0;
  const isLastTopic = currentTopicIdx >= activeTopicKeys.length - 1;
  const allTopicsDone = race
    ? activeTopicKeys.every((k) => {
        const t = race.topics[k];
        return t ? t.currentIndex >= t.quotesToEvaluate.length : true;
      })
    : false;

  const onVerdict = (direction: 'agree' | 'disagree', quote: BlindQuote) => {
    track('readrank_verdict', {
      verdict: direction,
      race_id: race?.raceId,
      topic_key: quote.topicKey,
      quote_id: quote.id,
      candidate_token: quote.candidateToken,
      agreed_so_far: agreed.length,
    });
    if (direction === 'agree') agree(quote);
    else disagree(quote);
  };

  const completeState = (
    <div className="evaluation-complete-card">
      <div className="text-center py-8">
        <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-link)', marginBottom: '0.5rem' }}>
          {isLastTopic ? 'All topics done' : 'Topic complete'}
        </div>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
          {isLastTopic ? "Reveal your ballot when you're ready." : 'Move on, or keep ranking your pile.'}
        </p>
        {!isLastTopic && (
          <button onClick={nextTopic} className="ev-button-primary" style={{ marginTop: '1rem', fontSize: '0.9375rem' }}>
            Next topic →
          </button>
        )}
      </div>
    </div>
  );

  return (
    <EvaluationSurface
      currentQuote={currentQuote}
      progress={{ current: Math.min(currentIndex + 1, quotesToEvaluate.length), total: quotesToEvaluate.length }}
      allDone={allTopicsDone}
      onVerdict={onVerdict}
      source={source}
      header={<TopicStepper />}
      completeState={completeState}
      reveal={{ label: 'Reveal my ballot', onReveal: revealBallot, enabled: agreed.length >= 1 }}
      showCoachMarks={!coachMarksCompleted}
      onCoachComplete={completeCoachMarks}
    />
  );
};
