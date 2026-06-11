// src/components/motif/__tests__/resolveMotif.test.ts
import { describe, it, expect } from 'vitest';
import { resolveMotif } from '../resolveMotif';

describe('resolveMotif', () => {
  it('plans a boundary when a ref is present', () => {
    expect(resolveMotif({ tier: 'local', scope: 'citywide', boundaryRef: { layer: 'G4110', geoid: '1805860' } }))
      .toEqual({ kind: 'boundary', ref: { layer: 'G4110', geoid: '1805860' } });
  });
  it('falls back to a full dot-field for statewide', () => {
    expect(resolveMotif({ tier: 'state', scope: 'statewide', boundaryRef: null }))
      .toEqual({ kind: 'dotfield', arrangement: 'full' });
  });
  it('falls back to a cluster for a district', () => {
    expect(resolveMotif({ tier: 'state', scope: 'district', boundaryRef: null }))
      .toEqual({ kind: 'dotfield', arrangement: 'cluster' });
  });
  it('falls back to a point for citywide', () => {
    expect(resolveMotif({ tier: 'local', scope: 'citywide', boundaryRef: null }))
      .toEqual({ kind: 'dotfield', arrangement: 'point' });
  });
});
