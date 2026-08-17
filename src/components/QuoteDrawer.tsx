import React from 'react';
import { revealCardKey, type BallotEntry } from '../data/api';
import { markForQuotes, markStrength } from '../utils/alignmentMarks';
import { QuoteBlock } from './QuoteBlock';

export interface QuoteDrawerProps {
  entry: BallotEntry;
  rankMap: Map<string, number>;
}

/** Per-topic quote blocks, sorted strongest-first, including disagreed (spec §5). */
export const QuoteDrawer: React.FC<QuoteDrawerProps> = ({ entry, rankMap }) => {
  const topics = entry.perTopic
    .map((t) => ({ topic: t, mark: markForQuotes(t.quotes, rankMap) }))
    .filter((t) => t.mark != null)
    .sort((a, b) => markStrength(a.mark) - markStrength(b.mark));
  return (
    <div className="quote-drawer">
      {topics.map(({ topic, mark }) => {
        // Show the strongest quote for the topic: supported quotes ranked by per-topic
        // rank (best first), disagreed quotes last.
        const strength = (x: (typeof topic.quotes)[number]) =>
          x.supported ? (rankMap.get(x.quoteId) ?? Number.MAX_SAFE_INTEGER) : Infinity;
        const quote = [...topic.quotes].sort((a, b) => strength(a) - strength(b))[0];
        // Keyed by CARD: two sections of one topic share a topicKey, so a topicKey
        // React key duplicates and one block is dropped.
        return <QuoteBlock key={revealCardKey(topic)} topicTitle={topic.title} quote={quote} mark={mark} />;
      })}
    </div>
  );
};
