import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RaceBrowse } from '../RaceBrowse';
import type { RaceSummary } from '../../data/api';

function race(p: Partial<RaceSummary> & { raceId: string }): RaceSummary {
  return {
    office: 'US Representative', electionName: 'E', electionDate: null, seat: null,
    state: 'CA', jurisdictionLevel: null, candidateCount: 2, topicCount: 3, quoteCount: 6,
    rankableTopicCount: 3, isLocal: false, tier: 'federal', scope: 'district',
    boundaryRef: null, frameRef: null, countyGeoIds: [], ...p,
  } as RaceSummary;
}

const races = [
  race({ raceId: 'ca-gov', office: 'Governor', state: 'CA', tier: 'state', scope: 'statewide' }),
  race({ raceId: 'ca-cd', office: 'U.S. Representative', state: 'CA', tier: 'federal', scope: 'district', seat: 'District 30' }),
  race({ raceId: 'ut-sen', office: 'State Senator', state: 'UT', tier: 'state', scope: 'district', seat: 'District 1' }),
  race({ raceId: 'la-mayor', office: 'Los Angeles Mayor', state: 'CA', tier: 'local', scope: 'citywide' }),
];

const setup = (initial: Parameters<typeof RaceBrowse>[0]['initial'] = null) =>
  render(<RaceBrowse races={races} counties={{}} onSelect={vi.fn()} initial={initial} />);

describe('RaceBrowse — search-first', () => {
  it('groups races into tier sections with a total count', () => {
    const { container } = setup();
    expect(screen.getByText('4 races')).toBeInTheDocument();
    const banners = [...container.querySelectorAll('.rr-browse-banner')].map((b) => b.textContent ?? '');
    expect(banners.some((t) => /Statewide/.test(t))).toBe(true);
    expect(banners.some((t) => /U\.S\. House/.test(t))).toBe(true);
    expect(banners.some((t) => /State Legislature/.test(t))).toBe(true);
    expect(banners.some((t) => /Local/.test(t))).toBe(true);
    expect(screen.getByRole('button', { name: /open governor race/i })).toBeInTheDocument();
  });

  it('live-filters by the search box', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Search races'), { target: { value: 'governor' } });
    expect(await screen.findByRole('button', { name: /open governor race/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open state senator race/i })).not.toBeInTheDocument();
  });

  it('search synonyms: "house" matches U.S. Representative', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Search races'), { target: { value: 'house' } });
    expect(await screen.findByRole('button', { name: /open u\.s\. representative race/i })).toBeInTheDocument();
  });

  it('filters by an office-type pill', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Governor' }));
    expect(await screen.findByRole('button', { name: /open governor race/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open state senator race/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open u\.s\. representative race/i })).not.toBeInTheDocument();
  });

  it('presets the state filter from `initial`', () => {
    setup({ state: 'UT', geoid: null });
    expect(screen.getByRole('button', { name: /open state senator race/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open governor race/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Search races'), { target: { value: 'zzz-nothing' } });
    expect(await screen.findByText(/no races match/i)).toBeInTheDocument();
  });
});
