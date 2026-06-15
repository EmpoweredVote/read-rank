import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const { mockFetchBoundary } = vi.hoisted(() => ({ mockFetchBoundary: vi.fn() }));
vi.mock('../../data/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/api')>();
  return { ...actual, fetchBoundary: mockFetchBoundary };
});

import { Motif } from '../motif/Motif';
import type { GeoJsonGeometry } from '../../data/api';

const SQUARE: GeoJsonGeometry = {
  type: 'Polygon',
  coordinates: [[[-86.6, 39.1], [-86.4, 39.1], [-86.4, 39.3], [-86.6, 39.3], [-86.6, 39.1]]],
};
const FRAME: GeoJsonGeometry = {
  type: 'Polygon',
  coordinates: [[[-87.0, 39.0], [-86.3, 39.0], [-86.3, 39.5], [-87.0, 39.5], [-87.0, 39.0]]],
};

beforeEach(() => mockFetchBoundary.mockReset());

describe('Motif — inline geometry fast path', () => {
  it('renders SVG with a path immediately when childRef.geojson is present', () => {
    render(
      <Motif
        tier="local"
        scope="citywide"
        boundaryRef={{ layer: 'G4110', geoid: '1805860', bbox: [-86.6, 39.1, -86.4, 39.3], geojson: SQUARE }}
        frameRef={null}
      />,
    );
    expect(document.querySelector('svg')).not.toBeNull();
    expect(document.querySelector('path')).not.toBeNull();
    expect(mockFetchBoundary).not.toHaveBeenCalled();
  });

  it('renders two paths (frame + child) when both refs carry inline geometry', () => {
    render(
      <Motif
        tier="local"
        scope="citywide"
        boundaryRef={{ layer: 'G4110', geoid: '1805860', bbox: [-86.6, 39.1, -86.4, 39.3], geojson: SQUARE }}
        frameRef={{ layer: 'G4020', geoid: '18105', bbox: [-87.0, 39.0, -86.3, 39.5], geojson: FRAME }}
      />,
    );
    expect(document.querySelectorAll('path')).toHaveLength(2);
    expect(mockFetchBoundary).not.toHaveBeenCalled();
  });

  it('falls back to the dot-field (no SVG) when boundaryRef is null', () => {
    render(
      <Motif tier="local" scope="citywide" boundaryRef={null} frameRef={null} />,
    );
    expect(document.querySelector('svg')).toBeNull();
  });
});

describe('Motif — fetch fallback', () => {
  it('calls fetchBoundary when childRef has no inline geojson', async () => {
    mockFetchBoundary.mockResolvedValue(null); // boundary not found → dot-field
    render(
      <Motif
        tier="local"
        scope="citywide"
        boundaryRef={{ layer: 'G4110', geoid: '1805860' }}
        frameRef={null}
      />,
    );
    await waitFor(() => expect(mockFetchBoundary).toHaveBeenCalledWith({ layer: 'G4110', geoid: '1805860' }));
  });
});
