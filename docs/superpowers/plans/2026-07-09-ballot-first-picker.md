# Ballot-first Election Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Read & Rank election picker from an all-races wall into a ballot-first experience — an example Los Angeles ballot by default, "Your Ballot" on address search, and an opt-in State → County → races browse — backed by populating `countyGeoIds` for congressional and statewide races.

**Architecture:** Backend (ev-accounts) computes a county set for every race that overlaps or covers a county, and returns a county-name index. Frontend (read-rank) fetches the full list once but only *renders* the active slice (a county view), reusing one pure `racesInCounty` helper for the example ballot, the located ballot, and browse. A unified smart-search input routes addresses to the located ballot and place names into browse.

**Tech Stack:** TypeScript, React 18, Zustand, Framer Motion, Vitest (both repos), Express + PostGIS (ev-accounts), `@googlemaps/js-api-loader`.

**Spec:** [`docs/superpowers/specs/2026-07-09-ballot-first-picker-design.md`](../specs/2026-07-09-ballot-first-picker-design.md)

**Repos & paths:** frontend paths are relative to `read-rank/`; backend paths are prefixed `../ev-accounts/`.

**Refinement vs spec:** the two read-only county lookups (spec A2/A3) live as **new exported functions in `informBoundaryService.ts`** rather than inline in `readrankService.ts`. Rationale: that module already owns geofence queries (`getCountyUnionFrames`) and is already mocked in tests, so the additions are cleanly testable. They are purely additive — no existing function changes, and essentials imports none of this module.

---

## File Structure

**ev-accounts (backend):**
- Modify `../ev-accounts/backend/src/lib/readrankService.ts` — add `G5200` to `COUNTY_OVERLAP_LAYERS`; assign statewide races all state counties; return `{ races, counties }`.
- Modify `../ev-accounts/backend/src/lib/informBoundaryService.ts` — add `getStateCountyGeoIds`, `getCountyNames`.
- Modify `../ev-accounts/backend/src/routes/readrank.ts` — pass through `{ races, counties }`.
- Test: `../ev-accounts/backend/src/lib/readrankService.test.ts`, `../ev-accounts/backend/src/lib/informBoundaryService.test.ts`.

**read-rank (frontend):**
- Modify `src/data/api.ts` — `fetchRaces` returns `{ races, counties }`; add `CountyIndex`.
- Modify `src/utils/raceGrouping.ts` — add pure helpers `racesInCounty`, `statesWithCounts`, `countiesForState`; drop the `other` band from the located path.
- Create `src/lib/localitySearch.ts` — free-text → address/state/county/city classification.
- Create `src/components/RaceBrowse.tsx` — State → County → races drill-down.
- Modify `src/components/RaceHub.tsx` — pick view state (example / located / browse); render county view; render-on-demand.
- Modify `src/components/AddressFilterInput.tsx` — route non-address queries into browse.
- Tests: `src/utils/__tests__/raceGrouping.test.ts`, `src/lib/__tests__/localitySearch.test.ts`, `src/components/__tests__/RaceBrowse.test.tsx`.

---

## Phase 0 — Backend pre-flight (gate)

### Task 0: Verify congressional-district geometry exists ✅ DONE (2026-07-09)

**Outcome — GATE PASSED.** `essentials.geofence_boundaries` holds **436 `G5200` rows across all 50
states**, and **435/435 distinct congressional district refs used by races resolve to geometry**
(stored as `mtfcc='G5200'`, geoid = state FIPS + district, matching how races reference them). No
shapefile loading required — Phase 1 is a pure code change. (The empty `countyGeoIds` seen on the
live API was solely because `G5200` was excluded from `COUNTY_OVERLAP_LAYERS`, not missing geometry.)

**Files:** none (investigation).

- [x] **Step 1: Query the DB for G5200 rows**

Run (against the read-rank/essentials database):

```sql
SELECT state, count(*) AS n
FROM essentials.geofence_boundaries
WHERE mtfcc = 'G5200'
GROUP BY state
ORDER BY state;
```

Expected for this task to proceed cleanly: rows for the states we serve.

- [x] **Step 2: Decide** → Geometry present and complete; proceed to Phase 1. (Fallback path —
  loading TIGER CD shapefiles — was not needed.)

---

## Phase 1 — Backend: county coverage + county index

### Task 1: `getStateCountyGeoIds` — all counties in a state

**Files:**
- Modify: `../ev-accounts/backend/src/lib/informBoundaryService.ts`
- Test: `../ev-accounts/backend/src/lib/informBoundaryService.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `informBoundaryService.test.ts`:

```typescript
import { getStateCountyGeoIds, getCountyNames } from './informBoundaryService.js';

describe('getStateCountyGeoIds', () => {
  it('groups county GEOIDs by USPS state, deduping input states', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { state: 'CA', geo_id: '06037' },
      { state: 'CA', geo_id: '06059' },
      { state: 'UT', geo_id: '49035' },
    ] });
    const out = await getStateCountyGeoIds(['CA', 'UT', 'CA']);
    expect(out.get('CA')).toEqual(['06037', '06059']);
    expect(out.get('UT')).toEqual(['49035']);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/mtfcc = 'G4020'/);
    expect(params).toEqual([['CA', 'UT']]);
  });

  it('returns an empty map and runs no query for no states', async () => {
    const out = await getStateCountyGeoIds([]);
    expect(out.size).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/informBoundaryService.test.ts -t getStateCountyGeoIds`
Expected: FAIL — `getStateCountyGeoIds is not a function`.

- [ ] **Step 3: Implement**

Append to `informBoundaryService.ts`:

```typescript
/** County (G4020) GEOIDs for each USPS state, keyed by state code. Read-only.
 *  Used to assign statewide races to every county so they surface in each county view. */
export async function getStateCountyGeoIds(uspsStates: string[]): Promise<Map<string, string[]>> {
  const states = [...new Set(uspsStates.filter(Boolean))];
  if (states.length === 0) return new Map();
  const { rows } = await pool.query<{ state: string; geo_id: string }>(
    `SELECT state, geo_id
       FROM essentials.geofence_boundaries
      WHERE mtfcc = 'G4020' AND state = ANY($1)
      ORDER BY geo_id`,
    [states],
  );
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.state) ?? [];
    list.push(r.geo_id);
    map.set(r.state, list);
  }
  return map;
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/informBoundaryService.test.ts -t getStateCountyGeoIds`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ../ev-accounts && git add backend/src/lib/informBoundaryService.ts backend/src/lib/informBoundaryService.test.ts
git commit -m "feat(readrank): getStateCountyGeoIds — county set per state"
```

### Task 2: `getCountyNames` — GEOID → display name

**Files:**
- Modify: `../ev-accounts/backend/src/lib/informBoundaryService.ts`
- Test: `../ev-accounts/backend/src/lib/informBoundaryService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
describe('getCountyNames', () => {
  it('maps county GEOIDs to names, deduping input', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { geo_id: '06037', name: 'Los Angeles County' },
      { geo_id: '49035', name: 'Salt Lake County' },
    ] });
    const out = await getCountyNames(['06037', '49035', '06037']);
    expect(out).toEqual({ '06037': 'Los Angeles County', '49035': 'Salt Lake County' });
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/mtfcc = 'G4020'/);
    expect(params).toEqual([['06037', '49035']]);
  });

  it('returns {} and runs no query for no ids', async () => {
    expect(await getCountyNames([])).toEqual({});
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/informBoundaryService.test.ts -t getCountyNames`
Expected: FAIL — `getCountyNames is not a function`.

- [ ] **Step 3: Implement**

Append to `informBoundaryService.ts`:

```typescript
/** Display names for county (G4020) GEOIDs. Read-only; labels the browse county picker. */
export async function getCountyNames(geoIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(geoIds.filter(Boolean))];
  if (ids.length === 0) return {};
  const { rows } = await pool.query<{ geo_id: string; name: string }>(
    `SELECT geo_id, name
       FROM essentials.geofence_boundaries
      WHERE mtfcc = 'G4020' AND geo_id = ANY($1)`,
    [ids],
  );
  const out: Record<string, string> = {};
  for (const r of rows) out[r.geo_id] = r.name;
  return out;
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/informBoundaryService.test.ts -t getCountyNames`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ../ev-accounts && git add backend/src/lib/informBoundaryService.ts backend/src/lib/informBoundaryService.test.ts
git commit -m "feat(readrank): getCountyNames — county GEOID to name"
```

### Task 3: Congressional districts get overlapping counties (`G5200`)

**Files:**
- Modify: `../ev-accounts/backend/src/lib/readrankService.ts:129` (the `COUNTY_OVERLAP_LAYERS` set)
- Test: `../ev-accounts/backend/src/lib/readrankService.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test in the existing `getPlayableRaces — countyGeoIds` describe block. It mocks one DB row for a congressional district and a union-frame result:

```typescript
it('populates countyGeoIds for a congressional (G5200) district from the union frame', async () => {
  mockQuery.mockResolvedValueOnce({ rows: [{
    race_id: 'r-cd', position_name: 'U.S. House', district_label: 'District 3', district_type: 'NATIONAL_LOWER',
    election_id: 'e1', election_name: 'General', election_date: null,
    jurisdiction_level: 'federal', state: 'UT',
    boundary_layer: 'G5200', boundary_geoid: '4903',
    frame_layer: null, frame_geoid: null,
    candidate_count: '2', topic_count: '3', quote_count: '9', rankable_topic_count: '3',
    politician_ids: ['p1', 'p2'],
  }] });
  mockGetCountyUnionFrames.mockResolvedValue(new Map([
    ['G5200:4903', { bbox: [0, 0, 1, 1], geojson: { type: 'Polygon', coordinates: [] }, countyGeoIds: ['49035', '49049'] }],
  ]));
  const { races } = await getPlayableRacesResult();      // helper defined in Task 5
  expect(races[0].countyGeoIds).toEqual(['49035', '49049']);
});
```

> Note: this test depends on the `{ races, counties }` return shape and the `getPlayableRacesResult()` helper introduced in Task 5. If executing strictly in order, temporarily call `await getPlayableRaces(...)` and read `.countyGeoIds` off the array; Task 5 updates it. The reviewer running out of order should implement Task 5's shape first.

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts -t "congressional"`
Expected: FAIL — `countyGeoIds` is `[]` (G5200 not in the overlap set).

- [ ] **Step 3: Implement**

In `readrankService.ts`, add `'G5200'` to `COUNTY_OVERLAP_LAYERS`:

```typescript
const COUNTY_OVERLAP_LAYERS = new Set(['G5200', 'G5210', 'G5220', 'G5400', 'G5410', 'G5420', 'G4040']);
```

- [ ] **Step 4: Confirm the federal motif is unchanged**

Verify no regression: federal races are handled by the `if (tier === 'federal')` branch **before** the
`COUNTY_OVERLAP_LAYERS` frame branch, so `boundaryRef`/`frameRef` stay state-in-US. Add an assertion:

```typescript
it('leaves a federal race boundary/frame as state-in-US after adding G5200', async () => {
  mockQuery.mockResolvedValueOnce({ rows: [{
    race_id: 'r-cd2', position_name: 'U.S. House', district_label: 'District 1', district_type: 'NATIONAL_LOWER',
    election_id: 'e1', election_name: 'General', election_date: null,
    jurisdiction_level: 'federal', state: 'UT',
    boundary_layer: 'G5200', boundary_geoid: '4901',
    frame_layer: null, frame_geoid: null,
    candidate_count: '2', topic_count: '1', quote_count: '3', rankable_topic_count: '1',
    politician_ids: ['p1', 'p2'],
  }] });
  mockGetCountyUnionFrames.mockResolvedValue(new Map());
  const { races } = await getPlayableRacesResult();
  expect(races[0].boundaryRef).toEqual({ layer: 'G4000', geoid: '49' });
  expect(races[0].frameRef).toEqual({ layer: 'G4000', geoid: 'US' });
});
```

- [ ] **Step 5: Run tests and confirm they pass**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts`
Expected: PASS (implement Task 5's shape first if red on `getPlayableRacesResult`).

- [ ] **Step 6: Commit**

```bash
cd ../ev-accounts && git add backend/src/lib/readrankService.ts backend/src/lib/readrankService.test.ts
git commit -m "feat(readrank): assign overlapping counties to congressional districts"
```

### Task 4: Statewide races → all counties in their state

**Files:**
- Modify: `../ev-accounts/backend/src/lib/readrankService.ts` (import + assignment in `getPlayableRaces`)
- Test: `../ev-accounts/backend/src/lib/readrankService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
it('assigns every county in the state to a statewide race', async () => {
  mockQuery.mockResolvedValueOnce({ rows: [{
    race_id: 'r-gov', position_name: 'Governor', district_label: null, district_type: null,
    election_id: 'e1', election_name: 'General', election_date: null,
    jurisdiction_level: 'state', state: 'UT',
    boundary_layer: 'G4000', boundary_geoid: '49',
    frame_layer: null, frame_geoid: null,
    candidate_count: '2', topic_count: '4', quote_count: '8', rankable_topic_count: '4',
    politician_ids: ['p1', 'p2'],
  }] });
  mockGetStateCountyGeoIds.mockResolvedValue(new Map([['UT', ['49035', '49049', '49011']]]));
  const { races } = await getPlayableRacesResult();
  expect(races[0].scope).toBe('statewide');
  expect(races[0].countyGeoIds).toEqual(['49035', '49049', '49011']);
});
```

Add the mock to the top-of-file `vi.mock('./informBoundaryService.js', ...)` block and `beforeEach`:

```typescript
// in vi.hoisted:
mockGetStateCountyGeoIds: vi.fn(),
mockGetCountyNames: vi.fn(),
// in vi.mock('./informBoundaryService.js', ...):
getStateCountyGeoIds: mockGetStateCountyGeoIds,
getCountyNames: mockGetCountyNames,
// in beforeEach:
mockGetStateCountyGeoIds.mockResolvedValue(new Map());
mockGetCountyNames.mockResolvedValue({});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts -t "statewide race"`
Expected: FAIL — `countyGeoIds` is `[]`.

- [ ] **Step 3: Implement**

In `readrankService.ts`: import the helper and, before the `rows.map(...)`, resolve the county sets
for all statewide races' states; inside the map, override `countyGeoIds` for statewide scope.

```typescript
// top of file
import { getBoundaryBatch, getCountyUnionFrames, getStateCountyGeoIds, getCountyNames } from './informBoundaryService.js';
```

```typescript
// after unionFrameMap is resolved, before `return rows.map(...)`:
const statewideStates = [...new Set(
  rows
    .filter((r) => deriveTierScope({
      jurisdiction_level: r.jurisdiction_level, position_name: r.position_name, mtfcc: r.boundary_layer,
    }).scope === 'statewide' && r.state)
    .map((r) => r.state as string),
)];
let stateCountyMap = new Map<string, string[]>();
try {
  stateCountyMap = await getStateCountyGeoIds(statewideStates);
} catch {
  // graceful degradation — statewide races fall back to []
}
```

Then, inside the existing `let countyGeoIds` block in the map callback, add a final override:

```typescript
    // Statewide races cover the whole state → every county, so they surface in each county view.
    if (scope === 'statewide' && r.state) {
      countyGeoIds = stateCountyMap.get(r.state) ?? [];
    }
```

Place this **after** the existing `if (scope === 'county') … else if … else if (COUNTY_OVERLAP_LAYERS…)` chain so it wins for statewide scope.

- [ ] **Step 4: Run tests and confirm they pass**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts -t "statewide race"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ../ev-accounts && git add backend/src/lib/readrankService.ts backend/src/lib/readrankService.test.ts
git commit -m "feat(readrank): statewide races cover all counties in their state"
```

### Task 5: Return `{ races, counties }` with a county-name index

**Files:**
- Modify: `../ev-accounts/backend/src/lib/readrankService.ts` (`getPlayableRaces` return)
- Modify: `../ev-accounts/backend/src/routes/readrank.ts:23-24`
- Test: `../ev-accounts/backend/src/lib/readrankService.test.ts`

- [ ] **Step 1: Add the shared test helper + failing test**

Near the top of `readrankService.test.ts` (after imports), add a helper so tests read the new shape:

```typescript
// getPlayableRaces now returns { races, counties }. Existing array-style assertions
// migrate to this helper.
async function getPlayableRacesResult(ids?: string[]) {
  return getPlayableRaces(ids);
}
```

Failing test:

```typescript
it('returns a counties name index covering every referenced GEOID', async () => {
  mockQuery.mockResolvedValueOnce({ rows: [{
    race_id: 'r-gov', position_name: 'Governor', district_label: null, district_type: null,
    election_id: 'e1', election_name: 'General', election_date: null,
    jurisdiction_level: 'state', state: 'UT',
    boundary_layer: 'G4000', boundary_geoid: '49',
    frame_layer: null, frame_geoid: null,
    candidate_count: '2', topic_count: '4', quote_count: '8', rankable_topic_count: '4',
    politician_ids: ['p1', 'p2'],
  }] });
  mockGetStateCountyGeoIds.mockResolvedValue(new Map([['UT', ['49035']]]));
  mockGetCountyNames.mockResolvedValue({ '49035': 'Salt Lake County' });
  const { races, counties } = await getPlayableRacesResult();
  expect(races[0].countyGeoIds).toEqual(['49035']);
  expect(counties).toEqual({ '49035': 'Salt Lake County' });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts -t "counties name index"`
Expected: FAIL — destructuring `counties` from an array is `undefined`.

- [ ] **Step 3: Implement the new return shape**

Change `getPlayableRaces` to build the array (call it `races`), then resolve names for all referenced GEOIDs and return the object:

```typescript
export async function getPlayableRaces(
  politicianIds?: string[],
): Promise<{ races: RaceSummary[]; counties: Record<string, string> }> {
  // ... existing query + boundary/union resolution ...
  const races = rows.map((r) => {
    // ... unchanged mapping, now including statewide county override ...
  });

  const allCountyGeoIds = [...new Set(races.flatMap((r) => r.countyGeoIds))];
  let counties: Record<string, string> = {};
  try {
    counties = await getCountyNames(allCountyGeoIds);
  } catch {
    counties = {};
  }
  return { races, counties };
}
```

(Wrap the existing `return rows.map(...)` as `const races = rows.map(...)`.)

- [ ] **Step 4: Update the route**

`readrank.ts`, in `GET /races`:

```typescript
    const { races, counties } = await getPlayableRaces(politicianIds);
    res.status(200).json({ races, counties });
```

- [ ] **Step 5: Migrate existing array-style assertions**

Any existing test doing `const out = await getPlayableRaces(...)` and indexing `out[0]` must become
`const { races } = await getPlayableRaces(...)` / `races[0]`. Run the full file and fix each failure:

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts`
Expected: PASS after migration.

- [ ] **Step 6: Commit**

```bash
cd ../ev-accounts && git add backend/src/lib/readrankService.ts backend/src/routes/readrank.ts backend/src/lib/readrankService.test.ts
git commit -m "feat(readrank): return { races, counties } with county-name index"
```

---

## Phase 2 — Frontend: consume the new payload

### Task 6: `fetchRaces` returns `{ races, counties }`

**Files:**
- Modify: `src/data/api.ts:133-147`
- Modify: `src/components/RaceHub.tsx:28-42` (caller)

- [ ] **Step 1: Add the `CountyIndex` type and update `fetchRaces`**

In `api.ts`, add near `RaceSummary`:

```typescript
/** Map of county GEOID → display name, returned alongside the race list. */
export type CountyIndex = Record<string, string>;
```

Replace `fetchRaces`:

```typescript
export async function fetchRaces(
  politicianIds?: string[],
): Promise<{ races: RaceSummary[]; counties: CountyIndex }> {
  try {
    const qs = politicianIds && politicianIds.length
      ? `?politician_ids=${encodeURIComponent(politicianIds.join(','))}`
      : '';
    const res = await fetch(`${API_BASE}/readrank/races${qs}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return {
      races: (data.races ?? []) as RaceSummary[],
      counties: (data.counties ?? {}) as CountyIndex,
    };
  } catch (err) {
    console.error('Failed to fetch races, falling back to mock', err);
    const { mockRaceSummary } = await import('./mockData');
    return { races: [mockRaceSummary], counties: {} };
  }
}
```

- [ ] **Step 2: Update the RaceHub caller**

In `RaceHub.tsx`, add `counties` state and unpack the new shape:

```typescript
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [counties, setCounties] = useState<CountyIndex>({});
```

```typescript
    fetchRaces(politicianIds)
      .then(({ races, counties }) => { setRaces(races); setCounties(counties); })
      .finally(() => setLoading(false));
```

Add `CountyIndex` to the `api` import.

- [ ] **Step 3: Typecheck**

Run: `npm run build` (or `npx tsc --noEmit`)
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/api.ts src/components/RaceHub.tsx
git commit -m "feat: fetchRaces returns { races, counties }"
```

---

## Phase 3 — Frontend: pure grouping helpers

### Task 7: `racesInCounty` — county view (hide empties, order local→state→federal)

**Files:**
- Modify: `src/utils/raceGrouping.ts`
- Test: `src/utils/__tests__/raceGrouping.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `raceGrouping.test.ts`:

```typescript
import { racesInCounty, statesWithCounts, countiesForState } from '../raceGrouping';

const laMayor = race({ raceId: 'la-mayor', state: 'CA', tier: 'local', scope: 'citywide', countyGeoIds: ['06037'], rankableTopicCount: 5 });
const caGov = race({ raceId: 'ca-gov', state: 'CA', tier: 'state', scope: 'statewide', countyGeoIds: ['06037', '06059'], rankableTopicCount: 4 });
const caCd = race({ raceId: 'ca-cd', state: 'CA', tier: 'federal', scope: 'district', countyGeoIds: ['06037'], rankableTopicCount: 3 });
const caEmpty = race({ raceId: 'ca-empty', state: 'CA', tier: 'federal', scope: 'district', countyGeoIds: ['06037'], rankableTopicCount: 0 });
const otherCounty = race({ raceId: 'oc', state: 'CA', tier: 'federal', scope: 'district', countyGeoIds: ['06059'], rankableTopicCount: 2 });

describe('racesInCounty', () => {
  const list = [caCd, caGov, laMayor, caEmpty, otherCounty];
  it('includes only races overlapping the county, hides empties', () => {
    const ids = racesInCounty(list, '06037').map((r) => r.raceId);
    expect(ids).not.toContain('ca-empty');
    expect(ids).not.toContain('oc');
    expect(ids).toEqual(expect.arrayContaining(['la-mayor', 'ca-gov', 'ca-cd']));
  });
  it('orders local → state → federal', () => {
    expect(racesInCounty(list, '06037').map((r) => r.tier)).toEqual(['local', 'state', 'federal']);
  });
});
```

Extend the `race` factory defaults so the new fields exist:

```typescript
    tier: 'federal',
    scope: 'district',
    countyGeoIds: [],
    rankableTopicCount: 1,
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts -t racesInCounty`
Expected: FAIL — `racesInCounty is not a function`.

- [ ] **Step 3: Implement**

Add to `raceGrouping.ts`:

```typescript
const TIER_ORDER: Record<string, number> = { local: 0, state: 1, federal: 2 };

/** Races that genuinely overlap `countyGeoId`, with rankable topics, ordered
 *  local → state → federal (then by soonest election date). Empties are dropped. */
export function racesInCounty(races: RaceSummary[], countyGeoId: string): RaceSummary[] {
  return races
    .filter((r) => (r.rankableTopicCount ?? r.topicCount) > 0)
    .filter((r) => (r.countyGeoIds ?? []).includes(countyGeoId))
    .sort((a, b) => {
      const ta = TIER_ORDER[a.tier ?? 'local'] ?? 0;
      const tb = TIER_ORDER[b.tier ?? 'local'] ?? 0;
      if (ta !== tb) return ta - tb;
      return (a.electionDate ?? '').localeCompare(b.electionDate ?? '');
    });
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts -t racesInCounty`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/raceGrouping.ts src/utils/__tests__/raceGrouping.test.ts
git commit -m "feat: racesInCounty helper (overlap, empties hidden, tier order)"
```

### Task 8: `statesWithCounts` and `countiesForState`

**Files:**
- Modify: `src/utils/raceGrouping.ts`
- Test: `src/utils/__tests__/raceGrouping.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
describe('statesWithCounts', () => {
  it('lists states (with a non-empty race) alphabetically with counts', () => {
    const ut = race({ raceId: 'ut', state: 'UT', rankableTopicCount: 2 });
    const caEmptyOnly = race({ raceId: 'ce', state: 'NV', rankableTopicCount: 0 });
    const out = statesWithCounts([caGov, caCd, ut, caEmptyOnly]);
    expect(out).toEqual([
      { state: 'CA', name: 'California', count: 2 },
      { state: 'UT', name: 'Utah', count: 1 },
    ]);
  });
});

describe('countiesForState', () => {
  it('lists counties in the state that have a non-empty race, labelled and sorted', () => {
    const counties = { '06037': 'Los Angeles County', '06059': 'Orange County' };
    const out = countiesForState([caGov, caCd, otherCounty], counties, 'CA');
    expect(out).toEqual([
      { geoid: '06037', name: 'Los Angeles County', count: 3 },
      { geoid: '06059', name: 'Orange County', count: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts -t "statesWithCounts|countiesForState"`
Expected: FAIL — not functions.

- [ ] **Step 3: Implement**

```typescript
export interface StateEntry { state: string; name: string; count: number; }
export interface CountyEntry { geoid: string; name: string; count: number; }

/** States that have at least one rankable race, alphabetical by name, with race counts. */
export function statesWithCounts(races: RaceSummary[]): StateEntry[] {
  const counts = new Map<string, number>();
  for (const r of races) {
    if ((r.rankableTopicCount ?? r.topicCount) <= 0 || !r.state) continue;
    counts.set(r.state, (counts.get(r.state) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([state, count]) => ({ state, name: getStateName(state) ?? state, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Counties in `stateCode` that contain a rankable race, labelled via `counties`,
 *  sorted by name. A race counts toward every county it overlaps. */
export function countiesForState(
  races: RaceSummary[], counties: Record<string, string>, stateCode: string,
): CountyEntry[] {
  const counts = new Map<string, number>();
  for (const r of races) {
    if (r.state !== stateCode || (r.rankableTopicCount ?? r.topicCount) <= 0) continue;
    for (const geoid of r.countyGeoIds ?? []) {
      counts.set(geoid, (counts.get(geoid) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([geoid, count]) => ({ geoid, name: counties[geoid] ?? geoid, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

`getStateName` is already imported at the top of `raceGrouping.ts`.

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts`
Expected: PASS (whole file).

- [ ] **Step 5: Commit**

```bash
git add src/utils/raceGrouping.ts src/utils/__tests__/raceGrouping.test.ts
git commit -m "feat: statesWithCounts + countiesForState browse helpers"
```

### Task 9: Drop the "other states" band from the located path

**Files:**
- Modify: `src/utils/raceGrouping.ts:98-115`
- Test: `src/utils/__tests__/raceGrouping.test.ts`

- [ ] **Step 1: Update the located-path test**

Change the existing `orders bands: your, state, other` expectation — the located path no longer emits
`other` (browsing other states is now an explicit action):

```typescript
  it('orders bands: your, state (no other-states dump)', () => {
    expect(result.sections.map((s) => s.kind)).toEqual(['your', 'state']);
  });
```

Remove/replace the `marks only "other" collapsible` test with:

```typescript
  it('never emits an other-states band', () => {
    expect(result.sections.some((s) => s.kind === 'other')).toBe(false);
  });
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts -t "located, upcoming"`
Expected: FAIL — `other` band still present.

- [ ] **Step 3: Implement**

In `groupRaces`, remove the `other` section push (the `if (other.length) { … kind: 'other' … }`
block) and the now-unused `other` computation. Empty races are also excluded from the located tiers —
filter `inBucket` to rankable at the top of the located branch:

```typescript
  const rankable = inBucket.filter((r) => (r.rankableTopicCount ?? r.topicCount) > 0);
  const your = rankable.filter((r) => r.isLocal);
  const inCounty = rankable.filter((r) => !r.isLocal && matchesCounty(r));
  const sameState = rankable.filter(
    (r) => !r.isLocal && !matchesCounty(r) && userState != null && r.state === userState,
  );
```

Delete the `other` variable and its section push. Leave `your`, `county`, `state` bands intact.

- [ ] **Step 4: Run the whole file**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts`
Expected: PASS. Fix any other test that asserted the `other` band.

- [ ] **Step 5: Commit**

```bash
git add src/utils/raceGrouping.ts src/utils/__tests__/raceGrouping.test.ts
git commit -m "feat: remove other-states dump; hide empties from located tiers"
```

---

## Phase 4 — Frontend: smart search classification

### Task 10: `classifyQuery` + `resolveQueryRoute`

**Files:**
- Create: `src/lib/localitySearch.ts`
- Test: `src/lib/__tests__/localitySearch.test.ts`

- [ ] **Step 1: Write the failing test (pure routing logic)**

The Google geocoder itself isn't unit-tested; we test the pure router `routeFromClassification`
that maps a classification + the counties index to a navigation intent.

```typescript
import { describe, it, expect } from 'vitest';
import { routeFromClassification } from '../localitySearch';

const counties = { '06037': 'Los Angeles County', '06059': 'Orange County' };

describe('routeFromClassification', () => {
  it('address → located ballot', () => {
    expect(routeFromClassification({ kind: 'address' }, counties, 'anything'))
      .toEqual({ kind: 'address' });
  });
  it('state → browse that state', () => {
    expect(routeFromClassification({ kind: 'state', stateAbbrev: 'CA' }, counties, 'California'))
      .toEqual({ kind: 'browse-state', state: 'CA' });
  });
  it('county name → browse that county GEOID', () => {
    expect(routeFromClassification(
      { kind: 'county', stateAbbrev: 'CA', countyName: 'Los Angeles County' }, counties, 'Los Angeles',
    )).toEqual({ kind: 'browse-county', geoid: '06037', state: 'CA' });
  });
  it('city name resolves to its county when known', () => {
    expect(routeFromClassification(
      { kind: 'city', stateAbbrev: 'CA', countyName: 'Orange County', cityName: 'Irvine' }, counties, 'Irvine',
    )).toEqual({ kind: 'browse-county', geoid: '06059', state: 'CA' });
  });
  it('unresolvable place → falls back to address', () => {
    expect(routeFromClassification({ kind: 'unknown' }, counties, 'zzz'))
      .toEqual({ kind: 'address' });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/__tests__/localitySearch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/localitySearch.ts` (geocoder ported from essentials; pure router separated for tests):

```typescript
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export interface Classification {
  kind: 'address' | 'city' | 'county' | 'state' | 'unknown';
  stateAbbrev?: string;
  countyName?: string;
  cityName?: string;
}

export type QueryRoute =
  | { kind: 'address' }
  | { kind: 'browse-state'; state: string }
  | { kind: 'browse-county'; geoid: string; state: string };

function comp(components: google.maps.GeocoderAddressComponent[] | undefined, type: string) {
  return components?.find((c) => c.types.includes(type)) || null;
}

function ensureConfigured(): void {
  if (API_KEY && !window.google?.maps?.importLibrary) setOptions({ key: API_KEY });
}

/** Classify free text via the Google geocoder. Throws when the geocoder is unavailable
 *  or returns nothing — callers treat a throw as "fall back to address search". */
export async function classifyQuery(query: string): Promise<Classification> {
  if (!API_KEY) throw new Error('no maps key');
  ensureConfigured();
  const { Geocoder } = await importLibrary('geocoding') as google.maps.GeocodingLibrary;
  const geocoder = new Geocoder();
  const { results } = await geocoder.geocode({ address: query, componentRestrictions: { country: 'US' } });
  const top = results?.[0];
  if (!top) throw new Error('no geocode result');
  const types = top.types || [];
  const components = top.address_components || [];
  const stateComp = comp(components, 'administrative_area_level_1');
  const countyComp = comp(components, 'administrative_area_level_2');
  const localityComp = comp(components, 'locality') || comp(components, 'postal_town') || comp(components, 'sublocality');
  const out: Classification = {
    kind: 'unknown',
    stateAbbrev: stateComp?.short_name || undefined,
    countyName: countyComp?.long_name || undefined,
    cityName: localityComp?.long_name || undefined,
  };
  const hasStreet = !!comp(components, 'street_number')
    || types.some((t) => ['street_address', 'premise', 'subpremise', 'route'].includes(t));
  if (hasStreet || types.includes('postal_code')) out.kind = 'address';
  else if (types.includes('locality') || types.includes('postal_town') || types.includes('sublocality')) out.kind = 'city';
  else if (types.includes('administrative_area_level_2')) out.kind = 'county';
  else if (types.includes('administrative_area_level_1')) out.kind = 'state';
  return out;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\b(county|parish|borough)\b/g, '').replace(/[^a-z]/g, '').trim();
}

/** Map a classification to a navigation intent using the county-name index for GEOID lookup.
 *  Pure — unit-tested without the geocoder. */
export function routeFromClassification(
  c: Classification, counties: Record<string, string>, _query: string,
): QueryRoute {
  if (c.kind === 'address') return { kind: 'address' };
  if (!c.stateAbbrev) return { kind: 'address' };
  if (c.kind === 'state') return { kind: 'browse-state', state: c.stateAbbrev };
  if ((c.kind === 'county' || c.kind === 'city') && c.countyName) {
    const target = normalize(c.countyName);
    const hit = Object.entries(counties).find(([, name]) => normalize(name) === target);
    if (hit) return { kind: 'browse-county', geoid: hit[0], state: c.stateAbbrev };
    return { kind: 'browse-state', state: c.stateAbbrev };
  }
  return { kind: 'address' };
}

/** Full resolve: classify then route. Never throws — any failure resolves to address. */
export async function resolveQueryRoute(query: string, counties: Record<string, string>): Promise<QueryRoute> {
  try {
    return routeFromClassification(await classifyQuery(query), counties, query);
  } catch {
    return { kind: 'address' };
  }
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/lib/__tests__/localitySearch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/localitySearch.ts src/lib/__tests__/localitySearch.test.ts
git commit -m "feat: smart-search locality classification + routing"
```

---

## Phase 5 — Frontend: browse component

### Task 11: `RaceBrowse` — State → County → races drill-down

**Files:**
- Create: `src/components/RaceBrowse.tsx`
- Test: `src/components/__tests__/RaceBrowse.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RaceBrowse } from '../RaceBrowse';
import type { RaceSummary } from '../../data/api';

function race(p: Partial<RaceSummary> & { raceId: string }): RaceSummary {
  return {
    office: 'US Representative', electionName: 'E', electionDate: null, seat: null,
    state: 'CA', jurisdictionLevel: null, candidateCount: 2, topicCount: 3, quoteCount: 6,
    rankableTopicCount: 3, isLocal: false, tier: 'federal', scope: 'district',
    boundaryRef: null, frameRef: null, countyGeoIds: ['06037'], ...p,
  } as RaceSummary;
}

const races = [
  race({ raceId: 'ca-cd', seat: 'District 30', countyGeoIds: ['06037'] }),
  race({ raceId: 'ut-cd', state: 'UT', seat: 'District 1', countyGeoIds: ['49035'] }),
];
const counties = { '06037': 'Los Angeles County', '49035': 'Salt Lake County' };

describe('RaceBrowse', () => {
  it('drills state → county → races and only renders the active level', () => {
    render(<RaceBrowse races={races} counties={counties} onSelect={vi.fn()} initial={null} />);
    // Level: states
    expect(screen.getByText('California')).toBeInTheDocument();
    expect(screen.queryByText('Los Angeles County')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('California'));
    // Level: counties
    expect(screen.getByText('Los Angeles County')).toBeInTheDocument();
    expect(screen.queryByText(/District 30/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Los Angeles County'));
    // Level: races
    expect(screen.getByText(/District 30/)).toBeInTheDocument();
  });

  it('starts at a county when given an initial geoid', () => {
    render(<RaceBrowse races={races} counties={counties} onSelect={vi.fn()} initial={{ state: 'CA', geoid: '06037' }} />);
    expect(screen.getByText(/District 30/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/components/__tests__/RaceBrowse.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/RaceBrowse.tsx`:

```tsx
import React, { useState } from 'react';
import type { RaceSummary, CountyIndex } from '../data/api';
import { statesWithCounts, countiesForState, racesInCounty } from '../utils/raceGrouping';
import { RaceCard } from './RaceCard';
import { deriveTierScope } from '../utils/raceTier';
import { estimateMinutes } from '../utils/estimateMinutes';
import { getStateName } from '../utils/stateNames';

export interface BrowseTarget { state: string; geoid: string; }

interface RaceBrowseProps {
  races: RaceSummary[];
  counties: CountyIndex;
  onSelect: (race: RaceSummary) => void;
  /** Jump straight to a county (from smart search) or a state list; null = state list. */
  initial: BrowseTarget | { state: string; geoid: null } | null;
  disabled?: boolean;
}

type Level =
  | { level: 'states' }
  | { level: 'counties'; state: string }
  | { level: 'races'; state: string; geoid: string };

function initialLevel(initial: RaceBrowseProps['initial']): Level {
  if (initial && 'geoid' in initial && initial.geoid) return { level: 'races', state: initial.state, geoid: initial.geoid };
  if (initial && initial.state) return { level: 'counties', state: initial.state };
  return { level: 'states' };
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.75rem',
  letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-link)',
  margin: '1rem 0 0.5rem',
};

export const RaceBrowse: React.FC<RaceBrowseProps> = ({ races, counties, onSelect, initial, disabled }) => {
  const [nav, setNav] = useState<Level>(() => initialLevel(initial));

  const Breadcrumb = () => (
    <nav className="flex items-center gap-2 mb-2" aria-label="Browse location" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem' }}>
      <button onClick={() => setNav({ level: 'states' })} className="font-bold" style={{ color: 'var(--text-link)', background: 'none', border: 'none', cursor: 'pointer' }}>All states</button>
      {nav.level !== 'states' && (
        <>
          <span style={{ color: 'var(--text-tertiary)' }}>›</span>
          <button
            onClick={() => setNav({ level: 'counties', state: nav.state })}
            className="font-bold" style={{ color: nav.level === 'counties' ? 'var(--text-secondary)' : 'var(--text-link)', background: 'none', border: 'none', cursor: 'pointer' }}
          >{getStateName(nav.state) ?? nav.state}</button>
        </>
      )}
      {nav.level === 'races' && (
        <>
          <span style={{ color: 'var(--text-tertiary)' }}>›</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{counties[nav.geoid] ?? nav.geoid}</span>
        </>
      )}
    </nav>
  );

  if (nav.level === 'states') {
    const states = statesWithCounts(races);
    return (
      <div>
        <div style={labelStyle}>Browse by state</div>
        <ul className="acc-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {states.map((s) => (
            <li key={s.state}>
              <button className="race-browse-row" onClick={() => setNav({ level: 'counties', state: s.state })}>
                <span className="race-browse-row__name">{s.name}</span>
                <span className="race-browse-row__count">{s.count} race{s.count !== 1 ? 's' : ''} ›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (nav.level === 'counties') {
    const list = countiesForState(races, counties, nav.state);
    return (
      <div>
        <Breadcrumb />
        <div style={labelStyle}>Counties in {getStateName(nav.state) ?? nav.state}</div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {list.map((c) => (
            <li key={c.geoid}>
              <button className="race-browse-row" onClick={() => setNav({ level: 'races', state: nav.state, geoid: c.geoid })}>
                <span className="race-browse-row__name">{c.name}</span>
                <span className="race-browse-row__count">{c.count} race{c.count !== 1 ? 's' : ''} ›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // level: races
  const list = racesInCounty(races, nav.geoid);
  return (
    <div>
      <Breadcrumb />
      <div className="race-grid">
        {list.map((r, i) => {
          const { tier, scope } = deriveTierScope(r);
          return (
            <RaceCard
              key={r.raceId}
              office={r.office} tier={tier} scope={scope} state={r.state} seat={r.seat ?? null}
              electionDate={r.electionDate} boundaryRef={r.boundaryRef ?? null} frameRef={r.frameRef ?? null}
              candidateCount={r.candidateCount} topicCount={r.rankableTopicCount ?? r.topicCount}
              estMinutes={estimateMinutes({ quoteCount: r.quoteCount, candidateCount: r.candidateCount, topicCount: r.topicCount })}
              disabled={disabled} onSelect={() => onSelect(r)} enterIndex={i}
            />
          );
        })}
      </div>
    </div>
  );
};
```

Add the row styles to `src/index.css` (near `.race-grid`):

```css
.race-browse-row {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  padding: 0.75rem 0.9rem; background: var(--surface-card); border: 1px solid var(--border-subtle);
  border-radius: 0.6rem; margin-bottom: 0.4rem; cursor: pointer; font-family: 'Manrope', sans-serif;
  transition: border-color 0.15s;
}
.race-browse-row:hover { border-color: var(--text-link); }
.race-browse-row__name { font-weight: 800; font-size: 0.98rem; color: var(--text-heading); }
.race-browse-row__count { font-size: 0.8rem; font-weight: 700; color: var(--text-tertiary); }
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/components/__tests__/RaceBrowse.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RaceBrowse.tsx src/components/__tests__/RaceBrowse.test.tsx src/index.css
git commit -m "feat: RaceBrowse state→county→races drill-down"
```

---

## Phase 6 — Frontend: RaceHub view states + smart search wiring

### Task 12: RaceHub view-state selection (example / located / browse)

**Files:**
- Modify: `src/components/RaceHub.tsx`

- [ ] **Step 1: Add view state + LA constant**

Add near the top of the component module:

```typescript
/** Default showcase location when nothing is known about the user. */
const LA_COUNTY_GEOID = '06037';
```

In the component, add UI state:

```typescript
  const [browsing, setBrowsing] = useState<null | { state: string; geoid: string | null }>(null);
```

- [ ] **Step 2: Render the three view states**

Replace the section-rendering block (after `loading`/empty handling) with view selection. Keep the
time-filter chips and `AddressFilterInput`. Logic:

```tsx
  // 1) Explicit browse (from the Browse button or a place-name search)
  if (browsing) {
    return (
      <div className="pb-12">
        <div className="max-w-2xl mx-auto"><AddressFilterInput onBrowse={setBrowsing} /></div>
        <button className="ev-button-secondary mt-2" onClick={() => setBrowsing(null)}>‹ Back to my ballot</button>
        <RaceBrowse races={races} counties={counties} onSelect={handleSelect}
          initial={browsing} disabled={starting !== null} />
      </div>
    );
  }

  // 2) Located → Your Ballot (existing tiers, empties already removed in groupRaces)
  if (located) {
    // ...existing grouped sections render (unchanged)...
    // Add a "Browse other races" button below the sections:
    //   <button className="ev-button-secondary" onClick={() => setBrowsing({ state: userState ?? 'CA', geoid: null })}>Browse other races ›</button>
  }

  // 3) No location → example Los Angeles ballot
  const laRaces = racesInCounty(races, LA_COUNTY_GEOID);
  return (
    <div className="pb-12">
      <div className="max-w-2xl mx-auto"><AddressFilterInput onBrowse={setBrowsing} /></div>
      <div style={{ /* eyebrow */ }}>New here? Here's a Los Angeles ballot</div>
      <p className="rr-example-note">Enter your address above to see your own races.</p>
      <div className="race-grid">
        {laRaces.map((r, i) => renderCard(r, i))}
      </div>
      <button className="ev-button-secondary mt-4" onClick={() => setBrowsing({ state: 'CA', geoid: null })}>
        Browse all races ›
      </button>
    </div>
  );
```

Import `RaceBrowse`, `racesInCounty`, and `CountyIndex`. Remove the old collapsible "Other states"
rendering path (now dead — `groupRaces` no longer returns `other`).

- [ ] **Step 3: Typecheck + run the app**

Run: `npm run build`
Expected: no type errors. Then start the dev server and verify: initial load shows the LA example
ballot (not the wall); "Browse all races" enters the state list; an address search shows Your Ballot.

- [ ] **Step 4: Commit**

```bash
git add src/components/RaceHub.tsx src/index.css
git commit -m "feat: ballot-first RaceHub (LA example, located ballot, browse)"
```

### Task 13: Wire smart search into the address input

**Files:**
- Modify: `src/components/AddressFilterInput.tsx`

- [ ] **Step 1: Accept an `onBrowse` prop and route non-address submits**

Extend the props:

```typescript
interface AddressFilterInputProps {
  onFilterApplied?: (politicianIds: string[]) => void;
  onBrowse?: (target: { state: string; geoid: string | null }) => void;
  counties?: Record<string, string>;
}
```

In the manual-submit handler (`onClick`/`Enter` on the free-text value), before running the address
search, classify the text and route:

```typescript
  const handleSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return;
    if (onBrowse) {
      const route = await resolveQueryRoute(value, counties ?? {});
      if (route.kind === 'browse-state') { onBrowse({ state: route.state, geoid: null }); return; }
      if (route.kind === 'browse-county') { onBrowse({ state: route.state, geoid: route.geoid }); return; }
    }
    await handlePlaceSelected(value);   // address path
  }, [handlePlaceSelected, onBrowse, counties]);
```

Point the Search button and Enter key at `handleSubmit` instead of `handlePlaceSelected`. The Google
Places autocomplete `onPlaceSelected` still calls `handlePlaceSelected` directly (a picked address is
unambiguous). Import `resolveQueryRoute` from `../lib/localitySearch`.

RaceHub passes `counties` and `onBrowse` when it renders `AddressFilterInput`.

- [ ] **Step 2: Typecheck + manual check**

Run: `npm run build`
Expected: no type errors. Then verify: typing "Utah" + Search opens the Utah county list; typing
"Los Angeles County" opens that county's races; a real address still builds Your Ballot.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddressFilterInput.tsx src/components/RaceHub.tsx
git commit -m "feat: smart search routes place names into browse"
```

---

## Phase 7 — Integration & cleanup

### Task 14: Full test + live smoke

- [ ] **Step 1: Backend tests**

Run: `cd ../ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts src/lib/informBoundaryService.test.ts`
Expected: PASS.

- [ ] **Step 2: Frontend tests + build**

Run: `npx vitest run && npm run build`
Expected: PASS, clean build.

- [ ] **Step 3: Live smoke (dev server against real API)**

Verify against the running app:
- Fresh load (no saved address) → LA example ballot, ~2–4 cards, no wall.
- Address in an Alpha Community → Your Ballot, no empties.
- "Browse all races" → state list → county list → county races (statewide + overlapping districts,
  ordered local→state→federal).
- Search "Utah" → Utah county list; search a covered county name → that county's races.

- [ ] **Step 4: Commit any fixes, then open the PR**

```bash
git add -A && git commit -m "test: ballot-first picker integration fixes"
```

PR description must note the Phase 0 G5200 geometry outcome and that the change is one workstream
spanning read-rank + ev-accounts.

---

## Self-Review Notes

- **Spec coverage:** default LA ballot (Task 12) · address→Your Ballot (Tasks 9, 12) · browse
  State→County→races (Tasks 7–8, 11) · smart search (Tasks 10, 13) · empties hidden everywhere
  (Tasks 7, 9) · render-on-demand (Task 11 renders only active level; Task 12 renders only the
  active ballot) · backend G5200 (Task 3) · statewide→all counties (Task 4) · county names (Tasks 2,
  5) · genuine overlap (Task 3, via existing `ST_Area` guard) · essentials isolation (no shared
  function modified). Backend geometry risk gated by Task 0.
- **Type consistency:** `{ races, counties }` return shape (Tasks 5, 6); `CountyIndex` (Task 6) used
  by `RaceBrowse` and `AddressFilterInput`; `racesInCounty`/`statesWithCounts`/`countiesForState`
  signatures consistent across Tasks 7, 8, 11; `QueryRoute` kinds (`browse-state`/`browse-county`)
  consistent across Tasks 10, 13.
