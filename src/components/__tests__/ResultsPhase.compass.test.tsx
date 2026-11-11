import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MyCompassState } from '../../hooks/useMyCompass';

let compassState: MyCompassState = { status: 'uncalibrated' };
vi.mock('../../hooks/useMyCompass', () => ({ useMyCompass: () => compassState }));
vi.mock('../YourCompassCard', () => ({
  YourCompassCard: ({ candidates }: { candidates: { name: string }[] }) => (
    <section><h3>Your compass</h3><p>compare: {candidates.map((c) => c.name).join(', ')}</p></section>
  ),
}));

import { ResultsPhase } from '../ResultsPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

// Mock race (offline reveal) — see ResultsPhase.test.tsx.
const payload: RacePayload = {
  raceId: 'mock-in-gov-2024',
  positionName: 'Governor',
  topics: [{
    topicKey: 'cannabis-legalization', title: 'Cannabis Legalization', question: 'Should Indiana legalize marijuana?',
    quotes: [{ id: 'q-103', text: 'Marijuana use is cascading across the country and the state needs to address it seriously.', candidateToken: 'tok-9d4b', topicKey: 'cannabis-legalization' }],
  }],
};

function start() {
  window.localStorage?.clear();
  const s = useReadRankStore.getState();
  s.reset();
  s.selectRace(payload);
  s.agree(payload.topics[0].quotes[0]);
  s.revealBallot();
  render(<ResultsPhase />);
}

describe('ResultsPhase compass card', () => {
  beforeEach(() => { compassState = { status: 'uncalibrated' }; });

  it('invites an uncalibrated user to calibrate', async () => {
    start();
    expect(await screen.findByRole('link', { name: /calibrate your compass/i }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your compass' })).toBeNull();
  });

  it('shows "Your compass" instead, compared against the revealed candidates, once calibrated', async () => {
    compassState = { status: 'calibrated', spokes: [], topics: [] };
    start();
    expect(await screen.findByRole('heading', { name: 'Your compass' }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/compare: mike braun/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /calibrate your compass/i })).toBeNull();
  });

  it('says it could not load the compass rather than inviting a calibrated user to calibrate', async () => {
    compassState = { status: 'error' };
    start();
    expect(await screen.findByText(/couldn.t load your compass/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /calibrate your compass/i })).toBeNull();
  });
});
