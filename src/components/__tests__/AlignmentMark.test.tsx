import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlignmentMarkView } from '../AlignmentMark';

describe('AlignmentMarkView', () => {
  it('renders the rank number with an sr-only label', () => {
    render(<AlignmentMarkView mark={{ kind: 'rank', rank: 2 }} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Ranked 2')).toHaveClass('sr-only');
  });
  it('renders an agreed check with sr-only label', () => {
    const { container } = render(<AlignmentMarkView mark={{ kind: 'agreed' }} />);
    expect(container.querySelector('.mark-agreed')).toBeInTheDocument();
    expect(screen.getByText('Agreed')).toHaveClass('sr-only');
  });
  it('renders a disagreed cross with sr-only label', () => {
    const { container } = render(<AlignmentMarkView mark={{ kind: 'disagreed' }} />);
    expect(container.querySelector('.mark-disagreed')).toBeInTheDocument();
    expect(screen.getByText('Disagreed')).toHaveClass('sr-only');
  });
  it('renders a not-judged dash with sr-only label', () => {
    render(<AlignmentMarkView mark={null} />);
    expect(screen.getByText('Not judged')).toHaveClass('sr-only');
  });
});
