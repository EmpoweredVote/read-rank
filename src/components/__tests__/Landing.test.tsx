import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from '../Landing';
import { useReadRankStore } from '../../store/useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('Landing', () => {
  it('renders the hero and the election picker on one surface', async () => {
    // Seed an Indiana location so RaceHub shows the located ballot (with time tabs); the
    // default no-location view is the LA example ballot, which the demo race isn't in.
    useReadRankStore.getState().setLocationFilter({
      address: 'Indianapolis, IN', politicianIds: [], state: 'IN', county: null, countyName: null,
    });
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/read candidates blind/i);
    expect(screen.getByText(/choose an election/i)).toBeInTheDocument();
    expect(screen.getByText(/start here/i)).toBeInTheDocument();
    // RaceHub inside the picker resolves the mock race async (fetch fallback).
    // The demo Indiana race (2024-11-05) is past — switch to Past tab to see it.
    const pastBtn = await screen.findByRole('button', { name: /^past$/i }, { timeout: 3000 });
    await userEvent.click(pastBtn);
    expect(await screen.findByText('Governor', undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it('offers practice as an opt-in warm-up', async () => {
    render(<Landing />);
    await userEvent.click(screen.getByRole('button', { name: /try a 30-second warm-up/i }));
    expect(useReadRankStore.getState().phase).toBe('practice');
    expect(useReadRankStore.getState().practiceProgress).not.toBeNull();
  });
});
