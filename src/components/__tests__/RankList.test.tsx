import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankList } from '../RankList';
import type { AgreedQuote } from '../../store/useReadRankStore';

const items: AgreedQuote[] = [
  { id: 'a', text: 'Alpha quote.', candidateToken: 't1', topicKey: 'k', addedAt: 1 },
  { id: 'b', text: 'Bravo quote.', candidateToken: 't2', topicKey: 'k', addedAt: 2 },
  { id: 'c', text: 'Charlie quote.', candidateToken: 't3', topicKey: 'k', addedAt: 3 },
];

describe('RankList rows', () => {
  it('renders no ▲▼ move buttons — reorder is drag or tap-to-assign', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /move up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /move down/i })).not.toBeInTheDocument();
  });

  it('exposes a keyboard-operable drag handle per row', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /reorder, currently ranked/i })).toHaveLength(3);
  });

  it('leads each slip with a plain position number', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Alpha quote.').closest('.rank-slip')).toHaveClass('rank-slip-top');
    expect(screen.getByText('Charlie quote.').closest('.rank-slip')).toHaveClass('rank-slip-top');
  });

  it('demotes rows past third under "Also agreed" but still numbers them', () => {
    const four = [...items, { id: 'd', text: 'Delta quote.', candidateToken: 't4', topicKey: 'k', addedAt: 4 }];
    render(<RankList items={four} onReorder={vi.fn()} />);
    expect(screen.getByText('Delta quote.').closest('.rank-slip')).toHaveClass('rank-slip-sub');
    expect(screen.getByText('Also agreed')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('tapping a number opens the place menu and assigns a position', async () => {
    const onAssign = vi.fn();
    render(<RankList items={items} onReorder={vi.fn()} onAssign={onAssign} />);
    await userEvent.click(screen.getByRole('button', { name: /ranked 1\. change position/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: '2nd' }));
    expect(onAssign).toHaveBeenCalledWith('a', 2);
  });

  it('collapses to compact draggable rows in reorder mode', () => {
    render(<RankList items={items} onReorder={vi.fn()} reorderMode />);
    expect(document.querySelectorAll('.rank-mini')).toHaveLength(3);
    // No tap-to-assign number buttons while reordering.
    expect(screen.queryByRole('button', { name: /change position/i })).not.toBeInTheDocument();
  });

  it('renders full quote text without line-clamp in view mode', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    const textEl = screen.getByText('Alpha quote.');
    expect(textEl.style.overflow).not.toBe('hidden');
  });

  it('does not mark any row as dragging at rest', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    const rows = document.querySelectorAll('.rank-slip');
    expect(rows.length).toBe(3);
    rows.forEach((r) => expect(r.parentElement).not.toHaveClass('rank-row-dragging'));
  });
});
