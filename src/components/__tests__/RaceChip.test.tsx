import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../motif/Motif', () => ({ Motif: () => <div data-testid="motif" /> }));
import { RaceChip } from '../RaceChip';

describe('RaceChip', () => {
  it('shows state, date, office and seat, with the motif', () => {
    render(<RaceChip office="US Representative" seat="District 7" state="IN"
      electionDate="2026-11-03" tier="federal" scope={'district' as never} boundaryRef={null} frameRef={null} />);
    expect(screen.getByText(/indiana · nov 3, 2026/i)).toBeInTheDocument();
    expect(screen.getByText('US Representative')).toBeInTheDocument();
    expect(screen.getByText(/district 7/i)).toBeInTheDocument();
    expect(screen.getByTestId('motif')).toBeInTheDocument();
  });

  it('omits missing pieces and the motif when tier/scope are unknown', () => {
    render(<RaceChip office="Governor" />);
    expect(screen.getByText('Governor')).toBeInTheDocument();
    expect(screen.queryByTestId('motif')).not.toBeInTheDocument();
    expect(screen.queryByText('·')).not.toBeInTheDocument();
  });
});
