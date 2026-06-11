// src/components/__tests__/RaceCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaceCard } from '../RaceCard';

const props = {
  office: 'Governor', tier: 'state' as const, scope: 'statewide' as const,
  state: 'IN', place: null, electionDate: '2024-11-05', boundaryRef: null,
  candidateCount: 4, topicCount: 3, estMinutes: 2, isLocal: false, onSelect: () => {},
};

describe('RaceCard', () => {
  it('shows the office title, tier/scope label, geography and metadata', () => {
    render(<RaceCard {...props} />);
    expect(screen.getByText('Governor')).toBeInTheDocument();
    expect(screen.getByText(/state\s*·\s*statewide/i)).toBeInTheDocument();
    expect(screen.getByText(/nov 2024/i)).toBeInTheDocument();
    expect(screen.getByText('Candidates').parentElement).toHaveTextContent('4');
    expect(screen.getByText('Topics').parentElement).toHaveTextContent('3');
    expect(screen.getByText('Time').parentElement).toHaveTextContent('~2 min');
  });

  it('fires onSelect on click', async () => {
    const onSelect = vi.fn();
    render(<RaceCard {...props} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /open governor race/i }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('shows the Local pill when isLocal', () => {
    render(<RaceCard {...props} office="Mayor" tier="local" scope="citywide" isLocal place="Bloomington" />);
    expect(screen.getByText('Local')).toBeInTheDocument();
  });
});
