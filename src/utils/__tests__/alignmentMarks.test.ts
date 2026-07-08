import { describe, it, expect } from 'vitest';
import { markForQuotes, markStrength, type AlignmentMark } from '../alignmentMarks';
import type { RevealQuote } from '../../data/api';

const q = (o: Partial<RevealQuote>): RevealQuote => ({
  quoteId: 'x', text: 't', supported: true, rank: null, ...o,
});

describe('markForQuotes', () => {
  it('returns a rank mark for supported rank 1-3', () => {
    expect(markForQuotes([q({ supported: true, rank: 2 })])).toEqual({ kind: 'rank', rank: 2 });
  });
  it('returns agreed for supported rank >= 4', () => {
    expect(markForQuotes([q({ supported: true, rank: 5 })])).toEqual({ kind: 'agreed' });
  });
  it('returns agreed for supported with null rank', () => {
    expect(markForQuotes([q({ supported: true, rank: null })])).toEqual({ kind: 'agreed' });
  });
  it('returns disagreed when only disagreed quotes', () => {
    expect(markForQuotes([q({ supported: false, rank: null })])).toEqual({ kind: 'disagreed' });
  });
  it('prefers the best supported rank over disagreed', () => {
    expect(markForQuotes([
      q({ supported: false, rank: null }),
      q({ supported: true, rank: 1 }),
    ])).toEqual({ kind: 'rank', rank: 1 });
  });
  it('returns null for no quotes', () => {
    expect(markForQuotes([])).toBeNull();
  });
});

describe('markStrength (lower = stronger, for sorting)', () => {
  it('orders rank < agreed < disagreed', () => {
    const marks: AlignmentMark[] = [
      { kind: 'disagreed' }, { kind: 'agreed' }, { kind: 'rank', rank: 3 }, { kind: 'rank', rank: 1 },
    ];
    const sorted = [...marks].sort((a, b) => markStrength(a) - markStrength(b));
    expect(sorted).toEqual([
      { kind: 'rank', rank: 1 }, { kind: 'rank', rank: 3 }, { kind: 'agreed' }, { kind: 'disagreed' },
    ]);
  });
});
