import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AlignmentPills } from '../AlignmentPills';
import { buildPerTopicRankMap } from '../../utils/alignmentMarks';
import type { RevealResult } from '../../data/api';

const reveal: RevealResult = {
  raceId: 'r', positionName: 'Gov',
  ballot: [{
    rank: 1, candidateId: 'a', name: 'Ann Lee', office: 'O', photo: '', essentialsUrl: '',
    evidence: { agreementCount: 3, firstPlaceCount: 1, topicsWithAgreement: 3 },
    perTopic: [
      { topicKey: 'h', title: 'Housing', userTopWinner: true, quotes: [{ quoteId: 'q1', text: '', supported: true, rank: 5 }] },
      { topicKey: 't', title: 'Transit', userTopWinner: true, quotes: [{ quoteId: 'q2', text: '', supported: true, rank: 1 }] },
      { topicKey: 'p', title: 'Policing', userTopWinner: false, quotes: [{ quoteId: 'q3', text: '', supported: false, rank: null }] },
    ],
  }],
};
const topics = [{ key: 'h', title: 'Housing' }, { key: 't', title: 'Transit' }, { key: 'p', title: 'Policing' }];

describe('AlignmentPills', () => {
  it('renders one block per candidate with strongest-first pills', () => {
    render(<AlignmentPills reveal={reveal} topics={topics} rankMap={buildPerTopicRankMap(reveal)} />);
    const block = screen.getByText('Ann Lee').closest('.pills-candidate')!;
    const labels = within(block as HTMLElement).getAllByTestId('pill-topic').map((n) => n.textContent);
    // Each topic has one supported quote, so both agreed quotes are per-topic rank 1;
    // stable strongest-first sort keeps input topic order, disagreed (Policing) last.
    expect(labels).toEqual(['Housing', 'Transit', 'Policing']);
  });
});
