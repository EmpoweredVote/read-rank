import { DUR, STAGGER } from '../motion';

/**
 * Absolute (ms-from-results-mount) delays for each stage of the reveal
 * choreography. Derived purely from how many medals must assemble, so the
 * candidate cascade always begins after the grid finishes building. When the
 * user prefers reduced motion every value collapses to 0 (render-at-once).
 */
export interface RevealTimeline {
  /** Position heading enters. */
  heading: number;
  /** Insight strip rises into place. */
  insight: number;
  /** Alignment-grid frame settles in. */
  gridFrame: number;
  /** First medal pops (frame already settled). */
  medalsStart: number;
  /** Candidate card #1 begins its landing. */
  cascadeStart: number;
  /** #1 spotlight + particle burst fire (card #1 has landed). */
  firstLand: number;
  /** Delay for the medal at filled-cell order index `i` (0-based). */
  medalDelay(i: number): number;
  /** Delay for the candidate card at rank index `i` (0-based). */
  cardDelay(i: number): number;
}

export function computeRevealTimeline(opts: {
  filledCells: number;
  reduced: boolean;
}): RevealTimeline {
  if (opts.reduced) {
    const zero = () => 0;
    return {
      heading: 0, insight: 0, gridFrame: 0, medalsStart: 0,
      cascadeStart: 0, firstLand: 0, medalDelay: zero, cardDelay: zero,
    };
  }

  const heading = 0;
  const insight = 120;
  const gridFrame = insight + DUR.moderate;          // frame settles after insight lands
  const medalsStart = gridFrame + DUR.base;          // then medals begin popping
  const cells = Math.max(opts.filledCells, 1);
  const medalsEnd = medalsStart + (cells - 1) * STAGGER.gridCell + DUR.moderate;
  const cascadeStart = medalsEnd + 120;              // small breath, then candidates
  const firstLand = cascadeStart + DUR.moderate;     // #1 has visibly landed

  return {
    heading, insight, gridFrame, medalsStart, cascadeStart, firstLand,
    medalDelay: (i) => medalsStart + i * STAGGER.gridCell,
    cardDelay: (i) => cascadeStart + i * STAGGER.cascade,
  };
}
