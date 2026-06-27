# Reveal Redesign Implementation Plan (Motion System — Plan 3 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the signature "final tally" reveal choreography to `ResultsPhase` — insight strip rises, the alignment grid assembles with minted medals that pop and gleam cell-by-cell, candidate cards cascade in top-down with layered per-element landing and a counting agreement number, and the kept `megaBurst` + a gold/ev-yellow spotlight crown the #1 — all reduced-motion-aware through `useMotion()`.

**Architecture:** A single deterministic timeline (`computeRevealTimeline`, a pure util) computes absolute ms delays for every stage from the number of filled grid cells. `ResultsPhase` owns that timeline and a `spotlightActive` flag flipped by ONE `setTimeout` when the #1 card lands. Framer's `transition.delay` drives the *visual* entrances (insight, frame, medal pops, card landings); JS timers (`setTimeout`/`setInterval`) drive the *deterministic* triggers (count-up, spotlight glow, particle burst) so they survive the headless preview's rAF throttle. The metallic medal look is a `TierIcon`-level treatment (consistent everywhere a medal appears); the one-time gleam sweep and the spotlight glow are reveal-only, gated on props. When `useMotion().reduced` is true the timeline collapses to all-zero, medals are minted-but-static, numbers render at final value, and no cascade/gleam/glow/burst plays.

**Tech Stack:** React + TypeScript, framer-motion (via the `useMotion()` hook + `EASE`/`DUR`/`STAGGER` tokens in `src/motion.ts`), CSS keyframes + custom props in `src/index.css`, Vitest + @testing-library/react.

**Layout order is FROZEN (spec §4.1):** position heading → insight strip → alignment grid → candidate (ballot) list → tail. This plan only ADDS motion to that order; it never reorders.

---

## Key design decisions (flagged for review)

1. **Minted/metallic medals are GLOBAL** (spec §1, §4 step 3: "TierIcon-level treatment so it's consistent wherever a medal appears"). The gradient + inset-highlight look therefore also changes the tier tiles shown in `RankList`, `RankRail`, and the per-topic breakdown — not just the reveal grid. The one-time **gleam sweep** and the **spotlight glow** remain reveal-only (prop-gated). If a reveal-only minted look is wanted instead, narrow Task 3 to a `minted` prop.
2. **Spotlight grid glow targets the #1 candidate's Diamond cell(s)** (spec §4 step 5: "the candidate's Diamond cell in the grid glows ev-yellow"). A candidate may be the user's #1 on more than one topic → more than one Diamond cell in that row; all Diamond cells in the #1 row glow. If the #1 candidate has no Diamond cell, the badge gleam + burst still fire (no grid glow). 
3. **`RevealCard`/`RevealBoard` are removed** (spec §4.2): they are imported only by their own test files, so they are dead in-app. Removing them (and their two test files) reduces the suite below 215 tests by design — this is expected, not a regression.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `src/utils/revealTimeline.ts` (new) | Pure timeline math: filled-cell count + reduced flag → absolute ms delays per stage. | 1 |
| `src/utils/__tests__/revealTimeline.test.ts` (new) | Unit tests for the timeline. | 1 |
| `src/utils/countUp.ts` (new) | Pure `countUpValue` + `useCountUp` hook (timer-driven, reduced-aware). | 2 |
| `src/utils/__tests__/countUp.test.tsx` (new) | Unit tests for count-up. | 2 |
| `src/components/TierIcon.tsx` (modify) | Minted gradient + inset highlight; optional `gleam`/`gleamDelayMs` sweep element. | 3 |
| `src/index.css` (modify) | Minted tile gradients, gleam keyframe, badge gleam, diamond-glow keyframe; tokenize `megaBurst` ease. | 3,5,7 |
| `src/components/ResultsPhase.tsx` (modify) | `useMotion()` conversion, master timeline + `spotlightActive` clock, heading/insight entrances, wiring grid + cards, a11y announcement. | 4,6,7,8 |
| `src/components/AlignmentGrid.tsx` (modify) | Frame-settle + per-cell medal pop + gleam + spotlight diamond glow (prop-gated; static by default). | 5 |
| `src/components/RevealCard.tsx`, `RevealBoard.tsx` + their tests (delete) | Dead unmask components, removed per spec §4.2. | 9 |

---

## Task 1: Reveal timeline util (pure, unit-tested)

**Files:**
- Create: `src/utils/revealTimeline.ts`
- Test: `src/utils/__tests__/revealTimeline.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/__tests__/revealTimeline.test.ts
import { describe, it, expect } from 'vitest';
import { computeRevealTimeline } from '../revealTimeline';

describe('computeRevealTimeline', () => {
  it('collapses every value to 0 when reduced', () => {
    const t = computeRevealTimeline({ filledCells: 12, reduced: true });
    expect(t.heading).toBe(0);
    expect(t.insight).toBe(0);
    expect(t.gridFrame).toBe(0);
    expect(t.medalsStart).toBe(0);
    expect(t.cascadeStart).toBe(0);
    expect(t.firstLand).toBe(0);
    expect(t.medalDelay(5)).toBe(0);
    expect(t.cardDelay(3)).toBe(0);
  });

  it('orders the stages top-down when not reduced', () => {
    const t = computeRevealTimeline({ filledCells: 6, reduced: false });
    expect(t.heading).toBeLessThan(t.insight);
    expect(t.insight).toBeLessThan(t.gridFrame);
    expect(t.gridFrame).toBeLessThan(t.medalsStart);
    expect(t.medalsStart).toBeLessThan(t.cascadeStart);
    expect(t.cascadeStart).toBeLessThan(t.firstLand);
  });

  it('staggers medals by 90ms and cards by 420ms from their bases', () => {
    const t = computeRevealTimeline({ filledCells: 6, reduced: false });
    expect(t.medalDelay(0)).toBe(t.medalsStart);
    expect(t.medalDelay(2) - t.medalDelay(1)).toBe(90);
    expect(t.cardDelay(0)).toBe(t.cascadeStart);
    expect(t.cardDelay(2) - t.cardDelay(1)).toBe(420);
  });

  it('pushes the cascade later when there are more medals to assemble', () => {
    const few = computeRevealTimeline({ filledCells: 1, reduced: false });
    const many = computeRevealTimeline({ filledCells: 20, reduced: false });
    expect(many.cascadeStart).toBeGreaterThan(few.cascadeStart);
  });

  it('treats 0 filled cells as 1 so the cascade still starts', () => {
    const t = computeRevealTimeline({ filledCells: 0, reduced: false });
    expect(Number.isFinite(t.cascadeStart)).toBe(true);
    expect(t.cascadeStart).toBeGreaterThan(t.medalsStart);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/revealTimeline.test.ts`
Expected: FAIL — "Failed to resolve import '../revealTimeline'".

- [ ] **Step 3: Write the implementation**

```ts
// src/utils/revealTimeline.ts
import { DUR, STAGGER } from '../motion';

/**
 * Absolute (ms-from-results-mount) delays for each stage of the reveal
 * choreography. Derived purely from how many medals must assemble, so the
 * candidate cascade always begins after the grid finishes building. When the
 * user prefers reduced motion every value collapses to 0 (render-at-once).
 */
export interface RevealTimeline {
  /** Position heading enters. */
  heading: number;
  /** Insight strip rises into place. */
  insight: number;
  /** Alignment-grid frame settles in. */
  gridFrame: number;
  /** First medal pops (frame already settled). */
  medalsStart: number;
  /** Candidate card #1 begins its landing. */
  cascadeStart: number;
  /** #1 spotlight + particle burst fire (card #1 has landed). */
  firstLand: number;
  /** Delay for the medal at filled-cell order index `i` (0-based). */
  medalDelay(i: number): number;
  /** Delay for the candidate card at rank index `i` (0-based). */
  cardDelay(i: number): number;
}

export function computeRevealTimeline(opts: {
  filledCells: number;
  reduced: boolean;
}): RevealTimeline {
  if (opts.reduced) {
    const zero = () => 0;
    return {
      heading: 0, insight: 0, gridFrame: 0, medalsStart: 0,
      cascadeStart: 0, firstLand: 0, medalDelay: zero, cardDelay: zero,
    };
  }

  const heading = 0;
  const insight = 120;
  const gridFrame = insight + DUR.moderate;          // frame settles after insight lands
  const medalsStart = gridFrame + DUR.base;          // then medals begin popping
  const cells = Math.max(opts.filledCells, 1);
  const medalsEnd = medalsStart + (cells - 1) * STAGGER.gridCell + DUR.moderate;
  const cascadeStart = medalsEnd + 120;              // small breath, then candidates
  const firstLand = cascadeStart + DUR.moderate;     // #1 has visibly landed

  return {
    heading, insight, gridFrame, medalsStart, cascadeStart, firstLand,
    medalDelay: (i) => medalsStart + i * STAGGER.gridCell,
    cardDelay: (i) => cascadeStart + i * STAGGER.cascade,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/revealTimeline.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/revealTimeline.ts src/utils/__tests__/revealTimeline.test.ts
git commit -m "feat(reveal): pure timeline util for the tally choreography

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Count-up utility (pure value + timer hook, unit-tested)

**Files:**
- Create: `src/utils/countUp.ts`
- Test: `src/utils/__tests__/countUp.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/utils/__tests__/countUp.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { countUpValue, useCountUp } from '../countUp';

describe('countUpValue', () => {
  it('returns the target immediately for a non-positive duration', () => {
    expect(countUpValue(5, 0, 0)).toBe(5);
    expect(countUpValue(5, 0, -10)).toBe(5);
  });

  it('ramps 0 → target linearly and rounds', () => {
    expect(countUpValue(10, 0, 100)).toBe(0);
    expect(countUpValue(10, 50, 100)).toBe(5);
    expect(countUpValue(10, 100, 100)).toBe(10);
  });

  it('clamps past the end and before the start', () => {
    expect(countUpValue(10, 999, 100)).toBe(10);
    expect(countUpValue(10, -5, 100)).toBe(0);
  });
});

describe('useCountUp', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the target instantly when reduced', () => {
    const { result } = renderHook(() => useCountUp(7, { durationMs: 400, reduced: true }));
    expect(result.current).toBe(7);
  });

  it('starts at 0 and reaches the target after the duration elapses', () => {
    const { result } = renderHook(() => useCountUp(8, { durationMs: 300, reduced: false }));
    expect(result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/countUp.test.tsx`
Expected: FAIL — "Failed to resolve import '../countUp'".

- [ ] **Step 3: Write the implementation**

```ts
// src/utils/countUp.ts
import { useEffect, useRef, useState } from 'react';

/** Value at `elapsed` ms into a `duration` ms linear ramp from 0 to `target`. */
export function countUpValue(target: number, elapsed: number, duration: number): number {
  if (duration <= 0) return target;
  const p = Math.min(1, Math.max(0, elapsed / duration));
  return Math.round(target * p);
}

/**
 * Animates 0 → `target` over `durationMs` using timer steps (NOT
 * requestAnimationFrame — the headless preview throttles rAF). Returns the
 * final value immediately when reduced or when the duration is non-positive.
 */
export function useCountUp(
  target: number,
  opts: { durationMs: number; reduced: boolean; startDelayMs?: number }
): number {
  const { durationMs, reduced, startDelayMs = 0 } = opts;
  const [value, setValue] = useState(reduced || durationMs <= 0 ? target : 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduced || durationMs <= 0) {
      setValue(target);
      return;
    }
    setValue(0);
    const step = 30;
    let elapsed = 0;
    const startTimer = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        elapsed += step;
        setValue(countUpValue(target, elapsed, durationMs));
        if (elapsed >= durationMs && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, step);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [target, durationMs, reduced, startDelayMs]);

  return value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/countUp.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/countUp.ts src/utils/__tests__/countUp.test.tsx
git commit -m "feat(reveal): timer-driven count-up util for agreement numbers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Minted/metallic TierIcon treatment + gleam element

Gives every medal a minted look (gradient + inset highlight), moving the per-tier color from an inline `backgroundColor` to CSS classes that already exist on the tile (`tier-tile-${tier}`). Adds an optional one-time gleam sweep element driven by a delay prop. **Verification:** the minted look and gleam are browser-verified (Task 5/in-browser step); the existing `TierIcon.test.tsx` (asserts tile/icon classes) stays green and is the unit guard for structure.

**Files:**
- Modify: `src/components/TierIcon.tsx`
- Modify: `src/index.css` (tile gradients + gleam keyframe)
- Test (unchanged, must stay green): `src/components/__tests__/TierIcon.test.tsx`

- [ ] **Step 1: Replace TierIcon's inline color with classes + add the gleam element**

Replace the whole file `src/components/TierIcon.tsx` with:

```tsx
import React from 'react';
import type { Tier } from '../utils/tiers';

export interface TierIconProps {
  tier: Tier;
  size?: number;
  /** Play a one-time metallic sheen sweep across the tile (reveal grid only). */
  gleam?: boolean;
  /** ms to delay the gleam sweep so it lands as the medal settles. */
  gleamDelayMs?: number;
}

/**
 * Decorative tier glyphs (REDESIGN_SPEC §3.4): a minted metallic tile with a
 * white icon inside. The per-tier gradient + inset highlight live in CSS
 * (`.tier-tile-${tier}`). Always paired with a visible text label — the icon
 * alone never carries the tier. Optionally plays a one-time gleam sweep.
 */
export const TierIcon: React.FC<TierIconProps> = ({ tier, size = 14, gleam = false, gleamDelayMs = 0 }) => {
  const radius = Math.round(size * 0.3);
  const iconSize = Math.round(size * 0.7);

  const common = {
    width: iconSize,
    height: iconSize,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'white',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: `tier-icon tier-icon-${tier}`,
  };

  const icon = (() => {
    switch (tier) {
      case 'diamond':
        return (
          <svg {...common}>
            <path d="M7 3h10l4 6-9 12L3 9l4-6z" />
            <path d="M3 9h18M9.5 3 12 9l2.5-6M12 21 9.5 9M12 21l2.5-12" strokeWidth="1.25" />
          </svg>
        );
      case 'gold':
        return (
          <svg {...common}>
            <circle cx="12" cy="14" r="7" />
            <path d="M8.5 2.5 11 7.5M15.5 2.5 13 7.5" />
            <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" stroke="none">2</text>
          </svg>
        );
      case 'silver':
        return (
          <svg {...common}>
            <circle cx="12" cy="14" r="7" />
            <path d="M8.5 2.5 11 7.5M15.5 2.5 13 7.5" />
            <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" stroke="none">3</text>
          </svg>
        );
      case 'bronze':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
          </svg>
        );
      case 'disagreed':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="9" />
            <path d="M5.6 5.6l12.8 12.8" />
          </svg>
        );
    }
  })();

  return (
    <span
      aria-hidden="true"
      className={`tier-tile tier-tile-${tier}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
      }}
    >
      {icon}
      {gleam && (
        <span className="tier-gleam-sweep" aria-hidden="true" style={{ animationDelay: `${gleamDelayMs}ms` }} />
      )}
    </span>
  );
};
```

Note: the inline `backgroundColor` and the `TILE_COLORS` map are removed — color now comes from the CSS classes added in Step 2.

- [ ] **Step 2: Add minted gradients + gleam CSS**

In `src/index.css`, replace the `/* Tier tile wrappers ... */` block (the line `.tier-tile { flex-shrink: 0; }` near line 1193) with:

```css
/* Tier tile wrappers — minted metallic tiles housing white icons */
.tier-tile {
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.55), inset 0 -1px 2px rgba(0, 0, 0, 0.28);
}

.tier-tile-diamond  { background: linear-gradient(145deg, #8fd3ff 0%, #4a90e2 52%, #2f6fc0 100%); }
.tier-tile-gold     { background: linear-gradient(145deg, #ffe27a 0%, #f3b73b 52%, #c98a16 100%); }
.tier-tile-silver   { background: linear-gradient(145deg, #d7e0e6 0%, #9fb3bd 52%, #6f8693 100%); }
.tier-tile-bronze   { background: linear-gradient(145deg, #d7a878 0%, #b07d4c 52%, #875b30 100%); }
.tier-tile-disagreed{ background: linear-gradient(145deg, #9aa2ab 0%, #6b7280 52%, #4b5159 100%); }

/* One-time metallic sheen sweep (reveal grid medals). */
.tier-gleam-sweep {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 55%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.9), transparent);
  transform: translateX(-160%) skewX(-18deg);
  animation: tier-gleam var(--dur-moderate) var(--ease-standard) forwards;
  pointer-events: none;
}

@keyframes tier-gleam {
  0%   { transform: translateX(-160%) skewX(-18deg); opacity: 0; }
  35%  { opacity: 0.9; }
  100% { transform: translateX(260%) skewX(-18deg); opacity: 0; }
}
```

(The `@media (prefers-reduced-motion: reduce)` block already neutralizes the `tier-gleam` animation duration as a CSS backstop; the gleam element is additionally never rendered when reduced because callers pass `gleam={false}`.)

- [ ] **Step 3: Run the TierIcon test + build to verify no regression**

Run: `npx vitest run src/components/__tests__/TierIcon.test.tsx && npm run build`
Expected: TierIcon tests PASS (5), build succeeds.

- [ ] **Step 4: In-browser visual check (minted look, no gleam yet)**

Launch `read-rank-dev` (port 5180). Reach the reveal: Past tab → Indiana Governor → judge a few quotes → "Reveal my ballot". Confirm the alignment-grid tiles and per-topic tier tiles now look minted (gradient + soft inset highlight) and icons remain legible. Screenshot for the review.

- [ ] **Step 5: Commit**

```bash
git add src/components/TierIcon.tsx src/index.css
git commit -m "feat(reveal): minted metallic medals with optional gleam sweep

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: ResultsPhase scaffolding — useMotion, master clock, heading + insight entrances

Converts `ResultsPhase` to `useMotion()`, tokenizes every inline magic number in the results/empty/loading paths, builds the master timeline + `spotlightActive` clock, and animates the heading and insight strip. The grid and cards are still passed their existing props in this task (their assemble/cascade lands in Tasks 5–6) — but the timeline values they will consume are computed and threaded now.

**Files:**
- Modify: `src/components/ResultsPhase.tsx`

- [ ] **Step 1: Update imports**

In `src/components/ResultsPhase.tsx`, replace:

```tsx
import { motion, useReducedMotion } from 'framer-motion';
```

with:

```tsx
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import { computeRevealTimeline } from '../utils/revealTimeline';
import { useCountUp } from '../utils/countUp';
```

(`STAGGER`/`useCountUp` are consumed by the BallotCard rewrite in Task 6 but are imported here so the import block is settled; if your linter flags them unused at this task, add them in Task 6 instead.)

- [ ] **Step 2: Replace the reduced-motion read + add the master clock in `ResultsPhase`**

In the `ResultsPhase` component, replace:

```tsx
  const prefersReducedMotion = useReducedMotion();
```

with:

```tsx
  const m = useMotion();
  const [spotlightActive, setSpotlightActive] = useState(false);
```

Then, immediately AFTER the existing `quoteRankMap` `useMemo` (ends ~line 272) and BEFORE the `if (loading)` block, add:

```tsx
  const ballot = reveal?.ballot ?? [];

  const filledCells = useMemo(
    () => alignmentRows.reduce((n, r) => n + r.cells.filter(Boolean).length, 0),
    [alignmentRows]
  );
  const timeline = useMemo(
    () => computeRevealTimeline({ filledCells, reduced: m.reduced }),
    [filledCells, m.reduced]
  );

  // One deterministic trigger: flip the #1 spotlight on when card #1 lands.
  // setTimeout (not framer onAnimationComplete) so it survives the rAF throttle.
  useEffect(() => {
    if (stage !== 'results' || m.reduced || ballot.length === 0) return;
    const t = setTimeout(() => setSpotlightActive(true), timeline.firstLand);
    return () => clearTimeout(t);
  }, [stage, m.reduced, ballot.length, timeline.firstLand]);
```

Then DELETE the now-duplicated `const ballot = reveal?.ballot ?? [];` line that currently sits just after the `if (loading)` block (~line 287) — `ballot` is defined above now.

- [ ] **Step 3: Tokenize the loading spinner + empty-ballot path**

Replace the loading spinner's transition:

```tsx
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
```

(leave as-is — a perpetual loading spinner is an exempt affordance, not entrance motion.)

In the empty-ballot branch, replace the three inline-transition `motion.div`s so they read from `m`:

```tsx
        <motion.div className="text-center max-w-2xl mx-auto mb-5"
          {...m.enter({ y: 12 })} transition={m.transition(DUR.moderate)}>
```

```tsx
        <motion.div className="flex justify-center pt-6"
          {...m.enter({ y: 12 })} transition={m.transition(DUR.moderate, EASE.settle, { delay: m.reduced ? 0 : 0.4 })}>
```

- [ ] **Step 4: Animate the results heading + insight strip from the timeline**

In the final `return` (the results render), replace the heading wrapper:

```tsx
      <motion.div className="text-center max-w-2xl mx-auto mb-5"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
```

with:

```tsx
      <motion.div className="text-center max-w-2xl mx-auto mb-5"
        {...m.enter({ y: 12 })}
        transition={m.transition(DUR.moderate, EASE.settle, { delay: m.reduced ? 0 : timeline.heading / 1000 })}>
```

and replace the insight strip line:

```tsx
        {insight && <div className="insight-strip">{insight}</div>}
```

with:

```tsx
        {insight && (
          <motion.div className="insight-strip"
            {...m.enter({ y: 12 })}
            transition={m.transition(DUR.moderate, EASE.settle, { delay: m.reduced ? 0 : timeline.insight / 1000 })}>
            {insight}
          </motion.div>
        )}
```

Also replace the final "Play another race" wrapper transition (results path):

```tsx
        transition={{ delay: ballot.length * 0.08 + 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
```

with:

```tsx
        transition={m.transition(DUR.moderate, EASE.settle, { delay: m.reduced ? 0 : (timeline.cardDelay(ballot.length) + DUR.moderate) / 1000 })}>
```

and its `initial`/`animate` with `{...m.enter({ y: 12 })}`.

- [ ] **Step 5: Update the BallotCard call site (props threaded now, internals land in Task 6)**

Replace the ballot map:

```tsx
        {ballot.map((entry, i) => (
          <BallotCard key={entry.candidateId} entry={entry} index={i} verdictMap={verdictMap}
            address={locationFilter?.address} prefersReducedMotion={prefersReducedMotion}
            quoteRankMap={quoteRankMap} />
        ))}
```

with:

```tsx
        {ballot.map((entry, i) => (
          <BallotCard key={entry.candidateId} entry={entry} index={i} verdictMap={verdictMap}
            address={locationFilter?.address}
            landBaseDelayMs={timeline.cardDelay(i)}
            spotlight={entry.rank === 1 && spotlightActive}
            quoteRankMap={quoteRankMap} />
        ))}
```

This will not type-check until Task 6 changes `BallotCardProps`. To keep this task independently committable, ALSO update the `BallotCardProps` interface and the `prefersReducedMotion` usages in this task as a minimal shim: change the interface line `prefersReducedMotion: boolean | null;` to:

```tsx
  /** ms before this card begins its landing (from the reveal timeline). */
  landBaseDelayMs: number;
  /** True for the #1 card once it has landed: gold badge gleam + particle burst. */
  spotlight: boolean;
```

and inside `BallotCard`, replace `const rank = entry.rank;` region — add at the top of the component:

```tsx
  const m = useMotion();
```

then replace every `prefersReducedMotion` read in `BallotCard` with `m.reduced`, and replace the burst `useEffect` with the spotlight-driven version:

```tsx
  useEffect(() => {
    if (m.reduced || rank !== 1 || !spotlight) return;
    setParticles(true);
    const t = setTimeout(() => setParticles(false), DUR.burst + 200);
    return () => clearTimeout(t);
  }, [m.reduced, rank, spotlight]);
```

(The fuller layered landing + count-up is Task 6; this step only keeps the file compiling and green.)

- [ ] **Step 6: Run build + lint + full tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: build + lint clean; all existing tests still pass.

- [ ] **Step 7: In-browser check**

Reach the reveal. Confirm: heading and insight strip now rise/fade in (insight slightly after the heading); cards and grid still appear (un-choreographed for now); #1 burst still fires once. Toggle OS "Reduce motion" → everything renders at once, no burst. Screenshot both.

- [ ] **Step 8: Commit**

```bash
git add src/components/ResultsPhase.tsx
git commit -m "feat(reveal): useMotion conversion + master timeline clock; heading/insight entrances

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: AlignmentGrid assemble — frame settle, medal pops, gleam, spotlight glow

Adds the prop-gated assemble animation: the frame settles, then medals pop into each filled cell one at a time (`easeOvershoot`, `STAGGER.gridCell`) with a gleam sweep, and the #1 candidate's Diamond cell(s) glow ev-yellow once the spotlight is active. Outside the reveal (default props) the grid renders exactly as today. **Verification:** browser-verified visual; no new unit test (the existing render path is covered by integration of `ResultsPhase`). Reduced-motion behavior is asserted in Task 8.

**Files:**
- Modify: `src/components/AlignmentGrid.tsx`
- Modify: `src/index.css` (diamond-glow keyframe)

- [ ] **Step 1: Add the diamond-glow CSS**

In `src/index.css`, immediately after the `.alignment-grid-empty { ... }` rule (~line 1608), add:

```css
/* #1 spotlight — the top candidate's Diamond cell(s) pulse ev-yellow. */
.alignment-grid td.spotlight-diamond {
  position: relative;
  border-radius: 0.5rem;
  animation: diamond-glow 1.4s var(--ease-standard) 2;
}

@keyframes diamond-glow {
  0%   { box-shadow: inset 0 0 0 0 rgba(254, 209, 46, 0); }
  50%  { box-shadow: inset 0 0 0 3px rgba(254, 209, 46, 0.6); }
  100% { box-shadow: inset 0 0 0 0 rgba(254, 209, 46, 0); }
}
```

- [ ] **Step 2: Rewrite AlignmentGrid with the gated assemble**

Replace `src/components/AlignmentGrid.tsx` with:

```tsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TIER_META } from '../utils/tiers';
import { TierIcon } from './TierIcon';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import type { AlignmentRow, AlignmentTopic } from '../utils/alignmentGrid';

export interface AlignmentGridProps {
  topics: AlignmentTopic[];
  rows: AlignmentRow[];
  /** When true, the frame settles in and medals pop cell-by-cell with a gleam. Default: static. */
  animate?: boolean;
  /** ms before the frame settles (reveal timeline). */
  frameDelayMs?: number;
  /** ms before the first medal pops (reveal timeline). */
  medalBaseDelayMs?: number;
  /** Candidate whose Diamond cell(s) glow as the #1 spotlight. */
  spotlightCandidateId?: string | null;
  /** When true, the spotlight glow is active (the #1 card has landed). */
  spotlightActive?: boolean;
}

/**
 * Candidates × topics tier grid (REDESIGN_SPEC §1.6) — the "true alignment"
 * artifact. Colorblind-safe: each cell is icon + sr-only tier name, never
 * color alone. In the reveal (`animate`) the grid assembles: frame settles,
 * then minted medals pop in one at a time with a metallic gleam.
 */
export const AlignmentGrid: React.FC<AlignmentGridProps> = ({
  topics, rows, animate = false, frameDelayMs = 0, medalBaseDelayMs = 0,
  spotlightCandidateId = null, spotlightActive = false,
}) => {
  const m = useMotion();
  const play = animate && !m.reduced;

  // Filled-cell order index (row-major) so medals pop in reading order.
  const cellOrder = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    rows.forEach((r, ri) => r.cells.forEach((c, ci) => { if (c) map.set(`${ri}:${ci}`, n++); }));
    return map;
  }, [rows]);

  if (rows.length === 0 || topics.length === 0) return null;

  return (
    <motion.div className="alignment-grid-wrap"
      initial={play ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={play ? { duration: DUR.base / 1000, ease: EASE.settle, delay: frameDelayMs / 1000 } : { duration: 0 }}>
      <table className="alignment-grid">
        <caption className="sr-only">
          Your alignment by candidate and topic.&nbsp; Each cell is the tier your ranking gave
          that candidate's quote.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="alignment-grid-corner">Candidate</th>
            {topics.map((t) => (
              <th scope="col" key={t.key}>{t.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.candidateId}>
              <th scope="row">{row.name}</th>
              {row.cells.map((tier, ci) => {
                const isSpotlight =
                  spotlightActive && tier === 'diamond' && row.candidateId === spotlightCandidateId;
                const order = cellOrder.get(`${ri}:${ci}`) ?? 0;
                const medalDelay = medalBaseDelayMs + order * STAGGER.gridCell;
                return (
                  <td key={topics[ci].key}
                    className={isSpotlight ? 'spotlight-diamond' : undefined}
                    title={tier ? TIER_META[tier].name : 'Not judged'}>
                    {tier ? (
                      <>
                        <motion.span style={{ display: 'inline-flex' }}
                          initial={play ? { scale: 0.4, opacity: 0 } : false}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={play
                            ? { duration: DUR.moderate / 1000, ease: EASE.overshoot, delay: medalDelay / 1000 }
                            : { duration: 0 }}>
                          <TierIcon tier={tier} size={28} gleam={play} gleamDelayMs={medalDelay + 150} />
                        </motion.span>
                        <span className="sr-only">{TIER_META[tier].name}</span>
                      </>
                    ) : (
                      <span aria-hidden="true" className="alignment-grid-empty">·</span>
                    )}
                    {!tier && <span className="sr-only">Not judged</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};
```

- [ ] **Step 3: Wire the grid props in ResultsPhase**

In `src/components/ResultsPhase.tsx`, replace:

```tsx
        <AlignmentGrid topics={alignmentTopics} rows={alignmentRows} />
```

with:

```tsx
        <AlignmentGrid topics={alignmentTopics} rows={alignmentRows}
          animate
          frameDelayMs={timeline.gridFrame}
          medalBaseDelayMs={timeline.medalsStart}
          spotlightCandidateId={ballot[0]?.candidateId ?? null}
          spotlightActive={spotlightActive} />
```

- [ ] **Step 4: Run build + lint + tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: clean; all tests pass.

- [ ] **Step 5: In-browser check**

Reach the reveal. Confirm: the grid frame settles first, then medals pop in cell-by-cell (reading order) each with a quick metallic sheen; once the #1 card lands, the #1 candidate's Diamond cell(s) pulse ev-yellow ~twice. Reduced motion → medals minted but static, no pop/gleam/glow. Screenshot.

- [ ] **Step 6: Commit**

```bash
git add src/components/AlignmentGrid.tsx src/components/ResultsPhase.tsx src/index.css
git commit -m "feat(reveal): alignment grid assembles — frame settle, medal pops, gleam, #1 glow

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: BallotCard layered landing + count-up

Replaces the single card entrance with layered per-element motion (card rise → rank-badge pop → avatar slide+scale overshoot → name/office rise → evidence fade, sub-staggered per §2.1) and counts the agreement number up 0→N. The #1 burst + badge-gleam wiring already lives in the card from Task 4; this task adds the layering, the count-up, and the gold-badge gleam class.

**Files:**
- Modify: `src/components/ResultsPhase.tsx` (the `BallotCard` component)
- Modify: `src/index.css` (badge gleam)

- [ ] **Step 1: Add the badge-gleam CSS**

In `src/index.css`, immediately after the `.podium-rank-badge.rN { ... }` rule (~line 778), add:

```css
.podium-rank-badge { position: relative; overflow: hidden; }
.podium-rank-badge.gleam::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.85), transparent 70%);
  transform: translateX(-130%) skewX(-18deg);
  animation: badge-gleam 0.7s var(--ease-standard) forwards;
  pointer-events: none;
}
@keyframes badge-gleam {
  to { transform: translateX(130%) skewX(-18deg); }
}
```

- [ ] **Step 2: Rewrite the BallotCard body with layered landing + count-up**

In `src/components/ResultsPhase.tsx`, replace the `BallotCard` component's `return (...)` JSX (the outer `motion.div` and its children, lines ~86–212) with the version below. The component already has (from Task 4) `const m = useMotion();`, the spotlight-driven particle effect, and props `landBaseDelayMs` / `spotlight`. Add the count-up hook just before the `return`:

```tsx
  const { agreementCount, topicsWithAgreement } = entry.evidence;
  const displayCount = useCountUp(agreementCount, {
    durationMs: DUR.moderate,
    reduced: m.reduced,
    startDelayMs: landBaseDelayMs,
  });

  // Per-element landing delays (seconds), sub-staggered inside the card.
  const land = (subStaggerMs: number) =>
    m.transition(DUR.moderate, EASE.settle, { delay: m.reduced ? 0 : (landBaseDelayMs + subStaggerMs) / 1000 });
  const landPop = (subStaggerMs: number) =>
    m.transition(DUR.moderate, EASE.overshoot, { delay: m.reduced ? 0 : (landBaseDelayMs + subStaggerMs) / 1000 });
```

Then the JSX:

```tsx
  return (
    <motion.div
      className={podiumClass}
      style={{
        backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: '0.625rem', overflow: 'hidden', position: 'relative',
      }}
      initial={m.reduced ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={land(0)}
    >
      {!m.reduced && rank === 1 && <MegaParticles active={particles} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem' }}>
        <motion.span
          className={`${badgeClass}${spotlight && rank === 1 ? ' gleam' : ''}`}
          style={{ width: '2rem', height: '2rem', fontSize: '1rem' }}
          initial={m.reduced ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={landPop(STAGGER.badge)}
        >{rank}</motion.span>

        <motion.div
          initial={m.reduced ? false : { x: -12, scale: 0.85, opacity: 0 }}
          animate={{ x: 0, scale: 1, opacity: 1 }}
          transition={landPop(STAGGER.avatar)}
          style={{ flexShrink: 0, lineHeight: 0 }}
        >
          {entry.photo && imgOk ? (
            <img src={entry.photo} alt={entry.name} onError={() => setImgOk(false)} style={{ width: '3rem', height: '3rem', borderRadius: '9999px', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: '3rem', height: '3rem', borderRadius: '9999px', backgroundColor: 'var(--surface-raised)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: 'var(--text-tertiary)', fontFamily: "'Manrope', sans-serif", fontWeight: 700,
            }}>{initials}</div>
          )}
        </motion.div>

        <motion.div style={{ flex: 1, minWidth: 0 }}
          initial={m.reduced ? false : { y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={land(STAGGER.name)}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)' }}>
            {entry.name}
          </div>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {entry.office}
          </div>
        </motion.div>
      </div>

      {/* Factual evidence — no score, no % */}
      <motion.div style={{ padding: '0 1rem 0.75rem' }}
        initial={m.reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={land(STAGGER.evidence)}>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-strong)' }}>
          You agreed with <strong>{displayCount}</strong> of their position{agreementCount === 1 ? '' : 's'}
          {entry.perTopic.length > 0 && (
            <> · on <strong>{topicsWithAgreement}</strong> of {entry.perTopic.length} topic{entry.perTopic.length === 1 ? '' : 's'}</>
          )}
        </span>
      </motion.div>

      {/* Actions */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-sunken)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem',
      }}>
        {entry.perTopic.length > 0 ? (
          <button onClick={() => {
            setExpanded((e) => {
              if (!e) track('readrank_candidate_details_expanded', { candidate_id: entry.candidateId, rank });
              return !e;
            });
          }} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          }}>
            {expanded ? 'Hide' : 'See'} what they said
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        ) : <span />}
        <a href={buildEssentialsProfileUrl(entry.candidateId, verdictMap, undefined, address)} target="_blank" rel="noopener noreferrer"
          onClick={() => track('readrank_essentials_link_clicked', { candidate_id: entry.candidateId, rank })}
          style={{
            fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-link)',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap',
          }}>
          View on Essentials
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Per-topic breakdown */}
      {expanded && (
        <div style={{ padding: '0.75rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entry.perTopic.map((t) => (
            <div key={t.topicKey}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-heading)' }}>{t.title}</span>
                {t.userTopWinner && (
                  <span style={{
                    fontFamily: "'Manrope', sans-serif", fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--podium-silver)', border: '1px solid var(--border-subtle)',
                    padding: '0.0625rem 0.375rem', borderRadius: '9999px',
                  }}>Your #1 here</span>
                )}
              </div>
              {t.quotes.map((q) => {
                const rankIdx = quoteRankMap.get(q.quoteId);
                const tier = rankIdx !== undefined ? tierForIndex(rankIdx) : null;
                return (
                  <div key={q.quoteId} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                    margin: '0 0 0.375rem',
                    paddingLeft: '0.625rem',
                    borderLeft: `2px solid ${q.supported ? 'var(--agree)' : 'var(--border-medium)'}`,
                  }}>
                    {tier && <span style={{ flexShrink: 0 }}><TierIcon tier={tier} size={32} /></span>}
                    <p style={{
                      fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', lineHeight: 1.55, margin: 0,
                      color: q.supported ? 'var(--text-ink)' : 'var(--text-tertiary)',
                    }}>
                      &ldquo;{q.text}&rdquo;
                      {q.sourceName && (
                        <span style={{ marginLeft: '0.375rem' }}>
                          <SourceLine sourceName={q.sourceName} sourceUrl={q.sourceUrl} variant="compact" />
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
```

Note: the old `const { agreementCount, topicsWithAgreement } = entry.evidence;` line that sat in the original body is now declared in Step 2's count-up block — make sure it appears exactly once.

- [ ] **Step 3: Run build + lint + tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: clean; all tests pass.

- [ ] **Step 4: In-browser check**

Reach the reveal. Confirm cards cascade top-down (#1 first, ~420ms apart); within each card the badge pops, the avatar slides+scales in, name/office rise, the evidence line fades, and the agreement number counts up to its value. Reduced motion → all cards present at once, numbers at final value, no cascade. Screenshot both.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultsPhase.tsx src/index.css
git commit -m "feat(reveal): layered candidate landing + counting agreement number

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: #1 burst polish + ease tokenization

The spotlight glow (grid) and gold-badge gleam already fire from `spotlightActive` (Tasks 4–6). This task tokenizes the kept `megaBurst` particle ease to the CSS custom prop and confirms the burst is timed to the #1 landing, not a hardcoded offset.

**Files:**
- Modify: `src/components/ResultsPhase.tsx` (`MegaParticles`)

- [ ] **Step 1: Tokenize the burst ease**

In `MegaParticles`, replace the particle `animation` line:

```tsx
          animation: `megaBurst 0.8s ${p.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
```

with:

```tsx
          animation: `megaBurst var(--dur-burst) ${p.delay}s var(--ease-burst) forwards`,
```

- [ ] **Step 2: Confirm the burst fires from the spotlight clock (no code change expected)**

Verify (read-only) that `BallotCard`'s particle `useEffect` keys off `spotlight` (set true at `timeline.firstLand` by `ResultsPhase`) and NOT the old `index * 80 + 500` timer. If the old timer survived a merge, replace it with the spotlight-driven effect from Task 4 Step 5.

- [ ] **Step 3: Run build + lint + tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: clean; all tests pass.

- [ ] **Step 4: In-browser check**

Reach the reveal. Confirm the `megaBurst` fires on the #1 card exactly as it finishes landing (coincident with the badge gleam and the grid Diamond glow), once. Reduced motion → no burst. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultsPhase.tsx
git commit -m "refactor(reveal): tokenize megaBurst ease/duration to motion custom props

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Reveal entry announcement + reduced-motion regression test

Adds the single polite live-region announcement on reveal entry (spec §4.3) and a unit test that locks the reduced-motion contract (all cards render at once, numbers at final value, announcement present).

**Files:**
- Modify: `src/components/ResultsPhase.tsx`
- Test: `src/components/__tests__/ResultsPhase.test.tsx` (create if absent; otherwise add cases)

- [ ] **Step 1: Add the announcement to the results render**

In `src/components/ResultsPhase.tsx`, build the announcement string just before the results `return` (after `const ballot = ...` is in scope):

```tsx
  const top = ballot[0];
  const revealAnnouncement = top
    ? `Ballot revealed. Your number one is ${top.name}, agreed with ${top.evidence.agreementCount} position${top.evidence.agreementCount === 1 ? '' : 's'}.`
    : '';
```

Then, as the FIRST child inside the results-return outer `<div className="pb-12">`, add:

```tsx
      <div aria-live="polite" role="status" className="sr-only">{revealAnnouncement}</div>
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/__tests__/ResultsPhase.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Force reduced motion for the whole file.
vi.mock('framer-motion', async (orig) => {
  const actual = await orig<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: () => true };
});

import { ResultsPhase } from '../ResultsPhase';
import { useReadRankStore } from '../../store/useReadRankStore';

// NOTE: adapt this setup to the project's existing store-seeding test helpers
// (see EvaluationPhase.test.tsx for the established pattern of seeding a race,
// verdicts, and advancing to the results stage). The assertions below are the
// contract this task must satisfy.

describe('ResultsPhase (reduced motion)', () => {
  beforeEach(() => {
    // Seed a race with agreed quotes and a revealed ballot, then set stage to
    // results, following the EvaluationPhase.test.tsx seeding helpers.
  });

  it('announces the reveal with the #1 candidate and agreement count', async () => {
    render(<ResultsPhase />);
    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status.textContent).toMatch(/Ballot revealed\. Your number one is .+, agreed with \d+ position/);
    });
  });

  it('renders every candidate card at once with final agreement numbers', async () => {
    render(<ResultsPhase />);
    await waitFor(() => {
      // All ballot cards present immediately (no cascade gating in the DOM).
      expect(screen.getByText(/How the candidates stack up/)).toBeInTheDocument();
    });
    // The agreement number is the final value, not 0 (count-up is bypassed).
    expect(screen.queryByText(/agreed with 0 of/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails, then implement seeding**

Run: `npx vitest run src/components/__tests__/ResultsPhase.test.tsx`
Expected: FAIL initially (seeding incomplete / announcement missing). Wire the store seeding using the existing `EvaluationPhase.test.tsx` helpers (read that file first), and ensure the announcement string from Step 1 is in place.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/ResultsPhase.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full build + lint + tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: clean; all tests pass.

- [ ] **Step 6: In-browser check (screen reader / a11y tree)**

Reach the reveal with reduced motion on. Confirm the live region carries the announcement and the whole tally is present at once. Screenshot the a11y tree (or note the `role="status"` text via the preview inspector).

- [ ] **Step 7: Commit**

```bash
git add src/components/ResultsPhase.tsx src/components/__tests__/ResultsPhase.test.tsx
git commit -m "feat(a11y): reveal entry announcement + reduced-motion contract test

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Remove dead RevealCard / RevealBoard (spec §4.2)

`RevealCard.tsx` and `RevealBoard.tsx` (the 3D-flip unmask that was never wired into `ResultsPhase`) are imported only by their own test files. Spec §4.2 says remove them since the chosen unmask language is "identity lands." Removing them also removes their two test files — the suite total drops accordingly (expected, by design).

**Files:**
- Delete: `src/components/RevealCard.tsx`, `src/components/RevealBoard.tsx`
- Delete: `src/components/__tests__/RevealCard.test.tsx`, `src/components/__tests__/RevealBoard.test.tsx`

- [ ] **Step 1: Re-verify nothing in `src/` (outside the files being deleted) imports them**

Run: `grep -rln "RevealCard\|RevealBoard" src/ | grep -v "RevealCard\|RevealBoard"`
Expected: NO output (only the four files themselves reference the names). If anything else imports them, STOP and revisit — do not delete.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/RevealCard.tsx src/components/RevealBoard.tsx \
       src/components/__tests__/RevealCard.test.tsx src/components/__tests__/RevealBoard.test.tsx
```

- [ ] **Step 3: Run build + lint + tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: clean; tests pass (total below 215 by the number of removed RevealCard/RevealBoard tests — expected).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(reveal): remove dead RevealCard/RevealBoard unmask (spec §4.2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review

**Spec §4 coverage:**
- §4 step 1 (threshold) — unchanged, already `ThresholdInterstitial`; not in scope (kept as-is). ✔
- §4 step 2 (insight strip fade/rise, `easeSettle`, moderate) — Task 4. ✔
- §4 step 3 (grid frame settle → medal pops `easeOvershoot`/`staggerGridCell` → metallic gleam → minted look at TierIcon level) — Tasks 3 + 5. ✔
- §4 step 4 (cards cascade top-down #1-first `staggerCascade`; badge pop / avatar slide+scale overshoot / name-office rise / evidence fade per sub-staggers; count-up 0→N) — Task 6. ✔
- §4 step 5 (kept `megaBurst` on #1 as it lands; #1 spotlight = gold badge gleam + Diamond cell glows ev-yellow) — Tasks 5 (grid glow) + 6 (badge gleam) + 7 (burst). ✔
- §4 step 6 (tail unchanged) — untouched. ✔
- §4.1 (no layout re-order) — layout JSX order preserved in every task. ✔
- §4.2 (remove RevealCard/RevealBoard) — Task 9. ✔
- §4.3 (reduced motion: all-at-once, minted-static, final numbers, no cascade/burst/glow, one entry announcement) — `useMotion()` gating throughout + Tasks 8 (announcement) + timeline collapse (Task 1). ✔

**Placeholder scan:** No TBD/TODO. The only "adapt to existing helpers" note is Task 8's store seeding, which points at the concrete `EvaluationPhase.test.tsx` pattern and states the exact assertion contract — acceptable because the seeding API is project-specific and must be read live, but the test's required behavior is fully specified.

**Type consistency:** `computeRevealTimeline` returns `{ heading, insight, gridFrame, medalsStart, cascadeStart, firstLand, medalDelay(i), cardDelay(i) }` — consumed with those exact names in Tasks 4–6. `AlignmentGridProps` adds `animate/frameDelayMs/medalBaseDelayMs/spotlightCandidateId/spotlightActive` — passed with those exact names from `ResultsPhase` (Task 5 Step 3). `BallotCardProps` swaps `prefersReducedMotion` for `landBaseDelayMs: number` + `spotlight: boolean` (Task 4 Step 5), consumed in Task 6. `TierIcon` adds `gleam?: boolean` + `gleamDelayMs?: number` (Task 3), passed from `AlignmentGrid` (Task 5). `useCountUp(target, { durationMs, reduced, startDelayMs? })` (Task 2) — called in Task 6 with those keys. Consistent.

**Verification honesty:** Tasks 1, 2, 8 are genuinely unit-tested (pure timeline math, count-up mapping + timer hook, reduced-motion contract + announcement). Tasks 3, 5, 6, 7 are browser-verified (minted look, medal pops, gleam, cascade, count-up animation, burst/glow timing) — these steps say "in-browser check," not a fake unit test. Task 9 is a mechanical deletion guarded by grep + build/lint/test.
