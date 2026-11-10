import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeFilterSwitch } from '../TimeFilterSwitch';

describe('TimeFilterSwitch', () => {
  it('marks the current value as pressed', () => {
    render(<TimeFilterSwitch value="past" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /filter by election timing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Past' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Upcoming' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked value', async () => {
    const onChange = vi.fn();
    render(<TimeFilterSwitch value="upcoming" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Past' }));
    expect(onChange).toHaveBeenCalledWith('past');
  });
});
