import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchBoundary } from '../api';

afterEach(() => vi.unstubAllGlobals());

describe('fetchBoundary', () => {
  it('returns null when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await fetchBoundary({ layer: 'G4110', geoid: '1805860' })).toBeNull();
  });

  it('returns null when the body reports no boundary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ hasBoundary: false }),
    }));
    expect(await fetchBoundary({ layer: 'G4110', geoid: 'x' })).toBeNull();
  });

  it('returns the parsed boundary when present', async () => {
    const payload = {
      geoid: '1805860', layer: 'G4110', name: 'Bloomington',
      bbox: [-86.6, 39.0, -86.4, 39.2], hasBoundary: true,
      geojson: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
    const out = await fetchBoundary({ layer: 'G4110', geoid: '1805860' });
    expect(out?.name).toBe('Bloomington');
    expect(out?.geojson.type).toBe('Polygon');
  });
});
