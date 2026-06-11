import type { RevealResult } from '../data/api';
import { tierForIndex, type Tier } from './tiers';

export interface AlignmentTopic {
  key: string;
  title: string;
}

export interface AlignmentRow {
  candidateId: string;
  name: string;
  cells: (Tier | null)[];
}

/**
 * The candidates × topics tier grid (REDESIGN_SPEC §1.6): each cell is the
 * tier the user's ranking gave that candidate's quote on that topic.
 * A candidate may carry several judged quotes on one topic (the type allows
 * it even though the mock has one) — the cell shows the BEST supported tier
 * (lowest agreed position); only if no supported quote ranked does a
 * disagreed quote mark the cell iron; nothing judged → null.
 */
export function buildAlignmentGrid(
  reveal: RevealResult,
  agreedIds: string[],
  topics: AlignmentTopic[]
): AlignmentRow[] {
  return reveal.ballot.map((entry) => {
    const byTopic = new Map(entry.perTopic.map((t) => [t.topicKey, t]));
    const cells = topics.map((topic) => {
      const quotes = byTopic.get(topic.key)?.quotes ?? [];
      if (quotes.length === 0) return null;

      let bestPosition = -1;
      let sawDisagreed = false;
      for (const quote of quotes) {
        if (!quote.supported) {
          sawDisagreed = true;
          continue;
        }
        const position = agreedIds.indexOf(quote.quoteId);
        if (position === -1) continue;
        if (bestPosition === -1 || position < bestPosition) bestPosition = position;
      }
      if (bestPosition !== -1) return tierForIndex(bestPosition);
      if (sawDisagreed) return 'iron' as Tier;
      return null;
    });
    return { candidateId: entry.candidateId, name: entry.name, cells };
  });
}
