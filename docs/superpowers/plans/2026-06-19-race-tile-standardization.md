# Race Tile Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize how every Read & Rank race tile represents a race (office / seat / jurisdiction), give tiles four honest progress states, and add an in-app breadcrumb to leave a race mid-activity.

**Architecture:** The `ev-accounts` backend stops string-mangling `position_name` and instead derives clean `office` + `seat` fields server-side from `district_type` (ADR-0001). The read-rank frontend renders those fields verbatim, computes a four-state progress model against the live scorable-topic count, and shows a two-level breadcrumb during the task phases that reuses the existing `goToHub()` action.

**Tech Stack:** TypeScript, Node/Postgres (ev-accounts backend), React + Zustand + Vitest + Testing Library (read-rank frontend).

**Scope note:** This plan covers the four items scoped in grilling — backend derivation, the `RaceSummary` contract, four-state hub tiles, and the breadcrumb. The reveal/summary "show all scorable topics with not-yet-ranked + re-entry from the summary" is a deliberate **follow-up plan**, not included here. See [CONTEXT.md](../../../CONTEXT.md) and [docs/adr/0001-backend-owns-race-label-derivation.md](../../adr/0001-backend-owns-race-label-derivation.md).

**Cross-repo:** Tasks 1–2 are in `~/Documents/GitHub/ev-accounts` (backend). Tasks 3–9 are in `~/Documents/GitHub/read-rank` (this repo). The frontend tasks depend on the backend contract from Task 2, but compile independently because the field rename is mechanical. Ship the backend first.

---

## File Structure

**Backend (`ev-accounts`):**
- `backend/src/lib/readrankService.ts` — add a pure `deriveOfficeSeat()` + `normalizeSeat()` helpers; change the `getPlayableRaces` SQL to select raw `position_name` + `district_type`; change `RaceSummary` (`positionName`→`office`, `districtLabel`→`seat`); call the new helper in the row map.
- `backend/src/lib/readrankService.test.ts` — unit tests for `deriveOfficeSeat`; update `getPlayableRaces` row mocks/assertions.

**Frontend (`read-rank`):**
- `src/data/api.ts` — `RaceSummary`: `positionName`→`office`, `districtLabel`→`seat`.
- `src/data/mockData.ts` — `mockRaceSummary` field rename.
- `src/utils/raceTier.ts` — `DeriveInput.positionName`→`office`.
- `src/components/RaceCard.tsx` — prop `districtLabel`→`seat`; CSS class `__district`→`__seat`; render the progress status row.
- `src/components/RaceHub.tsx` — pass `office`/`seat`; compute four-state progress; pass race meta to `selectRace`.
- `src/utils/raceProgressState.ts` (new) — pure four-state derivation.
- `src/index.css` — four progress-state styles, status row, breadcrumb styles.
- `src/store/useReadRankStore.ts` — `RaceProgress` gains `office`/`seat`/`state`; `selectRace` accepts a meta arg.
- `src/components/RaceBreadcrumb.tsx` (new) — the breadcrumb.
- `src/components/PhaseContainer.tsx` — render the breadcrumb in task phases.
- Tests: `src/utils/__tests__/raceProgressState.test.ts` (new), `src/components/__tests__/RaceCard.test.tsx`, `src/components/__tests__/RaceBreadcrumb.test.tsx` (new).

---

## Phase 1 — Backend derivation (ev-accounts)

### Task 1: Pure `deriveOfficeSeat()` + `normalizeSeat()` helpers

**Files:**
- Modify: `~/Documents/GitHub/ev-accounts/backend/src/lib/readrankService.ts`
- Test: `~/Documents/GitHub/ev-accounts/backend/src/lib/readrankService.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `readrankService.test.ts` (after the existing `deriveTierScope` describe block). Also add `deriveOfficeSeat` to the import on line 20: `import { getPlayableRaces, deriveTierScope, deriveOfficeSeat } from './readrankService.js';`

```ts
describe('deriveOfficeSeat', () => {
  it('legislative STATE_LOWER: office from district_type, seat extracted from chamber label', () => {
    expect(deriveOfficeSeat({
      positionName: 'Utah State House District 21', districtLabel: 'State House District 21',
      districtType: 'STATE_LOWER', state: 'UT',
    })).toEqual({ office: 'State Representative', seat: 'District 21' });
  });

  it('legislative STATE_UPPER -> State Senator', () => {
    expect(deriveOfficeSeat({
      positionName: 'Utah State Senate District 13', districtLabel: 'State Senate District 13',
      districtType: 'STATE_UPPER', state: 'UT',
    })).toEqual({ office: 'State Senator', seat: 'District 13' });
  });

  it('legislative NATIONAL_LOWER: word-ordinal + federal abbreviation', () => {
    expect(deriveOfficeSeat({
      positionName: 'United States Representative, Ninth District', districtLabel: 'Ninth District',
      districtType: 'NATIONAL_LOWER', state: 'IN',
    })).toEqual({ office: 'US Representative', seat: 'District 9' });
  });

  it('legislative: strips leading zeros from the seat', () => {
    expect(deriveOfficeSeat({
      positionName: 'State Representative, District 061', districtLabel: 'District 061',
      districtType: 'STATE_LOWER', state: 'IN',
    })).toEqual({ office: 'State Representative', seat: 'District 61' });
  });

  it('legislative: recovers seat from positionName when districtLabel is null', () => {
    expect(deriveOfficeSeat({
      positionName: 'Utah State House District 44', districtLabel: null,
      districtType: 'STATE_LOWER', state: 'UT',
    })).toEqual({ office: 'State Representative', seat: 'District 44' });
  });

  it('county executive: keeps place-qualified office, takes seat from label', () => {
    expect(deriveOfficeSeat({
      positionName: 'Monroe County Commissioner', districtLabel: 'District 1',
      districtType: 'COUNTY', state: 'IN',
    })).toEqual({ office: 'Monroe County Commissioner', seat: 'District 1' });
  });

  it('city executive: keeps the place in the office, no seat', () => {
    expect(deriveOfficeSeat({
      positionName: 'Los Angeles Mayor', districtLabel: null,
      districtType: 'LOCAL_EXEC', state: 'CA',
    })).toEqual({ office: 'Los Angeles Mayor', seat: null });
  });

  it('statewide exec: drops a redundant state abbreviation prefix', () => {
    expect(deriveOfficeSeat({
      positionName: 'CA Governor', districtLabel: null, districtType: null, state: 'CA',
    })).toEqual({ office: 'Governor', seat: null });
  });

  it('statewide exec: drops a redundant full-state-name prefix', () => {
    expect(deriveOfficeSeat({
      positionName: 'California Governor', districtLabel: null, districtType: null, state: 'CA',
    })).toEqual({ office: 'Governor', seat: null });
  });

  it('at-large seat normalizes spelling', () => {
    expect(deriveOfficeSeat({
      positionName: 'City Council', districtLabel: 'At Large', districtType: 'LOCAL', state: 'IN',
    })).toEqual({ office: 'City Council', seat: 'At-Large' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Documents/GitHub/ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts -t deriveOfficeSeat`
Expected: FAIL — `deriveOfficeSeat is not a function` / not exported.

- [ ] **Step 3: Implement the helpers**

In `readrankService.ts`, add this block immediately after the `USPS_TO_FIPS` map (after line 132, before `deriveTierScope`):

```ts
/** USPS → full state name, for stripping a redundant state prefix off statewide-exec offices. */
const USPS_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

/** Chamber-neutral office title for each legislative district_type (ADR-0001). */
const LEGISLATIVE_OFFICE: Record<string, string> = {
  STATE_LOWER: 'State Representative',
  STATE_UPPER: 'State Senator',
  NATIONAL_LOWER: 'US Representative',
  NATIONAL_UPPER: 'US Senator',
};

const WORD_TO_NUM: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8,
  ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14,
  fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20,
};

/** Normalize a district/seat phrase to its canonical seat token, or null.
 *  "State House District 21" -> "District 21"; "Ninth District" -> "District 9";
 *  "District 060" -> "District 60"; "At Large" -> "At-Large"; "" / null -> null. */
export function normalizeSeat(raw: string | null): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;
  s = s.replace(
    /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth)\s+district\b/i,
    (_m, w: string) => `District ${WORD_TO_NUM[w.toLowerCase()]}`,
  );
  s = s.replace(/\bdistrict\s+0*(\d+)/i, 'District $1');
  s = s.replace(/\bat[\s-]?large\b/i, 'At-Large');
  const m = s.match(/\b(District\s+\d+|At-Large|Ward\s+\d+|Division\s+\d+|Seat\s+\d+)\b/i);
  return m ? m[1].replace(/\s+/g, ' ') : s;
}

/** Derive a clean office + seat for a race tile (ADR-0001). */
export function deriveOfficeSeat(input: {
  positionName: string;
  districtLabel: string | null;
  districtType: string | null;
  state: string | null;
}): { office: string; seat: string | null } {
  const dt = (input.districtType ?? '').toUpperCase();

  if (LEGISLATIVE_OFFICE[dt]) {
    return {
      office: LEGISLATIVE_OFFICE[dt],
      seat: normalizeSeat(input.districtLabel) ?? normalizeSeat(input.positionName),
    };
  }

  // Executive / local / unknown: keep the place-qualified name, split any trailing
  // comma district, and drop a redundant statewide state prefix.
  let office = (input.positionName ?? '').trim()
    .replace(/United States Representative/gi, 'US Representative')
    .replace(/United States Senator/gi, 'US Senator');

  let seat: string | null = null;
  const comma = office.indexOf(', ');
  if (comma > 0) {
    const norm = normalizeSeat(office.slice(comma + 2));
    if (norm && /^(District|At-Large|Ward|Division|Seat)/i.test(norm)) {
      seat = norm;
      office = office.slice(0, comma);
    }
  }

  if (input.state) {
    const full = USPS_TO_NAME[input.state.toUpperCase()];
    const alt = full ? `|${full}` : '';
    office = office.replace(new RegExp(`^(${input.state}${alt})\\s+`, 'i'), '');
  }

  return { office: office.trim(), seat: seat ?? normalizeSeat(input.districtLabel) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/Documents/GitHub/ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts -t deriveOfficeSeat`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/GitHub/ev-accounts && git add backend/src/lib/readrankService.ts backend/src/lib/readrankService.test.ts
git commit -m "feat(readrank): pure deriveOfficeSeat/normalizeSeat helpers for clean race labels"
```

---

### Task 2: Wire `deriveOfficeSeat` into `getPlayableRaces` and change the contract

**Files:**
- Modify: `~/Documents/GitHub/ev-accounts/backend/src/lib/readrankService.ts:41-58` (RaceSummary), the SQL `SELECT`/`GROUP BY`, and the row `.map`.
- Test: `~/Documents/GitHub/ev-accounts/backend/src/lib/readrankService.test.ts`

- [ ] **Step 1: Update the existing `getPlayableRaces` tests to the new contract**

In `readrankService.test.ts`, the three `getPlayableRaces` row mocks currently send `clean_position_name` and `district_label`. Change each mock row to send `position_name` + `district_type` instead, and update assertions from `positionName`/`districtLabel` to `office`/`seat`. For the first test (lines 53-70) replace the row + assertion with:

```ts
    mockQuery.mockResolvedValueOnce({ rows: [{
      race_id: 'r1', position_name: 'Mayor', district_label: null, district_type: 'LOCAL_EXEC',
      election_id: 'e1', election_name: 'LA 2026', election_date: new Date('2026-11-03T00:00:00Z'),
      jurisdiction_level: 'county', state: 'CA',
      boundary_layer: 'G4110', boundary_geoid: '0644000',
      candidate_count: '3', topic_count: '5', quote_count: '24', rankable_topic_count: '4',
      politician_ids: ['p1', 'p2', 'p3'],
    }] });

    const [race] = await getPlayableRaces();
    expect(race).toMatchObject({
      raceId: 'r1', office: 'Mayor', seat: null, state: 'CA',
      candidateCount: 3, topicCount: 5, quoteCount: 24, rankableTopicCount: 4,
      tier: 'local', scope: 'citywide',
      boundaryRef: { layer: 'G4110', geoid: '0644000' },
    });
```

For the remaining `getPlayableRaces` row mocks in the file, rename `clean_position_name:` to `position_name:` and add `district_type: null,` to each row object. (They assert only tier/scope/boundary, which are unaffected.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Documents/GitHub/ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts -t getPlayableRaces`
Expected: FAIL — received object has `positionName`/`districtLabel`, not `office`/`seat`.

- [ ] **Step 3: Change the `RaceSummary` interface**

In `readrankService.ts`, replace lines 43-44:

```ts
  raceId: string;
  positionName: string;
  districtLabel: string | null;
```

with:

```ts
  raceId: string;
  office: string;
  seat: string | null;
```

- [ ] **Step 4: Change the SQL to select raw fields**

In the `getPlayableRaces` query, replace the two `CASE … END AS clean_position_name,` / `CASE … END AS district_label,` expressions (the block spanning the original lines 170-182) with:

```sql
           r.position_name,
           d.label AS district_label,
           d.district_type,
```

Update the row type generic at the top of `pool.query<{…}>` — replace `clean_position_name: string; district_label: string | null;` with:

```ts
    position_name: string; district_label: string | null; district_type: string | null;
```

In the `GROUP BY` clause, add `d.district_type` (it groups `r.position_name` and `d.label` already), so it reads:

```sql
    GROUP BY r.id, r.position_name, e.id, e.name, e.election_date, e.jurisdiction_level, e.state,
             d.mtfcc, d.label, d.district_type, COALESCE(d.geo_id, d.tiger_geoid), frame.frame_layer, frame.frame_geoid
```

- [ ] **Step 5: Update the row `.map`**

In the `rows.map((r) => { … })`, change the `deriveTierScope` call to pass raw `position_name` and add a `deriveOfficeSeat` call at the top of the callback body:

```ts
  return rows.map((r) => {
    const { office, seat } = deriveOfficeSeat({
      positionName: r.position_name,
      districtLabel: r.district_label,
      districtType: r.district_type,
      state: r.state,
    });
    const { tier, scope } = deriveTierScope({
      jurisdiction_level: r.jurisdiction_level,
      position_name: r.position_name,
      mtfcc: r.boundary_layer,
    });
```

In the returned object, replace:

```ts
      positionName: r.clean_position_name,
      districtLabel: r.district_label,
```

with:

```ts
      office,
      seat,
```

- [ ] **Step 6: Run the full service test file**

Run: `cd ~/Documents/GitHub/ev-accounts/backend && npx vitest run src/lib/readrankService.test.ts`
Expected: PASS (all deriveTierScope, deriveOfficeSeat, getPlayableRaces tests).

- [ ] **Step 7: Typecheck the backend**

Run: `cd ~/Documents/GitHub/ev-accounts/backend && npx tsc --noEmit`
Expected: no errors. (If `routes/readrank.ts` references `.positionName`/`.districtLabel` on a `RaceSummary`, fix those references to `.office`/`.seat` — grep first: `grep -rn "positionName\|districtLabel" src/routes/readrank.ts`.)

- [ ] **Step 8: Commit**

```bash
cd ~/Documents/GitHub/ev-accounts && git add backend/src/lib/readrankService.ts backend/src/lib/readrankService.test.ts
git commit -m "feat(readrank): races API emits clean office/seat (ADR-0001), drops lossy position-name strip"
```

---

## Phase 2 — Frontend label display (read-rank)

### Task 3: Rename `RaceSummary` contract + render office/seat on the card

**Files:**
- Modify: `src/data/api.ts:13-36`, `src/data/mockData.ts:127-145`, `src/utils/raceTier.ts:6-37`, `src/components/RaceCard.tsx`, `src/components/RaceHub.tsx:127-144`, `src/index.css:1927-1934`
- Test: `src/components/__tests__/RaceCard.test.tsx`

- [ ] **Step 1: Update the RaceCard tests to the new prop name**

In `src/components/__tests__/RaceCard.test.tsx`, replace the two `districtLabel` tests (lines 35-43) with `seat`:

```tsx
  it('renders seat when provided', () => {
    render(<RaceCard {...baseProps} seat="District 1" />);
    expect(screen.getByText('District 1')).toBeInTheDocument();
  });

  it('renders no seat element when seat is absent', () => {
    render(<RaceCard {...baseProps} seat={null} />);
    expect(screen.queryByText(/District/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/__tests__/RaceCard.test.tsx`
Expected: FAIL — `seat` is not a known prop / element not found.

- [ ] **Step 3: Rename the prop and class in RaceCard**

In `src/components/RaceCard.tsx`: in `RaceCardProps` replace `districtLabel?: string | null;` with `seat?: string | null;`. In the destructure (line 34) replace `districtLabel` with `seat`. Replace the render block (lines 62-64):

```tsx
          {seat && (
            <div className="race-card-v2__seat">{seat}</div>
          )}
```

- [ ] **Step 4: Rename the CSS class**

In `src/index.css`, rename the selector `.race-card-v2__district` (line 1931) to `.race-card-v2__seat` (keep its rules unchanged).

- [ ] **Step 5: Update the RaceSummary type**

In `src/data/api.ts`, in `RaceSummary` replace `positionName: string;` (line 13) with `office: string;` and replace the `districtLabel?: string | null;` line (line 35) with `seat?: string | null;`.

- [ ] **Step 6: Update raceTier input**

In `src/utils/raceTier.ts`, in `DeriveInput` rename `positionName: string;` to `office: string;`. In `deriveTierScope` change `deriveScope(race.positionName, tier)` to `deriveScope(race.office, tier)`. In `deriveTier` change `race.positionName.toLowerCase()` to `race.office.toLowerCase()`.

- [ ] **Step 7: Update RaceHub usage**

In `src/components/RaceHub.tsx`, in the `<RaceCard>` props (lines 129-133) change `office={race.positionName}` to `office={race.office}` and `districtLabel={race.districtLabel ?? null}` to `seat={race.seat ?? null}`.

- [ ] **Step 8: Update mock data**

In `src/data/mockData.ts`, in `mockRaceSummary` (line 129) change `positionName: 'Governor',` to `office: 'Governor',` and change `districtLabel: null,` (line 138) to `seat: null,`. At line 144 and line 243 change `mockRaceSummary.positionName` to `mockRaceSummary.office`.

- [ ] **Step 9: Run RaceCard + RaceHub tests**

Run: `npx vitest run src/components/__tests__/RaceCard.test.tsx src/components/__tests__/RaceHub.test.tsx`
Expected: PASS (RaceHub still asserts "Governor"/"Indiana"/"Nov 5, 2024" via the mock).

- [ ] **Step 10: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Grep for stragglers: `grep -rn "\.positionName\|districtLabel" src` — `RacePayload.positionName` and `RevealResult.positionName` are intentionally kept; the only matches should be those race-detail/reveal usages, not `RaceSummary`.)

- [ ] **Step 11: Commit**

```bash
git add src/data/api.ts src/data/mockData.ts src/utils/raceTier.ts src/components/RaceCard.tsx src/components/RaceHub.tsx src/index.css src/components/__tests__/RaceCard.test.tsx
git commit -m "feat(hub): render standardized office/seat from backend (ADR-0001)"
```

---

## Phase 3 — Four-state progress on the hub

### Task 4: Pure four-state progress derivation

**Files:**
- Create: `src/utils/raceProgressState.ts`
- Test: `src/utils/__tests__/raceProgressState.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { deriveProgressState } from '../raceProgressState';
import type { RaceProgress, TopicProgress } from '../../store/useReadRankStore';

function topic(over: Partial<TopicProgress>): TopicProgress {
  return {
    topicKey: 't', title: 'T', question: 'Q',
    quotesToEvaluate: [], currentIndex: 0, disagreed: [], agreed: [], ...over,
  };
}
function q(id: string, token: string) {
  return { id, text: 'x', candidateToken: token, topicKey: 't' };
}
function race(over: Partial<RaceProgress>): RaceProgress {
  return {
    raceId: 'r', positionName: 'P', topics: {}, topicOrder: [],
    currentTopicKey: null, phase: 'evaluation', completed: false, ...over,
  };
}

describe('deriveProgressState', () => {
  it('not-started when there is no stored progress', () => {
    expect(deriveProgressState(undefined, 4).state).toBe('not-started');
  });

  it('in-progress when started but not revealed', () => {
    const p = race({ topics: { t: topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }] }) } });
    expect(deriveProgressState(p, 4).state).toBe('in-progress');
  });

  it('counts a scorable topic as done only when every quote is judged', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    const info = deriveProgressState(race({ completed: true, topics: { t: done } }), 1);
    expect(info.doneTopics).toBe(1);
  });

  it('does not count a single-candidate topic as a scorable done topic', () => {
    const oneVoice = topic({ quotesToEvaluate: [q('1','a'), q('2','a')], disagreed: [q('1','a'), q('2','a')] });
    expect(deriveProgressState(race({ completed: true, topics: { t: oneVoice } }), 0).doneTopics).toBe(0);
  });

  it('complete when revealed and every live scorable topic is done', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    expect(deriveProgressState(race({ completed: true, topics: { t: done } }), 1).state).toBe('complete');
  });

  it('partial when revealed but a live scorable topic remains undone', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    // Live count is 2 but only one topic was finished -> partial (skipped or newly added).
    expect(deriveProgressState(race({ completed: true, topics: { t: done } }), 2).state).toBe('partial');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/utils/__tests__/raceProgressState.test.ts`
Expected: FAIL — cannot find module `../raceProgressState`.

- [ ] **Step 3: Implement the derivation**

Create `src/utils/raceProgressState.ts`:

```ts
import type { RaceProgress, TopicProgress } from '../store/useReadRankStore';

export type ProgressState = 'not-started' | 'in-progress' | 'partial' | 'complete';

export interface ProgressInfo {
  state: ProgressState;
  /** Scorable topics the user has fully judged. */
  doneTopics: number;
  /** Live scorable-topic count for the race (RaceSummary.rankableTopicCount). */
  liveScorableTopics: number;
  /** Scorable topics among the user's selection (for the "Continue · N of M" label). */
  selectedScorableTopics: number;
}

/** A topic is scorable when at least two distinct candidates have a quote in it. */
function isScorable(t: TopicProgress): boolean {
  const tokens = new Set(t.quotesToEvaluate.map((qn) => qn.candidateToken));
  return tokens.size > 1;
}

/** A topic is done when every quote in it has been judged (agree or disagree). */
function isDone(t: TopicProgress): boolean {
  const total = t.quotesToEvaluate.length;
  return total > 0 && t.agreed.length + t.disagreed.length >= total;
}

export function deriveProgressState(
  progress: RaceProgress | undefined,
  rankableTopicCount: number,
): ProgressInfo {
  const live = Math.max(rankableTopicCount, 0);
  if (!progress) {
    return { state: 'not-started', doneTopics: 0, liveScorableTopics: live, selectedScorableTopics: live };
  }

  const topics = Object.values(progress.topics);
  const scorable = topics.filter(isScorable);
  const doneTopics = scorable.filter(isDone).length;

  const selectedKeys = progress.selectedTopicKeys ?? progress.topicOrder;
  const selectedScorableTopics = scorable.filter((t) => selectedKeys.includes(t.topicKey)).length;

  if (!progress.completed) {
    return { state: 'in-progress', doneTopics, liveScorableTopics: live, selectedScorableTopics };
  }
  const state: ProgressState = doneTopics >= live ? 'complete' : 'partial';
  return { state, doneTopics, liveScorableTopics: live, selectedScorableTopics };
}
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/utils/__tests__/raceProgressState.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/raceProgressState.ts src/utils/__tests__/raceProgressState.test.ts
git commit -m "feat(hub): pure four-state race progress derivation against live scorable count"
```

---

### Task 5: Wire four states + status label into the hub and card

**Files:**
- Modify: `src/components/RaceHub.tsx:113-144`, `src/components/RaceCard.tsx`, `src/index.css`
- Test: `src/components/__tests__/RaceCard.test.tsx`

- [ ] **Step 1: Write a failing card test for the status row**

Add to `src/components/__tests__/RaceCard.test.tsx`:

```tsx
  it('renders a progress status label when provided', () => {
    render(<RaceCard {...baseProps} progress="partial" progressLabel="Ranked 2 of 4" />);
    expect(screen.getByText('Ranked 2 of 4')).toBeInTheDocument();
  });

  it('renders no status row when progress is not-started', () => {
    render(<RaceCard {...baseProps} progress="not-started" />);
    expect(screen.queryByTestId('race-card-status')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/__tests__/RaceCard.test.tsx`
Expected: FAIL — `progress="partial"` not assignable / status element absent.

- [ ] **Step 3: Update RaceCard prop + render the status row**

In `src/components/RaceCard.tsx`: change the `progress` prop type and add `progressLabel`. Replace the `progress?: 'none' | 'in-progress' | 'completed';` line with:

```tsx
  progress?: 'not-started' | 'in-progress' | 'partial' | 'complete';
  progressLabel?: string | null;
```

Update the destructure default (line 36) from `progress = 'none',` to `progress = 'not-started',` and add `progressLabel,`. Add `progressLabel` to the destructured props list. After the `race-card-v2__meta` div (after line 71), add the status row:

```tsx
      {progressLabel && (
        <div className="race-card-v2__status" data-testid="race-card-status">
          <span className="race-card-v2__status-dot" aria-hidden="true" />
          <span className="race-card-v2__status-text">{progressLabel}</span>
        </div>
      )}
```

- [ ] **Step 4: Compute state + label in RaceHub**

In `src/components/RaceHub.tsx`, add the import:

```tsx
import { deriveProgressState, type ProgressState } from '../utils/raceProgressState';
```

Replace the progress derivation block (lines 114-119) with:

```tsx
          const progressState = raceProgress[race.raceId];
          const info = deriveProgressState(progressState, race.rankableTopicCount ?? race.topicCount);
          const progress: ProgressState = info.state;
          let progressLabel: string | null = null;
          if (info.state === 'in-progress') {
            progressLabel = info.doneTopics >= info.selectedScorableTopics && info.selectedScorableTopics > 0
              ? 'Reveal your ballot'
              : `Continue · ${info.doneTopics} of ${info.selectedScorableTopics} topics`;
          } else if (info.state === 'partial') {
            progressLabel = `Ranked ${info.doneTopics} of ${info.liveScorableTopics}`;
          } else if (info.state === 'complete') {
            progressLabel = 'Completed';
          }
```

Then pass the two props to `<RaceCard>` (replace `progress={progress}` on line 140, keep everything else):

```tsx
              progress={progress}
              progressLabel={progressLabel}
```

- [ ] **Step 5: Add the four-state + status CSS**

In `src/index.css`, after the `.race-card-v2__meta .v` rule (after line 1951), add:

```css
.race-card-v2__status {
  display: flex; align-items: center; gap: 0.4rem;
  margin-top: 0.5rem; flex-shrink: 0;
  font-size: 0.75rem; font-weight: 700; letter-spacing: 0.01em;
}
.race-card-v2__status-dot {
  width: 0.5rem; height: 0.5rem; border-radius: 9999px; flex-shrink: 0;
  background: var(--text-tertiary);
}
.race-card-v2--in-progress .race-card-v2__status { color: var(--text-link); }
.race-card-v2--in-progress .race-card-v2__status-dot { background: var(--text-link); }
.race-card-v2--partial .race-card-v2__status { color: var(--text-secondary); }
.race-card-v2--partial .race-card-v2__status-dot {
  background: transparent;
  border: 2px solid var(--text-link);
  box-sizing: border-box;
}
.race-card-v2--complete { opacity: 0.78; }
.race-card-v2--complete .race-card-v2__status { color: var(--text-tertiary); }
.race-card-v2--complete .race-card-v2__status-dot {
  background: var(--text-tertiary);
}
.race-card-v2--complete:hover { opacity: 1; }
```

(The `race-card-v2--${progress}` class is already stamped by RaceCard; these rules now target the four new state names.)

- [ ] **Step 6: Run card tests + typecheck**

Run: `npx vitest run src/components/__tests__/RaceCard.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/RaceCard.tsx src/components/RaceHub.tsx src/index.css src/components/__tests__/RaceCard.test.tsx
git commit -m "feat(hub): four progress states (not-started/in-progress/partial/complete) on race tiles"
```

---

## Phase 4 — Breadcrumb + exit mid-activity

### Task 6: Store clean race meta on `RaceProgress`

**Files:**
- Modify: `src/store/useReadRankStore.ts` (`RaceProgress` interface, `selectRace` signature + impl, `buildRaceProgress`), `src/components/RaceHub.tsx:38-50,142`

- [ ] **Step 1: Add optional meta fields to `RaceProgress`**

In `src/store/useReadRankStore.ts`, in the `RaceProgress` interface (after `positionName: string;`, line 34) add:

```ts
  /** Clean display fields captured from the RaceSummary at selection time (ADR-0001).
   *  Optional: races started before this field existed fall back to positionName. */
  office?: string;
  seat?: string | null;
  state?: string | null;
```

- [ ] **Step 2: Thread meta through `selectRace`**

Change the `selectRace` type in the state interface (line 109) to:

```ts
  selectRace: (payload: RacePayload, meta?: { office: string; seat: string | null; state: string | null }) => void;
```

Update `buildRaceProgress` signature (line 144) and its return object to accept and store meta:

```ts
function buildRaceProgress(payload: RacePayload, meta?: { office: string; seat: string | null; state: string | null }): RaceProgress {
```

In `buildRaceProgress`'s returned object (near line 166 where `completed: false,` is set) add:

```ts
    office: meta?.office,
    seat: meta?.seat ?? null,
    state: meta?.state ?? null,
```

In the `selectRace` implementation (lines 222-236), pass meta into `buildRaceProgress` and merge it onto an existing race so re-entry refreshes the labels:

```ts
      selectRace: (payload, meta) => {
        const state = get();
        const existing = state.raceProgress[payload.raceId];
        const race = existing ? { ...existing, ...(meta ?? {}) } : buildRaceProgress(payload, meta);
        const nextPhase: Phase = existing ? race.phase : 'issue-selection';
        const selectedTopicKeys = race.selectedTopicKeys ?? race.topicOrder;
        set({
          currentRaceId: payload.raceId,
          phase: nextPhase,
          raceProgress: {
            ...state.raceProgress,
            [payload.raceId]: { ...race, selectedTopicKeys },
          },
        });
      },
```

- [ ] **Step 3: Pass meta from the hub**

In `src/components/RaceHub.tsx`, change `handleSelect` to accept the race summary and pass meta to `selectRace`. Replace the `handleSelect` callback (lines 38-50) with:

```tsx
  const handleSelect = useCallback(async (race: RaceSummary) => {
    setStarting(race.raceId);
    try {
      const payload = await fetchRaceQuotes(race.raceId);
      const shuffled = {
        ...payload,
        topics: payload.topics.map((t) => ({ ...t, quotes: shuffleArray(t.quotes) })),
      };
      selectRace(shuffled, { office: race.office, seat: race.seat ?? null, state: race.state });
    } finally {
      setStarting(null);
    }
  }, [selectRace]);
```

Update the call site (line 142): change `onSelect={() => handleSelect(race.raceId)}` to `onSelect={() => handleSelect(race)}`.

- [ ] **Step 4: Typecheck + run store-dependent tests**

Run: `npx tsc --noEmit && npx vitest run src/components/__tests__/RaceHub.test.tsx`
Expected: no type errors; RaceHub test passes.

- [ ] **Step 5: Commit**

```bash
git add src/store/useReadRankStore.ts src/components/RaceHub.tsx
git commit -m "feat(store): capture clean office/seat/state on RaceProgress for in-race chrome"
```

---

### Task 7: The `RaceBreadcrumb` component

**Files:**
- Create: `src/components/RaceBreadcrumb.tsx`
- Test: `src/components/__tests__/RaceBreadcrumb.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/RaceBreadcrumb.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaceBreadcrumb } from '../RaceBreadcrumb';
import { useReadRankStore } from '../../store/useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

function seedRace(over: Record<string, unknown>) {
  useReadRankStore.setState((s) => ({
    currentRaceId: 'r1',
    phase: 'evaluation',
    raceProgress: {
      ...s.raceProgress,
      r1: {
        raceId: 'r1', positionName: 'fallback', topics: {}, topicOrder: [],
        currentTopicKey: null, phase: 'evaluation', completed: false, ...over,
      },
    },
  }));
}

describe('RaceBreadcrumb', () => {
  it('shows "All races" and the office, seat and state of the current race', () => {
    seedRace({ office: 'US Representative', seat: 'District 9', state: 'IN' });
    render(<RaceBreadcrumb />);
    expect(screen.getByRole('button', { name: /all races/i })).toBeInTheDocument();
    const crumb = screen.getByText(/US Representative/);
    expect(crumb).toHaveTextContent('US Representative, District 9 · Indiana');
  });

  it('omits the seat segment when there is no seat', () => {
    seedRace({ office: 'Governor', seat: null, state: 'CA' });
    render(<RaceBreadcrumb />);
    expect(screen.getByText(/Governor/)).toHaveTextContent('Governor · California');
  });

  it('falls back to positionName when office is absent', () => {
    seedRace({ office: undefined, positionName: 'Mayor', state: null });
    render(<RaceBreadcrumb />);
    expect(screen.getByText('Mayor')).toBeInTheDocument();
  });

  it('returns to the hub when "All races" is clicked', async () => {
    seedRace({ office: 'Governor', seat: null, state: 'CA' });
    render(<RaceBreadcrumb />);
    await userEvent.click(screen.getByRole('button', { name: /all races/i }));
    expect(useReadRankStore.getState().phase).toBe('hub');
    expect(useReadRankStore.getState().currentRaceId).toBeNull();
  });

  it('renders nothing when no race is active', () => {
    const { container } = render(<RaceBreadcrumb />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/__tests__/RaceBreadcrumb.test.tsx`
Expected: FAIL — cannot find module `../RaceBreadcrumb`.

- [ ] **Step 3: Implement the component**

Create `src/components/RaceBreadcrumb.tsx`:

```tsx
import React from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { getStateName } from '../utils/stateNames';

/** Two-level breadcrumb shown during the task phases. "All races" is the exit;
 *  the current-race crumb is non-interactive (aria-current). Format:
 *  `{office}, {seat} · {state}` — office-first so it survives truncation. */
export const RaceBreadcrumb: React.FC = () => {
  const { currentRaceId, raceProgress, goToHub } = useReadRankStore();
  if (!currentRaceId) return null;
  const race = raceProgress[currentRaceId];
  if (!race) return null;

  const office = race.office ?? race.positionName;
  const officeSeat = race.seat ? `${office}, ${race.seat}` : office;
  const stateName = getStateName(race.state ?? null);
  const label = stateName ? `${officeSeat} · ${stateName}` : officeSeat;

  return (
    <nav className="rr-breadcrumb" aria-label="Breadcrumb">
      <button type="button" className="rr-breadcrumb__back" onClick={goToHub}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span>All races</span>
      </button>
      <span className="rr-breadcrumb__sep" aria-hidden="true">/</span>
      <span className="rr-breadcrumb__current" aria-current="page" title={label}>{label}</span>
    </nav>
  );
};
```

- [ ] **Step 4: Run to verify passing**

Run: `npx vitest run src/components/__tests__/RaceBreadcrumb.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Add breadcrumb CSS**

In `src/index.css`, after the `.race-card-v2__status*` rules added in Task 5, add:

```css
.rr-breadcrumb {
  display: flex; align-items: center; gap: 0.5rem;
  max-width: 64rem; margin: 0 auto 1rem; padding: 0 0.25rem;
  font-family: 'Manrope', sans-serif; font-size: 0.8125rem; min-width: 0;
}
.rr-breadcrumb__back {
  display: inline-flex; align-items: center; gap: 0.3rem;
  min-height: 44px; padding: 0.25rem 0.25rem; flex-shrink: 0;
  background: none; border: none; cursor: pointer;
  font-family: inherit; font-size: inherit; font-weight: 700;
  color: var(--text-link);
}
.rr-breadcrumb__back:hover { text-decoration: underline; }
.rr-breadcrumb__back:focus-visible { outline: 2px solid var(--text-link); outline-offset: 2px; border-radius: 0.25rem; }
.rr-breadcrumb__sep { color: var(--text-tertiary); flex-shrink: 0; }
.rr-breadcrumb__current {
  color: var(--text-secondary); font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/RaceBreadcrumb.tsx src/components/__tests__/RaceBreadcrumb.test.tsx src/index.css
git commit -m "feat(nav): RaceBreadcrumb with All-races exit and office/seat · state context"
```

---

### Task 8: Render the breadcrumb in the task phases

**Files:**
- Modify: `src/components/PhaseContainer.tsx:1-13,94-111`

- [ ] **Step 1: Import the breadcrumb**

In `src/components/PhaseContainer.tsx`, add after the other component imports (after line 13):

```tsx
import { RaceBreadcrumb } from './RaceBreadcrumb';
```

- [ ] **Step 2: Render it in the task phases**

In the returned JSX, add the breadcrumb above the `AnimatePresence` (between the `VerdictsPromotionBanner` block and `<AnimatePresence>`, around line 105):

```tsx
      {(phase === 'issue-selection' || phase === 'evaluation' || phase === 'results') && currentRaceId && (
        <RaceBreadcrumb />
      )}
```

(`phase` and `currentRaceId` are already destructured from the store on line 35.)

- [ ] **Step 3: Verify the app builds and tests pass**

Run: `npx tsc --noEmit && npx vitest run`
Expected: full suite PASS, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PhaseContainer.tsx
git commit -m "feat(nav): show RaceBreadcrumb during issue-selection, evaluation and results"
```

---

### Task 9: Manual verification in the browser

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server and verify the tiles**

Use the preview tools (`preview_start`, then `preview_snapshot`/`preview_screenshot`). Confirm against the original screenshot's problem cases:
- Utah State House tiles now read office **"State Representative"** with seat **"District 21"** / **"District 44"** (not "Utah").
- US Rep reads **"US Representative"** + **"District 9"** (not "Ninth District").
- Indiana State Rep reads **"State Representative"** + **"District 61"** (no leading zero).
- `CA Governor` reads **"Governor"**.
- `Los Angeles Mayor`, `Salt Lake County District Attorney`, `Monroe County Commissioner` (+ "District 1") unchanged.

- [ ] **Step 2: Verify progress states**

Start a race, judge one topic, leave via the breadcrumb "All races" → tile shows **in-progress** ("Continue · 1 of N topics"). Finish all selected topics and reveal → tile shows **complete** if all live scorable topics done, else **partial** ("Ranked X of Y").

- [ ] **Step 3: Verify the breadcrumb**

Enter a race → breadcrumb shows `All races / <office>, <seat> · <state>` in issue-selection, evaluation, and results. Click "All races" → returns to the hub; re-enter the same race → resumes at the same quote (progress preserved).

- [ ] **Step 4: Verify reduced-motion + mobile**

`preview_resize` to 375px: breadcrumb current crumb truncates with ellipsis, "All races" stays fully visible and ≥44px tall.

---

## Self-Review

**Spec coverage:**
- Branch A (standardize tiles) → Tasks 1, 2 (backend office/seat), Task 3 (frontend render). ✓
- Branch B (four progress states) → Tasks 4, 5. ✓ (Reveal/summary "all scorable topics + re-entry" explicitly deferred to a follow-up plan, per the grilling scope.)
- Branch C (exit mid-activity) → Tasks 6, 7, 8. ✓
- ADR-0001 two-family rule, chamber-neutral titles, drop statewide prefix → Task 1 helper + tests. ✓
- Live-count partial detection (newly-added topics revert complete→partial) → Task 4 (`deriveProgressState` compares against `rankableTopicCount`). ✓
- Anti-nag: partial is a calm informational dot + "Ranked X of Y", no red/badge → Task 5 CSS. ✓
- Breadcrumb format `office, seat · state`, office-first truncation, non-interactive current crumb, no confirm dialog → Task 7. ✓

**Type consistency:** `RaceSummary.office`/`seat` (api.ts + backend) ↔ RaceCard `office`/`seat` props ↔ `RaceProgress.office`/`seat`/`state` ↔ `selectRace(payload, meta)` ↔ `deriveProgressState(progress, rankableTopicCount): ProgressInfo`. `ProgressState` union ('not-started'|'in-progress'|'partial'|'complete') matches the RaceCard `progress` prop. ✓

**Placeholder scan:** every code step contains complete code and exact commands. No TBD/TODO. ✓
