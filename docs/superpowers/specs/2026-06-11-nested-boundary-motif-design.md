# Nested-Boundary Motif — Design

**Date:** 2026-06-11
**Status:** Design approved, pending spec review
**Builds on:** `2026-06-11-landing-race-card-redesign-design.md` (the RaceCard motif system, now shipped). This adds geographic *context* to the motif.

---

## 1. Goal

Today the motif shows a single boundary (the race's constituency) alone. That orients well for shapes people recognize (states) but poorly for ones they don't (a county, a city, a council ward floating with no context). This feature renders each boundary **nested inside its parent** — a thin parent outline (the "frame") with the actual constituency **filled** inside it (the "child") — so the user can always tell *where* the race sits.

Guiding principle, in the user's words: **orienting the user takes precedence over strict hierarchy rules.** Identity (which place) always comes from the card's text label; the motif shows position.

---

## 2. The model

For each race the motif renders a **frame** (parent outline) and a **child** (filled constituency). The child is projected into the frame's coordinate space so it sits in the geographically correct spot.

| Race tier / scope | Frame outline | Filled child | Rationale |
|---|---|---|---|
| Federal statewide (U.S. Senate, President) | **US** | home **state** | National reach; the state is the senator's true constituency and is visible on the US map. |
| Federal district (U.S. House) | **US** | home **state** | Model **B**: national feel; the district is carried by the label (`U.S. House · IN-07`), not the map. Adjustable later. |
| State executive / statewide (Governor, AG, …) | *(none)* | **state** (alone) | The state is the jurisdiction; big and clean. The absent frame is what visually distinguishes a Governor from a Senator (same state shape). |
| State legislative district (state House/Senate) | **state** | the **district** | District is a visible chunk of the recognizable state. |
| County (Commission, Sheriff, …) | **state** | the **county** | County alone is hard to place; the state frame orients it. |
| Citywide (Mayor, City Attorney) | **county** | the **city** | A city is a real chunk of its county (a speck in a whole state). |
| Sub-city district (council, ward) | **city** | the **ward** | Ward is visible in its city; the label names the city. |

**Consistency note (accepted):** under model B, a U.S. House motif looks like a U.S. Senate motif (both US + state lit); only the label distinguishes them. Likewise a state-leg district and (if model B is ever revisited) a House district would both read as "a district in the state." The label is the differentiator. This is intentional per "typography leads."

---

## 3. Architecture

Two repos. The boundary endpoint is unchanged; the work is *which* geometries to fetch (backend resolves a parent ref) and *how* to render two of them (frontend).

### 3.1 Backend (`ev-accounts`, `backend/src/lib/readrankService.ts`)

`getPlayableRaces` already emits `boundaryRef` (the child). Add a sibling **`frameRef: { layer, geoid } | null`** and, for federal races, override the child. Resolution per race, from `tier` / `scope` / the child's `mtfcc` / the race `state` (USPS):

| Case (by tier + child mtfcc) | child `boundaryRef` | `frameRef` |
|---|---|---|
| `tier = federal` (any) | overridden to home state `{G4000, FIPS(state)}` | `{G4000, 'US'}` |
| `tier = state`, `scope = statewide` | `{G4000, FIPS(state)}` (existing fallback) | `null` |
| county `G4020`, state-leg `G5210/G5220`, school `G54xx` | existing child | `{G4000, FIPS(state)}` |
| city / place `G4110` | existing child | **county**, resolved by spatial containment |
| ward / custom `X…` | existing child | **city**, resolved by spatial containment |

- `FIPS(state)` uses the existing `USPS_TO_FIPS` map already in `readrankService.ts`.
- **Spatial containment** (city→county, ward→city): find the smallest enclosing boundary of the target `mtfcc` whose geometry contains the child's interior point. As a `LATERAL` join in the races query:
  ```sql
  LEFT JOIN LATERAL (
    SELECT p.mtfcc AS frame_layer, p.geo_id AS frame_geoid
    FROM essentials.geofence_boundaries child
    JOIN essentials.geofence_boundaries p
      ON p.mtfcc = $targetParentMtfcc
     AND ST_Contains(p.geometry, ST_PointOnSurface(child.geometry))
    WHERE child.mtfcc = <child_layer> AND child.geo_id = <child_geoid>
    ORDER BY ST_Area(p.geometry) ASC
    LIMIT 1
  ) frame ON true
  ```
  If no container exists (parent geometry not ingested), `frameRef` is `null` → the child renders alone (graceful).
- The `/api/inform/boundary` endpoint is **unchanged**. The frame is just another `(layer, geoid)` the frontend fetches; frame geometries (US, states, counties, cities) are large, immutable, and shared across many races, so they cache extremely well.

### 3.2 Frontend (`read-rank`)

- `src/data/api.ts`: add `frameRef?: { layer: string; geoid: string } | null` to `RaceSummary`. `RaceCard` passes it to `Motif`.
- `src/components/motif/projectGeoJson.ts`: refactor to accept an **explicit bbox** — `projectGeoJson(geom, { size, pad, bbox? })`. When `bbox` is given, project against it instead of the geometry's own extent. This lets two geometries share one projection.
- `src/components/motif/Motif.tsx`: when `frameRef` is present, fetch **both** child and frame via `fetchBoundary`, then:
  1. Compute the **frame's** bbox.
  2. Project the **frame** and the **child** both against the frame's bbox.
  3. Render the frame as an outline (`stroke`, no fill) and the child as a filled region (translucent accent fill + stroke) — the existing child styling, layered over the frame.
  - **Antimeridian consistency:** the endpoint applies `ST_ShiftLongitude` per-geometry to crossers (US, Alaska), so a shifted frame (longitudes in ~0–360) and an unshifted child (−180–180) won't align. When the frame's bbox is in the shifted space (`bbox.maxX > 180`), normalize the child's longitudes the same way before projecting (`lon < 0 → lon + 360`). This only affects US-framed (federal) races and Alaska-framed local races.
- **Degradation:**
  - `frameRef` null (statewide state, or unresolved parent) → render the child alone (current behavior).
  - child geometry missing/error → existing dot-field fallback.
  - frame geometry missing but child present → render child alone.

---

## 4. Visual spec

- **Frame:** `stroke` in the accent token at low opacity (~0.3), no fill, thin (~1px at the 64px render).
- **Child:** translucent accent fill (slightly stronger than today's 0.14 so it reads against the frame, ~0.3–0.4) + a crisper accent stroke. Single accent (`--text-link`); monochrome; no tier colors (unchanged from the shipped system).
- Motif stays `aria-hidden`; all meaning (office, scope, place) remains in the card's text. The nesting adds no new text and no new color — it is geometry only.

---

## 5. Out of scope / future
- The U.S. House treatment (model B, US + whole-state) is intentionally provisional. Switching to model C (state + district) later is a backend `frameRef`/child change only; the frontend renderer already handles state-framed districts.
- President / true national races (whole US lit, no child) are not in the current race set; if added, child = US, frame = none.
- No road/street underlays, no locator insets, no parent-name labels in the motif (all considered and declined for clutter/scope).

---

## 6. Files expected to change
- **Backend (`ev-accounts`):** `backend/src/lib/readrankService.ts` (`frameRef` resolution + federal child override + spatial-containment LATERAL); its test. `informBoundaryService.ts` unchanged.
- **Frontend (`read-rank`):** `src/data/api.ts` (`frameRef` on `RaceSummary`), `src/components/motif/projectGeoJson.ts` (explicit-bbox refactor + longitude normalization), `src/components/motif/Motif.tsx` (frame+child fetch & render), `src/components/RaceCard.tsx` (pass `frameRef`); their tests.

---

## 7. Open questions to resolve in planning
1. Confirm congressional/state-leg `geo_id`s reliably carry the state so `FIPS(state)` from the race's `state` field is always correct (it should be, since `elections.state` is set).
2. Confirm `ST_PointOnSurface` containment picks the intended county for cities that straddle county lines (smallest-area tiebreak is specified; verify on a real multi-county city if one is in the data).
3. Tune the child fill/stroke opacities against the real rendered cards (values above are a starting point).
