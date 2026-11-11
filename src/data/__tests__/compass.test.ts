import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildSpokes, fetchMyCompass, MAX_SPOKES, type CompassTopic } from '../compass';

const topic = (id: string, short_title: string): CompassTopic => ({
  id, topic_key: id, title: short_title, short_title, stances: [1, 2, 3, 4, 5].map((value) => ({ value, text: '' })),
});
const topics = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => topic(id, id.toUpperCase()));

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('buildSpokes', () => {
  it('follows the order chosen in Compass and drops unanswered topics', () => {
    const spokes = buildSpokes({
      answers: [{ topic_id: 'a', value: 2 }, { topic_id: 'b', value: 0 }, { topic_id: 'c', value: 5, inverted: true }],
      selected: ['c', 'b', 'a'],
    }, topics);
    expect(spokes.map((s) => [s.shortTitle, s.value, s.inverted])).toEqual([['C', 5, true], ['A', 2, false]]);
  });

  it('falls back to answered order, capped at MAX_SPOKES, and skips topics the catalog does not know', () => {
    const answers = [{ topic_id: 'unknown', value: 3 }, ...topics.map((t) => ({ topic_id: t.id, value: 3 }))];
    const spokes = buildSpokes({ answers, selected: [] }, topics);
    expect(spokes).toHaveLength(MAX_SPOKES);
    expect(spokes[0].shortTitle).toBe('A');
  });
});

describe('fetchMyCompass', () => {
  it('is null when signed out, without calling the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await fetchMyCompass()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reads the signed-in user\'s answers and chosen order with their token', async () => {
    window.localStorage.setItem('ev_token', 't0k');
    const fetchSpy = vi.fn(async (url: string) => ({
      ok: true, status: 200,
      json: async () => (url.endsWith('/compass/answers') ? [{ topic_id: 'a', value: 2 }] : ['a']),
    }));
    vi.stubGlobal('fetch', fetchSpy);
    expect(await fetchMyCompass()).toEqual({ answers: [{ topic_id: 'a', value: 2 }], selected: ['a'] });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/compass\/answers$/);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer t0k');
  });

  it('treats an expired session (401) as signed out', async () => {
    window.localStorage.setItem('ev_token', 'old');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
    expect(await fetchMyCompass()).toBeNull();
  });
});
