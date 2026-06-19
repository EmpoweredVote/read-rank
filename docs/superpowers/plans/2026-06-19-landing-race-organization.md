# Landing Race Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the landing-page race picker into relevance bands (Your races → More in {STATE} → Other states) filtered by an Upcoming/Past time chip, derive a resilient "near me" signal from the user's state, and fix the false "No local races" message.

**Architecture:** All bucketing/tiering/grouping/sorting moves into a pure, unit-tested helper `src/utils/raceGrouping.ts`. `RaceHub.tsx` owns only UI state (active time chip, "Other states" collapsed) and renders the sections the helper returns. The user's two-letter state is parsed once in `AddressFilterInput` (via an extracted shared util) and stored on `locationFilter` so `RaceHub` reads it directly.

**Tech Stack:** React 19, TypeScript, Zustand (persisted store), Vitest, framer-motion, Tailwind.

---

## File Structure

- **Create** `src/utils/parseStateFromAddress.ts` — pure: address string → two-letter state or null. Lifted out of `AddressFilterInput`.
- **Create** `src/utils/__tests__/parseStateFromAddress.test.ts`
- **Create** `src/utils/raceGrouping.ts` — pure: `(races, located, userState, timeFilter, today)` → ordered sections + `noExactMatch` flag.
- **Create** `src/utils/__tests__/raceGrouping.test.ts`
- **Modify** `src/store/useReadRankStore.ts` — add `state` to `LocationFilter`.
- **Modify** `src/components/AddressFilterInput.tsx` — import the shared parser; store parsed state on the filter.
- **Modify** `src/components/RaceHub.tsx` — render time chips + relevance bands + collapsible; remove old flat sort and the "No local races" string.
- **Modify** `src/components/Landing.tsx` — remove the "Each one is a preview…" subline.

Background facts confirmed against the codebase (do not re-verify, just rely on them):
- `race.electionDate` is ISO `YYYY-MM-DD` (or null). Lexicographic string compare is valid for date ordering.
- `getStateName(abbr)` exists in `src/utils/stateNames.ts` and maps `'UT' → 'Utah'`, returns null for unknown/null.
- `locationFilter` is persisted by the Zustand `persist` middleware. Adding an optional-in-practice `state` field is backward compatible: old persisted filters deserialize with `state === undefined`, which the code treats as `null`. No `version` bump required.
- Tests run with Vitest: `npx vitest run <path>`.

---

## Task 1: Extract `parseStateFromAddress` into a shared util

**Files:**
- Create: `src/utils/parseStateFromAddress.ts`
- Test: `src/utils/__tests__/parseStateFromAddress.test.ts`
- Modify: `src/components/AddressFilterInput.tsx:9-19` (remove local copy), `src/components/AddressFilterInput.tsx:1-7` (add import)

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/parseStateFromAddress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseStateFromAddress } from '../parseStateFromAddress';

describe('parseStateFromAddress', () => {
  it('reads the state before a 5-digit zip', () => {
    expect(parseStateFromAddress('877 W 1050 N, OREM, UT, 84057')).toBe('UT');
  });

  it('reads the state before a zip+4', () => {
    expect(parseStateFromAddress('123 Main St, Springfield, IL 62704-1234')).toBe('IL');
  });

  it('reads a bare two-letter segment when no zip is present', () => {
    expect(parseStateFromAddress('Somewhere, CA')).toBe('CA');
  });

  it('returns null for empty input', () => {
    expect(parseStateFromAddress('')).toBeNull();
  });

  it('returns null when no state token is found', () => {
    expect(parseStateFromAddress('just a street name')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/parseStateFromAddress.test.ts`
Expected: FAIL — cannot resolve module `../parseStateFromAddress`.

- [ ] **Step 3: Create the util (verbatim port of the existing logic)**

Create `src/utils/parseStateFromAddress.ts`:

```ts
/** Best-effort extraction of a two-letter US state code from a formatted address.
 *  Ported from AddressFilterInput so both the filter and the hub can use it. */
export function parseStateFromAddress(addr: string): string | null {
  if (!addr) return null;
  const m = addr.match(/\b([A-Z]{2})\b\s*\d{5}(?:-\d{4})?/);
  if (m) return m[1];
  const segs = addr.split(',').map((s) => s.trim());
  for (const seg of segs) {
    const sm = seg.match(/^([A-Z]{2})(?:\s+\d{5}.*)?$/);
    if (sm) return sm[1];
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/parseStateFromAddress.test.ts`
Expected: PASS (5 passing).

- [ ] **Step 5: Replace the local copy in AddressFilterInput with the import**

In `src/components/AddressFilterInput.tsx`, delete the local function (lines 9-19):

```ts
function parseStateFromAddress(addr: string): string | null {
  if (!addr) return null;
  const m = addr.match(/\b([A-Z]{2})\b\s*\d{5}(?:-\d{4})?/);
  if (m) return m[1];
  const segs = addr.split(',').map((s) => s.trim());
  for (const seg of segs) {
    const sm = seg.match(/^([A-Z]{2})(?:\s+\d{5}.*)?$/);
    if (sm) return sm[1];
  }
  return null;
}
```

Then add this import alongside the other relative imports near the top (after the `useGooglePlacesAutocomplete` import line):

```ts
import { parseStateFromAddress } from '../utils/parseStateFromAddress';
```

- [ ] **Step 6: Verify the app still type-checks and existing tests pass**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: no TS errors; all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/parseStateFromAddress.ts src/utils/__tests__/parseStateFromAddress.test.ts src/components/AddressFilterInput.tsx
git commit -m "refactor: extract parseStateFromAddress into shared util

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Store parsed `state` on the location filter

**Files:**
- Modify: `src/store/useReadRankStore.ts:73-76` (LocationFilter type)
- Modify: `src/components/AddressFilterInput.tsx:54-56` (setLocationFilter call)

- [ ] **Step 1: Add `state` to the `LocationFilter` type**

In `src/store/useReadRankStore.ts`, change:

```ts
export interface LocationFilter {
  address: string;
  politicianIds: string[];
}
```

to:

```ts
export interface LocationFilter {
  address: string;
  politicianIds: string[];
  /** Two-letter state parsed from the address; null when unparseable. Drives the
   *  same-state ("More in {STATE}") relevance tier on the race hub. */
  state: string | null;
}
```

- [ ] **Step 2: Populate `state` where the filter is set**

In `src/components/AddressFilterInput.tsx`, inside `handlePlaceSelected`, change:

```ts
    if (politicianIds.length > 0) {
      setLocationFilter({ address: formattedAddress, politicianIds });
      writeAddressToContext(formattedAddress, isLoggedIn ? userId : null);
```

to:

```ts
    if (politicianIds.length > 0) {
      setLocationFilter({
        address: formattedAddress,
        politicianIds,
        state: parseStateFromAddress(formattedAddress),
      });
      writeAddressToContext(formattedAddress, isLoggedIn ? userId : null);
```

- [ ] **Step 3: Verify type-check passes**

Run: `npx tsc -b --noEmit`
Expected: no errors. (The persisted-store read in `RaceHub` will use `locationFilter.state` in Task 4; old persisted filters yield `undefined`, handled as `null` there.)

- [ ] **Step 4: Commit**

```bash
git add src/store/useReadRankStore.ts src/components/AddressFilterInput.tsx
git commit -m "feat: capture parsed state on locationFilter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Pure race-grouping helper

**Files:**
- Create: `src/utils/raceGrouping.ts`
- Test: `src/utils/__tests__/raceGrouping.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/raceGrouping.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { groupRaces } from '../raceGrouping';
import type { RaceSummary } from '../../data/api';

const TODAY = '2026-06-19';

// Minimal RaceSummary factory — only the fields groupRaces reads.
function race(partial: Partial<RaceSummary> & { raceId: string }): RaceSummary {
  return {
    office: 'Office',
    electionName: 'Election',
    electionDate: null,
    state: null,
    jurisdictionLevel: null,
    candidateCount: 2,
    topicCount: 1,
    isLocal: false,
    ...partial,
  } as RaceSummary;
}

const utExact = race({ raceId: 'ut-exact', state: 'UT', isLocal: true, electionDate: '2026-06-23' });
const utState = race({ raceId: 'ut-state', state: 'UT', isLocal: false, electionDate: '2026-06-23' });
const caOther = race({ raceId: 'ca-other', state: 'CA', isLocal: false, electionDate: '2026-06-23' });
const inPast = race({ raceId: 'in-past', state: 'IN', isLocal: false, electionDate: '2026-05-05' });

describe('groupRaces — located, upcoming', () => {
  const result = groupRaces({
    races: [utExact, utState, caOther, inPast],
    located: true, userState: 'UT', timeFilter: 'upcoming', today: TODAY,
  });

  it('orders bands: your, state, other', () => {
    expect(result.sections.map((s) => s.kind)).toEqual(['your', 'state', 'other']);
  });

  it('labels the state band with the full state name', () => {
    expect(result.sections.find((s) => s.kind === 'state')?.label).toBe('More in Utah');
  });

  it('marks only "other" collapsible', () => {
    expect(result.sections.find((s) => s.kind === 'other')?.collapsible).toBe(true);
    expect(result.sections.find((s) => s.kind === 'your')?.collapsible).toBe(false);
  });

  it('excludes the all-past Indiana race from upcoming', () => {
    const ids = result.sections.flatMap((s) => s.races.map((r) => r.raceId));
    expect(ids).not.toContain('in-past');
  });

  it('reports an exact match exists', () => {
    expect(result.noExactMatch).toBe(false);
  });
});

describe('groupRaces — located, no exact match (the Orem case)', () => {
  const result = groupRaces({
    races: [utState, caOther], // no isLocal anywhere
    located: true, userState: 'UT', timeFilter: 'upcoming', today: TODAY,
  });

  it('omits the "your" band', () => {
    expect(result.sections.some((s) => s.kind === 'your')).toBe(false);
  });

  it('still surfaces same-state races under the state band', () => {
    expect(result.sections.find((s) => s.kind === 'state')?.races.map((r) => r.raceId)).toEqual(['ut-state']);
  });

  it('flags noExactMatch', () => {
    expect(result.noExactMatch).toBe(true);
  });
});

describe('groupRaces — past filter', () => {
  it('shows only past races, most-recent-first', () => {
    const older = race({ raceId: 'older', state: 'IN', electionDate: '2026-03-01' });
    const result = groupRaces({
      races: [utExact, inPast, older],
      located: true, userState: 'UT', timeFilter: 'past', today: TODAY,
    });
    const ids = result.sections.flatMap((s) => s.races.map((r) => r.raceId));
    expect(ids).toEqual(['in-past', 'older']); // 05-05 before 03-01
  });
});

describe('groupRaces — not located', () => {
  const result = groupRaces({
    races: [utExact, utState, caOther],
    located: false, userState: null, timeFilter: 'upcoming', today: TODAY,
  });

  it('uses state-named sections, no relevance bands', () => {
    expect(result.sections.every((s) => s.kind === 'state-named')).toBe(true);
    expect(result.sections.map((s) => s.label)).toEqual(['California', 'Utah']); // alphabetical
  });

  it('never flags noExactMatch when not located', () => {
    expect(result.noExactMatch).toBe(false);
  });
});

describe('groupRaces — undated and today are upcoming', () => {
  it('treats null and today-dated races as upcoming', () => {
    const undated = race({ raceId: 'undated', state: 'UT', electionDate: null });
    const todayRace = race({ raceId: 'today', state: 'UT', electionDate: TODAY });
    const result = groupRaces({
      races: [undated, todayRace],
      located: false, userState: null, timeFilter: 'upcoming', today: TODAY,
    });
    const ids = result.sections.flatMap((s) => s.races.map((r) => r.raceId));
    expect(ids).toContain('undated');
    expect(ids).toContain('today');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts`
Expected: FAIL — cannot resolve module `../raceGrouping`.

- [ ] **Step 3: Implement the helper**

Create `src/utils/raceGrouping.ts`:

```ts
import type { RaceSummary } from '../data/api';
import { getStateName } from './stateNames';

export type TimeFilter = 'upcoming' | 'past';

export type SectionKind = 'your' | 'state' | 'other' | 'state-named';

export interface RaceSection {
  kind: SectionKind;
  label: string;
  collapsible: boolean;
  races: RaceSummary[];
}

export interface GroupRacesArgs {
  races: RaceSummary[];
  located: boolean;
  /** Two-letter state code, or null when unknown / not located. */
  userState: string | null;
  timeFilter: TimeFilter;
  /** ISO YYYY-MM-DD; injected so grouping is deterministic in tests. */
  today: string;
}

export interface GroupRacesResult {
  sections: RaceSection[];
  /** Located but no race in the full list is an exact-district (isLocal) match.
   *  RaceHub uses this to show the "couldn't pinpoint your districts" note. */
  noExactMatch: boolean;
}

/** Undated races and races dated today or later are "upcoming". */
function isUpcoming(race: RaceSummary, today: string): boolean {
  if (!race.electionDate) return true;
  return race.electionDate >= today;
}

/** Upcoming: soonest first (undated last). Past: most recent first. */
function sortByDate(races: RaceSummary[], timeFilter: TimeFilter): RaceSummary[] {
  return [...races].sort((a, b) => {
    const da = a.electionDate;
    const db = b.electionDate;
    if (timeFilter === 'upcoming') {
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    }
    // past — descending
    return (db ?? '').localeCompare(da ?? '');
  });
}

export function groupRaces(args: GroupRacesArgs): GroupRacesResult {
  const { races, located, userState, timeFilter, today } = args;

  const noExactMatch = located && !races.some((r) => r.isLocal);

  const inBucket = sortByDate(
    races.filter((r) => (timeFilter === 'upcoming') === isUpcoming(r, today)),
    timeFilter,
  );

  if (!located) {
    // Group by state name, alphabetical; null/unknown state → "Other".
    const byState = new Map<string, RaceSummary[]>();
    for (const r of inBucket) {
      const label = getStateName(r.state) ?? 'Other';
      const list = byState.get(label) ?? [];
      list.push(r);
      byState.set(label, list);
    }
    const sections: RaceSection[] = [...byState.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, list]) => ({ kind: 'state-named', label, collapsible: false, races: list }));
    return { sections, noExactMatch: false };
  }

  const your = inBucket.filter((r) => r.isLocal);
  const sameState = inBucket.filter(
    (r) => !r.isLocal && userState != null && r.state === userState,
  );
  const other = inBucket.filter(
    (r) => !r.isLocal && !(userState != null && r.state === userState),
  );

  const sections: RaceSection[] = [];
  if (your.length) {
    sections.push({ kind: 'your', label: 'Your races', collapsible: false, races: your });
  }
  if (sameState.length) {
    const stateName = getStateName(userState) ?? 'your state';
    sections.push({ kind: 'state', label: `More in ${stateName}`, collapsible: false, races: sameState });
  }
  if (other.length) {
    sections.push({ kind: 'other', label: 'Other states', collapsible: true, races: other });
  }

  return { sections, noExactMatch };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/raceGrouping.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/raceGrouping.ts src/utils/__tests__/raceGrouping.test.ts
git commit -m "feat: pure raceGrouping helper for bands + time bucketing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Render bands, time chips, and collapsible in RaceHub

**Files:**
- Modify: `src/components/RaceHub.tsx` (full rewrite of body — keep the existing header block and the per-card render logic)

- [ ] **Step 1: Replace `RaceHub.tsx` with the banded version**

Replace the entire contents of `src/components/RaceHub.tsx` with:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { fetchRaces, fetchRaceQuotes, type RaceSummary } from '../data/api';
import { shuffleArray } from '../utils/matchingAlgorithm';
import { AddressFilterInput } from './AddressFilterInput';
import { RaceCard } from './RaceCard';
import { deriveTierScope } from '../utils/raceTier';
import { estimateMinutes } from '../utils/estimateMinutes';
import { deriveProgressState, progressLabel, type ProgressState } from '../utils/raceProgressState';
import { groupRaces, type TimeFilter } from '../utils/raceGrouping';
import { getStateName } from '../utils/stateNames';

interface RaceHubProps {
  hideHeader?: boolean;
  hideFilter?: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const RaceHub: React.FC<RaceHubProps> = ({ hideHeader = false, hideFilter = false }) => {
  const { raceProgress, selectRace, locationFilter, clearLocationFilter } = useReadRankStore();
  const [races, setRaces] = useState<RaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [otherExpanded, setOtherExpanded] = useState(false);

  const politicianIds = locationFilter?.politicianIds;

  useEffect(() => {
    setLoading(true);
    fetchRaces(politicianIds)
      .then((data) => setRaces(data))
      .finally(() => setLoading(false));
  }, [politicianIds]);

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

  const renderCard = useCallback((race: RaceSummary) => {
    const progressState = raceProgress[race.raceId];
    const info = deriveProgressState(progressState, race.rankableTopicCount);
    const progress: ProgressState = info.state;
    const statusLabel = progressLabel(info);
    const { tier, scope } = deriveTierScope(race);
    const estMinutes = estimateMinutes({
      quoteCount: race.quoteCount,
      candidateCount: race.candidateCount,
      topicCount: race.topicCount,
    });
    return (
      <RaceCard
        key={race.raceId}
        office={race.office}
        tier={tier}
        scope={scope}
        state={race.state}
        seat={race.seat ?? null}
        electionDate={race.electionDate}
        boundaryRef={race.boundaryRef ?? null}
        frameRef={race.frameRef ?? null}
        candidateCount={race.candidateCount}
        topicCount={race.rankableTopicCount ?? race.topicCount}
        estMinutes={estMinutes}
        progress={progress}
        progressLabel={statusLabel}
        disabled={starting !== null}
        onSelect={() => handleSelect(race)}
      />
    );
  }, [raceProgress, starting, handleSelect]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--color-ev-muted-blue)' }} />
        <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Loading races…
        </p>
      </div>
    );
  }

  const located = locationFilter != null;
  const userState = locationFilter?.state ?? null;
  const { sections, noExactMatch } = groupRaces({
    races, located, userState, timeFilter, today: todayISO(),
  });

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.75rem',
    letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-link)',
    margin: '1.25rem 0 0.5rem',
  };

  return (
    <div className="pb-12">
      {!hideHeader && (
        <motion.div
          className="max-w-2xl mx-auto mb-4"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-center" style={{
            fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem',
            color: 'var(--text-heading)', letterSpacing: '-0.02em', margin: '0 0 0.25rem',
          }}>
            <span className="wordmark-underline">Read &amp; Rank</span>
          </h1>
          <p className="text-center" style={{
            fontFamily: "'Manrope', sans-serif", color: 'var(--text-secondary)', fontSize: '0.8125rem',
            lineHeight: 1.5, margin: '0 0 0.625rem',
          }}>
            Pick a race. Read what the candidates said — without knowing who said it — agree or
            disagree, rank your favorites, then reveal your ballot.
          </p>
        </motion.div>
      )}

      <div className="max-w-2xl mx-auto">
        {!hideFilter && <AddressFilterInput />}
      </div>

      {races.length === 0 && (
        <motion.div className="max-w-2xl mx-auto text-center py-12"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            No races available yet
          </p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
            We&apos;re still gathering de-identified candidate quotes. Check back soon.
          </p>
          {located && (
            <button className="ev-button-secondary" onClick={clearLocationFilter}>Clear location filter</button>
          )}
        </motion.div>
      )}

      {races.length > 0 && (
        <div className="max-w-7xl mx-auto">
          {/* Time filter chips */}
          <div className="flex gap-2 justify-center mt-2 mb-1" role="group" aria-label="Filter by election timing">
            {(['upcoming', 'past'] as const).map((tf) => {
              const active = timeFilter === tf;
              return (
                <button
                  key={tf}
                  onClick={() => setTimeFilter(tf)}
                  aria-pressed={active}
                  className="rounded-full px-4 py-1.5 text-sm transition-colors"
                  style={{
                    fontFamily: "'Manrope', sans-serif", fontWeight: active ? 700 : 500,
                    border: active ? 'none' : '1px solid var(--border-subtle)',
                    background: active ? 'var(--color-ev-muted-blue)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {tf === 'upcoming' ? 'Upcoming' : 'Past'}
                </button>
              );
            })}
          </div>

          {/* No-exact-match note (Orem case) — only when there's a same-state band to point at */}
          {noExactMatch && sections.some((s) => s.kind === 'state') && (
            <p className="text-center mb-2" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              We couldn&apos;t pinpoint your exact districts — here are races in {getStateName(userState) ?? 'your state'}.
            </p>
          )}

          {/* Empty bucket */}
          {sections.length === 0 && (
            <p className="text-center py-10" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {timeFilter === 'upcoming' ? 'No upcoming races yet — try Past.' : 'No past races.'}
            </p>
          )}

          {/* Sections */}
          {sections.map((section) => {
            const collapsed = section.collapsible && !otherExpanded;
            return (
              <div key={`${section.kind}-${section.label}`}>
                {section.collapsible ? (
                  <button
                    onClick={() => setOtherExpanded((v) => !v)}
                    aria-expanded={otherExpanded}
                    className="flex items-center gap-2 w-full text-left"
                    style={{ ...sectionLabelStyle, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <span>{otherExpanded ? '▾' : '▸'}</span>
                    <span>{section.label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>· {section.races.length}</span>
                  </button>
                ) : (
                  <div style={sectionLabelStyle}>
                    {section.label}
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}> · {section.races.length}</span>
                  </div>
                )}

                {!collapsed && (
                  <div className="race-grid">
                    {section.races.map(renderCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Type-check and run the full suite**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: no TS errors; all tests PASS.

- [ ] **Step 3: Visually verify in the browser**

Start the dev server (`preview_start`), load the landing page, and confirm:
- "Choose an election" shows Upcoming/Past chips; Upcoming is active by default.
- Without an address: races appear under state-named headers (e.g. "California", "Utah").
- With an Orem, UT address: either a "Your races" band (if backend exact-matches) or the "We couldn't pinpoint your exact districts — here are races in Utah." note above a "More in Utah" band. The old "No local races with data yet" text is gone.
- Clicking "Past" shows past-dated races (Indiana, LA); clicking "Other states" toggles its grid.

Capture a screenshot for the user.

- [ ] **Step 4: Commit**

```bash
git add src/components/RaceHub.tsx
git commit -m "feat(hub): relevance bands + upcoming/past filter + local-match fix

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Remove the picker subline on the landing page

**Files:**
- Modify: `src/components/Landing.tsx:84-89`

- [ ] **Step 1: Delete the subline paragraph**

In `src/components/Landing.tsx`, remove this block (the `<p>` immediately after the "Choose an election" `<h2>`):

```tsx
      <p
        className="text-base mb-8"
        style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
      >
        Each one is a preview of the full Read &amp; Rank experience.
      </p>
```

Then add a bottom margin to the heading so spacing is preserved — change the `<h2>` className from `mb-2` to `mb-6`:

```tsx
      <h2
        className="text-2xl sm:text-3xl font-semibold mb-6"
        style={{ color: 'var(--text-link)', fontFamily: "'Manrope', sans-serif" }}
      >
        Choose an election
      </h2>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Landing.tsx
git commit -m "chore(landing): drop 'preview of the full experience' subline

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] **Step 1: Full suite + type-check + lint**

Run: `npx tsc -b --noEmit && npx vitest run && npm run lint`
Expected: all green.

- [ ] **Step 2: Manual smoke (browser)**

Confirm all four original asks:
1. Subline gone under "Choose an election".
2. Races organized into bands (located) / by-state (not located).
3. Orem address no longer says "No local races"; Utah races surface under "More in Utah".
4. Past-dated races live behind the Past chip, out of the default Upcoming view.
