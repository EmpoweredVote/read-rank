// src/components/motif/Motif.tsx
import { useEffect, useState } from 'react';
import { resolveMotif, fallbackArrangement } from './resolveMotif';
import { projectGeoJson, geometryBbox } from './projectGeoJson';
import { DotField } from './DotField';
import { fetchBoundary } from '../../data/api';
import type { BoundaryRef } from '../../data/api';
import type { Tier, Scope } from '../../utils/raceTier';

export function Motif({ tier, scope, boundaryRef, frameRef }: {
  tier: Tier; scope: Scope; boundaryRef: BoundaryRef | null; frameRef: BoundaryRef | null;
}) {
  const plan = resolveMotif({ tier, scope, boundaryRef });
  if (plan.kind === 'dotfield') return <DotField arrangement={plan.arrangement} />;
  return <BoundaryMotif childRef={plan.ref} frameRef={frameRef} fallback={fallbackArrangement(scope)} />;
}

interface Paths { frame?: string; child: string }

function BoundaryMotif({ childRef, frameRef, fallback }: {
  childRef: BoundaryRef; frameRef: BoundaryRef | null; fallback: 'full' | 'cluster' | 'point';
}) {
  const [paths, setPaths] = useState<Paths | null>(null);
  const cl = childRef.layer, cg = childRef.geoid;
  const fl = frameRef?.layer ?? null, fg = frameRef?.geoid ?? null;

  useEffect(() => {
    let alive = true;
    (async () => {
      const child = await fetchBoundary({ layer: cl, geoid: cg });
      if (!alive) return;
      if (!child) { setPaths(null); return; }
      if (fl && fg) {
        const frame = await fetchBoundary({ layer: fl, geoid: fg });
        if (!alive) return;
        if (frame) {
          // Project frame and child against the SAME (frame) bbox so the child
          // sits in the right spot; projectGeoJson shifts negative child lons
          // into 0..360 when the frame bbox is antimeridian-shifted (US/Alaska).
          const bbox = geometryBbox(frame.geojson);
          setPaths({
            frame: projectGeoJson(frame.geojson, { bbox }).path,
            child: projectGeoJson(child.geojson, { bbox }).path,
          });
          return;
        }
      }
      setPaths({ child: projectGeoJson(child.geojson).path });
    })().catch(() => { if (alive) setPaths(null); });
    return () => { alive = false; };
  }, [cl, cg, fl, fg]);

  if (!paths) return <DotField arrangement={fallback} />;
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {paths.frame && (
        <path d={paths.frame} fill="none" stroke="currentColor"
          strokeWidth={1} strokeOpacity={0.3} strokeLinejoin="round" />
      )}
      <path d={paths.child} fill="currentColor" fillOpacity={0.32} stroke="currentColor"
        strokeWidth={1.2} strokeOpacity={0.8} strokeLinejoin="round" />
    </svg>
  );
}
