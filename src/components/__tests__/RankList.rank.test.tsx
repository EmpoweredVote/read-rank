import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankList } from '../RankList';
import type { AgreedQuote } from '../../store/useReadRankStore';

// RankList takes its data purely via props (items: AgreedQuote[], plus the
// optional rankedCount for truncation) — it never reads the store directly.
// The store's `tieWithPrev` flag lives on each AgreedQuote, so it's just
// carried straight through on the fixture below.
const items: AgreedQuote[] = [
  { id: 'a', text: 'Alpha quote.', candidateToken: 't1', topicKey: 'k', addedAt: 1 },
  { id: 'b', text: 'Bravo quote.', candidateToken: 't2', topicKey: 'k', addedAt: 2, tieWithPrev: true },
  { id: 'c', text: 'Charlie quote.', candidateToken: 't3', topicKey: 'k', addedAt: 3 },
];

describe('RankList renders derived (tie-aware) rank numbers', () => {
  it('gives a and b (tied) the same rank "1" instead of positional 1/2', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);

    // Positional numbering would render 1, 2, 3. Competition ranking with a
    // 2-way tie at the top instead renders 1, 1, 3 — proving the number comes
    // from deriveRanks, not from `index + 1`.
    const ones = screen.getAllByText('1');
    expect(ones).toHaveLength(2);

    const aBadge = screen.getByText('Alpha quote.').closest('.rank-slip')?.querySelector('.rank-num-badge');
    const bBadge = screen.getByText('Bravo quote.').closest('.rank-slip')?.querySelector('.rank-num-badge');
    const cBadge = screen.getByText('Charlie quote.').closest('.rank-slip')?.querySelector('.rank-num-badge');
    expect(aBadge?.textContent).toBe('1');
    expect(bBadge?.textContent).toBe('1');
    expect(cBadge?.textContent).toBe('3');
  });

  it('renders the same tie-aware numbers in reorder mode\'s compact rows', () => {
    render(<RankList items={items} onReorder={vi.fn()} reorderMode />);
    const nums = Array.from(document.querySelectorAll('.rank-mini-num')).map((el) => el.textContent);
    expect(nums).toEqual(['1', '1', '3']);
  });

  it('renders a blank, muted number for rows beyond rankedCount (truncation)', () => {
    render(<RankList items={items} onReorder={vi.fn()} rankedCount={2} />);
    // a=1, b=1 (tied, both ranked); c is beyond rankedCount=2 -> unranked (null).
    expect(screen.getAllByText('1')).toHaveLength(2);
    const cBadge = screen.getByText('Charlie quote.').closest('.rank-slip')?.querySelector('.rank-num-badge');
    expect(cBadge?.textContent).toBe('');
    expect((cBadge as HTMLElement)?.style.opacity).toBe('0.45');
  });
});

describe('RankList tie-with-above control', () => {
  it('calls onToggleTie with the row id when its tie button is clicked, and the first row has no tie button', async () => {
    const user = userEvent.setup();
    const onToggleTie = vi.fn();
    const twoItems: AgreedQuote[] = [
      { id: 'a', text: 'Alpha quote.', candidateToken: 't1', topicKey: 'k', addedAt: 1 },
      { id: 'b', text: 'Bravo quote.', candidateToken: 't2', topicKey: 'k', addedAt: 2 },
    ];
    render(<RankList items={twoItems} onReorder={vi.fn()} onToggleTie={onToggleTie} />);

    // First row (a) has no "above" to tie with, so no tie button on it.
    const aSlip = screen.getByText('Alpha quote.').closest('.rank-slip');
    expect(aSlip?.querySelector('.rank-tie-btn')).toBeNull();

    const bSlip = screen.getByText('Bravo quote.').closest('.rank-slip');
    const bTieBtn = bSlip?.querySelector('.rank-tie-btn');
    expect(bTieBtn).not.toBeNull();

    await user.click(bTieBtn as HTMLElement);
    expect(onToggleTie).toHaveBeenCalledWith('b');
  });

  it('renders the tie bracket accent on a row with tieWithPrev set', () => {
    render(<RankList items={items} onReorder={vi.fn()} onToggleTie={vi.fn()} />);
    const bSlip = screen.getByText('Bravo quote.').closest('.rank-slip');
    expect(bSlip?.className).toMatch(/rank-slip-tied/);
    const aSlip = screen.getByText('Alpha quote.').closest('.rank-slip');
    expect(aSlip?.className).not.toMatch(/rank-slip-tied/);
  });
});

describe('RankList truncation control (place the rest as agreed)', () => {
  const four: AgreedQuote[] = [
    { id: 'a', text: 'Alpha quote.', candidateToken: 't1', topicKey: 'k', addedAt: 1 },
    { id: 'b', text: 'Bravo quote.', candidateToken: 't2', topicKey: 'k', addedAt: 2 },
    { id: 'c', text: 'Charlie quote.', candidateToken: 't3', topicKey: 'k', addedAt: 3 },
    { id: 'd', text: 'Delta quote.', candidateToken: 't4', topicKey: 'k', addedAt: 4 },
  ];

  it('renders an "Also agreed" divider after rankedCount, with rows past it blank and ranked rows numbered', () => {
    render(<RankList items={four} onReorder={vi.fn()} rankedCount={2} onSetRankedCount={vi.fn()} />);
    expect(screen.getByText('Also agreed')).toBeInTheDocument();

    const aBadge = screen.getByText('Alpha quote.').closest('.rank-slip')?.querySelector('.rank-num-badge');
    const bBadge = screen.getByText('Bravo quote.').closest('.rank-slip')?.querySelector('.rank-num-badge');
    const cBadge = screen.getByText('Charlie quote.').closest('.rank-slip')?.querySelector('.rank-num-badge');
    const dBadge = screen.getByText('Delta quote.').closest('.rank-slip')?.querySelector('.rank-num-badge');
    expect(aBadge?.textContent).toBe('1');
    expect(bBadge?.textContent).toBe('2');
    expect(cBadge?.textContent).toBe('');
    expect(dBadge?.textContent).toBe('');
  });

  it('calls onSetRankedCount(rankedCount + 1) when "Rank more" is clicked', async () => {
    const user = userEvent.setup();
    const onSetRankedCount = vi.fn();
    render(<RankList items={four} onReorder={vi.fn()} rankedCount={2} onSetRankedCount={onSetRankedCount} />);
    await user.click(screen.getByRole('button', { name: 'Rank more' }));
    expect(onSetRankedCount).toHaveBeenCalledWith(3);
  });

  it('calls onSetRankedCount(index + 1) when a ranked row\'s "Place the rest as agreed" is clicked', async () => {
    const user = userEvent.setup();
    const onSetRankedCount = vi.fn();
    render(<RankList items={four} onReorder={vi.fn()} rankedCount={2} onSetRankedCount={onSetRankedCount} />);
    const bSlip = screen.getByText('Bravo quote.').closest('.rank-slip') as HTMLElement;
    const btn = within(bSlip).getByRole('button', { name: 'Place the rest as agreed' });
    await user.click(btn);
    expect(onSetRankedCount).toHaveBeenCalledWith(2); // b is index 1 -> 2
  });

  it('shows no divider when rankedCount equals items.length (default, no truncation)', () => {
    render(<RankList items={four} onReorder={vi.fn()} />);
    expect(screen.queryByText('Also agreed')).not.toBeInTheDocument();
  });
});
