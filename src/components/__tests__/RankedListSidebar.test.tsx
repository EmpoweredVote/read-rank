import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankedListSidebar } from '../AgreedQuotesSidebar';
import { RaceRankSourceProvider } from '../RankSource';
import { EvaluationPhase } from '../EvaluationPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-sidebar', positionName: 'Governor',
  topics: [{ topicKey: 'housing', title: 'Housing', question: 'How to fix housing?', quotes: [
    { id: 'q1', text: 'Sidebar quote one.', candidateToken: 'a', topicKey: 'housing' },
    { id: 'q2', text: 'Sidebar quote two.', candidateToken: 'b', topicKey: 'housing' },
  ] }],
};
const NOTE = 'Names and parties stay hidden until you see your full ballot.';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
  useReadRankStore.getState().completeCoachMarks();
});

const originalMatchMedia = window.matchMedia;
afterEach(() => { window.matchMedia = originalMatchMedia; });

describe('RankedListSidebar', () => {
  it('titles the panel with an h2 "Your ranking"', () => {
    render(<RaceRankSourceProvider><RankedListSidebar /></RaceRankSourceProvider>);
    expect(screen.getByRole('heading', { level: 2, name: 'Your ranking' })).toBeInTheDocument();
  });

  it('renders the privacy note once, outside the scroll area', () => {
    render(<RaceRankSourceProvider><RankedListSidebar /></RaceRankSourceProvider>);
    const note = screen.getByText(NOTE);
    expect(note.closest('[style*="overflow"]')).toBeNull();
  });

  it('hides the privacy note when showPrivacyNote is false', () => {
    render(<RaceRankSourceProvider><RankedListSidebar showPrivacyNote={false} /></RaceRankSourceProvider>);
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('race path (EvaluationPhase) shows the privacy note', async () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes('pointer: fine'), media: q, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    render(<EvaluationPhase />);
    expect(await screen.findByText(NOTE)).toBeInTheDocument();
  });
});
