import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EvaluationPhase } from '../EvaluationPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-layout', positionName: 'Governor',
  topics: [{ topicKey: 'housing', title: 'Housing', question: 'How to fix housing?', quotes: [
    { id: 'q1', text: 'Layout quote one.', candidateToken: 'tok-zz1', topicKey: 'housing' },
    { id: 'q2', text: 'Layout quote two.', candidateToken: 'tok-zz2', topicKey: 'housing' },
  ] }],
};

const originalMatchMedia = window.matchMedia;
function forcePointer(fine: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: fine ? query.includes('pointer: fine') : query.includes('pointer: coarse'),
    media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
  useReadRankStore.getState().completeCoachMarks();
});
afterEach(() => { window.matchMedia = originalMatchMedia; });

describe('evaluation layout', () => {
  it('shows "Quote 1 of 2" with a progressbar', async () => {
    render(<EvaluationPhase />);
    expect(await screen.findByText('Quote 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Quotes in this issue' })).toHaveAttribute('aria-valuetext', 'Quote 1 of 2');
  });

  it('shows the blind line on the card and no candidate data', async () => {
    render(<EvaluationPhase />);
    const line = await screen.findByText('Speaker and source are shown when you see your ballot');
    const card = line.closest('.ev-quote-card') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.textContent).not.toContain('tok-zz'); // tokens never rendered
  });

  it('desktop: verdict buttons sit inside the card and the shortcut hint shows', async () => {
    forcePointer(true);
    render(<EvaluationPhase />);
    const agree = await screen.findByRole('button', { name: 'Agree with this quote' });
    expect(agree.closest('.ev-quote-card')).not.toBeNull();
    expect(screen.getByText('Shortcut:')).toBeInTheDocument();
  });

  it('touch: buttons stay outside the card and there is no shortcut hint', async () => {
    forcePointer(false);
    render(<EvaluationPhase />);
    const agree = await screen.findByRole('button', { name: 'Agree with this quote' });
    expect(agree.closest('.ev-quote-card')).toBeNull();
    expect(screen.queryByText('Shortcut:')).not.toBeInTheDocument();
  });

  it('desktop: keyboard focus returns to the matching verdict button after a verdict', async () => {
    forcePointer(true);
    render(<EvaluationPhase />);
    const disagree = await screen.findByRole('button', { name: 'Disagree with this quote' });
    disagree.focus();
    fireEvent.click(disagree);
    await screen.findByText('Layout quote two.');
    await waitFor(() => {
      const el = document.activeElement as HTMLElement;
      expect(el.tagName).toBe('BUTTON');
      expect(el).toHaveAccessibleName('Disagree with this quote');
    });
  });

  it('desktop: judging the last quote with a button does not steal focus on the next topic', async () => {
    forcePointer(true);
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace({
      raceId: 'race-two', positionName: 'Governor',
      topics: [
        { topicKey: 'housing', title: 'Housing', question: 'How to fix housing?', quotes: [
          { id: 'h1', text: 'Housing one.', candidateToken: 'tok-h1', topicKey: 'housing' },
          { id: 'h2', text: 'Housing two.', candidateToken: 'tok-h2', topicKey: 'housing' },
        ] },
        { topicKey: 'transit', title: 'Transit', question: 'How to fix transit?', quotes: [
          { id: 't1', text: 'Transit one.', candidateToken: 'tok-t1', topicKey: 'transit' },
          { id: 't2', text: 'Transit two.', candidateToken: 'tok-t2', topicKey: 'transit' },
        ] },
      ],
    });
    useReadRankStore.getState().completeCoachMarks();
    render(<EvaluationPhase />);
    for (const text of ['Housing one.', 'Housing two.']) {
      await screen.findByText(text);
      const btn = await screen.findByRole('button', { name: 'Disagree with this quote' });
      btn.focus();
      fireEvent.click(btn);
      if (text === 'Housing one.') {
        await screen.findByText('Housing two.');
        // refocus fires once the verdict animation ends
        await waitFor(() => expect(document.activeElement).toHaveAccessibleName('Disagree with this quote'));
      }
    }
    fireEvent.click(await screen.findByRole('button', { name: /Next topic/ }));
    await screen.findByText('Transit one.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Agree with this quote' })).toBeInTheDocument());
    // let the last verdict's animation finish (that is when refocus would fire)
    await new Promise((r) => setTimeout(r, 600));
    const el = document.activeElement as HTMLElement;
    expect(el.className).not.toMatch(/action-button/);
  });
});
