import { describe, it, expect } from 'vitest';
import { groupRaces, racesInCounty, statesWithCounts, countiesForState } from '../raceGrouping';
import type { RaceSummary } from '../../data/api';

const TODAY = '2026-06-19';

// Minimal RaceSummary factory — only the fields groupRaces reads.
function race(partial: Partial<RaceSummary> & { raceId: string }): RaceSummary {
  return {
    office: 'Office',
    electionName: 'Election',
    electionDate: null,
    state: null,
    jurisdictionLevel: null,
    candidateCount: 2,
    topicCount: 1,
    isLocal: false,
    tier: 'federal',
    scope: 'district',
    countyGeoIds: [],
    rankableTopicCount: 1,
    ...partial,
  } as RaceSummary;
}

const utExact = race({ raceId: 'ut-exact', state: 'UT', isLocal: true, electionDate: '2026-06-23' });
const utState = race({ raceId: 'ut-state', state: 'UT', isLocal: false, electionDate: '2026-06-23' });
const caOther = race({ raceId: 'ca-other', state: 'CA', isLocal: false, electionDate: '2026-06-23' });
const inPast = race({ raceId: 'in-past', state: 'IN', isLocal: false, electionDate: '2026-05-05' });

describe('groupRaces — located, upcoming', () => {
  const result = groupRaces({
    races: [utExact, utState, caOther, inPast],
    located: true, userState: 'UT', timeFilter: 'upcoming', today: TODAY,
  });

  it('orders bands: your, state, other', () => {
    expect(result.sections.map((s) => s.kind)).toEqual(['your', 'state', 'other']);
  });

  it('labels the state band with the full state name', () => {
    expect(result.sections.find((s) => s.kind === 'state')?.label).toBe('More in Utah');
  });

  it('marks only "other" collapsible', () => {
    expect(result.sections.find((s) => s.kind === 'other')?.collapsible).toBe(true);
    expect(result.sections.find((s) => s.kind === 'your')?.collapsible).toBe(false);
  });

  it('excludes the all-past Indiana race from upcoming', () => {
    const ids = result.sections.flatMap((s) => s.races.map((r) => r.raceId));
    expect(ids).not.toContain('in-past');
  });

  it('reports an exact match exists', () => {
    expect(result.noExactMatch).toBe(false);
  });
});

describe('groupRaces — located, no exact match (the Orem case)', () => {
  const result = groupRaces({
    races: [utState, caOther], // no isLocal anywhere
    located: true, userState: 'UT', timeFilter: 'upcoming', today: TODAY,
  });

  it('omits the "your" band', () => {
    expect(result.sections.some((s) => s.kind === 'your')).toBe(false);
  });

  it('still surfaces same-state races under the state band', () => {
    expect(result.sections.find((s) => s.kind === 'state')?.races.map((r) => r.raceId)).toEqual(['ut-state']);
  });

  it('flags noExactMatch', () => {
    expect(result.noExactMatch).toBe(true);
  });
});

describe('groupRaces — past filter', () => {
  it('shows only past races, most-recent-first', () => {
    const older = race({ raceId: 'older', state: 'IN', electionDate: '2026-03-01' });
    const result = groupRaces({
      races: [utExact, inPast, older],
      located: true, userState: 'UT', timeFilter: 'past', today: TODAY,
    });
    const ids = result.sections.flatMap((s) => s.races.map((r) => r.raceId));
    expect(ids).toEqual(['in-past', 'older']); // 05-05 before 03-01
  });
});

describe('groupRaces — not located', () => {
  const result = groupRaces({
    races: [utExact, utState, caOther],
    located: false, userState: null, timeFilter: 'upcoming', today: TODAY,
  });

  it('uses state-named sections, no relevance bands', () => {
    expect(result.sections.every((s) => s.kind === 'state-named')).toBe(true);
    expect(result.sections.map((s) => s.label)).toEqual(['California', 'Utah']); // alphabetical
  });

  it('never flags noExactMatch when not located', () => {
    expect(result.noExactMatch).toBe(false);
  });
});

describe('groupRaces — undated and today are upcoming', () => {
  it('treats null and today-dated races as upcoming', () => {
    const undated = race({ raceId: 'undated', state: 'UT', electionDate: null });
    const todayRace = race({ raceId: 'today', state: 'UT', electionDate: TODAY });
    const result = groupRaces({
      races: [undated, todayRace],
      located: false, userState: null, timeFilter: 'upcoming', today: TODAY,
    });
    const ids = result.sections.flatMap((s) => s.races.map((r) => r.raceId));
    expect(ids).toContain('undated');
    expect(ids).toContain('today');
  });
});

describe('groupRaces — located but unparseable state (userState null)', () => {
  it('puts all non-local races under "other"', () => {
    const a = race({ raceId: 'a', state: 'UT', isLocal: false, electionDate: '2026-06-23' });
    const b = race({ raceId: 'b', state: 'CA', isLocal: false, electionDate: '2026-06-23' });
    const result = groupRaces({
      races: [a, b],
      located: true, userState: null, timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.map((s) => s.kind)).toEqual(['other']);
    expect(result.sections[0].races.map((r) => r.raceId)).toEqual(['a', 'b']);
  });
});

describe('groupRaces — not located, null-state races', () => {
  it('sorts the "Other" bucket after all named states', () => {
    const oh = race({ raceId: 'oh', state: 'OH', electionDate: '2026-06-23' });
    const noState = race({ raceId: 'no-state', state: null, electionDate: '2026-06-23' });
    const ut = race({ raceId: 'ut', state: 'UT', electionDate: '2026-06-23' });
    const result = groupRaces({
      races: [noState, ut, oh],
      located: false, userState: null, timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.map((s) => s.label)).toEqual(['Ohio', 'Utah', 'Other']);
  });
});

describe('groupRaces — county tier', () => {
  const slcExact = race({ raceId: 'slc-exact', state: 'UT', isLocal: true, countyGeoIds: ['49035'], electionDate: '2026-06-23' });
  const slcCounty = race({ raceId: 'slc-county', state: 'UT', isLocal: false, countyGeoIds: ['49035'], electionDate: '2026-06-23' });
  const utElsewhere = race({ raceId: 'ut-elsewhere', state: 'UT', isLocal: false, countyGeoIds: ['49049'], electionDate: '2026-06-23' });
  const multiCounty = race({ raceId: 'multi', state: 'UT', isLocal: false, countyGeoIds: ['49035', '49045'], electionDate: '2026-06-23' });

  it('orders bands: your, county, state, other', () => {
    const result = groupRaces({
      races: [slcExact, slcCounty, utElsewhere, caOther],
      located: true, userState: 'UT', userCounty: '49035', userCountyName: 'Salt Lake County',
      timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.map((s) => s.kind)).toEqual(['your', 'county', 'state', 'other']);
  });

  it('labels the county band with the user county name', () => {
    const result = groupRaces({
      races: [slcCounty], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.find((s) => s.kind === 'county')?.label).toBe('In Salt Lake County');
  });

  it('routes a same-county non-local race to county, not state', () => {
    const result = groupRaces({
      races: [slcCounty, utElsewhere], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['slc-county']);
    expect(result.sections.find((s) => s.kind === 'state')?.races.map((r) => r.raceId)).toEqual(['ut-elsewhere']);
  });

  it('puts a multi-county race in the county tier for a voter in any member county', () => {
    const inA = groupRaces({
      races: [multiCounty], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    const inB = groupRaces({
      races: [multiCounty], located: true, userState: 'UT',
      userCounty: '49045', userCountyName: 'Tooele County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(inA.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['multi']);
    expect(inB.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['multi']);
  });

  it('omits the county band when the user has no county', () => {
    const result = groupRaces({
      races: [slcCounty], located: true, userState: 'UT',
      userCounty: null, userCountyName: null, timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.some((s) => s.kind === 'county')).toBe(false);
    expect(result.sections.find((s) => s.kind === 'state')?.races.map((r) => r.raceId)).toEqual(['slc-county']);
  });

  it('never county-tiers a race with no countyGeoIds', () => {
    const noCounty = race({ raceId: 'nocounty', state: 'UT', isLocal: false, electionDate: '2026-06-23' });
    const result = groupRaces({
      races: [noCounty], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.some((s) => s.kind === 'county')).toBe(false);
  });

  it('honors the county tier under the Past filter', () => {
    const pastCounty = race({ raceId: 'past-county', state: 'UT', isLocal: false, countyGeoIds: ['49035'], electionDate: '2026-05-05' });
    const result = groupRaces({
      races: [pastCounty], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'past', today: TODAY,
    });
    expect(result.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['past-county']);
  });

  it('reports noExactMatch true when only county races exist (no isLocal)', () => {
    const result = groupRaces({
      races: [slcCounty], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.noExactMatch).toBe(true);
    expect(result.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['slc-county']);
  });

  it('county-tiers a race even when userState is null', () => {
    const result = groupRaces({
      races: [slcCounty], located: true, userState: null,
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['slc-county']);
  });
});

const laMayor = race({ raceId: 'la-mayor', state: 'CA', tier: 'local', scope: 'citywide', countyGeoIds: ['06037'], rankableTopicCount: 5 });
const caGov = race({ raceId: 'ca-gov', state: 'CA', tier: 'state', scope: 'statewide', countyGeoIds: ['06037', '06059'], rankableTopicCount: 4 });
const caCd = race({ raceId: 'ca-cd', state: 'CA', tier: 'federal', scope: 'district', countyGeoIds: ['06037'], rankableTopicCount: 3 });
const caEmpty = race({ raceId: 'ca-empty', state: 'CA', tier: 'federal', scope: 'district', countyGeoIds: ['06037'], rankableTopicCount: 0 });
const otherCounty = race({ raceId: 'oc', state: 'CA', tier: 'federal', scope: 'district', countyGeoIds: ['06059'], rankableTopicCount: 2 });

describe('racesInCounty', () => {
  const list = [caCd, caGov, laMayor, caEmpty, otherCounty];
  it('includes only races overlapping the county, hides empties', () => {
    const ids = racesInCounty(list, '06037').map((r) => r.raceId);
    expect(ids).not.toContain('ca-empty');
    expect(ids).not.toContain('oc');
    expect(ids).toEqual(expect.arrayContaining(['la-mayor', 'ca-gov', 'ca-cd']));
  });
  it('orders local → state → federal', () => {
    expect(racesInCounty(list, '06037').map((r) => r.tier)).toEqual(['local', 'state', 'federal']);
  });
});

describe('statesWithCounts', () => {
  it('lists states (with a non-empty race) alphabetically with counts', () => {
    const ut = race({ raceId: 'ut', state: 'UT', rankableTopicCount: 2 });
    const caEmptyOnly = race({ raceId: 'ce', state: 'NV', rankableTopicCount: 0 });
    const out = statesWithCounts([caGov, caCd, ut, caEmptyOnly]);
    expect(out).toEqual([
      { state: 'CA', name: 'California', count: 2 },
      { state: 'UT', name: 'Utah', count: 1 },
    ]);
  });
});

describe('countiesForState', () => {
  it('lists counties in the state that have a non-empty race, labelled and sorted', () => {
    const counties = { '06037': 'Los Angeles County', '06059': 'Orange County' };
    const out = countiesForState([caGov, caCd, otherCounty], counties, 'CA');
    expect(out).toEqual([
      { geoid: '06037', name: 'Los Angeles County', count: 3 },
      { geoid: '06059', name: 'Orange County', count: 2 },
    ]);
  });
});
