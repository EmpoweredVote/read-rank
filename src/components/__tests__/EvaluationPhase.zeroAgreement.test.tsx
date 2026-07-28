import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvaluationPhase } from '../EvaluationPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

// Two topics, so "finished this topic" and "finished the race" are distinguishable.
const payload: RacePayload = {
  raceId: 'race-zero',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'h1', text: 'Housing quote one.', candidateToken: 'a', topicKey: 'housing' },
        { id: 'h2', text: 'Housing quote two.', candidateToken: 'b', topicKey: 'housing' },
      ],
    },
    {
      topicKey: 'taxes',
      title: 'Taxes',
      question: 'How should we tax?',
      quotes: [
        { id: 't1', text: 'Taxes quote one.', candidateToken: 'a', topicKey: 'taxes' },
        { id: 't2', text: 'Taxes quote two.', candidateToken: 'b', topicKey: 'taxes' },
      ],
    },
  ],
};

const s = () => useReadRankStore.getState();
const revealButton = () =>
  screen.queryByRole('button', { name: /reveal ballot|see your full ballot|see results/i });

function seed() {
  window.localStorage?.clear();
  s().reset();
  s().selectRace(payload);
  s().confirmIssueSelection();
  s().completeCoachMarks();
}

function disagreeWholeRace() {
  for (const t of payload.topics) {
    s().setCurrentTopic(t.topicKey);
    for (const q of t.quotes) s().disagree(q);
  }
}

// useDeviceType keys on matchMedia('(pointer: fine)'); jsdom otherwise resolves
// to 'touch'. Mirrors the pattern in EvaluationPhase.test.tsx.
function forcePointer(fine: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: fine ? query.includes('pointer: fine') : query.includes('pointer: coarse'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('reveal reachability with zero agreements (desktop)', () => {
  beforeEach(() => {
    forcePointer(true);
    seed();
  });

  it('offers a reveal once every topic is triaged, even with nothing agreed', () => {
    disagreeWholeRace();
    render(<EvaluationPhase />);

    expect(s().getCurrentRaceProgress()!.topics.housing.agreed).toEqual([]);
    expect(s().getCurrentRaceProgress()!.topics.taxes.agreed).toEqual([]);
    expect(revealButton()).toBeInTheDocument();
  });

  it('reaches the results phase from that reveal', () => {
    disagreeWholeRace();
    render(<EvaluationPhase />);

    revealButton()!.click();
    expect(s().phase).toBe('results');
  });

  it('still withholds the reveal mid-race when nothing has been agreed yet', () => {
    // Only the first topic is done; the second is untouched.
    s().setCurrentTopic('housing');
    for (const q of payload.topics[0].quotes) s().disagree(q);
    render(<EvaluationPhase />);

    expect(revealButton()).not.toBeInTheDocument();
  });

  it('still offers the reveal mid-race as soon as something is agreed', () => {
    s().setCurrentTopic('housing');
    s().agree(payload.topics[0].quotes[0]);
    render(<EvaluationPhase />);

    expect(revealButton()).toBeInTheDocument();
  });
});

describe('reveal reachability with zero agreements (touch)', () => {
  beforeEach(() => {
    forcePointer(false);
    seed();
  });

  // On touch the reveal lives in the RankSheet footer, and the sheet auto-opens
  // once everything is triaged — so finishing the race with nothing agreed must
  // still surface a way out.
  it('surfaces the reveal in the auto-opened sheet with nothing agreed', async () => {
    disagreeWholeRace();
    render(<EvaluationPhase />);

    expect(await screen.findByRole('button', { name: /reveal ballot|see your full ballot|see results/i }, { timeout: 3000 })).toBeInTheDocument();
  });
});
