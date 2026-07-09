import { describe, it, expect } from 'vitest';
import { markForQuotes, markStrength, buildPerTopicRankMap, countTopPicks, type AlignmentMark } from '../alignmentMarks';
import type { RevealQuote, RevealResult } from '../../data/api';

const q = (o: Partial<RevealQuote>): RevealQuote => ({
  quoteId: 'x', text: 't', supported: true, rank: null, ...o,
});

describe('markForQuotes', () => {
  it('returns a rank mark for supported per-topic rank 1-3', () => {
    expect(markForQuotes([q({ quoteId: 'x', supported: true })], new Map([['x', 2]]))).toEqual({ kind: 'rank', rank: 2 });
  });
  it('returns agreed for supported per-topic rank >= 4', () => {
    expect(markForQuotes([q({ quoteId: 'x', supported: true })], new Map([['x', 5]]))).toEqual({ kind: 'agreed' });
  });
  it('returns agreed for supported with no rank in the map', () => {
    expect(markForQuotes([q({ quoteId: 'x', supported: true })], new Map())).toEqual({ kind: 'agreed' });
  });
  it('returns disagreed when only disagreed quotes', () => {
    expect(markForQuotes([q({ quoteId: 'x', supported: false })], new Map())).toEqual({ kind: 'disagreed' });
  });
  it('prefers the best supported rank over disagreed', () => {
    expect(markForQuotes([
      q({ quoteId: 'd', supported: false }),
      q({ quoteId: 's', supported: true }),
    ], new Map([['s', 1]]))).toEqual({ kind: 'rank', rank: 1 });
  });
  it('returns null for no quotes', () => {
    expect(markForQuotes([], new Map())).toBeNull();
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

describe('buildPerTopicRankMap', () => {
  it('numbers a topic\'s supported quotes 1..N by global rank order', () => {
    const reveal: RevealResult = {
      raceId: 'r', positionName: 'Gov',
      ballot: [
        {
          rank: 1, candidateId: 'jane', name: 'Jane', office: 'O', photo: '', essentialsUrl: '',
          evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
          perTopic: [{ topicKey: 'a', title: 'A', userTopWinner: true, quotes: [{ quoteId: 'q1', text: '', supported: true, rank: 1 }] }],
        },
        {
          rank: 2, candidateId: 'sam', name: 'Sam', office: 'O', photo: '', essentialsUrl: '',
          evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
          perTopic: [{ topicKey: 'a', title: 'A', userTopWinner: false, quotes: [{ quoteId: 'q2', text: '', supported: true, rank: 4 }] }],
        },
      ],
    };
    const map = buildPerTopicRankMap(reveal);
    expect(map.get('q1')).toBe(1);
    expect(map.get('q2')).toBe(2);
  });
  it('omits disagreed and unranked quotes', () => {
    const reveal: RevealResult = {
      raceId: 'r', positionName: 'Gov',
      ballot: [{
        rank: 1, candidateId: 'a', name: 'A', office: 'O', photo: '', essentialsUrl: '',
        evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
        perTopic: [{ topicKey: 'a', title: 'A', userTopWinner: false, quotes: [
          { quoteId: 'dis', text: '', supported: false, rank: null },
          { quoteId: 'unr', text: '', supported: true, rank: null },
        ] }],
      }],
    };
    const map = buildPerTopicRankMap(reveal);
    expect(map.has('dis')).toBe(false);
    expect(map.has('unr')).toBe(false);
  });
});

describe('countTopPicks', () => {
  it('counts supported quotes at per-topic rank 1', () => {
    const rankMap = new Map([['q1', 1], ['q2', 2], ['q3', 1]]);
    const quotes = [
      q({ quoteId: 'q1', supported: true }),
      q({ quoteId: 'q2', supported: true }),
      q({ quoteId: 'q3', supported: true }),
    ];
    expect(countTopPicks(quotes, rankMap)).toBe(2);
  });
  it('ignores disagreed quotes even at rank 1', () => {
    const rankMap = new Map([['q1', 1]]);
    expect(countTopPicks([q({ quoteId: 'q1', supported: false })], rankMap)).toBe(0);
  });
});
