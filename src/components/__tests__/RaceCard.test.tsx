// src/components/__tests__/RaceCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RaceCard } from '../RaceCard';

// Base props using current RaceCard prop names.
// The tests exercise FUTURE intended behavior and are intentionally RED
// until Task 4 implements the redesigned RaceCard.
const baseProps = {
  office: 'Governor',
  tier: 'state' as const,
  scope: 'statewide' as const,
  state: 'IN',
  place: null,
  electionDate: '2024-11-05',
  boundaryRef: null,
  frameRef: null,
  candidateCount: 4,
  topicCount: 3,
  estMinutes: 2,
  isLocal: false,
  onSelect: vi.fn(),
};

describe('RaceCard', () => {
  it('renders full state name from abbreviation', () => {
    render(<RaceCard {...baseProps} />);
    expect(screen.getByText(/Indiana/)).toBeInTheDocument();
  });

  it('renders formatted election date', () => {
    render(<RaceCard {...baseProps} />);
    expect(screen.getByText(/Nov\s+5,\s+2024/)).toBeInTheDocument();
  });

  it('renders districtLabel when provided', () => {
    render(<RaceCard {...baseProps} districtLabel="District 1" />);
    expect(screen.getByText('District 1')).toBeInTheDocument();
  });

  it('renders no district element when districtLabel is absent', () => {
    render(<RaceCard {...baseProps} districtLabel={null} />);
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
