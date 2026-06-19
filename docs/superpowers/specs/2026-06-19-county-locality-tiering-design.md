# County-level locality tiering for the race hub

**Date:** 2026-06-19
**Status:** Approved, ready for implementation plan
**Repos:** ev-accounts (backend) + read-rank (frontend) — cross-repo

## Problem

The landing-page race hub ([`RaceHub.tsx`](../../../src/components/RaceHub.tsx)) tiers races by
relevance via the pure helper [`raceGrouping.ts`](../../../src/utils/raceGrouping.ts). When a voter
is located, races are tiered: **Your races** (exact-district `isLocal` match) → **More in {STATE}**
(same state) → **Other states**.

The middle gap is large: a voter in Orem, Utah sees their exact-district races, then jumps straight
to *all* of Utah. There is no "races in *my county*" tier. County tiering was deferred in the prior
change ([`2026-06-19-landing-race-organization-design.md`](2026-06-19-landing-race-organization-design.md))
because no county identifier was available client-side.

Investigation (2026-06-19) found county data is **not exposed on either side today, but both sides
already resolve it internally** — so surfacing it is a set of small, additive changes rather than new
infrastructure.

## Decisions (from brainstorming)

- **Identifier = county GEOID (5-digit county FIPS)**, taken from the backend geocode on both sides.
  Rejected: reading Google Places `administrative_area_level_2` (a county *name*) on the frontend —
  it needs name normalization and a static FIPS table, and risks ambiguity. The backend already
  resolves the user's county via the same authoritative geocode that powers district matching, so the
  GEOID is free and guaranteed consistent with the per-race GEOID.
- **A race belongs to a *set* of counties** (`countyGeoIds: string[]`), not one. State legislative
  districts routinely cross county lines; a voter in *any* overlapping county should see them in the
  county tier.
- **User's own county is a single GEOID** (where they live). Match = the user's county is a member of
  the race's county set.
- **Scope:** this spec covers and implements all three changes — two in ev-accounts (per-race county
  set; user county in the address-search response) and the read-rank frontend (capture + county tier).
- **`LocationFilter` stores county as flat fields** (`county`, `countyName`), matching the existing
  flat `state: string` style.
- **No-exact-match note** becomes county-aware (points at the county when a county band exists).

## Design

### A. Backend — ev-accounts

#### A1. Per-race `countyGeoIds: string[]` ([`readrankService.ts`](../../../../ev-accounts/backend/src/lib/readrankService.ts))

Add `countyGeoIds: string[]` to the `RaceSummary` interface and the object returned by
`getPlayableRaces`. Derive it inside the existing `rows.map()`, reusing values the query already
computes wherever possible:

| Race shape | Child layer | County set |
| --- | --- | --- |
| County race | `boundaryRef.layer === 'G4020'` | `[boundaryRef.geoid]` |
| City / ward / council framed to county | `G4110`, `X*` with `frame_layer === 'G4020'` | `[frame_geoid]` |
| State legislative district | `G5210` / `G5220` | **all overlapping counties** (see A2) |
| Statewide / federal | — | `[]` |
| School district / township | `G54xx` / `G4040` | `[]` (v1 scope boundary; see below) |

For state-leg districts the member counties come from `getCountyUnionFrames`, which already computes
the overlapping-county set; A2 exposes those GEOIDs.

#### A2. Expose union member counties ([`informBoundaryService.ts`](../../../../ev-accounts/backend/src/lib/informBoundaryService.ts))

`getCountyUnionFrames` already joins each district to the counties it genuinely overlaps
(`c.mtfcc = 'G4020'` via `ST_Intersects` + positive `ST_Area(ST_Intersection) > 1e-9`) and unions
their geometry. The member GEOIDs (`c.geo_id`) are present but discarded.

- Add `array_agg(c.geo_id)` (aliased e.g. `county_geoids`) to the `u` CTE and propagate through `s`
  and the final `SELECT`.
- Add `countyGeoIds: string[]` to the exported `UnionFrame` interface and populate it in the result
  map. Existing `bbox`/`geojson` consumers are unaffected.

`readrankService` then reads `unionFrameMap.get(...)?.countyGeoIds ?? []` for `G5210`/`G5220` races.
The visual union outline (`G4020U` frame) is unchanged — this only surfaces the member list for
tiering.

#### A3. User county in the address-search response

`/essentials/candidates/search` ([`essentialsCandidates.ts`](../../../../ev-accounts/backend/src/routes/essentialsCandidates.ts))
calls `getRepresentativesByAddress` ([`essentialsService.ts`](../../../../ev-accounts/backend/src/lib/essentialsService.ts)),
whose geocode→`ST_Covers` district query already matches the user's `G4020` county district. The
county GEOID is resolved but dropped — the route returns only `{ politicians, tribal_land }` and the
`jurisdiction` object (built from `rows[0]`, which is *not* reliably the county) is not even
forwarded.

- In `getRepresentativesByAddress`, after the district query, scan `districtResult.rows` for the row
  where `mtfcc === 'G4020'` (or `district_type === 'COUNTY'`) and build
  `county: { geoid: string; name: string } | null` from its `geo_id` and `district_label`. Return
  `null` when no county row matched (rural / geocode miss / county not in data).
- Add `county` to `AddressSearchResult`.
- In the `/search` route, include it in the JSON: `{ politicians, tribal_land, county }`. Additive and
  backward-compatible — existing clients reading `politicians`/`tribal_land` are unaffected.

### B. Frontend — read-rank

Mirrors the existing `state` derivation exactly.

- **`searchPoliticians` ([`api.ts`](../../../src/data/api.ts))** — add
  `county: { geoid: string; name: string } | null` to `SearchPoliticiansResult` and read it from
  `raw.county` (default `null`).
- **`LocationFilter` ([`useReadRankStore.ts`](../../../src/store/useReadRankStore.ts))** — add two flat
  fields: `county: string | null` (the GEOID — the match key) and `countyName: string | null` (for the
  band label; there is no client-side GEOID→name table, so the name rides along from the search).
- **Persist `migrate`** — extend the existing `locationFilter` spread to coerce
  `county: prev.locationFilter.county ?? null` and `countyName: prev.locationFilter.countyName ?? null`.
  **No version bump** — a bump runs the reset branch that wipes `raceProgress`; runtime reads coerce
  with `?? null` regardless, so an un-migrated persisted filter is safe.
- **Both construction sites** — [`AddressFilterInput.tsx`](../../../src/components/AddressFilterInput.tsx)
  (`handlePlaceSelected`) and [`App.tsx`](../../../src/App.tsx) (the `?address=` URL-param path) set
  `county: result.county?.geoid ?? null` and `countyName: result.county?.name ?? null` from the
  search result they already await. The ev-context hydration / promotion paths route through
  `handlePlaceSelected`, so they pick county up for free.

### C. Grouping logic — [`raceGrouping.ts`](../../../src/utils/raceGrouping.ts)

- Add `'county'` to `SectionKind`.
- Add args `userCounty: string | null` (GEOID) and `userCountyName: string | null` to `GroupRacesArgs`.
- Read `race.countyGeoIds` (the new `RaceSummary` field; treat missing as `[]`).
- **Located tier order:**
  1. `your` — `race.isLocal`
  2. **`county`** — `!isLocal && userCounty != null && race.countyGeoIds.includes(userCounty)`
  3. `state` — `!isLocal`, not already county, and `race.state === userState`
  4. `other` — everything else
- County section: `label: \`In ${userCountyName ?? 'your county'}\``, `collapsible: false` (like `state`).
- A race in the user's county but a *different* state is impossible by construction; matching is purely
  on GEOID membership and does not depend on `userState`.
- `RaceHub` passes `userCounty` / `userCountyName` from `locationFilter`. The generic section renderer
  needs no structural change — a `'county'` section renders like any other non-collapsible band.

### D. No-exact-match note ([`RaceHub.tsx`](../../../src/components/RaceHub.tsx))

Today the note renders when `noExactMatch && sections.some(s => s.kind === 'state')`:
*"We couldn't pinpoint your exact districts — here are races in {STATE}."*

Make it county-aware: when a `county` band exists, point at the county
(*"…here are races in {County}."*), otherwise fall back to the state wording. Show it when either a
county or state band exists.

### E. Edge cases

- **No resolvable user county** → `locationFilter.county = null` → no county band; races fall to
  state/other exactly as today.
- **Race with `countyGeoIds === []`** (statewide, federal, state-leg with empty union, school,
  township) → never matches the county tier → falls to state (same state) or other.
- **Independent cities / county-equivalents** (DC `11001`, Virginia independent cities, Baltimore city)
  → match naturally; both sides use the same 5-digit FIPS.
- **Multi-county state-leg district** → appears in the county tier for a voter in *any* of its member
  counties.

## Architecture

- Backend: derivation stays inside `getPlayableRaces`'s existing map and `getCountyUnionFrames`'s
  existing query — no new tables, no new round-trips. County resolution for the user reuses the
  geocode already performed for district matching.
- Frontend: bucketing + tiering + grouping + sorting remains the single pure, deterministic
  `groupRaces` function (today's date injected). `RaceHub` stays thin.

## Testing

- **ev-accounts** (`readrankService.test.ts`): `countyGeoIds` derivation per scope — county race
  (`[geoid]`), city/ward framed to county (`[frame_geoid]`), state-leg multi-county (union members),
  statewide/federal (`[]`). A test for the county-extraction branch in the address-search result
  (county row present → `{ geoid, name }`; absent → `null`).
- **read-rank** (`raceGrouping.test.ts`), mirroring existing fixtures:
  - located with county matches → order `your, county, state, other`
  - county band label `In {County}`
  - same-county-not-local race routed to the county tier, not state
  - **multi-county**: a race with `countyGeoIds: ['A','B']` appears in the county tier for a user in
    `A` and for a user in `B`
  - `userCounty = null` → no county band
  - race `countyGeoIds = []` → never in county band
  - county tier honored under the `Past` filter
  - not-located grouping ignores county entirely
- **Gate:** read-rank `npx tsc -b --noEmit && npx vitest run && npm run lint`; ev-accounts test suite.

## Out of scope (v1 boundaries)

- **School districts and townships** that cross county lines get `countyGeoIds = []` and remain in the
  state tier. Extending them later uses the identical `ST_Intersects`-against-`G4020` mechanism.
- No change to how `isLocal` (exact-district match) is computed.
- No new map/outline work — the multi-county visual outline already exists as the `G4020U` union
  frame.
