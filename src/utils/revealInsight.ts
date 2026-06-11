import type { RevealResult } from '../data/api';
import type { AgreedQuote } from '../store/useReadRankStore';

export interface QuoteIdentity {
  candidateId: string;
  name: string;
  office: string;
  photo: string;
  essentialsUrl: string;
  sourceName?: string;
  sourceUrl?: string;
}

/**
 * quoteId → candidate identity, derived from the reveal payload. Every agreed
 * quote is covered: candidates earn a ballot entry by having at least one
 * supported verdict, and their perTopic lists carry all judged quotes.
 */
export function buildQuoteIdentityMap(reveal: RevealResult): Map<string, QuoteIdentity> {
  const map = new Map<string, QuoteIdentity>();
  for (const entry of reveal.ballot) {
    for (const topic of entry.perTopic) {
      for (const q of topic.quotes) {
        map.set(q.quoteId, {
          candidateId: entry.candidateId,
          name: entry.name,
          office: entry.office,
          photo: entry.photo,
          essentialsUrl: entry.essentialsUrl,
          sourceName: q.sourceName,
          sourceUrl: q.sourceUrl,
        });
      }
    }
  }
  return map;
}

/**
 * One evidence-toned sentence about the user's top picks (REDESIGN_SPEC §1.4
 * step 4). Returns null when there is nothing to say.
 */
export function buildInsightSentence(
  agreed: AgreedQuote[],
  identities: Map<string, QuoteIdentity>
): string | null {
  const top = agreed.slice(0, 3).map((q) => identities.get(q.id)).filter(Boolean) as QuoteIdentity[];
  if (top.length === 0) return null;
  if (top.length < 3) return `Your top pick came from ${top[0].name}.`;

  const names = top.map((c) => c.name);
  const unique = new Set(names);
  if (unique.size === 1) {
    return `All three of your top picks came from one candidate: ${names[0]}.`;
  }
  if (unique.size === 3) {
    return 'Your top three choices came from three different candidates.';
  }
  const majority = names.find((n) => names.filter((m) => m === n).length === 2)!;
  return `Two of your top three picks came from ${majority}.`;
}
