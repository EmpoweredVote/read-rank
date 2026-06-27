# Motion Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the single-source-of-truth motion token language (`src/motion.ts` + `useMotion()`), mirror it into CSS custom properties, delete dead animation code, and close the reduced-motion gaps in the components that no later plan rewrites.

**Architecture:** One module (`src/motion.ts`) exports named easing/duration/stagger/spring tokens plus a `useMotion()` hook that wraps framer-motion's `useReducedMotion()`. The hook is the only sanctioned way a component reads motion config; when the user prefers reduced motion it collapses durations to zero, easings to linear, entrance transforms to none, and hover/tap to nothing. This fixes the real trap that framer-motion's JS-driven transforms bypass the CSS `prefers-reduced-motion` reset. CSS-driven motion reads the same values via custom properties declared once in `:root`.

**Tech Stack:** React 19, TypeScript, framer-motion 12, Vitest 4 + @testing-library/react 16, Tailwind v4 (`src/index.css`).

**Source spec:** `docs/superpowers/specs/2026-06-26-motion-system-design.md` (§2, §5, §7).

**Scope note:** This plan is the substrate for three later plans (verdict, reveal, net-new). It closes reduced-motion gaps ONLY for components no later plan rewrites: `PracticeRound`, `PracticeResultsScreen`, `RankList`, `CoachMark`, `AddressFilterInput`. Gaps in `QuoteCard`, `ActionButtons`, `EvaluationPhase`, `RankDock`, `RankSheet`, `AgreedQuotesSidebar` (verdict plan), `ResultsPhase`, `AlignmentGrid`, `TierIcon` (reveal plan), and `Landing`, `RaceHub`, `RaceCard`, `IssueSelection` (net-new plan) are closed there, using `useMotion()` from the start.

---

## File Structure

- **Create** `src/motion.ts` — token tables (`EASE`, `DUR`, `STAGGER`, `SPRING_REORDER`) and the `useMotion()` hook. One responsibility: the motion language.
- **Create** `src/__tests__/motion.test.tsx` — token value tests + `useMotion()` reduced/normal branch tests.
- **Modify** `src/index.css` — add CSS custom-property mirror in `:root`; delete 9 dead keyframes + `.screen-shake`.
- **Modify** `src/App.css` — delete unused `logo-spin` keyframe + `.logo.react` spin rule.
- **Modify** `src/components/PracticeResultsScreen.tsx`, `PracticeRound.tsx`, `RankList.tsx`, `CoachMark.tsx`, `AddressFilterInput.tsx` — route motion through `useMotion()`.

---

## Task 1: Motion token module

**Files:**
- Create: `src/motion.ts`
- Test: `src/__tests__/motion.test.tsx`

- [ ] **Step 1: Write the failing test for token values**

Create `src/__tests__/motion.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { EASE, DUR, STAGGER, SPRING_REORDER } from '../motion';

describe('motion tokens', () => {
  it('exposes the approved easing curves', () => {
    expect(EASE.settle).toEqual([0.22, 1, 0.36, 1]);
    expect(EASE.flight).toEqual([0.45, 0, 0.18, 1]);
    expect(EASE.overshoot).toEqual([0.34, 1.45, 0.6, 1]);
    expect(EASE.standard).toEqual([0.4, 0, 0.2, 1]);
    expect(EASE.burst).toEqual([0.25, 0.46, 0.45, 0.94]);
  });

  it('exposes the approved durations (ms)', () => {
    expect(DUR.instant).toBe(0);
    expect(DUR.fast).toBe(150);
    expect(DUR.base).toBe(250);
    expect(DUR.moderate).toBe(400);
    expect(DUR.flight).toBe(580);
    expect(DUR.burst).toBe(800);
  });

  it('exposes stagger constants and the reorder spring', () => {
    expect(STAGGER.gridCell).toBe(90);
    expect(STAGGER.cascade).toBe(420);
    expect(STAGGER.badge).toBe(80);
    expect(STAGGER.avatar).toBe(140);
    expect(STAGGER.name).toBe(200);
    expect(STAGGER.evidence).toBe(320);
    expect(SPRING_REORDER).toEqual({ type: 'spring', stiffness: 500, damping: 35 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/motion.test.tsx`
Expected: FAIL — `Failed to resolve import "../motion"`.

- [ ] **Step 3: Create the token module**

Create `src/motion.ts`:

```ts
import { useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

/** Cubic-bezier easing curves. The product's motion vocabulary. */
export const EASE = {
  /** Primary decelerate-to-rest. Entrances, reveals, phase transitions. */
  settle: [0.22, 1, 0.36, 1],
  /** Accelerate-out / decelerate-in. The verdict dock flight. */
  flight: [0.45, 0, 0.18, 1],
  /** Gentle overshoot (settle, not bounce). Medal/badge/check pop. */
  overshoot: [0.34, 1.45, 0.6, 1],
  /** Generic UI: hovers, fades, color transitions. */
  standard: [0.4, 0, 0.2, 1],
  /** Reveal particle burst only. */
  burst: [0.25, 0.46, 0.45, 0.94],
} as const;

/** Durations in milliseconds. */
export const DUR = {
  instant: 0,
  fast: 150,
  base: 250,
  moderate: 400,
  flight: 580,
  burst: 800,
} as const;

/** Stagger / sub-stagger delays in milliseconds. */
export const STAGGER = {
  gridCell: 90,
  cascade: 420,
  badge: 80,
  avatar: 140,
  name: 200,
  evidence: 320,
} as const;

/** Drag-to-reorder layout spring. */
export const SPRING_REORDER: Transition = { type: 'spring', stiffness: 500, damping: 35 };

export type Ease = readonly number[];

export interface Motion {
  /** True when the user prefers reduced motion. */
  reduced: boolean;
  /** A duration in ms, collapsed to 0 when reduced. */
  dur(ms: number): number;
  /** An easing curve, collapsed to 'linear' when reduced. */
  ease(curve: Ease): Ease | string;
  /** A framer-motion Transition (duration in SECONDS), reduced-aware. */
  transition(ms: number, curve?: Ease, extra?: Partial<Transition>): Transition;
  /** The reorder spring, or an instant transition when reduced. */
  spring(): Transition;
  /**
   * Entrance initial/animate pair. When reduced, `initial` is `false` so the
   * element renders at its final state with no transform.
   */
  enter(offset?: { x?: number; y?: number }): {
    initial: false | Record<string, number>;
    animate: Record<string, number>;
  };
  /** A whileHover value, or undefined when reduced. */
  hover<T>(value: T): T | undefined;
  /** A whileTap value, or undefined when reduced. */
  tap<T>(value: T): T | undefined;
}

/**
 * The only sanctioned way to read motion config in a component. Wraps
 * framer-motion's useReducedMotion so JS-driven transforms respect the
 * preference (the CSS reset does not catch them).
 */
export function useMotion(): Motion {
  const reduced = !!useReducedMotion();
  return {
    reduced,
    dur: (ms) => (reduced ? DUR.instant : ms),
    ease: (curve) => (reduced ? 'linear' : curve),
    transition: (ms, curve = EASE.settle, extra = {}) => ({
      duration: (reduced ? DUR.instant : ms) / 1000,
      ease: reduced ? 'linear' : (curve as number[]),
      ...extra,
    }),
    spring: () => (reduced ? { duration: 0 } : SPRING_REORDER),
    enter: (offset = { y: 8 }) => ({
      initial: reduced ? false : { opacity: 0, ...offset },
      animate: { opacity: 1, x: 0, y: 0 },
    }),
    hover: (value) => (reduced ? undefined : value),
    tap: (value) => (reduced ? undefined : value),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/motion.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/motion.ts src/__tests__/motion.test.tsx
git commit -m "feat(motion): add motion token module"
```

---

## Task 2: `useMotion()` reduced-motion contract

**Files:**
- Modify: `src/__tests__/motion.test.tsx`
- (Hook already implemented in Task 1; this task proves the contract.)

- [ ] **Step 1: Write the failing tests for both branches**

Append to `src/__tests__/motion.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { useMotion } from '../motion';

function setReducedMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('useMotion — normal motion', () => {
  it('returns real durations, curves, transforms and hover/tap', () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useMotion());
    const m = result.current;
    expect(m.reduced).toBe(false);
    expect(m.dur(DUR.moderate)).toBe(400);
    expect(m.ease(EASE.settle)).toEqual(EASE.settle);
    expect(m.transition(DUR.moderate)).toMatchObject({ duration: 0.4, ease: EASE.settle });
    expect(m.spring()).toEqual(SPRING_REORDER);
    expect(m.enter({ y: 24 }).initial).toEqual({ opacity: 0, y: 24 });
    expect(m.hover({ scale: 1.03 })).toEqual({ scale: 1.03 });
    expect(m.tap({ scale: 0.97 })).toEqual({ scale: 0.97 });
  });
});

describe('useMotion — reduced motion', () => {
  it('collapses durations, curves, transforms and hover/tap', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useMotion());
    const m = result.current;
    expect(m.reduced).toBe(true);
    expect(m.dur(DUR.moderate)).toBe(0);
    expect(m.ease(EASE.settle)).toBe('linear');
    expect(m.transition(DUR.moderate)).toMatchObject({ duration: 0, ease: 'linear' });
    expect(m.spring()).toEqual({ duration: 0 });
    expect(m.enter({ y: 24 }).initial).toBe(false);
    expect(m.hover({ scale: 1.03 })).toBeUndefined();
    expect(m.tap({ scale: 0.97 })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify the reduced branch fails first**

Run: `npx vitest run src/__tests__/motion.test.tsx`
Expected: The two new `describe` blocks PASS already if Task 1's hook is correct. If any assertion FAILS, fix `useMotion()` in `src/motion.ts` until green (do not weaken the test).

- [ ] **Step 3: Restore the shared matchMedia stub after the suite**

Append at the very end of `src/__tests__/motion.test.tsx` so other suites are unaffected (Vitest isolates modules per file, but be explicit):

```tsx
import { afterAll } from 'vitest';
afterAll(() => setReducedMotion(false));
```

- [ ] **Step 4: Run the full test suite to confirm no global leakage**

Run: `npx vitest run`
Expected: PASS (all existing suites still green).

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/motion.test.tsx
git commit -m "test(motion): cover useMotion reduced-motion contract"
```

---

## Task 3: CSS custom-property mirror

**Files:**
- Modify: `src/index.css:36` (inside the existing `:root { ... }` block)

- [ ] **Step 1: Add the motion custom properties**

In `src/index.css`, inside the existing `:root {` block (starts at line 36), add this group before the closing `}` of `:root` (right after the `--progress-fill` line at ~line 99):

```css
  /* Motion tokens (mirror of src/motion.ts — keep in sync) */
  --ease-settle: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-flight: cubic-bezier(0.45, 0, 0.18, 1);
  --ease-overshoot: cubic-bezier(0.34, 1.45, 0.6, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-burst: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --dur-fast: 150ms;
  --dur-base: 250ms;
  --dur-moderate: 400ms;
  --dur-flight: 580ms;
  --dur-burst: 800ms;
```

- [ ] **Step 2: Verify the build compiles the stylesheet**

Run: `npm run build`
Expected: Build succeeds (tsc + vite). No CSS parse errors.

- [ ] **Step 3: Verify the properties are present**

Run: `grep -n "ease-settle\|dur-flight" src/index.css`
Expected: both custom properties appear in the `:root` block.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(motion): mirror motion tokens as CSS custom properties"
```

---

## Task 4: Delete dead animation code

**Files:**
- Modify: `src/index.css` (remove 9 keyframes + `.screen-shake`)
- Modify: `src/App.css` (remove `logo-spin` + spin rule)

Keep `megaBurst` (used by the reveal). Do NOT touch `.quote-stamp*` (removed in the verdict plan).

- [ ] **Step 1: Confirm each keyframe is truly unused**

Run:
```bash
for k in rank-badge-appear shimmer fade-up screenShake screenFlash slamDown rankSlam podiumPop bannerSlam; do echo "== $k =="; grep -rn "$k" src/ | grep -v "@keyframes $k" | grep -v "keyframes screenShake"; done
```
Expected: no usage references (only the `@keyframes`/`.screen-shake` definitions in `index.css`). If any are referenced from a `.tsx`, STOP and report — do not delete that one.

- [ ] **Step 2: Remove the dead keyframes from `src/index.css`**

Delete these blocks (currently lines ~347–407 and the `.screen-shake` rule ~372):
`@keyframes rank-badge-appear`, `@keyframes shimmer`, `@keyframes fade-up`, `@keyframes screenShake`, `.screen-shake { ... }`, `@keyframes screenFlash`, `@keyframes slamDown`, `@keyframes rankSlam`, `@keyframes podiumPop`, `@keyframes bannerSlam`.

Keep `@keyframes gentle-pulse` (used) and `@keyframes megaBurst` (used by reveal). Leave the "Animation Keyframes" comment header.

- [ ] **Step 3: Remove the unused logo spin from `src/App.css`**

Open `src/App.css`. Delete the `@keyframes logo-spin { ... }` block and the `@media (prefers-reduced-motion: no-preference) { a:nth-of-type(2) .logo { animation: logo-spin ... } }` rule that references it. (These are leftover Vite template CSS; verify nothing in `src/` renders `.logo`.)

Run first to confirm: `grep -rn "logo-spin\|className=\"logo\|class=\"logo" src/`
Expected: only `App.css` matches; no component uses `.logo`.

- [ ] **Step 4: Verify build + that only `megaBurst`/`gentle-pulse` keyframes remain**

Run:
```bash
npm run build && grep -n "@keyframes" src/index.css src/App.css
```
Expected: build succeeds; the only `@keyframes` remaining are `gentle-pulse` and `megaBurst`.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/App.css
git commit -m "chore(motion): remove dead keyframes (keep megaBurst, gentle-pulse)"
```

---

## Task 5: PracticeResultsScreen — reduced-motion + tokens

**Files:**
- Modify: `src/components/PracticeResultsScreen.tsx:1-73`

Current motion (from grep): result cards `initial={{opacity:0,y:24}} ... transition={{ delay: idx*0.08, duration:0.5, ease:[0.22,1,0.36,1] }}`; a header block `duration:0.7`; a footer `delay:0.6`; CTA button `whileHover/whileTap`. None is reduced-aware.

- [ ] **Step 1: Import the hook**

At the top of `src/components/PracticeResultsScreen.tsx`, add:

```tsx
import { useMotion } from '../motion';
import { DUR, EASE, STAGGER } from '../motion';
```

Inside the component function body (top), add:

```tsx
  const m = useMotion();
```

(If the result cards are rendered by a separate sub-component in this file, call `useMotion()` there too.)

- [ ] **Step 2: Route the result-card stagger through the hook**

Replace the result card motion props (around line 15-18):

```tsx
      <motion.div key={quoteId}
        // ...existing className/style...
        initial={m.enter({ y: 24 }).initial} animate={m.enter({ y: 24 }).animate}
        transition={m.transition(DUR.moderate, EASE.settle, { delay: m.reduced ? 0 : idx * (STAGGER.badge / 1000) })}>
```

- [ ] **Step 3: Route the header and footer entrances + CTA hover/tap**

Header block (around line 51-52):

```tsx
      <motion.div className="text-center max-w-2xl mx-auto mb-8"
        initial={m.enter({ y: 20 }).initial} animate={m.enter({ y: 20 }).animate}
        transition={m.transition(DUR.moderate)}>
```

Footer + button (around line 68-70):

```tsx
      <motion.div className="flex justify-center pt-4"
        initial={m.reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }}
        transition={m.transition(DUR.base, EASE.settle, { delay: m.reduced ? 0 : 0.6 })}>
        <motion.button onClick={completePractice} className="ev-button-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          whileHover={m.hover({ scale: 1.03, y: -1 })} whileTap={m.tap({ scale: 0.97 })}>
```

- [ ] **Step 4: Verify build, lint, and existing tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: all pass. (If a `PracticeResultsScreen` test exists it must stay green.)

- [ ] **Step 5: Commit**

```bash
git add src/components/PracticeResultsScreen.tsx
git commit -m "fix(a11y): route PracticeResultsScreen motion through useMotion"
```

---

## Task 6: PracticeRound — reduced-motion on splash button

**Files:**
- Modify: `src/components/PracticeRound.tsx:1-114`

The quote-card swap inside `AnimatePresence` is driven by `QuoteCard`'s own motion, which the verdict plan makes reduced-aware. This task only fixes PracticeRound's own splash button hover/tap (lines 111-112).

- [ ] **Step 1: Import and instantiate the hook**

Add near the existing import (line 2):

```tsx
import { useMotion } from '../motion';
```

Inside the component body, add:

```tsx
  const m = useMotion();
```

- [ ] **Step 2: Route the splash button hover/tap**

Replace lines ~111-112:

```tsx
        <motion.button onClick={() => setShowSplash(false)} className="ev-button-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          whileHover={m.hover({ scale: 1.03, y: -1 })} whileTap={m.tap({ scale: 0.97 })}>
```

- [ ] **Step 3: Verify build, lint, tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/PracticeRound.tsx
git commit -m "fix(a11y): disable PracticeRound splash button motion when reduced"
```

---

## Task 7: RankList — reorder spring token + reduced-motion

**Files:**
- Modify: `src/components/RankList.tsx:139-141`

Current: `<motion.div layout transition={{ type:'spring', stiffness:500, damping:35 }}>` — animates layout even when reduced.

- [ ] **Step 1: Import the hook and spring token**

Add to imports:

```tsx
import { useMotion } from '../motion';
```

In the component that renders the sortable row (`SortableRow`), add at the top of its body:

```tsx
  const m = useMotion();
```

- [ ] **Step 2: Route the layout transition through `m.spring()`**

Replace lines ~139-141:

```tsx
      <motion.div
        layout
        transition={m.spring()}
```

(`m.spring()` returns the reorder spring normally, or `{ duration: 0 }` when reduced — making layout shifts instant.)

- [ ] **Step 3: Verify build, lint, and the existing RankList test**

Run: `npm run build && npm run lint && npx vitest run src/components/__tests__/RankList.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/RankList.tsx
git commit -m "fix(a11y): make RankList reorder instant under reduced motion"
```

---

## Task 8: CoachMark — reduced-motion on overlay + tooltip

**Files:**
- Modify: `src/components/CoachMark.tsx` (motion blocks at lines ~278-340 and ~383-388)

Current: several `motion.div` opacity fades (`duration: 0.15`) and a tooltip with `initial={{opacity:0,y:6}} ... transition={{ duration:0.2, ease:"easeOut" }}`.

- [ ] **Step 1: Import and instantiate the hook**

Add near line 8:

```tsx
import { useMotion } from '../motion';
```

In the component body (and any sub-component that owns the tooltip `motion.div`), add:

```tsx
  const m = useMotion();
```

- [ ] **Step 2: Route the spotlight/overlay fades (lines ~280-283, ~300-303, ~337-340)**

For each of the three opacity-only `motion.div` blocks, replace the transition:

```tsx
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={m.transition(DUR.fast)}
```

Add `DUR` to the import: `import { useMotion, DUR, EASE } from '../motion';`

- [ ] **Step 3: Route the tooltip entrance (lines ~385-388)**

```tsx
              initial={m.reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={m.reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              transition={m.transition(DUR.base, EASE.standard)}
```

- [ ] **Step 4: Verify build, lint, tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/CoachMark.tsx
git commit -m "fix(a11y): route CoachMark motion through useMotion"
```

---

## Task 9: AddressFilterInput — reduced-motion on dropdown/error

**Files:**
- Modify: `src/components/AddressFilterInput.tsx:139-204`

Current: two `motion.div` with `initial={{opacity:0,scale:0.95}}`/`{opacity:0,y:4}` and `transition={{ duration:0.2 }}`, not reduced-aware.

- [ ] **Step 1: Import and instantiate the hook**

Add near line 2:

```tsx
import { useMotion, DUR } from '../motion';
```

In the component body:

```tsx
  const m = useMotion();
```

- [ ] **Step 2: Route the first block (scale, lines ~143-146)**

```tsx
            initial={m.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={m.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={m.transition(DUR.base)}
```

- [ ] **Step 3: Route the second block (y offset, lines ~172-175)**

```tsx
            initial={m.reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={m.reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={m.transition(DUR.base)}
```

- [ ] **Step 4: Verify build, lint, tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddressFilterInput.tsx
git commit -m "fix(a11y): route AddressFilterInput motion through useMotion"
```

---

## Task 10: Manual reduced-motion verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev preview**

Use the preview tooling to start the dev server (`npm run dev` equivalent).

- [ ] **Step 2: Emulate `prefers-reduced-motion: reduce`**

In the preview, set the emulation flag (DevTools → Rendering → Emulate CSS `prefers-reduced-motion: reduce`, or the preview tool's equivalent). Reload.

- [ ] **Step 3: Walk the affected surfaces with reduced motion ON**

Confirm NO travel/scale/slide animation (content appears at final state instantly) on: the practice results screen cards, the practice splash CTA, drag-reordering the rank list, a coach-mark appearing, and the address filter dropdown/error. Content and order must be correct and complete.

- [ ] **Step 4: Toggle reduced motion OFF and confirm motion returns**

Disable the emulation, reload, and confirm the same surfaces animate normally (durations/curves now match the tokens).

- [ ] **Step 5: Final full check + commit any fixes**

Run: `npm run build && npm run lint && npx vitest run`
Expected: all green. Commit any adjustments found during manual verification with a `fix(a11y):` message.

---

## Self-Review

- **Spec coverage (§2 tokens):** Task 1 (tokens), Task 2 (`useMotion` contract), Task 3 (CSS mirror). ✓
- **Spec coverage (§5 cleanup):** Task 4 removes the 9 dead keyframes, keeps `megaBurst`; stamp removal correctly deferred to the verdict plan. ✓
- **Spec coverage (§7 gaps):** Tasks 5-9 close `PracticeRound`, `PracticeResultsScreen`, `RankList`, `CoachMark`, `AddressFilterInput`. The remaining §7 components (`ActionButtons`, `ResultsPhase`, `RaceHub`) are explicitly deferred to the plans that rewrite them (scope note). ✓
- **Type consistency:** `useMotion()` API (`reduced`, `dur`, `ease`, `transition`, `spring`, `enter`, `hover`, `tap`) is used identically across Tasks 5-9. ✓
- **Placeholders:** none — every code step shows the code; every command shows expected output.
- **No-orphan check:** `EASE`, `DUR`, `STAGGER`, `SPRING_REORDER`, `useMotion` all defined in Task 1 before first use in Task 5.
