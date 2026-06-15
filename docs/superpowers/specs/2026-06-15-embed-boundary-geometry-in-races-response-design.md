# Design: Embed Boundary Geometry in Races Response

**Date:** 2026-06-15  
**Status:** Approved  
**Repos affected:** `backend`, `read-rank`

## Problem

On the Read & Rank landing page, race cards display a geographic motif (state/city/county outline) in the top-left corner. This geometry is fetched in a secondary `useEffect` after the cards render, causing a visible dot-field → geographic outline morph that looks like a bug.

## Goal

Eliminate the secondary boundary fetch by embedding geometry inline in the `/api/readrank/races` response, so `Motif` renders the final state on first paint.

## Non-goals

- Do not change or remove the `/api/inform/boundary` endpoint — other consumers may use it.
- Do not pre-project SVG paths on the backend — projection logic stays in the frontend.
- Do not change any other Read & Rank routes.

---

## Architecture

Three layers change across two repos:

```
backend/src/lib/informBoundaryService.ts  — add getBoundaryBatch()
backend/src/lib/readrankService.ts        — call batch fetch, attach geometry to RaceSummary
read-rank/src/components/motif/Motif.tsx  — use inline geometry when present, skip fetch
```

---

## Data Shape

`BoundaryRef` (used in both `boundaryRef` and `frameRef` on `RaceSummary`) gains two optional fields:

```ts
interface BoundaryRef {
  layer: string;
  geoid: string;
  bbox?: [number, number, number, number];           // [minLon, minLat, maxLon, maxLat]
  geojson?: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
}
```

Fields are optional so existing consumers that only read `layer`/`geoid` are unaffected.

Both repos must update their local `BoundaryRef` type definition to match.

---

## Backend Changes

### `informBoundaryService.ts` — add `getBoundaryBatch`

```ts
export async function getBoundaryBatch(
  refs: Array<{ layer: string; geoid: string }>
): Promise<Map<string, BoundaryResult>>
```

- Deduplicates refs by `"layer:geoid"` key before querying.
- Runs **one** SQL query using `WHERE (mtfcc, geo_id) IN (...)`.
- Applies the same `ST_SimplifyPreserveTopology(geom, 0.001)` and antimeridian `ST_ShiftLongitude` logic as `getBoundary`.
- Returns a `Map<"layer:geoid", BoundaryResult>` (only entries where `hasBoundary: true`).
- If `refs` is empty, returns an empty map immediately (no query).

### `readrankService.ts` — attach geometry in `getPlayableRaces`

After the main SQL query:

1. Collect all unique child refs and frame refs by scanning the raw SQL `rows` for non-null `(boundary_layer, boundary_geoid)` and `(frame_layer, frame_geoid)` pairs — before the `rows.map()` that builds summaries.
2. Call `getBoundaryBatch([...childRefs, ...frameRefs])` — one round trip covers both sets.
3. When building each `RaceSummary`, look up the geometry from the batch result:
   - If found, spread `bbox` and `geojson` into `boundaryRef` / `frameRef`.
   - If not found, leave `boundaryRef` / `frameRef` as `{ layer, geoid }` — no geometry, frontend falls back.

`RaceSummary` type updates `BoundaryRef` to the extended shape.

---

## Frontend Changes

### `Motif.tsx` — `BoundaryMotif` component

Current behavior: `useEffect` fires `fetchBoundary(childRef)` and optionally `fetchBoundary(frameRef)`.

Updated behavior:

- If `childRef.geojson` is present → initialize `useState` with the already-projected paths (computed inline during render from the prop data), and skip the `useEffect` fetch branch entirely. No async step; the geographic outline is in the initial render.
- If `childRef.geojson` is absent → fall back to existing `fetchBoundary` call (full backward compatibility).

The dot-field never renders for races that have inline geometry. For races without geometry (where `boundaryRef` is null or has no `geojson`), behavior is unchanged.

### `api.ts` / type definitions

Update the local `BoundaryRef` interface to include the optional `bbox` and `geojson` fields.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `getBoundaryBatch` throws | Caught in `getPlayableRaces`, races returned without geometry; frontend fetches as before |
| A specific ref not in DB | Omitted from batch result map; race gets `boundaryRef: { layer, geoid }` only |
| Frontend receives race without `geojson` | Existing `fetchBoundary` fallback runs unchanged |
| Frontend `fetchBoundary` also fails | Existing dot-field fallback renders unchanged |

No silent failures. Each degradation step is the same path that already works in production.

---

## Payload Impact

- Geometry is already simplified at `0.001°` tolerance.
- Typical boundary GeoJSON: 1–5 KB per ref.
- Typical landing page: 5–20 races, each with up to 2 refs (child + frame).
- Estimated addition to races response: **10–100 KB** — acceptable for a web app that already fetches this data per-race anyway.

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/lib/informBoundaryService.ts` | Add `getBoundaryBatch` export |
| `backend/src/lib/readrankService.ts` | Call batch, update `RaceSummary` type, attach geometry |
| `read-rank/src/components/motif/Motif.tsx` | Use inline geometry when present |
| `read-rank/src/data/api.ts` | Update `BoundaryRef` type |
