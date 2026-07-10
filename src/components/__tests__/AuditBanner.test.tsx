import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditBanner } from '../AuditBanner';
import { isContentLockdownActive } from '../../config/liveContent';

vi.mock('../../config/liveContent', () => ({
  isContentLockdownActive: vi.fn(() => true),
}));

const lockdownActive = isContentLockdownActive as unknown as Mock;

beforeEach(() => {
  window.localStorage?.clear();
  lockdownActive.mockReturnValue(true);
});

describe('AuditBanner', () => {
  it('shows the audit notice while the lockdown is active', async () => {
    render(<AuditBanner />);
    expect(await screen.findByText(/auditing our candidate quotes/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('dismisses on click and persists the dismissal', async () => {
    const { unmount } = render(<AuditBanner />);
    await userEvent.click(screen.getByRole('button', { name: /dismiss this message/i }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('rr-audit-banner-dismissed:v1')).toBe('1');

    // Stays gone on a fresh mount (reads the persisted flag).
    unmount();
    render(<AuditBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders nothing when the lockdown is not active', () => {
    lockdownActive.mockReturnValue(false);
    render(<AuditBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
