import { describe, it, expect } from 'vitest';
import { computeRevealTimeline } from '../revealTimeline';
import { DUR, STAGGER } from '../../motion';

describe('computeRevealTimeline', () => {
  it('collapses every value to 0 when reduced', () => {
    const t = computeRevealTimeline({ filledCells: 12, reduced: true });
    expect(t.heading).toBe(0);
    expect(t.insight).toBe(0);
    expect(t.gridFrame).toBe(0);
    expect(t.medalsStart).toBe(0);
    expect(t.cascadeStart).toBe(0);
    expect(t.firstLand).toBe(0);
    expect(t.medalDelay(5)).toBe(0);
    expect(t.cardDelay(3)).toBe(0);
  });

  it('orders the stages top-down when not reduced', () => {
    const t = computeRevealTimeline({ filledCells: 6, reduced: false });
    expect(t.heading).toBeLessThan(t.insight);
    expect(t.insight).toBeLessThan(t.gridFrame);
    expect(t.gridFrame).toBeLessThan(t.medalsStart);
    expect(t.medalsStart).toBeLessThan(t.cascadeStart);
    expect(t.cascadeStart).toBeLessThan(t.firstLand);
    expect(t.firstLand - t.cascadeStart).toBe(DUR.moderate);
  });

  it('staggers medals by 90ms and cards by 420ms from their bases', () => {
    const t = computeRevealTimeline({ filledCells: 6, reduced: false });
    expect(t.medalDelay(0)).toBe(t.medalsStart);
    expect(t.medalDelay(2) - t.medalDelay(1)).toBe(STAGGER.gridCell);
    expect(t.cardDelay(0)).toBe(t.cascadeStart);
    expect(t.cardDelay(2) - t.cardDelay(1)).toBe(STAGGER.cascade);
  });

  it('pushes the cascade later when there are more medals to assemble', () => {
    const few = computeRevealTimeline({ filledCells: 1, reduced: false });
    const many = computeRevealTimeline({ filledCells: 20, reduced: false });
    expect(many.cascadeStart).toBeGreaterThan(few.cascadeStart);
  });

  it('treats 0 filled cells as 1 so the cascade still starts', () => {
    const t = computeRevealTimeline({ filledCells: 0, reduced: false });
    expect(Number.isFinite(t.cascadeStart)).toBe(true);
    expect(t.cascadeStart).toBeGreaterThan(t.medalsStart);
  });
});
