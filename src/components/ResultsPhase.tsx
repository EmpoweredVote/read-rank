import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR } from '../motion';
import { computeRevealTimeline } from '../utils/revealTimeline';
import { useReadRankStore, getAllAgreedQuotes, getActiveTopicKeys } from '../store/useReadRankStore';
import { fetchRaceReveal, type RevealResult } from '../data/api';
import { AlignmentSection } from './AlignmentSection';
import { CandidateBallotCard } from './CandidateBallotCard';
import { RevealBand } from './RevealBand';
import { CompassCrossLink } from './CompassCrossLink';
import type { AlignmentTopic } from '../utils/alignmentGrid';
import { buildPerTopicRankMap } from '../utils/alignmentMarks';
import { track } from '../lib/analytics';
import { isRaceComplete } from '../utils/raceProgressState';

export const ResultsPhase: React.FC = () => {
  const { goToHub, setPhase, currentRaceId, getRaceVerdicts, getCurrentRaceProgress } = useReadRankStore();
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [loading, setLoading] = useState(true);
  // The reveal call failed. Kept separate from "the ballot is empty": the user's
  // verdicts are safe in the store, so this is a retryable outage, not a verdict
  // on their choices.
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const m = useMotion();
  const race = getCurrentRaceProgress();
  const complete = race ? isRaceComplete(race, race.rankableTopicCount) : false;

  useEffect(() => {
    if (!currentRaceId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchRaceReveal(currentRaceId, getRaceVerdicts(currentRaceId))
      .then((result) => { if (!cancelled) setReveal(result); })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => setTimeout(() => { if (!cancelled) setLoading(false); }, 600));
    return () => { cancelled = true; };
  }, [currentRaceId, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const agreedList = race ? getAllAgreedQuotes(race) : [];
  const activeTopicKeys = race ? getActiveTopicKeys(race) : [];
  const topicCount = activeTopicKeys.length;

  const alignmentTopics = useMemo<AlignmentTopic[]>(
    () => (race ? getActiveTopicKeys(race).map((key) => ({ key, title: race.topics[key].title })) : []),
    [race]
  );

  const ballot = reveal?.ballot ?? [];
  const office = race?.positionName ?? reveal?.positionName ?? '';

  const rankMap = useMemo(
    () => (reveal ? buildPerTopicRankMap(reveal) : new Map<string, number>()),
    [reveal]
  );

  // Detect shared ranks for the tie tag. Unranked entries share no rank —
  // bucketing their nulls together would tag every one of them "Tied".
  const tiedRanks = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of ballot) {
      if (e.rank == null) continue;
      counts.set(e.rank, (counts.get(e.rank) ?? 0) + 1);
    }
    return counts;
  }, [ballot]);

  const ranked = useMemo(() => ballot.filter((e) => e.rank != null), [ballot]);
  const unranked = useMemo(() => ballot.filter((e) => e.rank == null), [ballot]);

  const filledCells = useMemo(
    () => alignmentTopics.length * ballot.length, // upper bound is fine for the timeline pacing
    [alignmentTopics.length, ballot.length]
  );
  const timeline = useMemo(
    () => computeRevealTimeline({ filledCells, reduced: m.reduced }),
    [filledCells, m.reduced]
  );

  if (loading) {
    return (
      <div className="text-center py-16">
        <motion.div className="inline-block w-6 h-6 border-2 rounded-full"
          style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--color-ev-muted-blue)' }}
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500, color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Tallying your ballot…
        </p>
      </div>
    );
  }

  // Outage, not an outcome. Must be checked before the empty-ballot state below,
  // which would otherwise tell the user they agreed with nothing.
  if (failed) {
    return (
      <div className="pb-12 max-w-2xl mx-auto">
        <RevealBand office={office} rankedCount={agreedList.length} topicCount={topicCount} />
        <div className="text-center py-10" role="alert">
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            We couldn&apos;t build your ballot
          </p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Something went wrong on our end. Your rankings are saved — nothing is lost.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 pt-2">
          <button onClick={() => setAttempt((n) => n + 1)} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
            Try again
          </button>
          <button onClick={() => setPhase('issue-selection')} className="ev-button-secondary" style={{ fontSize: '0.8125rem' }}>
            ← Back to your topics
          </button>
        </div>
      </div>
    );
  }

  if (ballot.length === 0) {
    return (
      <div className="pb-12 max-w-2xl mx-auto">
        <RevealBand office={office} rankedCount={agreedList.length} topicCount={topicCount} />
        <div className="text-center py-10">
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            No agreements yet
          </p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            You didn&apos;t agree with any quotes, so there&apos;s no ballot to build. Try another race.
          </p>
        </div>
        <div className="flex justify-center pt-6">
          <button onClick={() => { if (complete) { track('readrank_play_again_clicked'); goToHub(); } else setPhase('issue-selection'); }} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
            {complete ? 'Play another race near you' : '← Back to your topics'}
          </button>
        </div>
      </div>
    );
  }

  const top = ranked[0];
  const revealAnnouncement = top
    ? `Ballot revealed. Your number one is ${top.name}, agreed with ${top.evidence.agreementCount} position${top.evidence.agreementCount === 1 ? '' : 's'}.`
    : "Ballot revealed. You didn't agree with any of these positions, so there's no ranking to show.";

  return (
    <div className="pb-12 max-w-2xl mx-auto">
      <div aria-live="polite" role="status" className="sr-only">{revealAnnouncement}</div>

      <RevealBand office={office} rankedCount={agreedList.length} topicCount={topicCount} />

      <div className="space-y-4">
        <AlignmentSection reveal={reveal!} topics={alignmentTopics} rankMap={rankMap}
          animate frameDelayMs={timeline.gridFrame} cellBaseDelayMs={timeline.cellsStart} />

        {ranked.length > 0 && (
          <>
            <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', margin: '1.25rem 0 0.25rem' }}>
              How the candidates stack up
            </h3>
            {ranked.map((entry, i) => (
              <CandidateBallotCard key={entry.candidateId} entry={entry} totalTopics={topicCount}
                rankMap={rankMap}
                tied={entry.rank != null && (tiedRanks.get(entry.rank) ?? 0) > 1}
                landDelayMs={timeline.cardDelay(i)} />
            ))}
          </>
        )}

        {unranked.length > 0 && (
          <>
            <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', margin: '1.25rem 0 0.25rem' }}>
              {ranked.length > 0 ? 'Also on the ballot' : 'Who said what'}
            </h3>
            {ranked.length > 0 && (
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
                You read them, but didn&apos;t agree with any of their positions.
              </p>
            )}
            {/* Cascade index continues across both sections so the animation
                doesn't restart at the second heading. */}
            {unranked.map((entry, i) => (
              <CandidateBallotCard key={entry.candidateId} entry={entry} totalTopics={topicCount}
                rankMap={rankMap}
                landDelayMs={timeline.cardDelay(ranked.length + i)} />
            ))}
          </>
        )}

        <CompassCrossLink raceId={reveal?.raceId ?? ''} topTopicTitle={null} />
      </div>

      <motion.div className="flex flex-col items-center gap-3 pt-6"
        {...m.enter({ y: 12 })}
        transition={m.transition(DUR.moderate, EASE.settle, { delay: (timeline.cardDelay(ballot.length) + DUR.moderate) / 1000 })}>
        {!complete && (
          <button onClick={() => setPhase('issue-selection')} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
            ← Back to your topics
          </button>
        )}
        <button
          onClick={() => { track('readrank_play_again_clicked'); goToHub(); }}
          className={complete ? 'ev-button-primary' : 'ev-button-secondary'}
          style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}
        >
          Play another race near you
        </button>
        {complete && (
          <button onClick={() => setPhase('issue-selection')} className="ev-button-secondary" style={{ fontSize: '0.8125rem' }}>
            Review a topic
          </button>
        )}
      </motion.div>
    </div>
  );
};
