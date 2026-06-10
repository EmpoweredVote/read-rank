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

  it('disables the boundary buttons', () => {
    render(<RankList items={items} onReorder={vi.fn()} showMoveButtons />);
    expect(screen.getByRole('button', { name: /move up.*ranked 1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move down.*ranked 3/i })).toBeDisabled();
  });

  it('announces moves through a status region', async () => {
    render(<RankList items={items} onReorder={vi.fn()} showMoveButtons />);
    await userEvent.click(screen.getByRole('button', { name: /move down.*ranked 1/i }));
    const statusRegions = screen.getAllByRole('status');
    const announcement = statusRegions.find((el) => /moved to position 2 of 3/i.test(el.textContent ?? ''));
    expect(announcement).toBeTruthy();
    expect(announcement).toHaveTextContent(/moved to position 2 of 3/i);
  });
});
