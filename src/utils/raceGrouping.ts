import type { RaceSummary } from '../data/api';
import { getStateName } from './stateNames';

export type TimeFilter = 'upcoming' | 'past';

export type SectionKind = 'your' | 'state' | 'other' | 'state-named';

export interface RaceSection {
  kind: SectionKind;
  label: string;
  collapsible: boolean;
  races: RaceSummary[];
}

export interface GroupRacesArgs {
  races: RaceSummary[];
  located: boolean;
  /** Two-letter state code, or null when unknown / not located. */
  userState: string | null;
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
  const { races, located, userState, timeFilter, today } = args;

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
      .map(([label, list]) => ({ kind: 'state-named', label, collapsible: false, races: list }));
    return { sections, noExactMatch: false };
  }

  const your = inBucket.filter((r) => r.isLocal);
  const sameState = inBucket.filter(
    (r) => !r.isLocal && userState != null && r.state === userState,
  );
  const other = inBucket.filter(
    (r) => !r.isLocal && !(userState != null && r.state === userState),
  );

  const sections: RaceSection[] = [];
  if (your.length) {
    sections.push({ kind: 'your', label: 'Your races', collapsible: false, races: your });
  }
  if (sameState.length) {
    const stateName = getStateName(userState) ?? 'your state';
    sections.push({ kind: 'state', label: `More in ${stateName}`, collapsible: false, races: sameState });
  }
  if (other.length) {
    sections.push({ kind: 'other', label: 'Other states', collapsible: true, races: other });
  }

  return { sections, noExactMatch };
}
