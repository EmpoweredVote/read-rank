import type { RevealResult } from '../data/api';
import { tierForIndex, type Tier } from './tiers';

export interface AlignmentTopic {
  key: string;
  title: string;
}

export interface AlignmentRow {
  name: string;
  cells: (Tier | null)[];
}

/**
 * The candidates × topics tier grid (REDESIGN_SPEC §1.6): each cell is the
 * tier the user's ranking gave that candidate's quote on that topic.
 * Supported → positional tier; disagreed → iron; unjudged/absent → null.
 */
export function buildAlignmentGrid(
  reveal: RevealResult,
  agreedIds: string[],
  topics: AlignmentTopic[]
): AlignmentRow[] {
  return reveal.ballot.map((entry) => {
    const byTopic = new Map(entry.perTopic.map((t) => [t.topicKey, t]));
    const cells = topics.map((topic) => {
      const t = byTopic.get(topic.key);
      const quote = t?.quotes[0];
      if (!quote) return null;
      if (!quote.supported) return 'iron' as Tier;
      const position = agreedIds.indexOf(quote.quoteId);
      if (position === -1) return null;
      return tierForIndex(position);
    });
    return { name: entry.name, cells };
  });
}
