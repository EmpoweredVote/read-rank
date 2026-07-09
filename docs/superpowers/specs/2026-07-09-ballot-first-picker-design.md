# Ballot-first election picker

**Date:** 2026-07-09
**Status:** Approved design, ready for implementation plan
**Repos:** read-rank (frontend, driving) + ev-accounts (backend) — cross-repo, one workstream

## Problem

The election picker ([`RaceHub.tsx`](../../../src/components/RaceHub.tsx)) renders **every**
playable race on load. Measured against the live API (`api.empowered.vote/api/readrank/races`,
2026-07-09):

- **182 races across 41 states** — an ~11,800px wall of near-identical cards.
- **170 are U.S. House races** whose card title is the same three words ("US Representative");
  the differentiator (state + district) is the *small* text.
- **~28% carry no rankable topics** (`rankableTopicCount === 0`) yet render with equal weight to
  a race with 19, burying the substantive ones.
- The located experience ends in one collapsible **"Other states"** band that dumps ~150 cards
  when opened.
- The address box is the only entry point and only accepts a street address; a state/city name
  errors instead of routing anywhere useful.

The picker is organized as "here is the country." Its real job is **"here is your ballot,"** with
browsing as a deliberate, narrowed fallback. Most users want their own races; very few want races
elsewhere, and loading all of them up front is both unparseable and slow.

This spec continues the locality-tiering line of work
([`2026-06-19-landing-race-organization-design.md`](2026-06-19-landing-race-organization-design.md),
[`2026-06-19-county-locality-tiering-design.md`](2026-06-19-county-locality-tiering-design.md)) and
reuses their `countyGeoIds` / `locationFilter.county` model.

## Decisions (from brainstorming)

- **Ballot-first, browse-as-fallback.** The default page is a ballot, never the full list.
- **Default place = Los Angeles** when no location is known. Seed the county view with the
  **Los Angeles County GEOID `06037`**, labelled as an example, with a prominent address prompt.
  If a shared address is already in ev-context, the real ballot supersedes the example.
- **Render-on-demand ("lazy load").** The full list is fetched once (cheap JSON); only the active
  slice (the ballot, or the county being browsed) is *mounted*. The other ~180 cards are never
  rendered until requested. This is frontend-only — the API returns everything in one call and no
  backend paging is added.
- **Browse = geographic drill-down, State → County → races**, mirroring the essentials mental
  model. Clicking a county shows **every race touching that county**, ordered **local → state →
  federal** (the essentials order). The map motif conveys scope (state outline = statewide,
  district shape = district); there is **no separate "state" section**.
- **Statewide and federal-statewide races belong to every county in their state** (they touch all
  of it), so they appear in every county view. Congressional districts belong to the counties they
  **genuinely overlap** — a shared/abutting boundary line does not count; there must be real area
  intersection.
- **Empty races (`rankableTopicCount === 0`) are hidden everywhere, always.** No exceptions,
  including a located voter's own district.
- **Unified smart search.** One input: a street address builds the ballot (existing flow); a
  city / county / state name routes into Browse at that level.
- **No readiness chips.** The "Ready to rank / A few quotes" filter idea is dropped.
- **The backend change must not affect essentials.** Verified: `readrankService` is imported only
  by `routes/readrank.ts`; `essentialsBrowse.ts` imports neither `readrankService` nor
  `informBoundaryService`; `getCountyUnionFrames` is layer-agnostic and is used as-is; there is no
  schema migration (`countyGeoIds` is computed per request).

## Design

### A. Backend — ev-accounts

All changes are confined to
[`readrankService.ts`](../../../../ev-accounts/backend/src/lib/readrankService.ts) plus its test.
`getCountyUnionFrames` in
[`informBoundaryService.ts`](../../../../ev-accounts/backend/src/lib/informBoundaryService.ts) is
**not modified** — it already joins any `{layer, geoid}` to `geofence_boundaries` and unions
intersecting `G4020` counties with no per-layer logic.

**A0. Pre-flight verification (do this first — it gates A1).**
Confirm congressional-district geometry exists:
`SELECT count(*) FROM essentials.geofence_boundaries WHERE mtfcc = 'G5200';`
Federal motifs render the *state* outline (model B), so district geometry may never have been
loaded. If the count is 0 (or missing the states we serve), load TIGER congressional-district
shapefiles into `geofence_boundaries` as a prerequisite step; without geometry the `ST_Intersects`
union silently yields an empty county set.

**A1. Congressional districts → overlapping counties.**
Add `'G5200'` to `COUNTY_OVERLAP_LAYERS`. The existing `overlapRefs` collection and the
`countyGeoIds = uf?.countyGeoIds ?? []` branch then populate county sets for U.S. House races.
The union query already enforces **genuine area overlap, not abutment** — its
`AND ST_Area(ST_Intersection(c.geometry, d.geometry)) > 1e-9` guard drops counties that only share
a boundary line with the district — so this requirement needs no additional change.
Confirm the *frame/motif* path is unchanged: federal races are caught by the `if (tier ===
'federal')` branch **before** the `COUNTY_OVERLAP_LAYERS` frame branch, so motifs stay
state-in-US. A regression assertion locks this.

**A2. Statewide races → all counties in their state.**
For `scope === 'statewide'` races (state Governor/exec and federal U.S. Senate/President), set
`countyGeoIds` to the full list of `G4020` GEOIDs in that state. Add an isolated read-only helper
in `readrankService.ts` that batch-resolves counties by state FIPS — `SELECT geo_id FROM
essentials.geofence_boundaries WHERE mtfcc = 'G4020' AND geo_id LIKE $1` with the bind value
`<fips>%` (e.g. `06%` for California) — run once per distinct state in the result set and memoized
within the request.

**A3. County names for labelling.**
The `/readrank/races` response gains a top-level `counties: Record<geoid, name>` map covering every
GEOID referenced by any race's `countyGeoIds`. Built by an isolated read-only query in
`readrankService.ts` (`SELECT geo_id, name FROM essentials.geofence_boundaries WHERE mtfcc =
'G4020' AND geo_id = ANY($1)`). This keeps county-name resolution out of the shared
`getCountyUnionFrames` and out of essentials' path.

**A4. Tests** ([`readrankService.test.ts`](../../../../ev-accounts/backend/src/lib/readrankService.test.ts)):
a congressional race now carries a non-empty `countyGeoIds`; a statewide race carries all its
state's counties; the `counties` name map covers all referenced GEOIDs; federal `boundaryRef` /
`frameRef` are unchanged (motif regression).

### B. Frontend — read-rank

#### B1. `fetchRaces` + types ([`api.ts`](../../../src/data/api.ts))
`fetchRaces` returns `{ races, counties }` (or a thin wrapper); `RaceSummary` is unchanged;
a `CountyIndex = Record<string, string>` (geoid → name) is added and threaded to the browse UI.
Tolerate an absent `counties` map (older backend) by falling back to raw GEOIDs as labels.

#### B2. View model — three states, one orchestrator (`RaceHub.tsx`)
RaceHub selects exactly one of:
- **`ballot-example`** — no `locationFilter`. Render the **county view for `06037` (Los Angeles)**,
  headed *"New here? Here's a Los Angeles ballot"* with the address prompt prominent. Only this
  slice mounts.
- **`ballot-located`** — `locationFilter` set (address search or ev-context hydrate). Render the
  located tiers from [`raceGrouping.ts`](../../../src/utils/raceGrouping.ts) (`Your races` → `In
  {County}` → `More in {State}`), **empties removed**, and **no "Other states" wall** — browsing
  other areas is now an explicit action, not an inline band.
- **`browse`** — entered via the "Browse other races" control or a place-name search. A
  breadcrumbed drill-down (below). Only the active level mounts.

The example and located ballots reuse the **county-view renderer** (B3): the example is simply that
renderer seeded to `06037`.

#### B3. Browse drill-down (new `RaceBrowse` component + pure helpers in `raceGrouping.ts`)
- **State list** — states present in the data with race counts; pick one.
- **County list** — counties in that state that have ≥1 non-empty race (derived from the union of
  `countyGeoIds` across that state's races, labelled via the `counties` map); pick one.
- **County view** — every race whose `countyGeoIds` includes the selected GEOID, `rankableTopicCount
  > 0`, ordered **local → state → federal** by `tier`, then by seat/office within a tier. Reused by
  both ballot states.
- Breadcrumbs climb back up (State ‹ County). Only the current level renders.

New pure functions in `raceGrouping.ts` (unit-testable, no React): `statesWithCounts(races)`,
`countiesForState(races, counties, stateCode)`, `racesInCounty(races, geoid)` (filters empties +
orders local→state→federal). Existing located-tier logic is retained but the "other" band is
removed from the located path.

#### B4. Smart search (`AddressFilterInput.tsx` → generalized, + new `localitySearch.ts`)
Keep Google Places autocomplete for addresses (existing `useGooglePlacesAutocomplete`). Port
essentials' [`classifyQuery`](../../../../essentials/src/lib/localitySearch.js) into a read-rank
`src/lib/localitySearch.ts` using read-rank's existing Google loader. On free-text submit:
- classified `address`/ZIP → existing address flow → **located ballot**;
- classified `state` → Browse at that state's county list;
- classified `city`/`county` → Browse county view for the matched county GEOID (resolve name →
  GEOID against the `counties` map for that state);
- unknown / geocoder unavailable → fall back to the address flow (never throw), matching essentials.

Purely client-side routing — no backend browse endpoint (read-rank browse operates over the
already-fetched list).

#### B5. Cards / rows
Reuse the existing [`RaceCard`](../../../src/components/RaceCard.tsx) for the ballot and county
views (few cards mount at a time now, so density is no longer the pressure it was). The compact-row
treatment explored in the mockup is **out of scope** for this change; revisit only if a single
county view proves too dense in practice.

### Data flow

```
fetchRaces() ── once ──▶ { races[], counties{} }  (held in RaceHub state, unfiltered)
      │
      ├─ no locationFilter ─▶ racesInCounty(races, '06037')      → Example ballot (LA)
      ├─ locationFilter set ─▶ groupRaces(...) minus empties/other → Your ballot
      └─ browse ─▶ statesWithCounts → countiesForState → racesInCounty(geoid)
smart search: address→locationFilter ; place name→browse(geoid|state)
```

## Testing

- **Backend:** `readrankService.test.ts` per A4.
- **Frontend units (`raceGrouping.test.ts`):** `racesInCounty` hides empties and orders
  local→state→federal; statewide race appears in every county of its state; congressional race
  appears only in its overlapping counties; `statesWithCounts` / `countiesForState` counts;
  located path no longer emits an "other" band.
- **Frontend components:** `RaceBrowse` breadcrumb navigation and render-on-demand (only active
  level mounted); `RaceHub` picks the right view state; smart-search routing (address vs
  state/county/city vs unknown-fallback).
- **Live integration:** build read-rank against the real API after A1–A3 land; verify LA example
  ballot, an address ballot, and a browse drill-down render real races.

## Risks & must-verify

1. **`G5200` geometry presence** (A0) — the single hard dependency. Verify before A1; load CD
   shapefiles if absent.
2. **County-view density** — a populous county (many overlapping CDs + statewide) could still be a
   long list; acceptable at current scale, flagged for the compact-row follow-up.
3. **County GEOID label gaps** — tolerate missing names by showing the GEOID; the `counties` map
   should be complete once A3 lands.

## Out of scope

- Backend paging / per-state fetching (render-on-demand covers the speed goal at current scale).
- The compact-row card redesign.
- A stored/materialized county↔district crosswalk (computed live via `getCountyUnionFrames`).
- Any change to essentials or to `/inform/boundary`.

## Cross-repo note

This spec is authoritative for both repos. A pointer should be added from ev-accounts (e.g. in its
coordination notes) referencing this file for the `readrankService` changes (A0–A4).
