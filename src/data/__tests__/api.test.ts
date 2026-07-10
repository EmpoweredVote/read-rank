import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchRaceQuotes, fetchRaces, searchPoliticians } from '../api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchRaceQuotes structural blindness', () => {
  it('drops topics with fewer than two quotes (REDESIGN_SPEC §8)', async () => {
    const payload = {
      raceId: 'race-1',
      positionName: 'Governor',
      topics: [
        {
          topicKey: 'thin', title: 'Thin', question: 'Q?',
          quotes: [{ id: 'only', text: 'Lonely quote.', candidateToken: 'a', topicKey: 'thin' }],
        },
        {
          topicKey: 'full', title: 'Full', question: 'Q?',
          quotes: [
            { id: 'f1', text: 'One.', candidateToken: 'a', topicKey: 'full' },
            { id: 'f2', text: 'Two.', candidateToken: 'b', topicKey: 'full' },
          ],
        },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
    const result = await fetchRaceQuotes('race-1');
    expect(result.topics.map((t) => t.topicKey)).toEqual(['full']);
  });

  it('strips provenance and identity fields from an over-returning backend', async () => {
    const overReturningPayload = {
      raceId: 'race-1',
      positionName: 'Governor',
      topics: [
        {
          topicKey: 'economy',
          title: 'Economy',
          question: 'How should the state grow jobs?',
          quotes: [
            {
              id: 'q1',
              text: 'We must invest in small businesses.',
              candidateToken: 'tok-a',
              topicKey: 'economy',
              sourceName: 'Debate transcript',
              sourceUrl: 'https://example.com/debate',
              party: 'Independent',
              candidateName: 'Jane Doe',
            },
            {
              id: 'q2',
              text: 'Cut red tape for employers.',
              candidateToken: 'tok-b',
              topicKey: 'economy',
              party: 'Reform',
            },
          ],
        },
        {
          topicKey: 'housing',
          title: 'Housing',
          question: 'How do we make housing affordable?',
          quotes: [
            {
              id: 'q3',
              text: 'Build more starter homes.',
              candidateToken: 'tok-a',
              topicKey: 'housing',
              sourceUrl: 'https://example.com/townhall',
            },
            {
              id: 'q4',
              text: 'Expand rental assistance.',
              candidateToken: 'tok-b',
              topicKey: 'housing',
            },
          ],
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => overReturningPayload,
      })
    );

    const payload = await fetchRaceQuotes('race-1');

    expect(payload.raceId).toBe('race-1');
    expect(payload.topics).toHaveLength(2);
    const allQuotes = payload.topics.flatMap((t) => t.quotes);
    expect(allQuotes).toHaveLength(4);
    for (const quote of allQuotes) {
      expect(Object.keys(quote).sort()).toEqual(['candidateToken', 'id', 'text', 'topicKey']);
    }
    // Allowed fields survive intact.
    expect(allQuotes[0]).toEqual({
      id: 'q1',
      text: 'We must invest in small businesses.',
      candidateToken: 'tok-a',
      topicKey: 'economy',
    });
  });
});

describe('searchPoliticians jurisdiction parsing', () => {
  it('parses jurisdiction geoids from the search response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          politicians: [{ id: 'p1', name: 'Jane Doe' }],
          county: { geoid: '06037', name: 'Los Angeles County' },
          jurisdiction: {
            congressional: '0634',
            state_senate: '06SU-1',
            state_house: null,
            county: '06037',
            school_district: null,
          },
        }),
      })
    );
    const result = await searchPoliticians('123 Main St, Los Angeles, CA');
    expect(result.jurisdiction).toEqual({
      congressional: '0634',
      state_senate: '06SU-1',
      state_house: null,
      county: '06037',
      school_district: null,
    });
  });

  it('returns jurisdiction: null when the backend omits it (older backend)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          politicians: [{ id: 'p1', name: 'Jane Doe' }],
          county: null,
        }),
      })
    );
    const result = await searchPoliticians('123 Main St, Los Angeles, CA');
    expect(result.jurisdiction).toBeNull();
  });
});

describe('fetchRaces query string', () => {
  it('stays backward-compatible with no jurisdiction (politician_ids only)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ races: [], counties: {} }) });
    vi.stubGlobal('fetch', fetchMock);
    await fetchRaces(['p1', 'p2']);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/readrank/races?politician_ids=p1%2Cp2'));
  });

  it('appends jurisdiction geoids as cd/sldu/sldl/county/school query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ races: [], counties: {} }) });
    vi.stubGlobal('fetch', fetchMock);
    await fetchRaces(['p1'], {
      congressional: '0634',
      state_senate: '06SU-1',
      state_house: null,
      county: '06037',
      school_district: null,
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const qs = new URLSearchParams(calledUrl.split('?')[1]);
    expect(qs.get('politician_ids')).toBe('p1');
    expect(qs.get('cd')).toBe('0634');
    expect(qs.get('sldu')).toBe('06SU-1');
    expect(qs.get('county')).toBe('06037');
    expect(qs.has('sldl')).toBe(false);
    expect(qs.has('school')).toBe(false);
  });

  it('omits the query string entirely when neither politician ids nor jurisdiction are given', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ races: [], counties: {} }) });
    vi.stubGlobal('fetch', fetchMock);
    await fetchRaces();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/readrank\/races$/));
  });
});
