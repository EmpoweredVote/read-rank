import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaceBreadcrumb } from '../RaceBreadcrumb';
import { useReadRankStore } from '../../store/useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

function seedRace(over: Record<string, unknown>) {
  useReadRankStore.setState((s) => ({
    currentRaceId: 'r1',
    phase: 'evaluation',
    raceProgress: {
      ...s.raceProgress,
      r1: {
        raceId: 'r1', positionName: 'fallback', topics: {}, topicOrder: [],
        currentTopicKey: null, phase: 'evaluation', completed: false, ...over,
      },
    },
  }));
}

describe('RaceBreadcrumb', () => {
  it('shows "All races" and the office, seat and state of the current race', () => {
    seedRace({ office: 'US Representative', seat: 'District 9', state: 'IN' });
    render(<RaceBreadcrumb />);
    expect(screen.getByRole('button', { name: /all races/i })).toBeInTheDocument();
    const crumb = screen.getByText(/US Representative/);
    expect(crumb).toHaveTextContent('US Representative, District 9 · Indiana');
  });

  it('omits the seat segment when there is no seat', () => {
    seedRace({ office: 'Governor', seat: null, state: 'CA' });
    render(<RaceBreadcrumb />);
    expect(screen.getByText(/Governor/)).toHaveTextContent('Governor · California');
  });

  it('falls back to positionName when office is absent', () => {
    seedRace({ office: undefined, positionName: 'Mayor', state: null });
    render(<RaceBreadcrumb />);
    expect(screen.getByText('Mayor')).toBeInTheDocument();
  });

  it('returns to the hub when "All races" is clicked', async () => {
    seedRace({ office: 'Governor', seat: null, state: 'CA' });
    render(<RaceBreadcrumb />);
    await userEvent.click(screen.getByRole('button', { name: /all races/i }));
    expect(useReadRankStore.getState().phase).toBe('hub');
    expect(useReadRankStore.getState().currentRaceId).toBeNull();
  });

  it('renders nothing when no race is active', () => {
    const { container } = render(<RaceBreadcrumb />);
    expect(container).toBeEmptyDOMElement();
  });
});
