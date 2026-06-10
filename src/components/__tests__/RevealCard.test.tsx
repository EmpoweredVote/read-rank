import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevealCard } from '../RevealCard';
import type { QuoteIdentity } from '../../utils/revealInsight';

const identity: QuoteIdentity = {
  candidateId: 'jane',
  name: 'Jane Doe',
  office: 'Candidate for Governor',
  photo: '',
  essentialsUrl: 'https://example.com/jane',
  sourceName: 'KQED Forum',
  sourceUrl: 'https://example.com/kqed',
};

describe('RevealCard', () => {
  it('keeps the candidate fully absent from the DOM until revealed', () => {
    render(
      <RevealCard quoteText="A quote." index={0} identity={identity} revealed={false} onReveal={vi.fn()} />
    );
    expect(screen.getByText('A quote.')).toBeInTheDocument();
    expect(screen.queryByText(/jane doe/i)).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(/jane|example\.com\/jane|kqed/i);
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
  });

  it('requests the reveal on tap', async () => {
    const onReveal = vi.fn();
    render(
      <RevealCard quoteText="A quote." index={0} identity={identity} revealed={false} onReveal={onReveal} />
    );
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it('shows identity, retained quote, source, and tier frame once revealed', () => {
    render(
      <RevealCard quoteText="A quote." index={1} identity={identity} revealed onReveal={vi.fn()} />
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Candidate for Governor')).toBeInTheDocument();
    expect(screen.getByText('A quote.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /verify source: KQED Forum/i })).toBeInTheDocument();
    expect(screen.getByText('A quote.').closest('.tier-row')).toHaveClass('tier-row-gold');
    expect(screen.queryByRole('button', { name: /^reveal$/i })).not.toBeInTheDocument();
  });

  it('links to the candidate profile once revealed', () => {
    render(
      <RevealCard quoteText="A quote." index={0} identity={identity} revealed onReveal={vi.fn()} />
    );
    const link = screen.getByRole('link', { name: /view candidate/i });
    expect(link).toHaveAttribute('href', 'https://example.com/jane');
  });

  it('does not steal focus when mounted already revealed', () => {
    render(
      <RevealCard quoteText="A quote." index={0} identity={identity} revealed onReveal={vi.fn()} />
    );
    expect(screen.getByText('Jane Doe').closest('.tier-row')).not.toHaveFocus();
  });

  it('moves focus to the revealed card so keyboard users keep their place', () => {
    const { rerender } = render(
      <RevealCard quoteText="A quote." index={0} identity={identity} revealed={false} onReveal={vi.fn()} />
    );
    rerender(
      <RevealCard quoteText="A quote." index={0} identity={identity} revealed onReveal={vi.fn()} />
    );
    expect(screen.getByText('Jane Doe').closest('.tier-row')).toHaveFocus();
  });

  it('omits the candidate profile link when no Essentials profile exists', () => {
    render(
      <RevealCard quoteText="A quote." index={0} identity={{ ...identity, essentialsUrl: '' }} revealed onReveal={vi.fn()} />
    );
    expect(screen.queryByRole('link', { name: /view candidate/i })).not.toBeInTheDocument();
    // An unguarded <a href=""> has no link role but still renders dead-link
    // text — the text-level assertion is the one that pins the guard.
    expect(screen.queryByText(/view candidate/i)).not.toBeInTheDocument();
  });
});
