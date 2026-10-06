import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionButtons } from '../ActionButtons';

describe('ActionButtons', () => {
  it('labels the verdicts Disagree and Agree with icons, keeping accessible names', () => {
    render(<ActionButtons onAgree={() => {}} onDisagree={() => {}} />);
    const disagree = screen.getByRole('button', { name: 'Disagree with this quote' });
    const agree = screen.getByRole('button', { name: 'Agree with this quote' });
    expect(disagree).toHaveTextContent('Disagree');
    expect(agree).toHaveTextContent('Agree');
    expect(disagree.querySelector('svg[data-icon="slash-circle"]')).not.toBeNull();
    expect(agree.querySelector('svg[data-icon="check"]')).not.toBeNull();
  });

  it('calls the handlers', async () => {
    const onAgree = vi.fn(); const onDisagree = vi.fn();
    render(<ActionButtons onAgree={onAgree} onDisagree={onDisagree} />);
    await userEvent.click(screen.getByRole('button', { name: 'Disagree with this quote' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agree with this quote' }));
    expect(onDisagree).toHaveBeenCalledTimes(1);
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('uses the in-card container class when inCard', () => {
    render(<ActionButtons onAgree={() => {}} onDisagree={() => {}} inCard />);
    expect(screen.getByRole('group', { name: 'Verdict' })).toHaveClass('action-buttons-incard');
  });
});
