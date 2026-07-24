import { describe, it, expect } from 'vitest';
import { deriveRanks } from '../deriveRanks';

// ids in visual order; tie[i] = true means "shares the rank of ids[i-1]".
describe('deriveRanks', () => {
  it('numbers a plain ordered pile 1..N', () => {
    const m = deriveRanks(['a', 'b', 'c'], [false, false, false], 3);
    expect([m.get('a'), m.get('b'), m.get('c')]).toEqual([1, 2, 3]);
  });

  it('gives tied quotes the same rank and skips the consumed number (standard/competition ranking)', () => {
    const m = deriveRanks(['a', 'b', 'c'], [false, true, false], 3);
    expect([m.get('a'), m.get('b'), m.get('c')]).toEqual([1, 1, 3]);
  });

  it('marks quotes beyond rankedCount as unranked (null)', () => {
    const m = deriveRanks(['a', 'b', 'c', 'd'], [false, false, false, false], 2);
    expect([m.get('a'), m.get('b'), m.get('c'), m.get('d')]).toEqual([1, 2, null, null]);
  });

  it('treats a leading tie flag as no-op (first quote is always a fresh rank)', () => {
    const m = deriveRanks(['a', 'b'], [true, false], 2);
    expect([m.get('a'), m.get('b')]).toEqual([1, 2]);
  });
});
