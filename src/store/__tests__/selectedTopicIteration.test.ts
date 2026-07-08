import { describe, it, expect, beforeEach } from 'vitest';
import {
  useReadRankStore,
  getActiveTopicKeys,
  type RacePayload,
} from '../useReadRankStore';

// Two candidates per topic so every topic is scorable.
const q = (id: string, token: string, topicKey: string) => ({
  id,
  text: `text-${id}`,
  candidateToken: token,
  topicKey,
});

const payload: RacePayload = {
  raceId: 'race-sel-iter',
  positionName: 'Governor',
  topics: [
    { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [q('a1', 'c1', 'k1'), q('a2', 'c2', 'k1')] },
    { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [q('b1', 'c1', 'k2'), q('b2', 'c2', 'k2')] },
    { topicKey: 'k3', title: 'T3', question: 'Q3', quotes: [q('d1', 'c1', 'k3'), q('d2', 'c2', 'k3')] },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('selected topics drive the ranking iteration', () => {
  it('getActiveTopicKeys returns only selected topics, in canonical order', () => {
    useReadRankStore.getState().selectRace(payload);
    // Deselect the middle topic; leave selection out of canonical order too.
    useReadRankStore.getState().setSelectedTopics(['k3', 'k1']);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(getActiveTopicKeys(race)).toEqual(['k1', 'k3']);
  });

  it('getActiveTopicKeys falls back to all topics when selection is unset', () => {
    useReadRankStore.getState().selectRace(payload);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    // Simulate a race started before selectedTopicKeys existed.
    const legacy = { ...race, selectedTopicKeys: undefined };
    expect(getActiveTopicKeys(legacy)).toEqual(['k1', 'k2', 'k3']);
  });

  it('confirmIssueSelection starts on the first selected topic', () => {
    useReadRankStore.getState().selectRace(payload);
    // Deselect the first topic — evaluation should not start on k1.
    useReadRankStore.getState().setSelectedTopics(['k2', 'k3']);
    useReadRankStore.getState().confirmIssueSelection();
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.currentTopicKey).toBe('k2');
  });

  it('nextTopic skips deselected topics', () => {
    useReadRankStore.getState().selectRace(payload);
    // Keep only the first and last topic; k2 must be skipped.
    useReadRankStore.getState().setSelectedTopics(['k1', 'k3']);
    useReadRankStore.getState().confirmIssueSelection();

    expect(useReadRankStore.getState().getCurrentRaceProgress()!.currentTopicKey).toBe('k1');
    useReadRankStore.getState().nextTopic();
    expect(useReadRankStore.getState().getCurrentRaceProgress()!.currentTopicKey).toBe('k3');
    // Already on the last selected topic — nextTopic is a no-op.
    useReadRankStore.getState().nextTopic();
    expect(useReadRankStore.getState().getCurrentRaceProgress()!.currentTopicKey).toBe('k3');
  });
});
