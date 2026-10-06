# "Read a quote" refresh — design

**Date:** 2026-10-06
**Status:** Approved in conversation, pending spec review
**Source:** Aditi's UX prototype (rr#109) — `docs/design/readrank-ux-redesign/screenshots/05-read-quote.png`, `prototype/read.html`
**Builds on:** palette (rr#112), landing (rr#117), issues (rr#119) — all on `main`.

## Goal

Restyle the triage column of the evaluation screen (question, progress, quote card, verdict buttons,
shortcut hint) to Aditi's prototype, keeping every approved behaviour: blind cards, swipe, the
card flight into the ranking, coach marks, and the ranking surface.

## Decisions (from review)

| Question | Decision |
|---|---|
| Verdict buttons | Aditi's style with the spec's symbol: outlined **"⊘ Disagree"** and teal **"✓ Agree"** (REDESIGN_SPEC §3.2: ✕ reads as dismiss/error; ⊘ matches the disagreed shelf). Teal stays the Agree colour (not the spec's coral). |
| Blind line | No avatar slot (REDESIGN_SPEC §3.1). A quiet text line instead of Aditi's dashed "?" avatar. |
| Ranking panel (right column) | Out of scope — handled with screenshot 5 (ranking). |
| Mobile verdict buttons | Stay in the fixed bottom stack with the dock (swipe + dock unchanged). |

## Scope

Shared by the race (`EvaluationPhase`) and the pizza warm-up (`PracticeRound`), which both render
`EvaluationSurface` and `QuestionBanner` — both get the new look.

### 1. Question (`QuestionBanner.tsx`)

- Remove the boxed banner look. Left-aligned `h2` (keep `h2`: the page H1 lives elsewhere and the
  issue header is above it), Manrope 800, `font-size: clamp(1.625rem, 3.2vw, 2.25rem)`,
  `line-height: 1.2`, `text-wrap: balance`, `--text-heading`.
- Keep the yellow highlight behind the text (`.question-banner-hl`), drawn as a marker band under
  the lower ~45% of each line (`box-decoration-break: clone`) rather than a full block — the prototype look.
  Highlight colour stays the existing yellow token; light = ink text (`--text-heading`) over a yellow marker band; dark = yellow text, no band (unchanged from before).

### 2. Eyebrow (`TopicStepper.tsx`)

Unchanged behaviour (tap opens the issue picker). Visual only: "ISSUE 1 OF 2 · HOUSING" — kicker in
`--text-tertiary`, topic in `--text-link`, 12 px / 700 / uppercase / `tracking-widest`, left-aligned.

### 3. Progress (`EvaluationSurface.tsx`)

Replace the filled bar with the number inside it by:

```
Quote 1 of 2   ▬▬▬▬▬▬▬▬▬ ▬▬▬▬▬▬▬▬▬
```

- Label "Quote {n} of {total}" (14 px, `--text-secondary`; `{n}` = the current quote's 1-based
  position; when the topic is complete, "{total} of {total}").
- A row of `total` segments (flex, gap 4 px, height 6 px, radius full). Segments for quotes already
  judged use `--action-primary`; the current one uses `--action-primary` at 45 % (a `color-mix` with
  `--border-subtle`); the rest `--border-subtle`. If `total > 12`, render a single continuous bar
  instead of segments (same colours, width = judged / total).
- Accessibility: the row is `role="progressbar"` with `aria-label="Quotes in this issue"`,
  `aria-valuemin=0`, `aria-valuemax={total}`, `aria-valuenow={judged}`,
  `aria-valuetext="Quote {n} of {total}"`.

### 4. Quote card (`QuoteCard.tsx`)

- White card (`--surface-card`), 1 px `--border-subtle`, radius 16 px, padding 2rem 2rem 1.5rem,
  `--shadow-card` (keep the existing card animations and drag hooks).
- A large decorative opening quote mark above the text: Manrope 800, 56 px, line-height 0.6,
  colour `--color-ev-yellow`, `aria-hidden`. (Decorative, so the yellow-on-white text rule does not apply.)
- Quote text unchanged in content; `clamp(1.125rem, 2.4vw, 1.375rem)`, line-height 1.5, `--text-ink`.
- ⓘ sourcing button stays in the top-right corner (only when `showTrustFooter`).
- **Blind line** (only when `showTrustFooter`, i.e. not in the warm-up): eye-off icon + "Speaker and
  source are shown when you see your ballot", 13 px, `--text-tertiary`, 1rem above the buttons.
  Contains no candidate information.
- **Desktop verdict buttons inside the card** (below the blind line): the `ActionButtons` group
  renders as a child of the card on mouse devices, full card width, two equal buttons, gap 0.75rem.
  On touch devices the card has no buttons; they stay in `.mobile-verdict-stack`.

### 5. Verdict buttons (`ActionButtons.tsx`)

| Button | Content | Style |
|---|---|---|
| Disagree | ⊘ icon (circle with a diagonal slash, SVG, `aria-hidden`) + "Disagree" | `--surface-card` fill, 1.5 px `--text-heading` border, `--text-heading` text; hover `--surface-sunken` |
| Agree | ✓ icon (SVG, `aria-hidden`) + "Agree" | `--action-primary` fill, `--action-primary-ink` text; hover `--action-primary-hover`; keep the existing light sweep |

- 16 px / 700, uppercase with `letter-spacing: 0.06em`, radius 12 px, min-height 3.25rem.
- Accessible names unchanged ("Disagree with this quote" / "Agree with this quote"); keep
  `keyboard-active` feedback, `whileTap`, disabled state.
- Same styles in the mobile bottom stack (there the buttons keep their current height/spacing rules).

### 6. Shortcut hint (desktop only)

Below the card, centred: "Shortcut:" + key cap "←" + "disagree ·" + key cap "→" + "agree"
(13 px, `--text-tertiary`; key caps: `<kbd>`, 1 px `--border-medium`, radius 4 px, padding 0 0.375rem,
`--surface-card` bg). Rendered only when `isMouseDevice` and a quote is showing. `aria-hidden`
is NOT set — screen-reader users benefit from the hint. The existing keyboard handler is unchanged.

## Out of scope

- Ranking panel, topic-complete card, dock and sheet (screenshot 5 work).
- Verdict logic, analytics, coach-mark copy, swipe thresholds, flight animation.

## Testing

- `ActionButtons`: renders "Disagree" with the ⊘ icon and "Agree" with the ✓ icon; accessible names unchanged; clicks call the handlers.
- `EvaluationSurface` (or `EvaluationPhase`) tests: "Quote 1 of N" label; progressbar `aria-valuenow`/`aria-valuetext`; segment count equals total (and the single-bar fallback above 12); shortcut hint present on mouse devices and absent on touch (mock `useDeviceType`); blind line present in the race and absent when `showTrustFooter` is false; on mouse devices the verdict group is inside the card.
- Existing keyboard (←/→, A/D) and swipe tests still pass; the blind-payload guard tests unchanged.
- Browser check at 1280, 1024 and 390 px, light and dark, plus the warm-up.
