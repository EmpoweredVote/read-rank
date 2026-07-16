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

describe('ResultsPhase exits', () => {
  const s = () => useReadRankStore.getState();

  it('offers "Back to your topics" when the race is not complete', async () => {
    window.localStorage?.clear();
    s().reset();
    s().selectRace(flowPayload);            // 1 topic, 1 quote -> not scorable -> not complete
    s().agree(flowPayload.topics[0].quotes[0]);
    s().revealBallot();
    render(<ResultsPhase />);
    expect(await screen.findByRole('button', { name: /back to your topics/i }, { timeout: 3000 })).toBeInTheDocument();
  });

  it('clicking "Back to your topics" routes to the issue-selection hub', async () => {
    window.localStorage?.clear();
    s().reset();
    s().selectRace(flowPayload);
    s().agree(flowPayload.topics[0].quotes[0]);
    s().revealBallot();
    render(<ResultsPhase />);
    const btn = await screen.findByRole('button', { name: /back to your topics/i }, { timeout: 3000 });
    btn.click();
    expect(s().phase).toBe('issue-selection');
  });

  it('shows "Review a topic" and no "Back to your topics" when the race is complete', async () => {
    window.localStorage?.clear();
    s().reset();
    const completePayload: RacePayload = {
      raceId: 'mock-in-gov-2024', positionName: 'Governor',
      topics: [{
        topicKey: 'cannabis-legalization', title: 'Cannabis Legalization', question: 'Q',
        quotes: [
          { id: 'q-103', text: 'Marijuana use is cascading.', candidateToken: 'tok-9d4b', topicKey: 'cannabis-legalization' },
          { id: 'q-101', text: 'We can make cannabis legal.', candidateToken: 'tok-a3f8', topicKey: 'cannabis-legalization' },
        ],
      }],
    };
    s().selectRace(completePayload);
    s().confirmIssueSelection();
    s().agree(completePayload.topics[0].quotes[0]);
    s().disagree(completePayload.topics[0].quotes[1]); // topic fully judged -> done -> race complete (1 of 1 scorable)
    s().revealBallot();
    render(<ResultsPhase />);
    expect(await screen.findByRole('button', { name: /review a topic/i }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back to your topics/i })).toBeNull();
  });

  it('treats the race as complete when every scorable topic is done, ignoring non-scorable topics', async () => {
    window.localStorage?.clear();
    s().reset();
    const mixed: RacePayload = {
      raceId: 'mock-in-gov-2024', positionName: 'Governor',
      topics: [
        { topicKey: 'cannabis-legalization', title: 'Cannabis', question: 'Q', quotes: [
          { id: 'q-103', text: 'Marijuana use is cascading.', candidateToken: 'tok-9d4b', topicKey: 'cannabis-legalization' },
          { id: 'q-101', text: 'We can make cannabis legal.', candidateToken: 'tok-a3f8', topicKey: 'cannabis-legalization' },
        ] },
        // Non-scorable: a single candidate/token -> can never be ranked.
        { topicKey: 'education-funding', title: 'Education', question: 'Q', quotes: [
          { id: 'q-105', text: 'Universal school choice.', candidateToken: 'tok-a3f8', topicKey: 'education-funding' },
        ] },
      ],
    };
    s().selectRace(mixed);
    s().confirmIssueSelection();
    s().agree(mixed.topics[0].quotes[0]);
    s().disagree(mixed.topics[0].quotes[1]); // cannabis fully judged -> only scorable topic is done
    s().revealBallot();
    render(<ResultsPhase />);
    expect(await screen.findByRole('button', { name: /review a topic/i }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back to your topics/i })).toBeNull();
  });
});
