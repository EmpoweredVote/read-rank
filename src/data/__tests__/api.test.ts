import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchRaceQuotes } from '../api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchRaceQuotes structural blindness', () => {
  it('strips provenance and identity fields from an over-returning backend', async () => {
    const overReturningPayload = {
      raceId: 'race-1',
      positionName: 'Governor',
      topics: [
        {
          topicKey: 'economy',
          title: 'Economy',
          question: 'How should the state grow jobs?',
          quotes: [
            {
              id: 'q1',
              text: 'We must invest in small businesses.',
              candidateToken: 'tok-a',
              topicKey: 'economy',
              sourceName: 'Debate transcript',
              sourceUrl: 'https://example.com/debate',
              party: 'Independent',
              candidateName: 'Jane Doe',
            },
            {
              id: 'q2',
              text: 'Cut red tape for employers.',
              candidateToken: 'tok-b',
              topicKey: 'economy',
              party: 'Reform',
            },
          ],
        },
        {
          topicKey: 'housing',
          title: 'Housing',
          question: 'How do we make housing affordable?',
          quotes: [
            {
              id: 'q3',
              text: 'Build more starter homes.',
              candidateToken: 'tok-a',
              topicKey: 'housing',
              sourceUrl: 'https://example.com/townhall',
            },
          ],
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => overReturningPayload,
      })
    );

    const payload = await fetchRaceQuotes('race-1');

    expect(payload.raceId).toBe('race-1');
    expect(payload.topics).toHaveLength(2);
    const allQuotes = payload.topics.flatMap((t) => t.quotes);
    expect(allQuotes).toHaveLength(3);
    for (const quote of allQuotes) {
      expect(Object.keys(quote).sort()).toEqual(['candidateToken', 'id', 'text', 'topicKey']);
    }
    // Allowed fields survive intact.
    expect(allQuotes[0]).toEqual({
      id: 'q1',
      text: 'We must invest in small businesses.',
      candidateToken: 'tok-a',
      topicKey: 'economy',
    });
  });
});
