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

export const ResultsPhase: React.FC = () => {
  const { goToHub, currentRaceId, getRaceVerdicts, getCurrentRaceProgress } = useReadRankStore();
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [loading, setLoading] = useState(true);
  const m = useMotion();
  const race = getCurrentRaceProgress();

  useEffect(() => {
    if (!currentRaceId) { setLoading(false); return; }
    fetchRaceReveal(currentRaceId, getRaceVerdicts(currentRaceId))
      .then(setReveal)
      .finally(() => setTimeout(() => setLoading(false), 600));
  }, [currentRaceId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Detect shared ranks for the tie tag.
  const tiedRanks = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of ballot) counts.set(e.rank, (counts.get(e.rank) ?? 0) + 1);
    return counts;
  }, [ballot]);

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
          <button onClick={() => { track('readrank_play_again_clicked'); goToHub(); }} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
            Play another race near you
          </button>
        </div>
      </div>
    );
  }

  const top = ballot[0];
  const revealAnnouncement = top
    ? `Ballot revealed. Your number one is ${top.name}, agreed with ${top.evidence.agreementCount} position${top.evidence.agreementCount === 1 ? '' : 's'}.`
    : '';

  return (
    <div className="pb-12 max-w-2xl mx-auto">
      <div aria-live="polite" role="status" className="sr-only">{revealAnnouncement}</div>

      <RevealBand office={office} rankedCount={agreedList.length} topicCount={topicCount} />

      <div className="space-y-4">
        <AlignmentSection reveal={reveal!} topics={alignmentTopics} rankMap={rankMap}
          animate frameDelayMs={timeline.gridFrame} cellBaseDelayMs={timeline.medalsStart} />

        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', margin: '1.25rem 0 0.25rem' }}>
          How the candidates stack up
        </h3>

        {ballot.map((entry, i) => (
          <CandidateBallotCard key={entry.candidateId} entry={entry} totalTopics={topicCount}
            rankMap={rankMap}
            tied={(tiedRanks.get(entry.rank) ?? 0) > 1}
            landDelayMs={timeline.cardDelay(i)} />
        ))}

        <CompassCrossLink raceId={reveal?.raceId ?? ''} topTopicTitle={null} />
      </div>

      <motion.div className="flex justify-center pt-6"
        {...m.enter({ y: 12 })}
        transition={m.transition(DUR.moderate, EASE.settle, { delay: (timeline.cardDelay(ballot.length) + DUR.moderate) / 1000 })}>
        <button onClick={() => goToHub()} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
          Play another race near you
        </button>
      </motion.div>
    </div>
  );
};
