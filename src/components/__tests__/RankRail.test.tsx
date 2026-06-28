import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankRail } from '../RankRail';
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
  it('shows three ghost slots before anything is ranked', () => {
    render(<RankRail variant="sidebar" />);
    expect(document.querySelectorAll('.tier-ghost')).toHaveLength(3);
    expect(screen.getByText(/nothing ranked yet/i)).toBeInTheDocument();
  });

  it('collapses disagreed behind a single line, with no divider', async () => {
    const [q1, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().disagree(q2);
    render(<RankRail variant="sheet" />);
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
    render(<RankRail variant="sheet" />);
    expect(screen.queryByText(/below this line/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 disagreed.*review or recover/i })).toBeInTheDocument();
  });

  it('recovers a disagreed quote into the ranking', async () => {
    const [q1, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().disagree(q2);
    render(<RankRail variant="sheet" />);
    await userEvent.click(screen.getByRole('button', { name: /disagreed.*review or recover/i }));
    await userEvent.click(screen.getByRole('button', { name: /move to agreed/i }));
    expect(useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.agreed.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(screen.queryByRole('button', { name: /review or recover/i })).not.toBeInTheDocument();
  });
});
