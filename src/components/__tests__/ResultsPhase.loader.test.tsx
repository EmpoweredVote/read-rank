import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

let resolveReveal: (v: unknown) => void = () => {};
let rejectReveal: (e: unknown) => void = () => {};
vi.mock('../../data/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../data/api')>();
  return {
    ...mod,
    fetchRaceReveal: vi.fn(() => new Promise((res, rej) => { resolveReveal = res; rejectReveal = rej; })),
  };
});
import { ResultsPhase } from '../ResultsPhase';

const payload: RacePayload = {
  raceId: 'race-loader', positionName: 'Governor',
  topics: [{ topicKey: 'k', title: 'Housing', question: 'Q', quotes: [
    { id: 'q1', text: 'one', candidateToken: 'tA', topicKey: 'k' },
    { id: 'q2', text: 'two', candidateToken: 'tB', topicKey: 'k' },
  ] }],
};
const reveal = {
  raceId: 'race-loader', positionName: 'Governor',
  ballot: [{
    rank: 1, candidateId: 'c1', name: 'Ana Rivera', office: 'Gov', title: 'Candidate', chamber: '', district: '',
    photo: '', essentialsUrl: '',
    evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
    perTopic: [{ topicKey: 'k', title: 'Housing', userTopWinner: true, quotes: [{ quoteId: 'q1', text: 'one', supported: true, rank: 1 }] }],
  }],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
  useReadRankStore.getState().agree(payload.topics[0].quotes[0]);
  useReadRankStore.getState().disagree(payload.topics[0].quotes[1]);
  useReadRankStore.getState().revealBallot();
});

describe('ResultsPhase loader', () => {
  it('matching while pending, revealing for 400 ms after success, then the ballot', async () => {
    vi.useFakeTimers();
    try {
      render(<ResultsPhase />);
      expect(screen.getByText('Matching your rankings to candidates…')).toBeInTheDocument();
      await act(async () => { resolveReveal(reveal); });
      expect(screen.getByText('Revealing names…')).toBeInTheDocument();
      expect(screen.queryByText(/Now see/i)).not.toBeInTheDocument();
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(screen.getByText(/Now see/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('goes straight to the error state on failure (no revealing step)', async () => {
    render(<ResultsPhase />);
    await act(async () => { rejectReveal(new Error('down')); });
    expect(screen.queryByText('Revealing names…')).not.toBeInTheDocument();
    expect(screen.getByText(/We couldn.t build your ballot/i)).toBeInTheDocument();
  });
});
