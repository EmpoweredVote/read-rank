import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuoteProgress } from '../QuoteProgress';

describe('QuoteProgress', () => {
  it('labels the current quote and exposes progress to assistive tech', () => {
    render(<QuoteProgress current={2} total={4} done={false} />);
    expect(screen.getByText('Quote 2 of 4')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Quotes in this issue' });
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
    expect(bar).toHaveAttribute('aria-valuetext', 'Quote 2 of 4');
  });

  it('renders one segment per quote with judged/current/upcoming states', () => {
    const { container } = render(<QuoteProgress current={2} total={4} done={false} />);
    const segs = container.querySelectorAll('.rr-qprogress__seg');
    expect(segs).toHaveLength(4);
    expect(segs[0]).toHaveClass('rr-qprogress__seg--done');
    expect(segs[1]).toHaveClass('rr-qprogress__seg--current');
    expect(segs[2]).not.toHaveClass('rr-qprogress__seg--done');
  });

  it('shows total of total when the topic is done', () => {
    render(<QuoteProgress current={4} total={4} done />);
    expect(screen.getByText('Quote 4 of 4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  });

  it('falls back to one continuous bar above 12 quotes', () => {
    const { container } = render(<QuoteProgress current={8} total={20} done={false} />);
    expect(container.querySelectorAll('.rr-qprogress__seg')).toHaveLength(0);
    const fill = container.querySelector('.rr-qprogress__fill') as HTMLElement;
    expect(fill.style.width).toBe('35%'); // 7 judged of 20
  });
});
