import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowseHeader } from '../BrowseHeader';

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe('BrowseHeader', () => {
  it('renders the back link and the H1', () => {
    render(<BrowseHeader backLabel="‹ Back to my ballot" onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: '‹ Back to my ballot' })).toHaveClass('rr-browse-back');
    expect(screen.getByRole('heading', { level: 1, name: 'Choose an election' })).toHaveClass('rr-browse-title');
  });

  it('scrolls to the top and focuses the H1 on mount', () => {
    render(<BrowseHeader backLabel="‹ Back" onBack={vi.fn()} />);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('calls onBack when the link is clicked', async () => {
    const onBack = vi.fn();
    render(<BrowseHeader backLabel="‹ Back" onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: '‹ Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
