import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchRaceQuotes } from '../api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchRaceQuotes structural blindness', () => {
  it('drops topics with fewer than two quotes (REDESIGN_SPEC §8)', async () => {
    const payload = {
      raceId: 'race-1',
      positionName: 'Governor',
      topics: [
        {
          topicKey: 'thin', title: 'Thin', question: 'Q?',
          quotes: [{ id: 'only', text: 'Lonely quote.', candidateToken: 'a', topicKey: 'thin' }],
        },
        {
          topicKey: 'full', title: 'Full', question: 'Q?',
          quotes: [
            { id: 'f1', text: 'One.', candidateToken: 'a', topicKey: 'full' },
            { id: 'f2', text: 'Two.', candidateToken: 'b', topicKey: 'full' },
          ],
        },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
    const result = await fetchRaceQuotes('race-1');
    expect(result.topics.map((t) => t.topicKey)).toEqual(['full']);
  });

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
            {
              id: 'q4',
              text: 'Expand rental assistance.',
              candidateToken: 'tok-b',
              topicKey: 'housing',
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
    expect(allQuotes).toHaveLength(4);
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
