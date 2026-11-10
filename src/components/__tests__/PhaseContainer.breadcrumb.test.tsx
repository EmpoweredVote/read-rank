import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

function seed(phase: 'issue-selection' | 'evaluation') {
  useReadRankStore.setState((s) => ({
    currentRaceId: 'r1',
    phase,
    raceProgress: {
      ...s.raceProgress,
      r1: {
        raceId: 'r1', positionName: 'Governor', office: 'Governor', seat: null, state: 'CA',
        topics: {}, topicOrder: [], currentTopicKey: null, phase: 'evaluation', completed: false,
      },
    },
  }));
}

describe('PhaseContainer breadcrumb', () => {
  it('does not show the race breadcrumb on issue-selection (the view has its own back link)', () => {
    seed('issue-selection');
    render(<PhaseContainer />);
    expect(screen.getByText('issue-selection-view')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).not.toBeInTheDocument();
  });

  it('shows the race breadcrumb on evaluation', () => {
    seed('evaluation');
    render(<PhaseContainer />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByText(/Governor · California/)).toBeInTheDocument();
  });
});
