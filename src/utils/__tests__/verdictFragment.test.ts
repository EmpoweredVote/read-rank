import { describe, it, expect } from 'vitest';
import { buildVerdictsForTopic } from '../verdictFragment';
import type { TopicProgress } from '../../store/useReadRankStore';

function makeTopic(): TopicProgress {
  return {
    topicKey: 'topic-1',
    title: 'Topic 1',
    question: 'Some question?',
    quotesToEvaluate: [],
    currentIndex: 0,
    disagreed: [
      { id: 'e', text: 'e text', candidateToken: 'tok-e', topicKey: 'topic-1' },
    ],
    agreed: [
      { id: 'a', text: 'a text', candidateToken: 'tok-a', topicKey: 'topic-1', addedAt: 1 },
      { id: 'b', text: 'b text', candidateToken: 'tok-b', topicKey: 'topic-1', addedAt: 2, tieWithPrev: true },
      { id: 'c', text: 'c text', candidateToken: 'tok-c', topicKey: 'topic-1', addedAt: 3 },
      { id: 'd', text: 'd text', candidateToken: 'tok-d', topicKey: 'topic-1', addedAt: 4 },
    ],
    rankedCount: 3,
  };
}

describe('buildVerdictsForTopic', () => {
  it('derives ranks from ties + truncation instead of array index', () => {
    const records = buildVerdictsForTopic(makeTopic(), 5);
    const byId = Object.fromEntries(records.map((r) => [r.quote_id, r]));

    expect(byId.a.rank).toBe(1);
    expect(byId.b.rank).toBe(1);
    expect(byId.c.rank).toBe(3);
    expect(byId.d.rank).toBeNull();
    expect(byId.e.rank).toBeNull();

    expect(byId.a.supported).toBe(true);
    expect(byId.b.supported).toBe(true);
    expect(byId.c.supported).toBe(true);
    expect(byId.d.supported).toBe(true);
    expect(byId.e.supported).toBe(false);

    for (const r of records) expect(r.session_size).toBe(5);
  });
});
