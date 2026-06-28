import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankList } from '../RankList';
import type { AgreedQuote } from '../../store/useReadRankStore';

const items: AgreedQuote[] = [
  { id: 'a', text: 'Alpha quote.', candidateToken: 't1', topicKey: 'k', addedAt: 1 },
  { id: 'b', text: 'Bravo quote.', candidateToken: 't2', topicKey: 'k', addedAt: 2 },
  { id: 'c', text: 'Charlie quote.', candidateToken: 't3', topicKey: 'k', addedAt: 3 },
];

describe('RankList rows', () => {
  it('renders no ▲▼ move buttons — reorder is drag-only', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /move up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /move down/i })).not.toBeInTheDocument();
  });

  it('exposes a keyboard-operable drag handle per row', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /reorder, currently ranked/i })).toHaveLength(3);
  });

  it('frames the top three rows by tier with ordinal badges', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.getByText('1st')).toBeInTheDocument();
    expect(screen.getByText('2nd')).toBeInTheDocument();
    expect(screen.getByText('3rd')).toBeInTheDocument();
    expect(screen.getByText('Alpha quote.').closest('.tier-row')).toHaveClass('tier-row-diamond');
    expect(screen.getByText('Bravo quote.').closest('.tier-row')).toHaveClass('tier-row-gold');
    expect(screen.getByText('Charlie quote.').closest('.tier-row')).toHaveClass('tier-row-silver');
  });

  it('frames rows past third as Bronze without an ordinal', () => {
    const four = [...items, { id: 'd', text: 'Delta quote.', candidateToken: 't4', topicKey: 'k', addedAt: 4 }];
    render(<RankList items={four} onReorder={vi.fn()} />);
    expect(screen.getByText('Delta quote.').closest('.tier-row')).toHaveClass('tier-row-bronze');
    expect(screen.queryByText('4th')).not.toBeInTheDocument();
  });

  it('renders ghost slots for unfilled podium positions', () => {
    render(<RankList items={items.slice(0, 1)} onReorder={vi.fn()} showGhostSlots />);
    expect(screen.getByText('Alpha quote.').closest('.tier-row')).toHaveClass('tier-row-diamond');
    const ghosts = document.querySelectorAll('.tier-ghost');
    expect(ghosts).toHaveLength(2);
    expect(ghosts[0]).toHaveClass('tier-ghost-gold');
    expect(ghosts[1]).toHaveClass('tier-ghost-silver');
  });

  it('renders three ghost slots instead of the empty state when showGhostSlots', () => {
    render(<RankList items={[]} onReorder={vi.fn()} showGhostSlots />);
    expect(document.querySelectorAll('.tier-ghost')).toHaveLength(3);
    expect(screen.queryByText(/agree with quotes/i)).not.toBeInTheDocument();
  });

  it('renders full quote text without line-clamp', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    const textEl = screen.getByText('Alpha quote.');
    expect(textEl.style.overflow).not.toBe('hidden');
  });

  it('does not mark any row as dragging at rest', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    const rows = document.querySelectorAll('.tier-row');
    expect(rows.length).toBe(3);
    rows.forEach((r) => expect(r).not.toHaveClass('rank-row-dragging'));
  });
});
