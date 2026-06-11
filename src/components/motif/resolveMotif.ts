// src/components/motif/resolveMotif.ts
import type { BoundaryRef } from '../../data/api';
import type { Tier, Scope } from '../../utils/raceTier';

export type Arrangement = 'full' | 'cluster' | 'point';

export type MotifPlan =
  | { kind: 'boundary'; ref: BoundaryRef }
  | { kind: 'dotfield'; arrangement: Arrangement };

export function fallbackArrangement(scope: Scope): Arrangement {
  if (scope === 'citywide') return 'point';
  if (scope === 'statewide') return 'full';
  return 'cluster';
}

export function resolveMotif(input: {
  tier: Tier;
  scope: Scope;
  boundaryRef?: BoundaryRef | null;
}): MotifPlan {
  if (input.boundaryRef) return { kind: 'boundary', ref: input.boundaryRef };
  return { kind: 'dotfield', arrangement: fallbackArrangement(input.scope) };
}
