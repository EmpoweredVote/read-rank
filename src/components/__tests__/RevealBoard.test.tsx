import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevealBoard } from '../RevealBoard';
import type { QuoteIdentity } from '../../utils/revealInsight';
import type { AgreedQuote } from '../../store/useReadRankStore';

const idFor = (name: string): QuoteIdentity => ({
  candidateId: name.toLowerCase(),
  name,
  office: 'Candidate for Governor',
  photo: '',
  essentialsUrl: `https://example.com/${name.toLowerCase()}`,
  sourceName: 'Forum',
  sourceUrl: 'https://example.com/forum',
});

const agreed: AgreedQuote[] = [
  { id: 'q1', text: 'First quote.', candidateToken: 'a', topicKey: 'k', addedAt: 1 },
  { id: 'q2', text: 'Second quote.', candidateToken: 'b', topicKey: 'k', addedAt: 2 },
];

const identities = new Map<string, QuoteIdentity>([
  ['q1', idFor('Jane Doe')],
  ['q2', idFor('Sam Roe')],
]);

describe('RevealBoard', () => {
  it('renders the agreed ranking anonymously with a Reveal all control', () => {
    render(<RevealBoard agreed={agreed} identities={identities} onAllRevealed={vi.fn()} />);
    expect(screen.getByText('First quote.')).toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(/jane|sam/i);
    expect(screen.getByRole('button', { name: /reveal all/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^reveal$/i })).toHaveLength(2);
  });

  it('announces each reveal and fires completion after the last one', async () => {
    const onAllRevealed = vi.fn();
    render(<RevealBoard agreed={agreed} identities={identities} onAllRevealed={onAllRevealed} />);
    const reveals = screen.getAllByRole('button', { name: /^reveal$/i });
    await userEvent.click(reveals[0]);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    const status = screen.getAllByRole('status').find((el) => /revealed/i.test(el.textContent ?? ''));
    expect(status).toHaveTextContent(/1st choice revealed: Jane Doe, Candidate for Governor/i);
    expect(onAllRevealed).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /^reveal$/i }));
    expect(onAllRevealed).toHaveBeenCalledOnce();
  });

  it('completes vacuously when no agreed quote has an identity', () => {
    const onAllRevealed = vi.fn();
    render(<RevealBoard agreed={agreed} identities={new Map()} onAllRevealed={onAllRevealed} />);
    expect(onAllRevealed).toHaveBeenCalledOnce();
  });

  it('reveals everything at once via Reveal all', async () => {
    const onAllRevealed = vi.fn();
    render(<RevealBoard agreed={agreed} identities={identities} onAllRevealed={onAllRevealed} />);
    await userEvent.click(screen.getByRole('button', { name: /reveal all/i }));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Sam Roe')).toBeInTheDocument();
    expect(onAllRevealed).toHaveBeenCalledOnce();
  });
});
