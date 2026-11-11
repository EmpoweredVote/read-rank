import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const radarProps = vi.fn();
vi.mock('@empoweredvote/ev-ui', () => ({
  RadarChartCore: (props: Record<string, unknown>) => { radarProps(props); return <svg data-testid="radar" />; },
}));
const fetchPoliticianAnswers = vi.fn();
vi.mock('../../data/compass', () => ({
  fetchPoliticianAnswers: (id: string) => fetchPoliticianAnswers(id),
}));

import { YourCompassCard } from '../YourCompassCard';
import type { CompassSpoke, CompassTopic } from '../../data/compass';

const spokes: CompassSpoke[] = [
  { topicId: 't1', shortTitle: 'Housing', value: 2, inverted: false },
  { topicId: 't2', shortTitle: 'Taxes', value: 4, inverted: false },
  { topicId: 't3', shortTitle: 'Healthcare', value: 3, inverted: false },
];
const topics = [] as CompassTopic[];
const candidates = [{ candidateId: 'c1', name: 'Ann Lee' }, { candidateId: 'c2', name: 'Bo Ray' }];
const lastProps = () => radarProps.mock.calls[radarProps.mock.calls.length - 1][0];

beforeEach(() => {
  radarProps.mockClear();
  fetchPoliticianAnswers.mockReset();
});

describe('YourCompassCard', () => {
  it('compares with the first candidate and names spokes they have no stance on', async () => {
    fetchPoliticianAnswers.mockResolvedValue([{ topic_id: 't1', value: 5 }, { topic_id: 't2', value: 1 }]);
    render(<YourCompassCard spokes={spokes} topics={topics} candidates={candidates} />);
    expect(screen.getByRole('heading', { name: 'Your compass' })).toBeInTheDocument();
    expect(await screen.findByText('No stance on file from Ann Lee on Healthcare.')).toBeInTheDocument();
    expect(fetchPoliticianAnswers).toHaveBeenCalledWith('c1');
    expect(lastProps().data).toEqual({ Housing: 2, Taxes: 4, Healthcare: 3 });
    // A missing stance is left out, not plotted as a guess.
    expect(lastProps().compareData).toEqual({ Housing: 5, Taxes: 1 });
    expect(lastProps().unansweredSpokes).toEqual({ Healthcare: true });
    expect(screen.getByRole('button', { name: /ann lee/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches the overlay when another candidate is picked', async () => {
    fetchPoliticianAnswers.mockImplementation(async (id: string) => (id === 'c1' ? [] : [{ topic_id: 't3', value: 2 }]));
    render(<YourCompassCard spokes={spokes} topics={topics} candidates={candidates} />);
    expect(await screen.findByText('Ann Lee has no Compass stances on file for your topics yet.')).toBeInTheDocument();
    expect(lastProps().compareData).toEqual({});
    await userEvent.click(screen.getByRole('button', { name: /bo ray/i }));
    await waitFor(() => expect(lastProps().compareData).toEqual({ Healthcare: 2 }));
    expect(screen.getByRole('button', { name: /bo ray/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('says so when a candidate\'s stances fail to load', async () => {
    fetchPoliticianAnswers.mockRejectedValue(new Error('500'));
    render(<YourCompassCard spokes={spokes} topics={topics} candidates={candidates} />);
    expect(await screen.findByText(/couldn.t load Ann Lee.s stances/i)).toBeInTheDocument();
  });
});
