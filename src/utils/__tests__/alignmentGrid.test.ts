import { describe, it, expect } from 'vitest';
import { buildAlignmentGrid } from '../alignmentGrid';
import type { RevealResult } from '../../data/api';

const reveal: RevealResult = {
  raceId: 'r1',
  positionName: 'Governor',
  ballot: [
    {
      rank: 1, candidateId: 'jane', name: 'Jane Doe', office: 'O', photo: '', essentialsUrl: '',
      evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
      perTopic: [
        { topicKey: 'a', title: 'Topic A', userTopWinner: true, quotes: [
          { quoteId: 'q1', text: 'One.', supported: true, rank: 1 },
        ]},
        { topicKey: 'b', title: 'Topic B', userTopWinner: false, quotes: [
          { quoteId: 'q9', text: 'Nine.', supported: false, rank: null },
        ]},
      ],
    },
    {
      rank: 2, candidateId: 'sam', name: 'Sam Roe', office: 'O', photo: '', essentialsUrl: '',
      evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
      perTopic: [
        { topicKey: 'a', title: 'Topic A', userTopWinner: false, quotes: [
          { quoteId: 'q2', text: 'Two.', supported: true, rank: 4 },
        ]},
      ],
    },
  ],
};

const topics = [
  { key: 'a', title: 'Topic A' },
  { key: 'b', title: 'Topic B' },
];

describe('buildAlignmentGrid', () => {
  it('maps each candidate-topic cell to the tier the user gave that quote', () => {
    const grid = buildAlignmentGrid(reveal, ['q1', 'q3', 'q4', 'q2'], topics);
    expect(grid).toEqual([
      { candidateId: 'jane', name: 'Jane Doe', cells: ['diamond', 'iron'] },
      { candidateId: 'sam', name: 'Sam Roe', cells: ['bronze', null] },
    ]);
  });

  it('marks unjudged or missing topics as null', () => {
    const grid = buildAlignmentGrid(reveal, [], topics);
    expect(grid[0].cells).toEqual([null, 'iron']);
  });
});
