// src/components/motif/Motif.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotion, DUR, EASE } from '../../motion';
import { resolveMotif, fallbackArrangement } from './resolveMotif';
import { projectGeoJson, geometryBbox } from './projectGeoJson';
import { DotField } from './DotField';
import { fetchBoundary, getCachedBoundary } from '../../data/api';
import type { BoundaryRef, BoundaryResult, GeoJsonGeometry } from '../../data/api';
import type { Tier, Scope } from '../../utils/raceTier';

export function Motif({ tier, scope, boundaryRef, frameRef }: {
  tier: Tier; scope: Scope; boundaryRef: BoundaryRef | null; frameRef: BoundaryRef | null;
}) {
  const plan = resolveMotif({ tier, scope, boundaryRef });
  if (plan.kind === 'dotfield') return <DotField arrangement={plan.arrangement} />;
  return <BoundaryMotif childRef={plan.ref} frameRef={frameRef} fallback={fallbackArrangement(scope)} />;
}

interface Paths { frame?: string; child: string }

/** Compute SVG paths from inline geometry carried on the refs — no network call. */
function computeInlinePaths(
  child: GeoJsonGeometry,
  frame: GeoJsonGeometry | undefined,
  frameBbox?: [number, number, number, number],
): Paths {
  if (frame) {
    // Project frame and child against the SAME (frame) bbox so the child
    // sits in the right spot; projectGeoJson shifts negative child lons
    // into 0..360 when the frame bbox is antimeridian-shifted (US/Alaska).
    const bbox = frameBbox ?? geometryBbox(frame);
    return {
      frame: projectGeoJson(frame, { bbox }).path,
      child: projectGeoJson(child, { bbox }).path,
    };
  }
  return { child: projectGeoJson(child).path };
}

/** Build motif paths from already-fetched boundary results. */
function pathsFromResults(child: BoundaryResult, frame: BoundaryResult | null): Paths {
  if (frame) {
    const bbox = geometryBbox(frame.geojson);
    return {
      frame: projectGeoJson(frame.geojson, { bbox }).path,
      child: projectGeoJson(child.geojson, { bbox }).path,
    };
  }
  return { child: projectGeoJson(child.geojson).path };
}

/** Paths available synchronously — from inline geometry, or the boundary cache when a
 *  prefetch/earlier render already resolved everything this motif needs. Null → the
 *  effect fetches and the placeholder shows meanwhile. */
function syncPaths(childRef: BoundaryRef, frameRef: BoundaryRef | null): Paths | null {
  if (childRef.geojson) return computeInlinePaths(childRef.geojson, frameRef?.geojson, frameRef?.bbox);
  const child = getCachedBoundary(childRef);
  if (!child) return null; // undefined (not fetched) or null (miss) → wait
  if (frameRef) {
    const frame = getCachedBoundary(frameRef);
    if (frame === undefined) return null; // frame not resolved yet
    return pathsFromResults(child, frame); // frame may be null (miss) → child alone
  }
  return pathsFromResults(child, null);
}

function BoundaryMotif({ childRef, frameRef, fallback }: {
  childRef: BoundaryRef; frameRef: BoundaryRef | null; fallback: 'full' | 'cluster' | 'point';
}) {
  const m = useMotion();
  const [paths, setPaths] = useState<Paths | null>(() => syncPaths(childRef, frameRef));

  const cl = childRef.layer, cg = childRef.geoid;
  const fl = frameRef?.layer ?? null, fg = frameRef?.geoid ?? null;
  const hasInlineGeom = Boolean(childRef.geojson);

  useEffect(() => {
    if (hasInlineGeom) return; // already resolved from props — no fetch needed
    let alive = true;
    (async () => {
      // Child + frame in parallel (both cached/deduped) so first load is one round-trip.
      const [child, frame] = await Promise.all([
        fetchBoundary({ layer: cl, geoid: cg }),
        fl && fg ? fetchBoundary({ layer: fl, geoid: fg }) : Promise.resolve<BoundaryResult | null>(null),
      ]);
      if (!alive) return;
      setPaths(child ? pathsFromResults(child, frame) : null);
    })().catch(() => { if (alive) setPaths(null); });
    return () => { alive = false; };
  }, [cl, cg, fl, fg, hasInlineGeom]);

  return (
    <span style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>
      <AnimatePresence initial={false}>
        {!paths ? (
          <motion.span key="ph" style={{ position: 'absolute', inset: 0 }}
            exit={{ opacity: 0 }} transition={m.transition(DUR.fast, EASE.standard)}>
            <DotField arrangement={fallback} />
          </motion.span>
        ) : (
          <motion.svg key="map" style={{ position: 'absolute', inset: 0 }}
            initial={m.reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }}
            transition={m.transition(DUR.base, EASE.standard)}
            viewBox="0 0 60 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            {paths.frame && (
              <path d={paths.frame} fill="none" stroke="currentColor"
                strokeWidth={1} strokeOpacity={0.3} strokeLinejoin="round" />
            )}
            <path d={paths.child} fill="currentColor" fillOpacity={0.32} stroke="currentColor"
              strokeWidth={1.2} strokeOpacity={0.8} strokeLinejoin="round" />
          </motion.svg>
        )}
      </AnimatePresence>
    </span>
  );
}
