import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueSelection } from '../IssueSelection';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-issue-ui',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'h1', text: 'Quote A', candidateToken: 'tok-a', topicKey: 'housing' },
        { id: 'h2', text: 'Quote B', candidateToken: 'tok-b', topicKey: 'housing' },
      ],
    },
    {
      topicKey: 'economy',
      title: 'Economy',
      question: 'How to grow the economy?',
      quotes: [
        { id: 'e1', text: 'Quote C', candidateToken: 'tok-a', topicKey: 'economy' },
      ],
    },
    {
      topicKey: 'environment',
      title: 'Environment',
      question: 'How to protect the environment?',
      quotes: [
        { id: 'ev1', text: 'Quote D', candidateToken: 'tok-a', topicKey: 'environment' },
        { id: 'ev2', text: 'Quote E', candidateToken: 'tok-b', topicKey: 'environment' },
        { id: 'ev3', text: 'Quote F', candidateToken: 'tok-c', topicKey: 'environment' },
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
});

describe('IssueSelection', () => {
  it('renders all topic titles', () => {
    render(<IssueSelection />);
    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Economy')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
  });

  it('selects all scorable topics by default', () => {
    render(<IssueSelection />);
    expect(screen.getByRole('button', { name: /housing/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /environment/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks single-candidate topics as NOT SCORED and non-interactive', () => {
    render(<IssueSelection />);
    expect(screen.getByText('NOT SCORED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /economy/i })).not.toBeInTheDocument();
  });

  it('toggles a topic off when clicked', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /housing/i }));
    expect(screen.getByRole('button', { name: /housing/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows live CTA with total quote count and time estimate', () => {
    render(<IssueSelection />);
    // Housing (2) + Environment (3) = 5 quotes; ceil(5/8) = 1 min
    expect(screen.getByRole('button', { name: /start.*5 quotes.*1 min/i })).toBeInTheDocument();
  });

  it('disables the CTA when no scorable topics are selected', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /housing/i }));
    await userEvent.click(screen.getByRole('button', { name: /environment/i }));
    const cta = screen.getByRole('button', { name: /select at least one/i });
    expect(cta).toBeDisabled();
  });

  it('advances to evaluation on CTA click', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(useReadRankStore.getState().phase).toBe('evaluation');
  });
});
