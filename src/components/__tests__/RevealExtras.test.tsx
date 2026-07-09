import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RcvEducationPanel } from '../RcvEducationPanel';

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
