import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore } from '../useReadRankStore';
import type { AgreedQuote, RaceProgress } from '../useReadRankStore';

// Seed store state directly (bypassing the swipe/agree flow) so we can assert on
// `toggleTie` in isolation. Builds a minimal but valid RaceProgress with a single
// topic whose `agreed` pile already holds three quotes in order a, b, c.
function seedRaceWithAgreed(ids: string[]): void {
  const agreed: AgreedQuote[] = ids.map((id) => ({
    id,
    text: `Quote ${id}.`,
    candidateToken: `tok-${id}`,
    topicKey: 'housing',
    addedAt: Date.now(),
  }));
  const race: RaceProgress = {
    raceId: 'race-test',
    positionName: 'Governor',
    topics: {
      housing: {
        topicKey: 'housing',
        title: 'Housing',
        question: 'How to fix housing?',
        quotesToEvaluate: [],
        currentIndex: agreed.length,
        disagreed: [],
        agreed,
      },
    },
    topicOrder: ['housing'],
    currentTopicKey: 'housing',
    phase: 'evaluation',
    completed: false,
    selectedTopicKeys: ['housing'],
  };
  useReadRankStore.setState({
    currentRaceId: 'race-test',
    raceProgress: { 'race-test': race },
  });
}

beforeEach(() => {
  // Node 26 has an experimental global `localStorage` that shadows jsdom's — use
  // window.localStorage directly so persist storage is cleared in the jsdom environment.
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  seedRaceWithAgreed(['a', 'b', 'c']);
});

describe('toggleTie', () => {
  it('flips tieWithPrev on the targeted agreed quote', () => {
    useReadRankStore.getState().toggleTie('b');
    let race = useReadRankStore.getState().getCurrentRaceProgress()!;
    let b = race.topics.housing.agreed.find((q) => q.id === 'b')!;
    expect(b.tieWithPrev).toBe(true);

    useReadRankStore.getState().toggleTie('b');
    race = useReadRankStore.getState().getCurrentRaceProgress()!;
    b = race.topics.housing.agreed.find((q) => q.id === 'b')!;
    expect(b.tieWithPrev).toBe(false);
  });

  it("leaves the first agreed quote's tieWithPrev falsy (can't tie upward)", () => {
    useReadRankStore.getState().toggleTie('a');
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    const a = race.topics.housing.agreed.find((q) => q.id === 'a')!;
    expect(a.tieWithPrev).toBeFalsy();
  });
});

describe('setRankedCount', () => {
  it('sets rankedCount on the current topic', () => {
    useReadRankStore.getState().setRankedCount(2);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.rankedCount).toBe(2);
  });

  it('clamps above agreed.length down to agreed.length', () => {
    useReadRankStore.getState().setRankedCount(99);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.rankedCount).toBe(3);
  });

  it('clamps below 0 up to 0', () => {
    useReadRankStore.getState().setRankedCount(-1);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.rankedCount).toBe(0);
  });
});

describe('reorderAgreed clears stale ties on move', () => {
  it("clears tieWithPrev on a quote that moved to a new index", () => {
    useReadRankStore.getState().toggleTie('c');
    let race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.agreed.find((q) => q.id === 'c')!.tieWithPrev).toBe(true);

    // 'c' moves from index 2 to index 0 -- its old adjacency (tied to 'b') is broken.
    useReadRankStore.getState().reorderAgreed(['c', 'a', 'b']);
    race = useReadRankStore.getState().getCurrentRaceProgress()!;
    const c = race.topics.housing.agreed.find((q) => q.id === 'c')!;
    expect(c.tieWithPrev).toBe(false);
  });

  it('preserves tieWithPrev on a quote that did not move', () => {
    useReadRankStore.getState().toggleTie('b');
    let race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.agreed.find((q) => q.id === 'b')!.tieWithPrev).toBe(true);

    // Original order is a(0), b(1), c(2). This reorder keeps 'b' at index 1
    // while 'a' and 'c' swap around it -- a genuine "unmoved" case, not a no-op.
    useReadRankStore.getState().reorderAgreed(['c', 'b', 'a']);
    race = useReadRankStore.getState().getCurrentRaceProgress()!;
    const b = race.topics.housing.agreed.find((q) => q.id === 'b')!;
    expect(b.tieWithPrev).toBe(true);
  });
});

describe('getRaceVerdicts', () => {
  it('restarts ranks per topic and keeps ties, rather than using a global running index', () => {
    const now = Date.now();
    const race: RaceProgress = {
      raceId: 'race-multi',
      positionName: 'Governor',
      topics: {
        t1: {
          topicKey: 't1',
          title: 'Topic 1',
          question: 'Q1?',
          quotesToEvaluate: [],
          currentIndex: 2,
          disagreed: [],
          agreed: [
            { id: 'a', text: 'Quote a.', candidateToken: 'tok-a', topicKey: 't1', addedAt: now },
            {
              id: 'b',
              text: 'Quote b.',
              candidateToken: 'tok-b',
              topicKey: 't1',
              addedAt: now,
              tieWithPrev: true,
            },
          ],
        },
        t2: {
          topicKey: 't2',
          title: 'Topic 2',
          question: 'Q2?',
          quotesToEvaluate: [],
          currentIndex: 2,
          disagreed: [],
          agreed: [
            { id: 'c', text: 'Quote c.', candidateToken: 'tok-c', topicKey: 't2', addedAt: now },
            { id: 'd', text: 'Quote d.', candidateToken: 'tok-d', topicKey: 't2', addedAt: now },
          ],
        },
      },
      topicOrder: ['t1', 't2'],
      currentTopicKey: 't1',
      phase: 'evaluation',
      completed: false,
      selectedTopicKeys: ['t1', 't2'],
    };
    useReadRankStore.setState({
      currentRaceId: 'race-multi',
      raceProgress: { 'race-multi': race },
    });

    const verdicts = useReadRankStore.getState().getRaceVerdicts('race-multi');
    const rankById = new Map(verdicts.map((v) => [v.quote_id, v.rank]));

    // t1: a=1, b=1 (tie with a). t2 RESTARTS at 1: c=1, d=2 -- proving ranks are
    // per-topic. Under the old global-index bug, t2 would have continued the
    // running count from t1 and produced c=3, d=4.
    expect(rankById.get('a')).toBe(1);
    expect(rankById.get('b')).toBe(1);
    expect(rankById.get('c')).toBe(1);
    expect(rankById.get('d')).toBe(2);
  });
});
