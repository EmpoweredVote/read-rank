import { describe, it, expect, vi, afterEach } from 'vitest';

// Exercise the temporary content lockdown (src/config/liveContent.ts) with a known
// restrictive allowlist, decoupled from the real constants so these tests don't churn
// when the audit lifts the lockdown.
vi.mock('../../config/liveContent', () => ({
  DEFAULT_RACE_ID: 'keep-race',
  ALLOWED_RACE_IDS: ['keep-race'],
  ALLOWED_TOPIC_KEYS: ['housing'],
  isRaceAllowed: (raceId: string) => raceId === 'keep-race',
  isTopicAllowed: (topicKey: string) => topicKey.toLowerCase() === 'housing',
}));

import { fetchRaces, fetchRaceQuotes } from '../api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('content lockdown', () => {
  it('fetchRaces drops races not on the allowlist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        races: [{ raceId: 'keep-race' }, { raceId: 'drop-race' }],
        counties: { '06037': 'Los Angeles County' },
      }),
    }));
    const { races, counties } = await fetchRaces();
    expect(races.map((r) => r.raceId)).toEqual(['keep-race']);
    // Counties index is passed through untouched.
    expect(counties).toEqual({ '06037': 'Los Angeles County' });
  });

  it('fetchRaceQuotes drops topics not on the allowlist (after the blindness/thin-topic pass)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        raceId: 'keep-race',
        positionName: 'Governor',
        topics: [
          {
            topicKey: 'housing', title: 'Housing', question: 'Q?',
            quotes: [
              { id: 'h1', text: 'One.', candidateToken: 'a', topicKey: 'housing' },
              { id: 'h2', text: 'Two.', candidateToken: 'b', topicKey: 'housing' },
            ],
          },
          {
            topicKey: 'taxes', title: 'Taxes', question: 'Q?',
            quotes: [
              { id: 't1', text: 'One.', candidateToken: 'a', topicKey: 'taxes' },
              { id: 't2', text: 'Two.', candidateToken: 'b', topicKey: 'taxes' },
            ],
          },
        ],
      }),
    }));
    const payload = await fetchRaceQuotes('keep-race');
    expect(payload.topics.map((t) => t.topicKey)).toEqual(['housing']);
  });
});
