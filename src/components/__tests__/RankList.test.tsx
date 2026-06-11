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

describe('RankList move buttons', () => {
  it('renders no move buttons by default', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /move up/i })).not.toBeInTheDocument();
  });

  it('moves a row down and reports the new order', async () => {
    const onReorder = vi.fn();
    render(<RankList items={items} onReorder={onReorder} showMoveButtons />);
    await userEvent.click(screen.getByRole('button', { name: /move down.*ranked 1/i }));
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('moves a row up and reports the new order', async () => {
    const onReorder = vi.fn();
    render(<RankList items={items} onReorder={onReorder} showMoveButtons />);
    await userEvent.click(screen.getByRole('button', { name: /move up.*ranked 3/i }));
    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('disables the boundary buttons via aria-disabled and does not call onReorder when clicked', async () => {
    const onReorder = vi.fn();
    render(<RankList items={items} onReorder={onReorder} showMoveButtons />);
    const moveUpFirst = screen.getByRole('button', { name: /move up.*ranked 1/i });
    const moveDownLast = screen.getByRole('button', { name: /move down.*ranked 3/i });
    expect(moveUpFirst).toHaveAttribute('aria-disabled', 'true');
    expect(moveDownLast).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(moveUpFirst);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('announces moves with the tier', async () => {
    render(<RankList items={items} onReorder={vi.fn()} showMoveButtons />);
    await userEvent.click(screen.getByRole('button', { name: /move down, currently ranked 1/i }));
    const region = screen.getAllByRole('status').find((el) => /moved/i.test(el.textContent ?? ''));
    expect(region).toHaveTextContent(/moved .*to 2nd choice, gold/i);
  });

  it('frames the top three rows by tier with icon labels', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.getByText('1st choice')).toBeInTheDocument();
    expect(screen.getByText('2nd choice')).toBeInTheDocument();
    expect(screen.getByText('3rd choice')).toBeInTheDocument();
    expect(screen.getByText('Alpha quote.').closest('.tier-row')).toHaveClass('tier-row-diamond');
    expect(screen.getByText('Bravo quote.').closest('.tier-row')).toHaveClass('tier-row-gold');
    expect(screen.getByText('Charlie quote.').closest('.tier-row')).toHaveClass('tier-row-silver');
  });

  it('frames rows past third as Bronze without a per-row label', () => {
    const four = [...items, { id: 'd', text: 'Delta quote.', candidateToken: 't4', topicKey: 'k', addedAt: 4 }];
    render(<RankList items={four} onReorder={vi.fn()} />);
    expect(screen.getByText('Delta quote.').closest('.tier-row')).toHaveClass('tier-row-bronze');
    expect(screen.queryByText('Agreed')).not.toBeInTheDocument();
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
});
