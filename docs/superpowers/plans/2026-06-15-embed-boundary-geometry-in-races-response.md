# Embed Boundary Geometry in Races Response — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the dot-field → geographic outline morph on the Read & Rank landing page by embedding boundary geometry inline in the `/api/readrank/races` response, so each card's motif renders its final state on first paint.

**Architecture:** Add `getBoundaryBatch()` to `informBoundaryService.ts` that fetches all needed boundary geometries in one SQL query. Call it from `getPlayableRaces()` after the races SQL, attach `bbox`/`geojson` to each race's `boundaryRef`/`frameRef`. On the frontend, initialize `BoundaryMotif` state from inline geometry when available, skipping the `fetchBoundary` network call entirely.

**Tech Stack:** Node.js/Express/TypeScript (backend), Vitest + supertest (backend tests), React 19/Vite/TypeScript (frontend), Vitest + @testing-library/react + jsdom (frontend tests), PostgreSQL/PostGIS (geometry).

---

## File Map

| File | Action | What changes |
|---|---|---|
| `backend/src/lib/informBoundaryService.ts` | Modify | Add `getBoundaryBatch()` export |
| `backend/src/lib/informBoundaryService.test.ts` | Modify | Add tests for `getBoundaryBatch` |
| `backend/src/lib/readrankService.ts` | Modify | Add `BoundaryRef` interface with optional geometry; import + call `getBoundaryBatch`; attach geometry in `getPlayableRaces` |
| `backend/src/lib/readrankService.test.ts` | Create | Unit tests for `getPlayableRaces` geometry attachment |
| `read-rank/src/data/api.ts` | Modify | Extend `BoundaryRef` with optional `bbox` + `geojson` fields |
| `read-rank/src/components/motif/Motif.tsx` | Modify | Initialize `BoundaryMotif` paths from inline geometry; skip fetch when present |
| `read-rank/src/components/__tests__/Motif.test.tsx` | Create | Tests for inline-geometry fast path and fetch fallback |

---

## Task 1: Add `getBoundaryBatch` to `informBoundaryService.ts`

**Files:**
- Modify: `backend/src/lib/informBoundaryService.ts`
- Modify: `backend/src/lib/informBoundaryService.test.ts`

- [ ] **Step 1: Write failing tests for `getBoundaryBatch`**

Open `backend/src/lib/informBoundaryService.test.ts` and add after the existing `getBoundary` tests:

```ts
import { getBoundary, getBoundaryBatch } from './informBoundaryService.js';

describe('getBoundaryBatch', () => {
  it('returns an empty map immediately when refs is empty (no DB query)', async () => {
    const result = await getBoundaryBatch([]);
    expect(result).toEqual(new Map());
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('deduplicates refs and fires one query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await getBoundaryBatch([
      { layer: 'G4110', geoid: '1805860' },
      { layer: 'G4110', geoid: '1805860' }, // duplicate
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('returns a map keyed by "layer:geoid" for matching rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      {
        geo_id: '1805860', mtfcc: 'G4110', name: 'Bloomington city',
        minx: -86.6, miny: 39.1, maxx: -86.4, maxy: 39.3,
        geojson: '{"type":"Polygon","coordinates":[[[-86.6,39.1],[-86.4,39.1],[-86.4,39.3],[-86.6,39.1]]]}',
      },
    ] });
    const result = await getBoundaryBatch([{ layer: 'G4110', geoid: '1805860' }]);
    expect(result.size).toBe(1);
    expect(result.get('G4110:1805860')).toMatchObject({
      hasBoundary: true,
      layer: 'G4110',
      geoid: '1805860',
      name: 'Bloomington city',
      bbox: [-86.6, 39.1, -86.4, 39.3],
      geojson: { type: 'Polygon' },
    });
  });

  it('omits rows where geojson or bbox is null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { geo_id: '9999', mtfcc: 'G4110', name: 'Unknown', minx: null, miny: null, maxx: null, maxy: null, geojson: null },
    ] });
    const result = await getBoundaryBatch([{ layer: 'G4110', geoid: '9999' }]);
    expect(result.size).toBe(0);
  });

  it('passes user data as params — never interpolated into SQL', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await getBoundaryBatch([
      { layer: 'G4110', geoid: '1805860' },
      { layer: 'G4020', geoid: '18105' },
    ]);
    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual(['G4110', '1805860', 'G4020', '18105']);
  });
});
```

- [ ] **Step 2: Run to confirm the tests fail**

```bash
cd /Users/chrisandrews/Documents/GitHub/backend
npx vitest run src/lib/informBoundaryService.test.ts
```

Expected: `getBoundaryBatch is not a function` or similar import error.

- [ ] **Step 3: Implement `getBoundaryBatch` in `informBoundaryService.ts`**

Add this function to the bottom of `backend/src/lib/informBoundaryService.ts` (after `getBoundary`):

```ts
/**
 * Batch variant of getBoundary. Accepts an array of {layer, geoid} refs,
 * deduplicates, fetches all matching boundaries in one query, and returns
 * a Map keyed by "layer:geoid". Refs not found in the DB are simply absent
 * from the map — callers should treat that as hasBoundary:false.
 */
export async function getBoundaryBatch(
  refs: Array<{ layer: string; geoid: string }>,
): Promise<Map<string, BoundaryResult>> {
  const unique = new Map<string, { layer: string; geoid: string }>();
  for (const ref of refs) unique.set(`${ref.layer}:${ref.geoid}`, ref);
  if (unique.size === 0) return new Map();

  const pairs = [...unique.values()];
  const placeholders = pairs.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');

  const { rows } = await pool.query<{
    geo_id: string; mtfcc: string; name: string | null;
    minx: number | null; miny: number | null; maxx: number | null; maxy: number | null;
    geojson: string | null;
  }>(
    `WITH b AS (
       SELECT geo_id, mtfcc, name,
              CASE WHEN (ST_XMax(geometry) - ST_XMin(geometry)) > 180
                   THEN ST_ShiftLongitude(geometry)
                   ELSE geometry END AS geom
       FROM essentials.geofence_boundaries
       WHERE (mtfcc, geo_id) IN (${placeholders})
     )
     SELECT geo_id, mtfcc, name,
            ST_XMin(ST_Envelope(geom)) AS minx, ST_YMin(ST_Envelope(geom)) AS miny,
            ST_XMax(ST_Envelope(geom)) AS maxx, ST_YMax(ST_Envelope(geom)) AS maxy,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.001)) AS geojson
     FROM b`,
    pairs.flatMap((r) => [r.layer, r.geoid]),
  );

  const result = new Map<string, BoundaryResult>();
  for (const row of rows) {
    if (!row.geojson || row.minx == null) continue;
    result.set(`${row.mtfcc}:${row.geo_id}`, {
      hasBoundary: true,
      layer: row.mtfcc,
      geoid: row.geo_id,
      name: row.name ?? '',
      bbox: [Number(row.minx), Number(row.miny), Number(row.maxx), Number(row.maxy)],
      geojson: JSON.parse(row.geojson),
    });
  }
  return result;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/chrisandrews/Documents/GitHub/backend
npx vitest run src/lib/informBoundaryService.test.ts
```

Expected: all `getBoundaryBatch` tests PASS, existing `getBoundary` tests still PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/backend
git add src/lib/informBoundaryService.ts src/lib/informBoundaryService.test.ts
git commit -m "feat(readrank): add getBoundaryBatch for bulk geometry fetch"
```

---

## Task 2: Attach geometry in `getPlayableRaces`

**Files:**
- Modify: `backend/src/lib/readrankService.ts`
- Create: `backend/src/lib/readrankService.test.ts`

- [ ] **Step 1: Write a failing test for geometry attachment**

Create `backend/src/lib/readrankService.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockQuery, mockGetBoundaryBatch } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockGetBoundaryBatch: vi.fn(),
}));
vi.mock('./db.js', () => ({ pool: { query: mockQuery } }));
vi.mock('./informBoundaryService.js', () => ({ getBoundaryBatch: mockGetBoundaryBatch }));

import { getPlayableRaces } from './readrankService.js';

const BASE_ROW = {
  race_id: 'race-1',
  clean_position_name: 'City Council',
  district_label: null,
  election_id: 'election-1',
  election_name: 'Bloomington 2026',
  election_date: null,
  jurisdiction_level: 'local',
  state: 'IN',
  boundary_layer: 'G4110',
  boundary_geoid: '1805860',
  frame_layer: 'G4020',
  frame_geoid: '18105',
  candidate_count: '2',
  topic_count: '3',
  quote_count: '6',
  rankable_topic_count: '2',
  politician_ids: ['pol-1', 'pol-2'],
};

const BLOOMINGTON_GEOM = { type: 'Polygon' as const, coordinates: [[[-86.6, 39.1], [-86.4, 39.1], [-86.4, 39.3], [-86.6, 39.1]]] };
const MONROE_GEOM = { type: 'Polygon' as const, coordinates: [[[-87.0, 39.0], [-86.3, 39.0], [-86.3, 39.5], [-87.0, 39.0]]] };

beforeEach(() => {
  mockQuery.mockReset();
  mockGetBoundaryBatch.mockReset();
});

describe('getPlayableRaces', () => {
  it('attaches bbox and geojson to boundaryRef and frameRef when batch finds them', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [BASE_ROW] });
    mockGetBoundaryBatch.mockResolvedValueOnce(new Map([
      ['G4110:1805860', { hasBoundary: true, layer: 'G4110', geoid: '1805860', name: 'Bloomington city', bbox: [-86.6, 39.1, -86.4, 39.3], geojson: BLOOMINGTON_GEOM }],
      ['G4020:18105', { hasBoundary: true, layer: 'G4020', geoid: '18105', name: 'Monroe County', bbox: [-87.0, 39.0, -86.3, 39.5], geojson: MONROE_GEOM }],
    ]));

    const races = await getPlayableRaces();

    expect(races).toHaveLength(1);
    expect(races[0].boundaryRef).toMatchObject({
      layer: 'G4110',
      geoid: '1805860',
      bbox: [-86.6, 39.1, -86.4, 39.3],
      geojson: BLOOMINGTON_GEOM,
    });
    expect(races[0].frameRef).toMatchObject({
      layer: 'G4020',
      geoid: '18105',
      bbox: [-87.0, 39.0, -86.3, 39.5],
      geojson: MONROE_GEOM,
    });
  });

  it('returns races without geometry when getBoundaryBatch throws', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [BASE_ROW] });
    mockGetBoundaryBatch.mockRejectedValueOnce(new Error('DB down'));

    const races = await getPlayableRaces();

    expect(races).toHaveLength(1);
    expect(races[0].boundaryRef).toEqual({ layer: 'G4110', geoid: '1805860' });
    expect(races[0].frameRef).toEqual({ layer: 'G4020', geoid: '18105' });
  });

  it('returns races without geometry when a ref is absent from the batch result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [BASE_ROW] });
    mockGetBoundaryBatch.mockResolvedValueOnce(new Map()); // empty — nothing found

    const races = await getPlayableRaces();

    expect(races[0].boundaryRef).toEqual({ layer: 'G4110', geoid: '1805860' });
    expect(races[0].frameRef).toEqual({ layer: 'G4020', geoid: '18105' });
  });
});
```

- [ ] **Step 2: Run to confirm the test fails**

```bash
cd /Users/chrisandrews/Documents/GitHub/backend
npx vitest run src/lib/readrankService.test.ts
```

Expected: `getBoundaryBatch is not imported` or races lack geometry fields.

- [ ] **Step 3: Add `BoundaryRef` interface and import `getBoundaryBatch` in `readrankService.ts`**

At the top of `backend/src/lib/readrankService.ts`, add this import after the `pool` import:

```ts
import { getBoundaryBatch } from './informBoundaryService.js';
import type { BoundaryResult } from './informBoundaryService.js';
```

Replace the inline `{ layer: string; geoid: string }` type used for `boundaryRef`/`frameRef` in `RaceSummary` by adding a named interface before `RaceSummary`:

```ts
interface BoundaryRef {
  layer: string;
  geoid: string;
  bbox?: [number, number, number, number];
  geojson?: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
}
```

Update `RaceSummary` to use it:

```ts
export interface RaceSummary {
  raceId: string;
  positionName: string;
  districtLabel: string | null;
  electionName: string;
  electionDate: string | null;
  state: string | null;
  jurisdictionLevel: string | null;
  candidateCount: number;
  topicCount: number;
  isLocal: boolean;
  quoteCount: number;
  rankableTopicCount: number;
  tier: 'federal' | 'state' | 'local';
  scope: 'statewide' | 'district' | 'county' | 'citywide';
  boundaryRef: BoundaryRef | null;
  frameRef: BoundaryRef | null;
}
```

- [ ] **Step 4: Add the batch pre-pass to `getPlayableRaces`**

In `getPlayableRaces`, add the following block immediately after the `const { rows } = await pool.query<...>(...)` closing paren and before the `const localSet = new Set(...)` line:

```ts
  // Collect unique boundary refs to resolve in one batch query.
  const refSet = new Set<string>();
  const refList: Array<{ layer: string; geoid: string }> = [];
  function addRef(layer: string | null, geoid: string | null) {
    if (!layer || !geoid) return;
    const key = `${layer}:${geoid}`;
    if (!refSet.has(key)) { refSet.add(key); refList.push({ layer, geoid }); }
  }
  for (const r of rows) {
    addRef(r.boundary_layer, r.boundary_geoid);
    addRef(r.frame_layer, r.frame_geoid);
    const fips = r.state ? USPS_TO_FIPS[r.state] : null;
    if (fips) addRef('G4000', fips);
    addRef('G4000', 'US');
  }
  let boundaryMap = new Map<string, BoundaryResult>();
  try {
    boundaryMap = await getBoundaryBatch(refList);
  } catch {
    // graceful degradation — races returned without embedded geometry
  }
```

- [ ] **Step 5: Attach geometry when building each `RaceSummary`**

At the end of the `rows.map((r) => { ... return { ... }; })` callback, just before the `return {` statement, add geometry attachment. The full return block in `rows.map` currently ends like this:

```ts
    return {
      raceId: r.race_id,
      ...
      boundaryRef,
      frameRef,
      isLocal: ...,
    };
```

Replace it with:

```ts
    // Attach inline geometry from the batch result.
    const childGeo = boundaryRef ? boundaryMap.get(`${boundaryRef.layer}:${boundaryRef.geoid}`) : undefined;
    if (childGeo) boundaryRef = { ...boundaryRef, bbox: childGeo.bbox, geojson: childGeo.geojson };

    const frameGeo = frameRef ? boundaryMap.get(`${frameRef.layer}:${frameRef.geoid}`) : undefined;
    if (frameGeo) frameRef = { ...frameRef, bbox: frameGeo.bbox, geojson: frameGeo.geojson };

    return {
      raceId: r.race_id,
      positionName: r.clean_position_name,
      districtLabel: r.district_label,
      electionName: r.election_name,
      electionDate: r.election_date ? new Date(r.election_date).toISOString().slice(0, 10) : null,
      state: r.state,
      jurisdictionLevel: r.jurisdiction_level,
      candidateCount: Number(r.candidate_count),
      topicCount: Number(r.topic_count),
      quoteCount: Number(r.quote_count),
      rankableTopicCount: Number(r.rankable_topic_count),
      tier,
      scope,
      boundaryRef,
      frameRef,
      isLocal: localSet.size > 0 && (r.politician_ids ?? []).some((id) => localSet.has(id)),
    };
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd /Users/chrisandrews/Documents/GitHub/backend
npx vitest run src/lib/readrankService.test.ts src/lib/informBoundaryService.test.ts
```

Expected: all tests PASS. If TypeScript errors appear on `boundaryRef = { ...boundaryRef, ... }` (TS may complain about reassigning a `const`), change `let boundaryRef` / `let frameRef` — they're already `let` in the existing code so this should be fine.

- [ ] **Step 7: Run the full backend test suite**

```bash
cd /Users/chrisandrews/Documents/GitHub/backend
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/backend
git add src/lib/readrankService.ts src/lib/readrankService.test.ts
git commit -m "feat(readrank): embed boundary geometry inline in getPlayableRaces response"
```

---

## Task 3: Extend `BoundaryRef` type in the frontend

**Files:**
- Modify: `read-rank/src/data/api.ts`

No separate test needed — this is a pure TypeScript interface change. If the shape is wrong, Task 4's tests and the TypeScript compiler will catch it.

- [ ] **Step 1: Update `BoundaryRef` in `api.ts`**

In `read-rank/src/data/api.ts`, replace:

```ts
/** How a race's motif finds its boundary polygon. layer is an MTFCC or layer key. */
export interface BoundaryRef {
  layer: string;
  geoid: string;
}
```

With:

```ts
/** How a race's motif finds its boundary polygon. layer is an MTFCC or layer key.
 *  bbox and geojson are embedded by the backend when available — the motif uses
 *  them directly to avoid a secondary fetch. */
export interface BoundaryRef {
  layer: string;
  geoid: string;
  bbox?: [number, number, number, number];
  geojson?: GeoJsonGeometry;
}
```

(`GeoJsonGeometry` is already defined in the same file, just above `BoundaryResult`.)

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
npx tsc --noEmit
```

Expected: no errors. The new optional fields are backward-compatible — all existing code that only reads `layer`/`geoid` continues to work.

- [ ] **Step 3: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
git add src/data/api.ts
git commit -m "types(motif): extend BoundaryRef with optional inline bbox and geojson"
```

---

## Task 4: Use inline geometry in `BoundaryMotif`

**Files:**
- Create: `read-rank/src/components/__tests__/Motif.test.tsx`
- Modify: `read-rank/src/components/motif/Motif.tsx`

- [ ] **Step 1: Write failing tests**

Create `read-rank/src/components/__tests__/Motif.test.tsx`:

```tsx
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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
```

- [ ] **Step 2: Run to confirm the tests fail**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
npx vitest run src/components/__tests__/Motif.test.tsx
```

Expected: "renders SVG... immediately" FAILS (currently goes through async fetch) or the `fetchBoundary` is still called.

- [ ] **Step 3: Implement the inline geometry path in `Motif.tsx`**

Replace the entire contents of `read-rank/src/components/motif/Motif.tsx` with:

```tsx
// src/components/motif/Motif.tsx
import { useEffect, useState } from 'react';
import { resolveMotif, fallbackArrangement } from './resolveMotif';
import { projectGeoJson, geometryBbox } from './projectGeoJson';
import { DotField } from './DotField';
import { fetchBoundary } from '../../data/api';
import type { BoundaryRef, GeoJsonGeometry } from '../../data/api';
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
function computeInlinePaths(child: GeoJsonGeometry, frame: GeoJsonGeometry | undefined): Paths {
  if (frame) {
    const bbox = geometryBbox(frame);
    return {
      frame: projectGeoJson(frame, { bbox }).path,
      child: projectGeoJson(child, { bbox }).path,
    };
  }
  return { child: projectGeoJson(child).path };
}

function BoundaryMotif({ childRef, frameRef, fallback }: {
  childRef: BoundaryRef; frameRef: BoundaryRef | null; fallback: 'full' | 'cluster' | 'point';
}) {
  const [paths, setPaths] = useState<Paths | null>(() =>
    childRef.geojson
      ? computeInlinePaths(childRef.geojson, frameRef?.geojson)
      : null,
  );

  const cl = childRef.layer, cg = childRef.geoid;
  const fl = frameRef?.layer ?? null, fg = frameRef?.geoid ?? null;
  const hasInlineGeom = Boolean(childRef.geojson);

  useEffect(() => {
    if (hasInlineGeom) return; // already resolved from props — no fetch needed
    let alive = true;
    (async () => {
      const child = await fetchBoundary({ layer: cl, geoid: cg });
      if (!alive) return;
      if (!child) { setPaths(null); return; }
      if (fl && fg) {
        const frame = await fetchBoundary({ layer: fl, geoid: fg });
        if (!alive) return;
        if (frame) {
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
  }, [cl, cg, fl, fg, hasInlineGeom]);

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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
npx vitest run src/components/__tests__/Motif.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run the full frontend test suite**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Type-check**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
git add src/components/motif/Motif.tsx src/components/__tests__/Motif.test.tsx
git commit -m "feat(motif): use inline geojson from races response, skip secondary fetch"
```

---

## Self-Review Checklist

| Spec requirement | Covered by |
|---|---|
| `getBoundaryBatch` deduplicates refs | Task 1 test + implementation |
| `getBoundaryBatch` uses one IN-list query | Task 1 test (`toHaveBeenCalledTimes(1)`) |
| Antimeridian handling preserved | Task 1 SQL (same `ST_ShiftLongitude` logic as `getBoundary`) |
| `getPlayableRaces` calls batch after SQL | Task 2 implementation + test |
| Geometry attached to `boundaryRef` and `frameRef` | Task 2 test assertion |
| `getBoundaryBatch` throw = graceful degradation | Task 2 "throws" test |
| `BoundaryRef` type extended with `bbox?`/`geojson?` — both repos | Task 2 (backend), Task 3 (frontend) |
| `BoundaryMotif` uses inline geometry with no fetch | Task 4 "fast path" tests |
| `BoundaryMotif` falls back to fetch when geojson absent | Task 4 "fetch fallback" test |
| `/api/inform/boundary` endpoint unchanged | Not touched in any task ✓ |
| Payload impact: geometry already simplified at 0.001° | Preserved in `getBoundaryBatch` SQL ✓ |
