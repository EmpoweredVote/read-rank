import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankDock } from '../RankDock';
import type { AgreedQuote } from '../../store/useReadRankStore';

const quote = (id: string, text: string): AgreedQuote => ({
  id, text, candidateToken: 't', topicKey: 'k', addedAt: 1,
});

describe('RankDock', () => {
  it('shows ghost slots when nothing is ranked', () => {
    render(<RankDock agreed={[]} disagreedCount={0} onOpen={vi.fn()} />);
    expect(screen.getByText('1st')).toBeInTheDocument();
    expect(screen.getByText('2nd')).toBeInTheDocument();
    expect(screen.getByText('3rd')).toBeInTheDocument();
  });

  it('fills slots with quote stubs and shows overflow + disagreed counters', () => {
    const agreed = [quote('a', 'Alpha quote.'), quote('b', 'Bravo quote.'), quote('c', 'Charlie quote.'), quote('d', 'Delta quote.'), quote('e', 'Echo quote.')];
    render(<RankDock agreed={agreed} disagreedCount={2} onOpen={vi.fn()} />);
    expect(screen.getByText('Alpha quote.')).toBeInTheDocument();
    expect(screen.getByText('Charlie quote.')).toBeInTheDocument();
    expect(screen.queryByText('Delta quote.')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText(/⊘ 2/)).toBeInTheDocument();
  });

  it('is one labeled button that opens the sheet', async () => {
    const onOpen = vi.fn();
    render(<RankDock agreed={[quote('a', 'Alpha quote.')]} disagreedCount={1} onOpen={onOpen} />);
    const dock = screen.getByRole('button', { name: /open your ranking.*1 ranked.*1 disagreed/i });
    await userEvent.click(dock);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
