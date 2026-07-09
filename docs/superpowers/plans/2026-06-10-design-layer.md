# Soft Precision — Design Layer Implementation Plan

> **For agentic workers (Opus/Sonnet):** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax. This plan is a DESIGN DIRECTION plus implementation tasks — where the plan gives exact code, use it; where it gives a spec, execute the aesthetic with craft, not minimal compliance.

**PREREQUISITE:** `2026-06-10-onboarding-flow.md` has been implemented and merged. This plan assumes the Landing-first flow, the warm-up opt-in button on the Landing, and the `FirstAgreeCoach` component all exist. Verify before starting (`git log`, `ls src/components/FirstAgreeCoach.tsx`); if absent, STOP and report.

**Goal:** A major visual modernization of Read & Rank. **Constraints set by the product owner:** Manrope is the only typeface (no decorative/serif/italic quote styling — readability first); the existing color palette stays essentially as-is. Modernity comes from geometry, depth, spacing, and motion — not from new fonts or new colors. Functionality, accessibility contracts, and the full test suite survive untouched; the look and feel transforms.

---

## Part I — Design Direction (read fully before any task)

### The concept: Soft Precision

A contemporary product feel built from four moves, executed consistently everywhere:

1. **Weight-driven Manrope hierarchy.** One typeface, used like a type system: 800 tight-tracked for display, 700 for headings, 500–600 for emphasis, 400 for body. Hierarchy comes from decisive SIZE JUMPS and weight, never from a second font. Quotes are the hero through scale and air, not ornament.
2. **Rounded geometry on a strict radius scale.** Today's mixed 0.375–1rem corners become a tokenized scale used without exception. Surfaces feel like one family.
3. **Layered soft depth.** Two-layer shadows (a tight contact shadow + a wide ambient), faint ambient gradient washes on the page using the EXISTING palette colors at very low alpha, and backdrop-blur on floating surfaces (dock, sheet, dialogs). Depth says "what floats"; borders say "what's interactive."
4. **Spring micro-interactions.** Press states compress (scale 0.98), floating elements settle with spring physics, and the signature interaction — **the verdict pill** — pops onto the card when you judge a quote. Page-level transitions keep the existing signature ease; element-level feedback gets springs.

### The one memorable thing

**The verdict pill.** When the user agrees or disagrees, a filled pill springs onto the quote card — AGREED with a check (teal fill, white text) or DISAGREED with the slash-circle (iron-gray fill) — overshooting slightly and settling, a beat, then the card files away. Tactile, modern, unmistakably this app. (Reduced motion: pill appears instantly, card swaps without translation.)

### Typography (Manrope only)

Add weight-and-scale tokens; no new imports (the existing Manrope import already carries 200–800):

```css
  --font-ui: 'Manrope', sans-serif;
  /* Display scale — weight 800, tracking tightens as size grows */
  --text-display: clamp(2.5rem, 5.5vw, 4rem);      /* landing hero; tracking -0.035em */
  --text-headline: clamp(1.5rem, 3vw, 2rem);        /* phase titles; tracking -0.025em */
  --text-title: 1.125rem;                           /* card/section titles; weight 700 */
  --text-quote: clamp(1.3125rem, 2.6vw, 1.625rem);  /* THE quote; weight 500, lh 1.5, tracking -0.01em */
```

- **Quote text** (the product's hero): Manrope 500 at `--text-quote`, line-height 1.5, `letter-spacing -0.01em`, `color: var(--text-ink)`. Bigger and airier than today; zero decoration. The "QUOTE N" eyebrow above it: 0.6875rem, weight 700, `letter-spacing 0.14em`, uppercase, `--text-tertiary`.
- **Landing H1**: `--text-display`, weight 800, line-height 1.04, tracking -0.035em.
- **Section headers**: an eyebrow (same spec as the quote eyebrow) above a `--text-headline` weight-800 title — this eyebrow+title pair is the recurring header device, replacing ad-hoc header styles.

### Geometry tokens

```css
  --radius-sm: 0.625rem;   /* chips, small buttons */
  --radius-md: 1rem;       /* rows, inputs, panels */
  --radius-lg: 1.25rem;    /* cards */
  --radius-xl: 1.75rem;    /* hero surfaces, sheet top, dialogs */
  --radius-pill: 9999px;
```

Sweep every `border-radius` in `src/index.css` and inline styles onto this scale (nearest step up — the app gets visibly rounder). Tier-row radius moves to `--radius-md`; quote card to `--radius-lg`; dialogs/sheet to `--radius-xl`.

### Depth & surfaces (colors stay)

```css
  --shadow-contact: 0 1px 2px rgba(28, 28, 28, 0.06);
  --shadow-float: 0 1px 2px rgba(28, 28, 28, 0.05), 0 16px 40px -12px rgba(28, 28, 28, 0.14);
  --shadow-overlay: 0 1px 3px rgba(28, 28, 28, 0.08), 0 24px 64px -16px rgba(28, 28, 28, 0.28);
```

(Dark mode: same structure, black at higher alphas — define in `.dark`.) Rules:
- Static cards: `--shadow-contact` + existing 1px border.
- The active quote card and the dock: `--shadow-float`.
- Sheet + dialogs: `--shadow-overlay`.
- Kill every other ad-hoc shadow (audit `box-shadow` across index.css; KEEP semantic insets: yellow accent rules, focus rings, tier treatments).

**Ambient washes** (additive, palette-true): the page background gains two fixed, enormous, ultra-faint radial gradients — light blue top-left, coral bottom-right — at 5% alpha in light, 7% in dark, behind everything:

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(60rem 60rem at 8% -10%, color-mix(in srgb, var(--color-ev-light-blue) 5%, transparent), transparent 70%),
    radial-gradient(50rem 50rem at 105% 110%, color-mix(in srgb, var(--color-ev-coral) 4%, transparent), transparent 70%);
}
.dark body::after { /* same shape, alphas 7%/5% */ }
```

(Verify the existing `body::before` grain overlay composes with this; tune so neither fights the other.)

**Backdrop blur** on floating chrome: the RankDock and the RankSheet's header region get `background-color: color-mix(in srgb, var(--surface-card) 86%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);` with a graceful solid fallback via `@supports not (backdrop-filter: blur(1px))`.

### Motion language

- Keep `--ease-signature: cubic-bezier(0.22, 1, 0.36, 1)` for page/phase/layout transitions (already the codebase standard — tokenize it).
- **Springs for feedback**: framer-motion `{ type: 'spring', stiffness: 420, damping: 28 }` for the verdict pill, press states, dock pulse. CSS-only elements use:

```css
@keyframes pillIn {
  0% { transform: scale(0.4); opacity: 0; }
  62% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```

- Press state utility (interactive cards + primary buttons): `transition: transform 120ms var(--ease-signature); :active { transform: scale(0.98); }`.
- Every NEW animation gated on reduced motion (the global kill-switch remains the backstop; component-level `useReducedMotion` for sequencing).

### What does NOT change (hard contracts — breaking these fails review)

1. The full test suite keeps passing. **Record the green count at Task 0 (expected ~99 after the onboarding plan) and hold it.** Tests pin accessible names, roles, tier classes (`tier-row-*`, `rank-dock-slot-*`, `ev-quote-card-active`), blindness invariants (innerHTML checks), and copy strings ("Verified quote.  Source shown at the reveal." etc.). Restyle freely; never rename pinned classes or change pinned copy.
2. The palette: existing tokens keep their values. Additions are limited to the ambient washes, shadows, radii, and type tokens above.
3. Anti-partisan rules: no party anything, no red/blue coding.
4. A11y floor: 44px targets, focus-visible rings (modernize to `outline: 2px solid var(--text-link); outline-offset: 2px;` consistently), reduced-motion everywhere, body text ≥16px (meta labels exempt as today).
5. ev-yellow stays exactly eight placements; restyle allowed, multiplication not.

---

## Part II — Implementation Tasks

> Verification ritual for EVERY task: `npm test` (all green at the Task-0 count), `npm run build` (exit 0), `npm run lint` (baseline 12, nothing new), plus the task's browser checks at 375px and 1280px in light AND dark. Commit per task with the given message + your model's `Co-Authored-By` trailer.

### Task 0: Branch + baseline

- [ ] `git checkout -b feat/soft-precision`
- [ ] Verify the prerequisite (FirstAgreeCoach.tsx exists; Landing has the warm-up button). Run `npm test` and RECORD the green count — that number is this plan's gate.

### Task 1: Foundation — tokens, radius sweep, depth, washes

**Files:** `src/index.css` only.

- [ ] Add the type, radius, shadow, and ease tokens (Part I code) to `:root` (+ dark shadow variants in `.dark`).
- [ ] Radius sweep: migrate every `border-radius` in index.css to the token scale (nearest step UP). Then grep `borderRadius` in `src/components/` inline styles and migrate those too (e.g. `borderRadius: 'var(--radius-md)'`). Record the count of migrations in the commit body.
- [ ] Shadow audit: replace ad-hoc shadows per Part I rules; keep semantic insets (yellow rules, focus, tier hatch).
- [ ] Add the ambient washes (`body::after`) + verify composition with the existing grain `body::before`.
- [ ] Add `pillIn` keyframes and the press-state utility class (`.press-scale`).
- [ ] Browser: both modes — the app should already read rounder, softer, subtly atmospheric, identical colors. Commit: `feat(soft-precision): geometry, depth, wash, and type tokens`.

### Task 2: QuoteCard modernization + the verdict pill

**Files:** `src/components/QuoteCard.tsx`, new `src/components/VerdictPill.tsx`, `src/components/__tests__/QuoteCard.test.tsx`, `src/index.css`, `src/components/EvaluationPhase.tsx` + `src/components/PracticeRound.tsx` (sequencing).

- [ ] **VerdictPill** (new): props `{ verdict: 'agree' | 'disagree' | null }`. Null renders nothing. Otherwise an absolutely-positioned pill over the card's top-right (`role="status"`, sr text "Agreed"/"Disagreed"): Manrope 800, 0.8125rem, uppercase, tracking 0.08em; agree = `var(--agree)` fill with white text + check icon; disagree = `var(--tier-iron-border)` fill with white text + slash-circle icon; `border-radius: var(--radius-pill)`; `padding: 0.375rem 0.875rem`; `box-shadow: var(--shadow-float)`; `animation: pillIn 260ms var(--ease-signature) both` (skip under reduced motion). Verify white-on-fill contrast for both fills (≥4.5:1; darken fills if needed and record the hexes in the commit body).
- [ ] **Sequencing:** in `handleButtonSwipe` (EvaluationPhase + PracticeRound) and QuoteCard's `handleSwipe`: set pending verdict → wait 260ms (skip under reduced motion) → animate card off → commit verdict → clear. Thread via a new optional QuoteCard prop `pendingVerdict?: 'agree' | 'disagree' | null` rendering VerdictPill inside the card. KEEP intact: keyboard dialog guard, axis lock, footer no-drag zone, blind-trust footer copy.
- [ ] **Quote restyle:** apply the Part I quote typography (`--text-quote`, weight 500, lh 1.5) and the eyebrow treatment to "QUOTE N"; card surface gets `--radius-lg` + `--shadow-float` when active (the yellow accent inset stays combined). No decorative glyphs — whitespace is the ornament: bump the card's internal padding to 1.5rem mobile / 2rem desktop.
- [ ] Tests: all existing QuoteCard tests stay green; ADD: pill renders with role status + accessible text per verdict; absent when null.
- [ ] Browser: pill pops on button-judge and swipe-judge both directions; reduced-motion = instant pill, instant swap; practice gets it too. Commit: `feat(soft-precision): modern quote card and the verdict pill`.

### Task 3: Landing as a modern front door

**Files:** `src/components/Landing.tsx`, `src/index.css`, `src/components/__tests__/Landing.test.tsx`.

- [ ] Hero: H1 to `--text-display` (one H1, teal second line preserved with exact current copy); kicker becomes the eyebrow device; body copy 1.0625rem/1.65. Staggered entrance (kicker → H1 → body → specimen, 60ms steps, signature ease; reduced motion: no stagger).
- [ ] Replace the three step cards with: **the live specimen** (built inline — do NOT reuse the real QuoteCard; `--radius-lg` card at ~80% scale with the new quote type, source line `Warm-up question`, VerdictPill looping agree → reset every 6s via interval; reduced motion: permanently pilled) + the three steps as a compact numbered list (28px numbered circles in `--surface-sunken`, Manrope 700 titles, secondary body) + **the existing warm-up button** (from the onboarding plan — keep its handler and copy exactly; restyle to match the new list).
- [ ] "Choose an election" header becomes the eyebrow+headline device.
- [ ] Tests: update the Landing tests from the onboarding plan for the new structure (headline, specimen, steps, warm-up button) — role/text queries only; the warm-up behavioral assertion must keep passing unchanged.
- [ ] Browser: stagger, loop, both modes, 375px stacking. Commit: `feat(soft-precision): landing front door with live specimen`.

### Task 4: Evaluation + rank surfaces

**Files:** `src/components/EvaluationPhase.tsx`, `src/components/TopicStepper.tsx`, `src/index.css` (RankList/RankDock/RankSheet via CSS only), `src/components/FirstAgreeCoach.tsx` (restyle only).

- [ ] TopicStepper: question banner to `--text-title` weight 700 on a `--radius-md` surface; chips stay Manrope, gain the press-scale utility; current-chip yellow underline stays.
- [ ] Progress: thin 4px track with `--radius-pill`, animated fill (width transition, signature ease), eyebrow-styled "QUOTE N OF M" label. Keep any text contract.
- [ ] RankDock: backdrop-blur treatment (Part I), `--radius-xl` top corners, `--shadow-overlay` pointing UP (negative y ambient), slots inherit token radii. Classes untouched.
- [ ] RankSheet: `--radius-xl` top, handle region blurred, body cards on token radii.
- [ ] Tier rows: radius to `--radius-md`; the existing tint gradients stay; Diamond border crispness +6% darker (if not already — check).
- [ ] ActionButtons: primary-pill restyle — `--radius-pill`, agree = teal fill white text, disagree = 1.5px ink border ghost; both get press-scale + 56px coarse-pointer height (existing rule). Labels/aria untouched.
- [ ] **FirstAgreeCoach restyle** (component exists from the onboarding plan): `--radius-md`, `--shadow-float`, optional caret pointing at the dock/sidebar, spring entrance via framer-motion (reduced motion: instant). Copy, role, and dismissal behavior untouched — its tests pin them.
- [ ] Browser: full mobile loop — card, pill, dock blur over scrolling content, sheet, coach caption; desktop split. Commit: `feat(soft-precision): evaluation and rank surfaces`.

### Task 5: Reveal + summary

**Files:** `src/components/ThresholdInterstitial.tsx`, `src/components/RevealCard.tsx`, `src/components/ResultsPhase.tsx`, `src/components/AlignmentGrid.tsx`, `src/components/CompassCrossLink.tsx`, `src/index.css`.

- [ ] Threshold: headline to `--text-headline` weight 800; the dark panel gets `--radius-xl` + `--shadow-overlay`; count line becomes the eyebrow (light-on-dark). Copy + yellow underline + button untouched.
- [ ] RevealCard back face: name to `--text-title` weight 800; office as an eyebrow beneath; photo 44px with a 2px `--surface-card` ring; quote at 0.9375rem weight 450. Reveal button becomes a ghost pill (press-scale).
- [ ] Insight strip: `--text-title` weight 700, `--radius-md`, yellow top rule stays.
- [ ] AlignmentGrid: header row pinned with a blurred background on horizontal scroll (`position: sticky; left: 0` for the row-header column with `--surface-card`); zebra rows via existing approach; radii to tokens.
- [ ] RCV panel + Compass card: token radii, eyebrow+title headers; Inform chip untouched.
- [ ] Browser: full reveal flow, both modes; the summary should feel like one product with the Landing. Commit: `feat(soft-precision): reveal and summary surfaces`.

### Task 6: Transition tuning + final audit

**Files:** `src/components/PhaseContainer.tsx`, `src/index.css`, plan doc.

- [ ] PhaseContainer transitions: tokenize onto `--ease-signature` (values already match); tune durations only if the browser pass shows jank.
- [ ] **Final audit:** (a) radius scale — grep for any `border-radius` not on tokens; (b) shadow audit complete; (c) reduced-motion sweep (pill, specimen loop, staggers, coach caption); (d) yellow placements still exactly eight; (e) contrast spot-checks for the two pill fills + anything the washes touch; (f) gates; (g) check off plan + execution notes.
- [ ] Commit: `feat(soft-precision): transition tuning and final audit`.

### Task 7: Finish

- [ ] Full gates; complete-journey browser walkthrough (Landing → optional warm-up → race → pill-judge → dock/sheet → first-agree caption → threshold → unmask → standings → Compass card → another race), both modes, both widths.
- [ ] Hand off via superpowers:finishing-a-development-branch (ask the user: merge locally / PR / hold).

---

## Appendix — Things the implementer must NOT do

- No new fonts. No italics on quotes. No decorative glyphs. Manrope carries everything through weight and scale.
- No palette changes — the washes/shadows/radii are the only additions.
- No flow/functionality changes — onboarding behavior shipped in the prerequisite plan; this plan only restyles it.
- Do not rename CSS classes that tests assert (`grep` the test files before renaming anything).
- Do not alter user-facing copy (no em dashes; two spaces after periods via `&nbsp;`).
- Do not add ev-yellow placements.
- Do not regress the keyboard guard, axis lock, focus management, or blindness invariants — all test-pinned; if a test fails, the change is wrong, not the test.
