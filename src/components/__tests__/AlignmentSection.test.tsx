import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@empoweredvote/ev-ui', () => ({ useMediaQuery: vi.fn() }));
import { useMediaQuery } from '@empoweredvote/ev-ui';
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
  beforeEach(() => vi.clearAllMocks());
  it('renders the label and the matrix on desktop', () => {
    (useMediaQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true); // desktop
    render(<AlignmentSection reveal={reveal} topics={topics} />);
    expect(screen.getByText('Your alignment at a glance')).toBeInTheDocument();
    expect(document.querySelector('.alignment-grid')).toBeInTheDocument();
  });
  it('renders pills on mobile', () => {
    (useMediaQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false); // mobile
    render(<AlignmentSection reveal={reveal} topics={topics} />);
    expect(document.querySelector('.pills-wrap')).toBeInTheDocument();
  });
});
