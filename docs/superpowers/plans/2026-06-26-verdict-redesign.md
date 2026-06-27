# Verdict Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the verdict (agree/disagree) interaction: remove the coin-press stamp, make the agreed card travel and dock into the ranking as one connected motion (desktop sidebar + mobile collapsed dock), add mobile swipe-to-commit (left = disagree, right = agree) that continues into the dock on release, and give the Agree button a light-sweep cue. Verdict events get screen-reader announcements.

**Architecture:** Build on the Plan 1 motion foundation (`src/motion.ts` / `useMotion()`). Three phases: (A) stamp removal + light sweep + announcements (pure logic, TDD); (B) the connected desktop dock flight, evolving `FlyingCard` from a shrink-to-nothing clone into a measured-clone FLIP that lands as the full-size ranking row (browser-verified); (C) mobile swipe-to-commit via framer-motion axis-locked drag, continuing into the dock (browser-verified). The paddle buttons remain the keyboard/tap equivalent throughout.

**Tech Stack:** React 19, framer-motion 12 (drag + WAAPI via `useAnimate`), TypeScript, Vitest + @testing-library/react, Tailwind v4 (`src/index.css`).

**Source spec:** `docs/superpowers/specs/2026-06-26-motion-system-design.md` §3 and §1.

**Verification note:** Phase A is unit-testable. Phases B and C are visual/temporal interaction features — they are verified by running the dev server (preview tooling) under both normal and reduced motion, on desktop and mobile viewport sizes, NOT by fake unit tests. Each B/C task lists concrete acceptance criteria to check in the browser. The existing component tests (215) must stay green throughout.

**Key current-state facts (from code audit):**
- `EvaluationPhase.tsx` orchestrates via `handleButtonSwipe(direction)` (~lines 96-141): sets `pendingVerdict` (the stamp), waits 140ms, then on agree mounts `FlyingCard` (600ms) and calls `agree(currentQuote)` after; disagree waits 300ms then `disagree()`. `isMouseDevice = deviceType === 'mouse' || 'unknown'`. Refs: `quoteCardRef`, `sidebarRef`, `dockRef`. Reduced motion via `useReducedMotion()` skips the flight.
- `QuoteCard.tsx` renders the stamp overlay when `pendingVerdict` is set (lines 99-112); the card is NOT draggable today.
- `ActionButtons.tsx` paddles use `whileTap={{ scale: 0.98 }}`; no sweep.
- `FlyingCard.tsx` portals a clone, animates `scale 1→0.12, opacity 1→0.2` over 600ms — the "disappears then the pile pulses" effect we are replacing.
- Store: `agree(quote)` appends to `topic.agreed` (idempotent); `disagree(quote)` appends to `topic.disagreed`; `tierForIndex(i)` (in `src/utils/tiers.ts`) maps a position to a tier name.
- Rank surfaces: desktop `AgreedQuotesSidebar` (ref `sidebarRef`) and mobile `RankDock` (ref `dockRef`) both already pulse on new agree and already use `useMotion`/`useAnimate`. Rows render via `RankRail` → `RankList`.

---

## PHASE A — Stamp removal, light sweep, announcements (TDD)

### Task A1: Remove the coin-press stamp

**Files:**
- Modify: `src/components/QuoteCard.tsx`
- Modify: `src/components/EvaluationPhase.tsx`
- Modify: `src/index.css` (delete `.quote-stamp*` block)
- Test: `src/components/__tests__/QuoteCard.test.tsx`

- [ ] **Step 1: Update the QuoteCard test to assert no stamp**

In `src/components/__tests__/QuoteCard.test.tsx`, remove any test that passes `pendingVerdict` / asserts the stamp renders, and add:

```tsx
it('never renders a verdict stamp overlay', () => {
  render(<QuoteCard quote={makeQuote()} />);
  expect(document.querySelector('.quote-stamp')).toBeNull();
});
```

(Use the file's existing quote factory/helper for `makeQuote()`; if none exists, build a minimal `BlindQuote` inline matching the type.)

- [ ] **Step 2: Run it to verify current state**

Run: `npx vitest run src/components/__tests__/QuoteCard.test.tsx`
Expected: the new test PASSES only after the stamp is removed; if a `pendingVerdict` test still exists it may fail to compile — that's expected; proceed to remove the stamp.

- [ ] **Step 3: Remove the stamp from QuoteCard**

In `src/components/QuoteCard.tsx`: delete `pendingVerdict?: 'agree' | 'disagree';` from `QuoteCardProps`, remove `pendingVerdict` from the destructured props, and delete the entire `{pendingVerdict && ( ... )}` block (lines ~99-112).

- [ ] **Step 4: Remove stamp usage + flash delay from EvaluationPhase**

In `src/components/EvaluationPhase.tsx`: remove the `pendingVerdict` state and every `setPendingVerdict(...)` call, and stop passing `pendingVerdict` to `<QuoteCard>`. In `handleButtonSwipe`, delete the `await delay(140)` stamp-flash before the flight (agree path goes straight to mounting the flight) and the `await delay(300)` stamp delay on the disagree/no-flight path (replace with `await delay(120)` so the commit still feels deliberate but no longer waits on a stamp). Keep the rest of the flight timing intact for now (Phase B replaces the flight itself).

- [ ] **Step 5: Delete the stamp CSS**

In `src/index.css`, delete the "Coin Press Stamp Overlay" block: `.quote-stamp`, `.quote-stamp-circle`, `.quote-stamp-agree .quote-stamp-circle`, `.quote-stamp-disagree .quote-stamp-circle`, `.quote-stamp-text`, and the two `...-text` color rules. (Leave the `.disagreed-divider` rules that follow — those are unrelated.)

- [ ] **Step 6: Verify build, lint, tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: build clean; no new lint errors; full suite green (update/adjust the EvaluationPhase test if it asserted stamp behavior).

- [ ] **Step 7: Commit**

```bash
git add src/components/QuoteCard.tsx src/components/EvaluationPhase.tsx src/index.css src/components/__tests__/QuoteCard.test.tsx
git commit -m "feat(verdict): remove coin-press stamp"
```

---

### Task A2: Light-sweep cue on the Agree button

**Files:**
- Modify: `src/components/ActionButtons.tsx`
- Modify: `src/index.css`
- Test: (browser-verified; plus keep existing ActionButtons behavior)

- [ ] **Step 1: Add the sweep element + reduced-motion-aware trigger**

Rewrite `src/components/ActionButtons.tsx` to route press through `useMotion()` and play a light sweep on agree. Use `useAnimate` from framer-motion to run the sweep imperatively so it does not fire under reduced motion:

```tsx
import React from 'react';
import { motion, useAnimate } from 'framer-motion';
import { useMotion, DUR, EASE } from '../motion';

interface ActionButtonsProps {
  onAgree: () => void;
  onDisagree: () => void;
  disabled?: boolean;
  fixed?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onAgree, onDisagree, disabled = false, fixed = false }) => {
  const m = useMotion();
  const [sweepScope, animateSweep] = useAnimate();

  const handleAgree = () => {
    if (!m.reduced && sweepScope.current) {
      animateSweep(sweepScope.current, { x: ['-100%', '100%'] }, { duration: m.dur(DUR.flight) / 1000, ease: EASE.standard });
    }
    onAgree();
  };

  return (
    <div className={`action-buttons-container ${fixed ? 'action-buttons-fixed' : ''}`} role="group" aria-label="Verdict">
      <motion.button
        onClick={onDisagree}
        disabled={disabled}
        className="action-button action-button-disagree"
        whileTap={m.tap({ scale: 0.98 })}
        aria-label="Disagree with this quote"
      >
        DISAGREE
      </motion.button>
      <motion.button
        onClick={handleAgree}
        disabled={disabled}
        className="action-button action-button-agree"
        whileTap={m.tap({ scale: 0.98 })}
        aria-label="Agree with this quote"
      >
        AGREE
        <span ref={sweepScope} className="action-button-sweep" aria-hidden="true" />
      </motion.button>
    </div>
  );
};
```

- [ ] **Step 2: Add the sweep CSS**

In `src/index.css`, in the Action Buttons section, ensure the agree button clips the sweep and add the sweep element:

```css
.action-button-agree { position: relative; overflow: hidden; }
.action-button-sweep {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
}
```

- [ ] **Step 3: Build + lint + tests**

Run: `npm run build && npm run lint && npx vitest run`
Expected: all green (existing ActionButtons tests still pass — clicking agree still calls `onAgree`).

- [ ] **Step 4: Browser-verify the sweep** (acceptance criteria)

Start the dev server (preview tooling, config `read-rank-dev`). On an evaluation screen, click AGREE: a soft light sheen sweeps left-to-right across the button once, plus the existing press. Toggle reduced motion (DevTools → Rendering → emulate `prefers-reduced-motion: reduce`): clicking AGREE shows NO sweep (and no press scale). Confirm the verdict still commits in both cases.

- [ ] **Step 5: Commit**

```bash
git add src/components/ActionButtons.tsx src/index.css
git commit -m "feat(verdict): light-sweep cue on the Agree button"
```

---

### Task A3: Screen-reader verdict announcements

**Files:**
- Modify: `src/components/EvaluationPhase.tsx`
- Test: `src/components/__tests__/EvaluationPhase.test.tsx`

The spec requires a polite live-region announcement on every verdict ("Added to your ranking, Gold" / "Moved to disagreed"). Tier comes from the new agreed position via `tierForIndex` (`src/utils/tiers.ts`) and the tier display name from `TIER_META` (`src/utils/tiers.ts`).

- [ ] **Step 1: Write the failing test**

Add to `src/components/__tests__/EvaluationPhase.test.tsx` (follow the file's existing render/setup helpers):

```tsx
it('announces the verdict to screen readers on agree', async () => {
  // ...render EvaluationPhase with a race that has at least one quote (use existing helper)...
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /agree with this quote/i }));
  const status = await screen.findByRole('status');
  expect(status.textContent).toMatch(/added to your ranking/i);
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npx vitest run src/components/__tests__/EvaluationPhase.test.tsx`
Expected: FAIL (no such live region / text yet).

- [ ] **Step 3: Implement the live region + announcement**

In `src/components/EvaluationPhase.tsx`:
- Import: `import { tierForIndex } from '../utils/tiers'; import { TIER_META } from '../utils/tiers';` (verify exact export names; `tierForIndex` is already used elsewhere in the codebase).
- Add state: `const [verdictAnnounce, setVerdictAnnounce] = useState('');`
- In `handleButtonSwipe`, immediately after the `agree(currentQuote)` call (both the flight and no-flight paths), set:
  `const pos = agreed.length; const tier = tierForIndex(pos); setVerdictAnnounce(`Added to your ranking, ${TIER_META[tier].name}.`);`
  (`agreed.length` is the count BEFORE this commit, i.e. the new item's 0-based index — confirm `agreed` is the current topic's agreed list in scope.)
- After the `disagree(currentQuote)` call, set: `setVerdictAnnounce('Moved to disagreed.');`
- Render once, near the root of the returned JSX: `<div className="sr-only" role="status" aria-live="polite">{verdictAnnounce}</div>`

- [ ] **Step 4: Run the test — expect PASS**

Run: `npx vitest run src/components/__tests__/EvaluationPhase.test.tsx`
Expected: PASS. Then full suite: `npx vitest run` (215+ green).

- [ ] **Step 5: Build + lint + commit**

```bash
npm run build && npm run lint
git add src/components/EvaluationPhase.tsx src/components/__tests__/EvaluationPhase.test.tsx
git commit -m "feat(a11y): announce verdict result to screen readers"
```

---

## PHASE B — Desktop connected dock flight (browser-verified)

Replace the shrink-to-nothing `FlyingCard` with a connected motion: the full quote card resizes and travels into the ranking sidebar, landing as a full-size row, in one timeline (shadow lifts mid-flight then settles). Mechanism = measured-clone FLIP (the demo-validated approach), NOT `layoutId` — lower integration risk against the scrollable sidebar/`RankRail`.

### Task B1: Evolve FlyingCard into a connected dock flight

**Files:**
- Modify: `src/components/FlyingCard.tsx`
- Modify: `src/components/EvaluationPhase.tsx`

- [ ] **Step 1: Rewrite FlyingCard to animate the full box (not shrink to 0.12)**

Change `FlyingCard` to accept a target rect that is the real destination row's box, and animate position+size together with a shadow lift and settle, ending opaque at the destination (so the handoff to the real row is invisible). Concrete implementation:

```tsx
import { useAnimate } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMotion, DUR, EASE } from '../motion';

export interface FlyRect { top: number; left: number; width: number; height: number; }

interface FlyingCardProps {
  text: string;
  from: FlyRect;
  to: FlyRect;        // the destination ROW box (full size), not a point
  onDone: () => void; // parent reveals the real row + unmounts this
}

export function FlyingCard({ text, from, to, onDone }: FlyingCardProps) {
  const m = useMotion();
  const [scope, animate] = useAnimate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (m.reduced) { onDone(); return; }
      await animate(scope.current, {
        left: [from.left, to.left],
        top: [from.top, to.top],
        width: [from.width, to.width],
        height: [from.height, to.height],
      }, { duration: m.dur(DUR.flight) / 1000, ease: EASE.flight });
      if (!cancelled) onDone();
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div
      ref={scope}
      className="ev-quote-card flying-card-connected"
      aria-hidden="true"
      style={{ position: 'fixed', top: from.top, left: from.left, width: from.width, height: from.height, margin: 0, zIndex: 9999, pointerEvents: 'none', overflow: 'hidden' }}
    >
      <div className="ev-quote-text" style={{ fontSize: 'clamp(0.95rem, 2vw, 1.1rem)' }}>{text}</div>
    </div>,
    document.body,
  );
}
```

Add to `src/index.css`: `.flying-card-connected { box-shadow: var(--shadow-hover); transition: box-shadow var(--dur-flight) var(--ease-flight); }` (the lift; it settles as the clone is removed).

- [ ] **Step 2: In EvaluationPhase, measure the real destination row and coordinate the handoff**

Rework the agree path of `handleButtonSwipe` so the flight lands on the actual new row:
1. Capture `from = quoteCardRef.current.getBoundingClientRect()` and the quote text BEFORE committing.
2. Call `agree(currentQuote)` so the new row renders in the sidebar, but keep it visually hidden for one frame (add a transient "just landed" id in state; the sidebar row with that id renders with `visibility: hidden`).
3. On the next animation frame, measure that row's `getBoundingClientRect()` as `to`, then mount `FlyingCard` with `{from, to, text, onDone}`.
4. In `onDone`: clear the hidden-row id (row becomes visible), unmount `FlyingCard`, advance state.
5. Keep `quoteCardRef` source hidden during the flight (existing `opacity: flight ? 0 : 1` pattern).

(If wiring the per-row hidden id into `RankRail`/`RankList` proves invasive, the acceptable fallback is to measure the sidebar's next-row insertion box from the sidebar container rect and land there, then let the real row appear underneath — verify visually that the seam is not visible.)

- [ ] **Step 3: Reduced-motion path**

When `m.reduced`, skip mounting `FlyingCard` entirely: commit `agree`, no flight (the sidebar already does its own pulse, which is also reduced-aware). The aria-live announcement from Task A3 covers the information.

- [ ] **Step 4: Browser-verify** (acceptance criteria, desktop viewport)

Run the dev server. Agree on a quote: the full quote card travels into the sidebar and lands as the actual ranking row in one continuous motion — no shrink-to-dot, no fade-to-nothing, no separate pop; the shadow lifts during travel and settles. The landed row shows the full quote. Do several agrees; rows stack correctly. Toggle reduced motion: no travel, the row appears instantly and the sidebar pulse is absent/instant; announcement fires. Confirm `npx vitest run` stays green (update the FlyingCard/EvaluationPhase tests for the new prop shape — `to` is a row rect and `onDone` replaces the timed delay; the existing "reduced motion commits without flying card" test must still pass).

- [ ] **Step 5: Commit**

```bash
git add src/components/FlyingCard.tsx src/components/EvaluationPhase.tsx src/index.css src/components/__tests__/EvaluationPhase.test.tsx
git commit -m "feat(verdict): connected dock flight (card lands as the ranking row)"
```

---

## PHASE C — Mobile swipe-to-commit (browser-verified)

Add axis-locked horizontal drag to the quote card on touch devices: drag right past threshold = agree, left = disagree, with peek labels; on release the same card continues from the finger into the collapsed dock (agree) or to Iron (disagree). Paddles remain the tap/keyboard equivalent.

### Task C1: Axis-locked swipe on the quote card

**Files:**
- Modify: `src/components/QuoteCard.tsx` (accept optional drag props) OR add a thin wrapper in `EvaluationPhase.tsx`
- Modify: `src/components/EvaluationPhase.tsx`
- Modify: `src/index.css` (peek labels)

- [ ] **Step 1: Make the active card draggable on x (touch only)**

In `EvaluationPhase.tsx`, for the touch layout only, wrap the active `QuoteCard` in a `motion.div` with framer drag:

```tsx
<motion.div
  drag={isMouseDevice ? false : 'x'}
  dragSnapToOrigin
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.6}
  onDrag={(_, info) => updatePeek(info.offset.x)}
  onDragEnd={(_, info) => {
    const THRESH = 90;
    if (info.offset.x > THRESH || info.velocity.x > 500) handleButtonSwipe('agree');
    else if (info.offset.x < -THRESH || info.velocity.x < -500) handleButtonSwipe('disagree');
    resetPeek();
  }}
  style={{ touchAction: 'pan-y' }}
>
  <QuoteCard ... />
</motion.div>
```

`updatePeek(dx)` sets state driving two peek labels (opacity = clamp(|dx|/THRESH)); `resetPeek()` clears them. `dragSnapToOrigin` returns the card to center if not committed. Velocity check gives flick support.

- [ ] **Step 2: Peek labels + CSS**

Render two absolutely-positioned peek labels over the card area ("◀ Disagree" dark left, "Agree ▶" teal right) whose opacity is driven by the drag state. Add `.swipe-peek-*` usage (the classes already exist in `index.css`) or new minimal styles. Under reduced motion the drag still works (it's user-driven), but skip the commit flight per Phase B's reduced path.

- [ ] **Step 3: Continue the gesture into the dock**

On commit from a swipe, the existing `handleButtonSwipe` runs (which on mobile flies to `dockRef`). Ensure the flight starts from the card's CURRENT dragged position (capture the live rect at `onDragEnd`, not the origin) so it is continuous with the finger. Reuse Phase B's connected-flight mechanism with the mobile dock as the destination (the dock is collapsed, so the card collapses into the dock tier pip; the full quote lives in the sheet — no full quote shown in the collapsed strip).

- [ ] **Step 4: Browser-verify** (acceptance criteria, mobile viewport ~390px)

Run dev server, narrow viewport / touch emulation. Drag the card right: "Agree" peek fades in, border tints; release past the line → card continues into the dock, the tier pip fills + pulses, counter increments. Drag left → "Disagree" peek → card goes to Iron. Release before the line → snaps back. A fast flick commits even if short. Paddle buttons still commit. Reduced motion: no travel, instant commit + announcement. `npx vitest run` green.

- [ ] **Step 5: Commit**

```bash
git add src/components/EvaluationPhase.tsx src/components/QuoteCard.tsx src/index.css
git commit -m "feat(verdict): mobile swipe-to-commit continuing into the dock"
```

---

## Self-Review

- **Spec §3.1 (desktop dock flight):** Phase B. Deviation from `layoutId` to measured-clone FLIP documented + rationale (lower risk; spec allowed the clone approach).
- **Spec §3.1 (no stamp, light sweep):** Task A1 (remove stamp), A2 (light sweep).
- **Spec §3.2 (mobile swipe + dock collapse, paddles as equivalent):** Phase C; paddles retained.
- **Spec §3.3 (a11y: keyboard path, reduced-motion, announcements):** keyboard path unchanged (paddles + arrow keys already exist); reduced-motion via `useMotion()` in every new animation; announcements in A3.
- **Placeholder scan:** none — Phase A has full code + commands; Phase B/C give concrete code and explicit browser acceptance criteria (honest: these are interaction features, verified in-browser, not via fake unit tests).
- **Type/name consistency:** `FlyingCard` prop shape changes from `(text, from, to, durationMs)` to `(text, from, to, onDone)`; all call sites in `EvaluationPhase` updated in B1; the EvaluationPhase test that checks the reduced-motion no-flying-card path is preserved.
- **Reduced-motion:** every new motion (sweep, flight, swipe-commit) routes through `useMotion()` and has an instant path.

## Risks / iteration note

Phases B and C are the interaction-heavy parts. The measured-clone handoff (B2) and the swipe-to-dock continuity (C3) will likely need a round or two of in-browser tuning (timing, the hidden-row handoff, peek thresholds). Treat the "browser-verify" steps as real gates: iterate on the implementation until the acceptance criteria are met before committing, rather than committing on first compile.
