import React, { createContext, useContext, useMemo } from 'react';
import { useReadRankStore, type AgreedQuote, type BlindQuote } from '../store/useReadRankStore';

/** The data + callbacks the ranking surface needs, independent of where they
 *  come from (a real race topic, or the practice slice). */
export interface RankSource {
  agreed: AgreedQuote[];
  disagreed: BlindQuote[];
  reorder: (orderedIds: string[]) => void;
  reAgree: (quote: BlindQuote) => void;
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
  const { getCurrentTopicProgress, reorderAgreed, reAgree } = useReadRankStore();
  const topic = getCurrentTopicProgress();
  return useMemo(
    () => ({
      agreed: topic?.agreed ?? [],
      disagreed: topic?.disagreed ?? [],
      reorder: reorderAgreed,
      reAgree,
    }),
    [topic?.agreed, topic?.disagreed, reorderAgreed, reAgree]
  );
}

/** Provider that feeds the ranking components from the real-race store. Later
 *  tasks use it to wrap the leaf ranking components (RankRail/RankSheet) in
 *  their tests, and EvaluationPhase builds the same source via useRaceRankSource. */
export const RaceRankSourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RankSourceProvider value={useRaceRankSource()}>{children}</RankSourceProvider>
);
