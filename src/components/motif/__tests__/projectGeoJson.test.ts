// src/components/motif/__tests__/projectGeoJson.test.ts
import { describe, it, expect } from 'vitest';
import { projectGeoJson } from '../projectGeoJson';

describe('projectGeoJson', () => {
  it('returns a square viewBox and a closed path for a Polygon', () => {
    const geom = { type: 'Polygon' as const, coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
    const { path, viewBox } = projectGeoJson(geom, 100, 6);
    expect(viewBox).toBe('0 0 100 100');
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('keeps projected coordinates inside the padded box', () => {
    const geom = { type: 'Polygon' as const, coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
    const { path } = projectGeoJson(geom, 100, 6);
    const nums = path.match(/-?\d+\.\d+/g)!.map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(6 - 0.01);
    expect(Math.max(...nums)).toBeLessThanOrEqual(94 + 0.01);
  });

  it('handles MultiPolygon (multiple subpaths)', () => {
    const geom = {
      type: 'MultiPolygon' as const,
      coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]],
    };
    const { path } = projectGeoJson(geom, 100, 6);
    expect(path.match(/M/g)?.length).toBe(2);
  });
});
