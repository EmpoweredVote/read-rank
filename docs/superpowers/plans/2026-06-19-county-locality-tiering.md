# County-level Locality Tiering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "same county" relevance tier to the read-rank race hub, between the exact-district ("Your races") and same-state ("More in {STATE}") tiers.

**Architecture:** County is identified by 5-digit county FIPS GEOID on both sides. The ev-accounts backend (a) attaches a per-race county *set* (`countyGeoIds`) — a set because state-legislative districts cross county lines — and (b) returns the user's home county GEOID from the address-search geocode it already performs. The read-rank frontend stores the user's county on `locationFilter` and the pure `groupRaces` helper adds a county tier matched by set membership.

**Tech Stack:** TypeScript, Node/Express + PostGIS (ev-accounts backend), React + Zustand + Vitest (read-rank frontend). Backend tests mock `pool.query`; frontend logic is unit-tested via Vitest.

**Spec:** [`docs/superpowers/specs/2026-06-19-county-locality-tiering-design.md`](../specs/2026-06-19-county-locality-tiering-design.md)

**Ordering:** Backend first (Tasks 1–3, repo `ev-accounts`), then frontend (Tasks 4–9, repo `read-rank`), so the frontend builds against a real response shape.

---

## File map

**ev-accounts** (`/Users/chrisandrews/Documents/GitHub/ev-accounts`)
- `backend/src/lib/informBoundaryService.ts` — add member county GEOIDs to `UnionFrame` (Task 1)
- `backend/src/lib/informBoundaryService.test.ts` — test the new field (Task 1)
- `backend/src/lib/readrankService.ts` — `countyGeoIds` on `RaceSummary` + derivation (Task 2)
- `backend/src/lib/readrankService.test.ts` — derivation tests (Task 2)
- `backend/src/lib/essentialsService.ts` — `pickCountyFromDistrictRows` helper + `county` on `AddressSearchResult` (Task 3)
- `backend/src/lib/essentialsService.test.ts` — **new file**, tests the pure helper (Task 3)
- `backend/src/routes/essentialsCandidates.ts` — include `county` in the `/search` JSON (Task 3)

**read-rank** (`/Users/chrisandrews/Documents/GitHub/read-rank`)
- `src/data/api.ts` — `countyGeoIds` on `RaceSummary`; `county` on `SearchPoliticiansResult` (Tasks 4, 7)
- `src/utils/raceGrouping.ts` — county tier (Task 5)
- `src/utils/__tests__/raceGrouping.test.ts` — county tier tests (Task 5)
- `src/store/useReadRankStore.ts` — `county`/`countyName` on `LocationFilter` + migrate (Task 6)
- `src/components/AddressFilterInput.tsx` + `src/App.tsx` — capture county (Task 8)
- `src/components/RaceHub.tsx` — pass county args; county-aware no-match note (Task 9)

---

## Task 1: Expose member county GEOIDs from `getCountyUnionFrames` (ev-accounts)

**Why:** State-legislative districts (`G5210`/`G5220`) span multiple counties. `getCountyUnionFrames` already computes which counties each district overlaps (to draw the union outline) but discards the GEOIDs. Task 2 needs them.

**Files:**
- Modify: `backend/src/lib/informBoundaryService.ts` (interface ~line 120; query ~lines 150–199)
- Test: `backend/src/lib/informBoundaryService.test.ts`

Run all commands from `/Users/chrisandrews/Documents/GitHub/ev-accounts/backend`.

- [ ] **Step 1: Add `getCountyUnionFrames` to the test file imports**

In `backend/src/lib/informBoundaryService.test.ts`, change line 6 from:

```ts
import { getBoundary, getBoundaryBatch } from './informBoundaryService.js';
```

to:

```ts
import { getBoundary, getBoundaryBatch, getCountyUnionFrames } from './informBoundaryService.js';
```

- [ ] **Step 2: Write the failing tests**

Append to `backend/src/lib/informBoundaryService.test.ts`:

```ts
describe('getCountyUnionFrames', () => {
  it('returns an empty map and fires no query when refs is empty', async () => {
    const out = await getCountyUnionFrames([]);
    expect(out.size).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('exposes member county geoids alongside the union frame', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      layer: 'G5220', geoid: '49021',
      minx: -112.5, miny: 40.0, maxx: -111.5, maxy: 40.9,
      geojson: '{"type":"MultiPolygon","coordinates":[]}',
      county_geoids: ['49035', '49045'],
    }] });

    const out = await getCountyUnionFrames([{ layer: 'G5220', geoid: '49021' }]);

    expect(out.get('G5220:49021')).toMatchObject({
      bbox: [-112.5, 40.0, -111.5, 40.9],
      countyGeoIds: ['49035', '49045'],
    });
  });

  it('defaults countyGeoIds to [] when the column is null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      layer: 'G5220', geoid: '49021',
      minx: -112.5, miny: 40.0, maxx: -111.5, maxy: 40.9,
      geojson: '{"type":"MultiPolygon","coordinates":[]}',
      county_geoids: null,
    }] });

    const out = await getCountyUnionFrames([{ layer: 'G5220', geoid: '49021' }]);

    expect(out.get('G5220:49021')?.countyGeoIds).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/informBoundaryService.test.ts`
Expected: FAIL — `countyGeoIds` is `undefined` on the returned frame (property does not exist yet).

- [ ] **Step 4: Add `countyGeoIds` to the `UnionFrame` interface**

In `backend/src/lib/informBoundaryService.ts`, change the interface (~lines 120–123) from:

```ts
export interface UnionFrame {
  bbox: [number, number, number, number];
  geojson: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
}
```

to:

```ts
export interface UnionFrame {
  bbox: [number, number, number, number];
  geojson: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  /** GEOIDs of the G4020 counties this district overlaps. Drives the county relevance tier. */
  countyGeoIds: string[];
}
```

- [ ] **Step 5: Aggregate and select the member GEOIDs in the query**

In the same file, in the `getCountyUnionFrames` query (~lines 155–182):

Change the `u` CTE to also aggregate county GEOIDs:

```sql
     u AS (
       SELECT d.layer, d.geoid, ST_Multi(ST_Union(c.geometry)) AS geom,
              array_agg(DISTINCT c.geo_id ORDER BY c.geo_id) AS county_geoids
       FROM dist d
       JOIN essentials.geofence_boundaries c
         ON c.mtfcc = 'G4020'
        AND ST_Intersects(c.geometry, d.geometry)
        AND ST_Area(ST_Intersection(c.geometry, d.geometry)) > 1e-9
       GROUP BY d.layer, d.geoid
     ),
```

Change the `s` CTE to carry the column through:

```sql
     s AS (
       SELECT layer, geoid, county_geoids,
              CASE WHEN (ST_XMax(geom) - ST_XMin(geom)) > 180
                   THEN ST_ShiftLongitude(geom) ELSE geom END AS geom
       FROM u
     )
```

Change the final `SELECT` to return it:

```sql
     SELECT layer, geoid, county_geoids,
            ST_XMin(ST_Envelope(geom)) AS minx, ST_YMin(ST_Envelope(geom)) AS miny,
            ST_XMax(ST_Envelope(geom)) AS maxx, ST_YMax(ST_Envelope(geom)) AS maxy,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.001)) AS geojson
     FROM s
```

- [ ] **Step 6: Add `county_geoids` to the row type and populate the result**

In the same function, change the `pool.query<{...}>` row type to include the column:

```ts
  const { rows } = await pool.query<{
    layer: string; geoid: string;
    minx: number | null; miny: number | null; maxx: number | null; maxy: number | null;
    geojson: string | null;
    county_geoids: string[] | null;
  }>(
```

Then in the result-building loop, change the `result.set(...)` call to include `countyGeoIds`:

```ts
    result.set(`${row.layer}:${row.geoid}`, {
      bbox: [Number(row.minx), Number(row.miny), Number(row.maxx), Number(row.maxy)],
      geojson,
      countyGeoIds: row.county_geoids ?? [],
    });
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/lib/informBoundaryService.test.ts`
Expected: PASS (all three new tests plus the existing `getBoundary`/`getBoundaryBatch` tests).

- [ ] **Step 8: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/ev-accounts
git add backend/src/lib/informBoundaryService.ts backend/src/lib/informBoundaryService.test.ts
git commit -m "feat(inform): expose member county geoids on union frames

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Derive per-race `countyGeoIds` in `getPlayableRaces` (ev-accounts)

**Files:**
- Modify: `backend/src/lib/readrankService.ts` (`RaceSummary` interface ~lines 41–58; mapping ~lines 363–432)
- Test: `backend/src/lib/readrankService.test.ts`

Run all commands from `/Users/chrisandrews/Documents/GitHub/ev-accounts/backend`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/lib/readrankService.test.ts` (the file already defines `BASE_ROW`, a `G4110` city race framed to `G4020` county `18105`, and mocks `mockGetCountyUnionFrames`):

```ts
describe('getPlayableRaces — countyGeoIds', () => {
  it('uses the G4020 frame geoid for a city race', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [BASE_ROW] }); // G4110 framed to G4020 18105
    const [race] = await getPlayableRaces();
    expect(race.countyGeoIds).toEqual(['18105']);
  });

  it('uses the boundary geoid for a county race', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      ...BASE_ROW,
      position_name: 'County Commission',
      jurisdiction_level: 'county',
      boundary_layer: 'G4020', boundary_geoid: '18105',
      frame_layer: null, frame_geoid: null,
    }] });
    const [race] = await getPlayableRaces();
    expect(race.countyGeoIds).toEqual(['18105']);
  });

  it('uses the union member counties for a state-legislative district', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      ...BASE_ROW,
      position_name: 'State Senate District 21',
      jurisdiction_level: 'state',
      boundary_layer: 'G5210', boundary_geoid: '49021',
      frame_layer: null, frame_geoid: null,
    }] });
    mockGetCountyUnionFrames.mockResolvedValueOnce(new Map([
      ['G5210:49021', { bbox: [0, 0, 1, 1], geojson: { type: 'MultiPolygon', coordinates: [] }, countyGeoIds: ['49035', '49045'] }],
    ]));
    const [race] = await getPlayableRaces();
    expect(race.countyGeoIds).toEqual(['49035', '49045']);
  });

  it('is [] for a statewide race', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      ...BASE_ROW,
      position_name: 'Governor',
      jurisdiction_level: 'state',
      boundary_layer: null, boundary_geoid: null,
      frame_layer: null, frame_geoid: null,
    }] });
    const [race] = await getPlayableRaces();
    expect(race.countyGeoIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/readrankService.test.ts`
Expected: FAIL — `race.countyGeoIds` is `undefined` (property not yet on the returned object).

- [ ] **Step 3: Add `countyGeoIds` to the `RaceSummary` interface**

In `backend/src/lib/readrankService.ts`, in the `RaceSummary` interface (~lines 41–58), add the field after `frameRef`:

```ts
  boundaryRef: BoundaryRef | null;
  frameRef: BoundaryRef | null;
  /** GEOIDs of the counties this race belongs to (set, since state-leg districts cross
   *  county lines). [] for statewide / federal / unframed races. */
  countyGeoIds: string[];
}
```

- [ ] **Step 4: Derive and attach `countyGeoIds` in the mapping**

In `getPlayableRaces`, inside `rows.map((r) => { ... })`, after `frameRef` is finalized and before the `return {`, add the derivation. Place it just above the `return {` statement (~line 414):

```ts
    // County set for the relevance tier. county/city/ward-council come from the
    // single G4020 boundary or frame already computed; state-leg districts use the
    // union member counties; everything else has no single county → [].
    let countyGeoIds: string[] = [];
    if (scope === 'county' && r.boundary_geoid) {
      countyGeoIds = [r.boundary_geoid];
    } else if (
      (childLayer === 'G4110' || childLayer.startsWith('X')) &&
      r.frame_layer === 'G4020' && r.frame_geoid
    ) {
      countyGeoIds = [r.frame_geoid];
    } else if (childLayer === 'G5210' || childLayer === 'G5220') {
      const uf = r.boundary_geoid ? unionFrameMap.get(`${childLayer}:${r.boundary_geoid}`) : undefined;
      countyGeoIds = uf?.countyGeoIds ?? [];
    }
```

Then add `countyGeoIds` to the returned object (in the `return { ... }`, after `frameRef`):

```ts
      boundaryRef,
      frameRef,
      countyGeoIds,
      isLocal: localSet.size > 0 && (r.politician_ids ?? []).some((id) => localSet.has(id)),
    };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/readrankService.test.ts`
Expected: PASS (the four new tests plus all existing ones).

- [ ] **Step 6: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/ev-accounts
git add backend/src/lib/readrankService.ts backend/src/lib/readrankService.test.ts
git commit -m "feat(readrank): attach countyGeoIds to each playable race

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Return the user's county from address search (ev-accounts)

**Why:** `/essentials/candidates/search` already geocodes the address and matches the `G4020` county district, but drops the GEOID. Surface it so the frontend can match against `countyGeoIds`. The pick logic is extracted into a pure, unit-testable helper because `getRepresentativesByAddress` itself does live geocoding + DB I/O with no test harness.

**Files:**
- Modify: `backend/src/lib/essentialsService.ts` (`AddressSearchResult` ~lines 153–163; function ~lines 559–798)
- Create: `backend/src/lib/essentialsService.test.ts`
- Modify: `backend/src/routes/essentialsCandidates.ts` (`/search` response ~lines 115–118)

Run all commands from `/Users/chrisandrews/Documents/GitHub/ev-accounts/backend`.

- [ ] **Step 1: Write the failing test for the pure helper**

Create `backend/src/lib/essentialsService.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickCountyFromDistrictRows } from './essentialsService.js';

describe('pickCountyFromDistrictRows', () => {
  it('returns geoid + name from the G4020 row', () => {
    const rows = [
      { mtfcc: 'G5220', district_type: 'STATE_LOWER', geo_id: '49021', district_label: 'House District 21' },
      { mtfcc: 'G4020', district_type: 'COUNTY', geo_id: '49035', district_label: 'Salt Lake County' },
    ];
    expect(pickCountyFromDistrictRows(rows)).toEqual({ geoid: '49035', name: 'Salt Lake County' });
  });

  it('matches a COUNTY district_type even if mtfcc is non-standard', () => {
    const rows = [{ mtfcc: 'X0001', district_type: 'COUNTY', geo_id: '49035', district_label: 'Salt Lake County' }];
    expect(pickCountyFromDistrictRows(rows)).toEqual({ geoid: '49035', name: 'Salt Lake County' });
  });

  it('returns null when no county row is present', () => {
    const rows = [{ mtfcc: 'G5220', district_type: 'STATE_LOWER', geo_id: '49021', district_label: 'House District 21' }];
    expect(pickCountyFromDistrictRows(rows)).toBeNull();
  });

  it('returns null when the county row has no geo_id', () => {
    const rows = [{ mtfcc: 'G4020', district_type: 'COUNTY', geo_id: '', district_label: 'Salt Lake County' }];
    expect(pickCountyFromDistrictRows(rows)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/essentialsService.test.ts`
Expected: FAIL — `pickCountyFromDistrictRows` is not exported / not defined.

- [ ] **Step 3: Add the pure helper**

In `backend/src/lib/essentialsService.ts`, add this exported helper just above the `getRepresentativesByAddress` function (~line 559, before its doc comment):

```ts
/** Pick the user's county (GEOID + name) from the geofence district rows.
 *  A county is the row with mtfcc G4020 or district_type COUNTY. Null when absent. */
export function pickCountyFromDistrictRows(
  rows: Array<{ mtfcc?: string | null; district_type?: string | null; geo_id?: string | null; district_label?: string | null }>,
): { geoid: string; name: string } | null {
  const row = rows.find((r) => r.mtfcc === 'G4020' || r.district_type === 'COUNTY');
  if (!row || !row.geo_id) return null;
  return { geoid: row.geo_id, name: row.district_label ?? '' };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/essentialsService.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Add `county` to `AddressSearchResult` and wire it into the return values**

In `backend/src/lib/essentialsService.ts`, change the `AddressSearchResult` interface (~lines 153–163) to add `county`:

```ts
export interface AddressSearchResult {
  politicians: PoliticianFlatRecord[];
  jurisdiction: {
    district_type: string;
    district_id: string;
    district_label: string;
    mtfcc: string;
  } | null;
  matchedAddress: string;
  tribal_land: { on_reservation: boolean; name?: string };
  /** User's home county (5-digit FIPS GEOID + name), or null when unresolved. */
  county: { geoid: string; name: string } | null;
}
```

In the early no-match return (~lines 728–733), add `county: null`:

```ts
    return {
      politicians: [],
      jurisdiction: null,
      matchedAddress,
      tribal_land: tribal_land ?? { on_reservation: false },
      county: null,
    };
```

In the main return (~line 797), compute and include `county` from the **district** rows (not the combined `rows`, so a statewide row can't shadow it). Add this line just before the `return`:

```ts
  const county = pickCountyFromDistrictRows(districtResult.rows as Array<{ mtfcc?: string | null; district_type?: string | null; geo_id?: string | null; district_label?: string | null }>);
  return { politicians, jurisdiction, matchedAddress, tribal_land, county };
```

- [ ] **Step 6: Include `county` in the `/search` route response**

In `backend/src/routes/essentialsCandidates.ts`, change the `/search` JSON response (~lines 115–118) to add `county`:

```ts
    res.status(200).json({
      politicians: result.politicians,
      tribal_land: result.tribal_land ?? { on_reservation: false },
      county: result.county ?? null,
    });
```

- [ ] **Step 7: Verify the whole backend suite + types are green**

Run: `npx vitest run && npx tsc -b --noEmit`
Expected: PASS / no type errors. (`tsc` confirms the two new return statements satisfy `AddressSearchResult`.)

- [ ] **Step 8: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/ev-accounts
git add backend/src/lib/essentialsService.ts backend/src/lib/essentialsService.test.ts backend/src/routes/essentialsCandidates.ts
git commit -m "feat(essentials): return user's county geoid from address search

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Add `countyGeoIds` to the read-rank `RaceSummary` type (read-rank)

**Why:** Mirror the backend contract so `groupRaces` (Task 5) can read it.

**Files:**
- Modify: `src/data/api.ts` (`RaceSummary` interface ~lines 12–36)

Run commands from `/Users/chrisandrews/Documents/GitHub/read-rank`. You should be on branch `feat/county-locality-tiering` (created during brainstorming). Confirm with `git branch --show-current`; if not, run `git checkout feat/county-locality-tiering`.

- [ ] **Step 1: Add the field**

In `src/data/api.ts`, in the `RaceSummary` interface, add after `frameRef` (~line 29):

```ts
  /** Parent boundary to nest the child inside (backend-resolved). Null = render child alone. */
  frameRef?: BoundaryRef | null;
  /** GEOIDs of the counties this race belongs to (set; state-leg districts cross county
   *  lines). Absent/[] for statewide, federal, and unframed races. */
  countyGeoIds?: string[];
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/api.ts
git commit -m "feat(api): add countyGeoIds to RaceSummary

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: County tier in `groupRaces` (read-rank)

**Files:**
- Modify: `src/utils/raceGrouping.ts`
- Test: `src/utils/__tests__/raceGrouping.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/__tests__/raceGrouping.test.ts`:

```ts
describe('groupRaces — county tier', () => {
  const slcExact = race({ raceId: 'slc-exact', state: 'UT', isLocal: true, countyGeoIds: ['49035'], electionDate: '2026-06-23' });
  const slcCounty = race({ raceId: 'slc-county', state: 'UT', isLocal: false, countyGeoIds: ['49035'], electionDate: '2026-06-23' });
  const utElsewhere = race({ raceId: 'ut-elsewhere', state: 'UT', isLocal: false, countyGeoIds: ['49049'], electionDate: '2026-06-23' });
  const multiCounty = race({ raceId: 'multi', state: 'UT', isLocal: false, countyGeoIds: ['49035', '49045'], electionDate: '2026-06-23' });

  it('orders bands: your, county, state, other', () => {
    const result = groupRaces({
      races: [slcExact, slcCounty, utElsewhere, caOther],
      located: true, userState: 'UT', userCounty: '49035', userCountyName: 'Salt Lake County',
      timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.map((s) => s.kind)).toEqual(['your', 'county', 'state', 'other']);
  });

  it('labels the county band with the user county name', () => {
    const result = groupRaces({
      races: [slcCounty], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.find((s) => s.kind === 'county')?.label).toBe('In Salt Lake County');
  });

  it('routes a same-county non-local race to county, not state', () => {
    const result = groupRaces({
      races: [slcCounty, utElsewhere], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['slc-county']);
    expect(result.sections.find((s) => s.kind === 'state')?.races.map((r) => r.raceId)).toEqual(['ut-elsewhere']);
  });

  it('puts a multi-county race in the county tier for a voter in any member county', () => {
    const inA = groupRaces({
      races: [multiCounty], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    const inB = groupRaces({
      races: [multiCounty], located: true, userState: 'UT',
      userCounty: '49045', userCountyName: 'Tooele County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(inA.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['multi']);
    expect(inB.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['multi']);
  });

  it('omits the county band when the user has no county', () => {
    const result = groupRaces({
      races: [slcCounty], located: true, userState: 'UT',
      userCounty: null, userCountyName: null, timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.some((s) => s.kind === 'county')).toBe(false);
    expect(result.sections.find((s) => s.kind === 'state')?.races.map((r) => r.raceId)).toEqual(['slc-county']);
  });

  it('never county-tiers a race with no countyGeoIds', () => {
    const noCounty = race({ raceId: 'nocounty', state: 'UT', isLocal: false, electionDate: '2026-06-23' });
    const result = groupRaces({
      races: [noCounty], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'upcoming', today: TODAY,
    });
    expect(result.sections.some((s) => s.kind === 'county')).toBe(false);
  });

  it('honors the county tier under the Past filter', () => {
    const pastCounty = race({ raceId: 'past-county', state: 'UT', isLocal: false, countyGeoIds: ['49035'], electionDate: '2026-05-05' });
    const result = groupRaces({
      races: [pastCounty], located: true, userState: 'UT',
      userCounty: '49035', userCountyName: 'Salt Lake County', timeFilter: 'past', today: TODAY,
    });
    expect(result.sections.find((s) => s.kind === 'county')?.races.map((r) => r.raceId)).toEqual(['past-county']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts`
Expected: FAIL — `groupRaces` does not accept `userCounty`/`userCountyName` and never emits a `'county'` section.

- [ ] **Step 3: Add the `'county'` kind and new args to the types**

In `src/utils/raceGrouping.ts`, change the `SectionKind` union (line 6):

```ts
export type SectionKind = 'your' | 'county' | 'state' | 'other' | 'state-named';
```

Add the two optional args to `GroupRacesArgs` (after `userState`):

```ts
  /** Two-letter state code, or null when unknown / not located. */
  userState: string | null;
  /** User's home county GEOID (5-digit FIPS), or null. Drives the "In {County}" tier. */
  userCounty?: string | null;
  /** Display name for the county band label. */
  userCountyName?: string | null;
```

- [ ] **Step 4: Insert the county tier in the located branch**

In `groupRaces`, destructure the new args (line 54):

```ts
  const { races, located, userState, userCounty = null, userCountyName = null, timeFilter, today } = args;
```

Then replace the located-branch tiering (~lines 85–103) — the block starting `const your = ...` through the `if (other.length) {...}` push — with:

```ts
  const your = inBucket.filter((r) => r.isLocal);
  const inCounty = inBucket.filter(
    (r) => !r.isLocal && userCounty != null && (r.countyGeoIds ?? []).includes(userCounty),
  );
  const sameState = inBucket.filter(
    (r) =>
      !r.isLocal &&
      !(userCounty != null && (r.countyGeoIds ?? []).includes(userCounty)) &&
      userState != null && r.state === userState,
  );
  const other = inBucket.filter(
    (r) =>
      !r.isLocal &&
      !(userCounty != null && (r.countyGeoIds ?? []).includes(userCounty)) &&
      !(userState != null && r.state === userState),
  );

  const sections: RaceSection[] = [];
  if (your.length) {
    sections.push({ kind: 'your', label: 'Your races', collapsible: false, races: your });
  }
  if (inCounty.length) {
    sections.push({ kind: 'county', label: `In ${userCountyName ?? 'your county'}`, collapsible: false, races: inCounty });
  }
  if (sameState.length) {
    const stateName = getStateName(userState) ?? 'your state';
    sections.push({ kind: 'state', label: `More in ${stateName}`, collapsible: false, races: sameState });
  }
  if (other.length) {
    sections.push({ kind: 'other', label: 'Other states', collapsible: true, races: other });
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts`
Expected: PASS — the new county-tier tests plus all pre-existing `groupRaces` tests (the new args are optional, so existing call sites in the test file still compile).

- [ ] **Step 6: Commit**

```bash
git add src/utils/raceGrouping.ts src/utils/__tests__/raceGrouping.test.ts
git commit -m "feat(grouping): add same-county relevance tier

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Store the user's county on `LocationFilter` (read-rank)

**Files:**
- Modify: `src/store/useReadRankStore.ts` (`LocationFilter` ~lines 73–79; `migrate` ~lines 471–485)

- [ ] **Step 1: Add the fields to `LocationFilter`**

In `src/store/useReadRankStore.ts`, change the `LocationFilter` interface (~lines 73–79):

```ts
export interface LocationFilter {
  address: string;
  politicianIds: string[];
  /** Two-letter state parsed from the address; null when unparseable. Drives the
   *  same-state ("More in {STATE}") relevance tier on the race hub. */
  state: string | null;
  /** User's home county GEOID (5-digit FIPS) from the address-search geocode; null
   *  when unresolved. Drives the "In {County}" relevance tier. */
  county: string | null;
  /** Display name for the county; null when unknown. */
  countyName: string | null;
}
```

- [ ] **Step 2: Coerce the new fields in `migrate` (no version bump)**

In the `migrate` function (~lines 481–484), change the `locationFilter` coercion to also default `county`/`countyName`:

```ts
          locationFilter: prev.locationFilter
            ? {
                ...prev.locationFilter,
                state: prev.locationFilter.state ?? null,
                county: prev.locationFilter.county ?? null,
                countyName: prev.locationFilter.countyName ?? null,
              }
            : null,
```

Leave `version: 9` unchanged — bumping it runs the reset branch that wipes `raceProgress`, and runtime reads coerce missing county with `?? null` anyway.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc -b --noEmit`
Expected: errors at the two construction sites (`AddressFilterInput.tsx`, `App.tsx`) because the new required `county`/`countyName` are missing. **This is expected** — Task 8 fills them. Do not "fix" them by making the fields optional.

- [ ] **Step 4: Commit**

```bash
git add src/store/useReadRankStore.ts
git commit -m "feat(store): add county/countyName to LocationFilter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Parse `county` from the search response (read-rank)

**Files:**
- Modify: `src/data/api.ts` (`SearchPoliticiansResult` ~lines 218–223; `searchPoliticians` ~lines 225–245)

- [ ] **Step 1: Add `county` to `SearchPoliticiansResult`**

In `src/data/api.ts`, change the interface (~lines 218–223):

```ts
export interface SearchPoliticiansResult {
  status: string;
  data: SearchPolitician[];
  formattedAddress: string;
  county: { geoid: string; name: string } | null;
  error?: string;
}
```

- [ ] **Step 2: Populate `county` on every return path**

In `searchPoliticians`, the function has four `return` statements. Add `county` to each:

- Unauthorized (`!res`): `return { status: 'error', data: [], error: 'Unauthorized', formattedAddress: '', county: null };`
- Non-OK response: `return { status: 'error', data: [], error: \`${res.status} ${res.statusText}\`, formattedAddress: '', county: null };`
- Catch block: `return { status: 'error', data: [], error: (error as Error).message, formattedAddress: '', county: null };`
- Success path — change the final return to read `raw.county`:

```ts
    const raw = await res.json();
    const data: SearchPolitician[] = Array.isArray(raw) ? raw : (raw?.politicians ?? []);
    const county = (raw && !Array.isArray(raw) && raw.county) ? raw.county as { geoid: string; name: string } : null;
    return { status: status || 'fresh', data, formattedAddress, county };
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc -b --noEmit`
Expected: same two construction-site errors as Task 6 (still unfilled until Task 8); no new errors in `api.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/data/api.ts
git commit -m "feat(api): parse user county from candidate search response

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Capture county at both `LocationFilter` construction sites (read-rank)

**Files:**
- Modify: `src/components/AddressFilterInput.tsx` (`handlePlaceSelected` ~lines 44–48)
- Modify: `src/App.tsx` (URL-param handler ~lines 62–66)

- [ ] **Step 1: Set county in `AddressFilterInput`**

In `src/components/AddressFilterInput.tsx`, change the `setLocationFilter` call (~lines 44–48) to include county from the search `result`:

```ts
      setLocationFilter({
        address: formattedAddress,
        politicianIds,
        state: parseStateFromAddress(formattedAddress),
        county: result.county?.geoid ?? null,
        countyName: result.county?.name ?? null,
      });
```

- [ ] **Step 2: Set county in `App.tsx`**

In `src/App.tsx`, change the `setLocationFilter` call (~lines 62–66) to include county from `result`:

```ts
        setLocationFilter({
          address: decoded,
          politicianIds: result.data.map(p => p.id),
          state: parseStateFromAddress(decoded),
          county: result.county?.geoid ?? null,
          countyName: result.county?.name ?? null,
        });
```

- [ ] **Step 3: Verify types compile and the suite is green**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: no type errors (both construction sites now satisfy `LocationFilter`); all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/AddressFilterInput.tsx src/App.tsx
git commit -m "feat: capture user county when applying the address filter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Wire the county tier into `RaceHub` + county-aware note (read-rank)

**Files:**
- Modify: `src/components/RaceHub.tsx` (`groupRaces` call ~lines 104–108; no-match note ~lines 185–190)

- [ ] **Step 1: Pass county args to `groupRaces`**

In `src/components/RaceHub.tsx`, change the located/userState block and the `groupRaces` call (~lines 104–108):

```ts
  const located = locationFilter != null;
  const userState = locationFilter?.state ?? null;
  const userCounty = locationFilter?.county ?? null;
  const userCountyName = locationFilter?.countyName ?? null;
  const { sections, noExactMatch } = groupRaces({
    races, located, userState, userCounty, userCountyName, timeFilter, today: todayISO(),
  });
```

- [ ] **Step 2: Make the no-exact-match note county-aware**

Replace the no-exact-match note block (~lines 185–190) with a version that prefers the county band when present:

```tsx
          {/* No-exact-match note — point at the county if we have one, else the state */}
          {noExactMatch && sections.some((s) => s.kind === 'county' || s.kind === 'state') && (
            <p className="text-center mb-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              We couldn&apos;t pinpoint your exact districts — here are races in {
                sections.some((s) => s.kind === 'county')
                  ? (userCountyName ?? 'your county')
                  : (getStateName(userState) ?? 'your state')
              }.
            </p>
          )}
```

- [ ] **Step 3: Verify types, the full suite, and lint**

Run: `npx tsc -b --noEmit && npx vitest run && npm run lint`
Expected: no type errors; all tests pass (including the existing `RaceHub.test.tsx` render test); lint clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/RaceHub.tsx
git commit -m "feat(hub): render the same-county tier and county-aware note

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] **read-rank gate**

Run from `/Users/chrisandrews/Documents/GitHub/read-rank`:
`npx tsc -b --noEmit && npx vitest run && npm run lint`
Expected: all green.

- [ ] **ev-accounts gate**

Run from `/Users/chrisandrews/Documents/GitHub/ev-accounts/backend`:
`npx vitest run && npx tsc -b --noEmit`
Expected: all green.

- [ ] **Manual smoke (optional, needs both services + a UT address)**

With the backend running, apply an address in Salt Lake County on the hub. Expect a band order of `Your races` → `In Salt Lake County` → `More in Utah` → `Other states`, with county-only races appearing under the county band rather than the state band.

---

## Notes for the implementer

- **Cross-repo:** Tasks 1–3 are in `ev-accounts`; Tasks 4–9 are in `read-rank` (branch `feat/county-locality-tiering`). Each task's commit commands `cd` to the right repo.
- **Why `countyGeoIds` is optional on the frontend `RaceSummary` but required on the backend:** the backend always emits it; the frontend marks it optional so mock/legacy payloads (e.g. `mockData`, offline fallback) and old cached responses don't break — `groupRaces` coerces missing to `[]`.
- **v1 scope boundary (documented in the spec):** school districts and townships get `countyGeoIds = []` and stay in the state tier. No action needed here.
