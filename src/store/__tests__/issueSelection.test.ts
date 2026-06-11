import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore, type RacePayload } from '../useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-is-test',
  positionName: 'Governor',
  topics: [
    { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [] },
    { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [] },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('issue selection store', () => {
  it('selectRace sets global phase to issue-selection for a new race', () => {
    useReadRankStore.getState().selectRace(payload);
    expect(useReadRankStore.getState().phase).toBe('issue-selection');
  });

  it('selectRace initialises selectedTopicKeys to all topic keys', () => {
    useReadRankStore.getState().selectRace(payload);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.selectedTopicKeys).toEqual(['k1', 'k2']);
  });

  it('setSelectedTopics updates the selection', () => {
    useReadRankStore.getState().selectRace(payload);
    useReadRankStore.getState().setSelectedTopics(['k1']);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.selectedTopicKeys).toEqual(['k1']);
  });

  it('confirmIssueSelection advances global and race phase to evaluation', () => {
    useReadRankStore.getState().selectRace(payload);
    useReadRankStore.getState().confirmIssueSelection();
    expect(useReadRankStore.getState().phase).toBe('evaluation');
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.phase).toBe('evaluation');
  });

  it('re-selecting an existing race skips issue-selection and resumes its phase', () => {
    useReadRankStore.getState().selectRace(payload);
    useReadRankStore.getState().confirmIssueSelection();
    useReadRankStore.getState().goToHub();
    useReadRankStore.getState().selectRace(payload);
    expect(useReadRankStore.getState().phase).toBe('evaluation');
  });
});
