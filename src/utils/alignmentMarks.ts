import type { RevealQuote } from '../data/api';

/** How a candidate's quote on a topic is marked at the reveal. null = not judged. */
export type AlignmentMark =
  | { kind: 'rank'; rank: number } // ranks 1-3 (a "pick")
  | { kind: 'agreed' }             // supported, rank >= 4 or unranked
  | { kind: 'disagreed' }
  | null;

/** Reduce a candidate's quotes on one topic to a single mark (best wins). */
export function markForQuotes(quotes: RevealQuote[]): AlignmentMark {
  let bestRank = Infinity;
  let sawSupported = false;
  let sawDisagreed = false;
  for (const quote of quotes) {
    if (quote.supported) {
      sawSupported = true;
      if (quote.rank != null && quote.rank < bestRank) bestRank = quote.rank;
    } else {
      sawDisagreed = true;
    }
  }
  if (sawSupported) {
    if (bestRank <= 3) return { kind: 'rank', rank: bestRank };
    return { kind: 'agreed' };
  }
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
