# Onboarding Flow Implementation Plan (functionality only)

> **For agentic workers (Opus/Sonnet):** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Restructure Read & Rank's onboarding to be Landing-first with practice as an opt-in warm-up and one teach-by-doing moment in the first real race. **This plan is functionality only** — styling stays consistent with the current app; the visual modernization is a separate follow-up plan (`2026-06-10-design-layer.md`) that assumes this plan has merged.

**The problem being fixed:** `PhaseContainer` force-redirects first-time users into the pizza PracticeRound BEFORE they ever see the Landing page (`useEffect` at `src/components/PhaseContainer.tsx:81-84`). The Landing (hero + 3-step cards + election picker, added in commit fd095f0) is invisible on the one visit where it matters. This is also REDESIGN_SPEC.md pain point #4: onboarding is front-loaded; teach by doing instead.

**The new flow:**
1. **Landing is always the front door** — first-time and returning users land on it. The forced-practice redirect is deleted.
2. **Practice becomes an opt-in warm-up** — a quiet text-button on the Landing starts it; nobody is forced through pizza.
3. **Teach by doing in the first real race** — the existing coach marks stay; ONE new contextual moment fires after the user's first-ever agree in a real race, then never again (persisted flag).

**Tech:** React 19, zustand (persisted), vitest + RTL. Suite is green at 92 at branch time. Copy rules: no em dashes; two spaces after periods via `&nbsp;` + space in JSX.

**Hard contracts:** all existing tests keep passing (they pin copy, roles, accessible names, blindness invariants); no store shape changes beyond the single flag below; no visual redesign in this plan — new UI (the coach caption) uses existing patterns (`--surface-card`, `--border-subtle`, Manrope, existing radii).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/store/useReadRankStore.ts` | Modify | `firstAgreeCoached` flag + `completeFirstAgreeCoach` action |
| `src/store/__tests__/onboarding.test.ts` | Create | Flag behavior + persistence |
| `src/components/PhaseContainer.tsx` | Modify | Delete the forced-practice effect |
| `src/components/Landing.tsx` | Modify | Opt-in warm-up button |
| `src/components/__tests__/Landing.test.tsx` | Create | Hero, warm-up button, election section |
| `src/components/PracticeResultsScreen.tsx` | Modify | Exit CTA copy |
| `src/components/FirstAgreeCoach.tsx` | Create | One-time caption after the first real agree |
| `src/components/__tests__/FirstAgreeCoach.test.tsx` | Create | Shows once, dismisses, persists |
| `src/components/EvaluationPhase.tsx` | Modify | Mount the coach at the right moment |

---

### Task 0: Branch

- [ ] `git checkout -b feat/onboarding-flow`

---

### Task 1: Store — the `firstAgreeCoached` flag

**Files:** `src/store/useReadRankStore.ts`, `src/store/__tests__/onboarding.test.ts`

Mirror the existing `coachMarksCompleted` pattern EXACTLY — read how it is declared, defaulted, actioned (`completeCoachMarks`), and included in `partialize` before writing anything. Verify how absent keys rehydrate from an older persisted blob (the migration/version handling) and do whatever `coachMarksCompleted` does — no more.

- [ ] **Step 1: failing tests** — create `src/store/__tests__/onboarding.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore } from '../useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('first-agree coaching flag', () => {
  it('defaults to uncoached', () => {
    expect(useReadRankStore.getState().firstAgreeCoached).toBe(false);
  });

  it('flips once and stays flipped', () => {
    useReadRankStore.getState().completeFirstAgreeCoach();
    expect(useReadRankStore.getState().firstAgreeCoached).toBe(true);
    useReadRankStore.getState().completeFirstAgreeCoach();
    expect(useReadRankStore.getState().firstAgreeCoached).toBe(true);
  });
});
```

- [ ] **Step 2:** Run — FAIL (property/action missing).
- [ ] **Step 3:** Implement: interface entries (with a one-line doc comment: `/** The one-time caption after the user's first real agree has been shown. */`), initial value `false` (including in the store's `initialState` so `reset()` clears it), action `completeFirstAgreeCoach: () => set({ firstAgreeCoached: true })`, and add the key to `partialize`.
- [ ] **Step 4:** Tests green; `npm test` (94); build; lint baseline (12). Commit: `feat(onboarding): firstAgreeCoached store flag`

(End every commit in this plan with the `Co-Authored-By` trailer for your model.)

---

### Task 2: Landing-first flow

**Files:** `src/components/PhaseContainer.tsx`, `src/components/Landing.tsx`, `src/components/PracticeResultsScreen.tsx`, `src/components/__tests__/Landing.test.tsx`

- [ ] **Step 1: failing test** — create `src/components/__tests__/Landing.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from '../Landing';
import { useReadRankStore } from '../../store/useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('Landing', () => {
  it('renders the hero and the election picker', async () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/read what candidates say/i);
    // RaceHub inside the picker resolves the mock race async (fetch fallback).
    expect(await screen.findByText(/2024 indiana governor/i, undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it('offers practice as an opt-in warm-up', async () => {
    render(<Landing />);
    await userEvent.click(screen.getByRole('button', { name: /try a 30-second warm-up/i }));
    expect(useReadRankStore.getState().phase).toBe('practice');
    expect(useReadRankStore.getState().practiceProgress).not.toBeNull();
  });
});
```

NOTE: read `Landing.tsx` first — it consumes `useTheme()` from ThemeProvider. If rendering it bare throws for a missing provider, wrap the renders in this test file with `<ThemeProvider>` (import from `../../ThemeProvider`) — adapt minimally and report. Also READ `startPractice` in the store to confirm it sets `phase: 'practice'`; if it does not, find what does (PhaseContainer previously relied on the forced effect — the warm-up button must result in the practice screen actually showing, so wire whatever combination of actions that requires and adjust the test to assert the real contract).

- [ ] **Step 2:** Run — FAIL (no warm-up button).
- [ ] **Step 3: PhaseContainer** — DELETE the forced-practice effect (the `useEffect` containing `startPractice(PRACTICE_QUOTES)` near line 81) and any imports it alone used (`PRACTICE_QUOTES`, `startPractice` from the store destructure — check each before removing).
- [ ] **Step 4: Landing** — beneath the three step cards (inside the right column, after the `STEPS.map(...)` block), add:

```tsx
              <button
                type="button"
                onClick={() => startPractice(PRACTICE_QUOTES)}
                className="w-full text-left mt-1 px-2 py-3"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '0.8125rem',
                  color: 'var(--text-link)',
                  minHeight: '2.75rem',
                }}
              >
                Not sure yet?&nbsp; Try a 30-second warm-up with pizza opinions.
              </button>
```

with the imports/store wiring that requires (`useReadRankStore` for `startPractice`, `PRACTICE_QUOTES` from `../data/practiceData`).

- [ ] **Step 5: PracticeResultsScreen** — read the file; find the completion CTA (the button that routes back to the hub) and change ONLY its label to:

```tsx
You have the hang of it.&nbsp; Pick a real race.
```

(Keep its handler. If the current label is asserted by any test, update that assertion to the new copy.)

- [ ] **Step 6:** Landing tests green; full suite (96); build; lint. Browser check: clear localStorage → app opens on the Landing (NOT practice); the warm-up button enters practice; skipping or finishing practice returns to the hub/Landing; starting a race works.
- [ ] **Step 7:** Commit: `feat(onboarding): landing-first flow with opt-in practice warm-up`

---

### Task 3: The first-agree coach moment

**Files:** `src/components/FirstAgreeCoach.tsx`, `src/components/__tests__/FirstAgreeCoach.test.tsx`, `src/components/EvaluationPhase.tsx`

One contextual caption, once per user, after their first-ever agree in a REAL race (practice does not count — practice uses separate store state, so wiring into EvaluationPhase only is sufficient). It teaches the rank surface without a tutorial screen.

- [ ] **Step 1: failing tests** — create `src/components/__tests__/FirstAgreeCoach.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FirstAgreeCoach } from '../FirstAgreeCoach';
import { useReadRankStore } from '../../store/useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('FirstAgreeCoach', () => {
  it('shows the caption and persists dismissal on any interaction', () => {
    render(<FirstAgreeCoach variant="mobile" />);
    expect(screen.getByRole('status')).toHaveTextContent(/filed as your 1st choice/i);
    fireEvent.pointerDown(window);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(useReadRankStore.getState().firstAgreeCoached).toBe(true);
  });

  it('renders nothing once coached', () => {
    useReadRankStore.getState().completeFirstAgreeCoach();
    render(<FirstAgreeCoach variant="mobile" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('uses drag wording on desktop', () => {
    render(<FirstAgreeCoach variant="desktop" />);
    expect(screen.getByRole('status')).toHaveTextContent(/drag anytime to reorder/i);
  });
});
```

- [ ] **Step 2:** Run — FAIL (module not found).
- [ ] **Step 3: create `src/components/FirstAgreeCoach.tsx`:**

```tsx
import React, { useEffect } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';

export interface FirstAgreeCoachProps {
  /** Mobile points at the dock (tap); desktop points at the sidebar (drag). */
  variant: 'mobile' | 'desktop';
}

/**
 * One-time teach-by-doing caption after the user's first real agree
 * (REDESIGN_SPEC pain point #4: contextual coaching over tutorial screens).
 * Dismisses on ANY interaction and never shows again (persisted flag).
 */
export const FirstAgreeCoach: React.FC<FirstAgreeCoachProps> = ({ variant }) => {
  const { firstAgreeCoached, completeFirstAgreeCoach } = useReadRankStore();

  useEffect(() => {
    if (firstAgreeCoached) return;
    const dismiss = () => completeFirstAgreeCoach();
    window.addEventListener('pointerdown', dismiss, { once: true });
    window.addEventListener('keydown', dismiss, { once: true });
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [firstAgreeCoached, completeFirstAgreeCoach]);

  if (firstAgreeCoached) return null;

  return (
    <div role="status" className={`first-agree-coach first-agree-coach-${variant}`}>
      Filed as your 1st choice.&nbsp;{' '}
      {variant === 'mobile' ? 'Tap anytime to reorder.' : 'Drag anytime to reorder.'}
    </div>
  );
};
```

- [ ] **Step 4: styles** in `src/index.css` (current visual language — the design-layer plan will restyle later):

```css
.first-agree-coach {
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-ink);
  background-color: var(--surface-card);
  border: 1px solid var(--border-medium);
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
  box-shadow: 0 4px 16px rgba(28, 28, 28, 0.12);
}

.first-agree-coach-mobile {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(4.5rem + env(safe-area-inset-bottom));
  z-index: 41; /* one above the dock */
  max-width: calc(100vw - 2rem);
}

.first-agree-coach-desktop {
  margin-bottom: 0.5rem;
}
```

- [ ] **Step 5: wire into `src/components/EvaluationPhase.tsx`.** Read the current file structure first. Mobile: render `<FirstAgreeCoach variant="mobile" />` next to the `RankDock` (inside the mobile return) when `agreed.length === 1`. Desktop: render `<FirstAgreeCoach variant="desktop" />` directly above `<RankedListSidebar ... />` in the sidebar panel when `agreed.length === 1`. (The component itself handles the coached-flag gate; the `agreed.length === 1` gate ensures it appears at the first-agree moment and disappears naturally as ranking continues — both gates together mean: shows only in the window between the first agree and either any interaction or a second verdict.)
- [ ] **Step 6:** Coach tests green; full suite (99); build; lint. Browser: fresh user, real race, first agree → caption appears above the dock; any tap dismisses; never returns (including after reload); desktop variant shows drag wording above the sidebar.
- [ ] **Step 7:** Commit: `feat(onboarding): one-time first-agree coach caption`

---

### Task 4: Final verification + finish

- [ ] `npm test` (99), `npm run build` (0), `npm run lint` (baseline 12).
- [ ] Browser walkthrough, mobile + desktop: fresh localStorage → Landing → warm-up opt-in → practice → exit copy → hub → real race → coach marks still fire → first-agree caption → full race to reveal. Then a SECOND fresh race: no caption (flag persisted).
- [ ] Check off this plan; append execution notes (anything the implementer learned/adapted).
- [ ] Hand off via superpowers:finishing-a-development-branch (ask the user: merge locally / PR / hold).

---

## Appendix — must NOT do

- No visual redesign here: no new tokens, fonts, radii, shadows, or animation systems (that is `2026-06-10-design-layer.md`).
- Do not alter user-facing copy beyond the two strings this plan specifies (no em dashes; two spaces after periods via `&nbsp;`).
- Do not change store shape beyond the single flag.
- Do not touch the practice round's internals (splash/skip stay), the coach-mark tour, the keyboard guard, axis lock, or any blindness invariant — all test-pinned.
