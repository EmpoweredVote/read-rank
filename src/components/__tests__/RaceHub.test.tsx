import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaceHub } from '../RaceHub';
import { useReadRankStore } from '../../store/useReadRankStore';
import type { RaceSummary, CountyIndex } from '../../data/api';

// The temporary content lockdown (src/config/liveContent.ts) filters races/topics
// inside fetchRaces/fetchRaceQuotes. RaceHub's job is routing/rendering, not the
// lockdown — the allowlist is exercised directly in data/api's contentLockdown test.
// Neutralize it here so these tests use their own fixtures, but keep a known
// DEFAULT_RACE_ID to assert the no-location default-race behavior.
vi.mock('../../config/liveContent', () => ({
  DEFAULT_RACE_ID: 'ca-governor',
  ALLOWED_RACE_IDS: null,
  ALLOWED_TOPIC_KEYS: null,
  isRaceAllowed: () => true,
  isTopicAllowed: () => true,
}));

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Minimal RaceSummary — only the fields the hub/grouping read. */
function race(p: Partial<RaceSummary> & { raceId: string }): RaceSummary {
  return {
    office: 'Office', electionName: 'E', electionDate: null, seat: null, state: 'CA',
    jurisdictionLevel: null, candidateCount: 3, topicCount: 5, quoteCount: 10,
    rankableTopicCount: 5, isLocal: false, tier: 'local', scope: 'citywide',
    boundaryRef: null, frameRef: null, countyGeoIds: ['06037'], ...p,
  } as RaceSummary;
}

/** Stub fetchRaces' underlying fetch so the hub gets a controlled race list. */
function stubRacesFetch(races: RaceSummary[], counties: CountyIndex) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ races, counties }),
  }));
}

describe('RaceHub arena cards', () => {
  it('shows the wordmark with its Inform underline', async () => {
    render(<RaceHub />);
    const wordmark = await screen.findByText(/read & rank/i, undefined, { timeout: 3000 });
    expect(wordmark.closest('h1')?.querySelector('.wordmark-underline')).not.toBeNull();
  });

  it('renders the race as a RaceCard with tier, geography and metadata', async () => {
    // The default (no-location) view is the LA example ballot, which the Indiana demo
    // race isn't part of. Seed an Indiana location so the located ballot (with its time
    // tabs) surfaces the mock race.
    useReadRankStore.getState().setLocationFilter({
      address: 'Indianapolis, IN', politicianIds: [], state: 'IN', county: null, countyName: null,
      jurisdiction: null,
    });
    render(<RaceHub />);
    // jsdom fetch fails -> mock fallback supplies the Indiana demo race (2024-11-05 = past).
    // Switch to the Past tab first so the card is visible.
    const pastBtn = await screen.findByRole('button', { name: /^past$/i });
    await userEvent.click(pastBtn);
    const card = await screen.findByRole('button', { name: /open governor race/i });
    expect(card).toHaveTextContent('Governor');
    expect(card).toHaveTextContent('Indiana');
    expect(card).toHaveTextContent('Nov 5, 2024');
    expect(screen.getByText('Candidates').parentElement).toHaveTextContent('4');
    expect(screen.getByText('Topics').parentElement).toHaveTextContent('3');
    expect(screen.queryByText(/ranked choice/i)).not.toBeInTheDocument();
  });
});

describe('RaceHub browse wiring', () => {
  it('renders only the featured default race (CA Governor) when no location is set', async () => {
    // No locationFilter -> the default view shows only the DEFAULT_RACE_ID race,
    // not other races that happen to be served.
    stubRacesFetch(
      [
        race({ raceId: 'ca-governor', office: 'Governor', scope: 'statewide', tier: 'state', countyGeoIds: [] }),
        race({ raceId: 'la-mayor', office: 'Mayor', countyGeoIds: ['06037'] }),
      ],
      { '06037': 'Los Angeles County' },
    );
    render(<RaceHub />);
    expect(await screen.findByText(/enter your address above/i, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /open governor race/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open mayor race/i })).not.toBeInTheDocument();
  });

  it('passes the resolved jurisdiction geoids to the races fetch', async () => {
    stubRacesFetch(
      [race({ raceId: 'in-9', office: 'US Representative', state: 'IN', countyGeoIds: ['18105'], isLocal: true })],
      { '18105': 'Monroe County' },
    );
    useReadRankStore.getState().setLocationFilter({
      address: 'Bloomington, IN', politicianIds: [], state: 'IN', county: '18105', countyName: 'Monroe County',
      jurisdiction: { congressional: '1809', state_senate: null, state_house: null, county: '18105', school_district: null },
    });
    render(<RaceHub />);
    await screen.findByRole('button', { name: /open us representative race/i }, { timeout: 3000 });
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0]));
    const racesUrl = calls.find((u) => u.includes('/readrank/races'));
    expect(racesUrl).toContain('cd=1809');
    expect(racesUrl).toContain('county=18105');
    expect(racesUrl).not.toContain('sldu=');
  });

  it('renders the browse UI when browseTarget is set in the store', async () => {
    stubRacesFetch(
      [race({ raceId: 'la-mayor', office: 'Mayor', countyGeoIds: ['06037'] })],
      { '06037': 'Los Angeles County' },
    );
    useReadRankStore.getState().setBrowseTarget({ state: 'CA', geoid: null });
    render(<RaceHub />);
    // Browse view: "Back to my ballot" affordance + the search-first browse (search box + cards).
    expect(await screen.findByRole('button', { name: /back to my ballot/i }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByLabelText('Search races')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open mayor race/i })).toBeInTheDocument();
  });

  it('clicking "Browse all races" on the LA example ballot sets the store browseTarget', async () => {
    stubRacesFetch(
      [race({ raceId: 'la-mayor', office: 'Mayor', countyGeoIds: ['06037'] })],
      { '06037': 'Los Angeles County' },
    );
    render(<RaceHub />);
    const browseBtn = await screen.findByRole('button', { name: /browse all races/i }, { timeout: 3000 });
    expect(useReadRankStore.getState().browseTarget).toBeNull();
    await userEvent.click(browseBtn);
    expect(useReadRankStore.getState().browseTarget).toEqual({ state: '', geoid: null });
  });
});
