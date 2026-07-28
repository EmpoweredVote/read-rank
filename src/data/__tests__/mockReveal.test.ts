import { describe, it, expect } from 'vitest';
import { buildMockReveal, buildMockRacePayload } from '../mockData';
import type { VerdictRecord } from '../../store/useReadRankStore';

// Derive fixtures from the mock payload rather than hardcoding ids, so these
// tests survive edits to the mock quote set.
const payload = buildMockRacePayload();
const allQuotes = payload.topics.flatMap((t) => t.quotes);
const tokens = [...new Set(allQuotes.map((q) => q.candidateToken))];

function verdict(quoteId: string, supported: boolean, rank: number | null): VerdictRecord {
  return { quote_id: quoteId, supported, rank, session_size: allQuotes.length };
}

describe('buildMockReveal inclusion rule', () => {
  // Several cases below need one candidate to agree with and another to reject.
  // Assert the fixture can support that, so trimming the mock roster fails here
  // with an obvious message rather than as a confusing ballot-count mismatch.
  it('has a fixture with at least two candidates', () => {
    expect(tokens.length).toBeGreaterThanOrEqual(2);
  });

  it('returns every judged candidate unranked when nothing was agreed', () => {
    const verdicts = allQuotes.map((q) => verdict(q.id, false, null));
    const result = buildMockReveal(verdicts);

    expect(result.ballot.length).toBe(tokens.length);
    expect(result.ballot.every((e) => e.rank === null)).toBe(true);
    expect(result.ballot.every((e) => e.evidence.agreementCount === 0)).toBe(true);
  });

  it('includes a candidate the user only disagreed with, unranked, alongside ranked ones', () => {
    const agreedToken = tokens[0];
    const disagreedOnly = tokens[1];
    const relevant = allQuotes.filter((q) =>
      q.candidateToken === agreedToken || q.candidateToken === disagreedOnly
    );
    let rank = 1;
    const verdicts = relevant.map((q) =>
      q.candidateToken === agreedToken ? verdict(q.id, true, rank++) : verdict(q.id, false, null)
    );

    const result = buildMockReveal(verdicts);
    const ranked = result.ballot.filter((e) => e.rank != null);
    const unranked = result.ballot.filter((e) => e.rank == null);

    expect(ranked.length).toBe(1);
    expect(unranked.length).toBe(1);
    expect(unranked[0].evidence.agreementCount).toBe(0);
    // The unranked candidate still carries their quotes, with provenance.
    expect(unranked[0].perTopic.flatMap((t) => t.quotes).length).toBeGreaterThan(0);
    expect(unranked[0].perTopic.flatMap((t) => t.quotes).every((q) => q.supported === false)).toBe(true);
  });

  it('puts ranked candidates before unranked ones', () => {
    const agreedToken = tokens[0];
    let rank = 1;
    const verdicts = allQuotes.map((q) =>
      q.candidateToken === agreedToken ? verdict(q.id, true, rank++) : verdict(q.id, false, null)
    );
    const result = buildMockReveal(verdicts);

    const firstUnranked = result.ballot.findIndex((e) => e.rank == null);
    const lastRanked = result.ballot.map((e) => e.rank != null).lastIndexOf(true);
    expect(lastRanked).toBeLessThan(firstUnranked);
  });

  it('excludes candidates the user never judged', () => {
    const onlyToken = tokens[0];
    const verdicts = allQuotes
      .filter((q) => q.candidateToken === onlyToken)
      .map((q, i) => verdict(q.id, true, i + 1));
    const result = buildMockReveal(verdicts);

    expect(result.ballot.length).toBe(1);
  });
});
