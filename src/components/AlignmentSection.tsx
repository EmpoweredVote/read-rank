import React, { useMemo } from 'react';
import { useMediaQuery } from '@empoweredvote/ev-ui';
import type { RevealResult } from '../data/api';
import { buildAlignmentGrid, type AlignmentTopic } from '../utils/alignmentGrid';
import { AlignmentGrid } from './AlignmentGrid';
import { AlignmentPills } from './AlignmentPills';

export interface AlignmentSectionProps {
  reveal: RevealResult;
  topics: AlignmentTopic[];
  /** Passed through to the matrix for the reveal choreography. */
  animate?: boolean;
  frameDelayMs?: number;
  cellBaseDelayMs?: number;
}

/** Label + responsive matrix (desktop) / pills (mobile). */
export const AlignmentSection: React.FC<AlignmentSectionProps> = ({
  reveal, topics, animate, frameDelayMs, cellBaseDelayMs,
}) => {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const rows = useMemo(() => buildAlignmentGrid(reveal, topics), [reveal, topics]);
  if (topics.length === 0 || rows.length === 0) return null;
  return (
    <section>
      <p className="alignment-section-label">Your alignment at a glance</p>
      {isDesktop ? (
        <AlignmentGrid topics={topics} rows={rows} animate={animate} frameDelayMs={frameDelayMs} cellBaseDelayMs={cellBaseDelayMs} />
      ) : (
        <AlignmentPills reveal={reveal} topics={topics} />
      )}
    </section>
  );
};
