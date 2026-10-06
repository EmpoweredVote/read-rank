# "Choose your issues" Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `IssueSelection` to Aditi's two-column layout (race chip, progress, blindness note; issue panel with status pills), keeping the app's selection rules and one reading-time rule.

**Architecture:** A pure `formatReadingTime` helper joins `estimateMinutes`. The store's `RaceProgress` captures optional race-chip fields at `selectRace` (geometry stripped). A presentational `RaceChip` renders them with the existing `Motif`. `IssueSelection` is rewritten around these; `PhaseContainer` stops showing the breadcrumb on this phase.

**Tech Stack:** React 19, framer-motion, Zustand (persisted), Tailwind v4 + semantic CSS tokens in `src/index.css`, Vitest + Testing Library + user-event.

**Spec:** `docs/superpowers/specs/2026-10-06-choose-issues-design.md`. Branch `feat/issues-redesign` (spec committed as `eba2dfa`).

## Global Constraints

- Colours only through tokens (`var(--…)`); no hex literals, no Tailwind `dark:` classes in components.
- Type scale: H1 `text-5xl sm:text-6xl font-bold leading-tight` `--text-heading`; lede `text-lg leading-relaxed` `--text-secondary`; eyebrows 12 px / 700 / uppercase / `tracking-widest`.
- Copy, verbatim: H1 "Choose your issues" · Lede "Pick the topics you care about. You'll read what each candidate said, then rank them." · Progress "{done} of {scorable} issues ranked" + "Welcome back" · Note "Quotes are shown without names or parties. You'll find out who said what after you rank." · Panel header "ISSUES IN THIS RACE" + "{scorable} available" · Pills "Not started", "Ranked" (with a check icon), "Not scored" · Second lines "{n} quotes · about {t}", "{n} quotes · already ranked", "{n} quote(s) · one candidate" · Start "Start reading · {q} quotes · about {m} min" (+ arrow icon) · Disabled "Select at least one issue" · "See your ballot" · "See your ballot so far" · Back "All races".
- Reading time: `estimateMinutes` (10 s/quote) for minutes; `formatReadingTime` for per-row text.
- Ranked topics: not selectable, not counted. Single-candidate topics: not selectable.
- Keep analytics event `readrank_issue_selection_confirmed` and its props (estimated_minutes now from `estimateMinutes`).
- Respect reduced motion via `useMotion()`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Change |
|---|---|
| `src/utils/estimateMinutes.ts` | Add `formatReadingTime` |
| `src/store/useReadRankStore.ts` | `RaceMeta` type; new optional `RaceProgress` fields; `buildRaceProgress` + `selectRace` store them (geojson stripped) |
| `src/components/RaceHub.tsx` | `handleSelect` passes the new meta |
| `src/components/RaceChip.tsx` | **New** presentational chip |
| `src/components/IssueSelection.tsx` | Rewrite |
| `src/components/PhaseContainer.tsx` | Breadcrumb only for evaluation/results |
| `src/index.css` | Replace `.issue-selection*`, `.issue-row*`, `.issue-check-tile*`, `.issue-topic-name`, `.issue-quote-count`, `.issue-not-scored-label` rules; add `.rr-chip*`, `.rr-issues*` |
| Tests | `estimateMinutes.test.ts`, `useReadRankStore.test.ts`, new `RaceChip.test.tsx`, `IssueSelection.test.tsx` |

---

### Task 1: `formatReadingTime`

**Files:** Modify `src/utils/estimateMinutes.ts`; Test `src/utils/__tests__/estimateMinutes.test.ts`

**Interfaces:** Produces `export function formatReadingTime(quoteCount: number): string`.

- [ ] **Step 1: Failing tests** — append to `src/utils/__tests__/estimateMinutes.test.ts` (and add `formatReadingTime` to its import):

```ts
describe('formatReadingTime', () => {
  it('shows seconds under a minute, rounded to 10 s', () => {
    expect(formatReadingTime(1)).toBe('about 10 sec');
    expect(formatReadingTime(2)).toBe('about 20 sec');
    expect(formatReadingTime(5)).toBe('about 50 sec');
  });
  it('never shows less than 10 sec', () => {
    expect(formatReadingTime(0)).toBe('about 10 sec');
  });
  it('switches to minutes at 60 s and uses estimateMinutes', () => {
    expect(formatReadingTime(6)).toBe('about 1 min');
    expect(formatReadingTime(30)).toBe('about 5 min');
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/utils/__tests__/estimateMinutes.test.ts` — expect FAIL (not exported).

- [ ] **Step 3: Implement** — append to `src/utils/estimateMinutes.ts`:

```ts
/** Per-issue reading time for the issue list: "about 20 sec" / "about 2 min". */
export function formatReadingTime(quoteCount: number): string {
  const seconds = Math.max(0, quoteCount) * SECONDS_PER_QUOTE;
  if (seconds < 60) return `about ${Math.max(10, Math.round(seconds / 10) * 10)} sec`;
  return `about ${estimateMinutes({ quoteCount, candidateCount: 0, topicCount: 0 })} min`;
}
```

- [ ] **Step 4: Run** the same command — expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/estimateMinutes.ts src/utils/__tests__/estimateMinutes.test.ts
git commit -m "feat(time): formatReadingTime for per-issue reading estimates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Store race-chip fields at selection

**Files:** Modify `src/store/useReadRankStore.ts` (`RaceProgress` ~line 74; `selectRace` type ~line 210; `buildRaceProgress` ~line 256; `selectRace` impl ~line 357), `src/components/RaceHub.tsx` (`handleSelect`, the `selectRace(shuffled, …)` call ~line 125); Test `src/store/__tests__/useReadRankStore.test.ts`

**Interfaces:**
- Produces in `useReadRankStore.ts`:
  ```ts
  export interface RaceMeta {
    office: string;
    seat: string | null;
    state: string | null;
    rankableTopicCount?: number;
    electionDate?: string | null;
    tier?: Tier;
    scope?: Scope;
    boundaryRef?: BoundaryRef | null;
    frameRef?: BoundaryRef | null;
  }
  ```
  and the same five optional fields (`electionDate`, `tier`, `scope`, `boundaryRef`, `frameRef`) on `RaceProgress`. `selectRace: (payload: RacePayload, meta?: RaceMeta) => void`.
- `Tier`/`Scope` come from `../utils/raceTier`; `BoundaryRef` from `../data/api` (type-only imports).

- [ ] **Step 1: Failing test** — append to `src/store/__tests__/useReadRankStore.test.ts` (reuse the file's existing payload fixture if one exists; otherwise define the minimal one below):

```ts
describe('selectRace race-chip meta', () => {
  const p = {
    raceId: 'race-chip', positionName: 'US Representative',
    topics: [{ topicKey: 'k', title: 'Housing', question: 'Q', quotes: [
      { id: 'q1', text: 'a', candidateToken: 't1', topicKey: 'k' },
      { id: 'q2', text: 'b', candidateToken: 't2', topicKey: 'k' },
    ] }],
  };
  const geo = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };

  it('stores chip fields and strips geometry from boundary refs', () => {
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(p as never, {
      office: 'US Representative', seat: 'District 7', state: 'IN', rankableTopicCount: 1,
      electionDate: '2026-11-03', tier: 'federal', scope: 'district',
      boundaryRef: { layer: 'G5200', geoid: '1807', bbox: [0, 0, 1, 1], geojson: geo as never },
      frameRef: { layer: 'G4000', geoid: '18', geojson: geo as never },
    });
    const r = useReadRankStore.getState().raceProgress['race-chip'];
    expect(r.electionDate).toBe('2026-11-03');
    expect(r.tier).toBe('federal');
    expect(r.scope).toBe('district');
    expect(r.boundaryRef).toEqual({ layer: 'G5200', geoid: '1807', bbox: [0, 0, 1, 1] });
    expect(r.frameRef).toEqual({ layer: 'G4000', geoid: '18' });
  });

  it('updates chip fields when an existing race is re-selected with meta', () => {
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(p as never);
    useReadRankStore.getState().selectRace(p as never, {
      office: 'US Representative', seat: null, state: 'IN', electionDate: '2026-11-03',
    });
    expect(useReadRankStore.getState().raceProgress['race-chip'].electionDate).toBe('2026-11-03');
  });
});
```

(`'district'` is a valid `RaceScope`: 'statewide' | 'district' | 'county' | 'citywide'.)

- [ ] **Step 2: Run** `npx vitest run src/store/__tests__/useReadRankStore.test.ts` — expect FAIL / type error.

- [ ] **Step 3: Implement** in `src/store/useReadRankStore.ts`:

1. Type imports at the top: `import type { Tier, Scope } from '../utils/raceTier';` and add `BoundaryRef` to the existing type import from `../data/api` (or add `import type { BoundaryRef } from '../data/api';`).
2. Add the `RaceMeta` interface (Interfaces block above) next to `RaceProgress`, and add to `RaceProgress` after `state?`:
   ```ts
   /** Race-chip display fields captured from the RaceSummary at selection (optional:
    *  cold deep links and older persisted races do not have them). Boundary refs are
    *  stored WITHOUT geojson to keep localStorage small; Motif lazy-loads geometry. */
   electionDate?: string | null;
   tier?: Tier;
   scope?: Scope;
   boundaryRef?: BoundaryRef | null;
   frameRef?: BoundaryRef | null;
   ```
3. Helpers above `buildRaceProgress`:
   ```ts
   function stripGeometry(ref: BoundaryRef | null | undefined): BoundaryRef | null | undefined {
     if (!ref) return ref;
     const { geojson: _geojson, ...rest } = ref;
     return rest;
   }

   function chipFields(meta?: RaceMeta): Partial<RaceProgress> {
     if (!meta) return {};
     const out: Partial<RaceProgress> = {};
     if (meta.electionDate !== undefined) out.electionDate = meta.electionDate;
     if (meta.tier !== undefined) out.tier = meta.tier;
     if (meta.scope !== undefined) out.scope = meta.scope;
     if (meta.boundaryRef !== undefined) out.boundaryRef = stripGeometry(meta.boundaryRef);
     if (meta.frameRef !== undefined) out.frameRef = stripGeometry(meta.frameRef);
     return out;
   }
   ```
4. Change the `meta` parameter type of `buildRaceProgress` and the `selectRace` signature (interface + implementation) to `RaceMeta`.
5. In `buildRaceProgress`'s returned object, add `...chipFields(meta),` after `rankableTopicCount`.
6. In `selectRace`'s `existing` branch, add `...chipFields(meta),` inside the object spread passed to `refreshRaceContent` (next to the office/seat/state spread).

In `src/components/RaceHub.tsx` `handleSelect`, replace the `selectRace(shuffled, { … })` call with:
```tsx
const { tier, scope } = deriveTierScope(race);
selectRace(shuffled, {
  office: race.office, seat: race.seat ?? null, state: race.state,
  rankableTopicCount: race.rankableTopicCount ?? race.topicCount,
  electionDate: race.electionDate ?? null, tier, scope,
  boundaryRef: race.boundaryRef ?? null, frameRef: race.frameRef ?? null,
});
```
(`deriveTierScope` is already imported in RaceHub.)

- [ ] **Step 4: Run** `npx vitest run src/store src/components/__tests__/RaceHub.test.tsx` then `npx tsc -b` — expect PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add src/store/useReadRankStore.ts src/store/__tests__/useReadRankStore.test.ts src/components/RaceHub.tsx
git commit -m "feat(store): keep race-chip fields (date, tier, boundary refs) at selection

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `RaceChip` component

**Files:** Create `src/components/RaceChip.tsx`, `src/components/__tests__/RaceChip.test.tsx`; Modify `src/index.css` (append)

**Interfaces:**
- Consumes: `Motif` from `./motif/Motif` (props `tier`, `scope`, `boundaryRef`, `frameRef` — same as `RaceCard.tsx`); `getStateName` from `../utils/stateNames`.
- Produces: `export function RaceChip(props: RaceChipProps)` where
  ```ts
  export interface RaceChipProps {
    office: string;
    seat?: string | null;
    state?: string | null;
    electionDate?: string | null;
    tier?: Tier;
    scope?: Scope;
    boundaryRef?: BoundaryRef | null;
    frameRef?: BoundaryRef | null;
  }
  ```

- [ ] **Step 1: Failing test** — `src/components/__tests__/RaceChip.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../motif/Motif', () => ({ Motif: () => <div data-testid="motif" /> }));
import { RaceChip } from '../RaceChip';

describe('RaceChip', () => {
  it('shows state, date, office and seat, with the motif', () => {
    render(<RaceChip office="US Representative" seat="District 7" state="IN"
      electionDate="2026-11-03" tier="federal" scope={'district' as never} boundaryRef={null} frameRef={null} />);
    expect(screen.getByText(/indiana · nov 3, 2026/i)).toBeInTheDocument();
    expect(screen.getByText('US Representative')).toBeInTheDocument();
    expect(screen.getByText(/district 7/i)).toBeInTheDocument();
    expect(screen.getByTestId('motif')).toBeInTheDocument();
  });

  it('omits missing pieces and the motif when tier/scope are unknown', () => {
    render(<RaceChip office="Governor" />);
    expect(screen.getByText('Governor')).toBeInTheDocument();
    expect(screen.queryByTestId('motif')).not.toBeInTheDocument();
    expect(screen.queryByText('·')).not.toBeInTheDocument();
  });
});
```



- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/RaceChip.test.tsx` — expect FAIL (module missing).

- [ ] **Step 3: Implement** `src/components/RaceChip.tsx`:

```tsx
import { Motif } from './motif/Motif';
import { getStateName } from '../utils/stateNames';
import type { Tier, Scope } from '../utils/raceTier';
import type { BoundaryRef } from '../data/api';

export interface RaceChipProps {
  office: string;
  seat?: string | null;
  state?: string | null;
  electionDate?: string | null;
  tier?: Tier;
  scope?: Scope;
  boundaryRef?: BoundaryRef | null;
  frameRef?: BoundaryRef | null;
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Race context for the issue screen: motif + "STATE · date" + "office · seat". */
export function RaceChip({ office, seat, state, electionDate, tier, scope, boundaryRef, frameRef }: RaceChipProps) {
  const eyebrow = [getStateName(state ?? null), formatDate(electionDate)].filter(Boolean).join(' · ');
  return (
    <div className="rr-chip">
      {tier && scope && (
        <div className="rr-chip__motif" aria-hidden="true">
          <Motif tier={tier} scope={scope} boundaryRef={boundaryRef ?? null} frameRef={frameRef ?? null} />
        </div>
      )}
      <div className="rr-chip__text">
        {eyebrow && <div className="rr-chip__eyebrow">{eyebrow}</div>}
        <div className="rr-chip__title">
          <strong>{office}</strong>
          {seat && <span className="rr-chip__seat"> · {seat}</span>}
        </div>
      </div>
    </div>
  );
}
```

Note: the test's last assertion uses `queryByText('·')` — with no seat and no eyebrow there is no "·" text node. Keep the " · " inside the seat span as written.

Append to `src/index.css`:
```css
/* Race chip (issue screen) */
.rr-chip {
  display: flex; align-items: center; gap: 1rem;
  background: var(--surface-raised); border-radius: 0.75rem; padding: 1rem 1.25rem;
}
.rr-chip__motif { width: 3rem; height: 3rem; flex-shrink: 0; }
.rr-chip__text { min-width: 0; }
.rr-chip__eyebrow {
  font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--text-tertiary); margin-bottom: 0.125rem;
}
.rr-chip__title { font-size: 1.125rem; color: var(--text-heading); }
.rr-chip__title strong { font-weight: 700; }
.rr-chip__seat { color: var(--text-secondary); font-weight: 400; }
```

- [ ] **Step 4: Run** the test — expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RaceChip.tsx src/components/__tests__/RaceChip.test.tsx src/index.css
git commit -m "feat(issues): RaceChip — motif, state · date, office · seat

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Rewrite `IssueSelection` and drop the breadcrumb on this phase

**Files:** Modify `src/components/IssueSelection.tsx` (rewrite), `src/components/PhaseContainer.tsx` (~line 129), `src/index.css` (replace the issue-selection rules starting at `.issue-selection {` ~line 2374 through the last `.issue-*` rule); Test `src/components/__tests__/IssueSelection.test.tsx`

**Interfaces:**
- Consumes: `RaceChip` (Task 3); `formatReadingTime`, `estimateMinutes` (Task 1); `RaceProgress` chip fields (Task 2); store actions `setSelectedTopics`, `confirmIssueSelection`, `setPhase`, `goToHub`, `getCurrentRaceProgress`; `isTopicDone` from `../utils/raceProgressState`.

- [ ] **Step 1: Update the tests (failing)** in `src/components/__tests__/IssueSelection.test.tsx`:

  - Change `'marks single-candidate topics as NOT SCORED and non-interactive'` to expect `screen.getByText(/not scored/i)` and `screen.getByText(/1 quote · one candidate/i)`.
  - Change `'shows live CTA with total quote count and time estimate'` to: Housing (2) + Environment (3) = 5 quotes → `estimateMinutes` = round(50/60) = 1 → expect `screen.getByRole('button', { name: /start reading · 5 quotes · about 1 min/i })`.
  - Change `'advances to evaluation on CTA click'` to click `{ name: /start reading/i }`.
  - Add, in the first `describe`:

```tsx
  it('shows per-issue reading time and Not started pills', () => {
    render(<IssueSelection />);
    expect(screen.getByText('2 quotes · about 20 sec')).toBeInTheDocument();
    expect(screen.getByText('3 quotes · about 30 sec')).toBeInTheDocument();
    expect(screen.getAllByText(/not started/i)).toHaveLength(2);
  });

  it('shows the heading, lede, blindness note and panel header; no progress on first visit', () => {
    render(<IssueSelection />);
    expect(screen.getByRole('heading', { level: 1, name: 'Choose your issues' })).toBeInTheDocument();
    expect(screen.getByText(/pick the topics you care about/i)).toBeInTheDocument();
    expect(screen.getByText(/quotes are shown without names or parties/i)).toBeInTheDocument();
    expect(screen.getByText(/issues in this race/i)).toBeInTheDocument();
    expect(screen.getByText('2 available')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /see your ballot so far/i })).not.toBeInTheDocument();
  });

  it('"All races" returns to the hub', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /all races/i }));
    expect(useReadRankStore.getState().currentRaceId).toBeNull();
  });

  it('shows the race chip with the office', () => {
    render(<IssueSelection />);
    expect(screen.getByText('Governor')).toBeInTheDocument();
  });
```

  - Add, in the `'IssueSelection re-entry hub'` describe:

```tsx
  it('shows progress, Welcome back and a Ranked pill on re-entry', () => {
    seedReentry();
    render(<IssueSelection />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '2');
    expect(screen.getByText(/issues ranked/i)).toHaveTextContent('1 of 2 issues ranked');
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('2 quotes · already ranked')).toBeInTheDocument();
    expect(screen.getByText(/^ranked$/i)).toBeInTheDocument();
  });

  it('offers "See your ballot so far" next to Start on re-entry and opens the ballot', async () => {
    seedReentry();
    render(<IssueSelection />);
    expect(screen.getByRole('button', { name: /start reading · 2 quotes/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /see your ballot so far/i }));
    expect(useReadRankStore.getState().phase).toBe('results');
  });

  it('does not show "See your ballot so far" when the main button is already See your ballot', () => {
    seedReentry();
    s().setSelectedTopics([]);
    render(<IssueSelection />);
    expect(screen.getByRole('button', { name: /^see your ballot$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /see your ballot so far/i })).not.toBeInTheDocument();
  });
```

  Keep every other existing test unchanged (including the done-row `data-testid="issue-done-k1"` and the no-crash regression).

- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/IssueSelection.test.tsx` — expect the new/changed cases to FAIL.

- [ ] **Step 3: Rewrite `src/components/IssueSelection.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { track } from '../lib/analytics';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import { isTopicDone } from '../utils/raceProgressState';
import { estimateMinutes, formatReadingTime } from '../utils/estimateMinutes';
import { RaceChip } from './RaceChip';

const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IssueSelection: React.FC = () => {
  const { getCurrentRaceProgress, setSelectedTopics, confirmIssueSelection, setPhase, goToHub } = useReadRankStore();
  const race = getCurrentRaceProgress();

  // Hooks must run unconditionally (see the no-crash regression test): race can be
  // null while this view is still exiting after "All races".
  const topicData = useMemo(() => {
    if (!race) return [];
    return race.topicOrder.map((key) => {
      const topic = race.topics[key];
      const uniqueTokens = new Set(topic.quotesToEvaluate.map((q) => q.candidateToken));
      return {
        key, // CARD key (what topicOrder/selectedTopicKeys hold)
        title: topic.title,
        quoteCount: topic.quotesToEvaluate.length,
        isScored: uniqueTokens.size > 1,
        isDone: isTopicDone(topic),
      };
    });
  }, [race]);

  const m = useMotion();
  if (!race) return null;

  const selectedKeys = race.selectedTopicKeys ?? race.topicOrder;
  const scorable = topicData.filter((t) => t.isScored);
  const doneCount = scorable.filter((t) => t.isDone).length;
  const isReentry = doneCount > 0;
  const selectedUndone = scorable.filter((t) => !t.isDone && selectedKeys.includes(t.key));
  const totalSelectedQuotes = selectedUndone.reduce((sum, t) => sum + t.quoteCount, 0);
  const estimatedMinutes = estimateMinutes({ quoteCount: totalSelectedQuotes, candidateCount: 0, topicCount: 0 });
  const showSeeBallotOnly = isReentry && selectedUndone.length === 0;

  const toggleTopic = (key: string) => {
    setSelectedTopics(selectedKeys.includes(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key]);
  };

  const handleConfirm = () => {
    track('readrank_issue_selection_confirmed', {
      race_id: race.raceId,
      topics_selected: selectedUndone.length,
      total_quotes: totalSelectedQuotes,
      estimated_minutes: estimatedMinutes,
    });
    confirmIssueSelection();
  };

  const rowEnter = (i: number) => ({
    ...m.enter({ y: 10 }),
    transition: m.transition(DUR.base, EASE.settle, { delay: i * (STAGGER.gridCell / 1000) }),
  });

  return (
    <div className="rr-issues">
      <div className="rr-issues__intro">
        <button type="button" className="rr-issues__back" onClick={goToHub}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All races
        </button>
        <RaceChip
          office={race.office ?? race.positionName}
          seat={race.seat} state={race.state} electionDate={race.electionDate}
          tier={race.tier} scope={race.scope} boundaryRef={race.boundaryRef} frameRef={race.frameRef}
        />
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mt-8" style={{ color: 'var(--text-heading)' }}>
          Choose your issues
        </h1>
        <p className="text-lg leading-relaxed mt-3 max-w-[48ch]" style={{ color: 'var(--text-secondary)' }}>
          Pick the topics you care about. You'll read what each candidate said, then rank them.
        </p>
        {isReentry && (
          <div className="rr-issues__progress">
            <div className="rr-issues__progress-row">
              <span><strong>{doneCount} of {scorable.length}</strong> issues ranked</span>
              <span>Welcome back</span>
            </div>
            <div className="rr-issues__bar" role="progressbar" aria-label="Issues ranked"
              aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={scorable.length}>
              <div className="rr-issues__bar-fill" style={{ width: `${(doneCount / Math.max(1, scorable.length)) * 100}%` }} />
            </div>
          </div>
        )}
        <p className="rr-issues__note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M1 1l22 22" />
          </svg>
          Quotes are shown without names or parties. You'll find out who said what after you rank.
        </p>
      </div>

      <div className="rr-issues__panel">
        <div className="rr-issues__panel-head">
          <span>Issues in this race</span>
          <span>{scorable.length} available</span>
        </div>
        <div className="rr-issues__list">
          {topicData.map((topic, i) => {
            if (topic.isScored && topic.isDone) {
              return (
                <motion.div key={topic.key} className="rr-issue rr-issue--done" data-testid={`issue-done-${topic.key}`} {...rowEnter(i)}>
                  <span className="rr-issue__tile rr-issue__tile--on"><CheckIcon /></span>
                  <span className="rr-issue__text">
                    <span className="rr-issue__title">{topic.title}</span>
                    <span className="rr-issue__meta">{topic.quoteCount} quotes · already ranked</span>
                  </span>
                  <span className="rr-pill rr-pill--done"><CheckIcon size={10} />Ranked</span>
                </motion.div>
              );
            }
            if (!topic.isScored) {
              return (
                <motion.div key={topic.key} className="rr-issue rr-issue--unscored" {...rowEnter(i)}>
                  <span className="rr-issue__tile" aria-hidden="true" />
                  <span className="rr-issue__text">
                    <span className="rr-issue__title">{topic.title}</span>
                    <span className="rr-issue__meta">
                      {topic.quoteCount} {topic.quoteCount === 1 ? 'quote' : 'quotes'} · one candidate
                    </span>
                  </span>
                  <span className="rr-pill">Not scored</span>
                </motion.div>
              );
            }
            const isSelected = selectedKeys.includes(topic.key);
            return (
              <motion.button key={topic.key} type="button" {...rowEnter(i)}
                className={`rr-issue rr-issue--toggle${isSelected ? ' rr-issue--selected' : ''}`}
                onClick={() => toggleTopic(topic.key)}
                aria-pressed={isSelected}
                aria-label={`${topic.title}, ${topic.quoteCount} quotes`}
              >
                <motion.span className={`rr-issue__tile${isSelected ? ' rr-issue__tile--on' : ''}`} aria-hidden="true"
                  animate={m.reduced ? undefined : { scale: isSelected ? [1, 1.18, 1] : 1 }}
                  transition={m.transition(DUR.fast, EASE.overshoot)}>
                  {isSelected && <CheckIcon />}
                </motion.span>
                <span className="rr-issue__text">
                  <span className="rr-issue__title">{topic.title}</span>
                  <span className="rr-issue__meta">{topic.quoteCount} quotes · {formatReadingTime(topic.quoteCount)}</span>
                </span>
                <span className="rr-pill">Not started</span>
              </motion.button>
            );
          })}
        </div>

        {showSeeBallotOnly ? (
          <button type="button" className="rr-issues__cta" onClick={() => setPhase('results')}>
            See your ballot
          </button>
        ) : (
          <button type="button" className="rr-issues__cta" disabled={selectedUndone.length === 0} onClick={handleConfirm}>
            {selectedUndone.length === 0
              ? 'Select at least one issue'
              : <>Start reading · {totalSelectedQuotes} quotes · about {estimatedMinutes} min
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>}
          </button>
        )}
        {isReentry && !showSeeBallotOnly && (
          <button type="button" className="rr-text-btn rr-issues__ballot-link" onClick={() => setPhase('results')}>
            See your ballot so far
          </button>
        )}
      </div>
    </div>
  );
};
```

Notes:
- `goToHub` exists on the store (used by `RaceBreadcrumb`).
- `topics_selected` in the analytics event is now the count of selected UNDONE scorable topics (the old code counted done ones too; this matches what the user is about to read).

- [ ] **Step 4: PhaseContainer** — in `src/components/PhaseContainer.tsx` change
  `{(phase === 'issue-selection' || phase === 'evaluation' || phase === 'results') && currentRaceId && (`
  to
  `{(phase === 'evaluation' || phase === 'results') && currentRaceId && (`.

- [ ] **Step 5: CSS** — in `src/index.css` delete the old issue-selection block (every rule whose selector starts with `.issue-selection`, `.issue-row`, `.issue-check-tile`, `.issue-topic-name`, `.issue-quote-count`, `.issue-not-scored-label`, including any `.dark` or `@media` variants of them) and append:

```css
/* Choose your issues */
.rr-issues {
  max-width: 1512px; margin: 0 auto; padding: 2rem 1.5rem 4rem;
  display: grid; grid-template-columns: 1fr; gap: 3rem; align-items: start;
}
@media (min-width: 1024px) {
  .rr-issues { grid-template-columns: minmax(0, 1fr) minmax(0, 32rem); gap: 6rem; }
}
.rr-issues__back {
  display: inline-flex; align-items: center; gap: 0.375rem; margin-bottom: 1.5rem;
  font-weight: 700; font-size: 0.9375rem; color: var(--text-link);
  background: none; border: none; padding: 0.25rem 0; cursor: pointer; min-height: 2.75rem;
}
.rr-issues__back:hover { text-decoration: underline; }
.rr-issues__back:focus-visible { outline: 2px solid var(--text-link); outline-offset: 2px; border-radius: 0.25rem; }
.rr-issues__progress { margin-top: 2rem; max-width: 32rem; }
.rr-issues__progress-row {
  display: flex; justify-content: space-between; font-size: 0.875rem;
  color: var(--text-secondary); margin-bottom: 0.5rem;
}
.rr-issues__progress-row strong { color: var(--text-heading); }
.rr-issues__bar { height: 6px; border-radius: 9999px; background: var(--border-subtle); overflow: hidden; }
.rr-issues__bar-fill { height: 100%; background: var(--action-primary); border-radius: 9999px; }
.rr-issues__note {
  display: flex; gap: 0.625rem; align-items: flex-start; max-width: 32rem;
  margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-subtle);
  font-size: 0.875rem; line-height: 1.5; color: var(--text-tertiary);
}
.rr-issues__note svg { flex-shrink: 0; margin-top: 0.125rem; }
.rr-issues__panel {
  background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: 1rem;
  padding: 1.75rem; box-shadow: var(--shadow-card);
}
.rr-issues__panel-head {
  display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;
  font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--text-tertiary);
}
.rr-issues__panel-head span:last-child { text-transform: none; letter-spacing: 0; font-weight: 500; font-size: 0.875rem; }
.rr-issues__list { display: grid; gap: 0.75rem; }
.rr-issue {
  display: flex; align-items: center; gap: 1rem; width: 100%; text-align: left;
  padding: 1rem 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border-subtle);
  background: var(--surface-card); font: inherit; color: inherit;
}
.rr-issue--toggle { cursor: pointer; }
.rr-issue--toggle:focus-visible { outline: 2px solid var(--text-link); outline-offset: 2px; }
.rr-issue--selected { border-color: var(--action-primary); background: var(--surface-raised); }
.rr-issue--done { background: var(--surface-raised); }
.rr-issue--unscored { background: var(--surface-sunken); }
.rr-issue--unscored .rr-issue__title { color: var(--text-tertiary); }
.rr-issue__tile {
  width: 1.375rem; height: 1.375rem; flex-shrink: 0; border-radius: 0.375rem;
  border: 1.5px solid var(--border-medium); display: flex; align-items: center; justify-content: center;
  color: var(--action-primary-ink);
}
.rr-issue__tile--on { background: var(--action-primary); border-color: var(--action-primary); }
.rr-issue__text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.rr-issue__title { font-weight: 700; font-size: 1rem; color: var(--text-heading); }
.rr-issue__meta { font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.125rem; }
.rr-pill {
  display: inline-flex; align-items: center; gap: 0.25rem; flex-shrink: 0;
  font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 0.25rem 0.625rem; border-radius: 9999px;
  background: var(--surface-sunken); color: var(--text-tertiary); border: 1px solid var(--border-subtle);
}
.rr-pill--done { background: var(--surface-raised); color: var(--text-link); border-color: transparent; }
.rr-issues__cta {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; margin-top: 1.5rem;
  font-family: 'Manrope', sans-serif; font-size: 1.125rem; font-weight: 700;
  padding: 1rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer;
  background: var(--action-primary); color: var(--action-primary-ink);
  transition: background-color var(--dur-fast) var(--ease-standard);
}
.rr-issues__cta:hover:not(:disabled) { background: var(--action-primary-hover); }
.rr-issues__cta:disabled { opacity: 0.55; cursor: not-allowed; }
.rr-issues__cta:focus-visible { outline: 2px solid var(--text-link); outline-offset: 3px; }
.rr-issues__ballot-link { display: block; margin: 0.5rem auto 0; }
```

Pill text is written in sentence case in the JSX ("Not started", "Ranked", "Not scored"); CSS uppercases it visually. Tests match case-insensitively.

- [ ] **Step 6: Run** `npx vitest run src/components/__tests__/IssueSelection.test.tsx src/components/__tests__/RaceChip.test.tsx`, then `npm test`, `npx tsc -b`, `npm run build`, `npx eslint src/components/IssueSelection.tsx src/components/RaceChip.tsx src/components/PhaseContainer.tsx` — all pass, no new lint errors. If another test referenced the removed breadcrumb on issue-selection or the old `.issue-*` classes, update it and say so in the commit body.

- [ ] **Step 7: Commit**

```bash
git add src/components/IssueSelection.tsx src/components/PhaseContainer.tsx src/index.css src/components/__tests__/IssueSelection.test.tsx
git commit -m "feat(issues): two-column Choose your issues with race chip and status pills

Follows Aditi's prototype (rr#109 screen 04). Ranked issues stay locked and
uncounted; single-candidate issues keep Not scored; reading time uses
estimateMinutes everywhere.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Browser check, then PR

- [ ] **Step 1:** `preview_start` name `read-rank-dev` (port 5180; local dev serves the mock Indiana Governor race — 3 topics).
- [ ] **Step 2:** At 1280×900 and 390×844, light and dark: open the race from the landing (first visit: no progress, all Not started); go back, rank one topic, return (re-entry: progress bar, Ranked pill, "See your ballot so far"); deselect remaining (See your ballot only). Check `read_console_messages` for errors and that the chip shows the motif and date when opened from a race card. When capturing with Playwright, block only `https://*.posthog.com` — never a pattern that matches the local `posthog-js` module.
- [ ] **Step 3:** Push `feat/issues-redesign`, open a PR to `main` with screenshots described and the spec/plan linked; end the body with the Claude Code attribution line.
