# Multi-topic Reveal & Race Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make revealing a ballot a re-enterable, per-round event (not whole-race completion) so a citizen can finish the topics they haven't done yet, and restore the "Continue · N of M topics" progress indicator everywhere races are listed.

**Architecture:** Race completion becomes **derived from topic done-state** (all rankable topics judged) instead of a `completed` flag flipped on reveal. The reveal (`ResultsPhase`) is one progressive combined ballot. Re-entry routes to the issue-selection hub (partial) or the ballot (complete). The evaluation reveal CTA and the hub both become completion-aware.

**Tech Stack:** React + TypeScript, Zustand (`persist`) store, Vitest + Testing Library. Test runner: `npx vitest run <path>`.

**Design reference:** [docs/superpowers/specs/2026-07-15-multi-topic-reveal-and-progress-design.md](../specs/2026-07-15-multi-topic-reveal-and-progress-design.md)

---

## File Structure

- `src/utils/raceProgressState.ts` — completion/label derivation. Gains exported `isTopicDone`, `isTopicScorable`, `isRaceComplete`, `raceCardProgress`; `deriveProgressState` stops reading the `completed` flag; `progressLabel` simplified. (Task 1)
- `src/store/useReadRankStore.ts` — `finishRace` → `revealBallot` (no longer sets `completed`); `setPhase` no longer forces `completed`; `selectRace` re-entry routing + `meta.rankableTopicCount`; `confirmIssueSelection` keeps done topics selected and starts on the first undone topic. (Tasks 2, 4)
- `src/components/RaceHub.tsx` — pass `rankableTopicCount` into `selectRace`; fix `resumed_completed` analytics; pass `raceProgress` to `RaceBrowse`; reuse `raceCardProgress`. (Tasks 2, 6)
- `src/components/EvaluationPhase.tsx` — reveal CTA label/prominence by position; race-wide reveal gate; call `revealBallot`. (Tasks 2, 3)
- `src/components/IssueSelection.tsx` — re-entry hub: done topics shown as "Ranked ✓", remaining selectable, "See your ballot" escape. (Task 4)
- `src/components/ResultsPhase.tsx` — completion-aware exits incl. "Back to your topics". (Task 5)
- `src/components/RaceBrowse.tsx` — accept `raceProgress`, render progress labels. (Task 6)
- `CLAUDE.md` — record the per-topic-reveal invariant evolution. (Task 7)

---

## Task 1: Derive completion from topics; simplify labels; export helpers

**Files:**
- Modify: `src/utils/raceProgressState.ts`
- Test: `src/utils/__tests__/raceProgressState.test.ts`

- [ ] **Step 1: Update the failing tests to the new semantics**

Two existing tests encode the OLD reveal-marks-complete behavior. Replace them, and add the new helper tests. In `src/utils/__tests__/raceProgressState.test.ts`:

Replace the `partial` test (currently lines ~62-66):

```ts
  it('in-progress (not partial) when a partial ballot was revealed but topics remain', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    // Live count is 2 but only one topic is done -> the race is still in-progress and
    // invites the user back (revealing no longer marks the race complete).
    expect(deriveProgressState(race({ topics: { t: done } }), 2).state).toBe('in-progress');
  });
```

Replace the `progressLabel` "Reveal your ballot" test (currently lines ~79-82):

```ts
  it('in-progress label always counts against all live rankable topics', () => {
    expect(progressLabel({ ...base, state: 'in-progress', doneTopics: 3, liveScorableTopics: 4, selectedScorableTopics: 3 }))
      .toBe('Continue · 3 of 4 topics');
  });
```

Add, inside `describe('deriveProgressState', ...)`:

```ts
  it('complete is derived from topics, ignoring a stale completed flag', () => {
    const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });
    // Old data may carry completed:true after only one topic; completion is now
    // derived purely from topics vs the live rankable count.
    expect(deriveProgressState(race({ completed: true, topics: { t: done } }), 3).state).toBe('in-progress');
  });
```

Add a new describe block at the end of the file:

```ts
describe('isRaceComplete', () => {
  const done = topic({ quotesToEvaluate: [q('1','a'), q('2','b')], agreed: [{ ...q('1','a'), addedAt: 0 }], disagreed: [q('2','b')] });

  it('true only when every live rankable topic is done', () => {
    expect(isRaceComplete(race({ topics: { t: done }, topicOrder: ['t'] }), 1)).toBe(true);
    expect(isRaceComplete(race({ topics: { t: done }, topicOrder: ['t'] }), 3)).toBe(false);
  });

  it('false for an untouched or missing race', () => {
    expect(isRaceComplete(undefined, 3)).toBe(false);
  });
});
```

Add the import at the top of the test file:

```ts
import { deriveProgressState, progressLabel, isRaceComplete } from '../raceProgressState';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils/__tests__/raceProgressState.test.ts`
Expected: FAIL — `isRaceComplete` is not exported; the two rewritten assertions fail against current behavior.

- [ ] **Step 3: Rewrite `raceProgressState.ts`**

Replace the whole file body with:

```ts
import type { RaceProgress, TopicProgress } from '../store/useReadRankStore';

export type ProgressState = 'not-started' | 'in-progress' | 'partial' | 'complete';

export interface ProgressInfo {
  state: ProgressState;
  /** Scorable topics the user has fully judged. */
  doneTopics: number;
  /** Live scorable-topic count for the race (RaceSummary.rankableTopicCount). */
  liveScorableTopics: number;
  /** Scorable topics among the user's selection (kept for callers/analytics). */
  selectedScorableTopics: number;
}

/** A topic is scorable when at least two distinct candidates have a quote in it. */
export function isTopicScorable(t: TopicProgress): boolean {
  const tokens = new Set(t.quotesToEvaluate.map((qn) => qn.candidateToken));
  return tokens.size > 1;
}

/** A topic is done when every quote in it has been judged (agree or disagree). */
export function isTopicDone(t: TopicProgress): boolean {
  const total = t.quotesToEvaluate.length;
  return total > 0 && t.agreed.length + t.disagreed.length >= total;
}

export function deriveProgressState(
  progress: RaceProgress | undefined,
  rankableTopicCount?: number,
): ProgressInfo {
  if (!progress) {
    const live = Math.max(rankableTopicCount ?? 0, 0);
    return { state: 'not-started', doneTopics: 0, liveScorableTopics: live, selectedScorableTopics: live };
  }

  const topics = Object.values(progress.topics);
  const scorable = topics.filter(isTopicScorable);
  const doneTopics = scorable.filter(isTopicDone).length;

  const selectedKeys = progress.selectedTopicKeys ?? progress.topicOrder;
  const selectedScorableTopics = scorable.filter((t) => selectedKeys.includes(t.topicKey)).length;

  // When the live scorable count is unknown, fall back to the scorable topics we
  // can see in the user's own progress — never total topicCount, which would
  // include non-scorable topics.
  const live = Math.max(rankableTopicCount ?? scorable.length, 0);

  // Completion is DERIVED from topics, not from any persisted `completed` flag —
  // revealing a ballot no longer marks the race done, and stale completed:true
  // data self-heals to in-progress.
  if (live > 0 && doneTopics >= live) {
    return { state: 'complete', doneTopics, liveScorableTopics: live, selectedScorableTopics };
  }
  return { state: 'in-progress', doneTopics, liveScorableTopics: live, selectedScorableTopics };
}

/** True when every live rankable topic in the race is done. */
export function isRaceComplete(
  progress: RaceProgress | undefined,
  rankableTopicCount?: number,
): boolean {
  return deriveProgressState(progress, rankableTopicCount).state === 'complete';
}

/** The status label shown on a race tile, or null for no label.
 *  Pure + exhaustive over ProgressState. */
export function progressLabel(info: ProgressInfo): string | null {
  switch (info.state) {
    case 'not-started':
      return null;
    case 'in-progress':
      // No rankable topics yet -> no "0 of 0" nonsense; show no label.
      if (info.liveScorableTopics <= 0) return null;
      return `Continue · ${info.doneTopics} of ${info.liveScorableTopics} topics`;
    case 'partial':
      // Legacy state — deriveProgressState no longer produces it. Kept exhaustive.
      return `Ranked ${info.doneTopics} of ${info.liveScorableTopics}`;
    case 'complete':
      return 'Completed';
  }
}

/** Derive both the tile's progress state and its label in one call (used by the
 *  hub and browse card lists so their derivation can't drift). */
export function raceCardProgress(
  progress: RaceProgress | undefined,
  rankableTopicCount?: number,
): { progress: ProgressState; label: string | null } {
  const info = deriveProgressState(progress, rankableTopicCount);
  return { progress: info.state, label: progressLabel(info) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/raceProgressState.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Verify no other importers broke from the rename**

The internal `isScorable`/`isDone` were not exported before, so nothing imports them. Confirm:

Run: `grep -rn "isScorable\|from '../raceProgressState'\|raceProgressState'" src | grep -v "__tests__"`
Expected: only `deriveProgressState` / `progressLabel` imports (RaceHub). No references to the old private names.

- [ ] **Step 6: Commit**

```bash
git add src/utils/raceProgressState.ts src/utils/__tests__/raceProgressState.test.ts
git commit -m "feat(progress): derive race completion from topics; add isRaceComplete/raceCardProgress"
```

---

## Task 2: Store — `revealBallot`, stop completing on reveal, re-entry routing

**Files:**
- Modify: `src/store/useReadRankStore.ts` (interface `:156`, `:148`; `setPhase` `:269`; `selectRace` `:285`; `finishRace` `:417`)
- Modify: `src/components/RaceHub.tsx` (`handleSelect` `:107`, `:119`)
- Modify: `src/components/EvaluationPhase.tsx` (`:12`, `:79` — mechanical rename only; logic in Task 3)
- Modify: `src/components/__tests__/ResultsPhase.test.tsx` (`:39`, `:59`), `src/components/__tests__/ResultsPhase.reducedMotion.test.tsx` (`:39`)
- Test: `src/store/__tests__/raceCompletion.test.ts` (new)

- [ ] **Step 1: Write the failing store test**

Create `src/store/__tests__/raceCompletion.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore, type RacePayload } from '../useReadRankStore';

// Two scorable topics (each has 2 distinct candidate tokens).
const payload: RacePayload = {
  raceId: 'race-complete-test',
  positionName: 'Governor',
  topics: [
    { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [
      { id: 'a1', text: 'x', candidateToken: 'tokA', topicKey: 'k1' },
      { id: 'a2', text: 'y', candidateToken: 'tokB', topicKey: 'k1' },
    ] },
    { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [
      { id: 'b1', text: 'x', candidateToken: 'tokA', topicKey: 'k2' },
      { id: 'b2', text: 'y', candidateToken: 'tokB', topicKey: 'k2' },
    ] },
  ],
};

const s = () => useReadRankStore.getState();

// Judge every quote in one topic so it counts as done.
function finishTopic(key: 'k1' | 'k2') {
  const race = s().getCurrentRaceProgress()!;
  for (const quote of race.topics[key].quotesToEvaluate) s().disagree(quote);
}

beforeEach(() => {
  window.localStorage?.clear();
  s().reset();
});

describe('revealBallot', () => {
  it('moves to results without marking the whole race complete', () => {
    s().selectRace(payload);
    s().confirmIssueSelection();
    finishTopic('k1');
    s().revealBallot();
    expect(s().phase).toBe('results');
    expect(s().getCurrentRaceProgress()!.completed).toBe(false);
  });
});

describe('selectRace re-entry routing', () => {
  it('routes a revealed-but-incomplete race to the issue-selection hub', () => {
    s().selectRace(payload);
    s().confirmIssueSelection();
    finishTopic('k1');          // 1 of 2 topics done
    s().revealBallot();         // phase -> results
    s().goToHub();
    s().selectRace(payload, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 2 });
    expect(s().phase).toBe('issue-selection');
  });

  it('routes a fully complete race straight to the ballot', () => {
    s().selectRace(payload);
    s().confirmIssueSelection();
    finishTopic('k1');
    finishTopic('k2');          // 2 of 2 done
    s().revealBallot();
    s().goToHub();
    s().selectRace(payload, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 2 });
    expect(s().phase).toBe('results');
  });

  it('resumes mid-evaluation (never revealed) at the evaluation phase', () => {
    s().selectRace(payload);
    s().confirmIssueSelection();  // phase evaluation, nothing revealed
    s().goToHub();
    s().selectRace(payload, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 2 });
    expect(s().phase).toBe('evaluation');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/store/__tests__/raceCompletion.test.ts`
Expected: FAIL — `revealBallot` is not a function; routing returns `results` for the incomplete re-entry case.

- [ ] **Step 3: Extend the `meta` type and interface in `useReadRankStore.ts`**

At the interface (currently `:148`), widen the `selectRace` meta and rename `finishRace`:

```ts
  selectRace: (payload: RacePayload, meta?: { office: string; seat: string | null; state: string | null; rankableTopicCount?: number }) => void;
```

Replace the `finishRace` interface member (currently `:156`):

```ts
  /** Reveal the (partial or full) ballot for topics evaluated so far. Does not
   *  mark the race complete — completion is derived from topic done-state. */
  revealBallot: () => void;
```

Add the import for `isRaceComplete` at the top of the file (with the other imports):

```ts
import { isRaceComplete } from '../utils/raceProgressState';
```

- [ ] **Step 4: Stop `setPhase` from forcing `completed`**

Replace the `setPhase` action (currently `:269-283`) with:

```ts
      setPhase: (phase) => {
        const state = get();
        if (phase === 'evaluation' || phase === 'results') {
          // Mirror the phase onto the current race; completion is derived, so we
          // never flip a `completed` flag here.
          const patch = withCurrentRace(state, (race) => ({ ...race, phase }));
          if (patch) {
            set({ phase, ...patch });
            return;
          }
        }
        set({ phase });
      },
```

- [ ] **Step 5: Rewrite `selectRace` re-entry routing**

Replace `selectRace` (currently `:285-301`) with:

```ts
      selectRace: (payload, meta) => {
        const state = get();
        const existing = state.raceProgress[payload.raceId];
        const race = existing
          ? refreshRaceContent({ ...existing, ...(meta ? { office: meta.office, seat: meta.seat, state: meta.state } : {}) }, payload)
          : buildRaceProgress(payload, meta);

        let nextPhase: Phase;
        if (!existing) {
          nextPhase = 'issue-selection';
        } else if (isRaceComplete(race, meta?.rankableTopicCount)) {
          nextPhase = 'results';                 // all rankable topics done -> combined ballot
        } else if (race.phase === 'results') {
          nextPhase = 'issue-selection';         // revealed a partial ballot -> hub to continue
        } else {
          nextPhase = 'evaluation';              // mid-round, never revealed -> resume
        }

        // Landing on the hub (fresh or returning) offers every rankable topic;
        // reset the selection to the full order so undone topics are pre-selected.
        const selectedTopicKeys = nextPhase === 'issue-selection'
          ? race.topicOrder
          : (race.selectedTopicKeys ?? race.topicOrder);

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

- [ ] **Step 6: Rename `finishRace` → `revealBallot` (no `completed`)**

Replace the `finishRace` action (currently `:417-426`) with:

```ts
      revealBallot: () => {
        const state = get();
        const patch = withCurrentRace(state, (race) => ({ ...race, phase: 'results' }));
        if (patch) set({ phase: 'results', ...patch });
        else set({ phase: 'results' });
      },
```

- [ ] **Step 7: Update the `finishRace` call sites so the build compiles**

In `src/components/EvaluationPhase.tsx`, rename the destructured action (`:12`) and the call (`:79`):

```ts
    revealBallot,
```

```ts
      reveal={{ label: 'Reveal my ballot', onReveal: revealBallot, enabled: agreed.length >= 1 }}
```

(The label/gate logic is refined in Task 3 — this step is a mechanical rename only.)

In `src/components/__tests__/ResultsPhase.test.tsx` (`:39`, `:59`) and `src/components/__tests__/ResultsPhase.reducedMotion.test.tsx` (`:39`), replace `finishRace()` with `revealBallot()`:

```ts
    useReadRankStore.getState().revealBallot();
```

- [ ] **Step 8: Wire `RaceHub.handleSelect` — pass `rankableTopicCount`, fix analytics**

In `src/components/RaceHub.tsx`, add the `isRaceComplete` import (with the other util imports):

```ts
import { deriveProgressState, progressLabel, raceCardProgress, isRaceComplete } from '../utils/raceProgressState';
```

(If `deriveProgressState`/`progressLabel` are imported on the same line, extend it; `raceCardProgress` is used in Task 6.)

Replace the `selectRace` call (`:107`) to pass the rankable count:

```ts
      selectRace(shuffled, { office: race.office, seat: race.seat ?? null, state: race.state, rankableTopicCount: race.rankableTopicCount ?? race.topicCount });
```

Replace the `resumed_completed` analytics line (`:119`) — the `completed` flag is now vestigial:

```ts
        resumed_completed: resumed ? isRaceComplete(existingProgress, race.rankableTopicCount ?? race.topicCount) : false,
```

- [ ] **Step 9: Run the store test + the touched component tests**

Run: `npx vitest run src/store/__tests__/raceCompletion.test.ts src/store/__tests__/issueSelection.test.ts src/components/__tests__/ResultsPhase.test.tsx src/components/__tests__/ResultsPhase.reducedMotion.test.tsx`
Expected: PASS. (`issueSelection.test.ts` line ~45 "resumes its phase" still passes — a never-revealed race resumes `evaluation`.)

- [ ] **Step 10: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (all `finishRace` references removed).

- [ ] **Step 11: Commit**

```bash
git add src/store/useReadRankStore.ts src/components/RaceHub.tsx src/components/EvaluationPhase.tsx src/components/__tests__/ResultsPhase.test.tsx src/components/__tests__/ResultsPhase.reducedMotion.test.tsx src/store/__tests__/raceCompletion.test.ts
git commit -m "feat(store): revealBallot replaces finishRace; derive completion; hub re-entry routing"
```

---

## Task 3: Evaluation reveal CTA — position-aware label + race-wide gate

**Files:**
- Modify: `src/components/EvaluationPhase.tsx`
- Test: `src/components/__tests__/EvaluationPhase.test.tsx`

The reveal button must (a) be enabled once ≥1 quote is agreed *anywhere in the race* (not just the current topic), and (b) read "See your full ballot" only when finishing the last rankable topic completes the race; otherwise "Reveal ballot".

- [ ] **Step 1: Write the failing test**

Add to `src/components/__tests__/EvaluationPhase.test.tsx` (follow the existing render/store-setup pattern already in that file; if it renders `<EvaluationPhase />` after seeding the store, mirror it). Add these cases:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvaluationPhase } from '../EvaluationPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const two: RacePayload = {
  raceId: 'race-eval-cta', positionName: 'Governor',
  topics: [
    { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [
      { id: 'a1', text: 'x', candidateToken: 'tokA', topicKey: 'k1' },
      { id: 'a2', text: 'y', candidateToken: 'tokB', topicKey: 'k1' },
    ] },
    { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [
      { id: 'b1', text: 'x', candidateToken: 'tokA', topicKey: 'k2' },
      { id: 'b2', text: 'y', candidateToken: 'tokB', topicKey: 'k2' },
    ] },
  ],
};
const s = () => useReadRankStore.getState();

beforeEach(() => {
  window.localStorage?.clear();
  s().reset();
  s().selectRace(two);
  s().confirmIssueSelection();
});

describe('EvaluationPhase reveal CTA', () => {
  it('labels the reveal "Reveal ballot" while rankable topics remain', () => {
    // Agree one quote in k1, then finish k1 and land on k2 (the last selected topic,
    // but k-count is 2 so the race is not yet complete after k2 alone).
    s().agree(two.topics[0].quotes[0]);
    s().disagree(two.topics[0].quotes[1]); // k1 done
    s().nextTopic();                        // now on k2
    render(<EvaluationPhase />);
    expect(screen.getByRole('button', { name: /reveal ballot/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /see your full ballot/i })).toBeNull();
  });

  it('labels the reveal "See your full ballot" when finishing completes the race', () => {
    s().agree(two.topics[0].quotes[0]);
    s().disagree(two.topics[0].quotes[1]); // k1 done
    s().nextTopic();
    s().disagree(two.topics[1].quotes[0]);
    s().disagree(two.topics[1].quotes[1]); // k2 done -> race complete
    render(<EvaluationPhase />);
    expect(screen.getByRole('button', { name: /see your full ballot/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/__tests__/EvaluationPhase.test.tsx`
Expected: FAIL — the CTA label is the static "Reveal my ballot".

- [ ] **Step 3: Implement the position-aware CTA in `EvaluationPhase.tsx`**

Add imports near the top:

```ts
import { getAllAgreedQuotes } from '../store/useReadRankStore';
import { isTopicDone, isTopicScorable } from '../utils/raceProgressState';
```

Inside the component, after `const isLastTopic = ...` (currently `:31`), compute the reveal state:

```ts
  const raceAgreedCount = race ? getAllAgreedQuotes(race).length : 0;
  const scorableKeys = race ? activeTopicKeys.filter((k) => isTopicScorable(race.topics[k])) : [];
  // Would finishing the remaining work complete the race? True when every scorable
  // topic except (at most) the current one is already done.
  const completesRace = race
    ? scorableKeys.every((k) => k === race.currentTopicKey || isTopicDone(race.topics[k]))
    : false;
  const revealLabel = completesRace ? 'See your full ballot' : 'Reveal ballot';
```

Replace the `reveal` prop (currently `:79`):

```ts
      reveal={{ label: revealLabel, onReveal: revealBallot, enabled: raceAgreedCount >= 1 }}
```

Note: the `agreed` local (`:24`, current topic) is still used elsewhere in the file for the complete-state copy; only the reveal `enabled` gate changes to the race-wide count.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/__tests__/EvaluationPhase.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/EvaluationPhase.tsx src/components/__tests__/EvaluationPhase.test.tsx
git commit -m "feat(evaluation): position-aware reveal CTA + race-wide reveal gate"
```

---

## Task 4: Issue selection as the re-entry hub

**Files:**
- Modify: `src/components/IssueSelection.tsx`
- Modify: `src/store/useReadRankStore.ts` (`confirmIssueSelection` `:401`)
- Test: `src/components/__tests__/IssueSelection.test.tsx`, `src/store/__tests__/issueSelection.test.ts`

On re-entry, already-done scorable topics render as locked "Ranked ✓" rows; remaining scorable topics stay toggleable (pre-selected). `confirmIssueSelection` keeps done topics in the selection (their verdicts belong in the ballot) and starts evaluation on the first *undone* selected topic. When the user deselects all remaining topics, the footer offers "See your ballot" instead.

- [ ] **Step 1: Write the failing store test for `confirmIssueSelection`**

Add to `src/store/__tests__/issueSelection.test.ts`:

```ts
  it('confirmIssueSelection keeps done topics selected and starts on the first undone topic', () => {
    const p: RacePayload = {
      raceId: 'race-hub', positionName: 'Governor',
      topics: [
        { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [
          { id: 'a1', text: 'x', candidateToken: 'tokA', topicKey: 'k1' },
          { id: 'a2', text: 'y', candidateToken: 'tokB', topicKey: 'k1' },
        ] },
        { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [
          { id: 'b1', text: 'x', candidateToken: 'tokA', topicKey: 'k2' },
          { id: 'b2', text: 'y', candidateToken: 'tokB', topicKey: 'k2' },
        ] },
      ],
    };
    const st = useReadRankStore.getState();
    st.selectRace(p);
    st.confirmIssueSelection();
    // Finish k1.
    for (const quote of st.getCurrentRaceProgress()!.topics.k1.quotesToEvaluate) st.disagree(quote);
    st.revealBallot();
    st.goToHub();
    // Re-enter -> hub. Select just k2 (done k1 stays implied).
    st.selectRace(p, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 2 });
    st.setSelectedTopics(['k2']);
    st.confirmIssueSelection();
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.selectedTopicKeys).toContain('k1');   // done topic retained for the ballot
    expect(race.selectedTopicKeys).toContain('k2');
    expect(race.currentTopicKey).toBe('k2');           // starts on the undone topic
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/store/__tests__/issueSelection.test.ts`
Expected: FAIL — `currentTopicKey` is `k1` (first active) and `k1` may be dropped from the selection.

- [ ] **Step 3: Update `confirmIssueSelection` in `useReadRankStore.ts`**

Add the import (with the other util import from Task 2):

```ts
import { isRaceComplete, isTopicDone, isTopicScorable } from '../utils/raceProgressState';
```

Replace `confirmIssueSelection` (currently `:401-415`) with:

```ts
      confirmIssueSelection: () => {
        const state = get();
        const patch = withCurrentRace(state, (race) => {
          // Always keep already-done scorable topics in the selection — their
          // verdicts belong in the combined ballot even if the user only toggled
          // new topics this round.
          const chosen = new Set(race.selectedTopicKeys ?? race.topicOrder);
          for (const key of race.topicOrder) {
            const t = race.topics[key];
            if (t && isTopicScorable(t) && isTopicDone(t)) chosen.add(key);
          }
          const selectedTopicKeys = race.topicOrder.filter((k) => chosen.has(k));
          // Start on the first selected topic that still needs ranking.
          const active = selectedTopicKeys.filter((k) => selectedTopicKeys.includes(k));
          const firstUndone = active.find((k) => race.topics[k] && !isTopicDone(race.topics[k]));
          const currentTopicKey = firstUndone ?? active[0] ?? race.currentTopicKey;
          return { ...race, phase: 'evaluation' as const, selectedTopicKeys, currentTopicKey };
        });
        if (patch) set({ phase: 'evaluation', ...patch });
        else set({ phase: 'evaluation' });
      },
```

- [ ] **Step 4: Run the store test to verify it passes**

Run: `npx vitest run src/store/__tests__/issueSelection.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing component test for the hub**

Add to `src/components/__tests__/IssueSelection.test.tsx` (mirror its existing render/store-seed pattern):

```ts
  it('marks already-done topics as ranked and offers "See your ballot" when nothing new is selected', () => {
    const p = {
      raceId: 'race-hub-ui', positionName: 'Governor',
      topics: [
        { topicKey: 'k1', title: 'Fossil Fuels', question: 'Q1', quotes: [
          { id: 'a1', text: 'x', candidateToken: 'tokA', topicKey: 'k1' },
          { id: 'a2', text: 'y', candidateToken: 'tokB', topicKey: 'k1' },
        ] },
        { topicKey: 'k2', title: 'Housing', question: 'Q2', quotes: [
          { id: 'b1', text: 'x', candidateToken: 'tokA', topicKey: 'k2' },
          { id: 'b2', text: 'y', candidateToken: 'tokB', topicKey: 'k2' },
        ] },
      ],
    };
    const st = useReadRankStore.getState();
    st.selectRace(p);
    st.confirmIssueSelection();
    for (const quote of st.getCurrentRaceProgress()!.topics.k1.quotesToEvaluate) st.disagree(quote);
    st.revealBallot();
    st.goToHub();
    st.selectRace(p, { office: 'Governor', seat: null, state: 'CA', rankableTopicCount: 2 });

    render(<IssueSelection />);
    // Done topic shows a ranked marker and is not a toggle.
    expect(screen.getByTestId('issue-done-k1')).toBeTruthy();
    // Deselect the remaining topic -> footer becomes "See your ballot".
    st.setSelectedTopics([]); // simulate deselecting k2 (k1 is done, not toggleable)
    render(<IssueSelection />);
    expect(screen.getByRole('button', { name: /see your ballot/i })).toBeTruthy();
  });
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/components/__tests__/IssueSelection.test.tsx`
Expected: FAIL — no `issue-done-k1` marker; no "See your ballot" button.

- [ ] **Step 7: Implement the hub in `IssueSelection.tsx`**

Add imports:

```ts
import { isTopicDone } from '../utils/raceProgressState';
```

Extend `topicData` (currently `:15-27`) so each row knows if it is done. Replace the `.map` body's return object with:

```ts
      return {
        topicKey: topic.topicKey,
        title: topic.title,
        quoteCount: topic.quotesToEvaluate.length,
        isScored: uniqueTokens.size > 1,
        isDone: isTopicDone(topic),
      };
```

After `const selectedKeys = ...` (currently `:33`), derive re-entry state and the undone-selection count:

```ts
  const isReentry = topicData.some((t) => t.isScored && t.isDone);
  const selectedUndoneScorable = topicData
    .filter((t) => t.isScored && !t.isDone && selectedKeys.includes(t.topicKey))
    .length;
```

Pull `setPhase` from the store alongside the existing actions (currently `:8`):

```ts
  const { getCurrentRaceProgress, setSelectedTopics, confirmIssueSelection, setPhase } = useReadRankStore();
```

In the `topicData.map` render (currently `:70-108`), before the scorable toggle branch, add a done branch so done topics render locked:

```ts
          if (topic.isScored && topic.isDone) {
            return (
              <motion.div key={topic.topicKey} className="issue-row issue-row-done" data-testid={`issue-done-${topic.topicKey}`}
                {...m.enter({ y: 10 })}
                transition={m.transition(DUR.base, EASE.settle, { delay: i * (STAGGER.gridCell / 1000) })}>
                <span className="issue-check-tile issue-check-tile-selected" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--action-primary-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <span className="issue-topic-name">{topic.title}</span>
                <span className="issue-not-scored-label">RANKED</span>
              </motion.div>
            );
          }
```

Update the subtitle to be re-entry aware (currently `:65-67`):

```ts
      <p className="issue-selection-subtitle">
        {isReentry
          ? 'Pick up where you left off — ranked issues are marked. Add more, or see your ballot.'
          : 'Every issue keeps its own ranking. Rank them all, or just the ones you care about.'}
      </p>
```

Replace the footer button (currently `:111-123`) so that, on re-entry with no new selection, it routes to the ballot instead of forcing a pick:

```ts
      <div className="issue-selection-footer">
        {isReentry && selectedUndoneScorable === 0 ? (
          <button
            type="button"
            className="ev-button-primary"
            style={{ width: '100%', maxWidth: '28rem', fontSize: '1rem', padding: '0.875rem 1.5rem' }}
            onClick={() => setPhase('results')}
          >
            See your ballot
          </button>
        ) : (
          <button
            type="button"
            className="ev-button-primary"
            style={{ width: '100%', maxWidth: '28rem', fontSize: '1rem', padding: '0.875rem 1.5rem' }}
            disabled={selectedUndoneScorable === 0}
            onClick={handleConfirm}
          >
            {selectedUndoneScorable === 0
              ? 'Select at least one issue'
              : `Start · ${totalSelectedQuotes} quotes · about ${estimatedMinutes} min`}
          </button>
        )}
      </div>
```

Note: `selectedScorableCount`/`totalSelectedQuotes`/`estimatedMinutes` (currently `:35-43`) still power the fresh-entry CTA; leave them. `handleConfirm` (`:52-60`) is unchanged.

- [ ] **Step 8: Add the `issue-row-done` style**

Append to the stylesheet that defines `.issue-row-unscored` (find it):

Run: `grep -rln "issue-row-unscored" src`

Then in that file, after the `.issue-row-unscored` rule, add:

```css
.issue-row-done { opacity: 0.72; cursor: default; }
.issue-row-done .issue-not-scored-label { color: var(--text-link); }
```

- [ ] **Step 9: Run the component + store tests**

Run: `npx vitest run src/components/__tests__/IssueSelection.test.tsx src/store/__tests__/issueSelection.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/IssueSelection.tsx src/store/useReadRankStore.ts src/components/__tests__/IssueSelection.test.tsx src/store/__tests__/issueSelection.test.ts
git commit -m "feat(hub): issue-selection doubles as re-entry hub with done markers and ballot escape"
```

---

## Task 5: Reveal surface — completion-aware exits

**Files:**
- Modify: `src/components/ResultsPhase.tsx`
- Test: `src/components/__tests__/ResultsPhase.test.tsx`

A mid-race reveal must offer "← Back to your topics" (routes to the hub) so it is not a dead end; a complete race keeps "Play another race near you" and adds a subtle "Review a topic" link back to the hub.

- [ ] **Step 1: Write the failing test**

Add to `src/components/__tests__/ResultsPhase.test.tsx` (mirror its existing setup — it already seeds a race and calls `revealBallot()` after Task 2). Add:

```ts
  it('offers a way back to topics when the race is not complete', async () => {
    // Seed a 2-topic race with only topic 1 finished, then reveal.
    // (Reuse this file's existing race-seeding helper; finish only k1.)
    // ...seed + finishTopic('k1') + revealBallot() per the helper in this file...
    render(<ResultsPhase />);
    expect(await screen.findByRole('button', { name: /back to your topics/i })).toBeTruthy();
  });
```

If the file has no shared seeding helper, seed inline exactly as in `raceCompletion.test.ts` (payload + `finishTopic`), calling `useReadRankStore.getState().revealBallot()` before `render`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/__tests__/ResultsPhase.test.tsx`
Expected: FAIL — only "Play another race near you" is rendered.

- [ ] **Step 3: Implement completion-aware exits in `ResultsPhase.tsx`**

Add imports:

```ts
import { isRaceComplete } from '../utils/raceProgressState';
```

Pull `setPhase` from the store destructure (currently `:16`):

```ts
  const { goToHub, setPhase, currentRaceId, getRaceVerdicts, getCurrentRaceProgress } = useReadRankStore();
```

After `const race = getCurrentRaceProgress();` (currently `:20`), derive completion:

```ts
  const complete = isRaceComplete(race ?? undefined, getActiveTopicKeys(race ?? ({} as never)).length || undefined);
```

Replace the primary exit block (currently `:125-131`) with:

```ts
      <motion.div className="flex flex-col items-center gap-3 pt-6"
        {...m.enter({ y: 12 })}
        transition={m.transition(DUR.moderate, EASE.settle, { delay: (timeline.cardDelay(ballot.length) + DUR.moderate) / 1000 })}>
        {!complete && (
          <button onClick={() => setPhase('issue-selection')} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
            ← Back to your topics
          </button>
        )}
        <button
          onClick={() => { track('readrank_play_again_clicked'); goToHub(); }}
          className={complete ? 'ev-button-primary' : 'ev-button-secondary'}
          style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}
        >
          Play another race near you
        </button>
        {complete && (
          <button onClick={() => setPhase('issue-selection')} className="ev-button-link" style={{ fontSize: '0.8125rem' }}>
            Review a topic
          </button>
        )}
      </motion.div>
```

Also update the empty-ballot branch (currently `:87-91`): when the race is not complete, its single button should route back to topics rather than the hub. Replace that button with:

```ts
          <button onClick={() => (complete ? goToHub() : setPhase('issue-selection'))} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
            {complete ? 'Play another race near you' : '← Back to your topics'}
          </button>
```

Note: `getActiveTopicKeys` is already imported (`:5`). If `ev-button-link` is not an existing class, use `ev-button-secondary` instead — check with `grep -rn "ev-button-link" src`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/__tests__/ResultsPhase.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultsPhase.tsx src/components/__tests__/ResultsPhase.test.tsx
git commit -m "feat(reveal): completion-aware exits so a partial ballot returns to topics"
```

---

## Task 6: Progress parity in Browse

**Files:**
- Modify: `src/components/RaceBrowse.tsx`
- Modify: `src/components/RaceHub.tsx` (`:208`, `renderCard` `:126`)
- Test: `src/components/__tests__/RaceBrowse.test.tsx`

`RaceBrowse` currently builds `RaceCard`s with no progress props, so search/browse results never show a status. Pass the `raceProgress` map in and derive labels with the shared `raceCardProgress` helper.

- [ ] **Step 1: Write the failing test**

Add to `src/components/__tests__/RaceBrowse.test.tsx` (mirror its existing render pattern; it renders `<RaceBrowse races={...} .../>`). Add a case:

```ts
  it('renders a progress label for a started race', () => {
    const races = [/* one RaceSummary with raceId 'r1', rankableTopicCount: 4, ... */];
    const raceProgress = {
      r1: {
        raceId: 'r1', positionName: 'Governor', topics: {
          t: { topicKey: 't', title: 'T', question: 'Q',
               quotesToEvaluate: [
                 { id: '1', text: 'x', candidateToken: 'a', topicKey: 't' },
                 { id: '2', text: 'y', candidateToken: 'b', topicKey: 't' },
               ],
               currentIndex: 2, disagreed: [
                 { id: '1', text: 'x', candidateToken: 'a', topicKey: 't' },
                 { id: '2', text: 'y', candidateToken: 'b', topicKey: 't' },
               ], agreed: [] },
        }, topicOrder: ['t'], currentTopicKey: 't', phase: 'evaluation' as const, completed: false,
      },
    };
    render(<RaceBrowse races={races} counties={{}} onSelect={() => {}} initial={null} raceProgress={raceProgress} />);
    // 1 topic done of 4 rankable -> "Continue · 1 of 4 topics"
    expect(screen.getByText(/continue · 1 of 4 topics/i)).toBeTruthy();
  });
```

Fill the `races` array with a minimal valid `RaceSummary` (copy the shape from the existing tests in this file: `raceId: 'r1', office: 'Governor', electionName: '', electionDate: null, state: 'CA', jurisdictionLevel: 'state', candidateCount: 2, topicCount: 4, rankableTopicCount: 4, isLocal: false`).

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/__tests__/RaceBrowse.test.tsx`
Expected: FAIL — `raceProgress` is not a prop; no status text rendered.

- [ ] **Step 3: Add the prop and render progress in `RaceBrowse.tsx`**

Extend imports:

```ts
import type { RaceSummary, CountyIndex } from '../data/api';
import type { RaceProgress } from '../store/useReadRankStore';
import { raceCardProgress } from '../utils/raceProgressState';
```

Extend `RaceBrowseProps`:

```ts
interface RaceBrowseProps {
  races: RaceSummary[];
  counties: CountyIndex;
  onSelect: (race: RaceSummary) => void;
  initial: BrowseTarget | { state: string; geoid: null } | null;
  disabled?: boolean;
  /** Per-race progress for the status badge (parity with the hub cards). */
  raceProgress?: Record<string, RaceProgress>;
}
```

Add `raceProgress` to the destructure:

```ts
export const RaceBrowse: React.FC<RaceBrowseProps> = ({ races, counties, onSelect, initial, disabled, raceProgress }) => {
```

In the card `.map` (currently `:136-148`), derive and pass progress:

```ts
            {section.races.map((r, i) => {
              const { tier, scope } = deriveTierScope(r);
              const { progress, label } = raceCardProgress(raceProgress?.[r.raceId], r.rankableTopicCount ?? r.topicCount);
              return (
                <RaceCard
                  key={r.raceId}
                  office={r.office} tier={tier} scope={scope} state={r.state} seat={r.seat ?? null}
                  electionDate={r.electionDate} boundaryRef={r.boundaryRef ?? null} frameRef={r.frameRef ?? null}
                  candidateCount={r.candidateCount} topicCount={r.rankableTopicCount ?? r.topicCount}
                  estMinutes={estimateMinutes({ quoteCount: r.quoteCount, candidateCount: r.candidateCount, topicCount: r.topicCount })}
                  progress={progress} progressLabel={label}
                  disabled={disabled} onSelect={() => onSelect(r)} enterIndex={i}
                />
              );
            })}
```

- [ ] **Step 4: Pass `raceProgress` from `RaceHub` and de-duplicate its own derivation**

In `src/components/RaceHub.tsx`, pass the map to `RaceBrowse` (currently `:208-215`):

```ts
        <RaceBrowse
          key={`${browseTarget.state}:${browseTarget.geoid ?? 'all'}`}
          races={races}
          counties={counties}
          onSelect={handleSelect}
          initial={browseTarget}
          disabled={starting !== null}
          raceProgress={raceProgress}
        />
```

Simplify `renderCard` (currently `:126-136`) to use the shared helper so the hub and browse can't drift:

```ts
  const renderCard = useCallback((race: RaceSummary, enterIndex?: number) => {
    const { progress, label } = raceCardProgress(raceProgress[race.raceId], race.rankableTopicCount);
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
        progressLabel={label}
        disabled={starting !== null}
        onSelect={() => handleSelect(race)}
        enterIndex={enterIndex}
      />
    );
  }, [raceProgress, starting, handleSelect]);
```

If `deriveProgressState`/`progressLabel` are now unused in `RaceHub.tsx`, drop them from the import, keeping `raceCardProgress` (and `isRaceComplete` from Task 2). Confirm with:

Run: `grep -n "deriveProgressState\|progressLabel\|ProgressState" src/components/RaceHub.tsx`

- [ ] **Step 5: Run the browse + hub tests**

Run: `npx vitest run src/components/__tests__/RaceBrowse.test.tsx src/components/__tests__/RaceHub.test.tsx`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/RaceBrowse.tsx src/components/RaceHub.tsx src/components/__tests__/RaceBrowse.test.tsx
git commit -m "feat(browse): show race progress badges in search/browse, matching the hub"
```

---

## Task 7: Record the invariant evolution in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the "Two text layers" invariant**

In `CLAUDE.md`, under "Invariants this app relies on", replace the parenthetical in the **Two text layers** bullet that reads "all provenance debuts at the reveal" context so it reflects per-topic reveal. Add a sentence to the **Blindness is structural** bullet:

```md
- **Blindness is structural.** The evaluation payload carries only blind quote fields
  (`id`, `text`, `candidateToken`, `topicKey`) — no source, party, or candidate name. See the
  rebuild guard in `src/data/api.ts` (`fetchRaceQuotes`). Provenance debuts **per topic** at each
  topic's reveal (the combined ballot grows as topics are ranked), not once per race; the blind
  card never shows attribution and `candidateToken` is never surfaced in the UI, so ranking stays
  blind for topics not yet revealed.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record per-topic reveal as the blindness invariant's current form"
```

---

## Final verification

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 3: Manual smoke via the dev server (browser preview)**

Start the dev server and walk the flow: enter a race → pick 1 of ≥2 topics → finish it → confirm the reveal CTA says "Reveal ballot" (not "See your full ballot") → reveal → confirm "← Back to your topics" appears → back to hub → confirm the done topic shows "RANKED" and the main-page card shows "Continue · 1 of N topics" → finish the rest → confirm "See your full ballot" → combined summary → re-enter → lands on the ballot, card shows "Completed".

---

## Self-Review Notes (author)

- **Spec coverage:** revealBallot-not-completion (T2), derived completion (T1/T2), re-entry routing partial→hub / complete→ballot (T2), issue-selection as hub with done markers + ballot escape (T4), reveal CTA labels + race-wide gate (T3), ResultsPhase back-to-topics (T5), hub label "Continue · N of M" against rankable count + Browse parity (T1/T6), stale `completed` migration via derivation (T1, verified in test), analytics `resumed_completed` fix (T2), blindness-invariant doc (T7). All spec sections mapped.
- **Type consistency:** helpers named `isTopicDone`, `isTopicScorable`, `isRaceComplete`, `raceCardProgress` are defined in T1 and used with those exact names in T2/T3/T4/T6. `revealBallot` defined in T2, referenced in T3/T4/T5 tests. `meta.rankableTopicCount` added in T2 and passed from RaceHub in T2.
- **Known follow-up (out of scope):** re-viewing an individual done topic's slice from the hub is not wired (done rows are display-only); the combined ballot already shows all done topics. Flagged in the spec's out-of-scope.
