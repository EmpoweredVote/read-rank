import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BallotCard, ResultsPhase } from '../ResultsPhase';
import type { BallotEntry } from '../../data/api';

const entry: BallotEntry = {
  rank: 1,
  candidateId: 'jane-doe',
  name: 'Jane Doe',
  office: 'Candidate for Governor',
  photo: '',
  essentialsUrl: 'https://essentials.empowered.vote/politician/jane-doe',
  evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
  perTopic: [
    {
      topicKey: 'housing',
      title: 'Housing',
      userTopWinner: true,
      quotes: [
        {
          quoteId: 'q1',
          text: 'A housing quote.',
          supported: true,
          rank: 1,
          sourceName: 'KQED Forum',
          sourceUrl: 'https://example.com/kqed',
        },
      ],
    },
  ],
};

describe('BallotCard source attribution', () => {
  it('shows a verify link for each quote in the expanded breakdown', async () => {
    render(<BallotCard entry={entry} index={0} verdictMap={{}} prefersReducedMotion={true} />);
    await userEvent.click(screen.getByRole('button', { name: /see what they said/i }));
    const link = screen.getByRole('link', { name: /verify source: KQED Forum/i });
    expect(link).toHaveAttribute('href', 'https://example.com/kqed');
  });
});

describe('ResultsPhase header', () => {
  it('offers the source explainer from the reveal screen', async () => {
    render(<ResultsPhase />);
    const trigger = await screen.findByRole('button', { name: /how we source quotes/i });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/how we source quotes/i);
  });
});
