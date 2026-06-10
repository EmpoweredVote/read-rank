import { describe, it, expect } from 'vitest';
import { buildQuoteIdentityMap, buildInsightSentence } from '../revealInsight';
import type { RevealResult } from '../../data/api';
import type { AgreedQuote } from '../../store/useReadRankStore';

const reveal: RevealResult = {
  raceId: 'r1',
  positionName: 'Governor',
  usesRcv: false,
  ballot: [
    {
      rank: 1, candidateId: 'jane', name: 'Jane Doe', office: 'Candidate for Governor', photo: '',
      essentialsUrl: 'https://example.com/jane',
      evidence: { agreementCount: 2, firstPlaceCount: 1, topicsWithAgreement: 2 },
      perTopic: [
        { topicKey: 'a', title: 'A', userTopWinner: true, quotes: [
          { quoteId: 'q1', text: 'One.', supported: true, rank: 1, sourceName: 'S1', sourceUrl: 'https://s.example/1' },
        ]},
        { topicKey: 'b', title: 'B', userTopWinner: false, quotes: [
          { quoteId: 'q4', text: 'Four.', supported: true, rank: 4, sourceName: 'S4', sourceUrl: 'https://s.example/4' },
        ]},
      ],
    },
    {
      rank: 2, candidateId: 'sam', name: 'Sam Roe', office: 'Candidate for Governor', photo: '',
      essentialsUrl: 'https://example.com/sam',
      evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
      perTopic: [
        { topicKey: 'a', title: 'A', userTopWinner: false, quotes: [
          { quoteId: 'q2', text: 'Two.', supported: true, rank: 2, sourceName: 'S2', sourceUrl: 'https://s.example/2' },
        ]},
      ],
    },
    {
      rank: 3, candidateId: 'kim', name: 'Kim Poe', office: 'Candidate for Governor', photo: '',
      essentialsUrl: 'https://example.com/kim',
      evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
      perTopic: [
        { topicKey: 'a', title: 'A', userTopWinner: false, quotes: [
          { quoteId: 'q3', text: 'Three.', supported: true, rank: 3, sourceName: 'S3', sourceUrl: 'https://s.example/3' },
        ]},
      ],
    },
  ],
};

const agreedQuote = (id: string): AgreedQuote => ({
  id, text: id, candidateToken: 't', topicKey: 'a', addedAt: 1,
});

describe('buildQuoteIdentityMap', () => {
  it('maps every ballot quote to its candidate identity with source', () => {
    const map = buildQuoteIdentityMap(reveal);
    expect(map.get('q1')).toMatchObject({ name: 'Jane Doe', office: 'Candidate for Governor', sourceName: 'S1' });
    expect(map.get('q2')).toMatchObject({ name: 'Sam Roe', essentialsUrl: 'https://example.com/sam' });
    expect(map.get('q3')).toMatchObject({ name: 'Kim Poe' });
    expect(map.get('missing')).toBeUndefined();
  });
});

describe('buildInsightSentence', () => {
  it('notices when all top three picks share one candidate', () => {
    const map = buildQuoteIdentityMap(reveal);
    map.set('x1', map.get('q1')!);
    map.set('x2', map.get('q1')!);
    const agreed = [agreedQuote('q1'), agreedQuote('x1'), agreedQuote('x2')];
    expect(buildInsightSentence(agreed, map)).toBe(
      'All three of your top picks came from one candidate: Jane Doe.'
    );
  });

  it('notices three different candidates', () => {
    const map = buildQuoteIdentityMap(reveal);
    const agreed = [agreedQuote('q1'), agreedQuote('q2'), agreedQuote('q3')];
    expect(buildInsightSentence(agreed, map)).toBe(
      'Your top three choices came from three different candidates.'
    );
  });

  it('notices a two-of-three majority', () => {
    const map = buildQuoteIdentityMap(reveal);
    map.set('x1', map.get('q1')!);
    const agreed = [agreedQuote('q1'), agreedQuote('x1'), agreedQuote('q2')];
    expect(buildInsightSentence(agreed, map)).toBe(
      'Two of your top three picks came from Jane Doe.'
    );
  });

  it('falls back to the top pick when fewer than three are ranked', () => {
    const map = buildQuoteIdentityMap(reveal);
    expect(buildInsightSentence([agreedQuote('q1')], map)).toBe(
      'Your top pick came from Jane Doe.'
    );
  });

  it('returns null with nothing agreed', () => {
    expect(buildInsightSentence([], buildQuoteIdentityMap(reveal))).toBeNull();
  });
});
