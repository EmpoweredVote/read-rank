import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeRound } from '../PracticeRound';
import { useReadRankStore } from '../../store/useReadRankStore';
import { PRACTICE_QUOTES, PRACTICE_ISSUE } from '../../data/practiceData';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('PracticeRound parity', () => {
  it('shows the question banner and the shared rank surface (Reorder toggle) after two agrees', async () => {
    // Seed two agreed practice quotes so the shared RankRail shows the Reorder
    // toolbar (appears at >= 2 agreed) without driving the swipe animation.
    const s = useReadRankStore.getState();
    s.startPractice(PRACTICE_QUOTES);
    s.agreePractice(PRACTICE_QUOTES[0]);
    s.agreePractice(PRACTICE_QUOTES[1]);

    render(<PracticeRound />);
    // Dismiss the pizza splash.
    await userEvent.click(screen.getByRole('button', { name: /let.?s try it/i }));

    // The shared question banner renders the reframed practice question.
    expect(screen.getByText(PRACTICE_ISSUE.question)).toBeInTheDocument();

    // jsdom reports `'ontouchstart' in window` as true, so useDeviceType
    // resolves to 'touch' here and EvaluationSurface renders the mobile dock
    // + sheet rather than the desktop split with the sidebar RankRail. Open
    // the sheet to reach the shared ranking toolbar (RankRail renders the
    // same "Reorder" toggle in both the sidebar and sheet variants).
    await userEvent.click(screen.getByRole('button', { name: /open your ranking/i }));
    // The shared ranking toolbar (from RankRail) is present.
    expect(screen.getByRole('button', { name: /^reorder$/i })).toBeInTheDocument();
  });

  it('warm-up omits the privacy note in the rank sheet', async () => {
    const s = useReadRankStore.getState();
    s.startPractice(PRACTICE_QUOTES);
    s.agreePractice(PRACTICE_QUOTES[0]);
    render(<PracticeRound />);
    await userEvent.click(screen.getByRole('button', { name: /let.?s try it/i }));
    await userEvent.click(screen.getByRole('button', { name: /open your ranking/i }));
    expect(screen.queryByText(/names and parties stay hidden/i)).not.toBeInTheDocument();
  });
});

describe('PracticeRound desktop completion', () => {
  const originalMatchMedia = window.matchMedia;
  afterEach(() => { window.matchMedia = originalMatchMedia; });

  it('keeps the practice results button once every quote is judged', async () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes('pointer: fine'), media: q, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    const s = useReadRankStore.getState();
    s.startPractice(PRACTICE_QUOTES);
    s.agreePractice(PRACTICE_QUOTES[0]);
    PRACTICE_QUOTES.slice(1).forEach((q) => s.disagreePractice(q));
    render(<PracticeRound />);
    await userEvent.click(screen.getByRole('button', { name: /let.?s try it/i }));
    expect(await screen.findByRole('button', { name: 'See your pizza rankings' })).toBeInTheDocument();
  });
});
