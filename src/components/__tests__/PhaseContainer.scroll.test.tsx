import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { PhaseContainer } from '../PhaseContainer';
import { useReadRankStore } from '../../store/useReadRankStore';

vi.mock('../Landing', () => ({ Landing: () => <div>landing</div> }));
vi.mock('../RaceHub', () => ({ RaceHub: () => <div>hub</div> }));
vi.mock('../EvaluationPhase', () => ({ EvaluationPhase: () => <div>evaluation-view</div> }));
vi.mock('../ResultsPhase', () => ({ ResultsPhase: () => <div>results-view</div> }));
vi.mock('../PracticeRound', () => ({ PracticeRound: () => <div>practice</div> }));
vi.mock('../IssueSelection', () => ({ IssueSelection: () => <div>issue-selection-view</div> }));
vi.mock('../../hooks/useAuthState', () => ({ useAuthState: () => ({ isLoggedIn: false, userId: null }) }));
vi.mock('@empoweredvote/ev-ui', () => ({
  useEvContextPromotion: () => ({
    shouldPrompt: false, payload: null, promote: vi.fn(), dismiss: vi.fn(), status: 'idle', error: null,
  }),
}));

const scrollTo = vi.fn();

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  scrollTo.mockClear();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  useReadRankStore.setState((s) => ({
    currentRaceId: 'r1',
    phase: 'issue-selection',
    raceProgress: {
      ...s.raceProgress,
      r1: {
        raceId: 'r1', positionName: 'Governor', office: 'Governor', seat: null, state: 'CA',
        topics: {}, topicOrder: [], currentTopicKey: null, phase: 'evaluation', completed: false,
      },
    },
  }));
});

afterEach(() => vi.restoreAllMocks());

describe('PhaseContainer scroll reset', () => {
  it('does not scroll on initial mount', async () => {
    render(<PhaseContainer />);
    expect(screen.getByText('issue-selection-view')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to the top (instantly) when the phase changes', async () => {
    render(<PhaseContainer />);
    act(() => { useReadRankStore.getState().setPhase('evaluation'); });
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' }));
    await screen.findByText('evaluation-view');
  });
});
