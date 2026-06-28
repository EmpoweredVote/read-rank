import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankRail } from '../RankRail';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'mock-in-gov-2024',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'cannabis-legalization',
      title: 'Cannabis Legalization',
      question: 'Should Indiana legalize marijuana?',
      quotes: [
        { id: 'q-103', text: 'A quote the user disagrees with for testing.', candidateToken: 'tok-9d4b', topicKey: 'cannabis-legalization' },
      ],
    },
  ],
};

describe('RankRail iron recover', () => {
  it('announces when a disagreed quote is moved back to agreed', async () => {
    window.localStorage?.clear();
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(payload);
    useReadRankStore.getState().disagree(payload.topics[0].quotes[0]);

    render(<RankRail variant="sidebar" />);
    await userEvent.click(screen.getByRole('button', { name: /disagreed \(1\)/i }));
    await userEvent.click(screen.getByRole('button', { name: /move to agreed/i }));

    const statusNodes = screen.getAllByRole('status');
    const recovered = statusNodes.some((node) => /moved .* back to agreed/i.test(node.textContent ?? ''));
    expect(recovered).toBe(true);
  });
});
