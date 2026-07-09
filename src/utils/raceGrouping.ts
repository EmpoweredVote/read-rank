import type { RaceSummary } from '../data/api';
import { getStateName } from './stateNames';

export type TimeFilter = 'upcoming' | 'past';

export type SectionKind = 'your' | 'county' | 'state' | 'state-named';

export interface RaceSection {
  kind: SectionKind;
  label: string;
  races: RaceSummary[];
}

export interface GroupRacesArgs {
  races: RaceSummary[];
  located: boolean;
  /** Two-letter state code, or null when unknown / not located. */
  userState: string | null;
  /** User's home county GEOID (5-digit FIPS), or null. Drives the "In {County}" tier. */
  userCounty?: string | null;
  /** Display name for the county band label. */
  userCountyName?: string | null;
  timeFilter: TimeFilter;
  /** ISO YYYY-MM-DD; injected so grouping is deterministic in tests. */
  today: string;
}

export interface GroupRacesResult {
  sections: RaceSection[];
  /** Located but no race in the full list is an exact-district (isLocal) match.
   *  RaceHub uses this to show the "couldn't pinpoint your districts" note. */
  noExactMatch: boolean;
}

/** Undated races and races dated today or later are "upcoming". */
function isUpcoming(race: RaceSummary, today: string): boolean {
  if (!race.electionDate) return true;
  return race.electionDate >= today;
}

/** Upcoming: soonest first (undated last). Past: most recent first. */
function sortByDate(races: RaceSummary[], timeFilter: TimeFilter): RaceSummary[] {
  return [...races].sort((a, b) => {
    const da = a.electionDate;
    const db = b.electionDate;
    if (timeFilter === 'upcoming') {
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    }
    // past — descending
    return (db ?? '').localeCompare(da ?? '');
  });
}

export function groupRaces(args: GroupRacesArgs): GroupRacesResult {
  const { races, located, userState, userCounty = null, userCountyName = null, timeFilter, today } = args;

  // Evaluated against the FULL race list (not the active time bucket) on purpose:
  // a past local race still means we identified the user's district, so the
  // "couldn't pinpoint your districts" note should stay suppressed when toggling tabs.
  const noExactMatch = located && !races.some((r) => r.isLocal);

  const inBucket = sortByDate(
    races.filter((r) => (timeFilter === 'upcoming' ? isUpcoming(r, today) : !isUpcoming(r, today))),
    timeFilter,
  );

  if (!located) {
    // Group by state name, alphabetical; null/unknown state → "Other".
    const byState = new Map<string, RaceSummary[]>();
    for (const r of inBucket) {
      const label = getStateName(r.state) ?? 'Other';
      const list = byState.get(label) ?? [];
      list.push(r);
      byState.set(label, list);
    }
    const sections: RaceSection[] = [...byState.entries()]
      .sort((a, b) => {
        if (a[0] === 'Other') return 1;
        if (b[0] === 'Other') return -1;
        return a[0].localeCompare(b[0]);
      })
      .map(([label, list]) => ({ kind: 'state-named', label, races: list }));
    return { sections, noExactMatch: false };
  }

  const matchesCounty = (r: RaceSummary) =>
    userCounty != null && (r.countyGeoIds ?? []).includes(userCounty);

  // Empties are hidden from the located tiers — browsing other states/races is now
  // an explicit action (RaceBrowse), not a dump at the bottom of the located ballot.
  const rankable = inBucket.filter((r) => (r.rankableTopicCount ?? r.topicCount) > 0);
  const your = rankable.filter((r) => r.isLocal);
  // isLocal always wins; the county tier only applies to non-local races.
  const inCounty = rankable.filter((r) => !r.isLocal && matchesCounty(r));
  const sameState = rankable.filter(
    (r) => !r.isLocal && !matchesCounty(r) && userState != null && r.state === userState,
  );

  const sections: RaceSection[] = [];
  if (your.length) {
    sections.push({ kind: 'your', label: 'Your races', races: your });
  }
  if (inCounty.length) {
    sections.push({ kind: 'county', label: `In ${userCountyName ?? 'your county'}`, races: inCounty });
  }
  if (sameState.length) {
    const stateName = getStateName(userState) ?? 'your state';
    sections.push({ kind: 'state', label: `More in ${stateName}`, races: sameState });
  }

  return { sections, noExactMatch };
}

const TIER_ORDER: Record<string, number> = { local: 0, state: 1, federal: 2 };

/** Races that genuinely overlap `countyGeoId`, with rankable topics, ordered
 *  local → state → federal (then by soonest election date). Empties are dropped. */
export function racesInCounty(races: RaceSummary[], countyGeoId: string): RaceSummary[] {
  return races
    .filter((r) => (r.rankableTopicCount ?? r.topicCount) > 0)
    .filter((r) => (r.countyGeoIds ?? []).includes(countyGeoId))
    .sort((a, b) => {
      const ta = TIER_ORDER[a.tier ?? 'local'] ?? 0;
      const tb = TIER_ORDER[b.tier ?? 'local'] ?? 0;
      if (ta !== tb) return ta - tb;
      return (a.electionDate ?? '').localeCompare(b.electionDate ?? '');
    });
}

export interface StateEntry { state: string; name: string; count: number; }
export interface CountyEntry { geoid: string; name: string; count: number; }

/** States that have at least one rankable race, alphabetical by name, with race counts. */
export function statesWithCounts(races: RaceSummary[]): StateEntry[] {
  const counts = new Map<string, number>();
  for (const r of races) {
    if ((r.rankableTopicCount ?? r.topicCount) <= 0 || !r.state) continue;
    counts.set(r.state, (counts.get(r.state) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([state, count]) => ({ state, name: getStateName(state) ?? state, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Counties in `stateCode` that contain a rankable race, labelled via `counties`,
 *  sorted by name. A race counts toward every county it overlaps. */
export function countiesForState(
  races: RaceSummary[], counties: Record<string, string>, stateCode: string,
): CountyEntry[] {
  const counts = new Map<string, number>();
  for (const r of races) {
    if (r.state !== stateCode || (r.rankableTopicCount ?? r.topicCount) <= 0) continue;
    for (const geoid of r.countyGeoIds ?? []) {
      counts.set(geoid, (counts.get(geoid) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([geoid, count]) => ({ geoid, name: counties[geoid] ?? geoid, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
