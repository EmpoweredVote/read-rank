# Read & Rank — Landing + Race Card Redesign

**Date:** 2026-06-11
**Status:** Design approved, pending spec review
**Scope:** The arrival/landing screen (`Landing.tsx`, `RaceHub.tsx`) and a new reusable `RaceCard` component with a geographic motif system. Plus one new backend boundary endpoint.

---

## 1. Aesthetic direction — "Locator, not landing page"

The landing stops behaving like a marketing hero stacked on top of a picker.  It becomes a single calm surface where the premise is stated briefly and the real work, choosing a race, is immediately present.  The signature element is the race card, whose motif is a **locator map of the office's constituency** rendered as data, not decoration.  The geography answers one honest question, "who does this person represent," and the typography, not the map, is what separates one race from another.  Reference points: the immediacy of Empowered Essentials, the deep calm surface of Empowered Compass, the cartographic restraint of NYT election coverage.  No government aesthetics, no party color, no flags or seals.

---

## 2. Decisions locked

| # | Decision | Choice |
|---|---|---|
| 1 | Landing structure | **Structure A** — compact hero + race grid directly below on one continuous surface.  No full-viewport hero.  Consistent with sibling EV pages. |
| 2 | Surface / theme | Theme-aware.  Dark mode is the Compass-deep surface (already `--surface-page: #0f1419`); light mode is the warm-cream surface.  Manrope only. |
| 3 | Steps | All three equal weight (an explainer, not a progress tracker).  One positive "Start here" tag on step 1 replaces fading steps 2 and 3. |
| 4 | Race card | Vertical, **typography-led**.  New reusable `RaceCard` component. |
| 5 | Tier cue | **The map shape carries the tier.**  US map = federal, state map = state, county/city map = local.  No tier colors, no glyphs, no frames.  The scope label is the text backup. |
| 6 | Motif accent | Monochrome, single accent from a theme token (`--text-link`).  Coral and yellow stay reserved for their existing jobs (in-progress, Inform whisper). |
| 7 | Motif fallback | Dot-field (dots = constituents) when a real boundary is unavailable.  Dots clip to the real boundary when present.  Same component either way. |
| 8 | Map coverage v1 | Render the real boundary the database has for the race; degrade gracefully otherwise.  **v1 also ingests ~50 state outlines + one US (nation) outline** so statewide and federal-statewide tiers show real geography.  Only city/place outlines remain deferred. |
| 10 | Backend repo | `/Users/chrisandrews/Documents/GitHub/ev-accounts` (branch `master`).  Hosts the boundary endpoint, the races-API field additions, and the state/US outline ingest. |
| 9 | Metadata footer | **Candidates · Topics · Time.**  Status removed.  Election date moves to the geography line. |

---

## 3. Landing structure (`Landing.tsx`)

One continuous section on `--surface-page`.  Replaces the current two-section split (`min-h-[calc(100vh-73px)]` hero + separate picker section).

- **Compact hero band**
  - Left: kicker ("Read & Rank"), headline (Manrope 800), two short premise lines, and the pizza warm-up as a quiet text link (unchanged behavior, calls `startPractice`).
  - Right: three step cards, **equal contrast**.  Step 1 carries a small "Start here" tag (accent background, accessible text); steps 2 and 3 are NOT dimmed.  On the landing these describe the flow; they are not a live progress indicator.
  - Vertical rhythm is tight enough that "Choose an election" and the first row of cards are visible without a full scroll on a typical laptop.
- **"Choose an election"** heading + one-line subhead, then `RaceHub` rendering the new `RaceCard` grid.
- `RaceHub` keeps its existing responsibilities (fetch, sort local-first, address filter, loading/empty states, progress, RCV marker) but renders `RaceCard` instead of the inline button markup.  Grid: 1 col mobile, 2 col tablet, 3 col desktop.

Copy rules apply to all visible strings: no em dashes, two spaces after periods, invitational verbs.

---

## 4. `RaceCard` component

A presentational, reusable component.  Vertical layout: motif zone, then body (scope label, office title, geography line, metadata footer, arrow chip).

### Props

```ts
type Tier = 'federal' | 'state' | 'local';
type Scope = 'statewide' | 'district' | 'county' | 'citywide';

interface RaceCardProps {
  office: string;            // "Governor", "U.S. House", "Mayor" — the typographic hero
  tier: Tier;
  scope: Scope;
  geography: {               // for the geography line + motif resolution
    state: string | null;    // "Alabama"
    place?: string | null;   // "Birmingham", "Jefferson County"
    districtLabel?: string | null; // "AL-07", "District 54"
    electionDate?: string | null;  // ISO; rendered "Nov 2026"
  };
  boundaryRef?: BoundaryRef | null; // how the motif finds its polygon (see §5)
  candidateCount: number;
  topicCount: number;        // rankable topics (enough quotes to rank)
  estMinutes: number;        // derived; see §8
  usesRcv?: boolean;
  progress?: 'none' | 'in-progress' | 'completed';
  onSelect: () => void;
  disabled?: boolean;
}
```

### Layout and states
- **Title** is Manrope ~800, the primary differentiator (every Alabama statewide race shares one map; the title separates Governor from Attorney General).
- **Scope label** above the title: small uppercase, e.g. "Federal · District", "State · Statewide", "Local · County".  This is the grayscale-safe tier carrier.
- **Geography line**: `place or state · Mon YYYY` (RCV marker as a chip when `usesRcv`).
- **Local pill / progress chip**: reuse existing `RaceHub` semantics (Local pill in coral, in-progress/completed states) so the new card does not regress current behavior.
- **Hover**: `translateY(-2px)`, border to `--text-link`, arrow chip nudges NE.  Honors `prefers-reduced-motion` (no transform; border/color only).
- **Interaction**: whole card is a button (`role="button"`, `tabIndex=0`, Enter/Space activate), 44px+ targets, visible focus ring.

---

## 5. Motif system

### Contract

```ts
// Pure resolver: decides WHAT to render, never fetches.
function resolveMotif(input: {
  tier: Tier; scope: Scope; boundaryRef?: BoundaryRef | null;
}): MotifPlan;

type BoundaryRef = { layer: string; geoid: string }; // e.g. { layer:'county', geoid:'01073' }

type MotifPlan =
  | { kind: 'boundary'; ref: BoundaryRef }   // fetch + clip dots to real polygon
  | { kind: 'dotfield'; arrangement: 'full' | 'cluster' | 'point' }; // fallback
```

- `Motif` component renders a **dot-field** always.  When the plan is `boundary`, it requests simplified GeoJSON for the ref, projects it to the motif viewBox, strokes the outline, and **clips the dot-field to the polygon**.  When the plan is `dotfield`, it renders the abstract arrangement keyed to scope (full field = statewide, cluster = district/county, tight point = city).
- Scope → fallback arrangement mapping is fixed; tier never changes the dots' color.

### Data source (grounded in the live database)

Geometry lives in the **prod project `E.V Backend` (`kxsdzaojfaibhuzmclfq`)**, PostGIS, SRID 4326.  There are three geometry tables; **`essentials.geofence_boundaries` is the comprehensive, primary source**:

- **`essentials.geofence_boundaries(geo_id, ocd_id, name, state, mtfcc, geometry, quality_flag)`** — TIGER + custom-district geometry keyed by **MTFCC** + `geo_id`.  Confirmed coverage for served areas includes: `G4020` county, `G4040` county subdivision / township, `G4110` **incorporated place / city** (e.g. Bloomington, `geo_id 1805860`), `G5200` congressional (nationwide), `G5210` state senate, `G5220` state house / assembly / ward, `G54xx` school districts, and **custom layers** `X0001` / `X-MCC-DIST` etc. for **city-council, county-council, and supervisorial districts** (e.g. Bloomington City Common Council Districts 1-6, LA City Council, Monroe County Council).  This means city and within-city / within-county district races **do** get real maps where the office's area is served.
- `inform.district_boundaries(district_type, geoid, name, geom)` and `essentials.geo_districts(layer, geoid, district_num, name, geom)` — narrower, overlapping sets (e.g. `congressional`, `state_house`, `county`).  **Planning picks the authoritative table per layer; default to `geofence_boundaries` and use the others only to fill gaps.**
- `essentials.districts` metadata carries `tiger_geoid`, `geo_id`, `district_type`, `state`, `city`, `government_id`, and a `has_unknown_boundaries` flag (a fallback trigger).

**The only real gap is the easy end:** `G4000` (whole-state outline) exists for **California only**, and there is **no US/nation outline**.  So **v1 ingests the ~49 missing state outlines + 1 US/nation outline** into `geofence_boundaries` (`mtfcc G4000` keyed by state FIPS, plus a nation row), sourced from Census TIGER `cb_*_us_state` + a national outline.  Everything else (county, city, township, congressional, state-leg, council/supervisorial) already has real geometry for served areas; only genuinely-missing boundaries fall back to the dot-field.

The frontend cannot reach prod PostGIS directly, so geometry is served through the existing API layer, resolved by `(mtfcc/layer, geo_id)`.

### New backend endpoint (dependency)

`GET /api/inform/boundary?layer={layer}&geoid={geoid}` → 

```json
{ "geoid": "...", "layer": "county", "name": "Jefferson", "bbox": [minLng,minLat,maxLng,maxLat], "geojson": { "type":"MultiPolygon", "coordinates": [...] }, "hasBoundary": true }
```

- Server simplifies for display: `ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, tol))` with a tolerance tuned to a ~64px render.  Cacheable and immutable per `(layer, geoid)`; long `Cache-Control`.
- `hasBoundary: false` (or 404) is a normal response, not an error: the card shows the dot-field.
- Frontend projects GeoJSON → normalized SVG path with a simple equal-area-ish projection scaled to the bbox (no map library; a few lines of math).  Result is cached client-side by `(layer, geoid)`.

### Race → boundary resolution
`races.position_name` → `position_descriptions.district_type` yields the *kind*; the specific `geoid` comes from the office/district linkage (`essentials.districts` / office records).  The Read & Rank races API already returns `jurisdictionLevel`, `state`, `isLocal`.  **To confirm in planning:** the cleanest place to compute `BoundaryRef` (and `tier`/`scope`) is the races API itself, so each `RaceSummary` gains `tier`, `scope`, and an optional `boundaryRef`.  Frontend stays dumb; backend owns the join.

### Motif accessibility
The motif is decorative relative to the text; it carries `aria-hidden`.  All meaning (tier, scope, geography) is in the visible text labels, so the card is fully usable with the motif removed, in grayscale, and for color-blind users.

---

## 6. Tier / scope derivation

Computed server-side and added to `RaceSummary` (preferred) or mapped client-side as a fallback.  Indicative mapping from `district_type` / `jurisdictionLevel`:

| Source (MTFCC / kind) | tier | scope | motif when boundary present |
|---|---|---|---|
| `G5200` congressional | federal | district | state map, district lit |
| U.S. Senate / President | federal | statewide | US map, state lit *(needs v1 nation + state ingest)* |
| Governor, statewide exec | state | statewide | state map *(needs v1 state ingest; CA already present)* |
| `G5210`/`G5220` state senate / house / assembly | state | district | state map, district lit |
| `G4020` county | local | county | county polygon |
| `G4110` place / city | local | citywide | city polygon (e.g. Bloomington) |
| `X0001`/`X-MCC-DIST` city-council, county-council, supervisorial | local | district | that custom polygon (e.g. Bloomington Council District) |
| `G4040` township, `G54xx` school district | local | district | that polygon |

Genuinely-missing boundaries (no matching `geo_id`, or `has_unknown_boundaries`) fall back to the dot-field.  Exact office-to-`(mtfcc, geo_id)` mapping is finalized in planning against the live set.

---

## 7. Metadata footer

Three columns, hairline dividers (`--border-subtle`).

- **Candidates** — `candidateCount`.
- **Topics** — count of topics with **enough quotes to rank** (rankable topics), not raw topic count.  Needs a rankable-topics figure from the races API; if only `topicCount` is available initially, use it and flag the refinement.
- **Time** — `estMinutes`, derived from total quotes: `ceil((quotes * SECONDS_PER_QUOTE + OVERHEAD) / 60)`, rendered "~6 min".  `SECONDS_PER_QUOTE` ≈ 10 (tunable constant in one place).  Requires a quote count from the API.

Election date is shown on the geography line, not in the footer.

---

## 8. Theming and tokens

Use existing tokens; introduce none unless a gap appears.

- Surfaces: `--surface-page` (landing), `--surface-card` (cards), hairlines from `--border-subtle`.
- Accent (motif, links, hover border): `--text-link` (`#6cc6db` dark, `#00657c` light).
- Motif zone background: a deep inset in dark; in light mode a pale warm panel with dark-ink dots/outline (cartographic-print feel).  Both derived from tokens, not hardcoded.
- Reserved, do not repurpose: `--color-ev-coral` (in-progress / local pill), `--color-ev-yellow` (Inform whisper).

---

## 9. Accessibility (WCAG 2.1 AA — floor)

- Tier/scope conveyed by **text label**, never color or shape alone; survives grayscale and color blindness.
- Body and UI text meet 4.5:1 / 3:1; the chosen tokens already document their ratios.
- Full keyboard path: cards are buttons, Enter/Space activate, visible focus ring, logical tab order.
- Touch targets ≥ 44px; whole card is the target.
- `prefers-reduced-motion`: hover lift and any entrance animation have reduced-motion alternatives (opacity/border only).
- Motif is `aria-hidden`; screen readers get office + scope + geography + metadata as text.

---

## 10. Phasing

- **v1 (this work):** `Landing.tsx` restructure; `RaceCard` + `Motif` + `resolveMotif`; client GeoJSON→SVG projection + dot-field fallback; the `/api/inform/boundary` endpoint; races API extended with `tier`, `scope`, `boundaryRef`, rankable-topics, and quote count; **ingest of ~49 missing state outlines + one US/nation outline** into `geofence_boundaries`.  Real polygons render for congressional, state-leg, county, township, school, city, and city/county-council districts (where the area is served), **plus statewide and federal-statewide** after the ingest.  The dot-field shows only when a race's specific boundary is genuinely absent.
- **Later (deferred):** richer per-tier motif polish; backfilling geometry for newly-served areas as Read & Rank expands.

---

## 11. Non-goals
- No party color, flags, seals, capitol imagery, or any partisan framing anywhere.
- No second typeface.  Manrope only.
- No client-side map library (Leaflet/Mapbox).  Lightweight inline SVG only.
- No change to the evaluate/rank/reveal flow; this is arrival + selection only.

---

## 12. Open questions to resolve in planning
1. Confirm the races API can be extended to emit `tier`, `scope`, `boundaryRef`, rankable-topic count, and quote count, or whether the frontend must derive any of these.
2. Confirm the exact `district_type` → (tier, scope) vocabulary against the full live set (including any township/place kinds beyond those sampled).
3. Confirm the simplification tolerance and whether the backend returns GeoJSON (frontend projects) vs a prebaked normalized SVG path (server projects).  Default assumption: GeoJSON + bbox, frontend projects.
4. *(Resolved — yes.)* State + US/nation outlines are in v1 scope (decision 8).  Planning confirms the TIGER source resolution and FIPS-keying for the ingest.

---

## 13. Files expected to change
- `src/components/Landing.tsx` — restructure to one section, equal-weight steps, "Start here" tag.
- `src/components/RaceHub.tsx` — render `RaceCard`; keep fetch/sort/filter/progress logic.
- `src/components/RaceCard.tsx` — new.
- `src/components/motif/Motif.tsx`, `resolveMotif.ts`, `projectGeoJson.ts` — new motif system.
- `src/data/api.ts` — extend `RaceSummary` (`tier`, `scope`, `boundaryRef`, rankable topics, quote count); add `fetchBoundary`.
- Backend (`/Users/chrisandrews/Documents/GitHub/ev-accounts`, branch `master`) — `GET /api/inform/boundary` endpoint; races API field additions (`tier`, `scope`, `boundaryRef`, rankable-topics, quote count); state + US/nation outline ingest into `essentials.geofence_boundaries` (`mtfcc G4000` + nation row).
- Tests: `RaceCard`, `resolveMotif`, `projectGeoJson`, updated `Landing`/`RaceHub` tests.
