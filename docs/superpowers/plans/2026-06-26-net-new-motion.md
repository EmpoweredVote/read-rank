# Net-New Screen Motion Implementation Plan (Motion System — Plan 4 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the "moderate, purposeful" net-new micro-interactions from spec §6 — Landing stagger-in, RaceHub/RaceCard stagger + tokenized hover, IssueSelection row stagger + check-tile pop, and the Iron "unrefining" shelf transition — and close the last two reduced-motion gaps from §7 (RaceHub header, RankSheet), all routed through `useMotion()`.

**Architecture:** Every new entrance/press uses the existing `useMotion()` hook and `EASE`/`DUR`/`STAGGER` tokens from `src/motion.ts` (so reduced motion collapses to instant with no transform — `m.enter()` returns `initial:false`, `m.transition()` collapses duration AND delay to 0). CSS-driven hover/transitions read the mirrored `--ease-*`/`--dur-*` custom properties. No new state machines; entrances are mount-time framer `initial/animate` with index-based stagger delays. The Iron shelf gets `AnimatePresence` enter/exit so a recovered ("Move to agreed") row visibly leaves and newly-disagreed rows dash in.

**Tech Stack:** React + TypeScript, framer-motion via `useMotion()` + tokens, CSS custom props in `src/index.css`, Vitest + @testing-library/react.

---

## Scope note — the Iron transition, grounded in the actual UI

Spec §6 / REDESIGN_SPEC §6.3 describe a row "moving into Iron" playing a fill-drains-to-hollow + border-dashes-in transition, and "crossing back refills." **In the current code there is no in-place "drag a row below the divider to disagree" affordance** — disagreeing happens only through the Plan-2 verdict flight (the full card flies to the Iron shelf, already animated/committed in Plan 2). The only verdict change available *from* the ranking surface is **recover** (`reAgree`, disagreed→agreed) via the "Move to agreed" button in `RankRail.tsx`. So this plan implements the achievable, honest subset:

- Disagreed shelf rows **dash/drain in** when they appear (enter animation) and **animate out** when recovered (exit animation), via `AnimatePresence` + `useMotion()`.
- The shelf toggle chevron transition is tokenized.
- Recover is **announced** to screen readers, and under reduced motion the change is an instant swap (no enter/exit motion) + the announcement.

The full "drag in place to unrefine" is not built because the UI affordance for it does not exist; the verdict-flight arrival into Iron is already covered by Plan 2. This is flagged here so the reviewer doesn't expect a drag-to-Iron animation.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `src/components/Landing.tsx` (modify) | Hero text blocks + step cards stagger in on mount. | 1 |
| `src/index.css` (modify) | Tokenize `.race-card-v2` hover transition/shadow; IssueSelection row transitions; Iron dash-in keyframe. | 2, 4, 5 |
| `src/components/RaceHub.tsx` (modify) | Route header + empty-state through `useMotion()`; stagger race cards in (per-card index delay). | 3 |
| `src/components/RaceCard.tsx` (modify) | Accept an optional `enterIndex` for the stagger; otherwise unchanged plain button. | 3 |
| `src/components/IssueSelection.tsx` (modify) | Rows stagger in; check-tile scale-pops on select; tokenized selected-row transition. | 4 |
| `src/components/RankSheet.tsx` (modify) | Route the drag-to-close `motion.div` through `useMotion()` (close §7 gap). | 6 |
| `src/components/RankRail.tsx` (modify) | Iron shelf rows enter/exit via `AnimatePresence`+`useMotion()`; tokenize chevron; recover announcement. | 5 |

Existing tests that MUST stay green (they query content/roles, which still render under framer `initial`): `Landing.test.tsx`, `RaceHub.test.tsx`, `RaceCard.test.tsx`, `IssueSelection.test.tsx`. Current suite: **220 tests** (post-Plan-3).

---

## Conventions (apply in every task)

- Import motion tokens: `import { useMotion, EASE, DUR, STAGGER } from '../motion';` (import only what the task uses — unused imports are lint errors).
- `m.enter(offset?)` → spread onto a `motion.*` element gives `{ initial, animate }` (initial is `false` when reduced). `m.transition(ms, curve?, { delay })` → a framer Transition; it already collapses duration AND delay to 0 when reduced, so pass delays directly (no `m.reduced ? 0 :` guard).
- The project enforces ESLint `react-hooks/set-state-in-effect` — never call setState synchronously in a `useEffect` body (wrap in `setTimeout`/lazy init).
- Baseline lint is **9 errors / 4 warnings**, ALL pre-existing in `src/hooks/*` and `ResultsPhase.tsx` (MegaParticles ref-during-render + setLoading). Tasks must add **no new** lint errors; verify with `npx eslint <file>`. `npm run lint` will never be fully clean — judge the delta on files you touch.
- Per task: `npm run build` clean, `npx vitest run` all green, then commit with the conventional message shown, ending:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 1: Landing entrances

The Landing hero (eyebrow, two headline lines, lede, warm-up button, address input) and the three step cards are currently static. Stagger them in on mount with `easeSettle`. **Verification:** browser-verified (the entrance is visual); `Landing.test.tsx` must stay green (content still renders).

**Files:**
- Modify: `src/components/Landing.tsx`

- [ ] **Step 1: Import framer + motion tokens**

At the top of `src/components/Landing.tsx`, add:

```tsx
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
```

- [ ] **Step 2: Read motion config in the component**

Inside `export function Landing()`, after `const { startPractice } = useReadRankStore();`, add:

```tsx
  const m = useMotion();
```

- [ ] **Step 3: Animate the hero left column as a staggered group**

The hero left column is the first `<div>` inside the `grid` (containing the eyebrow `<p>`, the `<h1>`, the headline `<p>`, the lede `<p>`, the warm-up `<button>`, and `<AddressFilterInput/>`). Convert that wrapping `<div>` to a `motion.div` that stagger-reveals its children. Replace:

```tsx
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-5"
```

with (note: each direct child becomes a `motion.*` with an incremental delay; keep all existing classes/styles/handlers verbatim):

```tsx
        <motion.div>
          <motion.p
            {...m.enter({ y: 12 })}
            transition={m.transition(DUR.moderate, EASE.settle, { delay: 0 })}
            className="text-xs font-bold uppercase tracking-widest mb-5"
```

Then add `{...m.enter({ y: 12 })} transition={m.transition(DUR.moderate, EASE.settle, { delay: ... })}` to each subsequent direct child, converting the tag to its `motion.` equivalent, with these delays (seconds via the helper's ms arg):
- `<h1>` → `motion.h1`, delay `STAGGER.name / 1000` (0.2s) — wait, delays are passed in seconds to the `delay` field. Use `DUR`/`STAGGER` ms divided by 1000. Concretely use these literal second values so the cascade is even: eyebrow `0`, h1 `0.06`, headline `p` `0.12`, lede `p` `0.18`, warm-up `button` `0.24`. Pass each as `{ delay: <value> }`.
- The headline `<p>` (the "rank by what they said.") → `motion.p`, `{ delay: 0.12 }`.
- The lede `<p>` → `motion.p`, `{ delay: 0.18 }`.
- The warm-up `<button>` → `motion.button`, `{ delay: 0.24 }`. Keep `type="button"` and the `onClick`.
- Leave `<AddressFilterInput />` as the last child WITHOUT wrapping it in motion (it has its own internal motion; wrapping would double-animate). Close the wrapper with `</motion.div>`.

- [ ] **Step 4: Stagger the three step cards**

Replace the step-cards block:

```tsx
        <div className="space-y-3">
          {STEPS.map(({ n, heading, body, start }) => (
            <div key={n} className="rr-step">
```

with:

```tsx
        <div className="space-y-3">
          {STEPS.map(({ n, heading, body, start }, i) => (
            <motion.div key={n} className="rr-step"
              {...m.enter({ y: 12 })}
              transition={m.transition(DUR.moderate, EASE.settle, { delay: 0.1 + i * (STAGGER.gridCell / 1000) })}>
```

and change that block's closing `</div>` (the one closing each `.rr-step`) to `</motion.div>`. The `<span className="rr-step__n">`, the inner `<div>` with title/body, and the conditional `<span className="rr-step__tag">` stay exactly as they are.

- [ ] **Step 5: Build + lint + tests**

Run: `npm run build && npx eslint src/components/Landing.tsx && npx vitest run`
Expected: build clean; `Landing.tsx` eslint clean; all 220 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/Landing.tsx
git commit -m "feat(motion): stagger the landing hero and step cards in on mount

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Tokenize the RaceCard hover

The `.race-card-v2` hover lift uses hardcoded durations (`0.18s`/`0.2s`), the CSS-default `ease`, and a hardcoded shadow. Tokenize to the motion custom props. **Verification:** browser-verified (hover lift unchanged in feel); pure CSS, no test impact.

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Confirm the shadow token exists**

Run: `grep -n "shadow-hover" src/index.css`
Expected: a `--shadow-hover:` declaration in `:root`. If it does NOT exist, skip the shadow swap in Step 2 and leave the literal shadow as-is (do not invent a token).

- [ ] **Step 2: Tokenize the hover transition (and shadow if the token exists)**

In `src/index.css`, find the `.race-card-v2` base rule and its `:hover`. Replace the transition line:

```css
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.2s ease;
```

with:

```css
  transition: border-color var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard);
```

Then in `.race-card-v2:hover`, IF `--shadow-hover` exists (from Step 1), replace:

```css
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.10), 0 1px 3px rgba(0, 0, 0, 0.05);
```

with:

```css
  box-shadow: var(--shadow-hover);
```

(If `--shadow-hover` does not exist, leave the literal shadow unchanged.) Leave `transform: translateY(-2px)` and the `:focus-visible` rule and the `@media (prefers-reduced-motion: reduce)` block unchanged.

- [ ] **Step 3: Build + verify the reduced-motion override still wins**

Run: `npm run build`
Expected: success. Confirm by reading that the existing `@media (prefers-reduced-motion: reduce) { .race-card-v2:hover { transform: none; } }` block still follows these rules in source order (it should — you didn't touch it), so reduced motion still flattens the lift.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "refactor(motion): tokenize race card hover transition and shadow

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: RaceHub header gap + race-card stagger

Close the §7 reduced-motion gap on the RaceHub header and empty-state (they use raw inline `motion.div`), and stagger the race cards in on load. **Verification:** browser-verified; `RaceHub.test.tsx` and `RaceCard.test.tsx` must stay green.

**Files:**
- Modify: `src/components/RaceHub.tsx`
- Modify: `src/components/RaceCard.tsx`

- [ ] **Step 1: Add an optional stagger index to RaceCard**

In `src/components/RaceCard.tsx`, add `enterIndex` to the props interface (after `onSelect`):

```tsx
  onSelect: () => void;
  /** When set, the card mounts with a staggered entrance (race grid reveal). */
  enterIndex?: number;
```

Add the framer + motion imports at the top:

```tsx
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
```

Destructure `enterIndex` in the component body (add to the existing destructure list):

```tsx
    progress = 'not-started', progressLabel, disabled, onSelect, enterIndex,
```

Read motion config — add near the top of the component body (before `return`):

```tsx
  const m = useMotion();
  const entrance = enterIndex === undefined
    ? {}
    : { ...m.enter({ y: 12 }), transition: m.transition(DUR.moderate, EASE.settle, { delay: Math.min(enterIndex, 8) * (STAGGER.gridCell / 1000) }) };
```

Change the root `<button ...>` to `<motion.button ...>` and spread `{...entrance}` onto it (place the spread FIRST so explicit props win). Specifically replace:

```tsx
    <button
      type="button"
      className={`race-card-v2 race-card-v2--${progress}`}
```

with:

```tsx
    <motion.button
      {...entrance}
      type="button"
      className={`race-card-v2 race-card-v2--${progress}`}
```

and change the matching closing `</button>` to `</motion.button>`. (When `enterIndex` is undefined the spread is empty, so the card behaves exactly as today — keeps `RaceCard.test.tsx` green.)

- [ ] **Step 2: Pass a stable stagger index from RaceHub**

In `src/components/RaceHub.tsx`, the `renderCard` callback maps a `RaceSummary` to a `<RaceCard>`. It is called via `section.races.map(renderCard)`. Change the section render to pass the within-section index. Replace:

```tsx
                {!collapsed && (
                  <div className="race-grid" id={regionId}>
                    {section.races.map(renderCard)}
                  </div>
                )}
```

with:

```tsx
                {!collapsed && (
                  <div className="race-grid" id={regionId}>
                    {section.races.map((race, i) => renderCard(race, i))}
                  </div>
                )}
```

and update the `renderCard` signature + the `<RaceCard>` it returns to accept and forward the index. Change:

```tsx
  const renderCard = useCallback((race: RaceSummary) => {
```

to:

```tsx
  const renderCard = useCallback((race: RaceSummary, enterIndex?: number) => {
```

and add `enterIndex={enterIndex}` as a prop on the returned `<RaceCard ... />` (anywhere in its prop list).

- [ ] **Step 3: Route the header through useMotion**

At the top of `src/components/RaceHub.tsx`, change the framer import to also pull the hook + tokens:

```tsx
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR } from '../motion';
```

Inside the component body (after the `useState`/`useEffect` hooks, before `handleSelect` is fine, but it must be at the top level of the component), add:

```tsx
  const m = useMotion();
```

Then replace the header `motion.div`:

```tsx
        <motion.div
          className="max-w-2xl mx-auto mb-4"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
```

with:

```tsx
        <motion.div
          className="max-w-2xl mx-auto mb-4"
          {...m.enter({ y: 12 })}
          transition={m.transition(DUR.moderate, EASE.settle)}
        >
```

And the empty-state `motion.div`:

```tsx
        <motion.div className="max-w-2xl mx-auto text-center py-12"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
```

with:

```tsx
        <motion.div className="max-w-2xl mx-auto text-center py-12"
          {...m.enter({ y: 8 })} transition={m.transition(DUR.base, EASE.settle)}>
```

- [ ] **Step 4: Build + lint + tests**

Run: `npm run build && npx eslint src/components/RaceHub.tsx src/components/RaceCard.tsx && npx vitest run`
Expected: build clean; both files eslint clean; all 220 tests pass. If `RaceHub.test.tsx` or `RaceCard.test.tsx` fail because they assert exact prop counts or snapshot the button tag, check whether the test queries by role/text (it should still find the `motion.button`, which renders a real `<button>`); if a test breaks for a legitimate reason, report it as a concern rather than weakening the test.

- [ ] **Step 5: Commit**

```bash
git add src/components/RaceHub.tsx src/components/RaceCard.tsx
git commit -m "feat(motion): stagger race cards in; route RaceHub header through useMotion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: IssueSelection row stagger + check-tile pop

The issue rows are static and the check tile snaps on select. Stagger the rows in on mount, pop the check tile with a gentle overshoot when a row becomes selected, and tokenize the selected-row transition. **Verification:** browser-verified; `IssueSelection.test.tsx` must stay green.

**Files:**
- Modify: `src/components/IssueSelection.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Import framer + motion tokens**

At the top of `src/components/IssueSelection.tsx`, add:

```tsx
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
```

- [ ] **Step 2: Read motion config**

Inside `IssueSelection`, after `const race = getCurrentRaceProgress();`, add:

```tsx
  const m = useMotion();
```

- [ ] **Step 3: Stagger the rows in**

The list maps `topicData` to either an unscored `<div className="issue-row ...">` or a scored `<button className="issue-row issue-row-toggle ...">`. Give BOTH a staggered mount entrance keyed by index. Change the map to expose the index:

```tsx
        {topicData.map((topic) => {
```

to:

```tsx
        {topicData.map((topic, i) => {
```

For the unscored branch, convert the `<div ...>` to `motion.div` with the entrance. Replace:

```tsx
              <div key={topic.topicKey} className="issue-row issue-row-unscored">
```

with:

```tsx
              <motion.div key={topic.topicKey} className="issue-row issue-row-unscored"
                {...m.enter({ y: 10 })}
                transition={m.transition(DUR.base, EASE.settle, { delay: i * (STAGGER.gridCell / 1000) })}>
```

and its closing `</div>` → `</motion.div>`.

For the scored branch, convert `<button ...>` to `motion.button` with the entrance (spread entrance FIRST so explicit props win). Replace:

```tsx
            <button
              key={topic.topicKey}
              type="button"
              className={`issue-row issue-row-toggle ${isSelected ? 'issue-row-selected' : ''}`}
              onClick={() => toggleTopic(topic.topicKey)}
              aria-pressed={isSelected}
              aria-label={`${topic.title}, ${topic.quoteCount} quotes`}
            >
```

with:

```tsx
            <motion.button
              key={topic.topicKey}
              {...m.enter({ y: 10 })}
              transition={m.transition(DUR.base, EASE.settle, { delay: i * (STAGGER.gridCell / 1000) })}
              type="button"
              className={`issue-row issue-row-toggle ${isSelected ? 'issue-row-selected' : ''}`}
              onClick={() => toggleTopic(topic.topicKey)}
              aria-pressed={isSelected}
              aria-label={`${topic.title}, ${topic.quoteCount} quotes`}
            >
```

and its closing `</button>` → `</motion.button>`.

- [ ] **Step 4: Pop the check tile on select**

The check tile is `<span className={`issue-check-tile ${isSelected ? 'issue-check-tile-selected' : ''}`} aria-hidden="true">`. Convert it to a `motion.span` that pops with a gentle overshoot when it becomes selected. Replace:

```tsx
              <span className={`issue-check-tile ${isSelected ? 'issue-check-tile-selected' : ''}`} aria-hidden="true">
                {isSelected && (
```

with:

```tsx
              <motion.span className={`issue-check-tile ${isSelected ? 'issue-check-tile-selected' : ''}`} aria-hidden="true"
                animate={m.reduced ? undefined : { scale: isSelected ? [1, 1.18, 1] : 1 }}
                transition={m.transition(DUR.fast, EASE.overshoot)}>
                {isSelected && (
```

and its closing `</span>` → `</motion.span>`. (When `m.reduced`, `animate` is `undefined` so no scale pop; the checkmark still appears instantly.)

- [ ] **Step 5: Tokenize the selected-row transition in CSS**

In `src/index.css`, find the `.issue-row` / `.issue-row-toggle` / `.issue-check-tile` rules. If any has a hardcoded `transition:` for border/background/color (e.g. `transition: ... 0.15s ease` or `0.2s`), replace the duration/easing with tokens: `var(--dur-fast) var(--ease-standard)` for the check tile and `var(--dur-base) var(--ease-standard)` for the row border/background. If a rule has NO `transition` declared (so selected-state changes are instant), ADD `transition: border-color var(--dur-base) var(--ease-standard), background-color var(--dur-base) var(--ease-standard);` to `.issue-row-toggle`. Do not change colors, only the transition timing. (Read the actual rules first; only touch transition declarations.)

- [ ] **Step 6: Build + lint + tests**

Run: `npm run build && npx eslint src/components/IssueSelection.tsx && npx vitest run`
Expected: build clean; eslint clean; all 220 tests pass (`IssueSelection.test.tsx` queries by role/label/text — the `motion.button` still exposes `role="button"`, `aria-pressed`, and `aria-label`).

- [ ] **Step 7: Commit**

```bash
git add src/components/IssueSelection.tsx src/index.css
git commit -m "feat(motion): stagger issue rows in and pop the check tile on select

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Iron shelf "unrefining" transition + recover announcement

Animate the disagreed ("Iron") shelf rows so they dash/drain in when shown and animate out when recovered, tokenize the shelf chevron, and announce recovery to screen readers. **Verification:** browser-verified for the motion; the announcement is the unit-testable part. See the scope note at the top — this targets the shelf rows + recover, not an in-place drag-to-Iron (which the UI does not have).

**Files:**
- Modify: `src/components/RankRail.tsx`
- Modify: `src/index.css`
- Test: `src/components/__tests__/RankRail.ironRecover.test.tsx` (create)

- [ ] **Step 1: Read the current RankRail disagreed section**

Read `src/components/RankRail.tsx` fully. The disagreed shelf renders (around lines 39–84): a `.disagreed-divider`, a `.rank-sheet-disagreed-toggle` button with a chevron `<svg>` that uses inline `transition: 'transform 0.15s ease'`, and (when `showDisagreed`) a `.rank-rail-disagreed-list` mapping `disagreed` quotes to `.tier-row-disagreed.rank-rail-disagreed-row` rows, each with a `.rank-sheet-disagreed-recover` button calling `reAgree(q)`. Confirm these exact class names and the `reAgree` call before editing.

- [ ] **Step 2: Add the Iron dash-in keyframe CSS**

In `src/index.css`, immediately after the `.tier-row-disagreed .tier-disagreed-muted { opacity: 0.75; }` rule (in the Iron/disagreed section), add:

```css
/* "Unrefining" enter — the row drains to hollow + the dashed border resolves in. */
@keyframes iron-dash-in {
  0%   { opacity: 0; transform: translateY(-4px); border-color: transparent; }
  100% { opacity: 1; transform: translateY(0);    border-color: var(--tier-disagreed-border); }
}
.rank-rail-disagreed-row.iron-entering {
  animation: iron-dash-in var(--dur-moderate) var(--ease-standard);
}
```

(The global `@media (prefers-reduced-motion: reduce)` reset already collapses this animation's duration as a CSS backstop; the JS path below also skips the class when reduced.)

- [ ] **Step 3: Import framer + motion + tokenize the chevron**

In `src/components/RankRail.tsx`, add to the imports:

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useMotion, EASE, DUR } from '../motion';
```

(If `motion`/`AnimatePresence` is already imported, merge rather than duplicate.) Read motion config inside the component: add `const m = useMotion();` near the other hooks.

Tokenize the chevron transition: find the chevron `<svg>` inside `.rank-sheet-disagreed-toggle` with `style={{ transform: showDisagreed ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}` and change the transition to `transition: 'transform var(--dur-fast) var(--ease-standard)'`.

- [ ] **Step 4: Wrap the disagreed rows in AnimatePresence with enter/exit**

Replace the disagreed list render (the `{showDisagreed && (<div className="rank-rail-disagreed-list">...</div>)}` block) so each row is a `motion.div` inside `AnimatePresence`. The row should:
- enter with `m.enter({ y: -4 })` + `m.transition(DUR.moderate, EASE.standard)` (drain/dash in),
- exit (on recover) with `exit={m.reduced ? undefined : { opacity: 0, height: 0, marginTop: 0 }}` + the same transition,
- keep `layout` so siblings slide up smoothly (use `m.spring()` for the layout transition).

Concretely, replace:

```tsx
        {showDisagreed && (
          <div className="rank-rail-disagreed-list">
            {disagreed.map((q) => (
              <div key={q.id} className="tier-row tier-row-disagreed rank-rail-disagreed-row">
                <TierIcon tier="disagreed" size={13} />
                <span className="rank-rail-disagreed-stub tier-disagreed-muted">{q.text}</span>
                <button type="button" className="rank-sheet-disagreed-recover" onClick={() => reAgree(q)}>
                  Move to agreed
                </button>
              </div>
            ))}
          </div>
        )}
```

with:

```tsx
        {showDisagreed && (
          <div className="rank-rail-disagreed-list">
            <AnimatePresence initial={false}>
              {disagreed.map((q) => (
                <motion.div key={q.id} layout={m.reduced ? false : true}
                  className="tier-row tier-row-disagreed rank-rail-disagreed-row"
                  {...m.enter({ y: -4 })}
                  exit={m.reduced ? undefined : { opacity: 0, height: 0, marginTop: 0 }}
                  transition={m.transition(DUR.moderate, EASE.standard)}>
                  <TierIcon tier="disagreed" size={13} />
                  <span className="rank-rail-disagreed-stub tier-disagreed-muted">{q.text}</span>
                  <button type="button" className="rank-sheet-disagreed-recover" onClick={() => handleRecover(q)}>
                    Move to agreed
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
```

Note: the recover button now calls `handleRecover(q)` (defined next) instead of `reAgree(q)` directly, so it can also announce. (The CSS `iron-entering` class from Step 2 is an alternative pure-CSS enter; here we use framer's `m.enter` for the JS-gated reduced-motion path, so you do NOT also need to add the `iron-entering` class — keep the keyframe for the verdict-flight arrival path if RankRail is reused, but the rows here animate via framer. If you prefer, drop the Step 2 keyframe; it is optional. KEEP Step 2 only if you can wire it; otherwise remove it to avoid dead CSS — your call, report which you did.)

- [ ] **Step 5: Add the recover handler with a screen-reader announcement**

RankRail needs a polite live region and a `handleRecover` that announces then recovers. Add near the top of the component:

```tsx
  const [recoverMsg, setRecoverMsg] = useState('');
  const handleRecover = (q: AgreedQuote) => {
    const stub = q.text.length > 40 ? q.text.slice(0, 40) + '…' : q.text;
    setRecoverMsg(`Moved "${stub}" back to agreed.`);
    reAgree(q);
  };
```

(Ensure `useState` and the `AgreedQuote` type are imported — `useState` from React, `AgreedQuote` from `../store/useReadRankStore`; check current imports and add only what's missing.) Then render a live region once in the component's returned JSX (e.g. just before the closing tag of the disagreed `<section>` or at the end of the root element):

```tsx
      <div className="sr-only" role="status" aria-live="polite">{recoverMsg}</div>
```

- [ ] **Step 6: Write the recover-announcement test**

Create `src/components/__tests__/RankRail.ironRecover.test.tsx`. It seeds a race with one disagreed quote, renders `RankRail`, expands the shelf, clicks "Move to agreed", and asserts the polite live region announces the recovery. Model the store seeding on the existing `ResultsPhase.test.tsx` flow (`useReadRankStore.getState().reset()/selectRace(...)/disagree(q)` to create a disagreed quote). FIRST read `src/store/useReadRankStore.ts` to confirm the exact action to put a quote into `disagreed` (it is the `disagree` action used during evaluation) and the `RacePayload` shape, then:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankRail } from '../RankRail';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'mock-in-gov-2024',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'cannabis-legalization',
      title: 'Cannabis Legalization',
      question: 'Should Indiana legalize marijuana?',
      quotes: [
        { id: 'q-103', text: 'A quote the user will disagree with.', candidateToken: 'tok-9d4b', topicKey: 'cannabis-legalization' },
      ],
    },
  ],
};

describe('RankRail iron recover', () => {
  it('announces when a disagreed quote is moved back to agreed', async () => {
    window.localStorage?.clear();
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(payload);
    useReadRankStore.getState().disagree(payload.topics[0].quotes[0]);

    render(<RankRail />);
    // Expand the disagreed shelf.
    await userEvent.click(screen.getByRole('button', { name: /disagreed \(1\)/i }));
    // Recover the quote.
    await userEvent.click(screen.getByRole('button', { name: /move to agreed/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/moved .* back to agreed/i);
  });
});
```

If `RankRail` requires a `variant` prop or other required props to render the disagreed shelf, pass the minimal props needed (read the component signature). If the store action is named differently than `disagree`, adapt — but keep the assertion (a polite status announces the recovery).

- [ ] **Step 7: Run the test (red → green), then build/lint/full suite**

Run: `npx vitest run src/components/__tests__/RankRail.ironRecover.test.tsx`
Expected: PASS once Steps 4–5 are in. Then `npm run build && npx eslint src/components/RankRail.tsx && npx vitest run` — build clean, eslint clean, all tests pass (221 now).

- [ ] **Step 8: Commit**

```bash
git add src/components/RankRail.tsx src/index.css src/components/__tests__/RankRail.ironRecover.test.tsx
git commit -m "feat(motion): iron shelf enter/exit transition + recover announcement

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Close the RankSheet reduced-motion gap

`RankSheet.tsx` uses a raw framer `motion.div` for the drag-to-close handle region with no reduced-motion guard (§7). Route the drag through `useMotion()` so reduced-motion users don't get drag physics. **Verification:** build + the existing suite; the drag is a gesture (hard to exercise in jsdom), so this is build/lint-verified plus a read-through that the gesture still works for non-reduced users.

**Files:**
- Modify: `src/components/RankSheet.tsx`

- [ ] **Step 1: Import the hook**

In `src/components/RankSheet.tsx`, add to the imports:

```tsx
import { useMotion } from '../motion';
```

- [ ] **Step 2: Gate the drag on reduced motion**

In `RankSheetDialog`, add `const m = useMotion();` near the other hooks (after `const ref = useRef...`). Then change the handle-region `motion.div` so drag is disabled under reduced motion (a reduced-motion user closes via the "Done" button / Escape, both already present). Replace:

```tsx
      <motion.div
        className="rank-sheet-handle-region"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80) onClose();
        }}
      >
```

with:

```tsx
      <motion.div
        className="rank-sheet-handle-region"
        drag={m.reduced ? false : 'y'}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={m.reduced ? undefined : (_, info) => {
          if (info.offset.y > 80) onClose();
        }}
      >
```

- [ ] **Step 3: Build + lint + tests**

Run: `npm run build && npx eslint src/components/RankSheet.tsx && npx vitest run`
Expected: build clean; eslint clean; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/RankSheet.tsx
git commit -m "fix(a11y): route RankSheet drag-to-close through useMotion (reduced-motion gap)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review

**Spec §6 coverage:**
- Landing hero + step cards stagger in (easeSettle, base/moderate, light sub-stagger) — Task 1. ✔
- RaceHub grid cards stagger in (subtle, fast stagger); hover lift kept + tokenized — Tasks 2 (hover) + 3 (stagger). ✔
- IssueSelection rows stagger in; check tile scale-pops on select (easeOvershoot, fast); selected-row transition tokenized — Task 4. ✔
- Iron transition (verdict → disagreed, and recover) tokenized + reduced-motion instant + announcement — Task 5, scoped honestly to the shelf enter/exit + recover (see scope note; in-place drag-to-Iron is not a current UI affordance, and the verdict-flight arrival is already Plan 2). ✔ (with documented scope limit)
- AlignmentGrid only animates in the reveal context — already handled in Plan 3 (the `animate` prop defaults false). ✔ (no work needed)

**Spec §7 remaining gaps (others closed in Plans 1–3):**
- RaceHub header entrance — Task 3. ✔
- RankSheet drag-to-close physics — Task 6. ✔
- (PracticeRound, PracticeResultsScreen, RankList, ActionButtons, AddressFilterInput, CoachMark, ResultsPhase already route through `useMotion()` per Plans 1–3 — verified via grep; no work needed.)

**Placeholder scan:** No TBD/TODO. Task 4 Step 5 and Task 5 Step 1 instruct the implementer to "read the actual rules first" before a transition tweak — that is required because the exact current `transition` declaration (if any) on `.issue-row*` must be seen live; the desired end state (token-based timing, no color change) is fully specified. Task 5 Step 4 leaves an explicit either/or on the optional `iron-entering` keyframe with instruction to report which path was taken — intentional, not a placeholder.

**Type/name consistency:** `enterIndex?: number` is defined on `RaceCardProps` (Task 3) and passed from RaceHub's `renderCard` (Task 3). `handleRecover(q: AgreedQuote)` + `recoverMsg`/`setRecoverMsg` are defined and used within RankRail (Task 5). `m.enter`/`m.transition`/`m.reduced`/`m.spring` match the `Motion` interface in `src/motion.ts`. Tokens `EASE.settle/standard/overshoot`, `DUR.fast/base/moderate`, `STAGGER.gridCell` all exist.

**Verification honesty:** Task 5's recover announcement is genuinely unit-tested (new test file). All entrance/hover/pop/drag visuals are browser-verified or build-verified, not fake-unit-tested — each task's verification step says so. Existing component tests are kept green (the `motion.*` swaps preserve roles/labels/text).
