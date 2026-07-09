# Reveal + Results redesign — design spec

**Date:** 2026-07-08
**Surfaces:** the reveal gate (`ThresholdInterstitial`) and the results page
(`ResultsPhase`, `AlignmentGrid`, `TierIcon`, `BallotCard`).

## Goal

Merge the reveal gate into the results page (no extra click), retire the metallic
tier medals in favour of a numbers-led mark vocabulary that matches the ranking
panel, reuse the Essentials `PoliticianCard` for candidate cards, solve the
many-topics horizontal-scroll pain with a responsive matrix↔pills layout, and give
each candidate an expandable quote drawer built on the app's three quote layers
(edited → verbatim → source), with an editor's note and video-timestamp deep links.

This is a **post-reveal** surface, so full provenance (source, date, verbatim text,
video) is allowed and expected here — it never appears on the blind evaluation card.
See `CLAUDE.md` invariants and `blind-evaluation-no-provenance`.

---

## 1. Merge the reveal gate into results

- Remove the separate threshold **stage** and its button. `ResultsPhase` no longer
  has `stage: 'threshold' | 'results'`; it renders results directly and the existing
  reveal choreography (`computeRevealTimeline`, count-up, grid pop, #1 spotlight +
  `megaBurst`) plays on load — that animation *is* the reveal moment now.
- `ThresholdInterstitial` is removed as a route/stage. Its two lines survive, folded
  into a **dark band** at the top of the results page.
- **Band (hero):**
  - Light mode: near-black (`--color-ev-black` / `#1c1c1c`).
  - Dark mode: **elevated charcoal** — a lifted dark surface (≈`#232c38`) with a
    hairline top border (≈`#313d4c`), NOT the page color and NOT an inverted light
    band. Same "dark moment" identity in both modes.
  - **Eyebrow:** `{office} · You ranked N quotes across M topics` (office name now
    lives here as well as in `RaceBreadcrumb`).
  - **Headline:** `Now see who you agreed with`, with the ev-yellow underline on
    "who" (`.reveal-threshold-who` treatment, kept).
  - No button. The band is persistent (visible when scrolling back to top).
- Loading ("Tallying your ballot…") and empty-ballot states are retained.

## 2. Mark vocabulary (replaces medals)

One vocabulary used in the alignment matrix, the mobile pills, and the quote drawer:

| State | Mark | Colour (light → dark) |
|---|---|---|
| Ranked pick | teal number chip `1` / `2` / `3` … | `--text-link` `#00657C` → ev light blue `#59B0C4` |
| Agreed (not a ranked pick) | `ti-circle-check` | `--agree` `#0e7490` → brighter teal |
| Disagreed | `ti-circle-x` | muted gray `~#a8a29e` |
| Not seen / not judged | faint `ti-minus` | `~#cfc9bf` (replaces the bare `·`) |

- **All rank numbers are the same size** — #1 is not visually distinguished from
  #2/#3. Number = rank; colour never carries rank.
- Numbers are per-topic rank (`tierForIndex` index within a topic's `agreed` array).
- **Retire** the metallic `TierIcon` tiles, the Diamond/Gold/Silver/Bronze naming and
  gleam, and the `.tier-tile-*` gradients at the reveal. `tiers.ts` may stay only as
  the rank-index helper; the tier *names/medals* no longer render anywhere.
- Keep the colourblind-safe pattern: every mark pairs an icon with an sr-only label
  (never colour alone).

## 3. Alignment section (responsive)

- **Small label above the grid:** e.g. "Your alignment at a glance".
- **Desktop — the matrix (kept):** candidates × topics table. Sticky first column
  (candidate name pinned), compact/rotated topic headers, and an edge fade on the
  scroll container for the rare very-wide case. Column-scanning is preserved here.
- **Mobile — wrapping pills:** no table. Each candidate gets a block (avatar + name)
  with mark pills that **wrap** to new lines instead of scrolling. Each pill is
  `mark + topic label`. Pills are **sorted strongest-first** (#1s → #2s → #3s →
  agreed → disagreed) so pill density telegraphs candidate strength at a glance.
  Cross-topic column scanning is traded away on mobile by design.
- Breakpoint via the existing device/media hook.

## 4. Candidate cards (reuse Essentials `PoliticianCard`)

Each card is a row: **leading rank number** + an **outer container**.

- **Leading rank number:** the same teal number chip as the marks, same size for all
  ranks, vertically centred on the identity card. **No colored left border** (the old
  gold/silver/coral accent is removed — the number carries rank).
- **Tie:** competition ranking (`1, 2, 2, 4`). Tied entries share the number with a
  small, quiet "Tied" tag tucked **under** the number. Recommend the backend break
  ties by `firstPlaceCount` before declaring a true tie.
- **Outer container** stacks three parts; only the drawer grows, so the **photo never
  stretches**:
  1. **Identity (`PoliticianCard`, essentially untouched):** portrait photo · teal
     name · position (line 2) · district/jurisdiction (line 3). The **Essentials
     symbol** logo sits top-right, top-aligned with the name, ~28–30px tall
     (larger than a text line), linking to `essentialsUrl`. No compass button.
  2. **Summary strip (below identity, a clean row — not a filled button):**
     `Agreed with X of Y · Z top picks` (plain text; `Z top picks` from
     `evidence.firstPlaceCount`, omitted when 0) on the left, and a clearly visible
     teal toggle `See what they said ⌄` / `Hide quotes ⌃` on the right.
  3. **Drawer (§5)** when expanded.

## 5. Quote drawer — three layers

- Attached below the card; identity height is fixed (only the drawer expands).
- One block **per topic**; **include disagreed** topics; **sorted strongest-first**
  (matches the mobile pills).
- Each block:
  - Mark (§2) + topic title.
  - **Edited quote by default** (the revealed quote — source of truth).
  - **Attribution line shown in BOTH states:** `{source name} · {date}` plus a
    trailing link — `View source ↗`, or a coral **`▶ Watch at MM:SS`** deep link when
    the source is a video with a timestamp.
  - **`Show full quote`** expands to the **verbatim** quote with the **edited span in
    bold**. Surrounding (non-edited) verbatim text stays **AAA-contrast (≥7:1)**;
    emphasis is carried by **weight** — 700 in light, **800 in dark** (tonal contrast
    is weaker in dark, so weight does the work). `Show edited version` collapses.
  - **Editor's note:** a quiet **footnote** — small, muted, lowercase `ⓘ editor's
    note` — shown **only in the verbatim/raw view**. Opens in a popover on
    hover/focus/tap (keyboard- and touch-operable, never hover-only). Not an inline
    expand.
- The three layers: **de-id'd** (blind-card artifact — NOT shown here), **edited**
  (default), **verbatim** (on demand). The reveal shows edited/verbatim only.

## 6. Removed

- The insight strip (`buildInsightSentence` render + `.insight-strip`).
- The threshold stage + "See who you agreed with" click.
- Metallic tier medals / `TierIcon` tiles / gleam at the reveal.
- The rank-colored left border on candidate cards.

## 7. Motion

Keep the existing choreography (`useMotion`, `computeRevealTimeline`, `useCountUp`,
reduced-motion handling). Grid cells pop the **number/mark** in (replacing the
metallic gleam). `megaBurst` stays on #1 — the one earned celebration.

## 8. Data dependencies (require API / asset / backend work)

1. **Candidate identity fields.** The reveal API returns a single `office` string.
   Cards need separate **title/position**, **chamber**, and **district/jurisdiction**
   (available in Supabase). Extend `BallotEntry` + the reveal endpoint to return them
   separately (avoid fragile client-side splitting).
2. **Essentials symbol assets.** Copy `essentials-symbol-light.svg` /
   `essentials-symbol-dark.svg` (from the `ev-landing` repo) into read-rank assets;
   pick the variant by theme.
3. **Three quote layers + provenance.** `RevealQuote` currently has one `text`.
   It needs: `editedText`, `verbatimText`, a way to locate the **edited span within
   the verbatim** (offset range or guaranteed-substring) for bolding, `editorNote`,
   `sourceName`, `sourceDate`, `sourceUrl`, and `videoUrl` + `videoTimestamp` when
   available. Video deep links reuse the on-the-record timestamp export
   (`on-the-record-quote-extraction`).
4. **Tie-breaking.** Ranking is server-side; add a `firstPlaceCount` tiebreak and
   allow shared ranks (competition ranking) in the response.
5. `evidence.firstPlaceCount` already exists — powers "Z top picks".

## 9. Accessibility

- Marks: icon + sr-only tier/state label; never colour alone.
- Verbatim body text meets **WCAG AAA** (≥7:1); emphasis via weight.
- Editor's-note popover operable by keyboard and touch.
- Reveal animation respects reduced motion (existing).
- Every component themed for light and dark.

## 10. Likely files

`ResultsPhase.tsx`, `AlignmentGrid.tsx` (+ new mobile pills view), `TierIcon.tsx`
(→ replaced by a `Mark`/number component), `tiers.ts` (reduce to rank-index helper),
`ThresholdInterstitial.tsx` (remove), `revealInsight.ts` (remove usage),
`useReadRankStore.ts` (drop threshold stage), `data/api.ts` (types), `index.css`,
plus a new Essentials-logo component/asset and the quote-drawer components.

## Out of scope

- Changes to the blind evaluation card or ranking panel (already shipped —
  `ranking-surface-record-redesign`).
- Curation/authoring of quotes (curated into `essentials.quotes`, not this repo).
