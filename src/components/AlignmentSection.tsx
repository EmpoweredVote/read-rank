import React, { useMemo } from 'react';
import type { RevealResult } from '../data/api';
import { buildAlignmentGrid, type AlignmentTopic } from '../utils/alignmentGrid';
import { AlignmentGrid } from './AlignmentGrid';

export interface AlignmentSectionProps {
  reveal: RevealResult;
  topics: AlignmentTopic[];
  rankMap: Map<string, number>;
  /** Passed through to the table for the reveal choreography. */
  animate?: boolean;
  frameDelayMs?: number;
  cellBaseDelayMs?: number;
}

/** Label + the full-width alignment table (it stacks itself when it can't fit). */
export const AlignmentSection: React.FC<AlignmentSectionProps> = ({
  reveal, topics, rankMap, animate, frameDelayMs, cellBaseDelayMs,
}) => {
  const rows = useMemo(() => buildAlignmentGrid(reveal, topics, rankMap), [reveal, topics, rankMap]);
  if (topics.length === 0 || rows.length === 0) return null;
  return (
    <section className="glance" aria-labelledby="glance-title">
      <h2 className="alignment-section-label" id="glance-title">Your alignment at a glance</h2>
      <AlignmentGrid topics={topics} rows={rows} animate={animate} frameDelayMs={frameDelayMs} cellBaseDelayMs={cellBaseDelayMs} />
    </section>
  );
};
