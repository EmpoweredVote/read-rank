# read-rank color + motion refresh — design

Date: 2026-06-16
Status: approved design, pending spec review

## Goal

Act on design feedback for read-rank:

1. Stop using `ev-coral` on interactive elements; move buttons/accents to a
   mode-aware blue.
2. When a user agrees with a quote, animate the card flying into the ranking
   pile.
3. (Deferred) More distinctive icons — out of scope this round.
4. (Noted, not solved here) Better quote curation — out of scope.

Also fold in cleanup: reconcile the dual "agree" color system and archive stale
root-level design docs that no longer match the code.

## Decisions (from brainstorming)

- **Blue direction:** deep blue on light surfaces, light blue on dark surfaces
  (mode-aware pairing).
- **Coral scope:** remove coral from everything interactive; keep it only on the
  bronze podium tier and the results-screen celebration particles.
- **Animation:** option #1 — the card shrinks and flies to the pile. Desktop
  targets the sidebar; mobile targets the bottom dock, with a graceful fallback
  to a pile-pulse if the flight is janky on mobile.
- **Icons:** skip this round.
- **Blues:** keep the new action blue harmonized with the existing `--agree`
  token rather than unifying to one blue (lower risk).
- **Docs:** archive stale design docs; keep `REDESIGN_SPEC.md`.

## A. Color system

### New tokens (`src/index.css`)

Add mode-aware action tokens alongside the existing semantic tokens, so light
and dark each resolve to the right blue automatically.

| token | light (`:root`) | dark (`.dark`) |
|---|---|---|
| `--action-primary` | `#00657c` | `#59b0c4` |
| `--action-primary-hover` | `#004d5c` | `#7cc5d6` |
| `--action-primary-ink` | `#ffffff` | `#06303a` |

`--action-primary-ink` is the text/foreground color drawn *on* the button. On
dark mode the button fill is light blue, so its ink is the dark teal `#06303a`
(matches the approved swatch). On light mode the fill is deep blue, ink is white.

### Coral → blue swap sites

All of these currently use coral and move to the action tokens:

- `.ev-button-primary` — `background-color`, `:hover` background, the hover
  `box-shadow` tint (currently `rgba(255,87,64,0.3)` → blue-tinted), and `color`
  → `var(--action-primary-ink)`.
- `.action-button-agree` — currently hardcoded `#ff5740`; becomes
  `var(--action-primary)` with `color: var(--action-primary-ink)`. (This is the
  lone coral outlier; the rest of the app already renders "agree" as blue.)
- `.quote-stamp-agree .quote-stamp-circle` border (`4px solid #ff5740`) and
  `.quote-stamp-agree .quote-stamp-text` color (`#ff5740`) → `var(--action-primary)`.
- `.issue-row-selected` border + tint and `.issue-check-tile-selected`
  background/border → `var(--action-primary)`.
- `PracticeRound.tsx` — the coral SVG arrow strokes → `var(--action-primary)`.
- `PhaseContainer.tsx` — the coral inline label color → `var(--action-primary)`
  (or `var(--text-link)` if it reads better as a link).

### Kept coral (intentional)

- `--podium-bronze` (`#ff5740` light / `#ff7a68` dark) — bronze tier color.
- `ResultsPhase.tsx` celebration particles (`var(--color-ev-coral)`).
- The `--color-ev-coral` / `--color-ev-coral-dark` token definitions remain;
  they simply stop appearing on interactive elements.

### Relationship to the existing `--agree` token

The app already defines `--agree` (`#0e7490` light / `#38bdf8` dark) used on
contextual bits (sidebar chips, reveal cards, topic stepper, swipe arrows).
These stay as-is. The new `--action-primary` (`#00657c`/`#59b0c4`) is a
harmonious teal-blue used for primary buttons and the agree paddle. Two close
teals coexist deliberately; unifying is a possible future cleanup, not this
change.

## B. Fly-to-rank animation

### Behavior

On **Agree**: the quote card scales down (~0.12) and arcs toward the agreed
pile, fading out; on landing, the store commit fires and the pile count pops
(+1). The next quote mounts only after the flight lands, preserving the current
end state.

On **Disagree**: unchanged quick slide-off; no pile, no flight (feedback was
specific to the agree→ranking path).

### Implementation approach

In `EvaluationPhase.tsx`:

- Render a **fixed-position flying clone** of the current card during the
  flight, so it can travel across layout regions (main column → sidebar/dock)
  without being clipped by overflow.
- Source geometry: `quoteCardRef` bounding rect. Target geometry: `sidebarRef`
  (desktop) or `dockRef` (mobile) bounding rect — both refs already exist.
- Drive the flight with the Web Animations API or framer-motion
  (`AnimatePresence` is already in use), animating translate + scale + opacity
  from source rect to target rect over ~600ms with an ease-out curve.
- `handleButtonSwipe('agree')` is retuned: brief stamp flash → launch flight →
  on flight end, call `agree(currentQuote)` and trigger the pile pop → release
  the `isAnimating` lock. This replaces the current fixed `delay(300)` +
  `delay(250)`.
- The pile pop is a short scale pulse on the sidebar/dock count.

### Platform + accessibility

- **Desktop:** flight targets the sidebar top (where the newest agreed item
  lands).
- **Mobile:** flight targets the bottom dock. If the flight proves janky on
  mobile, fall back to option #3 (no flight; dock highlights and count
  animates). This fallback is acceptable per the approved design.
- **`prefers-reduced-motion`:** skip the flight everywhere — commit immediately
  and pulse the pile. Same end state, no large-distance motion.

## C. Cleanup

- The coral→blue swap is the substantive cleanup of the dual agree-color system.
- Archive stale root-level design docs into `docs/archive/` (move, don't
  delete — reversible). Candidates: `DESIGN_UPDATES.md`,
  `RANKING_IMPROVEMENTS.md`, `MOBILE_IMPROVEMENTS.md`, `UI_SIMPLIFICATION.md`,
  `LIVE_REORDERING_GUIDE.md`, `RESET_GUIDE.md`, `ReadRankDesignDoc.md`,
  `ReadRankDevelopmentDoc.md`, `PROJECT_SUMMARY.md`. **Keep** `REDESIGN_SPEC.md`
  (current source of truth) and `EV-StyleGuide.md`. Final list confirmed at
  review.

## Testing

- Run the existing suite; the verdict flow tests (`EvaluationPhase.test.tsx`,
  `QuoteCard.test.tsx`, `RankDock.test.tsx`, etc.) must still pass. Because the
  store commit still happens (just on flight-landing), end-state assertions
  hold.
- Add coverage as needed: agree triggers a flight then commits; reduced-motion
  path commits without a flight clone.
- Manual verification in the browser preview: light + dark, desktop + mobile
  widths, confirming no coral remains on buttons/paddles and the flight reads
  well.

## Out of scope

- Icon redesign / Noun Project sourcing.
- Quote curation.
- Unifying `--agree` and `--action-primary` into a single blue.
