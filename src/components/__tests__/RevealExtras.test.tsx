import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThresholdInterstitial } from '../ThresholdInterstitial';
import { RcvEducationPanel } from '../RcvEducationPanel';

describe('ThresholdInterstitial', () => {
  it('states what was ranked and advances on the button', async () => {
    const onContinue = vi.fn();
    render(<ThresholdInterstitial rankedCount={5} topicCount={3} onContinue={onContinue} />);
    expect(screen.getByText(/you ranked 5 quotes across 3 topics/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /see who you agreed with/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('handles singular counts', () => {
    render(<ThresholdInterstitial rankedCount={1} topicCount={1} onContinue={vi.fn()} />);
    expect(screen.getByText(/you ranked 1 quote across 1 topic/i)).toBeInTheDocument();
  });
});

describe('RcvEducationPanel', () => {
  it('explains the mirror and the real-RCV connection', () => {
    render(<RcvEducationPanel usesRcv={true} />);
    expect(screen.getByText(/mirrors ranked choice voting/i)).toBeInTheDocument();
    expect(screen.getByText(/this race is decided exactly this way/i)).toBeInTheDocument();
  });

  it('contrasts with single-choice races', () => {
    render(<RcvEducationPanel usesRcv={false} />);
    expect(screen.getByText(/decided with a single choice instead/i)).toBeInTheDocument();
    expect(screen.getByText(/only your top pick would count/i)).toBeInTheDocument();
  });

  it('stays generic when the method is unknown', () => {
    render(<RcvEducationPanel usesRcv={undefined} />);
    expect(screen.getByText(/mirrors ranked choice voting/i)).toBeInTheDocument();
    expect(screen.queryByText(/single choice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/exactly this way/i)).not.toBeInTheDocument();
  });
});
