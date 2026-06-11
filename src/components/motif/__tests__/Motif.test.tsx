// src/components/motif/__tests__/Motif.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Motif } from '../Motif';
import * as api from '../../../data/api';

afterEach(() => vi.restoreAllMocks());

describe('Motif', () => {
  it('renders the dot-field when there is no boundaryRef', () => {
    const { container } = render(<Motif tier="state" scope="statewide" boundaryRef={null} />);
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(3);
  });

  it('renders a boundary path when fetchBoundary resolves geometry', async () => {
    vi.spyOn(api, 'fetchBoundary').mockResolvedValue({
      geoid: '1805860', layer: 'G4110', name: 'Bloomington',
      bbox: [0, 0, 10, 10], hasBoundary: true,
      geojson: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
    });
    const { container } = render(
      <Motif tier="local" scope="citywide" boundaryRef={{ layer: 'G4110', geoid: '1805860' }} />,
    );
    await waitFor(() => expect(container.querySelector('path')).not.toBeNull());
  });

  it('falls back to the dot-field when fetchBoundary returns null', async () => {
    vi.spyOn(api, 'fetchBoundary').mockResolvedValue(null);
    const { container } = render(
      <Motif tier="local" scope="county" boundaryRef={{ layer: 'G4020', geoid: 'x' }} />,
    );
    await waitFor(() => expect(container.querySelectorAll('circle').length).toBeGreaterThan(3));
  });
});
