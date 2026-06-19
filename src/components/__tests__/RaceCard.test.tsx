// src/components/__tests__/RaceCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RaceCard } from '../RaceCard';

// Base props covering the redesigned RaceCard API.
const baseProps = {
  office: 'Governor',
  tier: 'state' as const,
  scope: 'statewide' as const,
  state: 'IN',
  electionDate: '2024-11-05',
  boundaryRef: null,
  frameRef: null,
  candidateCount: 4,
  topicCount: 3,
  estMinutes: 2,
  onSelect: vi.fn(),
};

describe('RaceCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders full state name from abbreviation', () => {
    render(<RaceCard {...baseProps} />);
    expect(screen.getByText(/Indiana/)).toBeInTheDocument();
  });

  it('renders formatted election date', () => {
    render(<RaceCard {...baseProps} />);
    expect(screen.getByText(/Nov\s+5,\s+2024/)).toBeInTheDocument();
  });

  it('renders seat when provided', () => {
    render(<RaceCard {...baseProps} seat="District 1" />);
    expect(screen.getByText('District 1')).toBeInTheDocument();
  });

  it('renders no seat element when seat is absent', () => {
    render(<RaceCard {...baseProps} seat={null} />);
    expect(screen.queryByText(/District/)).not.toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', async () => {
    const onSelect = vi.fn();
    render(<RaceCard {...baseProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /Governor/i }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('does not render a Local pill', () => {
    render(<RaceCard {...baseProps} />);
    expect(screen.queryByText(/Local/i)).not.toBeInTheDocument();
  });

  it('renders scope row with null state gracefully', () => {
    render(<RaceCard {...baseProps} state={null} />);
    // Should not crash; no state name shown
    expect(screen.queryByText('Indiana')).not.toBeInTheDocument();
  });
});
