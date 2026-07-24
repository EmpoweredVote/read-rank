import React, { createContext, useContext, useMemo } from 'react';
import { useReadRankStore, type AgreedQuote, type BlindQuote } from '../store/useReadRankStore';

/** The data + callbacks the ranking surface needs, independent of where they
 *  come from (a real race topic, or the practice slice). */
export interface RankSource {
  agreed: AgreedQuote[];
  disagreed: BlindQuote[];
  reorder: (orderedIds: string[]) => void;
  /** Undefined for sources that never show ties (e.g. the practice round). */
  toggleTie?: (id: string) => void;
  reAgree: (quote: BlindQuote) => void;
  /** Leading N of `agreed` are ranked; the rest are unranked "also agree".
   *  Undefined when there's no current topic — callers fall back to `agreed.length`. */
  rankedCount?: number;
  /** Undefined for sources that never show truncation (e.g. the practice round). */
  setRankedCount?: (n: number) => void;
}

const RankSourceContext = createContext<RankSource | null>(null);

export const RankSourceProvider = RankSourceContext.Provider;

/** Consume the current RankSource. Throws if no provider is mounted so a missing
 *  wiring fails loudly rather than silently rendering an empty ranking. */
export function useRankSource(): RankSource {
  const source = useContext(RankSourceContext);
  if (!source) throw new Error('useRankSource must be used within a RankSourceProvider');
  return source;
}

/** Build a RankSource from the current race's active topic. */
export function useRaceRankSource(): RankSource {
  const { getCurrentTopicProgress, reorderAgreed, toggleTie, reAgree, setRankedCount } = useReadRankStore();
  const topic = getCurrentTopicProgress();
  return useMemo(
    () => ({
      agreed: topic?.agreed ?? [],
      // Per-topic, like `agreed`: each topic owns its own ranking. Disagreed quotes
      // must not bleed across topics — the next topic starts with an empty pile.
      disagreed: topic?.disagreed ?? [],
      reorder: reorderAgreed,
      toggleTie,
      reAgree,
      rankedCount: topic?.rankedCount,
      setRankedCount,
    }),
    [topic?.agreed, topic?.disagreed, topic?.rankedCount, reorderAgreed, toggleTie, reAgree, setRankedCount]
  );
}

/** Provider that feeds the ranking components from the real-race store. Later
 *  tasks use it to wrap the leaf ranking components (RankRail/RankSheet) in
 *  their tests, and EvaluationPhase builds the same source via useRaceRankSource. */
export const RaceRankSourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RankSourceProvider value={useRaceRankSource()}>{children}</RankSourceProvider>
);
