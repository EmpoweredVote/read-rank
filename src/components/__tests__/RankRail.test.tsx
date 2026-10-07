import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankRail } from '../RankRail';
import { RaceRankSourceProvider } from '../RankSource';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-rail',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'q1', text: 'Rail agreed quote.', candidateToken: 'a', topicKey: 'housing' },
        { id: 'q2', text: 'Rail disagreed quote.', candidateToken: 'b', topicKey: 'housing' },
        { id: 'q3', text: 'Rail second agreed.', candidateToken: 'c', topicKey: 'housing' },
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
});

describe('RankRail', () => {
  it('shows only the empty box (no subtitle) before anything is agreed', () => {
    render(<RaceRankSourceProvider><RankRail variant="sidebar" /></RaceRankSourceProvider>);
    expect(document.querySelectorAll('.tier-ghost')).toHaveLength(0);
    expect(screen.queryByText('Quotes you agree with land here.')).not.toBeInTheDocument();
    expect(document.querySelector('.rank-panel-sub')).toBeNull();
    expect(screen.getByText('Agree with a quote to add it here. Then put the one you trust most on top.')).toBeVisible();
  });

  it('switches subtitle at one agreed and hides the empty state', () => {
    useReadRankStore.getState().agree(payload.topics[0].quotes[0]);
    render(<RaceRankSourceProvider><RankRail variant="sidebar" /></RaceRankSourceProvider>);
    expect(screen.getByText('Agree with more quotes to compare them here.')).toBeInTheDocument();
    expect(screen.queryByText(/agree with a quote to add it here/i)).not.toBeInTheDocument();
  });

  it('shows the privacy footer by default and hides it on request', () => {
    const { unmount } = render(<RaceRankSourceProvider><RankRail variant="sidebar" /></RaceRankSourceProvider>);
    expect(screen.getByText('Names and parties stay hidden until you see your full ballot.')).toBeInTheDocument();
    unmount();
    render(<RaceRankSourceProvider><RankRail variant="sidebar" showPrivacyNote={false} /></RaceRankSourceProvider>);
    expect(screen.queryByText(/names and parties stay hidden/i)).not.toBeInTheDocument();
  });

  it('drops the subtitle at two agreed (the toolbar hint takes over)', () => {
    const [q1, , q3] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().agree(q3);
    render(<RaceRankSourceProvider><RankRail variant="sidebar" /></RaceRankSourceProvider>);
    expect(screen.queryByText(/land here|compare them here/i)).not.toBeInTheDocument();
    expect(screen.getByText(/tap a number to place it/i)).toBeInTheDocument();
  });

  it('collapses disagreed behind a single line, with no divider', async () => {
    const [q1, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().disagree(q2);
    render(<RaceRankSourceProvider><RankRail variant="sheet" /></RaceRankSourceProvider>);
    expect(screen.queryByText(/below this line/i)).not.toBeInTheDocument();
    // Quote stays hidden until the line is tapped.
    expect(screen.queryByText('Rail disagreed quote.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /disagreed.*review or recover/i }));
    const disagreedRow = screen.getByText('Rail disagreed quote.').closest('.tier-row');
    expect(disagreedRow).toHaveClass('tier-row-disagreed');
  });

  it('shows the disagreed line even when nothing is agreed yet', () => {
    const [, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().disagree(q2);
    render(<RaceRankSourceProvider><RankRail variant="sheet" /></RaceRankSourceProvider>);
    expect(screen.queryByText(/below this line/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 disagreed.*review or recover/i })).toBeInTheDocument();
  });

  it('recovers a disagreed quote into the ranking', async () => {
    const [q1, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().disagree(q2);
    render(<RaceRankSourceProvider><RankRail variant="sheet" /></RaceRankSourceProvider>);
    await userEvent.click(screen.getByRole('button', { name: /disagreed.*review or recover/i }));
    await userEvent.click(screen.getByRole('button', { name: /move to my ranking/i }));
    expect(useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.agreed.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(screen.queryByRole('button', { name: /review or recover/i })).not.toBeInTheDocument();
  });
});

describe('RankRail — per-topic isolation', () => {
  const multiTopic: RacePayload = {
    raceId: 'race-rail-multi',
    positionName: 'Governor',
    topics: [
      {
        topicKey: 'housing',
        title: 'Housing',
        question: 'How to fix housing?',
        quotes: [
          { id: 'h1', text: 'Housing quote one.', candidateToken: 'a', topicKey: 'housing' },
          { id: 'h2', text: 'Housing disagreed quote.', candidateToken: 'b', topicKey: 'housing' },
        ],
      },
      {
        topicKey: 'schools',
        title: 'Schools',
        question: 'How to fix schools?',
        quotes: [
          { id: 's1', text: 'Schools quote one.', candidateToken: 'a', topicKey: 'schools' },
          { id: 's2', text: 'Schools quote two.', candidateToken: 'b', topicKey: 'schools' },
        ],
      },
    ],
  };

  beforeEach(() => {
    window.localStorage?.clear();
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(multiTopic);
    useReadRankStore.getState().confirmIssueSelection();
  });

  it('does not carry a previous topic\'s disagreed quote into the next topic', () => {
    // Disagree a quote on the housing topic, then advance to schools.
    useReadRankStore.getState().disagree(multiTopic.topics[0].quotes[1]);
    useReadRankStore.getState().nextTopic();
    expect(useReadRankStore.getState().getCurrentRaceProgress()!.currentTopicKey).toBe('schools');

    render(<RaceRankSourceProvider><RankRail variant="sheet" /></RaceRankSourceProvider>);
    // The new topic starts with an empty disagreed section — no housing leak.
    expect(screen.queryByRole('button', { name: /disagreed.*review or recover/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Housing disagreed quote.')).not.toBeInTheDocument();
  });
});
