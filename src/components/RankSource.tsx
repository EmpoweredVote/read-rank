import React from 'react';
import { RankSourceProvider, useRaceRankSource } from './rankSourceContext';

/** Provider that feeds the ranking components from the real-race store. Later
 *  tasks use it to wrap the leaf ranking components (RankRail/RankSheet) in
 *  their tests, and EvaluationPhase builds the same source via useRaceRankSource. */
export const RaceRankSourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RankSourceProvider value={useRaceRankSource()}>{children}</RankSourceProvider>
);
