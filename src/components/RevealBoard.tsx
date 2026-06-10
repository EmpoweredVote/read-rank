import React, { useEffect, useRef, useState } from 'react';
import { RevealCard } from './RevealCard';
import { TIER_META, tierForIndex } from '../utils/tiers';
import type { QuoteIdentity } from '../utils/revealInsight';
import type { AgreedQuote } from '../store/useReadRankStore';

export interface RevealBoardProps {
  agreed: AgreedQuote[];
  identities: Map<string, QuoteIdentity>;
  onAllRevealed: () => void;
}

/**
 * The unmasking board (REDESIGN_SPEC §1.4 steps 2-3): the user's ranking,
 * rendered exactly as the rank rail showed it, unmasked at the user's pace.
 */
export const RevealBoard: React.FC<RevealBoardProps> = ({ agreed, identities, onAllRevealed }) => {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState('');
  const completedRef = useRef(false);

  const visible = agreed.filter((q) => identities.has(q.id));

  useEffect(() => {
    if (!completedRef.current && visible.length > 0 && revealed.size >= visible.length) {
      completedRef.current = true;
      onAllRevealed();
    }
  }, [revealed, visible.length, onAllRevealed]);

  const revealOne = (quote: AgreedQuote, index: number) => {
    const identity = identities.get(quote.id);
    if (!identity) return;
    setRevealed((prev) => {
      if (prev.has(quote.id)) return prev;
      const next = new Set(prev);
      next.add(quote.id);
      return next;
    });
    const meta = TIER_META[tierForIndex(index)];
    setAnnouncement(`${meta.label} revealed: ${identity.name}, ${identity.office}`);
  };

  const revealAll = () => {
    setRevealed(new Set(visible.map((q) => q.id)));
    setAnnouncement('All choices revealed');
  };

  const remaining = visible.length - revealed.size;

  return (
    <div className="reveal-board">
      <div className="reveal-board-header">
        <p className="reveal-board-hint">
          Tap each quote to see who said it.&nbsp; Start anywhere.
        </p>
        {remaining > 0 && (
          <button type="button" className="reveal-board-all" onClick={revealAll}>
            Reveal all
          </button>
        )}
      </div>
      <div className="reveal-board-list">
        {visible.map((q, i) => (
          <RevealCard
            key={q.id}
            quoteText={q.text}
            index={i}
            identity={identities.get(q.id)!}
            revealed={revealed.has(q.id)}
            onReveal={() => revealOne(q, i)}
          />
        ))}
      </div>
      <div className="sr-only" role="status">{announcement}</div>
    </div>
  );
};
