import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR } from '../motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { fetchRaces, fetchRaceQuotes, type RaceSummary } from '../data/api';
import { shuffleArray } from '../utils/matchingAlgorithm';
import { AddressFilterInput } from './AddressFilterInput';
import { RaceBrowse } from './RaceBrowse';
import { RaceCard } from './RaceCard';
import { deriveTierScope } from '../utils/raceTier';
import { estimateMinutes } from '../utils/estimateMinutes';
import { deriveProgressState, progressLabel, type ProgressState } from '../utils/raceProgressState';
import { groupRaces, racesInCounty, type TimeFilter } from '../utils/raceGrouping';
import { getStateName } from '../utils/stateNames';
import { track } from '../lib/analytics';

/** Default showcase location when nothing is known about the user (Los Angeles County). */
const LA_COUNTY_GEOID = '06037';

interface RaceHubProps {
  hideHeader?: boolean;
  hideFilter?: boolean;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const RaceHub: React.FC<RaceHubProps> = ({ hideHeader = false, hideFilter = false }) => {
  const {
    raceProgress, selectRace, locationFilter, clearLocationFilter,
    counties, setCounties, browseTarget, setBrowseTarget,
  } = useReadRankStore();
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');

  const m = useMotion();
  const politicianIds = locationFilter?.politicianIds;

  useEffect(() => {
    setLoading(true);
    fetchRaces(politicianIds)
      .then(({ races, counties }) => { setRaces(races); setCounties(counties); })
      .finally(() => setLoading(false));
  }, [politicianIds, setCounties]);

  const handleSelect = useCallback(async (race: RaceSummary) => {
    setStarting(race.raceId);
    try {
      const payload = await fetchRaceQuotes(race.raceId);
      const shuffled = {
        ...payload,
        topics: payload.topics.map((t) => ({ ...t, quotes: shuffleArray(t.quotes) })),
      };
      selectRace(shuffled, { office: race.office, seat: race.seat ?? null, state: race.state });
      track('readrank_race_started', {
        race_id: race.raceId,
        office: race.office,
        state: race.state,
        seat: race.seat ?? null,
        candidate_count: race.candidateCount,
        topic_count: race.topicCount,
        located: locationFilter != null,
      });
    } finally {
      setStarting(null);
    }
  }, [selectRace]);

  const renderCard = useCallback((race: RaceSummary, enterIndex?: number) => {
    const progressState = raceProgress[race.raceId];
    const info = deriveProgressState(progressState, race.rankableTopicCount);
    const progress: ProgressState = info.state;
    const statusLabel = progressLabel(info);
    const { tier, scope } = deriveTierScope(race);
    const estMinutes = estimateMinutes({
      quoteCount: race.quoteCount,
      candidateCount: race.candidateCount,
      topicCount: race.topicCount,
    });
    return (
      <RaceCard
        key={race.raceId}
        office={race.office}
        tier={tier}
        scope={scope}
        state={race.state}
        seat={race.seat ?? null}
        electionDate={race.electionDate}
        boundaryRef={race.boundaryRef ?? null}
        frameRef={race.frameRef ?? null}
        candidateCount={race.candidateCount}
        topicCount={race.rankableTopicCount ?? race.topicCount}
        estMinutes={estMinutes}
        progress={progress}
        progressLabel={statusLabel}
        disabled={starting !== null}
        onSelect={() => handleSelect(race)}
        enterIndex={enterIndex}
      />
    );
  }, [raceProgress, starting, handleSelect]);

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

  const located = locationFilter != null;
  const userState = locationFilter?.state ?? null;
  const userCounty = locationFilter?.county ?? null;
  const userCountyName = locationFilter?.countyName ?? null;

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.75rem',
    letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-link)',
    margin: '1.25rem 0 0.5rem',
  };

  let content: React.ReactNode = null;

  if (races.length === 0) {
    // No races at all — nothing to browse or locate.
    content = (
      <motion.div className="max-w-2xl mx-auto text-center py-12"
        {...m.enter({ y: 8 })} transition={m.transition(DUR.base, EASE.settle)}>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
          No races available yet
        </p>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
          We&apos;re still gathering de-identified candidate quotes. Check back soon.
        </p>
        {located && (
          <button className="ev-button-secondary" onClick={clearLocationFilter}>Clear location filter</button>
        )}
      </motion.div>
    );
  } else if (browseTarget) {
    // View 1 — explicit browse (Browse button, or a place-name smart search).
    content = (
      <div className="w-full">
        <button className="ev-button-secondary" style={{ marginTop: '0.5rem' }} onClick={() => setBrowseTarget(null)}>
          ‹ Back to my ballot
        </button>
        <RaceBrowse
          key={`${browseTarget.state}:${browseTarget.geoid ?? 'all'}`}
          races={races}
          counties={counties}
          onSelect={handleSelect}
          initial={browseTarget}
          disabled={starting !== null}
        />
      </div>
    );
  } else if (located) {
    // View 2 — Your Ballot (grouped tiers; empties already dropped by groupRaces).
    const { sections, noExactMatch } = groupRaces({
      races, located, userState, userCounty, userCountyName, timeFilter, today: todayISO(),
    });
    content = (
      <div className="w-full">
        {/* Time filter chips */}
        <div className="flex gap-2 justify-start mt-2 mb-1" role="group" aria-label="Filter by election timing">
          {(['upcoming', 'past'] as const).map((tf) => {
            const active = timeFilter === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                aria-pressed={active}
                className="rounded-full px-4 py-1.5 text-sm transition-colors"
                style={{
                  fontFamily: "'Manrope', sans-serif", fontWeight: active ? 700 : 500,
                  border: active ? 'none' : '1px solid var(--border-subtle)',
                  background: active ? 'var(--color-ev-muted-blue)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {tf === 'upcoming' ? 'Upcoming' : 'Past'}
              </button>
            );
          })}
        </div>

        {/* No-exact-match note — point at the county if we have one, else the state */}
        {noExactMatch && sections.some((s) => s.kind === 'county' || s.kind === 'state') && (
          <p className="text-center mb-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            We couldn&apos;t pinpoint your exact districts — here are races in {
              sections.some((s) => s.kind === 'county')
                ? (userCountyName ?? 'your county')
                : (getStateName(userState) ?? 'your state')
            }.
          </p>
        )}

        {/* Empty bucket */}
        {sections.length === 0 && (
          <p className="text-center py-10" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {timeFilter === 'upcoming' ? 'No upcoming races yet — try Past.' : 'No past races.'}
          </p>
        )}

        {/* Sections */}
        {sections.map((section) => (
          <div key={`${section.kind}-${section.label}`}>
            <div style={sectionLabelStyle}>
              {section.label}
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}> · {section.races.length}</span>
            </div>
            <div className="race-grid" id={`race-grid-${section.kind}`}>
              {section.races.map((race, i) => renderCard(race, i))}
            </div>
          </div>
        ))}

        <button
          className="ev-button-secondary"
          style={{ marginTop: '1.25rem' }}
          onClick={() => setBrowseTarget({ state: userState ?? 'CA', geoid: null })}
        >
          Browse other races ›
        </button>
      </div>
    );
  } else {
    // View 3 — no location: example Los Angeles ballot.
    const laRaces = racesInCounty(races, LA_COUNTY_GEOID);
    content = (
      <div className="w-full">
        <p className="rr-example-note">Enter your address above to see your own races.</p>
        <div className="race-grid">
          {laRaces.map((r, i) => renderCard(r, i))}
        </div>
        <button
          className="ev-button-secondary"
          style={{ marginTop: '1.25rem' }}
          onClick={() => setBrowseTarget({ state: 'CA', geoid: null })}
        >
          Browse all races ›
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {!hideHeader && (
        <motion.div
          className="max-w-2xl mx-auto mb-4"
          {...m.enter({ y: 12 })}
          transition={m.transition(DUR.moderate, EASE.settle)}
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
        {!hideFilter && <AddressFilterInput />}
      </div>

      {content}
    </div>
  );
};
