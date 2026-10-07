import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EvaluationPhase } from '../EvaluationPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-done', positionName: 'Governor',
  topics: [
    { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [
      { id: 'a1', text: 'one', candidateToken: 'tA', topicKey: 'k1' },
      { id: 'a2', text: 'two', candidateToken: 'tB', topicKey: 'k1' },
    ] },
    { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [
      { id: 'b1', text: 'three', candidateToken: 'tA', topicKey: 'k2' },
      { id: 'b2', text: 'four', candidateToken: 'tB', topicKey: 'k2' },
    ] },
  ],
};
const s = () => useReadRankStore.getState();
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  window.localStorage?.clear();
  s().reset(); s().selectRace(payload); s().confirmIssueSelection(); s().completeCoachMarks();
  window.matchMedia = ((q: string) => ({
    matches: q.includes('pointer: fine'), media: q, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { window.matchMedia = originalMatchMedia; });

function finishTopic(topicKey: 'k1' | 'k2') {
  const [x, y] = s().getCurrentRaceProgress()!.topics[topicKey].quotesToEvaluate;
  s().agree(x); s().disagree(y);
}

describe('topic-complete card', () => {
  it('shows heading (focused), this topic\'s counts, Next topic and the reveal button once', async () => {
    finishTopic('k1');
    render(<EvaluationPhase />);
    const h = await screen.findByRole('heading', { level: 2, name: 'Topic complete' });
    await waitFor(() => expect(h).toHaveFocus());
    expect(screen.getByText('1 AGREED')).toBeInTheDocument();
    expect(screen.getByText('1 DISAGREED')).toBeInTheDocument();
    expect(screen.getByText('Move on to the next topic, or keep arranging your ranking.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next topic →' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /reveal ballot|see your full ballot/i })).toHaveLength(1);
  });

  it('last topic: "All topics done" with the reveal as the main button', async () => {
    finishTopic('k1'); s().nextTopic(); finishTopic('k2');
    render(<EvaluationPhase />);
    expect(await screen.findByRole('heading', { level: 2, name: 'All topics done' })).toBeInTheDocument();
    expect(screen.getByText("Reveal your ballot when you're ready.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next topic →' })).not.toBeInTheDocument();
    const reveal = screen.getAllByRole('button', { name: /see your full ballot/i });
    expect(reveal).toHaveLength(1);
    expect(reveal[0]).toHaveClass('ev-button-primary');
  });
});
