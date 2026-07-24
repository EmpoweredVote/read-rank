import type { RevealQuote, RevealResult } from '../data/api';

/** How a candidate's quote on a topic is marked at the reveal. null = not judged. */
export type AlignmentMark =
  | { kind: 'rank'; rank: number } // ranks 1-3 (a "pick")
  | { kind: 'agreed' }             // supported, rank >= 4 or unranked
  | { kind: 'disagreed' }
  | null;

/** quoteId → the quote's rank WITHIN its topic (1-based). Derived from the reveal:
 *  global ranks preserve per-topic order, so per topic we sort agreed quotes by
 *  global rank and assign standard/competition ranking — equal global ranks share
 *  the same per-topic number, and the next distinct rank jumps by the tie size
 *  (e.g. global 1,1,3 → per-topic 1,1,3). Disagreed/unranked quotes are omitted. */
export function buildPerTopicRankMap(reveal: RevealResult): Map<string, number> {
  const byTopic = new Map<string, { quoteId: string; rank: number }[]>();
  for (const entry of reveal.ballot) {
    for (const t of entry.perTopic) {
      for (const q of t.quotes) {
        if (!q.supported || q.rank == null) continue;
        const arr = byTopic.get(t.topicKey) ?? [];
        arr.push({ quoteId: q.quoteId, rank: q.rank });
        byTopic.set(t.topicKey, arr);
      }
    }
  }
  const map = new Map<string, number>();
  for (const arr of byTopic.values()) {
    arr.sort((a, b) => a.rank - b.rank);
    let perTopic = 0;
    let consumed = 0;
    let prevGlobal: number | null = null;
    for (const q of arr) {
      if (prevGlobal === null || q.rank !== prevGlobal) perTopic = consumed + 1;
      map.set(q.quoteId, perTopic);
      consumed++;
      prevGlobal = q.rank;
    }
  }
  return map;
}

/** Reduce a candidate's quotes on one topic to a single mark, using per-topic ranks. */
export function markForQuotes(quotes: RevealQuote[], rankMap: Map<string, number>): AlignmentMark {
  let bestRank = Infinity;
  let sawSupported = false;
  let sawDisagreed = false;
  for (const quote of quotes) {
    if (quote.supported) {
      sawSupported = true;
      const r = rankMap.get(quote.quoteId);
      if (r != null && r < bestRank) bestRank = r;
    } else {
      sawDisagreed = true;
    }
  }
  if (sawSupported) return bestRank <= 3 ? { kind: 'rank', rank: bestRank } : { kind: 'agreed' };
  if (sawDisagreed) return { kind: 'disagreed' };
  return null;
}

/** Sort key: lower is stronger. Ranks first (by number), then agreed, then disagreed, then null. */
export function markStrength(mark: AlignmentMark): number {
  if (mark == null) return 100;
  if (mark.kind === 'rank') return mark.rank;      // 1,2,3
  if (mark.kind === 'agreed') return 10;
  return 20;                                       // disagreed
}

/** Number of topics where this candidate holds the user's #1 (per-topic rank 1). */
export function countTopPicks(quotes: RevealQuote[], rankMap: Map<string, number>): number {
  return quotes.filter((q) => q.supported && rankMap.get(q.quoteId) === 1).length;
}
