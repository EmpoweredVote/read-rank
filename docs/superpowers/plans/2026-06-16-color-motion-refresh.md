# read-rank color + motion refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ev-coral on all interactive elements with a mode-aware blue, and make "agree" fly the quote card into the ranking pile.

**Architecture:** Add three mode-aware `--action-primary*` CSS tokens in `src/index.css` and repoint every coral button/accent at them (keeping coral only on the bronze podium tier and results confetti). For motion, `EvaluationPhase` measures the card and the pile target (sidebar on desktop, dock on mobile) and renders a fixed-position `FlyingCard` clone that arcs into the pile; the store commit stays on a deterministic timer so existing tests pass. `prefers-reduced-motion` and mobile jank both fall back to the existing pile-pulse.

**Tech Stack:** React + TypeScript, Tailwind v4 (`@theme` tokens) + plain CSS custom properties, framer-motion, Vitest + Testing Library, Vite.

---

## Spec reference

Design: `docs/superpowers/specs/2026-06-16-color-motion-refresh-design.md`

## File structure

- `src/index.css` — token definitions + all coral→blue swaps (color is centralized here).
- `src/components/FlyingCard.tsx` — **new** presentational component: a portaled, fixed-position card clone that animates from a source rect to a target rect.
- `src/components/EvaluationPhase.tsx` — orchestrates the flight in `handleButtonSwipe`, renders `FlyingCard`.
- `src/components/AgreedQuotesSidebar.tsx` — desktop pile-pulse on count increase (mirrors `RankDock`).
- `src/components/PracticeRound.tsx`, `src/components/PhaseContainer.tsx` — small inline coral → token swaps.
- `src/components/__tests__/EvaluationPhase.test.tsx` — flight-path + reduced-motion coverage.
- `docs/archive/` — **new** home for stale root-level design docs.

---

### Task 0: Branch

- [ ] **Step 1: Create a working branch (repo is on `main`)**

Run:
```bash
git checkout -b feat/color-motion-refresh
```
Expected: `Switched to a new branch 'feat/color-motion-refresh'`

---

### Task 1: Add mode-aware action tokens

**Files:**
- Modify: `src/index.css` (the `:root` block near line 94, and the `.dark` block near line 150)

- [ ] **Step 1: Add light-mode tokens**

In `src/index.css`, find the end of the `:root` block (the `--progress-fill` line, ~line 94):
```css
  --progress-fill: var(--color-ev-muted-blue);
```
Insert immediately above it:
```css
  /* Action / primary (replaces coral on interactive elements) */
  --action-primary: #00657c;
  --action-primary-hover: #004d5c;
  --action-primary-ink: #ffffff;

```

- [ ] **Step 2: Add dark-mode tokens**

Find the end of the `.dark` block (the `--progress-fill` line, ~line 150):
```css
  --progress-fill: var(--color-ev-yellow);
```
Insert immediately above it:
```css
  --action-primary: #59b0c4;
  --action-primary-hover: #7cc5d6;
  --action-primary-ink: #06303a;

```

- [ ] **Step 3: Verify build still compiles**

Run: `npm run build`
Expected: build succeeds (tsc + vite), no errors.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): add mode-aware --action-primary tokens"
```

---

### Task 2: Repoint `.ev-button-primary` (all primary CTAs)

**Files:**
- Modify: `src/index.css:254-271`

- [ ] **Step 1: Swap base styles**

Replace this block (starts ~line 254):
```css
.ev-button-primary {
  background-color: var(--color-ev-coral);
  color: white;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  border-radius: 0.5rem;
  padding: 0.75rem 1.75rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  letter-spacing: 0.01em;
}

.ev-button-primary:hover {
  background-color: var(--color-ev-coral-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 87, 64, 0.3);
}
```
with:
```css
.ev-button-primary {
  background-color: var(--action-primary);
  color: var(--action-primary-ink);
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  border-radius: 0.5rem;
  padding: 0.75rem 1.75rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  letter-spacing: 0.01em;
}

.ev-button-primary:hover {
  background-color: var(--action-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--action-primary) 35%, transparent);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): primary buttons use action-primary instead of coral"
```

---

### Task 3: Repoint the AGREE paddle + AGREE stamp

**Files:**
- Modify: `src/index.css:579-582` (`.action-button-agree`)
- Modify: `src/index.css:1253-1254` and `:1269` (`.quote-stamp-agree`)

- [ ] **Step 1: Swap the AGREE verdict paddle**

Replace (~line 579):
```css
.action-button-agree {
  background-color: #ff5740;
  color: #ffffff;
}
```
with:
```css
.action-button-agree {
  background-color: var(--action-primary);
  color: var(--action-primary-ink);
}
```

- [ ] **Step 2: Swap the AGREE stamp border**

Replace (~line 1253):
```css
.quote-stamp-agree .quote-stamp-circle {
  border: 4px solid #ff5740;
}
```
with:
```css
.quote-stamp-agree .quote-stamp-circle {
  border: 4px solid var(--action-primary);
}
```

- [ ] **Step 3: Swap the AGREE stamp text**

Replace (~line 1269):
```css
.quote-stamp-agree .quote-stamp-text { color: #ff5740; }
```
with:
```css
.quote-stamp-agree .quote-stamp-text { color: var(--action-primary); }
```

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): AGREE paddle + stamp use action-primary"
```

---

### Task 4: Repoint issue picker + inline component coral

**Files:**
- Modify: `src/index.css:1802-1804` and `:1822-1825`
- Modify: `src/components/PracticeRound.tsx:86-87`
- Modify: `src/components/PhaseContainer.tsx:135`

- [ ] **Step 1: Swap issue-row selected accent**

Replace (~line 1802):
```css
.issue-row-selected {
  border-color: var(--color-ev-coral);
  background: color-mix(in srgb, var(--color-ev-coral) 6%, var(--surface-card));
}
```
with:
```css
.issue-row-selected {
  border-color: var(--action-primary);
  background: color-mix(in srgb, var(--action-primary) 6%, var(--surface-card));
}
```

- [ ] **Step 2: Swap issue-check tile**

Replace (~line 1822):
```css
.issue-check-tile-selected {
  background-color: var(--color-ev-coral);
  border-color: var(--color-ev-coral);
}
```
with:
```css
.issue-check-tile-selected {
  background-color: var(--action-primary);
  border-color: var(--action-primary);
}
```

- [ ] **Step 3: Swap PracticeRound arrow strokes**

In `src/components/PracticeRound.tsx`, replace both occurrences (lines 86-87) of `stroke="var(--color-ev-coral)"` with `stroke="var(--action-primary)"`. The two lines become:
```tsx
              <path d="M30 80 L15 80" stroke="var(--action-primary)" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 75 L15 80 L20 85" stroke="var(--action-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
```

- [ ] **Step 4: Swap PhaseContainer label color**

In `src/components/PhaseContainer.tsx:135`, change `color: 'var(--color-ev-coral)'` to `color: 'var(--action-primary)'`. The line becomes:
```tsx
          <div style={{ color: 'var(--action-primary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
```

- [ ] **Step 5: Verify no coral remains on interactive elements**

Run:
```bash
grep -rn "ev-coral\|#ff5740\|#ff7a68\|#e64a34\|255, *87, *64" src
```
Expected: the ONLY remaining matches are the token definitions (`--color-ev-coral`, `--color-ev-coral-dark`), `--podium-bronze` (lines ~72 and ~130), and `ResultsPhase.tsx` particles. No buttons, paddles, stamps, issue rows, arrows, or labels.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/components/PracticeRound.tsx src/components/PhaseContainer.tsx
git commit -m "feat(theme): issue picker + practice/phase accents use action-primary"
```

---

### Task 5: Visual verification of color swap

**Files:** none (preview verification)

- [ ] **Step 1: Start the dev server and verify**

Use the preview tooling (preview_start, then preview_screenshot / preview_snapshot). Confirm across both modes and both widths:
- Light mode: primary buttons and the AGREE paddle are deep blue `#00657c`, white text.
- Dark mode: primary buttons and AGREE paddle are light blue `#59b0c4`, dark text.
- The bronze podium tier and results confetti are still coral.
- No coral remains on any button, paddle, stamp, or issue row.

Expected: no console errors; colors match the spec table.

---

### Task 6: FlyingCard component

**Files:**
- Create: `src/components/FlyingCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/FlyingCard.tsx
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

export interface FlyRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface FlyingCardProps {
  /** Quote text to show in the flying clone. */
  text: string;
  /** Source rect (the live quote card), from getBoundingClientRect(). */
  from: FlyRect;
  /** Target rect (the pile: sidebar on desktop, dock on mobile). */
  to: FlyRect;
  /** Flight duration in milliseconds. */
  durationMs: number;
}

/**
 * A fixed-position, portaled clone of the quote card that arcs from the live
 * card into the ranking pile. Purely presentational — it self-animates and is
 * unmounted by its parent. The store commit is timed by the parent, not by this
 * component's animation lifecycle, so behavior is deterministic in tests.
 */
export function FlyingCard({ text, from, to, durationMs }: FlyingCardProps) {
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);

  return createPortal(
    <motion.div
      data-testid="flying-card"
      className="ev-quote-card"
      aria-hidden="true"
      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      animate={{ x: dx, y: dy, scale: 0.12, opacity: 0.2 }}
      transition={{ duration: durationMs / 1000, ease: [0.5, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        top: from.top,
        left: from.left,
        width: from.width,
        margin: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div className="ev-quote-text" style={{ fontSize: 'clamp(1.0625rem, 2.5vw, 1.25rem)' }}>
        {text}
      </div>
    </motion.div>,
    document.body,
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FlyingCard.tsx
git commit -m "feat(motion): add FlyingCard portal clone component"
```

---

### Task 7: Wire the flight into EvaluationPhase

**Files:**
- Modify: `src/components/EvaluationPhase.tsx`

- [ ] **Step 1: Add imports and reduced-motion hook**

At the top of `src/components/EvaluationPhase.tsx`, add to the framer-motion import and a new import:
```tsx
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { FlyingCard, type FlyRect } from './FlyingCard';
```
(Replace the existing `import { AnimatePresence } from 'framer-motion';` line.)

- [ ] **Step 2: Add flight state**

Just after the existing `const [pendingVerdict, setPendingVerdict] = useState<'agree' | 'disagree' | null>(null);` line, add:
```tsx
  const prefersReducedMotion = useReducedMotion();
  const [flight, setFlight] = useState<{ text: string; from: FlyRect; to: FlyRect } | null>(null);
```

- [ ] **Step 3: Replace `handleButtonSwipe` with the flight-aware version**

Replace the whole existing `handleButtonSwipe` function (lines ~87-98) with:
```tsx
  const handleButtonSwipe = async (direction: 'agree' | 'disagree') => {
    if (isAnimating || !currentQuote) return;
    setIsAnimating(true);
    setPendingVerdict(direction);

    // Agree → fly the card into the pile (desktop: sidebar, mobile: dock).
    // Skip the flight for reduced-motion or if either ref is missing; the pile
    // still pulses via RankDock / the sidebar effect.
    const cardEl = quoteCardRef.current;
    const targetEl = isMouseDevice ? sidebarRef.current : dockRef.current;
    if (direction === 'agree' && !prefersReducedMotion && cardEl && targetEl) {
      await delay(140); // brief stamp flash
      setPendingVerdict(null);
      setFlight({
        text: currentQuote.text,
        from: cardEl.getBoundingClientRect(),
        to: targetEl.getBoundingClientRect(),
      });
      await delay(600); // flight duration (matches FlyingCard)
      if (tourStep === 1) setTourStep(2);
      agree(currentQuote);
      setFlight(null);
      await delay(80);
      setIsAnimating(false);
      return;
    }

    // Disagree, reduced-motion, or missing refs: quick stamp + commit.
    await delay(300);
    setPendingVerdict(null);
    if (tourStep === 1) setTourStep(2);
    if (direction === 'agree') agree(currentQuote);
    else disagree(currentQuote);
    await delay(250);
    setIsAnimating(false);
  };
```

- [ ] **Step 4: Render the FlyingCard in both layouts**

In the desktop return (the `if (isMouseDevice)` block), add the flight just before the closing `</div>` that wraps `coachMarkOverlay`:
```tsx
        {coachMarkOverlay}
        {flight && <FlyingCard text={flight.text} from={flight.from} to={flight.to} durationMs={600} />}
      </div>
```

In the mobile return, add it just before the final `</div>`:
```tsx
      {coachMarkOverlay}
      {flight && <FlyingCard text={flight.text} from={flight.from} to={flight.to} durationMs={600} />}
    </div>
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc -b`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/EvaluationPhase.tsx
git commit -m "feat(motion): agree flies the quote card into the ranking pile"
```

---

### Task 8: Desktop sidebar pile-pulse

**Files:**
- Modify: `src/components/AgreedQuotesSidebar.tsx`

- [ ] **Step 1: Add the pulse effect (mirrors RankDock)**

Replace the import line and the top of the component. Change line 1:
```tsx
import React from 'react';
```
to:
```tsx
import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { useAnimate, useReducedMotion } from 'framer-motion';
```

Then replace the component body opening:
```tsx
export const RankedListSidebar = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const { getCurrentTopicProgress } = useReadRankStore();
  const topic = getCurrentTopicProgress();
  const agreed = topic?.agreed ?? [];

  return (
    <div ref={ref} className="agreed-quotes-sidebar">
```
with:
```tsx
export const RankedListSidebar = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const { getCurrentTopicProgress } = useReadRankStore();
  const topic = getCurrentTopicProgress();
  const agreed = topic?.agreed ?? [];

  const prefersReducedMotion = useReducedMotion();
  const prevCount = useRef(agreed.length);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  useImperativeHandle(ref, () => scope.current as HTMLDivElement);

  useEffect(() => {
    if (agreed.length > prevCount.current && !prefersReducedMotion && scope.current) {
      animate(scope.current, { scale: [1, 1.015, 1] }, { duration: 0.4 });
    }
    prevCount.current = agreed.length;
  }, [agreed.length, animate, prefersReducedMotion, scope]);

  return (
    <div ref={scope} className="agreed-quotes-sidebar">
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no type errors. (The forwarded `ref` is now wired through `useImperativeHandle` to the animated `scope`, preserving coach-mark targeting from `EvaluationPhase`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/AgreedQuotesSidebar.tsx
git commit -m "feat(motion): desktop ranking sidebar pulses when a quote lands"
```

---

### Task 9: Tests for the flight flow

**Files:**
- Modify: `src/components/__tests__/EvaluationPhase.test.tsx`

- [ ] **Step 1: Add a reduced-motion + flight test**

Append these two tests inside the existing `describe('EvaluationPhase keyboard shortcuts', ...)` block (before its closing `});`):
```tsx
  it('still commits the agree when reduced motion is preferred (no flying card)', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      render(<EvaluationPhase />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      await screen.findByText('Eval quote two.', undefined, { timeout: 3000 });
      expect(screen.queryByTestId('flying-card')).toBeNull();
      expect(useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.agreed.map((q) => q.id)).toEqual(['q1']);
    } finally {
      window.matchMedia = original;
    }
  });

  it('renders a flying card during the agree flight (motion enabled)', async () => {
    render(<EvaluationPhase />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    // The flight mounts after the ~140ms stamp flash and unmounts on commit.
    await screen.findByTestId('flying-card', undefined, { timeout: 1000 });
    await screen.findByText('Eval quote two.', undefined, { timeout: 3000 });
  });
```

- [ ] **Step 2: Run the EvaluationPhase tests**

Run: `npx vitest run src/components/__tests__/EvaluationPhase.test.tsx`
Expected: all tests PASS (the two original keyboard tests plus the two new ones).

> If `window.matchMedia` is undefined in the jsdom setup so the default test sees `useReducedMotion()` as falsy and takes the flight path, the original "judges the current quote with arrow keys" test still passes because the commit is timer-driven (~820ms total < 3000ms timeout).

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/EvaluationPhase.test.tsx
git commit -m "test(motion): cover agree flight + reduced-motion fallback"
```

---

### Task 10: Archive stale design docs

**Files:**
- Move several root-level `*.md` into `docs/archive/`

- [ ] **Step 1: Create the archive dir and move stale docs**

Run:
```bash
mkdir -p docs/archive
git mv DESIGN_UPDATES.md RANKING_IMPROVEMENTS.md MOBILE_IMPROVEMENTS.md UI_SIMPLIFICATION.md LIVE_REORDERING_GUIDE.md RESET_GUIDE.md ReadRankDesignDoc.md ReadRankDevelopmentDoc.md PROJECT_SUMMARY.md docs/archive/
```
Expected: nine files moved. `REDESIGN_SPEC.md` and `EV-StyleGuide.md` remain at the root.

> If any listed file does not exist, drop it from the command and continue. Do not move `REDESIGN_SPEC.md` or `EV-StyleGuide.md`.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore(docs): archive stale design docs to docs/archive"
```

---

### Task 11: Full verification

**Files:** none

- [ ] **Step 1: Lint, build, test**

Run:
```bash
npm run lint && npm run build && npm test
```
Expected: lint clean, build succeeds, all tests pass.

- [ ] **Step 2: Final preview pass**

Start the preview and confirm, in light + dark and desktop + mobile widths:
- Agreeing flies the card into the pile; the pile count ticks up and pulses.
- Disagreeing slides off without a flight.
- No coral on any interactive element; bronze tier + confetti still coral.
- With OS "reduce motion" on, agree commits instantly and the pile pulses (no flight).

---

## Self-review notes

- **Spec coverage:** A (color) → Tasks 1–5; B (fly-to-rank, reduced-motion, mobile fallback via existing RankDock pulse + Task 8 sidebar pulse) → Tasks 6–9; C (archive docs) → Task 10; testing → Tasks 9, 11. Kept-coral (bronze + confetti) verified by the Task 4 Step 5 grep.
- **Type consistency:** `FlyRect` defined in Task 6 and imported in Task 7; `flight` state shape (`{ text, from, to }`) matches `FlyingCard` props; `durationMs={600}` matches the `delay(600)` in `handleButtonSwipe`.
- **No placeholders:** every code step shows the full replacement text and exact line anchors.
