// src/components/motif/Motif.tsx
import { useEffect, useState } from 'react';
import { resolveMotif, fallbackArrangement } from './resolveMotif';
import { projectGeoJson } from './projectGeoJson';
import { DotField } from './DotField';
import { fetchBoundary } from '../../data/api';
import type { BoundaryRef } from '../../data/api';
import type { Tier, Scope } from '../../utils/raceTier';

export function Motif({ tier, scope, boundaryRef }: {
  tier: Tier; scope: Scope; boundaryRef: BoundaryRef | null;
}) {
  const plan = resolveMotif({ tier, scope, boundaryRef });
  if (plan.kind === 'dotfield') return <DotField arrangement={plan.arrangement} />;
  return <BoundaryMotif refKey={plan.ref} fallback={fallbackArrangement(scope)} />;
}

function BoundaryMotif({ refKey, fallback }: {
  refKey: BoundaryRef; fallback: 'full' | 'cluster' | 'point';
}) {
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetchBoundary(refKey)
      .then((b) => { if (alive) setPath(b ? projectGeoJson(b.geojson).path : null); })
      .catch(() => { if (alive) setPath(null); });
    return () => { alive = false; };
  }, [refKey.layer, refKey.geoid]);

  if (!path) return <DotField arrangement={fallback} />;
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <path d={path} fill="currentColor" fillOpacity={0.14} stroke="currentColor"
        strokeWidth={1} strokeOpacity={0.75} strokeLinejoin="round" />
    </svg>
  );
}
