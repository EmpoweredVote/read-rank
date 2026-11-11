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

// Two candidates on one card, both judged: the race is complete (1 of 1 scorable).
const completePayload: RacePayload = {
  ...payload,
  topics: [{
    ...payload.topics[0],
    quotes: [
      payload.topics[0].quotes[0],
      { id: 'q-101', text: 'We can make cannabis legal.', candidateToken: 'tok-a3f8', topicKey: 'cannabis-legalization' },
    ],
  }],
};

function start(race: RacePayload = payload) {
  window.localStorage?.clear();
  const s = useReadRankStore.getState();
  s.reset();
  s.selectRace(race);
  s.confirmIssueSelection();
  s.agree(race.topics[0].quotes[0]);
  if (race.topics[0].quotes[1]) s.disagree(race.topics[0].quotes[1]);
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

  it('shows "Your compass" instead, compared against the revealed candidates, once calibrated and the race is complete', async () => {
    compassState = { status: 'calibrated', spokes: [], topics: [] };
    start(completePayload);
    expect(await screen.findByText(/compare: mike braun/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/rank every topic/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /calibrate your compass/i })).toBeNull();
  });

  it('holds back the candidate comparison until every card is ranked (blindness)', async () => {
    // Candidates' Compass stances are coupled to their quotes: naming them before an
    // unranked card's reveal would let the user match its blind quotes to a name.
    compassState = { status: 'calibrated', spokes: [], topics: [] };
    start();
    expect(await screen.findByText(/rank every topic in this race/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/compare:/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /calibrate your compass/i })).toBeNull();
  });

  it('says it could not load the compass rather than inviting a calibrated user to calibrate', async () => {
    compassState = { status: 'error' };
    start();
    expect(await screen.findByText(/couldn.t load your compass/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /calibrate your compass/i })).toBeNull();
  });
});
