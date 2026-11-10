import { describe, it, expect } from 'vitest';
import { computeRevealTimeline, MAX_CELL_SPAN, MAX_CARD_SPAN } from '../revealTimeline';
import { DUR, STAGGER } from '../../motion';

describe('computeRevealTimeline', () => {
  it('collapses every value to 0 when reduced', () => {
    const t = computeRevealTimeline({ filledCells: 12, cards: 4, reduced: true });
    expect(t.gridFrame).toBe(0);
    expect(t.cellsStart).toBe(0);
    expect(t.cascadeStart).toBe(0);
    expect(t.firstLand).toBe(0);
    expect(t.cellDelay(5)).toBe(0);
    expect(t.cardDelay(3)).toBe(0);
    expect(t.actionsDelay).toBe(0);
  });

  it('orders the stages top-down when not reduced', () => {
    const t = computeRevealTimeline({ filledCells: 6, cards: 4, reduced: false });
    expect(t.gridFrame).toBeLessThan(t.cellsStart);
    expect(t.cellsStart).toBeLessThan(t.cascadeStart);
    expect(t.cascadeStart).toBeLessThan(t.firstLand);
    expect(t.firstLand - t.cascadeStart).toBe(DUR.moderate);
  });

  it('staggers cells by 90ms and cards by 420ms from their bases', () => {
    const t = computeRevealTimeline({ filledCells: 6, cards: 4, reduced: false });
    expect(t.cellDelay(0)).toBe(t.cellsStart);
    expect(t.cellDelay(2) - t.cellDelay(1)).toBe(STAGGER.gridCell);
    expect(t.cardDelay(0)).toBe(t.cascadeStart);
    expect(t.cardDelay(2) - t.cardDelay(1)).toBe(STAGGER.cascade);
  });

  it('pushes the cascade later when there are more cells to assemble', () => {
    const few = computeRevealTimeline({ filledCells: 1, cards: 4, reduced: false });
    const many = computeRevealTimeline({ filledCells: 20, cards: 4, reduced: false });
    expect(many.cascadeStart).toBeGreaterThan(few.cascadeStart);
  });

  it('treats 0 filled cells as 1 so the cascade still starts', () => {
    const t = computeRevealTimeline({ filledCells: 0, cards: 4, reduced: false });
    expect(Number.isFinite(t.cascadeStart)).toBe(true);
    expect(t.cascadeStart).toBeGreaterThan(t.cellsStart);
  });

  it('shows the bottom actions as card #1 lands, not after the full cascade', () => {
    const t = computeRevealTimeline({ filledCells: 12, cards: 4, reduced: false });
    expect(t.actionsDelay).toBe(t.firstLand);
    expect(t.actionsDelay).toBeLessThan(t.cardDelay(3));
  });

  it('compresses big races so the reveal and the actions stay short', () => {
    const t = computeRevealTimeline({ filledCells: 80, cards: 8, reduced: false });
    expect(t.cellDelay(79) - t.cellDelay(0)).toBeCloseTo(MAX_CELL_SPAN);
    expect(t.cardDelay(7) - t.cardDelay(0)).toBeCloseTo(MAX_CARD_SPAN);
    expect(t.actionsDelay).toBeLessThanOrEqual(3000);
    expect(t.cardDelay(7) + DUR.moderate).toBeLessThanOrEqual(4200);
  });

  it('keeps small races at the full stagger', () => {
    const t = computeRevealTimeline({ filledCells: 12, cards: 4, reduced: false });
    expect(t.cellDelay(1) - t.cellDelay(0)).toBe(STAGGER.gridCell);
    expect(t.cardDelay(1) - t.cardDelay(0)).toBe(STAGGER.cascade);
  });
});
