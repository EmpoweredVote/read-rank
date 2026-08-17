import { describe, it, expect } from 'vitest';
import { buildAlignmentGrid } from '../alignmentGrid';
import { buildPerTopicRankMap } from '../alignmentMarks';
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
  it('maps each candidate-topic cell to a per-topic mark', () => {
    const rankMap = buildPerTopicRankMap(reveal);
    const grid = buildAlignmentGrid(reveal, topics, rankMap);
    // topic-a: q1@global1 and q2@global4 -> per-topic ranks 1 and 2.
    // Jane: topic a per-topic rank 1 -> rank mark; topic b disagreed -> disagreed
    expect(grid[0].cells).toEqual([{ kind: 'rank', rank: 1 }, { kind: 'disagreed' }]);
    // Sam: topic a per-topic rank 2 -> rank mark; topic b none -> null
    expect(grid[1].cells).toEqual([{ kind: 'rank', rank: 2 }, null]);
  });
});

// ---------------------------------------------------------------------------
// A topic can host several questions, so a candidate can have two perTopic
// sections sharing one topicKey. The grid's columns come from getActiveTopicKeys
// (card keys), so resolving sections by topicKey matched the wrong one — or
// nothing — and blanked both cells.
// ---------------------------------------------------------------------------
describe('buildAlignmentGrid — two questions in one topic', () => {
  const splitReveal: RevealResult = {
    raceId: 'race-la-mayor',
    positionName: 'Los Angeles Mayor',
    ballot: [
      {
        rank: 1, candidateId: 'bass', name: 'Karen Bass', office: 'Mayor', photo: '', essentialsUrl: '',
        evidence: { agreementCount: 2, firstPlaceCount: 1, topicsWithAgreement: 2 },
        perTopic: [
          { key: 'q-film', questionId: 'q-film', topicKey: 'economic-development',
            title: 'Economic Development', question: 'Film and TV?', userTopWinner: true,
            quotes: [{ quoteId: 'bass-film', text: 'Film.', supported: true, rank: 1 }] },
          { key: 'q-downtown', questionId: 'q-downtown', topicKey: 'economic-development',
            title: 'Economic Development', question: 'Downtown?', userTopWinner: false,
            quotes: [{ quoteId: 'bass-downtown', text: 'Downtown.', supported: true, rank: 2 }] },
        ],
      },
    ],
  };

  it('resolves each column to its own question section', () => {
    const cols = [
      { key: 'q-film', title: 'Economic Development' },
      { key: 'q-downtown', title: 'Economic Development' },
    ];
    const rankMap = new Map([['bass-film', 1], ['bass-downtown', 2]]);
    const [row] = buildAlignmentGrid(splitReveal, cols, rankMap);

    // Both cells must be populated and DIFFERENT — keyed by topicKey, both columns
    // hit whichever section landed in the Map last, so one cell was wrong.
    expect(row.cells).toHaveLength(2);
    expect(row.cells[0]).not.toBeNull();
    expect(row.cells[1]).not.toBeNull();
    expect(row.cells[0]).not.toEqual(row.cells[1]);
  });

  it('still resolves sections that carry no card key', () => {
    const legacy = {
      ...splitReveal,
      ballot: [{
        ...splitReveal.ballot[0],
        perTopic: [{ topicKey: 'housing', title: 'Housing', userTopWinner: true,
          quotes: [{ quoteId: 'h1', text: 'H.', supported: true, rank: 1 }] }],
      }],
    } as unknown as RevealResult;
    const [row] = buildAlignmentGrid(legacy, [{ key: 'housing', title: 'Housing' }], new Map([['h1', 1]]));
    expect(row.cells[0]).not.toBeNull();
  });
});
