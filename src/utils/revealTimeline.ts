import { DUR, STAGGER } from '../motion';

/**
 * Absolute (ms-from-results-mount) delays for each stage of the reveal
 * choreography. Derived purely from how many grid cells must assemble, so the
 * candidate cascade always begins after the grid finishes building. When the
 * user prefers reduced motion every value collapses to 0 (render-at-once).
 */
export interface RevealTimeline {
  /** Alignment-grid frame settles in. */
  gridFrame: number;
  /** First grid cell pops (frame already settled). */
  cellsStart: number;
  /** Candidate card #1 begins its landing. */
  cascadeStart: number;
  /** #1 spotlight + particle burst fire (card #1 has landed). */
  firstLand: number;
  /** Delay for the grid cell at filled-cell order index `i` (0-based). */
  cellDelay(i: number): number;
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
      gridFrame: 0, cellsStart: 0, cascadeStart: 0, firstLand: 0,
      cellDelay: zero, cardDelay: zero,
    };
  }

  const ENTRANCE_OFFSET = 120; // delay before the grid frame enters
  const CASCADE_BREATH = 120;  // gap between last cell and first card

  const gridFrame = ENTRANCE_OFFSET + DUR.moderate;  // frame settles after the band
  const cellsStart = gridFrame + DUR.base;           // then cells begin popping
  const cells = Math.max(opts.filledCells, 1);
  const cellsEnd = cellsStart + (cells - 1) * STAGGER.gridCell + DUR.moderate;
  const cascadeStart = cellsEnd + CASCADE_BREATH;    // small breath, then candidates
  const firstLand = cascadeStart + DUR.moderate;     // #1 has visibly landed

  return {
    gridFrame, cellsStart, cascadeStart, firstLand,
    cellDelay: (i) => cellsStart + i * STAGGER.gridCell,
    cardDelay: (i) => cascadeStart + i * STAGGER.cascade,
  };
}
