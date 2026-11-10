import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BallotLoader } from '../BallotLoader';

describe('BallotLoader', () => {
  it('shows the matching step in a polite status region', () => {
    render(<BallotLoader step="matching" />);
    expect(screen.getByText('Tallying your ballot')).toBeInTheDocument();
    expect(screen.getByText('Matching your rankings to candidates…')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
  it('shows the revealing step', () => {
    render(<BallotLoader step="revealing" />);
    expect(screen.getByText('Revealing names…')).toBeInTheDocument();
  });
});
