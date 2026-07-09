import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandidateBallotCard } from '../CandidateBallotCard';
import type { BallotEntry } from '../../data/api';

const entry: BallotEntry = {
  rank: 1, candidateId: 'c', name: 'Ana Rivera', office: 'Council',
  title: 'City Council Member', chamber: 'Salt Lake City', district: 'District 4',
  photo: '', essentialsUrl: 'https://e/x',
  evidence: { agreementCount: 5, firstPlaceCount: 3, topicsWithAgreement: 3 },
  perTopic: [
    { topicKey: 'h', title: 'Housing', userTopWinner: true, quotes: [{ quoteId: 'q1', text: 'Edited housing.', supported: true, rank: 1, sourceName: 'S', sourceDate: 'Jan 2025' }] },
    { topicKey: 't', title: 'Transit', userTopWinner: true, quotes: [{ quoteId: 'q2', text: 'Edited transit.', supported: true, rank: 1 }] },
    { topicKey: 'p', title: 'Policing', userTopWinner: true, quotes: [{ quoteId: 'q3', text: 'Edited policing.', supported: true, rank: 1 }] },
  ],
};

// Three of the entry's quotes are the user's #1 (one per topic).
const rankMap = new Map<string, number>([['q1', 1], ['q2', 1], ['q3', 1]]);

describe('CandidateBallotCard', () => {
  it('shows the rank number and evidence with top picks', () => {
    render(<CandidateBallotCard entry={entry} totalTopics={6} rankMap={rankMap} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    // Evidence text is split across <strong>/<span>, so assert on the container.
    const ev = document.querySelector('.ballot-evidence')!;
    expect(ev.textContent).toContain('Agreed with 5 of 6');
    expect(ev.textContent).toContain('3 top picks');
  });
  it('omits top picks when no quote is the user\'s #1', () => {
    render(<CandidateBallotCard entry={entry} totalTopics={6} rankMap={new Map()} />);
    expect(document.querySelector('.ballot-topk')).not.toBeInTheDocument();
  });
  it('shows a Tied tag when tied', () => {
    render(<CandidateBallotCard entry={entry} totalTopics={6} rankMap={rankMap} tied />);
    expect(document.querySelector('.ballot-tie')).toHaveTextContent('Tied');
  });
  it('announces the rank to screen readers (the visible chip is aria-hidden)', () => {
    render(<CandidateBallotCard entry={entry} totalTopics={6} rankMap={rankMap} />);
    expect(screen.getByText('Ranked 1')).toHaveClass('sr-only');
  });
  it('includes tie state in the sr-only rank label', () => {
    render(<CandidateBallotCard entry={{ ...entry, rank: 2 }} totalTopics={6} rankMap={rankMap} tied />);
    expect(screen.getByText('Ranked 2, tied')).toHaveClass('sr-only');
  });
  it('expands the drawer on toggle', async () => {
    const user = userEvent.setup();
    render(<CandidateBallotCard entry={entry} totalTopics={6} rankMap={rankMap} />);
    expect(screen.queryByText(/Edited housing/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /see what they said/i }));
    expect(screen.getByText(/Edited housing/)).toBeInTheDocument();
  });
});
