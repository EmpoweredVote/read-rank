import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Force reduced motion for every component in this file.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

import { ResultsPhase } from '../ResultsPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const flowPayload: RacePayload = {
  raceId: 'mock-in-gov-2024',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'cannabis-legalization',
      title: 'Cannabis Legalization',
      question: 'Should Indiana legalize marijuana?',
      quotes: [
        {
          id: 'q-103',
          text: 'Marijuana use is cascading across the country and the state needs to address it seriously.',
          candidateToken: 'tok-9d4b',
          topicKey: 'cannabis-legalization',
        },
      ],
    },
  ],
};

describe('ResultsPhase reduced motion', () => {
  it('renders the tally at once with the final agreement number (no count-up) and announces it', async () => {
    window.localStorage?.clear();
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(flowPayload);
    useReadRankStore.getState().agree(flowPayload.topics[0].quotes[0]);
    useReadRankStore.getState().finishRace();

    render(<ResultsPhase />);
    const continueBtn = await screen.findByRole('button', { name: /see who you agreed with/i }, { timeout: 3000 });
    await userEvent.click(continueBtn);

    // Cards present at once, final number shown immediately (count-up bypassed under reduced motion).
    expect((await screen.findAllByText(/mike braun/i)).length).toBeGreaterThan(0);
    // Count-up bypass under reduced motion (returns target immediately) is unit-tested in src/utils/__tests__/countUp.test.tsx.
    // Announcement present.
    const announcement = await screen.findByText(/ballot revealed\. your number one is mike braun/i);
    expect(announcement).toHaveAttribute('aria-live', 'polite');
  });
});
