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
