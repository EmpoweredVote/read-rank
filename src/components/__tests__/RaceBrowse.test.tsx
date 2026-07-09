import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RaceBrowse } from '../RaceBrowse';
import type { RaceSummary } from '../../data/api';

function race(p: Partial<RaceSummary> & { raceId: string }): RaceSummary {
  return {
    office: 'US Representative', electionName: 'E', electionDate: null, seat: null,
    state: 'CA', jurisdictionLevel: null, candidateCount: 2, topicCount: 3, quoteCount: 6,
    rankableTopicCount: 3, isLocal: false, tier: 'federal', scope: 'district',
    boundaryRef: null, frameRef: null, countyGeoIds: ['06037'], ...p,
  } as RaceSummary;
}

const races = [
  race({ raceId: 'ca-cd', seat: 'District 30', countyGeoIds: ['06037'] }),
  race({ raceId: 'ut-cd', state: 'UT', seat: 'District 1', countyGeoIds: ['49035'] }),
];
const counties = { '06037': 'Los Angeles County', '49035': 'Salt Lake County' };

describe('RaceBrowse', () => {
  it('drills state → county → races and only renders the active level', () => {
    render(<RaceBrowse races={races} counties={counties} onSelect={vi.fn()} initial={null} />);
    // Level: states
    expect(screen.getByText('California')).toBeInTheDocument();
    expect(screen.queryByText('Los Angeles County')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('California'));
    // Level: counties
    expect(screen.getByText('Los Angeles County')).toBeInTheDocument();
    expect(screen.queryByText(/District 30/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Los Angeles County'));
    // Level: races
    expect(screen.getByText(/District 30/)).toBeInTheDocument();
  });

  it('starts at a county when given an initial geoid', () => {
    render(<RaceBrowse races={races} counties={counties} onSelect={vi.fn()} initial={{ state: 'CA', geoid: '06037' }} />);
    expect(screen.getByText(/District 30/)).toBeInTheDocument();
  });
});
