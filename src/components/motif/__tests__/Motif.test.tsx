// src/components/motif/__tests__/Motif.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Motif } from '../Motif';
import * as api from '../../../data/api';

afterEach(() => vi.restoreAllMocks());

const poly = (coords: number[][]) => ({ type: 'Polygon' as const, coordinates: [coords] });
const result = (geojson: api.GeoJsonGeometry) => ({
  geoid: 'x', layer: 'x', name: 'x', bbox: [0, 0, 1, 1] as [number, number, number, number],
  hasBoundary: true as const, geojson,
});

describe('Motif', () => {
  it('renders the dot-field when there is no boundaryRef', () => {
    const { container } = render(<Motif tier="state" scope="statewide" boundaryRef={null} frameRef={null} />);
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(3);
  });

  it('renders child alone (one path) when there is no frameRef', async () => {
    vi.spyOn(api, 'fetchBoundary').mockResolvedValue(result(poly([[0, 0], [10, 0], [10, 10], [0, 0]])));
    const { container } = render(
      <Motif tier="state" scope="statewide" boundaryRef={{ layer: 'G4000', geoid: '18' }} frameRef={null} />,
    );
    await waitFor(() => expect(container.querySelectorAll('path').length).toBe(1));
  });

  it('renders frame + child (two paths) when frameRef is present', async () => {
    vi.spyOn(api, 'fetchBoundary').mockImplementation(async (ref) =>
      ref.layer === 'G4000'
        ? result(poly([[0, 0], [100, 0], [100, 100], [0, 0]]))   // frame
        : result(poly([[40, 40], [60, 40], [60, 60], [40, 40]])), // child
    );
    const { container } = render(
      <Motif tier="local" scope="county" boundaryRef={{ layer: 'G4020', geoid: '18105' }} frameRef={{ layer: 'G4000', geoid: '18' }} />,
    );
    await waitFor(() => expect(container.querySelectorAll('path').length).toBe(2));
    // frame has no fill; child is filled
    const fills = [...container.querySelectorAll('path')].map((p) => p.getAttribute('fill'));
    expect(fills).toContain('none');
    expect(fills).toContain('currentColor');
  });

  it('falls back to child-alone when the frame fetch returns null', async () => {
    vi.spyOn(api, 'fetchBoundary').mockImplementation(async (ref) =>
      ref.layer === 'G4000' ? null : result(poly([[0, 0], [10, 0], [10, 10], [0, 0]])),
    );
    const { container } = render(
      <Motif tier="local" scope="county" boundaryRef={{ layer: 'G4020', geoid: '18105' }} frameRef={{ layer: 'G4000', geoid: '18' }} />,
    );
    await waitFor(() => expect(container.querySelectorAll('path').length).toBe(1));
  });

  it('falls back to the dot-field when the child fetch returns null', async () => {
    vi.spyOn(api, 'fetchBoundary').mockResolvedValue(null);
    const { container } = render(
      <Motif tier="local" scope="county" boundaryRef={{ layer: 'G4020', geoid: 'x' }} frameRef={{ layer: 'G4000', geoid: '18' }} />,
    );
    await waitFor(() => expect(container.querySelectorAll('circle').length).toBeGreaterThan(3));
  });
});
