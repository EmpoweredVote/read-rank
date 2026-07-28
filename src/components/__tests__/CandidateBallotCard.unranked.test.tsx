import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CandidateBallotCard } from '../CandidateBallotCard';
import type { BallotEntry } from '../../data/api';

const unranked: BallotEntry = {
  rank: null,
  candidateId: 'cand-u',
  name: 'Dana Reyes',
  office: 'County Commissioner',
  photo: '',
  essentialsUrl: 'https://essentials.empowered.vote/politician/cand-u',
  evidence: { agreementCount: 0, firstPlaceCount: 0, topicsWithAgreement: 0 },
  perTopic: [
    {
      topicKey: 'housing',
      title: 'Housing',
      userTopWinner: false,
      quotes: [{ quoteId: 'u1', text: 'Build less.', supported: false, rank: null }],
    },
  ],
};

const ranked: BallotEntry = {
  ...unranked,
  rank: 2,
  candidateId: 'cand-r',
  name: 'Sam Okafor',
  evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
  perTopic: [
    {
      topicKey: 'housing',
      title: 'Housing',
      userTopWinner: false,
      quotes: [{ quoteId: 'r1', text: 'Build more.', supported: true, rank: 2 }],
    },
  ],
};

describe('CandidateBallotCard with an unranked entry', () => {
  it('renders no rank chip', () => {
    const { container } = render(
      <CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} />
    );
    expect(container.querySelector('.rank-number')).toBeNull();
  });

  it('announces "Not ranked" instead of a rank', () => {
    render(<CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} />);
    expect(screen.getByText(/not ranked/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Ranked \d/)).not.toBeInTheDocument();
  });

  it('never shows a tie tag, even if tied is passed', () => {
    render(<CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} tied />);
    expect(screen.queryByText(/^Tied$/)).not.toBeInTheDocument();
  });

  it('still renders the identity and the quote toggle', () => {
    render(<CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} />);
    expect(screen.getByText(/dana reyes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /see what they said/i })).toBeInTheDocument();
  });

  it('still renders the rank chip for a ranked entry', () => {
    const { container } = render(
      <CandidateBallotCard entry={ranked} totalTopics={3} rankMap={new Map()} />
    );
    expect(container.querySelector('.rank-number')?.textContent).toBe('2');
    expect(screen.getByText(/^Ranked 2$/)).toBeInTheDocument();
  });

  it('reports what it disagreed on instead of "Agreed with 0"', () => {
    render(<CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} />);
    expect(screen.getByText(/disagreed on/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 3/)).toBeInTheDocument();
    expect(screen.queryByText(/agreed with/i)).not.toBeInTheDocument();
  });
});
