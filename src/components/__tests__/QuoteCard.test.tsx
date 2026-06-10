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

describe('QuoteCard blind-trust footer', () => {
  it('shows the footer with explainer trigger by default', () => {
    render(<QuoteCard quote={quote} onAgree={vi.fn()} onDisagree={vi.fn()} />);
    expect(screen.getByText(/verified quote/i)).toBeInTheDocument();
    expect(screen.getByText(/source shown at the reveal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /how we source quotes/i })).toBeInTheDocument();
  });

  it('never renders per-quote source attribution', () => {
    render(<QuoteCard quote={quote} onAgree={vi.fn()} onDisagree={vi.fn()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('hides the footer when showTrustFooter is false', () => {
    render(<QuoteCard quote={quote} showTrustFooter={false} onAgree={vi.fn()} onDisagree={vi.fn()} />);
    expect(screen.queryByText(/verified quote/i)).not.toBeInTheDocument();
  });

  it('stops footer pointer events from reaching the drag surface', () => {
    const { container } = render(<QuoteCard quote={quote} onAgree={vi.fn()} onDisagree={vi.fn()} />);
    const card = container.firstElementChild as HTMLElement;
    const dragSpy = vi.fn();
    card.addEventListener('pointerdown', dragSpy);
    fireEvent.pointerDown(screen.getByText(/verified quote/i));
    expect(dragSpy).not.toHaveBeenCalled();
  });
});
