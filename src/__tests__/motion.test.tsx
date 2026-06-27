import { describe, it, expect } from 'vitest';
import { EASE, DUR, STAGGER, SPRING_REORDER } from '../motion';

describe('motion tokens', () => {
  it('exposes the approved easing curves', () => {
    expect(EASE.settle).toEqual([0.22, 1, 0.36, 1]);
    expect(EASE.flight).toEqual([0.45, 0, 0.18, 1]);
    expect(EASE.overshoot).toEqual([0.34, 1.45, 0.6, 1]);
    expect(EASE.standard).toEqual([0.4, 0, 0.2, 1]);
    expect(EASE.burst).toEqual([0.25, 0.46, 0.45, 0.94]);
  });

  it('exposes the approved durations (ms)', () => {
    expect(DUR.instant).toBe(0);
    expect(DUR.fast).toBe(150);
    expect(DUR.base).toBe(250);
    expect(DUR.moderate).toBe(400);
    expect(DUR.flight).toBe(580);
    expect(DUR.burst).toBe(800);
  });

  it('exposes stagger constants and the reorder spring', () => {
    expect(STAGGER.gridCell).toBe(90);
    expect(STAGGER.cascade).toBe(420);
    expect(STAGGER.badge).toBe(80);
    expect(STAGGER.avatar).toBe(140);
    expect(STAGGER.name).toBe(200);
    expect(STAGGER.evidence).toBe(320);
    expect(SPRING_REORDER).toEqual({ type: 'spring', stiffness: 500, damping: 35 });
  });
});
