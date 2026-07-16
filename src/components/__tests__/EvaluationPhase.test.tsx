import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('EvaluationPhase screen-reader announcements', () => {
  it('announces the verdict to screen readers on agree', async () => {
    render(<EvaluationPhase />);
    const user = userEvent.setup();
    // Use getAllByRole to handle cases where ActionButtons renders more than once
    // (e.g. fixed mobile + any duplicate mount). Click the first agree button.
    // Anchor the regex to avoid matching "Disagree with this quote".
    await user.click(screen.getAllByRole('button', { name: /^agree with this quote$/i })[0]);
    // Wait until at least one status node contains the expected text.
    // (FirstAgreeCoach also uses role="status"; we poll all of them.)
    await screen.findByText(/added to your ranking/i, undefined, { timeout: 3000 });
  });

  it('announces the verdict to screen readers on disagree', async () => {
    render(<EvaluationPhase />);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: /disagree with this quote/i })[0]);
    await screen.findByText(/moved to disagreed/i, undefined, { timeout: 3000 });
  });
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

describe('EvaluationPhase reveal CTA', () => {
  const two: RacePayload = {
    raceId: 'race-eval-cta', positionName: 'Governor',
    topics: [
      { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [
        { id: 'a1', text: 'x', candidateToken: 'tokA', topicKey: 'k1' },
        { id: 'a2', text: 'y', candidateToken: 'tokB', topicKey: 'k1' },
      ] },
      { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [
        { id: 'b1', text: 'x', candidateToken: 'tokA', topicKey: 'k2' },
        { id: 'b2', text: 'y', candidateToken: 'tokB', topicKey: 'k2' },
      ] },
    ],
  };
  const s = () => useReadRankStore.getState();

  // Force the desktop split layout so the inline reveal button renders
  // deterministically. useDeviceType keys on matchMedia('(pointer: fine)');
  // jsdom otherwise resolves it to 'touch'. Mirrors the reduced-motion mock above.
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('pointer: fine'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function seed() {
    s().reset();
    s().selectRace(two);
    s().completeCoachMarks();
    s().confirmIssueSelection();
  }

  it('labels the reveal "Reveal ballot" while rankable topics remain', () => {
    seed();
    s().agree(two.topics[0].quotes[0]);
    s().disagree(two.topics[0].quotes[1]); // k1 done
    s().nextTopic();                        // now on k2 (not done)
    render(<EvaluationPhase />);
    expect(screen.getByRole('button', { name: /^reveal ballot$/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /see your full ballot/i })).toBeNull();
  });

  it('labels the reveal "See your full ballot" when the race is complete', () => {
    seed();
    s().agree(two.topics[0].quotes[0]);
    s().disagree(two.topics[0].quotes[1]); // k1 done
    s().nextTopic();
    s().disagree(two.topics[1].quotes[0]);
    s().disagree(two.topics[1].quotes[1]); // k2 done -> race complete
    render(<EvaluationPhase />);
    expect(screen.getByRole('button', { name: /see your full ballot/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^reveal ballot$/i })).toBeNull();
  });

  it('shows the reveal in the mobile sheet when agreed anywhere in the race, even if the current topic has none', async () => {
    // Mobile/touch path: jsdom defaults useDeviceType to 'touch'. Undo the
    // describe-level pointer:fine mock so EvaluationSurface renders the dock+sheet.
    window.matchMedia = originalMatchMedia;
    seed();
    s().agree(two.topics[0].quotes[0]);
    s().disagree(two.topics[0].quotes[1]); // k1 done, 1 agreed race-wide
    s().nextTopic();                        // now on k2 with ZERO agreed there
    render(<EvaluationPhase />);
    // Open the mobile rank sheet via the dock.
    await userEvent.click(screen.getByRole('button', { name: /open your ranking/i }));
    // Under the old per-topic gate this footer would be hidden (k2 pile empty);
    // the race-wide canReveal wiring must surface it. k1 done + k2 not done ->
    // race not complete -> "Reveal ballot".
    expect(await screen.findByRole('button', { name: /reveal ballot/i })).toBeTruthy();
  });
});
