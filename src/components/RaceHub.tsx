import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { fetchRaces, fetchRaceQuotes, type RaceSummary } from '../data/api';
import { shuffleArray } from '../utils/matchingAlgorithm';
import { AddressFilterInput } from './AddressFilterInput';

function formatElectionDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const RaceHub: React.FC = () => {
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

      <div className="max-w-2xl mx-auto space-y-3">
        {races.map((race, index) => {
          const progress = raceProgress[race.raceId];
          const isCompleted = progress?.completed;
          const isInProgress = progress && !progress.completed;
          const accent = isCompleted ? 'var(--text-link)' : isInProgress ? 'var(--color-ev-coral)' : 'var(--border-medium)';
          const statusText = isCompleted ? 'Completed' : isInProgress ? 'In progress' : `${race.candidateCount} candidates · ${race.topicCount} topics`;

          return (
            <motion.button
              key={race.raceId}
              onClick={() => handleSelect(race.raceId)}
              disabled={starting !== null}
              className="w-full text-left transition-all duration-200 group"
              style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '0.625rem',
                borderLeft: `3px solid ${accent}`,
                padding: 0,
                cursor: starting ? 'wait' : 'pointer',
                opacity: starting && starting !== race.raceId ? 0.6 : 1,
              }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ x: 4 }} whileTap={{ scale: 0.995 }}
            >
              <div style={{ padding: '0.75rem 1rem' }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-heading)', margin: 0 }}>
                    {race.positionName}
                    {race.isLocal && (
                      <span style={{
                        marginLeft: '0.5rem', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em',
                        textTransform: 'uppercase', color: 'var(--color-ev-coral)', backgroundColor: 'color-mix(in srgb, var(--color-ev-coral) 12%, transparent)',
                        padding: '0.125rem 0.375rem', borderRadius: '9999px', verticalAlign: 'middle',
                      }}>
                        Local
                      </span>
                    )}
                  </h3>
                  <span className="shrink-0" style={{
                    fontFamily: "'Manrope', sans-serif", fontSize: '0.625rem', fontWeight: 600,
                    padding: '0.125rem 0.5rem', borderRadius: '9999px', letterSpacing: '0.03em', textTransform: 'uppercase',
                    backgroundColor: isCompleted ? 'var(--agree-bg)' : isInProgress ? 'color-mix(in srgb, var(--color-ev-coral) 12%, transparent)' : 'var(--surface-raised)',
                    color: isCompleted ? 'var(--text-link)' : isInProgress ? 'var(--color-ev-coral)' : 'var(--text-tertiary)',
                  }}>
                    {isCompleted || isInProgress ? statusText : 'Play'}
                  </span>
                </div>

                {/* Stakes line — the election is real (REDESIGN_SPEC §1.1) */}
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.4, margin: '0.25rem 0 0' }}>
                  {race.electionName}
                  {race.state ? ` · ${race.state}` : ''}
                  {formatElectionDate(race.electionDate) ? ` · ${formatElectionDate(race.electionDate)}` : ''}
                </p>

                {/* Meta chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                  <span className="hub-meta-chip">{race.candidateCount} candidates</span>
                  <span className="hub-meta-chip">{race.topicCount} topics</span>
                  {race.usesRcv && (
                    <span className="hub-meta-chip hub-meta-chip-rcv">Ranked choice election</span>
                  )}
                </div>

                {/* Issue progress — only while in progress */}
                {isInProgress && progress && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem' }}>
                    <span style={{ display: 'inline-flex', gap: '0.25rem' }} aria-hidden="true">
                      {progress.topicOrder.map((key) => {
                        const t = progress.topics[key];
                        const done = t.currentIndex >= t.quotesToEvaluate.length;
                        const isActive = key === progress.currentTopicKey;
                        return (
                          <span
                            key={key}
                            className={`hub-progress-dot ${done ? 'hub-progress-dot-done' : ''} ${isActive ? 'hub-progress-dot-active' : ''}`}
                          />
                        );
                      })}
                    </span>
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                      {progress.topicOrder.filter((key) => {
                        const t = progress.topics[key];
                        return t.currentIndex >= t.quotesToEvaluate.length;
                      }).length} of {progress.topicOrder.length} topics
                    </span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
