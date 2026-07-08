import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuoteCard } from '../QuoteCard';
import type { BlindQuote } from '../../store/useReadRankStore';

const quote: BlindQuote = {
  id: 'q1',
  text: 'A policy statement about housing.',
  candidateToken: 'tok-a',
  topicKey: 'housing',
};

describe('QuoteCard blind-trust affordance', () => {
  it('shows only the sourcing info button, not a verified label', () => {
    render(<QuoteCard quote={quote} />);
    expect(screen.queryByText(/verified quote/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/source shown at the reveal/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /how we source quotes/i })).toBeInTheDocument();
  });

  it('does not render a quote number (the progress bar carries it)', () => {
    render(<QuoteCard quote={quote} />);
    expect(screen.queryByText(/^Quote \d+/)).not.toBeInTheDocument();
  });

  it('never renders per-quote source attribution', () => {
    render(<QuoteCard quote={quote} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('hides the info button when showTrustFooter is false', () => {
    render(<QuoteCard quote={quote} showTrustFooter={false} />);
    expect(screen.queryByRole('button', { name: /how we source quotes/i })).not.toBeInTheDocument();
  });

  it('stops info-button pointer events from reaching the drag surface', () => {
    const { container } = render(<QuoteCard quote={quote} />);
    const card = container.firstElementChild as HTMLElement;
    const dragSpy = vi.fn();
    card.addEventListener('pointerdown', dragSpy);
    fireEvent.pointerDown(screen.getByRole('button', { name: /how we source quotes/i }));
    expect(dragSpy).not.toHaveBeenCalled();
  });

  it('still opens the explainer when the info button is clicked', () => {
    render(<QuoteCard quote={quote} />);
    fireEvent.click(screen.getByRole('button', { name: /how we source quotes/i }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/how we source quotes/i);
  });

  it('carries the Inform accent rule when it is the active card', () => {
    const { container } = render(<QuoteCard quote={quote} />);
    expect(container.firstElementChild).toHaveClass('ev-quote-card-active');
  });

  it('drops the accent rule when stacked behind the active card', () => {
    const { container } = render(
      <QuoteCard quote={quote} isStacked stackIndex={1} />
    );
    expect(container.firstElementChild).not.toHaveClass('ev-quote-card-active');
  });

  it('never renders a verdict stamp overlay', () => {
    render(<QuoteCard quote={quote} />);
    expect(document.querySelector('.quote-stamp')).toBeNull();
  });
});
