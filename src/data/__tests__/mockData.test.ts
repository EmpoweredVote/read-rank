import { describe, it, expect } from 'vitest';
import { buildMockRacePayload, buildMockReveal } from '../mockData';
import type { VerdictRecord } from '../../store/useReadRankStore';

describe('structural blindness and anti-partisanship', () => {
  it('blind payload quotes expose ONLY id, text, candidateToken, topicKey', () => {
    const payload = buildMockRacePayload();
    expect(payload.topics.length).toBeGreaterThan(0);
    for (const topic of payload.topics) {
      for (const quote of topic.quotes) {
        expect(Object.keys(quote).sort()).toEqual(['candidateToken', 'id', 'text', 'topicKey']);
      }
    }
  });

  it('reveal ballot entries carry no party field', () => {
    const payload = buildMockRacePayload();
    const verdicts: VerdictRecord[] = payload.topics.flatMap((t) =>
      t.quotes.map((q, i) => ({ quote_id: q.id, supported: true, rank: i + 1, session_size: 4 }))
    );
    const reveal = buildMockReveal(verdicts);
    expect(reveal.ballot.length).toBeGreaterThan(0);
    for (const entry of reveal.ballot) {
      expect(entry).not.toHaveProperty('party');
    }
  });

  it('reveal quotes DO carry source attribution', () => {
    const payload = buildMockRacePayload();
    const verdicts: VerdictRecord[] = payload.topics.flatMap((t) =>
      t.quotes.map((q, i) => ({ quote_id: q.id, supported: true, rank: i + 1, session_size: 4 }))
    );
    const reveal = buildMockReveal(verdicts);
    const allQuotes = reveal.ballot.flatMap((b) => b.perTopic.flatMap((t) => t.quotes));
    expect(allQuotes.length).toBeGreaterThan(0);
    for (const q of allQuotes) {
      expect(q.sourceName).toBeTruthy();
      expect(q.sourceUrl).toMatch(/^https?:\/\//);
    }
  });
});
