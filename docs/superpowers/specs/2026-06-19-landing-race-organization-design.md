# Landing page — race organization & local detection

**Date:** 2026-06-19
**Status:** Approved, ready for implementation plan

## Problem

The landing-page race picker ([`Landing.tsx`](../../../src/components/Landing.tsx) →
[`RaceHub.tsx`](../../../src/components/RaceHub.tsx)) renders every playable race as a flat
grid sorted by `(isLocal, electionDate)`. Four issues:

1. The "Each one is a preview of the full Read & Rank experience." subline under
   "Choose an election" is no longer wanted.
2. As race count grows the flat grid gets unmanageable — no grouping.
3. A located voter (e.g. Orem, UT — Utah County) sees **"No local races with data yet —
   showing all,"** even though Utah County races are clearly listed. The message keys off
   the backend `isLocal` flag, which is an exact-district politician match; when that match
   returns nothing, the frontend has no softer notion of "near me."
4. Races whose election date has passed sit front-and-center, cluttering live races.

## Decisions (from brainstorming)

- **Picker purpose:** serve a located voter *and* support open browsing equally.
- **What counts as "local":** tiered by area, most-specific first — but realistically
  **exact-district → same-state** on the frontend now; **county tier is deferred** because
  no county data is available client-side yet.
- **Time filter:** two chips, `Upcoming` (default) and `Past`, exactly one active, filtering
  the whole page.
- **In-progress past races:** no special-casing — they stay under `Past`.
- **"Other states" band:** collapsible, collapsed by default.

## Design

### 1. Copy (#1)

Remove the subline at [`Landing.tsx:84-89`](../../../src/components/Landing.tsx). Keep the
`Choose an election` heading. No other hero/landing copy changes.

### 2. Locality tiering & the #3 fix

`isLocal` remains a backend-computed exact-district match. The frontend gains a softer,
derived signal so locality survives an exact-match miss.

- **State derivation:** the `parseStateFromAddress` helper currently lives privately inside
  [`AddressFilterInput.tsx`](../../../src/components/AddressFilterInput.tsx). Lift it into a
  shared util (e.g. `src/utils/parseStateFromAddress.ts`) and have `AddressFilterInput` store
  the parsed two-letter state on `locationFilter` when it sets the filter. `RaceHub` reads
  `locationFilter.state` rather than re-parsing.
- **`LocationFilter` type** (`src/store/useReadRankStore.ts`) gains `state: string | null`.
  Existing persisted filters without `state` are tolerated (treated as `null` → no same-state
  tier, only exact + other).
- **Tiers when located:**
  - `your` — `race.isLocal === true`
  - `state` — not `isLocal`, and `race.state === locationFilter.state`
  - `other` — everything else
- **No-exact-match behavior (the Orem bug):** when located and **zero** races are `isLocal`,
  the "Your races" band is omitted and an inline note is shown above the state band:
  *"We couldn't pinpoint your exact districts — here are races in {STATE}."* The
  "No local races with data yet — showing all" string is removed entirely.
- **County tier:** explicitly out of scope here. Follow-up requires a `county` field on
  `RaceSummary` (backend) and capturing `administrative_area_level_2` from the Google place
  result. Noted, not built.

### 3. Time filter + bands (#2, #4)

- **Time bucket** per race: compare `race.electionDate` to today. `null`/missing date →
  treated as `Upcoming` (don't hide undated races). Boundary: a race whose date is *today* is
  Upcoming.
- **Filter UI:** two chips, `Upcoming` selected on load. State is local to `RaceHub`
  (no store persistence needed). Switching re-filters all bands.
- **Bands (in order), located:** `Your races` → `More in {STATE}` → `Other states`
  (collapsible, default collapsed). Each band shows only races in the active time bucket; a
  band with zero races in that bucket is not rendered. Consequence: an all-past state (e.g.
  Indiana) shows nothing under `Upcoming` and reappears under `Past`.
- **Bands, not located:** no `Your races` / `More in {STATE}`. All races for the active
  bucket are grouped by state under per-state headers. (Reuse the same section renderer with
  state-named sections.)
- **Empty overall state:** if the active bucket has no races at all, show a short message
  (e.g. "No upcoming races yet — check Past.") rather than a blank page. The existing
  "No races available yet" empty state still applies when the whole race list is empty.
- **Sorting within a band:** by `electionDate` ascending for Upcoming, descending for Past
  (most recent first), matching today's date sort intent.

### 4. Architecture

Bucketing + tiering + grouping + sorting is pure logic and gets its own testable module:

- **`src/utils/raceGrouping.ts`** — pure function, roughly:
  `groupRaces({ races, userState, timeFilter, raceProgress }) → RaceSection[]`
  where a `RaceSection` is `{ kind: 'your' | 'state' | 'other' | 'state-named';
  label: string; collapsible: boolean; races: RaceSummary[] }`. Also returns/derives the
  "no exact match" flag so `RaceHub` can render the inline note. Pure, deterministic
  (today's date passed in as an argument so tests are stable).
- **`RaceHub.tsx`** stays thin: owns the `timeFilter` chip state and the "Other states"
  collapsed state, calls `groupRaces`, and maps sections to the existing `RaceCard` grid.
  The current `useEffect`/sort that floats locals to the top is replaced by `groupRaces`.
- Chips and the collapsible header can be inline in `RaceHub` for now; extract to small
  components only if `RaceHub` grows unwieldy.

### Testing

- Unit-test `groupRaces` against fixtures covering: located w/ exact matches; located w/ no
  exact match but same-state races (Orem case); not-located grouping by state; Upcoming vs
  Past bucketing incl. undated and same-day-as-today; an all-past state vanishing from
  Upcoming; empty bucket. Date is injected, not read from the clock.

## Out of scope

- County-level tiering and the backend `county` field.
- Any change to how the backend computes `isLocal`.
- Hero copy beyond removing the one subline.
