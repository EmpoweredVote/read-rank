import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevealBand } from '../RevealBand';

describe('RevealBand', () => {
  it('reports ranked quotes and the agreement headline when the roster has ranks', () => {
    render(<RevealBand office="CA Governor" rankedCount={4} judgedCount={12} topicCount={3} nothingRanked={false} />);
    expect(screen.getByText(/you ranked 4 quotes across 3 topics/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /now see who you agreed with/i })).toBeInTheDocument();
  });

  it('reports quotes read and the who-said-what headline when the roster has none', () => {
    render(<RevealBand office="CA Governor" rankedCount={0} judgedCount={12} topicCount={3} nothingRanked />);
    expect(screen.getByText(/you read 12 quotes across 3 topics/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /now see who said what/i })).toBeInTheDocument();
    expect(screen.queryByText(/you ranked 0/i)).not.toBeInTheDocument();
  });

  it('follows the roster, not the agreed count, when the two disagree', () => {
    // Backend ranked nobody despite the user having agreed with something. The
    // band must not promise a ranking the list below it doesn't have.
    render(<RevealBand office="CA Governor" rankedCount={2} judgedCount={12} topicCount={3} nothingRanked />);
    expect(screen.getByRole('heading', { name: /now see who said what/i })).toBeInTheDocument();
    expect(screen.getByText(/you read 12 quotes/i)).toBeInTheDocument();
  });

  it('singularises one quote and one topic', () => {
    render(<RevealBand office="" rankedCount={0} judgedCount={1} topicCount={1} nothingRanked />);
    expect(screen.getByText(/you read 1 quote across 1 topic$/i)).toBeInTheDocument();
  });
});
