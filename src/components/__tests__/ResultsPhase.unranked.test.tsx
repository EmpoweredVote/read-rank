import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsPhase } from '../ResultsPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';
import type { BallotEntry, RevealResult } from '../../data/api';

const payload: RacePayload = {
  raceId: 'real-race-u',
  positionName: 'County Commissioner',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How do we make housing affordable?',
      quotes: [
        { id: 'u-q1', text: 'Build more starter homes.', candidateToken: 'a', topicKey: 'housing' },
        { id: 'u-q2', text: 'Expand rental assistance.', candidateToken: 'b', topicKey: 'housing' },
      ],
    },
  ],
};

function entry(over: Partial<BallotEntry>): BallotEntry {
  return {
    rank: null,
    candidateId: 'c1',
    name: 'Dana Reyes',
    office: 'County Commissioner',
    photo: '',
    essentialsUrl: 'https://essentials.empowered.vote/politician/c1',
    evidence: { agreementCount: 0, firstPlaceCount: 0, topicsWithAgreement: 0 },
    perTopic: [
      {
        topicKey: 'housing',
        title: 'Housing',
        userTopWinner: false,
        quotes: [{ quoteId: 'u-q2', text: 'Expand rental assistance.', supported: false, rank: null }],
      },
    ],
    ...over,
  };
}

function stubReveal(ballot: BallotEntry[]) {
  const body: RevealResult = { raceId: 'real-race-u', positionName: 'County Commissioner', ballot };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }));
}

const s = () => useReadRankStore.getState();

function play() {
  window.localStorage?.clear();
  s().reset();
  s().selectRace(payload);
  s().agree(payload.topics[0].quotes[0]);
  s().disagree(payload.topics[0].quotes[1]);
  s().revealBallot();
}

afterEach(() => vi.unstubAllGlobals());

describe('ResultsPhase with unranked candidates', () => {
  it('splits ranked and unranked into two sections', async () => {
    stubReveal([
      entry({ rank: 1, candidateId: 'c-ranked', name: 'Sam Okafor', evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 } }),
      entry({}),
    ]);
    play();
    render(<ResultsPhase />);

    expect(await screen.findByText(/how the candidates stack up/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/also on the ballot/i)).toBeInTheDocument();
    expect(screen.getByText(/didn't agree with any of their positions/i)).toBeInTheDocument();
  });

  it('uses a single "Who said what" heading when nothing is ranked', async () => {
    stubReveal([entry({}), entry({ candidateId: 'c2', name: 'Sam Okafor' })]);
    play();
    render(<ResultsPhase />);

    expect(await screen.findByText(/who said what/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/how the candidates stack up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/also on the ballot/i)).not.toBeInTheDocument();
  });

  it('never announces a number one when nothing is ranked', async () => {
    stubReveal([entry({})]);
    play();
    render(<ResultsPhase />);

    await screen.findByText(/who said what/i, {}, { timeout: 3000 });
    expect(screen.queryByText(/your number one/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no ranking/i)).toBeInTheDocument();
  });

  it('announces the number one from the ranked entries only', async () => {
    stubReveal([
      entry({ rank: 1, candidateId: 'c-ranked', name: 'Sam Okafor', evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 } }),
      entry({}),
    ]);
    play();
    render(<ResultsPhase />);

    expect(await screen.findByText(/your number one is Sam Okafor/i, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('does not tag unranked entries as tied', async () => {
    stubReveal([entry({}), entry({ candidateId: 'c2', name: 'Sam Okafor' })]);
    play();
    render(<ResultsPhase />);

    await screen.findByText(/who said what/i, {}, { timeout: 3000 });
    expect(screen.queryByText(/^Tied$/)).not.toBeInTheDocument();
  });
});
