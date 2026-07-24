/**
 * Turn a topic's ordered agreed pile + tie/truncation state into per-quote ranks.
 * - `ids`: agreed quote ids in visual (drag) order.
 * - `tieWithPrev[i]`: true means ids[i] shares the rank of ids[i-1] (ignored at i=0).
 * - `rankedCount`: the first N ids are ranked; ids at index >= N are unranked ("also agree").
 * Standard/competition ranking: after a k-way tie the next fresh rank jumps by k.
 * Returns id -> rank (1-based) or null (unranked).
 */
export function deriveRanks(
  ids: string[],
  tieWithPrev: boolean[],
  rankedCount: number,
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  let currentRank = 0;
  let consumed = 0;
  for (let i = 0; i < ids.length; i++) {
    if (i >= rankedCount) {
      map.set(ids[i], null);
      continue;
    }
    if (i === 0 || !tieWithPrev[i]) {
      currentRank = consumed + 1;
    }
    map.set(ids[i], currentRank);
    consumed++;
  }
  return map;
}
