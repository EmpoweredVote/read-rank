# Nested-Boundary Motif (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the race motif as a nested pair — a thin parent "frame" outline with the constituency "child" filled inside it, projected into the frame's coordinate space so the child sits in the right spot.

**Architecture:** `projectGeoJson` is refactored to accept an explicit bbox (so two geometries share one projection) and to normalize longitudes when the frame is antimeridian-shifted. `Motif` fetches both the child (`boundaryRef`) and the frame (`frameRef`); when a frame is present it draws the frame outline + the child fill, otherwise it falls back to child-alone (today's behavior), then to the dot-field. The backend supplies `frameRef`; until it does, every `frameRef` is absent and the motif renders exactly as it does today.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + @testing-library/react. Repo: `read-rank`, branch `feat/nested-boundary-motif`.

**Spec:** `docs/superpowers/specs/2026-06-11-nested-boundary-motif-design.md`

---

## File Structure

- Modify `src/components/motif/projectGeoJson.ts` — extract `geometryBbox`; change `projectGeoJson` to an options object with optional `bbox`; add shifted-longitude normalization.
- Modify `src/components/motif/__tests__/projectGeoJson.test.ts` — update call signature; add bbox + normalization tests.
- Modify `src/data/api.ts` — add `frameRef?: { layer; geoid } | null` to `RaceSummary`.
- Modify `src/components/motif/Motif.tsx` — accept `frameRef`; fetch + render frame and child.
- Modify `src/components/motif/__tests__/Motif.test.tsx` — frame+child rendering, child-alone, dot-field.
- Modify `src/components/RaceCard.tsx` — accept + pass `frameRef`.
- Modify `src/components/RaceHub.tsx` — pass `race.frameRef`.

Run: `npx vitest run <path>`; full suite `npm test`; `npm run build`.

---

## Task 1: `geometryBbox` + bbox-aware `projectGeoJson`

**Files:**
- Modify: `src/components/motif/projectGeoJson.ts`
- Test: `src/components/motif/__tests__/projectGeoJson.test.ts`

- [ ] **Step 1: Replace the test file**

```ts
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
    // (Y is flipped, so the low-latitude child lands near the bottom; assert on X only.)
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/motif/__tests__/projectGeoJson.test.ts`
Expected: FAIL — `geometryBbox` not exported; `projectGeoJson` signature mismatch.

- [ ] **Step 3: Replace `projectGeoJson.ts`**

```ts
// src/components/motif/projectGeoJson.ts
import type { GeoJsonGeometry } from '../../data/api';

type Ring = number[][];
export type Bbox = [number, number, number, number];

function collectRings(geom: GeoJsonGeometry): Ring[] {
  if (geom.type === 'Polygon') return geom.coordinates as Ring[];
  // MultiPolygon: array of polygons, each an array of rings.
  return (geom.coordinates as number[][][][]).flat() as Ring[];
}

/** Lon/lat bounding box [minX, minY, maxX, maxY] of a geometry. */
export function geometryBbox(geom: GeoJsonGeometry): Bbox {
  const rings = collectRings(geom).filter((r) => r.length > 1);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Project a lon/lat geometry to a square SVG viewBox of `size`, preserving
 * aspect ratio with `pad` margin. Equirectangular with a cos(midLat) x-scale.
 * Y is flipped (north is up).
 *
 * Pass `bbox` to project against an explicit extent (so a frame and its child
 * share one projection). When that bbox is antimeridian-shifted (maxX > 180,
 * i.e. the backend ST_ShiftLongitude'd the frame into 0..360), this geometry's
 * negative longitudes are shifted +360 too so a normal-coord child lines up.
 */
export function projectGeoJson(
  geom: GeoJsonGeometry,
  opts: { size?: number; pad?: number; bbox?: Bbox } = {},
): { path: string; viewBox: string } {
  const size = opts.size ?? 60;
  const pad = opts.pad ?? 4;
  const [minX, minY, maxX, maxY] = opts.bbox ?? geometryBbox(geom);
  if (!Number.isFinite(minX)) return { path: '', viewBox: `0 0 ${size} ${size}` };

  const shift = maxX > 180;
  const nx = (x: number) => (shift && x < 0 ? x + 360 : x);

  const rings = collectRings(geom).filter((r) => r.length > 1);
  const midLat = (minY + maxY) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180) || 1;
  const w = (maxX - minX) * kx || 1;
  const h = (maxY - minY) || 1;
  const inner = size - pad * 2;
  const scale = inner / Math.max(w, h);
  const offX = pad + (inner - w * scale) / 2;
  const offY = pad + (inner - h * scale) / 2;
  const px = (x: number) => offX + (nx(x) - minX) * kx * scale;
  const py = (y: number) => offY + (maxY - y) * scale;
  const path = rings
    .map((r) => 'M' + r.map(([x, y]) => `${px(x).toFixed(2)},${py(y).toFixed(2)}`).join('L') + 'Z')
    .join(' ');
  return { path, viewBox: `0 0 ${size} ${size}` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/motif/__tests__/projectGeoJson.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Check for other callers**

Run: `grep -rn "projectGeoJson(" src --include=*.tsx --include=*.ts | grep -v __tests__`
Expected: only `Motif.tsx` calls it. It uses `projectGeoJson(b.geojson)` (no positional args) — still valid with the new options signature. No change needed here (Task 3 rewrites Motif anyway).

- [ ] **Step 6: Commit**

```bash
git add src/components/motif/projectGeoJson.ts src/components/motif/__tests__/projectGeoJson.test.ts
git commit -m "refactor(motif): projectGeoJson accepts explicit bbox + shifted-lon normalization"
```

---

## Task 2: `frameRef` on `RaceSummary` + card wiring

**Files:**
- Modify: `src/data/api.ts` (add field to `RaceSummary`)
- Modify: `src/components/RaceCard.tsx` (prop + pass-through)
- Modify: `src/components/RaceHub.tsx` (pass `race.frameRef`)
- Test: `src/components/__tests__/RaceCard.test.tsx` (already exists; add one assertion)

- [ ] **Step 1: Add the field to `RaceSummary`**

In `src/data/api.ts`, inside `RaceSummary`, after `boundaryRef?: BoundaryRef | null;`:

```ts
  /** Parent boundary to nest the child inside (backend-resolved). Null = render child alone. */
  frameRef?: BoundaryRef | null;
```

- [ ] **Step 2: Add the prop to `RaceCard` and pass it to `Motif`**

In `src/components/RaceCard.tsx`: add `frameRef?: BoundaryRef | null;` to `RaceCardProps` (after `boundaryRef`), destructure it, and update the `Motif` usage:

```tsx
        <Motif tier={tier} scope={scope} boundaryRef={boundaryRef ?? null} frameRef={frameRef ?? null} />
```

- [ ] **Step 3: Pass it from `RaceHub`**

In `src/components/RaceHub.tsx`, in the `<RaceCard ... />` props (next to `boundaryRef={race.boundaryRef ?? null}`):

```tsx
              frameRef={race.frameRef ?? null}
```

- [ ] **Step 4: Add a RaceCard assertion**

In `src/components/__tests__/RaceCard.test.tsx`, the existing first test renders with `boundaryRef: null`. Add `frameRef: null` to the shared `props` object so the type is exercised, and confirm the suite still passes. (No new behavior to assert here — `Motif` is covered in Task 3.)

Run: `npx vitest run src/components/__tests__/RaceCard.test.tsx`
Expected: PASS (existing tests, now typed with `frameRef`).

- [ ] **Step 5: Commit**

```bash
git add src/data/api.ts src/components/RaceCard.tsx src/components/RaceHub.tsx src/components/__tests__/RaceCard.test.tsx
git commit -m "feat: thread frameRef from RaceSummary through RaceCard to Motif"
```

---

## Task 3: `Motif` renders frame + child

**Files:**
- Modify: `src/components/motif/Motif.tsx`
- Test: `src/components/motif/__tests__/Motif.test.tsx`

- [ ] **Step 1: Replace the test file**

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/motif/__tests__/Motif.test.tsx`
Expected: FAIL — `Motif` does not accept `frameRef`; frame+child not rendered.

- [ ] **Step 3: Replace `Motif.tsx`**

```tsx
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
      if (!child) return alive ? setPaths(null) : undefined;
      if (fl && fg) {
        const frame = await fetchBoundary({ layer: fl, geoid: fg });
        if (frame) {
          const bbox = geometryBbox(frame.geojson);
          return alive ? setPaths({
            frame: projectGeoJson(frame.geojson, { bbox }).path,
            child: projectGeoJson(child.geojson, { bbox }).path,
          }) : undefined;
        }
      }
      return alive ? setPaths({ child: projectGeoJson(child.geojson).path }) : undefined;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/motif/__tests__/Motif.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/motif/Motif.tsx src/components/motif/__tests__/Motif.test.tsx
git commit -m "feat(motif): render nested frame outline + filled child"
```

---

## Task 4: Verification

**Files:** none.

- [ ] **Step 1: Full suite**

Run: `npm test`
Expected: all pass (the motif + card + landing tests, including the updated projectGeoJson/Motif/RaceCard).

- [ ] **Step 2: Lint + build**

Run: `npm run lint` then `npm run build`
Expected: clean on the changed files; build succeeds. Fix only issues this branch introduced.

- [ ] **Step 3: Visual check (preview tools)**

Start the dev server. With no backend (`frameRef` absent), confirm every card renders exactly as today (child-alone or dot-field) — i.e. no regression. Then, to exercise nesting before the backend ships, temporarily stub a `frameRef` in dev (e.g. via `preview_eval` is not enough since it's data; instead briefly hardcode `frameRef={{layer:'G4000',geoid:'18'}}` on one card, confirm the nested frame+child draws, then revert). Capture a screenshot of the nested render. Revert any temporary stub before finishing.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "chore(motif): lint/type fixes for nested boundary" || echo "nothing to commit"
```

---

## Self-Review notes
- **Spec coverage:** explicit-bbox projection + shifted-lon normalization (T1, spec §3.2), `frameRef` on `RaceSummary` (T2, §3.1), frame-outline + filled-child render with child-alone and dot-field degradation (T3, §3.2/§3 degradation), visual opacities ~0.3 frame / ~0.32 child (T3, §4).
- **Backend dependency:** `frameRef` comes from the races API (separate backend plan). Until then it's absent → `Motif` renders child-alone/dot-field exactly as today. This plan ships with zero visible regression.
- **Type consistency:** `BoundaryRef` reused everywhere; `geometryBbox`/`Bbox` exported from projectGeoJson and used by Motif; `projectGeoJson(geom, { bbox })` options shape consistent across T1/T3.
