import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlignmentGrid } from '../AlignmentGrid';
import { CompassCrossLink } from '../CompassCrossLink';

beforeEach(() => {
  window.localStorage?.clear();
});

describe('AlignmentGrid', () => {
  it('renders an accessible tier table', () => {
    render(
      <AlignmentGrid
        topics={[{ key: 'a', title: 'Housing' }]}
        rows={[{ name: 'Jane Doe', cells: ['diamond'] }]}
      />
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('Diamond')).toBeInTheDocument();
  });
});

describe('CompassCrossLink', () => {
  it('frames the invitation around the observed top topic with the Inform chip', () => {
    render(<CompassCrossLink raceId="r1" topTopicTitle="Housing" />);
    expect(screen.getByText('Inform')).toBeInTheDocument();
    expect(screen.getByText(/based on what you ranked, housing appears to matter most to you/i)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /calibrate your compass/i });
    expect(cta).toHaveAttribute('href', 'https://compass.empowered.vote');
  });

  it('falls back to a generic invitation without a top topic', () => {
    render(<CompassCrossLink raceId="r1" topTopicTitle={null} />);
    expect(screen.getByText(/map where you stand on every issue/i)).toBeInTheDocument();
  });

  it('dismisses politely and stays dismissed for the race', async () => {
    const { unmount } = render(<CompassCrossLink raceId="r1" topTopicTitle="Housing" />);
    await userEvent.click(screen.getByRole('button', { name: /maybe later/i }));
    expect(screen.queryByRole('link', { name: /calibrate your compass/i })).not.toBeInTheDocument();
    unmount();
    render(<CompassCrossLink raceId="r1" topTopicTitle="Housing" />);
    expect(screen.queryByRole('link', { name: /calibrate your compass/i })).not.toBeInTheDocument();
  });
});
