import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaceHub } from '../RaceHub';
import { useReadRankStore } from '../../store/useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('RaceHub arena cards', () => {
  it('shows the wordmark with its Inform underline', async () => {
    render(<RaceHub />);
    const wordmark = await screen.findByText(/read & rank/i, undefined, { timeout: 3000 });
    expect(wordmark.closest('h1')?.querySelector('.wordmark-underline')).not.toBeNull();
  });

  it('renders the race as a RaceCard with tier, geography and metadata', async () => {
    // The default (no-location) view is the LA example ballot, which the Indiana demo
    // race isn't part of. Seed an Indiana location so the located ballot (with its time
    // tabs) surfaces the mock race.
    useReadRankStore.getState().setLocationFilter({
      address: 'Indianapolis, IN', politicianIds: [], state: 'IN', county: null, countyName: null,
    });
    render(<RaceHub />);
    // jsdom fetch fails -> mock fallback supplies the Indiana demo race (2024-11-05 = past).
    // Switch to the Past tab first so the card is visible.
    const pastBtn = await screen.findByRole('button', { name: /^past$/i });
    await userEvent.click(pastBtn);
    const card = await screen.findByRole('button', { name: /open governor race/i });
    expect(card).toHaveTextContent('Governor');
    expect(card).toHaveTextContent('Indiana');
    expect(card).toHaveTextContent('Nov 5, 2024');
    expect(screen.getByText('Candidates').parentElement).toHaveTextContent('4');
    expect(screen.getByText('Topics').parentElement).toHaveTextContent('3');
    expect(screen.queryByText(/ranked choice/i)).not.toBeInTheDocument();
  });
});
