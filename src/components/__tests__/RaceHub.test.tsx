import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('renders the race as a stakes card with election date and meta chips', async () => {
    render(<RaceHub />);
    // jsdom fetch fails → mock fallback supplies the Indiana demo race.
    expect(await screen.findByText('Governor', undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/2024 indiana governor/i)).toBeInTheDocument();
    expect(screen.getByText(/nov 5, 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/4 candidates/i)).toBeInTheDocument();
    expect(screen.getByText(/3 topics/i)).toBeInTheDocument();
    expect(screen.queryByText(/ranked choice election/i)).not.toBeInTheDocument();
  });
});
