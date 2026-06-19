import { describe, it, expect } from 'vitest';
import { deriveProgressState } from '../raceProgressState';
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
    const p = race({ topics: { t: topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }] }) } });
    expect(deriveProgressState(p, 4).state).toBe('in-progress');
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

  it('partial when revealed but a live scorable topic remains undone', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    // Live count is 2 but only one topic was finished -> partial (skipped or newly added).
    expect(deriveProgressState(race({ completed: true, topics: { t: done } }), 2).state).toBe('partial');
  });
});
