import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore } from '../useReadRankStore';
import type { RacePayload } from '../useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-test',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'q1', text: 'Quote one.', candidateToken: 'tok-a', topicKey: 'housing' },
        { id: 'q2', text: 'Quote two.', candidateToken: 'tok-b', topicKey: 'housing' },
      ],
    },
  ],
};

beforeEach(() => {
  // Node 26 has an experimental global `localStorage` that shadows jsdom's — use
  // window.localStorage directly so persist storage is cleared in the jsdom environment.
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
});

describe('reAgree', () => {
  it('moves a disagreed quote to the bottom of the agreed pile', () => {
    const s = useReadRankStore.getState();
    const [q1, q2] = payload.topics[0].quotes;
    s.agree(q1);
    s.disagree(q2);

    let race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.disagreed.map((q) => q.id)).toEqual(['q2']);

    useReadRankStore.getState().reAgree(q2);

    race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.disagreed).toEqual([]);
    expect(race.topics.housing.agreed.map((q) => q.id)).toEqual(['q1', 'q2']);
  });

  it('is a no-op when the quote is already agreed', () => {
    const s = useReadRankStore.getState();
    const [q1] = payload.topics[0].quotes;
    s.agree(q1);
    useReadRankStore.getState().reAgree(q1);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.agreed.map((q) => q.id)).toEqual(['q1']);
  });

  it('does not advance the topic evaluation index', () => {
    const s = useReadRankStore.getState();
    const [q1] = payload.topics[0].quotes;
    s.disagree(q1);
    const before = useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.currentIndex;
    useReadRankStore.getState().reAgree(q1);
    const after = useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.currentIndex;
    expect(after).toBe(before);
  });

  it('ignores quotes that were never disagreed', () => {
    const [q1] = payload.topics[0].quotes;
    // q1 is unevaluated: not agreed, not disagreed.
    useReadRankStore.getState().reAgree(q1);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.agreed).toEqual([]);
  });
});
