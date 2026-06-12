import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { fetchRaces, fetchRaceQuotes, type RaceSummary } from '../data/api';
import { shuffleArray } from '../utils/matchingAlgorithm';
import { AddressFilterInput } from './AddressFilterInput';
import { RaceCard } from './RaceCard';
import { deriveTierScope } from '../utils/raceTier';
import { estimateMinutes } from '../utils/estimateMinutes';

interface RaceHubProps {
  hideHeader?: boolean;
}

export const RaceHub: React.FC<RaceHubProps> = ({ hideHeader = false }) => {
  const { raceProgress, selectRace, locationFilter, clearLocationFilter } = useReadRankStore();
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const politicianIds = locationFilter?.politicianIds;

  useEffect(() => {
    setLoading(true);
    fetchRaces(politicianIds)
      .then((data) => {
        // Local races float to the top, then by election date.
        const sorted = [...data].sort((a, b) => {
          if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
          return (a.electionDate ?? '').localeCompare(b.electionDate ?? '');
        });
        setRaces(sorted);
      })
      .finally(() => setLoading(false));
  }, [politicianIds]);

  const handleSelect = useCallback(async (raceId: string) => {
    setStarting(raceId);
    try {
      const payload = await fetchRaceQuotes(raceId);
      const shuffled = {
        ...payload,
        topics: payload.topics.map((t) => ({ ...t, quotes: shuffleArray(t.quotes) })),
      };
      selectRace(shuffled);
    } finally {
      setStarting(null);
    }
  }, [selectRace]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--color-ev-muted-blue)' }} />
        <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Loading races…
        </p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {!hideHeader && (
        <motion.div
          className="max-w-2xl mx-auto mb-4"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-center" style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem',
            color: 'var(--text-heading)', letterSpacing: '-0.02em', margin: '0 0 0.25rem',
          }}>
            <span className="wordmark-underline">Read &amp; Rank</span>
          </h1>
          <p className="text-center" style={{
            fontFamily: "'Manrope', sans-serif", color: 'var(--text-secondary)', fontSize: '0.8125rem',
            lineHeight: 1.5, margin: '0 0 0.625rem',
          }}>
            Pick a race. Read what the candidates said — without knowing who said it — agree or
            disagree, rank your favorites, then reveal your ballot.
          </p>
        </motion.div>
      )}

      <div className="max-w-2xl mx-auto">
        <AddressFilterInput />
        {locationFilter && (
          <p className="text-center mb-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {races.some((r) => r.isLocal) ? 'Your local races are listed first.' : 'No local races with data yet — showing all.'}
          </p>
        )}
      </div>

      {races.length === 0 && (
        <motion.div className="max-w-2xl mx-auto text-center py-12"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            No races available yet
          </p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
            We&apos;re still gathering de-identified candidate quotes. Check back soon.
          </p>
          {locationFilter && (
            <button className="ev-button-secondary" onClick={clearLocationFilter}>Clear location filter</button>
          )}
        </motion.div>
      )}

      <div className="race-grid max-w-5xl mx-auto">
        {races.map((race) => {
          const progressState = raceProgress[race.raceId];
          const progress: 'none' | 'in-progress' | 'completed' = progressState?.completed
            ? 'completed'
            : progressState
              ? 'in-progress'
              : 'none';
          const { tier, scope } = deriveTierScope(race);
          const estMinutes = estimateMinutes({
            quoteCount: race.quoteCount,
            candidateCount: race.candidateCount,
            topicCount: race.topicCount,
          });
          return (
            <RaceCard
              key={race.raceId}
              office={race.positionName}
              tier={tier}
              scope={scope}
              state={race.state}
              districtLabel={race.districtLabel ?? null}
              electionDate={race.electionDate}
              boundaryRef={race.boundaryRef ?? null}
              frameRef={race.frameRef ?? null}
              candidateCount={race.candidateCount}
              topicCount={race.rankableTopicCount ?? race.topicCount}
              estMinutes={estMinutes}
              progress={progress}
              disabled={starting !== null}
              onSelect={() => handleSelect(race.raceId)}
            />
          );
        })}
      </div>
    </div>
  );
};
