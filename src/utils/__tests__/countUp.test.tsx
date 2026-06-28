import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { countUpValue, useCountUp } from '../countUp';

describe('countUpValue', () => {
  it('returns the target immediately for a non-positive duration', () => {
    expect(countUpValue(5, 0, 0)).toBe(5);
    expect(countUpValue(5, 0, -10)).toBe(5);
  });

  it('ramps 0 → target linearly and rounds', () => {
    expect(countUpValue(10, 0, 100)).toBe(0);
    expect(countUpValue(10, 50, 100)).toBe(5);
    expect(countUpValue(10, 100, 100)).toBe(10);
  });

  it('clamps past the end and before the start', () => {
    expect(countUpValue(10, 999, 100)).toBe(10);
    expect(countUpValue(10, -5, 100)).toBe(0);
  });
});

describe('useCountUp', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the target instantly when reduced', () => {
    const { result } = renderHook(() => useCountUp(7, { durationMs: 400, reduced: true }));
    expect(result.current).toBe(7);
  });

  it('starts at 0 and reaches the target after the duration elapses', () => {
    const { result } = renderHook(() => useCountUp(8, { durationMs: 300, reduced: false }));
    expect(result.current).toBe(0);
    // advance past durationMs (300) so the final clamped tick fires and the interval clears
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe(8);
  });
});
