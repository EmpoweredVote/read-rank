import { describe, it, expect } from 'vitest';
import { estimateMinutes, formatReadingTime } from '../estimateMinutes';

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

describe('formatReadingTime', () => {
  it('shows seconds under a minute, rounded to 10 s', () => {
    expect(formatReadingTime(1)).toBe('about 10 sec');
    expect(formatReadingTime(2)).toBe('about 20 sec');
    expect(formatReadingTime(5)).toBe('about 50 sec');
  });
  it('never shows less than 10 sec', () => {
    expect(formatReadingTime(0)).toBe('about 10 sec');
  });
  it('switches to minutes at 60 s and uses estimateMinutes', () => {
    expect(formatReadingTime(6)).toBe('about 1 min');
    expect(formatReadingTime(30)).toBe('about 5 min');
  });
});
