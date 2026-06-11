import { describe, it, expect } from 'vitest';
import { estimateMinutes } from '../estimateMinutes';

describe('estimateMinutes', () => {
  it('uses quoteCount at ~10s per quote', () => {
    expect(estimateMinutes({ quoteCount: 30, candidateCount: 5, topicCount: 8 })).toBe(5);
  });
  it('estimates from candidates x topics when quoteCount is missing', () => {
    expect(estimateMinutes({ candidateCount: 4, topicCount: 3 })).toBe(2);
  });
  it('never returns less than 1', () => {
    expect(estimateMinutes({ quoteCount: 0, candidateCount: 1, topicCount: 1 })).toBe(1);
  });
});
