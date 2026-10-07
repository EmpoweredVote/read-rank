import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR } from '../motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { fetchRaces, fetchRaceQuotes, prefetchBoundaries, type RaceSummary } from '../data/api';
import { shuffleArray } from '../utils/matchingAlgorithm';
import { AddressFilterInput } from './AddressFilterInput';
import { BrowseHeader } from './BrowseHeader';
import { RaceBrowse } from './RaceBrowse';
import { RaceCard } from './RaceCard';
import { TimeFilterSwitch } from './TimeFilterSwitch';
import { deriveTierScope } from '../utils/raceTier';
import { estimateMinutes } from '../utils/estimateMinutes';
import { raceCardProgress, isRaceComplete } from '../utils/raceProgressState';
import { groupRaces, type TimeFilter } from '../utils/raceGrouping';
import { getStateName } from '../utils/stateNames';
import { track } from '../lib/analytics';
import { DEFAULT_RACE_ID } from '../config/liveContent';

interface RaceHubProps {
  hideHeader?: boolean;
  hideFilter?: boolean;
  /** Controlled time filter. When omitted, RaceHub keeps its own state. */
  timeFilter?: TimeFilter;
  onTimeFilterChange?: (next: TimeFilter) => void;
  /** Hide RaceHub's own switch (the parent renders it, e.g. Landing's header row). */
  hideTimeFilter?: boolean;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const RaceHub: React.FC<RaceHubProps> = ({ hideHeader = false, hideFilter = false, timeFilter: timeFilterProp, onTimeFilterChange, hideTimeFilter = false }) => {
  const {
    raceProgress, selectRace, locationFilter, clearLocationFilter,
    counties, setCounties, browseTarget, setBrowseTarget,
  } = useReadRankStore();
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState(false);
  const [timeFilterState, setTimeFilterState] = useState<TimeFilter>('upcoming');
  const timeFilter = timeFilterProp ?? timeFilterState;
  const setTimeFilter = (next: TimeFilter) => {
    if (timeFilterProp === undefined) setTimeFilterState(next);
    onTimeFilterChange?.(next);
  };

  const m = useMotion();
  const politicianIds = locationFilter?.politicianIds;
  const jurisdiction = locationFilter?.jurisdiction ?? null;
  // fetchRaces takes `jurisdiction` as an object, but a new address search (or a
  // store rehydrate) creates a new object identity every time even when the
  // underlying geoids are unchanged. Deriving a flat string key lets the effect
  // below depend on the *content* of the jurisdiction rather than its identity,
  // so we refetch exactly when the geoids actually change instead of on every
  // render (which would otherwise loop: fetch -> setRaces -> render -> new
  // jurisdiction object -> fetch -> ...).
  const jurisdictionKey = useMemo(
    () => jurisdiction
      ? [
          jurisdiction.congressional,
          jurisdiction.state_senate,
          jurisdiction.state_house,
          jurisdiction.county,
          jurisdiction.school_district,
        ].join('|')
      : '',
    [jurisdiction],
  );

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    // Inline geometry for cards shown immediately so their motif doesn't flash: the
    // featured default race on the no-location landing, or the user's own ("Your races")
    // isLocal races on a located ballot.
    const embed = locationFilter == null ? [DEFAULT_RACE_ID] : undefined;
    const embedLocal = locationFilter != null;
    fetchRaces(politicianIds, jurisdiction, embed, embedLocal)
      .then(({ races, counties }) => { setRaces(races); setCounties(counties); })
      // Production throws instead of serving mock races; show a real error state.
      .catch(() => { setRaces([]); setLoadError(true); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [politicianIds, setCounties, jurisdictionKey, reloadKey]);

  // Warm boundary geometry for the cards this view will show, so their map motifs
  // resolve without the dot-field placeholder flashing. Browse renders its own (large)
  // list, so skip it here — the cards fetch on mount and dedupe against the cache.
  useEffect(() => {
    if (loading || browseTarget) return;
    let toShow: RaceSummary[];
    if (locationFilter != null) {
      const { sections } = groupRaces({
        races, located: true, userState: locationFilter.state ?? null,
        userCounty: locationFilter.county ?? null, userCountyName: locationFilter.countyName ?? null,
        timeFilter, today: todayISO(),
      });
      toShow = sections.flatMap((s) => s.races);
    } else {
      const featured = races.find((r) => r.raceId === DEFAULT_RACE_ID);
      toShow = featured ? [featured] : races.filter((r) => (r.rankableTopicCount ?? r.topicCount) > 0);
    }
    prefetchBoundaries(toShow.flatMap((r) => [r.boundaryRef, r.frameRef]));
  }, [loading, browseTarget, races, timeFilter, locationFilter]);

  const handleSelect = useCallback(async (race: RaceSummary) => {
    setStarting(race.raceId);
    setStartError(false);
    // Capture resume state BEFORE selectRace mutates the store. Read fresh state
    // (not the render-closure `raceProgress`) since this callback isn't recreated
    // when progress changes. Drives the `resumed` funnel property below.
    const existingProgress = useReadRankStore.getState().raceProgress[race.raceId];
    const resumed = existingProgress != null;
    try {
      const payload = await fetchRaceQuotes(race.raceId);
      const shuffled = {
        ...payload,
        topics: payload.topics.map((t) => ({ ...t, quotes: shuffleArray(t.quotes) })),
      };
      const { tier, scope } = deriveTierScope(race);
      selectRace(shuffled, {
        office: race.office, seat: race.seat ?? null, state: race.state,
        rankableTopicCount: race.rankableTopicCount ?? race.topicCount,
        electionDate: race.electionDate ?? null, tier, scope,
        boundaryRef: race.boundaryRef ?? null, frameRef: race.frameRef ?? null,
      });
      track('readrank_race_started', {
        race_id: race.raceId,
        office: race.office,
        state: race.state,
        seat: race.seat ?? null,
        candidate_count: race.candidateCount,
        topic_count: race.topicCount,
        located: locationFilter != null,
        // Did this race already have local progress? true = returning to resume,
        // false = starting fresh. Lets us measure the refresh/resume feature.
        resumed,
        resumed_completed: resumed ? isRaceComplete(existingProgress, race.rankableTopicCount ?? race.topicCount) : false,
      });
    } catch {
      // Production throws instead of serving mock quotes; tell the user and stay on the hub.
      setStartError(true);
    } finally {
      setStarting(null);
    }
  }, [selectRace]);

  const renderCard = useCallback((race: RaceSummary, enterIndex?: number) => {
    const { progress, label } = raceCardProgress(raceProgress[race.raceId], race.rankableTopicCount);
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
        progressLabel={label}
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

  if (loadError) {
    // The race list failed to load. Say so — never imply the area simply has no races.
    content = (
      <motion.div className="max-w-2xl mx-auto text-center py-12" role="alert"
        {...m.enter({ y: 8 })} transition={m.transition(DUR.base, EASE.settle)}>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
          We couldn&apos;t load races
        </p>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
          Something went wrong on our end. Please try again in a moment.
        </p>
        <button className="ev-button-secondary" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
      </motion.div>
    );
  } else if (races.length === 0) {
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
        <BrowseHeader
          backLabel={locationFilter !== null ? '‹ Back to my ballot' : '‹ Back'}
          onBack={() => setBrowseTarget(null)}
        />
        <RaceBrowse
          key={`${browseTarget.state}:${browseTarget.geoid ?? 'all'}`}
          races={races}
          counties={counties}
          onSelect={handleSelect}
          initial={browseTarget}
          disabled={starting !== null}
          raceProgress={raceProgress}
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
        {!hideTimeFilter && (
          <div className="mt-2 mb-1">
            <TimeFilterSwitch value={timeFilter} onChange={setTimeFilter} />
          </div>
        )}

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
    // View 3 — no location: the featured default race (CA Governor during lockdown).
    // Fall back to any rankable race so this view is never empty if the default isn't served.
    const featured = races.find((r) => r.raceId === DEFAULT_RACE_ID);
    const defaultRaces = featured
      ? [featured]
      : races.filter((r) => (r.rankableTopicCount ?? r.topicCount) > 0);
    content = (
      <div className="w-full">
        <p className="rr-example-note">Enter your address above to see your own races.</p>
        <div className="race-grid">
          {defaultRaces.map((r, i) => renderCard(r, i))}
        </div>
        <button
          className="ev-button-secondary"
          style={{ marginTop: '1.25rem' }}
          onClick={() => setBrowseTarget({ state: '', geoid: null })}
        >
          Browse all races ›
        </button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {!hideHeader && !browseTarget && (
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
        {!hideFilter && !browseTarget && <AddressFilterInput />}
      </div>

      {startError && (
        <p role="alert" className="max-w-2xl mx-auto text-center mb-2" style={{
          fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-heading)',
        }}>
          We couldn&apos;t open that race. Please try again in a moment.
        </p>
      )}

      {content}
    </div>
  );
};
