import { StrictMode } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EvaluationPhase } from '../EvaluationPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-eval',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'q1', text: 'Eval quote one.', candidateToken: 'a', topicKey: 'housing' },
        { id: 'q2', text: 'Eval quote two.', candidateToken: 'b', topicKey: 'housing' },
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
  useReadRankStore.getState().completeCoachMarks();
});

describe('EvaluationPhase keyboard shortcuts', () => {
  it('judges the current quote with arrow keys', async () => {
    render(<EvaluationPhase />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    // Wait for the store to register the agree (animation runs in jsdom but
    // framer-motion skips physics; the store update is the reliable signal).
    await screen.findByText('Eval quote two.', undefined, { timeout: 3000 });
    expect(useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.agreed.map((q) => q.id)).toEqual(['q1']);
  });

  it('ignores arrow keys while a modal dialog is open', async () => {
    render(<EvaluationPhase />);
    await userEvent.click(screen.getByRole('button', { name: /how we source quotes/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    // Give any (wrong) animation time to land before asserting nothing changed.
    // The swipe animation duration is 400ms; wait longer to catch the bug.
    await new Promise((r) => setTimeout(r, 600));
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.agreed).toEqual([]);
    expect(race.topics.housing.currentIndex).toBe(0);
  });

  it('still commits the agree when reduced motion is preferred (no flying card)', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      render(<EvaluationPhase />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await screen.findByText('Eval quote two.', undefined, { timeout: 3000 });
      expect(screen.queryByTestId('flying-card')).toBeNull();
      expect(useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.agreed.map((q) => q.id)).toEqual(['q1']);
    } finally {
      window.matchMedia = original;
    }
  });

  // Rendered under StrictMode so the effect double-invoke (mount→cleanup→mount)
  // is exercised: if the isMounted guard isn't re-armed on remount, the flight
  // commit is silently blocked and this test fails.
  it('renders a flying card during the agree flight and commits under StrictMode', async () => {
    render(
      <StrictMode>
        <EvaluationPhase />
      </StrictMode>,
    );
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await screen.findByTestId('flying-card', undefined, { timeout: 1000 });
    await screen.findByText('Eval quote two.', undefined, { timeout: 3000 });
    expect(useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.agreed.map((q) => q.id)).toEqual(['q1']);
  });
});
