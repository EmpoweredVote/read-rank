import React from 'react';
import type { BallotEntry } from '../data/api';
import { markForQuotes, markStrength } from '../utils/alignmentMarks';
import { QuoteBlock } from './QuoteBlock';

export interface QuoteDrawerProps {
  entry: BallotEntry;
}

/** Per-topic quote blocks, sorted strongest-first, including disagreed (spec §5). */
export const QuoteDrawer: React.FC<QuoteDrawerProps> = ({ entry }) => {
  const topics = entry.perTopic
    .map((t) => ({ topic: t, mark: markForQuotes(t.quotes) }))
    .filter((t) => t.mark != null)
    .sort((a, b) => markStrength(a.mark) - markStrength(b.mark));
  return (
    <div className="quote-drawer">
      {topics.map(({ topic, mark }) => {
        // Show the strongest quote for the topic (best supported, else the disagreed one).
        const quote = [...topic.quotes].sort((a, b) =>
          (a.supported ? (a.rank ?? 99) : 999) - (b.supported ? (b.rank ?? 99) : 999))[0];
        return <QuoteBlock key={topic.topicKey} topicTitle={topic.title} quote={quote} mark={mark} />;
      })}
    </div>
  );
};
