import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankDock } from '../RankDock';
import type { AgreedQuote } from '../../store/useReadRankStore';

const quote = (id: string, text: string): AgreedQuote => ({
  id, text, candidateToken: 't', topicKey: 'k', addedAt: 1,
});

describe('RankDock', () => {
  it('is a slim bar showing the ranked count', () => {
    const agreed = [quote('a', 'Alpha quote.'), quote('b', 'Bravo quote.'), quote('c', 'Charlie quote.')];
    render(<RankDock agreed={agreed} disagreedCount={0} onOpen={vi.fn()} />);
    expect(screen.getByText('Your ranking')).toBeInTheDocument();
    expect(screen.getByText(/3 ranked/)).toBeInTheDocument();
    // The slim bar no longer previews quote stubs.
    expect(screen.queryByText('Alpha quote.')).not.toBeInTheDocument();
  });

  it('shows a nothing-ranked hint when empty', () => {
    render(<RankDock agreed={[]} disagreedCount={0} onOpen={vi.fn()} />);
    expect(screen.getByText(/nothing ranked yet/)).toBeInTheDocument();
  });

  it('is one labeled button that opens the sheet', async () => {
    const onOpen = vi.fn();
    render(<RankDock agreed={[quote('a', 'Alpha quote.')]} disagreedCount={1} onOpen={onOpen} />);
    const dock = screen.getByRole('button', { name: /open your ranking.*1 ranked.*1 disagreed/i });
    await userEvent.click(dock);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
