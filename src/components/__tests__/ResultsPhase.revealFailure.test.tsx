import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsPhase } from '../ResultsPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

// A real (non-mock) race: the mock reveal knows nothing about these quote ids, so
// any fallback to it would produce an empty ballot and the screen would tell the
// user they agreed with nothing. It must report the outage instead.
const realPayload: RacePayload = {
  raceId: 'real-race-1',
  positionName: 'County Commissioner',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How do we make housing affordable?',
      quotes: [
        { id: 'real-q1', text: 'Build more starter homes.', candidateToken: 'tok-a', topicKey: 'housing' },
        { id: 'real-q2', text: 'Expand rental assistance.', candidateToken: 'tok-b', topicKey: 'housing' },
      ],
    },
  ],
};

const s = () => useReadRankStore.getState();

function playThenReveal() {
  window.localStorage?.clear();
  s().reset();
  s().selectRace(realPayload);
  s().agree(realPayload.topics[0].quotes[0]);
  s().disagree(realPayload.topics[0].quotes[1]);
  s().revealBallot();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ResultsPhase when the reveal endpoint fails', () => {
  it('does not claim the user agreed with nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    playThenReveal();
    render(<ResultsPhase />);

    await screen.findByRole('button', { name: /try again/i }, { timeout: 3000 });
    expect(screen.queryByText(/didn't agree with any quotes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no agreements yet/i)).not.toBeInTheDocument();
  });

  it('reports the failure and offers a retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    playThenReveal();
    render(<ResultsPhase />);

    expect(await screen.findByText(/couldn't build your ballot/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('retrying refetches and renders the ballot once the endpoint recovers', async () => {
    const recovered = {
      raceId: 'real-race-1',
      positionName: 'County Commissioner',
      ballot: [
        {
          rank: 1,
          candidateId: 'cand-a',
          name: 'Dana Reyes',
          office: 'County Commissioner',
          photo: '',
          essentialsUrl: 'https://essentials.empowered.vote/politician/cand-a',
          evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
          perTopic: [],
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({ ok: true, json: async () => recovered });
    vi.stubGlobal('fetch', fetchMock);

    playThenReveal();
    render(<ResultsPhase />);

    (await screen.findByRole('button', { name: /try again/i }, { timeout: 3000 })).click();

    expect((await screen.findAllByText(/dana reyes/i, {}, { timeout: 3000 })).length).toBeGreaterThan(0);
  });

  it('treats a 200 with an empty ballot as unresolved, not an empty-ballot outcome', async () => {
    // The user judged real quotes (playThenReveal agrees/disagrees), so an empty
    // ballot here means the backend resolved nobody — that's the retry state,
    // not the "no agreements yet" copy (which is reserved for judging nothing).
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ raceId: 'real-race-1', positionName: 'County Commissioner', ballot: [] }),
      })
    );
    playThenReveal();
    render(<ResultsPhase />);

    expect(await screen.findByText(/couldn't build your ballot/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/no agreements yet/i)).not.toBeInTheDocument();
  });
});
