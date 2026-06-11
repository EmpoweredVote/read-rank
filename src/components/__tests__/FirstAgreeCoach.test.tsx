import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FirstAgreeCoach } from '../FirstAgreeCoach';
import { useReadRankStore } from '../../store/useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('FirstAgreeCoach', () => {
  it('shows the caption and persists dismissal on any interaction', () => {
    render(<FirstAgreeCoach variant="mobile" />);
    expect(screen.getByRole('status')).toHaveTextContent(/filed as your 1st choice/i);
    fireEvent.pointerDown(window);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(useReadRankStore.getState().firstAgreeCoached).toBe(true);
  });

  it('renders nothing once coached', () => {
    useReadRankStore.getState().completeFirstAgreeCoach();
    render(<FirstAgreeCoach variant="mobile" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('uses drag wording on desktop', () => {
    render(<FirstAgreeCoach variant="desktop" />);
    expect(screen.getByRole('status')).toHaveTextContent(/drag anytime to reorder/i);
  });
});
