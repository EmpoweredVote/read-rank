import React, { useEffect, useRef } from 'react';
import { useReadRankStore, getActiveTopicKeys, getAllAgreedQuotes, type BlindQuote } from '../store/useReadRankStore';
import { track } from '../lib/analytics';
import { TopicStepper } from './TopicStepper';
import { EvaluationSurface } from './EvaluationSurface';
import { useRaceRankSource } from './RankSource';
import { isRaceComplete } from '../utils/raceProgressState';

export const EvaluationPhase: React.FC = () => {
  const {
    agree,
    disagree,
    revealBallot,
    nextTopic,
    setCurrentTopic,
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
  const isLastPosition = currentTopicIdx >= activeTopicKeys.length - 1;
  const allTopicsDone = race
    ? activeTopicKeys.every((k) => {
        const t = race.topics[k];
        return t ? t.currentIndex >= t.quotesToEvaluate.length : true;
      })
    : false;
  // The "last topic" variant means every topic is finished, not that the user
  // happens to stand on the last one (they can jump around).
  const isLastTopic = allTopicsDone;
  const firstUnfinishedKey = race
    ? activeTopicKeys.find((k) => {
        const t = race.topics[k];
        return t ? t.currentIndex < t.quotesToEvaluate.length : false;
      })
    : undefined;
  // nextTopic is a no-op at the last position, so route to the first
  // unfinished topic explicitly when we are there.
  const goNext = () => {
    if (isLastPosition && firstUnfinishedKey) setCurrentTopic(firstUnfinishedKey);
    else nextTopic();
  };

  const raceAgreedCount = race ? getAllAgreedQuotes(race).length : 0;
  const revealLabel = isRaceComplete(race ?? undefined, race?.rankableTopicCount) ? 'See your full ballot' : 'Reveal ballot';
  // Mid-race the reveal waits for a first agreement, so nobody reveals an empty
  // ballot one quote in. But once every selected topic is triaged there is
  // nothing left to do, and gating on agreements alone stranded anyone who
  // disagreed with everything: the screen said "Reveal your ballot when you're
  // ready" with no control anywhere. Finishing the race is its own entitlement.
  const canReveal = raceAgreedCount >= 1 || allTopicsDone;

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

  const topicAgreed = topic?.agreed.length ?? 0;
  const topicDisagreed = topic?.disagreed.length ?? 0;
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);
  const showingComplete = !currentQuote;
  useEffect(() => {
    if (showingComplete) doneHeadingRef.current?.focus({ preventScroll: true });
  }, [showingComplete, race?.currentTopicKey]);

  const revealButton = canReveal && (
    <button type="button" onClick={revealBallot}
      className={isLastTopic ? 'ev-button-primary' : 'ev-button-secondary'}>
      {revealLabel}
    </button>
  );

  const completeState = (
    <div className="topic-done">
      <span className="topic-done__icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
          strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </span>
      <h2 ref={doneHeadingRef} tabIndex={-1} className="topic-done__title">
        {isLastTopic ? 'All topics done' : 'Topic complete'}
      </h2>
      <div className="topic-done__chips">
        <span className="topic-done__chip topic-done__chip--agreed">{topicAgreed} AGREED</span>
        <span className="topic-done__chip topic-done__chip--disagreed">{topicDisagreed} DISAGREED</span>
      </div>
      <p className="topic-done__text">
        {isLastTopic ? "Reveal your ballot when you're ready." : 'Move on to the next topic, or keep arranging your ranking.'}
      </p>
      <div className="topic-done__actions">
        {!isLastTopic && (
          <button type="button" onClick={goNext} className="ev-button-primary">Next topic →</button>
        )}
        {revealButton}
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
      reveal={{ label: revealLabel, onReveal: revealBallot, enabled: canReveal }}
      revealInCompleteState
      showCoachMarks={!coachMarksCompleted}
      onCoachComplete={completeCoachMarks}
    />
  );
};
