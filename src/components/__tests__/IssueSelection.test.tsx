import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueSelection } from '../IssueSelection';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-issue-ui',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'h1', text: 'Quote A', candidateToken: 'tok-a', topicKey: 'housing' },
        { id: 'h2', text: 'Quote B', candidateToken: 'tok-b', topicKey: 'housing' },
      ],
    },
    {
      topicKey: 'economy',
      title: 'Economy',
      question: 'How to grow the economy?',
      quotes: [
        { id: 'e1', text: 'Quote C', candidateToken: 'tok-a', topicKey: 'economy' },
      ],
    },
    {
      topicKey: 'environment',
      title: 'Environment',
      question: 'How to protect the environment?',
      quotes: [
        { id: 'ev1', text: 'Quote D', candidateToken: 'tok-a', topicKey: 'environment' },
        { id: 'ev2', text: 'Quote E', candidateToken: 'tok-b', topicKey: 'environment' },
        { id: 'ev3', text: 'Quote F', candidateToken: 'tok-c', topicKey: 'environment' },
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
});

describe('IssueSelection', () => {
  it('renders all topic titles', () => {
    render(<IssueSelection />);
    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Economy')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
  });

  it('selects all scorable topics by default', () => {
    render(<IssueSelection />);
    expect(screen.getByRole('button', { name: /housing/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /environment/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks single-candidate topics as Not scored and non-interactive', () => {
    render(<IssueSelection />);
    expect(screen.getByText(/not scored/i)).toBeInTheDocument();
    expect(screen.getByText(/1 quote · one candidate/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /economy/i })).not.toBeInTheDocument();
  });

  it('toggles a topic off when clicked', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /housing/i }));
    expect(screen.getByRole('button', { name: /housing/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows live CTA with total quote count and time estimate', () => {
    render(<IssueSelection />);
    // Housing (2) + Environment (3) = 5 quotes; estimateMinutes = round(50/60) = 1 min
    expect(screen.getByRole('button', { name: /start reading · 5 quotes · about 1 min/i })).toBeInTheDocument();
  });

  it('disables the CTA when no scorable topics are selected', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /housing/i }));
    await userEvent.click(screen.getByRole('button', { name: /environment/i }));
    const cta = screen.getByRole('button', { name: /select at least one/i });
    expect(cta).toBeDisabled();
  });

  it('advances to evaluation on CTA click', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /start reading/i }));
    expect(useReadRankStore.getState().phase).toBe('evaluation');
  });

  it('shows per-issue reading time and Not started pills', () => {
    render(<IssueSelection />);
    expect(screen.getByText('2 quotes · about 20 sec')).toBeInTheDocument();
    expect(screen.getByText('3 quotes · about 30 sec')).toBeInTheDocument();
    expect(screen.getAllByText(/not started/i)).toHaveLength(2);
  });

  it('shows the heading, lede, blindness note and panel header; no progress on first visit', () => {
    render(<IssueSelection />);
    expect(screen.getByRole('heading', { level: 1, name: 'Choose your issues' })).toBeInTheDocument();
    expect(screen.getByText(/pick the topics you care about/i)).toBeInTheDocument();
    expect(screen.getByText(/quotes are shown without names or parties/i)).toBeInTheDocument();
    expect(screen.getByText(/issues in this race/i)).toBeInTheDocument();
    expect(screen.getByText('2 available')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /see your ballot so far/i })).not.toBeInTheDocument();
  });

  it('"All races" returns to the hub', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /all races/i }));
    expect(useReadRankStore.getState().currentRaceId).toBeNull();
  });

  it('shows the race chip with the office', () => {
    render(<IssueSelection />);
    expect(screen.getByText('Governor')).toBeInTheDocument();
  });

  // Regression: clicking "All races" sets currentRaceId to null while the
  // outgoing IssueSelection is still mounted (AnimatePresence mode="wait").
  // The re-render must not call fewer hooks than the mount render — otherwise
  // React throws #300 ("Rendered fewer hooks than expected") and the tree dies.
  it('does not crash when the current race is cleared while still mounted', () => {
    const { rerender } = render(<IssueSelection />);
    expect(screen.getByText('Housing')).toBeInTheDocument();
    // Simulate goToHub() clearing the race during the exit transition.
    useReadRankStore.setState({ currentRaceId: null });
    expect(() => rerender(<IssueSelection />)).not.toThrow();
  });
});

describe('IssueSelection re-entry hub', () => {
  const p: RacePayload = {
    raceId: 'race-hub-ui', positionName: 'Governor',
    topics: [
      { topicKey: 'k1', title: 'Fossil Fuels', question: 'Q1', quotes: [
        { id: 'a1', text: 'x', candidateToken: 'tokA', topicKey: 'k1' },
        { id: 'a2', text: 'y', candidateToken: 'tokB', topicKey: 'k1' },
      ] },
      { topicKey: 'k2', title: 'Housing', question: 'Q2', quotes: [
        { id: 'b1', text: 'x', candidateToken: 'tokA', topicKey: 'k2' },
        { id: 'b2', text: 'y', candidateToken: 'tokB', topicKey: 'k2' },
      ] },
    ],
  };
  const s = () => useReadRankStore.getState();

  function seedReentry() {
    s().reset();
    s().selectRace(p);
    s().confirmIssueSelection();
    for (const quote of s().getCurrentRaceProgress()!.topics.k1.quotesToEvaluate) s().disagree(quote);
    s().revealBallot();
    s().goToHub();
    s().selectRace(p, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 2 });
  }

  it('marks an already-ranked topic as done (locked, not a toggle)', () => {
    seedReentry();
    render(<IssueSelection />);
    expect(screen.getByTestId('issue-done-k1')).toBeInTheDocument();
    // The done topic is not an aria-pressed toggle button.
    expect(screen.queryByRole('button', { name: /fossil fuels/i })).toBeNull();
  });

  it('offers "See your ballot" when no remaining topic is selected', async () => {
    seedReentry();
    s().setSelectedTopics([]);  // deselect the remaining (undone) topic
    render(<IssueSelection />);
    expect(screen.getByRole('button', { name: /see your ballot/i })).toBeInTheDocument();
  });

  it('shows progress, Welcome back and a Ranked pill on re-entry', () => {
    seedReentry();
    render(<IssueSelection />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '2');
    expect(screen.getByText(/issues ranked/i)).toHaveTextContent('1 of 2 issues ranked');
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('2 quotes · already ranked')).toBeInTheDocument();
    expect(screen.getByText(/^ranked$/i)).toBeInTheDocument();
  });

  it('offers "See your ballot so far" next to Start on re-entry and opens the ballot', async () => {
    seedReentry();
    render(<IssueSelection />);
    expect(screen.getByRole('button', { name: /start reading · 2 quotes/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /see your ballot so far/i }));
    expect(useReadRankStore.getState().phase).toBe('results');
  });

  it('does not show "See your ballot so far" when the main button is already See your ballot', () => {
    seedReentry();
    s().setSelectedTopics([]);
    render(<IssueSelection />);
    expect(screen.getByRole('button', { name: /^see your ballot$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /see your ballot so far/i })).not.toBeInTheDocument();
  });
});
