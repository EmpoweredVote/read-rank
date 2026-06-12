// src/components/motif/__tests__/projectGeoJson.test.ts
import { describe, it, expect } from 'vitest';
import { projectGeoJson, geometryBbox } from '../projectGeoJson';

const square = { type: 'Polygon' as const, coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };

describe('geometryBbox', () => {
  it('computes [minX,minY,maxX,maxY]', () => {
    expect(geometryBbox(square)).toEqual([0, 0, 10, 10]);
  });
});

describe('projectGeoJson', () => {
  it('returns a square viewBox and a closed path for a Polygon', () => {
    const { path, viewBox } = projectGeoJson(square, { size: 100, pad: 6 });
    expect(viewBox).toBe('0 0 100 100');
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('keeps projected coordinates inside the padded box', () => {
    const { path } = projectGeoJson(square, { size: 100, pad: 6 });
    const nums = path.match(/-?\d+\.\d+/g)!.map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(6 - 0.01);
    expect(Math.max(...nums)).toBeLessThanOrEqual(94 + 0.01);
  });

  it('handles MultiPolygon (multiple subpaths)', () => {
    const geom = {
      type: 'MultiPolygon' as const,
      coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]],
    };
    expect(projectGeoJson(geom, {}).path.match(/M/g)?.length).toBe(2);
  });

  it('projects against an explicit bbox (a small child sits inside a large frame)', () => {
    // child longitudes 5..15 sit in the left ~15% of a 0..100 frame → small X values.
    // (Y is flipped, so the low-latitude child lands near the bottom — large Y — which is correct;
    // we assert on X only to verify the bbox-relative horizontal placement.)
    const child = { type: 'Polygon' as const, coordinates: [[[5, 5], [15, 5], [15, 15], [5, 5]]] };
    const { path } = projectGeoJson(child, { size: 60, pad: 0, bbox: [0, 0, 100, 100] });
    const xs = path.match(/(\d+\.\d+),/g)!.map((s) => parseFloat(s));
    expect(Math.max(...xs)).toBeLessThan(20);
  });

  it('normalizes child longitudes when the frame bbox is antimeridian-shifted (>180)', () => {
    // Frame in 0..360 space (e.g. shifted US). A child at lon -88 must map to +272 to land inside.
    const child = { type: 'Polygon' as const, coordinates: [[[-88, 39], [-85, 39], [-85, 41], [-88, 39]]] };
    const { path } = projectGeoJson(child, { size: 60, pad: 0, bbox: [172, 18, 293, 71] });
    const xs = path.match(/(\d+\.\d+),/g)!.map((s) => parseFloat(s));
    // -88 -> 272 is ~ (272-172)/(293-172) ≈ 0.83 of the width; comfortably inside the box, not clamped to 0
    expect(Math.min(...xs)).toBeGreaterThan(20);
  });
});
