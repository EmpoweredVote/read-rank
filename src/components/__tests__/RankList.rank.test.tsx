import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
