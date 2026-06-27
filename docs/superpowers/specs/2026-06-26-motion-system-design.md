# Read & Rank — Motion System Design

Date: 2026-06-26
Status: Approved design, ready for implementation planning
Scope: Whole-system pass on micro-interactions and animation — inventory, a
unified motion language, accessibility contract, dead-code cleanup, the two
signature moments (verdict, reveal), and moderate net-new motion on static
screens.

Companion mockups (throwaway, in `.superpowers/brainstorm/`): `motion-energy`,
`verdict-flight-v3`, `mobile-swipe-dock`, `reveal-unmask`, `reveal-tally-v3`.

---

## 1. Aesthetic direction: "Confident Tactile / On the Record"

Motion in Read & Rank is **restrained by default and tactile where it counts**.
Every move should feel consequential and physical without ever feeling like a
reward mechanic. The product's promise is *"we are not manipulating you,"* and a
skeptical voter reads celebration mechanics (screen shake, confetti, bounce)
during a task as exactly the manipulation they expect from a political app. So:

- **Baseline energy is calm.** Short durations, a single decelerate curve, no
  spectacle during evaluation. Overshoot is allowed only as a gentle settle on
  small elements (medal/badge pop, check-tile select), never as a bouncy verdict
  or page move.
- **The verdict is tactile, not loud.** The most-repeated action gets weight
  through *movement and destination*, not a stamp or a flourish.
- **Celebration is earned exactly once, at the reveal.** The reveal is the
  emotional climax; it happens at most once per race, after the work is done.
  This is the only place energy rises above baseline (the particle burst on the
  #1 candidate).
- **Richness is thematic, not decorative.** Where we add polish, it expresses
  the product's own metaphor — the tiers are *refined metals*, so the medals
  look minted and catch light; Iron is *raw ore*, so it drains and dashes.

Guiding line: **intentionality over intensity.**

---

## 2. The motion token system (single source of truth)

Today every duration and easing is a magic number copy-pasted across ~17
components. We replace that with one tokens module and one hook.

### 2.1 New file: `src/motion.ts`

Exports named tokens. These ARE the language; nothing animates with an inline
magic number after this.

**Easings**

| Token | Value | Use |
|---|---|---|
| `easeSettle` | `cubic-bezier(0.22, 1, 0.36, 1)` | Primary. Decelerate-to-rest. Entrances, reveals, phase transitions. (Already the app's dominant curve.) |
| `easeFlight` | `cubic-bezier(0.45, 0, 0.18, 1)` | Accelerate-out / decelerate-in. The verdict dock flight. |
| `easeOvershoot` | `cubic-bezier(0.34, 1.45, 0.6, 1)` | Gentle overshoot (peaks ~1.05–1.18, settles). Medal/avatar/badge "mint" pop. Subtle — NOT the old 1.56 bounce. |
| `easeStandard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Generic UI: hovers, fades, color transitions. |
| `easeBurst` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | The kept reveal particle burst only. |

**Durations (ms)**

| Token | Value | Use |
|---|---|---|
| `instant` | 0 (effectively ~10ms) | The reduced-motion value for everything. |
| `fast` | 150 | Hover/press/color states, micro-feedback. |
| `base` | 250 | Small transitions, phase-change opacity. |
| `moderate` | 400 | Per-element reveal landings; identity settle. |
| `flight` | 580 | Verdict dock (desktop). Mobile commit 560. |
| `burst` | 800 | Reveal #1 particle burst. |

**Stagger constants (ms)**

| Token | Value | Use |
|---|---|---|
| `staggerGridCell` | 90 | Alignment-grid medal pops, cell by cell. |
| `staggerCascade` | 420 | Between candidate cards in the reveal cascade. |
| `subStaggerBadge` / `Avatar` / `Name` / `Evidence` | 80 / 140 / 200 / 320 | Per-element landing delays inside a candidate card. |

**Springs (framer-motion)**

| Token | Value | Use |
|---|---|---|
| `springReorder` | `{ type: 'spring', stiffness: 500, damping: 35 }` | Drag-to-reorder layout (existing RankList value, promoted to a token). |

### 2.2 The reduced-motion contract — `useMotion()`

The audit surfaced a real trap: the global CSS reset in `index.css`
(`@media (prefers-reduced-motion: reduce)`) only neutralizes **CSS** animations
and transitions. **Framer-motion's JS-driven transforms bypass it entirely.**
Several components animate via framer with no guard (PracticeRound, RankList
drag, ResultsPhase ballot stagger, RaceHub header, ActionButtons tap, etc.), so
those still move for users who asked not to.

Fix: a single hook, `useMotion()`, wraps framer's `useReducedMotion()` and is the
**only** sanctioned way to read motion config in a component.

```ts
// shape (illustrative)
const m = useMotion();
// m.reduced: boolean
// m.dur(token): number        -> returns `instant` when reduced
// m.ease(token): easing        -> returns linear/none when reduced
// m.enter(variant): object     -> returns {} (no transform) when reduced
```

Rule for the build: **no `motion.*` element sets a duration/ease/initial inline.
It comes from `useMotion()`.** When `reduced` is true, entrances render at their
final state with no transform, the verdict commit is an instant swap, the reveal
cascade becomes an all-at-once render, and the burst does not fire. The CSS
global reset stays as the backstop for plain CSS transitions.

### 2.3 Token consumption in CSS

CSS-driven motion (hovers, tier-row transitions, the metallic sheen) reads the
same values via CSS custom properties mirrored from the token table, e.g.
`--ease-settle`, `--dur-fast`, declared once in `index.css :root`. One language,
two consumers.

---

## 3. Signature moment A: The verdict

The most-repeated action. **The stamp is removed.** The card itself travels into
the ranking; the destination carries the meaning (into the ranking = agree, to
the Iron shelf = disagree). The movement is the receipt.

### 3.1 Desktop — the dock flight

- The full-quote card the user is reading **resizes and docks** into the ranking
  surface as the *same full-quote card*, keeping its complete text. It does not
  shrink to a one-liner and it does not fade out and vanish.
- **One connected timeline**, ~`flight` (580ms), `easeFlight`. Position and size
  (left/top/width/height/padding/font-size/border-radius) interpolate together.
  The shadow lifts mid-flight (peak ~45%) then settles — one object moving
  through space, with a faint settle as the tail (no separate "pop").
- **Implementation:** use framer-motion shared-layout (`layoutId`) between the
  active quote card and its destination row in the ranking list, so framer runs
  the FLIP and the handoff is seamless. (The demo faked this with a measured
  clone; production should use `layoutId` + `LayoutGroup`.)
- **Agree button cue:** a **light sweep** (a soft sheen translating across the
  button) plus a subtle press (`scale 1 -> 0.97 -> 1`, `easeOvershoot`,
  `fast`). This is the only "you agreed" signal beyond the flight itself.
- Disagree sends the full card to the Iron shelf with the same connected motion;
  the Iron entry uses the dashed + hatch "raw ore" treatment.

### 3.2 Mobile — swipe to commit, dock collapse

- There is no side panel; the ranking is a **collapsed bottom dock**. Full
  quotes are not shown in the collapsed strip — they live in the expandable
  **sheet** (tap the dock to open).
- **Swipe:** drag the card horizontally (axis-locked to x). Right = agree,
  left = disagree. Peek labels fade in with drag distance ("Agree ▶" teal on the
  right, "◀ Disagree" dark on the left); the card border tints teal/slate.
- **Gesture-to-commit is one motion.** Past the threshold, on release the *same
  card continues from where the finger left off* into the dock (agree) or Iron
  (disagree), collapsing in. The receiving tier pip fills and pulses; the
  counter increments. No separate animation between release and dock.
- **Velocity matters** (production): a fast flick commits even below the distance
  threshold. Use the existing `@use-gesture` / framer drag with velocity.
- **Paddle buttons remain** as the tap and keyboard equivalent (full-width
  Agree/Disagree at the bottom). The Agree paddle plays the same light sweep.

### 3.3 Verdict accessibility

- Full keyboard path: the paddles are real buttons; swipe is never the only way.
- Touch targets ≥44px (paddles already 62–78px).
- Reduced motion: no flight. The card is removed instantly, the dock/ranking
  updates immediately, and a polite live region announces the result, e.g.
  *"Added to your ranking, Gold"* or *"Moved to disagreed."*
- The verdict and resulting tier/position are announced for every commit, so a
  screen-reader user gets the same information the motion conveys.

---

## 4. Signature moment B: The reveal (final tally)

The reveal is the **final tally for the whole race** (across topics). **The
layout order matches production and does not change:** position heading → insight
strip → alignment grid → candidate list → tail. We add motion to that existing
order; we do not re-order it. The animation plays roughly top-down. Sequence:

1. **Threshold** — the held-breath beat. Dark interstitial: *"You judged N
   quotes across M topics. Now see **who** you agreed with."* with an ev-yellow
   underline on "who" and a single Reveal button. (Reduced motion: static
   screen, same copy, Continue button.)
2. **Insight strip** fades/rises into its existing position above the grid
   (`easeSettle`, `moderate`), ev-yellow top rule:
   *"All three of your top picks came from one candidate: Maya Wiley."*
3. **Alignment grid assembles.** The grid frame settles in, then the **tier
   medals pop into each cell** one at a time (`easeOvershoot`, `staggerGridCell`
   90ms), each with a **metallic gleam** sheen sweep. The "true alignment"
   artifact visibly being built.
4. **Candidates cascade** ("How the candidates stack up"). Ranked candidate
   (ballot) cards land top-down, **#1 first**, `staggerCascade` 420ms. Each card
   lands with layered per-element motion: rank badge pops, avatar slides in and
   scales with overshoot, name/office rise, evidence line fades in
   (sub-staggers per §2.1). The **agreement number counts up** (0 → N).
5. **The burst** (kept `megaBurst`) fires on the #1 candidate as it lands — the
   one earned celebration, and the climax of the sequence. **#1 spotlight:** the
   gold rank badge gleams and the candidate's Diamond cell in the grid glows
   ev-yellow, tying artifact to person.
6. Existing tail unchanged: expandable per-candidate quotes ("See what they
   said" with tier icons + verified `SourceLine`), "View on Essentials" links,
   `CompassCrossLink`, play-again.

### 4.1 No layout re-order

An earlier draft proposed leading with the grid and moving the insight strip to
the end. **Rejected** — the production layout order (insight strip → grid →
candidate list) is kept exactly. This pass only adds motion to that order.

### 4.2 Mechanism note

The repo contains `RevealCard.tsx` / `RevealBoard.tsx` (a 3D-flip unmasking) that
are **not wired into `ResultsPhase`**. We are not adopting the flip. The chosen
unmask language is "identity lands" (content settles onto cards), consistent with
the verdict's docking language. `RevealCard`/`RevealBoard` should be removed or
explicitly deprecated during implementation if nothing else imports them
(verify first).

### 4.3 Reveal accessibility

- Reduced motion: the whole tally renders at once — medals minted but static,
  numbers at final value, no cascade, no burst, no glow. One polite announcement
  on entry, e.g. *"Ballot revealed. Your number one is Maya Wiley, agreed with 4
  of 5 positions."*
- Reveal content is never gated behind animation: identities, numbers, and the
  grid exist in the accessible tree immediately; motion is purely visual.
- The metallic gleam, count-up, and spotlight are all decorative; the tier
  (icon + label), the number (final text), and the rank are present without
  them. Tiers survive grayscale via icon + label + frame, never hue alone.

---

## 5. Cleanup

- **Remove 9 dead keyframes** from `index.css`: `rank-badge-appear`, `shimmer`,
  `fade-up`, `screenShake` (+ `.screen-shake`), `screenFlash`, `slamDown`,
  `rankSlam`, `podiumPop`, `bannerSlam`. (`logo-spin` in `App.css` is also unused
  — remove if `App.css` template cruft is being cleaned.)
- **Keep `megaBurst`** — it is now the deliberate reveal #1 burst.
- **Remove the coin-press stamp** path from `QuoteCard.tsx` and the
  `.quote-stamp*` CSS, since the verdict no longer uses a stamp.
- Replace scattered magic durations/easings with tokens from `src/motion.ts`.

---

## 6. Net-new micro-interactions (moderate, purposeful)

Each earns its place; none is decoration for its own sake. All route through
`useMotion()`.

- **Landing** (`Landing.tsx`): hero and the step cards stagger in on mount
  (`easeSettle`, `base`/`moderate`, light sub-stagger). Currently static.
- **RaceHub grid** (`RaceHub.tsx` / `RaceCard.tsx`): race cards stagger in on
  load (subtle, fast stagger). Hover lift already exists — keep, tokenize.
- **IssueSelection** (`IssueSelection.tsx`): rows stagger in; the check tile
  scale-pops on select (`easeOvershoot`, `fast`); selected-row border/background
  transition tokenized. Currently no motion.
- **Iron transition** (verdict → disagreed, and recover): the brief's
  "unrefining" — fill drains to hollow, border dashes in when a quote moves to
  Iron; refills on recover. Specced in REDESIGN_SPEC §6.3; bring it in line with
  the token language. Reduced motion: instant swap + announcement.
- **AlignmentGrid** outside the reveal: the assemble animation only plays in the
  reveal context; elsewhere it renders static.

Out of scope for "moderate": motion on most interactive elements, decorative
ambient motion, anything that reads as "trying too hard."

---

## 7. Reduced-motion gaps to close (from the audit)

Route each of these through `useMotion()` so they respect the preference (today
they animate via framer regardless):

- `PracticeRound.tsx` — AnimatePresence quote-card swap.
- `PracticeResultsScreen.tsx` — result-card stagger.
- `RankList.tsx` — drag-reorder spring (`springReorder`).
- `RankSheet.tsx` — drag-to-close physics.
- `ResultsPhase.tsx` — BallotCard entrance stagger (folded into §4 reduced path).
- `RaceHub.tsx` — header entrance.
- `ActionButtons.tsx` — `whileTap` press.
- `AddressFilterInput.tsx` — dropdown/suggestion AnimatePresence.
- `CoachMark.tsx` — spotlight/tooltip AnimatePresence.

---

## 8. Accessibility summary (WCAG 2.1 AA floor)

- **Every animation has a reduced-motion alternative**, gated through one hook;
  the CSS global reset remains the backstop for CSS-only motion.
- **Live-region announcements** for: each verdict (result + tier/position),
  rank changes during reorder, and the reveal (entry summary). Content is in the
  accessible tree before/independent of animation.
- **Nothing conveyed by motion or color alone.** Tiers carry icon + label +
  frame; the gleam/glow/count-up/burst are decorative layers over information
  that already exists statically.
- **Full keyboard paths** for verdict (paddles), reorder (button equivalents),
  and reveal pacing (Reveal all / Continue). Swipe and drag are never the only
  route.
- **Touch targets ≥44px**, focus-visible styles preserved.

---

## 9. Implementation surface (touch-list, not a plan)

- New: `src/motion.ts` (tokens + `useMotion()`); CSS custom props in
  `index.css :root`.
- Verdict: `QuoteCard.tsx` (remove stamp, axis-lock drag, `layoutId`),
  `FlyingCard.tsx` (replace with connected dock flight or fold into layout
  transition), `ActionButtons.tsx` (light sweep + press), `RankDock.tsx` /
  `RankSheet.tsx` / `AgreedQuotesSidebar.tsx` (dock receive + sheet),
  `EvaluationPhase.tsx` (orchestration), mobile swipe via existing
  `@use-gesture`/framer drag.
- Reveal: `ResultsPhase.tsx` (reorder, cascade, count-up, spotlight, burst on
  #1), `AlignmentGrid.tsx` (assemble + metallic medals + gleam),
  `TierIcon.tsx` (metallic treatment as a token), remove/deprecate
  `RevealCard.tsx` / `RevealBoard.tsx` if unused.
- Cleanup: `index.css` (dead keyframes, stamp CSS), `App.css`.
- Net-new: `Landing.tsx`, `RaceHub.tsx`, `RaceCard.tsx`, `IssueSelection.tsx`.
- A11y gaps: the §7 component list.

---

## 10. Out of scope / future

- A deeper redesign of the threshold beat beyond copy/treatment.
- Per-candidate reveal pacing controls beyond "Reveal all" / cascade.
- Any motion on the practice round beyond closing the reduced-motion gap.
- New celebration moments anywhere other than the reveal #1 burst.
