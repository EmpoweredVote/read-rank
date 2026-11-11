import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlignmentSection } from '../AlignmentSection';
import type { RevealResult } from '../../data/api';

const reveal: RevealResult = {
  raceId: 'r', positionName: 'Gov',
  ballot: [{
    rank: 1, candidateId: 'a', name: 'Ann Lee', office: 'O', photo: '', essentialsUrl: '',
    evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
    perTopic: [{ topicKey: 'h', title: 'Housing', userTopWinner: true, quotes: [{ quoteId: 'q', text: '', supported: true, rank: 1 }] }],
  }],
};
const topics = [{ key: 'h', title: 'Housing' }];

describe('AlignmentSection', () => {
  it('renders the heading and one table at every width (no separate mobile pills)', () => {
    render(<AlignmentSection reveal={reveal} topics={topics} rankMap={new Map([['q', 1]])} />);
    expect(screen.getByRole('heading', { name: 'Your alignment at a glance' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(document.querySelector('.pills-wrap')).toBeNull();
  });

  it('renders nothing without topics', () => {
    const { container } = render(<AlignmentSection reveal={reveal} topics={[]} rankMap={new Map()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
