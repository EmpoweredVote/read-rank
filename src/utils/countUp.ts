import { useEffect, useRef, useState } from 'react';

/** Value at `elapsed` ms into a `duration` ms linear ramp from 0 to `target`. */
export function countUpValue(target: number, elapsed: number, duration: number): number {
  if (duration <= 0) return target;
  const p = Math.min(1, Math.max(0, elapsed / duration));
  return Math.round(target * p);
}

/**
 * Animates 0 → `target` over `durationMs` using timer steps (NOT
 * requestAnimationFrame — the headless preview throttles rAF). Returns the
 * final value immediately when reduced or when the duration is non-positive.
 */
export function useCountUp(
  target: number,
  opts: { durationMs: number; reduced: boolean; startDelayMs?: number }
): number {
  const { durationMs, reduced, startDelayMs = 0 } = opts;
  const [value, setValue] = useState(reduced || durationMs <= 0 ? target : 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduced || durationMs <= 0) {
      return;
    }
    const step = 30;
    let elapsed = 0;
    const startTimer = setTimeout(() => {
      // useState(0) seeds the start; on a deps re-run the first interval tick (≤30ms) overwrites any stale value — fine for a count that animates once on landing.
      intervalRef.current = setInterval(() => {
        elapsed += step;
        setValue(countUpValue(target, elapsed, durationMs));
        if (elapsed >= durationMs && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, step);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [target, durationMs, reduced, startDelayMs]);

  return value;
}
