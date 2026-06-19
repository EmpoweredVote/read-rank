import { describe, it, expect } from 'vitest';
import { groupRaces } from '../raceGrouping';
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
