import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankSheet } from '../RankSheet';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-sheet',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'q1', text: 'First agreed quote.', candidateToken: 'a', topicKey: 'housing' },
        { id: 'q2', text: 'A disagreed quote.', candidateToken: 'b', topicKey: 'housing' },
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
  const [q1, q2] = payload.topics[0].quotes;
  useReadRankStore.getState().agree(q1);
  useReadRankStore.getState().disagree(q2);
});

describe('RankSheet', () => {
  it('renders nothing while closed', () => {
    render(<RankSheet open={false} allDone={false} onClose={vi.fn()} onSeeResults={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the agreed ranking and closes via Done', async () => {
    const onClose = vi.fn();
    render(<RankSheet open allDone={false} onClose={onClose} onSeeResults={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('First agreed quote.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /see results/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('recovers a disagreed quote into the ranking', async () => {
    render(<RankSheet open allDone={false} onClose={vi.fn()} onSeeResults={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /disagreed \(1\)/i }));
    await userEvent.click(screen.getByRole('button', { name: /move to agreed/i }));
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.agreed.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(race.topics.housing.disagreed).toEqual([]);
    expect(screen.queryByRole('button', { name: /disagreed \(/i })).not.toBeInTheDocument();
    expect(screen.getByText('A disagreed quote.')).toBeInTheDocument();
  });

  it('pins See Results in the completion state', async () => {
    const onSeeResults = vi.fn();
    render(<RankSheet open allDone onClose={vi.fn()} onSeeResults={onSeeResults} />);
    expect(screen.getByText(/all quotes read/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /see results/i }));
    expect(onSeeResults).toHaveBeenCalled();
  });
});
