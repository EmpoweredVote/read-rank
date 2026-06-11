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
  it('renders the hero and the election picker', async () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/read what candidates say/i);
    // RaceHub inside the picker resolves the mock race async (fetch fallback).
    expect(await screen.findByText(/2024 indiana governor/i, undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it('offers practice as an opt-in warm-up', async () => {
    render(<Landing />);
    await userEvent.click(screen.getByRole('button', { name: /try a 30-second warm-up/i }));
    expect(useReadRankStore.getState().phase).toBe('practice');
    expect(useReadRankStore.getState().practiceProgress).not.toBeNull();
  });
});
