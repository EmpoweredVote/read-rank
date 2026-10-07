import { DUR, STAGGER } from '../motion';

/**
 * Absolute (ms-from-results-mount) delays for each stage of the reveal
 * choreography. Derived purely from how many grid cells must assemble, so the
 * candidate cascade always begins after the grid finishes building. Big races
 * compress the cell and card staggers so the whole reveal stays short. The
 * bottom actions do not wait for the full cascade: they fade in with the #1
 * landing, so a reader who scrolls down early never meets an empty gap. When the user prefers reduced
 * motion every value collapses to 0 (render-at-once).
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
  /** The bottom actions fade in as card #1 lands (never after the full cascade). */
  actionsDelay: number;
}

/** Longest span the grid cells may take to pop in, first to last. */
export const MAX_CELL_SPAN = 1200;
/** Longest span the candidate cards may take to start landing, first to last. */
export const MAX_CARD_SPAN = 1260;

export function computeRevealTimeline(opts: {
  filledCells: number;
  /** Candidate cards in the cascade (ranked + unranked). */
  cards: number;
  reduced: boolean;
}): RevealTimeline {
  if (opts.reduced) {
    const zero = () => 0;
    return {
      gridFrame: 0, cellsStart: 0, cascadeStart: 0, firstLand: 0,
      cellDelay: zero, cardDelay: zero, actionsDelay: 0,
    };
  }

  const ENTRANCE_OFFSET = 120; // delay before the grid frame enters
  const CASCADE_BREATH = 120;  // gap between last cell and first card

  const gridFrame = ENTRANCE_OFFSET + DUR.moderate;  // frame settles after the band
  const cellsStart = gridFrame + DUR.base;           // then cells begin popping
  const cells = Math.max(opts.filledCells, 1);
  const cellStagger = cells > 1 ? Math.min(STAGGER.gridCell, MAX_CELL_SPAN / (cells - 1)) : 0;
  const cellsEnd = cellsStart + (cells - 1) * cellStagger + DUR.moderate;
  const cascadeStart = cellsEnd + CASCADE_BREATH;    // small breath, then candidates
  const firstLand = cascadeStart + DUR.moderate;     // #1 has visibly landed
  const cards = Math.max(opts.cards, 1);
  const cardStagger = cards > 1 ? Math.min(STAGGER.cascade, MAX_CARD_SPAN / (cards - 1)) : 0;
  const actionsDelay = firstLand;

  return {
    gridFrame, cellsStart, cascadeStart, firstLand,
    cellDelay: (i) => cellsStart + i * cellStagger,
    cardDelay: (i) => cascadeStart + i * cardStagger,
    actionsDelay,
  };
}
