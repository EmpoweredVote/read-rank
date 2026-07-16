import React, { useDeferredValue, useMemo, useState } from 'react';
import type { RaceSummary, CountyIndex } from '../data/api';
import { RaceCard } from './RaceCard';
import { deriveTierScope } from '../utils/raceTier';
import { estimateMinutes } from '../utils/estimateMinutes';
import { getStateName } from '../utils/stateNames';
import type { RaceProgress } from '../store/useReadRankStore';
import { raceCardProgress } from '../utils/raceProgressState';

export interface BrowseTarget { state: string; geoid: string; }

interface RaceBrowseProps {
  races: RaceSummary[];
  counties: CountyIndex;
  onSelect: (race: RaceSummary) => void;
  /** Preset the state filter (from a place-name smart search or the located ballot). */
  initial: BrowseTarget | { state: string; geoid: null } | null;
  disabled?: boolean;
  /** Per-race progress for the status badge (parity with the hub cards). */
  raceProgress?: Record<string, RaceProgress>;
}

// ── Categorisation (tier sections, matching essentials' tier grouping) ───────
type Category = 'Statewide' | 'U.S. House' | 'State Legislature' | 'Local';
const CATEGORY_ORDER: Category[] = ['Statewide', 'U.S. House', 'State Legislature', 'Local'];

function categoryOf(r: RaceSummary): Category {
  const { tier, scope } = deriveTierScope(r);
  const office = r.office.toLowerCase();
  if (scope === 'statewide') return 'Statewide';
  if (tier === 'federal' || /u\.?s\.?\s*(house|rep|congress)/.test(office)) return 'U.S. House';
  if (tier === 'state' || /state (rep|sen|assembly|house|senate)|assembly/.test(office)) return 'State Legislature';
  return 'Local';
}

// Search synonyms so "house" finds U.S./State Representatives, "senate" finds Senators, etc.
function synonymsFor(cat: Category): string {
  switch (cat) {
    case 'U.S. House': return 'house representative congress congressional';
    case 'State Legislature': return 'legislature assembly house senate representative senator';
    default: return '';
  }
}

// ── Office-type filter (pills, like FilterBar's Type dropdown) ────────────────
const OFFICE_FILTERS: { key: string; label: string; match: (r: RaceSummary, c: Category) => boolean }[] = [
  { key: 'gov', label: 'Governor', match: (r) => /governor/i.test(r.office) },
  { key: 'ussen', label: 'U.S. Senate', match: (r) => /u\.?s\.?\s*sen/i.test(r.office) },
  { key: 'ushouse', label: 'U.S. House', match: (_r, c) => c === 'U.S. House' },
  { key: 'stateleg', label: 'State Legislature', match: (_r, c) => c === 'State Legislature' },
  { key: 'local', label: 'Local', match: (_r, c) => c === 'Local' },
];

function haystack(r: RaceSummary, counties: CountyIndex, cat: Category): string {
  return [
    r.office, r.seat, r.state, getStateName(r.state), r.electionName, synonymsFor(cat),
    ...(r.countyGeoIds ?? []).map((g) => counties[g]),
  ].filter(Boolean).join(' ').toLowerCase();
}

function matchesQuery(hay: string, q: string): boolean {
  if (!q.trim()) return true;
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

export const RaceBrowse: React.FC<RaceBrowseProps> = ({ races, counties, onSelect, initial, disabled, raceProgress }) => {
  const [query, setQuery] = useState('');
  const [office, setOffice] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>(initial?.state ?? '');
  const deferredQuery = useDeferredValue(query);

  // Precompute each race's category + search haystack once. Drop races with no
  // rankable topics — you can't actually rank them, so they shouldn't surface here
  // (matches the located ballot and the old county browse).
  const indexed = useMemo(
    () => races
      .filter((r) => (r.rankableTopicCount ?? r.topicCount) > 0)
      .map((r) => { const cat = categoryOf(r); return { r, cat, hay: haystack(r, counties, cat) }; }),
    [races, counties],
  );

  const stateOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const { r } of indexed) if (r.state) seen.set(r.state, getStateName(r.state) ?? r.state);
    return [...seen.entries()].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [indexed]);

  const sections = useMemo(() => {
    const of = OFFICE_FILTERS.find((o) => o.key === office);
    const filtered = indexed.filter(({ r, cat, hay }) =>
      matchesQuery(hay, deferredQuery)
      && (!of || of.match(r, cat))
      && (!stateFilter || r.state === stateFilter),
    );
    return CATEGORY_ORDER
      .map((cat) => ({ cat, races: filtered.filter((x) => x.cat === cat).map((x) => x.r) }))
      .filter((s) => s.races.length);
  }, [indexed, deferredQuery, office, stateFilter]);

  const total = sections.reduce((n, s) => n + s.races.length, 0);

  const pill = (active: boolean) => `rr-browse-pill${active ? ' is-active' : ''}`;

  return (
    <div className="rr-browse">
      <div className="rr-browse-search">
        <svg className="rr-browse-search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          className="rr-browse-search__input"
          type="search"
          placeholder="Search races — office, state, or place…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search races"
        />
      </div>

      <div className="rr-browse-filters" role="group" aria-label="Filter races">
        <button className={pill(!office)} onClick={() => setOffice(null)} aria-pressed={!office}>All offices</button>
        {OFFICE_FILTERS.map((o) => (
          <button key={o.key} className={pill(office === o.key)} aria-pressed={office === o.key}
            onClick={() => setOffice(office === o.key ? null : o.key)}>{o.label}</button>
        ))}
        <select className="rr-browse-select" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} aria-label="Filter by state">
          <option value="">All states</option>
          {stateOptions.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </div>

      <p className="rr-browse-count">{total} race{total !== 1 ? 's' : ''}</p>

      {sections.map((section) => (
        <section key={section.cat} className="rr-browse-section">
          <div className={`rr-browse-banner rr-browse-banner--${section.cat.replace(/[^a-z]/gi, '').toLowerCase()}`}>
            {section.cat}<span className="rr-browse-banner__count">· {section.races.length}</span>
          </div>
          <div className="race-grid">
            {section.races.map((r, i) => {
              const { tier, scope } = deriveTierScope(r);
              const { progress, label } = raceCardProgress(raceProgress?.[r.raceId], r.rankableTopicCount ?? r.topicCount);
              return (
                <RaceCard
                  key={r.raceId}
                  office={r.office} tier={tier} scope={scope} state={r.state} seat={r.seat ?? null}
                  electionDate={r.electionDate} boundaryRef={r.boundaryRef ?? null} frameRef={r.frameRef ?? null}
                  candidateCount={r.candidateCount} topicCount={r.rankableTopicCount ?? r.topicCount}
                  estMinutes={estimateMinutes({ quoteCount: r.quoteCount, candidateCount: r.candidateCount, topicCount: r.topicCount })}
                  progress={progress} progressLabel={label}
                  disabled={disabled} onSelect={() => onSelect(r)} enterIndex={i}
                />
              );
            })}
          </div>
        </section>
      ))}

      {total === 0 && (
        <p className="rr-browse-empty">
          No races match{deferredQuery.trim() ? ` “${deferredQuery}”` : ''}. Try a broader search or clear the filters.
        </p>
      )}
    </div>
  );
};
