import type { RankedQuote } from '../store/useReadRankStore';

/**
 * Returns a canonical pair key by sorting the two IDs and joining with '-'.
 * This ensures a consistent key regardless of which ID is passed first.
 * Example: makePairKey("b", "a") returns "a-b"
 */
export function makePairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join('-');
}

/**
 * Returns all pending (uncompleted) matchup pairs from the agreed quotes list.
 * Iterates all i < j pairs, checks against completedPairKeys, and returns
 * uncompleted pairs as [idA, idB] tuples in canonical (sorted) order.
 */
export function getPendingMatchups(
  agreed: RankedQuote[],
  completedPairKeys: string[]
): [string, string][] {
  const completedSet = new Set(completedPairKeys);
  const pending: [string, string][] = [];

  for (let i = 0; i < agreed.length; i++) {
    for (let j = i + 1; j < agreed.length; j++) {
      const key = makePairKey(agreed[i].id, agreed[j].id);
      if (!completedSet.has(key)) {
        // Return in canonical (sorted) order
        const [first, second] = [agreed[i].id, agreed[j].id].sort();
        pending.push([first, second]);
      }
    }
  }

  return pending;
}

/**
 * Reranks agreed quotes by win count descending.
 * Ties are broken by timestamp ascending (earlier agree wins).
 * Returns a new array with sequential rank fields (1-based).
 */
export function computeRankings(
  rankedQuotes: RankedQuote[],
  wins: Record<string, number>
): RankedQuote[] {
  const sorted = [...rankedQuotes].sort((a, b) => {
    const winsA = wins[a.id] ?? 0;
    const winsB = wins[b.id] ?? 0;
    if (winsB !== winsA) return winsB - winsA; // descending wins
    return a.timestamp - b.timestamp; // ascending timestamp (earlier = higher rank)
  });

  return sorted.map((q, i) => ({ ...q, rank: i + 1 }));
}
