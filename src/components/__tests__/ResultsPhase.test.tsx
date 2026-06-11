import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BallotCard, ResultsPhase } from '../ResultsPhase';
import type { BallotEntry } from '../../data/api';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const entry: BallotEntry = {
  rank: 1,
  candidateId: 'jane-doe',
  name: 'Jane Doe',
  office: 'Candidate for Governor',
  photo: '',
  essentialsUrl: 'https://essentials.empowered.vote/politician/jane-doe',
  evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
  perTopic: [
    {
      topicKey: 'housing',
      title: 'Housing',
      userTopWinner: true,
      quotes: [
        {
          quoteId: 'q1',
          text: 'A housing quote.',
          supported: true,
          rank: 1,
          sourceName: 'KQED Forum',
          sourceUrl: 'https://example.com/kqed',
        },
      ],
    },
  ],
};

describe('BallotCard source attribution', () => {
  it('shows a verify link for each quote in the expanded breakdown', async () => {
    render(<BallotCard entry={entry} index={0} verdictMap={{}} prefersReducedMotion={true} quoteRankMap={new Map()} />);
    await userEvent.click(screen.getByRole('button', { name: /see what they said/i }));
    const link = screen.getByRole('link', { name: /verify source: KQED Forum/i });
    expect(link).toHaveAttribute('href', 'https://example.com/kqed');
  });
});

// ---- Flow test ----
// Uses real mock quote id q-103 (Mike Braun, cannabis-legalization, token tok-9d4b)
// so fetchRaceReveal falls back to buildMockReveal which resolves the identity via
// MOCK_IDENTITIES[tok-9d4b] → Mike Braun. The raceId must be mock-in-gov-2024 so
// verdicts flow through getRaceVerdicts → buildMockReveal correctly.

const flowPayload: RacePayload = {
  raceId: 'mock-in-gov-2024',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'cannabis-legalization',
      title: 'Cannabis Legalization',
      question: 'Should Indiana legalize marijuana?',
      quotes: [
        {
          id: 'q-103',
          text: 'Marijuana use is cascading across the country and the state needs to address it seriously.',
          candidateToken: 'tok-9d4b',
          topicKey: 'cannabis-legalization',
        },
      ],
    },
  ],
};

describe('ResultsPhase flow', () => {
  it('walks threshold then shows full results immediately', async () => {
    window.localStorage?.clear();
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(flowPayload);
    const q = flowPayload.topics[0].quotes[0];
    useReadRankStore.getState().agree(q);
    useReadRankStore.getState().finishRace();

    render(<ResultsPhase />);

    // Threshold (after loading resolves — 600ms setTimeout in the effect)
    const continueBtn = await screen.findByRole('button', { name: /see who you agreed with/i }, { timeout: 3000 });
    expect(screen.getByText(/you ranked 1 quote across 1 topic/i)).toBeInTheDocument();

    // Click → everything visible immediately, no reveal step
    await userEvent.click(continueBtn);
    expect((await screen.findAllByText(/mike braun/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/your top pick came from/i)).toBeInTheDocument();
    expect(screen.getByText(/how the candidates stack up/i)).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /calibrate your compass/i })).toBeInTheDocument();
  });
});
