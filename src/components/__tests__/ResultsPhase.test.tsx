import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsPhase } from '../ResultsPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

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
  it('shows the reveal band and full results directly (no threshold gate)', async () => {
    window.localStorage?.clear();
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(flowPayload);
    const q = flowPayload.topics[0].quotes[0];
    useReadRankStore.getState().agree(q);
    useReadRankStore.getState().revealBallot();

    render(<ResultsPhase />);

    // Reveal band appears once loading resolves (600ms setTimeout in the effect).
    expect(await screen.findByText(/Now see/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/you ranked 1 quote across 1 topic/i)).toBeInTheDocument();

    // Results render immediately below the band — no interstitial step.
    expect((await screen.findAllByText(/mike braun/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/how the candidates stack up/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /calibrate your compass/i })).toBeInTheDocument();
  });

  it('announces the reveal with the #1 candidate and agreement count for screen readers', async () => {
    window.localStorage?.clear();
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(flowPayload);
    const q = flowPayload.topics[0].quotes[0];
    useReadRankStore.getState().agree(q);
    useReadRankStore.getState().revealBallot();

    render(<ResultsPhase />);

    const announcement = await screen.findByText(
      /ballot revealed\. your number one is mike braun, agreed with 1 position\./i,
      {},
      { timeout: 3000 }
    );
    expect(announcement).toHaveAttribute('aria-live', 'polite');
  });
});
