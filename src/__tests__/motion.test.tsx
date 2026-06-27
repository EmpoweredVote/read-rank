import { describe, it, expect, afterAll, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { EASE, DUR, STAGGER, SPRING_REORDER, useMotion } from '../motion';

const motionMock = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => motionMock.reduced };
});

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

function setReducedMotion(on: boolean) {
  motionMock.reduced = on;
}

describe('useMotion — normal motion', () => {
  it('returns real durations, curves, transforms and hover/tap', () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useMotion());
    const m = result.current;
    expect(m.reduced).toBe(false);
    expect(m.dur(DUR.moderate)).toBe(400);
    expect(m.ease(EASE.settle)).toEqual(EASE.settle);
    expect(m.transition(DUR.moderate)).toMatchObject({ duration: 0.4, ease: EASE.settle });
    expect(m.spring()).toEqual(SPRING_REORDER);
    expect(m.enter({ y: 24 }).initial).toEqual({ opacity: 0, y: 24 });
    expect(m.enter({ y: 24 }).animate).toEqual({ opacity: 1, y: 0 });
    expect(m.hover({ scale: 1.03 })).toEqual({ scale: 1.03 });
    expect(m.tap({ scale: 0.97 })).toEqual({ scale: 0.97 });
  });
});

describe('useMotion — reduced motion', () => {
  it('collapses durations, curves, transforms and hover/tap', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useMotion());
    const m = result.current;
    expect(m.reduced).toBe(true);
    expect(m.dur(DUR.moderate)).toBe(0);
    expect(m.ease(EASE.settle)).toBe('linear');
    expect(m.transition(DUR.moderate)).toMatchObject({ duration: 0, ease: 'linear' });
    expect(m.spring()).toEqual({ duration: 0 });
    expect(m.enter({ y: 24 }).initial).toBe(false);
    expect(m.enter({ y: 24 }).animate).toEqual({ opacity: 1, y: 0 });
    expect(m.hover({ scale: 1.03 })).toBeUndefined();
    expect(m.tap({ scale: 0.97 })).toBeUndefined();
  });
});

afterAll(() => setReducedMotion(false));
