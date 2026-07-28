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

  it('uses a single "Everyone you read" heading when nothing is ranked', async () => {
    stubReveal([entry({}), entry({ candidateId: 'c2', name: 'Sam Okafor' })]);
    play();
    render(<ResultsPhase />);

    // level: 3 distinguishes the section heading from the RevealBand's own
    // "Now see who said what" h2, which matches a different name pattern now
    // that the section heading no longer echoes it.
    expect(await screen.findByRole('heading', { name: /everyone you read/i, level: 3 }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/how the candidates stack up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/also on the ballot/i)).not.toBeInTheDocument();
  });

  it('never announces a number one when nothing is ranked', async () => {
    stubReveal([entry({})]);
    play();
    render(<ResultsPhase />);

    await screen.findByRole('heading', { name: /everyone you read/i, level: 3 }, { timeout: 3000 });
    expect(screen.queryByText(/your number one/i)).not.toBeInTheDocument();
    // Scoped to the sr-only live-region announcement: the visible explanatory
    // line below the band also says "no ranking", so an unscoped query would
    // now match two elements.
    expect(screen.getByRole('status')).toHaveTextContent(/no ranking/i);
  });

  it('does not read the visible explanation twice to screen readers', async () => {
    stubReveal([entry({}), entry({ candidateId: 'c2', name: 'Sam Okafor' })]);
    play();
    render(<ResultsPhase />);
    await screen.findByRole('heading', { name: /everyone you read/i, level: 3 }, { timeout: 3000 });

    // The live region's job is to announce the change and summarise it — the
    // same job it does in the ranked case ("your number one is X"). The visible
    // paragraph carries the explanation, and a screen reader reaches it in DOM
    // order, so restating it in the announcement reads the same sentence twice.
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/2 candidates you read/i);
    expect(status).not.toHaveTextContent(/no ranking to build/i);
    // The explanation itself is still on the page, once.
    expect(screen.getByText(/no ranking to build/i)).toBeInTheDocument();
  });

  it('counts a single unranked candidate in the singular', async () => {
    stubReveal([entry({})]);
    play();
    render(<ResultsPhase />);
    await screen.findByRole('heading', { name: /everyone you read/i, level: 3 }, { timeout: 3000 });

    expect(screen.getByRole('status')).toHaveTextContent(/the candidate you read is listed below/i);
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

  it('tags only the genuinely tied ranked entries, never the unranked one', async () => {
    // Two ranked entries share rank 1 (a real tie); the third entry is unranked
    // and must never pick up a tie tag from having a shared (null) rank.
    stubReveal([
      entry({ rank: 1, candidateId: 'c-tied-a', name: 'Sam Okafor', evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 } }),
      entry({ rank: 1, candidateId: 'c-tied-b', name: 'Jordan Ruiz', evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 } }),
      entry({ candidateId: 'c-unranked', name: 'Dana Reyes' }),
    ]);
    play();
    render(<ResultsPhase />);

    await screen.findByText(/how the candidates stack up/i, {}, { timeout: 3000 });
    expect(screen.getAllByText(/^Tied$/)).toHaveLength(2);
  });
});

describe('ResultsPhase empty-ballot states', () => {
  it('offers a retry when the user judged quotes but nothing resolved', async () => {
    stubReveal([]);
    play();                       // agrees with one quote, disagrees with another
    render(<ResultsPhase />);

    expect(await screen.findByText(/couldn't build your ballot/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/no agreements yet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /now see/i })).not.toBeInTheDocument();
  });

  it('says there is nothing to reveal when the user judged nothing', async () => {
    stubReveal([]);
    window.localStorage?.clear();
    s().reset();
    s().selectRace(payload);
    s().revealBallot();           // straight to results, nothing judged
    render(<ResultsPhase />);

    expect(await screen.findByText(/nothing to reveal yet/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /now see/i })).not.toBeInTheDocument();
  });
});
