import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { track } from '../lib/analytics';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import { isTopicDone } from '../utils/raceProgressState';
import { estimateMinutes, formatReadingTime } from '../utils/estimateMinutes';
import { RaceChip } from './RaceChip';

const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IssueSelection: React.FC = () => {
  const { getCurrentRaceProgress, setSelectedTopics, confirmIssueSelection, setPhase, goToHub } = useReadRankStore();
  const race = getCurrentRaceProgress();

  // Hooks must run unconditionally (see the no-crash regression test): race can be
  // null while this view is still exiting after "All races".
  const topicData = useMemo(() => {
    if (!race) return [];
    return race.topicOrder.map((key) => {
      const topic = race.topics[key];
      const uniqueTokens = new Set(topic.quotesToEvaluate.map((q) => q.candidateToken));
      return {
        key, // CARD key (what topicOrder/selectedTopicKeys hold)
        title: topic.title,
        quoteCount: topic.quotesToEvaluate.length,
        isScored: uniqueTokens.size > 1,
        isDone: isTopicDone(topic),
      };
    });
  }, [race]);

  const m = useMotion();
  if (!race) return null;

  const selectedKeys = race.selectedTopicKeys ?? race.topicOrder;
  const scorable = topicData.filter((t) => t.isScored);
  const doneCount = scorable.filter((t) => t.isDone).length;
  const isReentry = doneCount > 0;
  const selectedUndone = scorable.filter((t) => !t.isDone && selectedKeys.includes(t.key));
  const totalSelectedQuotes = selectedUndone.reduce((sum, t) => sum + t.quoteCount, 0);
  const estimatedMinutes = estimateMinutes({ quoteCount: totalSelectedQuotes, candidateCount: 0, topicCount: 0 });
  const showSeeBallotOnly = isReentry && selectedUndone.length === 0;

  const toggleTopic = (key: string) => {
    setSelectedTopics(selectedKeys.includes(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key]);
  };

  const handleConfirm = () => {
    track('readrank_issue_selection_confirmed', {
      race_id: race.raceId,
      topics_selected: selectedUndone.length,
      total_quotes: totalSelectedQuotes,
      estimated_minutes: estimatedMinutes,
    });
    confirmIssueSelection();
  };

  const rowEnter = (i: number) => ({
    ...m.enter({ y: 10 }),
    transition: m.transition(DUR.base, EASE.settle, { delay: i * (STAGGER.gridCell / 1000) }),
  });

  return (
    <div className="rr-issues">
      <div className="rr-issues__intro">
        <nav aria-label="Breadcrumb">
        <button type="button" className="rr-issues__back" onClick={goToHub}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All races
        </button>
        </nav>
        <RaceChip
          office={race.office ?? race.positionName}
          seat={race.seat} state={race.state} electionDate={race.electionDate}
          tier={race.tier} scope={race.scope} boundaryRef={race.boundaryRef} frameRef={race.frameRef}
        />
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mt-8" style={{ color: 'var(--text-heading)' }}>
          Choose your issues
        </h1>
        <p className="text-lg leading-relaxed mt-3 max-w-[48ch]" style={{ color: 'var(--text-secondary)' }}>
          Pick the topics you care about. You'll read what each candidate said, then rank them.
        </p>
        {isReentry && (
          <div className="rr-issues__progress">
            <div className="rr-issues__progress-row">
              <span><strong>{doneCount} of {scorable.length}</strong> issues ranked</span>
              <span>Welcome back</span>
            </div>
            <div className="rr-issues__bar" role="progressbar" aria-label="Issues ranked"
              aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={scorable.length}
              aria-valuetext={`${doneCount} of ${scorable.length} issues ranked`}>
              <div className="rr-issues__bar-fill" style={{ width: `${(doneCount / Math.max(1, scorable.length)) * 100}%` }} />
            </div>
          </div>
        )}
        <p className="rr-issues__note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M1 1l22 22" />
          </svg>
          Quotes are shown without names or parties. You'll find out who said what after you rank.
        </p>
      </div>

      <div className="rr-issues__panel">
        <div className="rr-issues__panel-head">
          <h2>Issues in this race</h2>
          <span>{scorable.length} available</span>
        </div>
        <div className="rr-issues__list">
          {topicData.map((topic, i) => {
            if (topic.isScored && topic.isDone) {
              return (
                <motion.div key={topic.key} className="rr-issue rr-issue--done" data-testid={`issue-done-${topic.key}`} {...rowEnter(i)}>
                  <span className="rr-issue__tile rr-issue__tile--on"><CheckIcon /></span>
                  <span className="rr-issue__text">
                    <span className="rr-issue__title">{topic.title}</span>
                    <span className="rr-issue__meta">{topic.quoteCount} quotes · already ranked</span>
                  </span>
                  <span className="rr-pill rr-pill--done"><CheckIcon size={10} />Ranked</span>
                </motion.div>
              );
            }
            if (!topic.isScored) {
              return (
                <motion.div key={topic.key} className="rr-issue rr-issue--unscored" {...rowEnter(i)}>
                  <span className="rr-issue__tile" aria-hidden="true" />
                  <span className="rr-issue__text">
                    <span className="rr-issue__title">{topic.title}</span>
                    <span className="rr-issue__meta">
                      {topic.quoteCount} {topic.quoteCount === 1 ? 'quote' : 'quotes'} · one candidate
                    </span>
                  </span>
                  <span className="rr-pill">Not scored</span>
                </motion.div>
              );
            }
            const isSelected = selectedKeys.includes(topic.key);
            return (
              <motion.button key={topic.key} type="button" {...rowEnter(i)}
                className={`rr-issue rr-issue--toggle${isSelected ? ' rr-issue--selected' : ''}`}
                onClick={() => toggleTopic(topic.key)}
                aria-pressed={isSelected}
              >
                <motion.span className={`rr-issue__tile${isSelected ? ' rr-issue__tile--on' : ''}`} aria-hidden="true"
                  animate={m.reduced ? undefined : { scale: isSelected ? [1, 1.18, 1] : 1 }}
                  transition={m.transition(DUR.fast, EASE.overshoot)}>
                  {isSelected && <CheckIcon />}
                </motion.span>
                <span className="rr-issue__text">
                  <span className="rr-issue__title">{topic.title}</span>
                  <span className="rr-issue__meta">{topic.quoteCount} quotes · {formatReadingTime(topic.quoteCount)}</span>
                </span>
                <span className="rr-pill">Not started</span>
              </motion.button>
            );
          })}
        </div>

        {showSeeBallotOnly ? (
          <button type="button" className="rr-issues__cta" onClick={() => setPhase('results')}>
            See your ballot
          </button>
        ) : (
          <button type="button" className="rr-issues__cta" disabled={selectedUndone.length === 0} onClick={handleConfirm}
            aria-label={selectedUndone.length === 0 ? undefined
              : `Start reading · ${totalSelectedQuotes} quotes · about ${estimatedMinutes} min`}>
            {selectedUndone.length === 0
              ? 'Select at least one issue'
              : <><span>Start reading</span>
                  <span className="rr-issues__cta-meta"><span className="rr-issues__cta-sep"> · </span>{totalSelectedQuotes} quotes · about {estimatedMinutes} min</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>}
          </button>
        )}
        {isReentry && !showSeeBallotOnly && (
          <button type="button" className="rr-text-btn rr-issues__ballot-link" onClick={() => setPhase('results')}>
            See your ballot so far
          </button>
        )}
      </div>
    </div>
  );
};
