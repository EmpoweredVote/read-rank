# Landing Page & Race Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update landing page hero copy and overhaul the race card with bigger text, a new layout structure, full state name, exact election date, split title/district, and no arrow or Local pill.

**Architecture:** Pure frontend changes across four files (`RaceCard.tsx`, `index.css`, `RaceHub.tsx`, `Landing.tsx`) plus a new `stateNames.ts` utility. The `RaceSummary` type gains an optional `districtLabel` field the backend will eventually populate; the frontend renders it when present and gracefully shows nothing when absent. CSS class names are reused where possible — new classes are additive.

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library, CSS custom properties

---

## File map

| File | Change |
|---|---|
| `src/utils/stateNames.ts` | NEW — state abbr → full name lookup + `getStateName()` |
| `src/utils/__tests__/stateNames.test.ts` | NEW — unit tests for `getStateName` |
| `src/data/api.ts` | Add `districtLabel?: string \| null` to `RaceSummary` |
| `src/data/mockData.ts` | Add `districtLabel: null` to `mockRaceSummary` |
| `src/components/RaceCard.tsx` | Full overhaul — new layout, new props, new date format |
| `src/components/__tests__/RaceCard.test.tsx` | Update all assertions to match new design |
| `src/index.css` | Overhaul `.race-grid` + `.race-card-v2` CSS block |
| `src/components/RaceHub.tsx` | Pass `districtLabel`, remove `place`/`isLocal`/`usesRcv` props |
| `src/components/__tests__/RaceHub.test.tsx` | Update scope/date assertions |
| `src/components/Landing.tsx` | New hero headline + subtext |
| `src/components/__tests__/Landing.test.tsx` | Update heading assertion |

---

## Task 1: stateNames utility

**Files:**
- Create: `src/utils/stateNames.ts`
- Create: `src/utils/__tests__/stateNames.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/stateNames.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getStateName } from '../stateNames';

describe('getStateName', () => {
  it('returns the full name for a known abbreviation', () => {
    expect(getStateName('IN')).toBe('Indiana');
    expect(getStateName('CA')).toBe('California');
    expect(getStateName('DC')).toBe('Washington, D.C.');
  });

  it('is case-insensitive', () => {
    expect(getStateName('in')).toBe('Indiana');
    expect(getStateName('Ca')).toBe('California');
  });

  it('returns null for an unknown abbreviation', () => {
    expect(getStateName('XX')).toBeNull();
  });

  it('returns null for null or undefined', () => {
    expect(getStateName(null)).toBeNull();
    expect(getStateName(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/__tests__/stateNames.test.ts
```

Expected: FAIL — `Cannot find module '../stateNames'`

- [ ] **Step 3: Create the utility**

Create `src/utils/stateNames.ts`:

```ts
const STATE_NAMES: Record<string, string> = {
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
  DC: 'Washington, D.C.',
};

export function getStateName(abbr: string | null | undefined): string | null {
  if (!abbr) return null;
  return STATE_NAMES[abbr.toUpperCase()] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/__tests__/stateNames.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/utils/stateNames.ts src/utils/__tests__/stateNames.test.ts
git commit -m "feat: add getStateName utility for state abbreviation lookup"
```

---

## Task 2: Extend RaceSummary with districtLabel

**Files:**
- Modify: `src/data/api.ts`
- Modify: `src/data/mockData.ts`

- [ ] **Step 1: Add districtLabel to RaceSummary**

In `src/data/api.ts`, add the new optional field to the `RaceSummary` interface after the `rankableTopicCount` field:

```ts
export interface RaceSummary {
  raceId: string;
  positionName: string;
  electionName: string;
  electionDate: string | null;
  state: string | null;
  jurisdictionLevel: string | null;
  candidateCount: number;
  topicCount: number;
  isLocal: boolean;
  usesRcv?: boolean;
  tier?: RaceTier;
  scope?: RaceScope;
  boundaryRef?: BoundaryRef | null;
  frameRef?: BoundaryRef | null;
  quoteCount?: number;
  rankableTopicCount?: number;
  /** Backend-formatted district label, e.g. "District 1", "9th District". Null for statewide races. */
  districtLabel?: string | null;
}
```

- [ ] **Step 2: Add districtLabel to mockRaceSummary**

In `src/data/mockData.ts`, add `districtLabel: null` to `mockRaceSummary` (Governor is statewide):

```ts
export const mockRaceSummary: RaceSummary = {
  raceId: MOCK_RACE_ID,
  positionName: 'Governor',
  electionName: '2024 Indiana Governor (demo)',
  electionDate: '2024-11-05',
  state: 'IN',
  jurisdictionLevel: 'state',
  candidateCount: Object.keys(MOCK_IDENTITIES).length,
  topicCount: MOCK_TOPICS.length,
  isLocal: false,
  usesRcv: false,
  districtLabel: null,
};
```

- [ ] **Step 3: Run full test suite to verify no regressions**

```bash
npx vitest run
```

Expected: All tests pass — the new field is optional so existing code is unaffected.

- [ ] **Step 4: Commit**

```bash
git add src/data/api.ts src/data/mockData.ts
git commit -m "feat(api): add optional districtLabel field to RaceSummary"
```

---

## Task 3: Update RaceCard tests to match new design

**Files:**
- Modify: `src/components/__tests__/RaceCard.test.tsx`

These tests are written first so they fail against the current component and then pass once the component is updated in Task 4.

- [ ] **Step 1: Replace the test file**

Replace the entire contents of `src/components/__tests__/RaceCard.test.tsx`:

```tsx
// src/components/__tests__/RaceCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaceCard } from '../RaceCard';

const props = {
  office: 'Governor', tier: 'state' as const, scope: 'statewide' as const,
  state: 'IN', electionDate: '2024-11-05', boundaryRef: null, frameRef: null,
  candidateCount: 4, topicCount: 3, estMinutes: 2, onSelect: () => {},
};

describe('RaceCard', () => {
  it('shows office title, full state name, exact date and metadata', () => {
    render(<RaceCard {...props} />);
    const card = screen.getByRole('button', { name: /open governor race/i });
    expect(card).toHaveTextContent('Governor');
    expect(card).toHaveTextContent('Indiana');
    expect(card).toHaveTextContent('Nov 5, 2024');
    expect(screen.getByText('Candidates').closest('.race-card-v2__mi')).toHaveTextContent('4');
    expect(screen.getByText('Topics').closest('.race-card-v2__mi')).toHaveTextContent('3');
    expect(screen.getByText('Time').closest('.race-card-v2__mi')).toHaveTextContent('~2 min');
  });

  it('shows the districtLabel when provided', () => {
    render(<RaceCard {...props} districtLabel="District 1" />);
    expect(screen.getByText('District 1')).toBeInTheDocument();
  });

  it('renders no district element when districtLabel is absent', () => {
    render(<RaceCard {...props} />);
    expect(screen.queryByText(/district/i)).not.toBeInTheDocument();
  });

  it('fires onSelect on click', async () => {
    const onSelect = vi.fn();
    render(<RaceCard {...props} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /open governor race/i }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('does not show a Local pill', () => {
    render(<RaceCard {...props} />);
    expect(screen.queryByText('Local')).not.toBeInTheDocument();
  });

  it('does not render an arrow', () => {
    const { container } = render(<RaceCard {...props} />);
    expect(container.querySelector('.race-card-v2__arrow')).not.toBeInTheDocument();
  });

  it('falls back gracefully when state is null', () => {
    render(<RaceCard {...props} state={null} />);
    const card = screen.getByRole('button', { name: /open governor race/i });
    // Date still shows, no state text
    expect(card).toHaveTextContent('Nov 5, 2024');
    expect(card).not.toHaveTextContent('Indiana');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/__tests__/RaceCard.test.tsx
```

Expected: Multiple FAIL — tests referencing `Indiana`, `Nov 5, 2024`, `District 1`, and arrow absence will fail against the current component.

---

## Task 4: Overhaul RaceCard component

**Files:**
- Modify: `src/components/RaceCard.tsx`

- [ ] **Step 1: Replace RaceCard.tsx**

Replace the entire contents of `src/components/RaceCard.tsx`:

```tsx
// src/components/RaceCard.tsx
import { Motif } from './motif/Motif';
import type { Tier, Scope } from '../utils/raceTier';
import type { BoundaryRef } from '../data/api';
import { getStateName } from '../utils/stateNames';

function formatElectionDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface RaceCardProps {
  office: string;
  tier: Tier;
  scope: Scope;
  state: string | null;
  districtLabel?: string | null;
  electionDate?: string | null;
  boundaryRef?: BoundaryRef | null;
  frameRef?: BoundaryRef | null;
  candidateCount: number;
  topicCount: number;
  estMinutes: number;
  progress?: 'none' | 'in-progress' | 'completed';
  disabled?: boolean;
  onSelect: () => void;
}

export function RaceCard(props: RaceCardProps) {
  const {
    office, tier, scope, state, districtLabel, electionDate, boundaryRef, frameRef,
    candidateCount, topicCount, estMinutes,
    progress = 'none', disabled, onSelect,
  } = props;

  const stateName = getStateName(state);
  const date = formatElectionDate(electionDate);
  const scopeText = [stateName, date].filter(Boolean).join(' · ');

  function activate() { if (!disabled) onSelect(); }

  return (
    <button
      type="button"
      className={`race-card-v2 race-card-v2--${progress}`}
      aria-label={`Open ${office} race`}
      disabled={disabled}
      onClick={activate}
    >
      <div className="race-card-v2__top">
        <div className="race-card-v2__motif" aria-hidden="true">
          <Motif tier={tier} scope={scope} boundaryRef={boundaryRef ?? null} frameRef={frameRef ?? null} />
        </div>
        <div className="race-card-v2__body">
          {scopeText && (
            <div className="race-card-v2__scope">{scopeText}</div>
          )}
          <div className="race-card-v2__title">{office}</div>
          {districtLabel && (
            <div className="race-card-v2__district">{districtLabel}</div>
          )}
        </div>
      </div>
      <div className="race-card-v2__meta">
        <div className="race-card-v2__mi"><span className="k">Candidates</span><span className="v">{candidateCount}</span></div>
        <div className="race-card-v2__mi"><span className="k">Topics</span><span className="v">{topicCount}</span></div>
        <div className="race-card-v2__mi"><span className="k">Time</span><span className="v">~{estMinutes} min</span></div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Run RaceCard tests**

```bash
npx vitest run src/components/__tests__/RaceCard.test.tsx
```

Expected: PASS — all 7 tests

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: RaceHub and Landing tests will fail (they still assert old scope text and date format) — that's expected and fixed in Tasks 6 and 7. All other tests should pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/RaceCard.tsx src/components/__tests__/RaceCard.test.tsx
git commit -m "feat(RaceCard): new layout — state name, exact date, district line, remove arrow and pill"
```

---

## Task 5: Overhaul race-card CSS

**Files:**
- Modify: `src/index.css`

This task replaces the entire `.race-grid` + `.race-card-v2` CSS block. No unit tests cover CSS — verify visually with `npm run dev`.

- [ ] **Step 1: Replace the race-grid block**

In `src/index.css`, find this block (around line 1868):

```css
.race-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}
@media (min-width: 640px) { .race-grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1024px) { .race-grid { grid-template-columns: 1fr 1fr 1fr; } }
```

Replace with:

```css
.race-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.875rem;
}
```

The `minmax(280px, 1fr)` prevents cells from shrinking below 280px — wide enough that "~4 min" never clips or wraps. The two breakpoint overrides are removed; `auto-fill` handles reflowing automatically.

- [ ] **Step 2: Replace the race-card-v2 CSS block**

Find the block starting at `.race-card-v2 {` and ending just before `/* Landing hero steps */` (the `@media (prefers-reduced-motion)` block is part of this section — replace it too). Replace the entire block with:

```css
.race-card-v2 {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: 0.875rem;
  padding: 0.875rem;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.2s ease;
}
.race-card-v2:hover {
  border-color: var(--text-link);
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.10), 0 1px 3px rgba(0, 0, 0, 0.05);
}
.race-card-v2:focus-visible {
  outline: 2px solid var(--text-link);
  outline-offset: 2px;
}
.race-card-v2:disabled { cursor: wait; opacity: 0.6; }

/* Top section: motif + body side-by-side */
.race-card-v2__top {
  display: flex; gap: 0.75rem; align-items: flex-start; flex: 1;
}
.race-card-v2__motif {
  flex-shrink: 0;
  width: 60px; height: 60px;
  border-radius: 0.5rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border-subtle);
  color: var(--text-link);
  overflow: hidden;
}
.race-card-v2__body {
  flex: 1; min-width: 0;
}
.race-card-v2__scope {
  font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--text-tertiary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.race-card-v2__title {
  font-weight: 800; font-size: 1.1875rem; letter-spacing: -0.02em; line-height: 1.1;
  color: var(--text-heading); margin-top: 0.25rem;
}
.race-card-v2__district {
  font-size: 1.0625rem; font-weight: 700; letter-spacing: -0.015em; line-height: 1.1;
  color: var(--text-secondary); margin-top: 0.1875rem;
}

/* Meta row — pinned to bottom, centered columns */
.race-card-v2__meta {
  display: flex; border-top: 1px solid var(--border-subtle);
  margin-top: 0.625rem; padding-top: 0.5rem; flex-shrink: 0;
}
.race-card-v2__mi {
  flex: 1; display: flex; flex-direction: column; gap: 0.125rem;
  align-items: center; text-align: center;
}
.race-card-v2__mi + .race-card-v2__mi { border-left: 1px solid var(--border-subtle); }
.race-card-v2__mi .k {
  font-size: 0.625rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text-tertiary); white-space: nowrap;
}
.race-card-v2__mi .v {
  font-size: 1.0625rem; font-weight: 800; color: var(--text-heading); white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .race-card-v2 { transition: border-color 0.15s; }
  .race-card-v2:hover { transform: none; }
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: Same results as after Task 4 — only RaceHub and Landing tests failing.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style(RaceCard): flex layout, larger text, centered meta, auto-fill grid"
```

---

## Task 6: Thread districtLabel through RaceHub + update RaceHub test

**Files:**
- Modify: `src/components/RaceHub.tsx`
- Modify: `src/components/__tests__/RaceHub.test.tsx`

- [ ] **Step 1: Update the RaceHub test assertions**

In `src/components/__tests__/RaceHub.test.tsx`, find the test `'renders the race as a RaceCard with tier, geography and metadata'`. Replace these three lines:

```tsx
expect(await screen.findByText('Governor', undefined, { timeout: 3000 })).toBeInTheDocument();
expect(screen.getByText(/state\s*·\s*statewide/i)).toBeInTheDocument();
expect(screen.getByText(/nov 2024/i)).toBeInTheDocument();
```

With:

```tsx
const card = await screen.findByRole('button', { name: /open governor race/i });
expect(card).toHaveTextContent('Governor');
expect(card).toHaveTextContent('Indiana');
expect(card).toHaveTextContent('Nov 5, 2024');
```

The `findByRole` waits for the async race load just as `findByText` did — no separate wait needed.

- [ ] **Step 2: Run the RaceHub test to verify it fails**

```bash
npx vitest run src/components/__tests__/RaceHub.test.tsx
```

Expected: FAIL — `Indiana` and `Nov 5, 2024` not yet in DOM (RaceHub still passes old props).

- [ ] **Step 3: Update RaceHub to pass districtLabel and remove unused props**

In `src/components/RaceHub.tsx`, find the `<RaceCard ... />` JSX block and replace it with:

```tsx
<RaceCard
  key={race.raceId}
  office={race.positionName}
  tier={tier}
  scope={scope}
  state={race.state}
  districtLabel={race.districtLabel ?? null}
  electionDate={race.electionDate}
  boundaryRef={race.boundaryRef ?? null}
  frameRef={race.frameRef ?? null}
  candidateCount={race.candidateCount}
  topicCount={race.rankableTopicCount ?? race.topicCount}
  estMinutes={estMinutes}
  progress={progress}
  disabled={starting !== null}
  onSelect={() => handleSelect(race.raceId)}
/>
```

(Removed: `place`, `isLocal`, `usesRcv` — no longer in `RaceCardProps`.)

- [ ] **Step 4: Run RaceHub tests**

```bash
npx vitest run src/components/__tests__/RaceHub.test.tsx
```

Expected: PASS

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: Only Landing test still failing.

- [ ] **Step 6: Commit**

```bash
git add src/components/RaceHub.tsx src/components/__tests__/RaceHub.test.tsx
git commit -m "feat(RaceHub): pass districtLabel to RaceCard, remove unused place/isLocal/usesRcv props"
```

---

## Task 7: Update Landing copy + test

**Files:**
- Modify: `src/components/Landing.tsx`
- Modify: `src/components/__tests__/Landing.test.tsx`

- [ ] **Step 1: Update the Landing test**

In `src/components/__tests__/Landing.test.tsx`, update the heading assertion:

Replace:
```tsx
expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/read what candidates say/i);
```

With:
```tsx
expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/read candidates blind/i);
```

The warm-up button test (`/try a 30-second warm-up/i`) matches the new copy unchanged — no update needed there.

- [ ] **Step 2: Run Landing test to verify it fails**

```bash
npx vitest run src/components/__tests__/Landing.test.tsx
```

Expected: FAIL — heading still reads "Read what candidates say..."

- [ ] **Step 3: Update Landing.tsx copy**

In `src/components/Landing.tsx`, replace the `<h1>` content (lines 29–35):

```tsx
<h1
  className="text-4xl sm:text-5xl font-extrabold leading-tight"
  style={{ color: 'var(--text-heading)', fontFamily: "'Manrope', sans-serif" }}
>
  Read candidates blind,
  <br />
  <span style={{ color: 'var(--text-link)' }}>rank by what they said.</span>
</h1>
```

Replace the subtext `<p>` content (lines 39–42):

```tsx
<p
  className="text-base sm:text-lg leading-relaxed mt-5 max-w-xl"
  style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
>
  Read real quotes from real candidates — without knowing who said it.
  Form your own view. Then find out who you actually align with.
</p>
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Landing.tsx src/components/__tests__/Landing.test.tsx
git commit -m "copy(Landing): new hero headline and subtext"
```

---

## Done

All seven tasks complete. The frontend is fully deployed-safe: cards render without a district line until the backend sends `districtLabel`, at which point the district appears automatically with no further frontend changes needed.

**Backend follow-up (separate repo — ev-accounts):** Add `districtLabel` to the race summary API response and strip the district from `positionName`. See the spec at `docs/superpowers/specs/2026-06-11-landing-card-redesign.md` §3 for the contract details.
