import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicStepper } from '../TopicStepper';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-q',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'fossil-fuels',
      title: 'Fossil fuels',
      question: 'Should California phase out oil & gas drilling?',
      quotes: [
        { id: 'q1', text: 'One.', candidateToken: 'a', topicKey: 'fossil-fuels' },
        { id: 'q2', text: 'Two.', candidateToken: 'b', topicKey: 'fossil-fuels' },
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
});

describe('TopicStepper question banner', () => {
  it('renders the topic question inside the yellow highlight span', () => {
    render(<TopicStepper />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Should California phase out oil & gas drilling?');
    const hl = heading.querySelector('.question-banner-hl');
    expect(hl).not.toBeNull();
    expect(hl).toHaveTextContent('Should California phase out oil & gas drilling?');
  });
});
