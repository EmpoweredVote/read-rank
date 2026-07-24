# Ranking Ties & Truncation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a voter co-rank equivalent quotes (ties) and stop ranking early (truncation) in Read & Rank's ranking step, instead of being forced into a strict total order.

**Architecture:** Keep each topic's `agreed` as an ordered array (preserves `reorderAgreed` and the dnd-kit list). Add `tieWithPrev` per agreed quote (shares the rank of the quote above it) and `rankedCount` per topic (the first N agreed quotes are ranked; the rest are unranked "also agree"). A single pure function derives `id → rank|null` from that shape (dense ranking; ties share a number; unranked → null). Derived ranks feed the existing verdict/reveal pipeline, whose `rank: number|null` wire format already tolerates this. Matching already truncates at top-3, so results barely move — this is mostly interaction + a small derivation change.

**Tech Stack:** React 18 + TypeScript, Zustand (`src/store/useReadRankStore.ts`), @dnd-kit (`RankList.tsx`), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-24-ranking-ties-truncation-design.md`

---

## File structure

- Create: `src/utils/deriveRanks.ts` — pure: `(agreed, tieFlags, rankedCount) → Map<id, number|null>`. One responsibility: turn the ordered pile + tie/truncation state into per-topic ranks. Unit-tested in isolation.
- Create: `src/utils/__tests__/deriveRanks.test.ts`
- Modify: `src/utils/alignmentMarks.ts` — make `buildPerTopicRankMap` tie-aware (equal global ranks → equal per-topic ranks via dense ranking).
- Modify: `src/utils/__tests__/alignmentMarks.test.ts` (create if absent) — tie cases.
- Modify: `src/store/useReadRankStore.ts` — add `tieWithPrev` to `AgreedQuote`, `rankedCount` to `TopicProgress`; add `toggleTie(id)` and `setRankedCount(n)` setters; derive `VerdictRecord.rank` from `deriveRanks` instead of array index.
- Modify: `src/store/__tests__/useReadRankStore.test.ts` (create if absent) — setter + verdict-derivation cases.
- Modify: `src/components/RankList.tsx` — render shared rank number + tie bracket; add a "tie with above" affordance and a "place the rest as agreed" truncation control.

Phases: **1** pure derivation → **2** store model + setters + verdict derivation → **3** RankList UI. Each phase is independently testable; the app keeps working after each (defaults reproduce today's behavior).

---

## Phase 1 — pure rank derivation

### Task 1: `deriveRanks` util

**Files:**
- Create: `src/utils/deriveRanks.ts`
- Test: `src/utils/__tests__/deriveRanks.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { deriveRanks } from '../deriveRanks';

// ids in visual order; tie[i] = true means "shares the rank of ids[i-1]".
describe('deriveRanks', () => {
  it('numbers a plain ordered pile 1..N', () => {
    const m = deriveRanks(['a', 'b', 'c'], [false, false, false], 3);
    expect([m.get('a'), m.get('b'), m.get('c')]).toEqual([1, 2, 3]);
  });

  it('gives tied quotes the same rank and skips the consumed number (standard/competition ranking)', () => {
    // a=1, b tied with a =1, c after a 2-way tie = 3
    const m = deriveRanks(['a', 'b', 'c'], [false, true, false], 3);
    expect([m.get('a'), m.get('b'), m.get('c')]).toEqual([1, 1, 3]);
  });

  it('marks quotes beyond rankedCount as unranked (null)', () => {
    const m = deriveRanks(['a', 'b', 'c', 'd'], [false, false, false, false], 2);
    expect([m.get('a'), m.get('b'), m.get('c'), m.get('d')]).toEqual([1, 2, null, null]);
  });

  it('treats a leading tie flag as no-op (first quote is always a fresh rank)', () => {
    const m = deriveRanks(['a', 'b'], [true, false], 2);
    expect([m.get('a'), m.get('b')]).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/deriveRanks.test.ts`
Expected: FAIL — "Failed to resolve import '../deriveRanks'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/utils/deriveRanks.ts
/**
 * Turn a topic's ordered agreed pile + tie/truncation state into per-quote ranks.
 * - `ids`: agreed quote ids in visual (drag) order.
 * - `tieWithPrev[i]`: true means ids[i] shares the rank of ids[i-1] (ignored at i=0).
 * - `rankedCount`: the first N ids are ranked; ids at index >= N are unranked ("also agree").
 * Standard/competition ranking: after a k-way tie the next fresh rank jumps by k.
 * Returns id → rank (1-based) or null (unranked).
 */
export function deriveRanks(
  ids: string[],
  tieWithPrev: boolean[],
  rankedCount: number,
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  let currentRank = 0; // rank last assigned
  let consumed = 0;     // how many ranked slots used so far (for competition jump)
  for (let i = 0; i < ids.length; i++) {
    if (i >= rankedCount) {
      map.set(ids[i], null);
      continue;
    }
    if (i === 0 || !tieWithPrev[i]) {
      currentRank = consumed + 1;
    }
    map.set(ids[i], currentRank);
    consumed++;
  }
  return map;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/deriveRanks.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/deriveRanks.ts src/utils/__tests__/deriveRanks.test.ts
git commit -m "feat(rank): deriveRanks — ties + truncation to per-quote ranks"
```

### Task 2: tie-aware `buildPerTopicRankMap`

The reveal re-derives per-topic ranks from global ranks. Today it renumbers 1,2,3 by sort index, which would break ties (two global-rank-1 quotes become 1 and 2). Make equal global ranks stay equal.

**Files:**
- Modify: `src/utils/alignmentMarks.ts:13-31` (`buildPerTopicRankMap`)
- Test: `src/utils/__tests__/alignmentMarks.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { buildPerTopicRankMap } from '../alignmentMarks';
import type { RevealResult } from '../../data/api';

function reveal(quotes: { quoteId: string; supported: boolean; rank: number | null }[]): RevealResult {
  return {
    isRankedChoice: true,
    ballot: [{ candidateId: 'c1', name: 'X', perTopic: [{ topicKey: 't', quotes }] }],
  } as unknown as RevealResult;
}

describe('buildPerTopicRankMap ties', () => {
  it('keeps equal global ranks equal per-topic, and jumps the next (competition)', () => {
    const m = buildPerTopicRankMap(reveal([
      { quoteId: 'a', supported: true, rank: 1 },
      { quoteId: 'b', supported: true, rank: 1 },
      { quoteId: 'c', supported: true, rank: 3 },
    ]));
    expect([m.get('a'), m.get('b'), m.get('c')]).toEqual([1, 1, 3]);
  });

  it('still numbers distinct ranks 1,2,3', () => {
    const m = buildPerTopicRankMap(reveal([
      { quoteId: 'a', supported: true, rank: 5 },
      { quoteId: 'b', supported: true, rank: 9 },
    ]));
    expect([m.get('a'), m.get('b')]).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/alignmentMarks.test.ts`
Expected: FAIL — first test gets `[1, 2, 3]` (old renumbering ignores ties).

- [ ] **Step 3: Implement — replace the renumber loop**

In `src/utils/alignmentMarks.ts`, replace the final numbering loop inside `buildPerTopicRankMap`:

```typescript
  const map = new Map<string, number>();
  for (const arr of byTopic.values()) {
    arr.sort((a, b) => a.rank - b.rank);
    let perTopic = 0;      // last assigned per-topic rank
    let consumed = 0;      // ranked slots used (competition jump)
    let prevGlobal: number | null = null;
    for (const q of arr) {
      if (prevGlobal === null || q.rank !== prevGlobal) perTopic = consumed + 1;
      map.set(q.quoteId, perTopic);
      consumed++;
      prevGlobal = q.rank;
    }
  }
  return map;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/alignmentMarks.test.ts`
Expected: PASS.

- [ ] **Step 5: Guard the existing marks (ties in top-3)**

Add to `src/utils/__tests__/alignmentMarks.test.ts` — confirm `markForQuotes` treats a tie at rank 1 as a rank-1 pick and `countTopPicks` counts each tied #1:

```typescript
import { markForQuotes, countTopPicks } from '../alignmentMarks';
it('a tied #1 is a rank-1 pick for its candidate', () => {
  const rankMap = new Map([['a', 1], ['b', 1]]);
  expect(markForQuotes([{ quoteId: 'a', supported: true }] as never, rankMap)).toEqual({ kind: 'rank', rank: 1 });
  expect(countTopPicks([{ quoteId: 'b', supported: true }] as never, rankMap)).toBe(1);
});
```

Run: `npx vitest run src/utils/__tests__/alignmentMarks.test.ts`
Expected: PASS — no change needed to `markForQuotes`/`countTopPicks` (they read the rankMap; ties already work). If it passes, that's the confirmation.

- [ ] **Step 6: Commit**

```bash
git add src/utils/alignmentMarks.ts src/utils/__tests__/alignmentMarks.test.ts
git commit -m "feat(rank): tie-aware per-topic rank derivation at reveal"
```

---

## Phase 2 — store model, setters, verdict derivation

### Task 3: extend the model + `toggleTie`

**Files:**
- Modify: `src/store/useReadRankStore.ts` — `AgreedQuote` (add `tieWithPrev`), `TopicProgress` (add `rankedCount`), `buildRaceProgress`/`selectRace` defaults, new `toggleTie` action + its `ReadRankState` signature.
- Test: `src/store/__tests__/useReadRankStore.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore } from '../useReadRankStore';

// Minimal payload with one topic, three agreed quotes pre-loaded via selectRace + swipes
// is heavy; instead drive the store through its public API. See helper in repo test setup.
describe('toggleTie', () => {
  beforeEach(() => useReadRankStore.getState().resetAll?.());
  it('marks a quote tied with the one above and back', () => {
    const s = useReadRankStore.getState();
    // Arrange: seed a race with agreed [a,b,c] on the current topic (helper below).
    seedAgreed(['a', 'b', 'c']);
    useReadRankStore.getState().toggleTie('b');
    const topic = currentTopic();
    expect(topic.agreed.find((q) => q.id === 'b')!.tieWithPrev).toBe(true);
    useReadRankStore.getState().toggleTie('b');
    expect(currentTopic().agreed.find((q) => q.id === 'b')!.tieWithPrev).toBe(false);
  });
});
```

Add these test helpers at the top of the file (they use the real store API — `selectRace` then mark quotes agreed by reordering; adapt field names to `RacePayload`):

```typescript
function seedAgreed(ids: string[]) {
  const payload = {
    raceId: 'r1', positionName: 'Test', topicOrder: ['t'],
    topics: { t: { topicKey: 't', title: 'T', question: 'Q',
      quotesToEvaluate: ids.map((id) => ({ id, text: id, candidateToken: id, topicKey: 't' })),
      currentIndex: 0, disagreed: [], agreed: [] } },
  };
  useReadRankStore.getState().selectRace(payload as never);
  useReadRankStore.getState().setCurrentTopic('t');
  // agree each in order
  const st = useReadRankStore.getState();
  ids.forEach((id) => st.agreeQuote?.({ id, text: id, candidateToken: id, topicKey: 't' } as never));
}
function currentTopic() {
  const st = useReadRankStore.getState();
  const race = st.races[st.currentRaceId!];
  return race.topics[race.currentTopicKey!];
}
```

> Note: confirm the exact agree action name (`agreeQuote` vs `swipeAgree`) and `RacePayload` field names by reading `useReadRankStore.ts:75-90` and the evaluation action; adjust the helper accordingly. The test intent (toggleTie flips `tieWithPrev`) is fixed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/useReadRankStore.test.ts`
Expected: FAIL — `toggleTie` is not a function.

- [ ] **Step 3: Extend the interfaces**

In `src/store/useReadRankStore.ts`:

```typescript
export interface AgreedQuote extends BlindQuote {
  addedAt: number;
  /** True when this quote shares the rank of the quote immediately above it in `agreed`. */
  tieWithPrev?: boolean;
}
```

```typescript
export interface TopicProgress {
  topicKey: string;
  title: string;
  question: string;
  quotesToEvaluate: BlindQuote[];
  currentIndex: number;
  disagreed: BlindQuote[];
  agreed: AgreedQuote[];
  /** Leading N of `agreed` are ranked; the rest are unranked "also agree".
   *  Defaults to agreed.length (all ranked = today's behavior). */
  rankedCount?: number;
}
```

- [ ] **Step 4: Add the `toggleTie` action**

Add to the `ReadRankState` interface (near `reorderAgreed`):

```typescript
  /** Toggle whether an agreed quote ties with the quote above it in its topic. */
  toggleTie: (quoteId: string) => void;
```

Add the implementation next to `reorderAgreed` (mirror its `withCurrentRace` pattern):

```typescript
      toggleTie: (quoteId) => {
        const patch = withCurrentRace(get(), (race) => {
          const topicKey = race.currentTopicKey;
          if (!topicKey || !race.topics[topicKey]) return race;
          const topic = race.topics[topicKey];
          const idx = topic.agreed.findIndex((q) => q.id === quoteId);
          if (idx <= 0) return race; // first row can't tie upward
          const agreed = topic.agreed.map((q, i) =>
            i === idx ? { ...q, tieWithPrev: !q.tieWithPrev } : q);
          return { ...race, topics: { ...race.topics, [topicKey]: { ...topic, agreed } } };
        });
        if (patch) set(patch);
      },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/useReadRankStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/useReadRankStore.ts src/store/__tests__/useReadRankStore.test.ts
git commit -m "feat(rank): store model for ties (tieWithPrev, rankedCount) + toggleTie"
```

### Task 4: `setRankedCount` (truncation) + reset tie flag on reorder

**Files:**
- Modify: `src/store/useReadRankStore.ts` — add `setRankedCount`; in `reorderAgreed`, clear `tieWithPrev` on a moved quote (a drag breaks an old tie so we don't strand a tie against a new neighbor).
- Test: `src/store/__tests__/useReadRankStore.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
describe('setRankedCount (truncation)', () => {
  it('sets how many leading agreed quotes are ranked', () => {
    seedAgreed(['a', 'b', 'c']);
    useReadRankStore.getState().setRankedCount(2);
    expect(currentTopic().rankedCount).toBe(2);
  });
});
describe('reorderAgreed clears stale ties', () => {
  it('a reordered quote loses tieWithPrev', () => {
    seedAgreed(['a', 'b', 'c']);
    useReadRankStore.getState().toggleTie('c');           // c ties with b
    useReadRankStore.getState().reorderAgreed(['c', 'a', 'b']); // c moved to front
    expect(currentTopic().agreed.find((q) => q.id === 'c')!.tieWithPrev).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/useReadRankStore.test.ts`
Expected: FAIL — `setRankedCount` undefined; and the moved quote keeps its stale tie.

- [ ] **Step 3: Implement `setRankedCount` + reorder cleanup**

Add to `ReadRankState` and implement:

```typescript
  /** Rank only the first `n` agreed quotes; the rest become unranked "also agree". */
  setRankedCount: (n: number) => void;
```

```typescript
      setRankedCount: (n) => {
        const patch = withCurrentRace(get(), (race) => {
          const topicKey = race.currentTopicKey;
          if (!topicKey || !race.topics[topicKey]) return race;
          const topic = race.topics[topicKey];
          const clamped = Math.max(0, Math.min(n, topic.agreed.length));
          return { ...race, topics: { ...race.topics, [topicKey]: { ...topic, rankedCount: clamped } } };
        });
        if (patch) set(patch);
      },
```

In `reorderAgreed`, clear `tieWithPrev` on any quote whose predecessor changed. Simplest correct rule: clear the flag on every quote that moved to a new index, computed against the previous order:

```typescript
      reorderAgreed: (orderedIds) => {
        const patch = withCurrentRace(get(), (race) => {
          const topicKey = race.currentTopicKey;
          if (!topicKey || !race.topics[topicKey]) return race;
          const topic = race.topics[topicKey];
          const prevIndex = new Map(topic.agreed.map((q, i) => [q.id, i]));
          const byId = new Map(topic.agreed.map((q) => [q.id, q]));
          const next = orderedIds.map((id, i) => {
            const q = byId.get(id)!;
            return prevIndex.get(id) === i ? q : { ...q, tieWithPrev: false };
          }).filter(Boolean) as AgreedQuote[];
          for (const q of topic.agreed) if (!orderedIds.includes(q.id)) next.push(q);
          return { ...race, topics: { ...race.topics, [topicKey]: { ...topic, agreed: next } } };
        });
        if (patch) set(patch);
      },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/useReadRankStore.test.ts`
Expected: PASS (all store tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/useReadRankStore.ts src/store/__tests__/useReadRankStore.test.ts
git commit -m "feat(rank): truncation (setRankedCount) + clear stale ties on reorder"
```

### Task 5: derive `VerdictRecord.rank` from the model

Find where verdicts are assembled from the store (the code that turns each topic's `agreed` into `VerdictRecord[]` with a `rank`). Read `src/utils/verdictFragment.ts` and search for `VerdictRecord`/`rank:` construction (`grep -rn "rank:" src/utils src/components | grep -i verdict`). Replace the array-index rank with `deriveRanks`.

**Files:**
- Modify: the verdict-assembly site (confirm path via the grep above; likely `src/utils/verdictFragment.ts`).
- Test: same store/util test file.

- [ ] **Step 1: Write the failing test** (against the assembly function, once located — call it `buildVerdictsForTopic(topic)`)

```typescript
it('emits tied ranks and null for truncated quotes', () => {
  seedAgreed(['a', 'b', 'c', 'd']);
  useReadRankStore.getState().toggleTie('b');       // a=1, b=1
  useReadRankStore.getState().setRankedCount(3);    // d unranked
  const verdicts = buildVerdictsForTopic(currentTopic());
  const byId = Object.fromEntries(verdicts.map((v) => [v.quote_id, v.rank]));
  expect(byId).toMatchObject({ a: 1, b: 1, c: 3, d: null });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/store/__tests__/useReadRankStore.test.ts`
Expected: FAIL — current assembly uses index+1, so `b`=2, `d`=4 (not null).

- [ ] **Step 3: Implement — use deriveRanks in assembly**

At the assembly site, replace index-based ranking with:

```typescript
import { deriveRanks } from './deriveRanks';

export function buildVerdictsForTopic(topic: TopicProgress): VerdictRecord[] {
  const ids = topic.agreed.map((q) => q.id);
  const ties = topic.agreed.map((q) => !!q.tieWithPrev);
  const ranked = topic.rankedCount ?? topic.agreed.length;
  const rankMap = deriveRanks(ids, ties, ranked);
  const agreed = topic.agreed.map((q) => ({
    quote_id: q.id, supported: true, rank: rankMap.get(q.id) ?? null,
  }));
  const disagreed = topic.disagreed.map((q) => ({ quote_id: q.id, supported: false, rank: null }));
  return [...agreed, ...disagreed] as VerdictRecord[];
}
```

> If verdicts are assembled inline (not in a named function), extract them into `buildVerdictsForTopic` in `src/utils/verdictFragment.ts` first (pure, no store access), then call it from the existing site — this is the DRY move and makes the behavior testable. Preserve `session_size` if the existing records carry it.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/store/__tests__/useReadRankStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(rank): derive verdict ranks from ties + truncation"
```

---

## Phase 3 — RankList UI

`RankList.tsx` uses @dnd-kit with a "view mode" (full-quote slips, a tap-to-assign number popover via `onNumberClick`) and a "reorder mode" (compact drag rows). The rank number today is `index + 1`. These tasks make the number tie-aware, add a tie affordance, and add a truncation control. Full quote stays visible in view mode (spec requirement).

### Task 6: render derived ranks (shared numbers) instead of `index + 1`

**Files:**
- Modify: `src/components/RankList.tsx` — compute a `ranks: Map<id, number|null>` from the store's current topic via `deriveRanks`, pass the per-row derived number into `RowContent` instead of `index + 1`; show unranked rows without a number.

- [ ] **Step 1: Write the failing test** (render-level, Vitest + Testing Library — the repo uses `src/test/setup.ts`)

```typescript
// src/components/__tests__/RankList.rank.test.tsx
import { render, screen } from '@testing-library/react';
import RankList from '../RankList';
// Arrange a topic with agreed [a,b,c], b tied with a, rankedCount 3, then:
it('shows a shared rank number for tied rows', () => {
  // seed store as in store tests, render <RankList /> in view mode
  render(<RankList /* props per its actual signature */ />);
  const ones = screen.getAllByText('1');
  expect(ones.length).toBe(2); // a and b both show "1"
});
```

> Confirm `RankList`'s prop signature and how it reads the topic (props vs `useReadRankStore`) from `RankList.tsx:70-200`; wire the test's render accordingly.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/__tests__/RankList.rank.test.tsx`
Expected: FAIL — today both rows show sequential numbers (`1`, `2`).

- [ ] **Step 3: Implement derived numbers**

In `RankList.tsx`, build the rank map once from the current topic and index rows by id:

```typescript
import { deriveRanks } from '../utils/deriveRanks';
// inside the component, given `agreed: AgreedQuote[]` and `rankedCount`:
const ranks = deriveRanks(
  agreed.map((q) => q.id),
  agreed.map((q) => !!q.tieWithPrev),
  rankedCount ?? agreed.length,
);
```

Change `RowContent` to take `rank: number | null` and render it (empty/muted when null) instead of `num = index + 1`. Update both `reorderMode` and view-mode branches: `<span className="rank-mini-num">{rank ?? ''}</span>` and the view-mode number button label.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/__tests__/RankList.rank.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RankList.tsx src/components/__tests__/RankList.rank.test.tsx
git commit -m "feat(rank): RankList renders derived (tie-aware) rank numbers"
```

### Task 7: tie affordance + tie bracket

**Files:**
- Modify: `src/components/RankList.tsx` — add a per-row "tie with above" control (a small button on rows after the first) that calls `toggleTie(id)`; render a left-edge bracket spanning a contiguous tie group. Full quote stays visible.

- [ ] **Step 1: Write the failing test**

```typescript
import userEvent from '@testing-library/user-event';
it('tapping "tie with above" co-ranks the row', async () => {
  // seed agreed [a,b], render, click b's tie control
  render(<RankList /* props */ />);
  await userEvent.click(screen.getByRole('button', { name: /tie with above/i }));
  expect(screen.getAllByText('1').length).toBe(2); // a and b now both "1"
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/__tests__/RankList.rank.test.tsx`
Expected: FAIL — no tie control exists.

- [ ] **Step 3: Implement**

Add to each view-mode row after the first (`index > 0`) a button:

```tsx
<button type="button" className="rank-tie-btn" aria-label={`Tie with above`}
  aria-pressed={!!quote.tieWithPrev} onClick={() => toggleTie(quote.id)}>
  <span aria-hidden>=</span>
</button>
```

Wire `toggleTie` from `useReadRankStore`. For the bracket, add a CSS class `rank-tie-bracket` on rows where `tieWithPrev` is true (and the row above), rendered as a `border-left` accent using the brand yellow token; group contiguous tied rows visually. Add the styles to the existing RankList stylesheet (search for `.rank-slip` styles and colocate). Respect `prefers-reduced-motion` (no animated bracket).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/__tests__/RankList.rank.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RankList.tsx && git commit -m "feat(rank): tie-with-above affordance + tie bracket"
```

### Task 8: truncation control ("place the rest as agreed")

**Files:**
- Modify: `src/components/RankList.tsx` — a divider/action below the ranked rows that calls `setRankedCount(currentRankedThreshold)`; rows below render as an "also agree" group (no number). Dragging a row across the divider adjusts `rankedCount`.

- [ ] **Step 1: Write the failing test**

```typescript
it('places the rest as agreed when the control is used', async () => {
  // seed agreed [a,b,c,d], render
  render(<RankList /* props */ />);
  await userEvent.click(screen.getByRole('button', { name: /place the rest as agreed/i }));
  // after placing rest at threshold 2 (example), c and d show no rank number
  expect(screen.queryAllByText(/^[0-9]+$/).length).toBeLessThan(4);
});
```

> The exact threshold interaction (where the divider sits, whether it's a button per row or one action) is a small UX decision — settle it here: a single "collapse the rest into also-agree" affordance at the row where the user stops. Keep the test asserting the *outcome* (some rows lose their number), not the pixel mechanics.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/__tests__/RankList.rank.test.tsx`
Expected: FAIL — no truncation control.

- [ ] **Step 3: Implement**

Render an "also agree" divider after `rankedCount` rows; below it, rows show no number and a muted "also agree" label. Add a button on each ranked row (or a draggable divider) that calls `setRankedCount(index + 1)` to set the threshold there. Rows below the divider stay full-quote and reorderable but unranked. Use the store's `rankedCount` (default `agreed.length`).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/__tests__/RankList.rank.test.tsx`
Expected: PASS.

- [ ] **Step 5: Manual smoke + full suite**

Run: `npm run dev`, walk a race with a crowded topic: agree to 5+, verify you can tie two rows (shared number + bracket), place the rest as agreed (they lose numbers), reveal, and confirm alignment still renders. Then `npx vitest run && npx tsc --noEmit`.
Expected: all green; reveal unchanged for un-tied/un-truncated races.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(rank): truncation control (place the rest as agreed)"
```

---

## Open decision resolved here (from the spec)

**Tie group crossing the top-3 boundary:** with competition ranking, a k-way tie at rank 1 makes all k members "rank 1" picks; a tie group whose members land at ranks ≤3 are all picks, and members at derived rank ≥4 collapse to "agreed" (existing `markForQuotes` rule, unchanged). No special-casing — `deriveRanks` + the existing `<= 3` cutoff handle it. `countTopPicks` counts every rank-1 member (a candidate genuinely tied for the user's top slot).

## Self-review notes

- Spec coverage: ties (Tasks 1,3,7), truncation (Tasks 1,4,8), full-quote-visible (Tasks 6–8 keep view-mode slips), tie-aware derivation (Tasks 1,2), verdict wiring (Task 5), top-3-boundary rule (resolved above). Covered.
- Defaults reproduce today's behavior: `tieWithPrev` absent → false; `rankedCount` absent → `agreed.length`; `deriveRanks` with all-false/full-count returns 1..N — so untouched races are byte-identical downstream.
- Two grounding confirmations the implementer must do (named inline, not placeholders): the agree-action name + `RacePayload` fields for the test helper (Task 3), and the verdict-assembly site (Task 5). Both have a concrete `grep`/line reference and a fixed behavioral contract.
