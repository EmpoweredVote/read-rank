import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore, type RacePayload } from '../useReadRankStore';

const q = (id: string, token: string, topicKey: string) => ({
  id,
  text: `text-${id}`,
  candidateToken: token,
  topicKey,
});

const v1: RacePayload = {
  raceId: 'race-refresh',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'ff',
      title: 'Fossil Fuels',
      question: 'OLD question',
      quotes: [q('a1', 'c1', 'ff'), q('a2', 'c2', 'ff')],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('selectRace refreshes display content for returning users', () => {
  it('updates topic question/title from a fresh payload while preserving verdicts', () => {
    const store = useReadRankStore.getState();
    store.selectRace(v1);
    store.agree(q('a1', 'c1', 'ff')); // user makes progress on this race

    // Returning visit: the API now serves an edited question + title (e.g. a
    // sharpened per-race ranking question). selectRace must surface it, not the
    // stale persisted copy — while keeping the user's verdict.
    const v2: RacePayload = {
      ...v1,
      topics: [{ ...v1.topics[0], title: 'Fossil Fuels (CA)', question: 'NEW question' }],
    };
    store.selectRace(v2);

    const race = useReadRankStore.getState().raceProgress['race-refresh'];
    expect(race.topics.ff.question).toBe('NEW question');
    expect(race.topics.ff.title).toBe('Fossil Fuels (CA)');
    expect(race.topics.ff.agreed.map((a) => a.id)).toEqual(['a1']);
  });
});
