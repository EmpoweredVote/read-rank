import { describe, it, expect } from 'vitest';
import { deriveProgressState, progressLabel, isRaceComplete } from '../raceProgressState';
import type { RaceProgress, TopicProgress } from '../../store/useReadRankStore';

function topic(over: Partial<TopicProgress>): TopicProgress {
  return {
    topicKey: 't', title: 'T', question: 'Q',
    quotesToEvaluate: [], currentIndex: 0, disagreed: [], agreed: [], ...over,
  };
}
function q(id: string, token: string) {
  return { id, text: 'x', candidateToken: token, topicKey: 't' };
}
function race(over: Partial<RaceProgress>): RaceProgress {
  return {
    raceId: 'r', positionName: 'P', topics: {}, topicOrder: [],
    currentTopicKey: null, phase: 'evaluation', completed: false, ...over,
  };
}

describe('deriveProgressState', () => {
  it('not-started when there is no stored progress', () => {
    expect(deriveProgressState(undefined, 4).state).toBe('not-started');
  });

  it('in-progress when started but not revealed', () => {
    const p = race({ topics: { t: topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }] }) }, topicOrder: ['t'] });
    const info = deriveProgressState(p, 4);
    expect(info.state).toBe('in-progress');
    expect(info.doneTopics).toBe(0);            // topic is scorable but not fully judged
    expect(info.selectedScorableTopics).toBe(1); // one scorable topic, selected via topicOrder fallback
  });

  it('selectedScorableTopics counts only scorable topics in selectedTopicKeys', () => {
    const a = topic({ topicKey: 'a', quotesToEvaluate: [q('1','x'), q('2','y')] });
    const b = topic({ topicKey: 'b', quotesToEvaluate: [q('3','x'), q('4','y')] });
    const p = race({
      topics: { a, b },
      topicOrder: ['a', 'b'],
      selectedTopicKeys: ['a'], // only topic a selected
    });
    const info = deriveProgressState(p, 2);
    expect(info.selectedScorableTopics).toBe(1); // b is scorable but not selected
  });

  it('counts a scorable topic as done only when every quote is judged', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    const info = deriveProgressState(race({ completed: true, topics: { t: done } }), 1);
    expect(info.doneTopics).toBe(1);
  });

  it('does not count a single-candidate topic as a scorable done topic', () => {
    const oneVoice = topic({ quotesToEvaluate: [q('1','a'), q('2','a')], disagreed: [q('1','a'), q('2','a')] });
    expect(deriveProgressState(race({ completed: true, topics: { t: oneVoice } }), 0).doneTopics).toBe(0);
  });

  it('complete when revealed and every live scorable topic is done', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    expect(deriveProgressState(race({ completed: true, topics: { t: done } }), 1).state).toBe('complete');
  });

  it('in-progress (not partial) when a partial ballot was revealed but topics remain', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    // Live count is 2 but only one topic is done -> the race is still in-progress and
    // invites the user back (revealing no longer marks the race complete).
    expect(deriveProgressState(race({ topics: { t: done } }), 2).state).toBe('in-progress');
  });

  it('complete is derived from topics, ignoring a stale completed flag', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    // Old data may carry completed:true after only one topic; completion is now
    // derived purely from topics vs the live rankable count.
    expect(deriveProgressState(race({ completed: true, topics: { t: done } }), 3).state).toBe('in-progress');
  });
});

describe('progressLabel', () => {
  const base = { doneTopics: 0, liveScorableTopics: 0, selectedScorableTopics: 0 };

  it('not-started -> null', () => {
    expect(progressLabel({ ...base, state: 'not-started', liveScorableTopics: 3, selectedScorableTopics: 3 })).toBeNull();
  });
  it('in-progress with topics remaining -> Continue · N of M topics', () => {
    expect(progressLabel({ ...base, state: 'in-progress', doneTopics: 2, liveScorableTopics: 4, selectedScorableTopics: 4 }))
      .toBe('Continue · 2 of 4 topics');
  });
  it('in-progress label always counts against all live rankable topics', () => {
    expect(progressLabel({ ...base, state: 'in-progress', doneTopics: 3, liveScorableTopics: 4, selectedScorableTopics: 3 }))
      .toBe('Continue · 3 of 4 topics');
  });
  it('in-progress with zero scorable topics -> null (no "0 of 0")', () => {
    expect(progressLabel({ ...base, state: 'in-progress' })).toBeNull();
  });
  it('partial -> Ranked N of M', () => {
    expect(progressLabel({ ...base, state: 'partial', doneTopics: 2, liveScorableTopics: 4, selectedScorableTopics: 2 }))
      .toBe('Ranked 2 of 4');
  });
  it('complete -> Completed', () => {
    expect(progressLabel({ ...base, state: 'complete', doneTopics: 4, liveScorableTopics: 4, selectedScorableTopics: 4 }))
      .toBe('Completed');
  });
});

describe('isRaceComplete', () => {
  const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });

  it('true only when every live rankable topic is done', () => {
    expect(isRaceComplete(race({ topics: { t: done }, topicOrder: ['t'] }), 1)).toBe(true);
    expect(isRaceComplete(race({ topics: { t: done }, topicOrder: ['t'] }), 3)).toBe(false);
  });

  it('false for an untouched or missing race', () => {
    expect(isRaceComplete(undefined, 3)).toBe(false);
  });
});
