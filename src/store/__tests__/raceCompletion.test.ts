import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore, type RacePayload } from '../useReadRankStore';

// Two scorable topics (each has 2 distinct candidate tokens).
const payload: RacePayload = {
  raceId: 'race-complete-test',
  positionName: 'Governor',
  topics: [
    { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [
      { id: 'a1', text: 'x', candidateToken: 'tokA', topicKey: 'k1' },
      { id: 'a2', text: 'y', candidateToken: 'tokB', topicKey: 'k1' },
    ] },
    { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [
      { id: 'b1', text: 'x', candidateToken: 'tokA', topicKey: 'k2' },
      { id: 'b2', text: 'y', candidateToken: 'tokB', topicKey: 'k2' },
    ] },
  ],
};

const s = () => useReadRankStore.getState();

// Judge every quote in one topic so it counts as done.
function finishTopic(key: 'k1' | 'k2') {
  const race = s().getCurrentRaceProgress()!;
  for (const quote of race.topics[key].quotesToEvaluate) s().disagree(quote);
}

beforeEach(() => {
  window.localStorage?.clear();
  s().reset();
});

describe('revealBallot', () => {
  it('moves to results without marking the whole race complete', () => {
    s().selectRace(payload);
    s().confirmIssueSelection();
    finishTopic('k1');
    s().revealBallot();
    expect(s().phase).toBe('results');
    expect(s().getCurrentRaceProgress()!.completed).toBe(false);
  });
});

describe('selectRace re-entry routing', () => {
  it('routes a revealed-but-incomplete race to the issue-selection hub', () => {
    s().selectRace(payload);
    s().confirmIssueSelection();
    finishTopic('k1');          // 1 of 2 topics done
    s().revealBallot();         // phase -> results
    s().goToHub();
    s().selectRace(payload, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 2 });
    expect(s().phase).toBe('issue-selection');
  });

  it('routes a fully complete race straight to the ballot', () => {
    s().selectRace(payload);
    s().confirmIssueSelection();
    finishTopic('k1');
    finishTopic('k2');          // 2 of 2 done
    s().revealBallot();
    s().goToHub();
    s().selectRace(payload, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 2 });
    expect(s().phase).toBe('results');
  });

  it('resumes mid-evaluation (never revealed) at the evaluation phase', () => {
    s().selectRace(payload);
    s().confirmIssueSelection();  // phase evaluation, nothing revealed
    s().goToHub();
    s().selectRace(payload, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 2 });
    expect(s().phase).toBe('evaluation');
  });
});

describe('rankableTopicCount persistence', () => {
  it('stores rankableTopicCount from meta on the race and refreshes it on re-entry', () => {
    s().selectRace(payload, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 5 });
    expect(s().getCurrentRaceProgress()!.rankableTopicCount).toBe(5);
    s().goToHub();
    s().selectRace(payload, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 6 });
    expect(s().getCurrentRaceProgress()!.rankableTopicCount).toBe(6);
  });
});
