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
  });

  it('severs Iron below a labeled divider', async () => {
    const [q1, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().disagree(q2);
    render(<RankRail variant="sheet" />);
    expect(screen.getByText(/you disagreed with everything below this line/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /disagreed \(1\)/i }));
    const ironRow = screen.getByText('Rail disagreed quote.').closest('.tier-row');
    expect(ironRow).toHaveClass('tier-row-iron');
  });

  it('omits the severance line when nothing is agreed yet', () => {
    const [, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().disagree(q2);
    render(<RankRail variant="sheet" />);
    expect(screen.queryByText(/below this line/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disagreed \(1\)/i })).toBeInTheDocument();
  });

  it('recovers a disagreed quote into the ranking', async () => {
    const [q1, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().disagree(q2);
    render(<RankRail variant="sheet" />);
    await userEvent.click(screen.getByRole('button', { name: /disagreed \(1\)/i }));
    await userEvent.click(screen.getByRole('button', { name: /move to agreed/i }));
    expect(useReadRankStore.getState().getCurrentRaceProgress()!.agreed.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(screen.queryByRole('button', { name: /disagreed \(/i })).not.toBeInTheDocument();
  });
});
