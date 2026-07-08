import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AlignmentPills } from '../AlignmentPills';
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
    render(<AlignmentPills reveal={reveal} topics={topics} />);
    const block = screen.getByText('Ann Lee').closest('.pills-candidate')!;
    const labels = within(block as HTMLElement).getAllByTestId('pill-topic').map((n) => n.textContent);
    // rank 1 (Transit) first, then agreed (Housing rank 5), then disagreed (Policing)
    expect(labels).toEqual(['Transit', 'Housing', 'Policing']);
  });
});
