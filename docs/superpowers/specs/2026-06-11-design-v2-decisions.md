# Read & Rank — Design Spec v2 Decisions

**Date:** 2026-06-11
**Status:** Approved — all six decisions locked

---

## Overview

This spec captures the six changes required to bring the codebase in line with the Read & Rank Design Spec v2 and the Heavyweight prototype. All decisions were finalized through a visual brainstorming session.

---

## D1 — Coin press verdict (paddles only)

**Decision:** Replace swipe gesture with two full-bleed verdict slabs. Paddles are the only input method.

### ActionButtons
- Replace current two-button layout with two fixed slabs spanning the full viewport width
- DISAGREE slab: left half, charcoal background (`#1a1a1a`), white text
- AGREE slab: right half, coral background (`--coral`, `#ff5740`), white text
- Height: `78px`, `border-radius: 0`
- Text: `font-size: 19px`, `font-weight: 800`, `letter-spacing: 0.08em`, uppercase
- No SVG icons inside the paddles

### QuoteCard — stamp overlay
- Remove `drag="x"` from framer-motion props entirely
- Add a stamp circle overlay that appears during the "Strike" animation phase:
  - Size: `150px` diameter circle
  - AGREE stamp: solid border `4px solid #ff5740`, text "AGREE"
  - DISAGREE stamp: dashed border `4px dashed #8d8d8d`, text "DISAGREE"
  - Transform: `rotate(-8deg)`
  - Background: `rgba(20, 20, 20, 0.55)`
  - Opacity: 0 at rest, animates to 1 on paddle tap, disappears on card exit

### Animation sequence (coin press)
Three phases driven by framer-motion:

1. **Strike** — stamp overlay appears (opacity 0 → 1, scale 0.8 → 1, duration 120ms)
2. **Hold** — stamp holds visible for 180ms
3. **Drop** — card exits the stack (opacity 1 → 0, y 0 → 40px, duration 200ms); stamp exits with it

---

## D2 — Tier mark visual weight

**Decision:** Option B — solid color tile with white icon.

Replace the current light-background icon tiles with solid colored tiles. Each tier gets its own background color; the SVG icon (existing paths, no shape changes) renders in white over it.

| Tier | Tile background | Icon |
|---|---|---|
| diamond | `#60a5fa` (blue-400) | white gem path |
| gold | `#fbbf24` (amber-400) | white medal path |
| silver | `#94a3b8` (slate-400) | white medal path |
| bronze | `#a78bfa` (violet-400) | white check-circle path |
| disagreed | `#6b7280` (gray-500) | white slash-circle path |

Tile dimensions: `32px × 32px`, `border-radius: 8px`.
Icon size: `20px × 20px`, centered, `stroke="white"`.

---

## D3 — Full rename: iron → disagreed

**Decision:** Remove "iron" from the entire codebase — TypeScript types, runtime values, CSS class names, and CSS custom properties. Nothing named "iron" should remain.

### Scope of changes

**`src/utils/tiers.ts`**
- `Tier` union: `'iron'` → `'disagreed'`
- `TIER_META.iron` key → `TIER_META.disagreed`
- Inside that entry: `tier: 'iron'` → `tier: 'disagreed'`, `name: 'Iron'` → `name: 'Disagreed'`

**`src/components/TierIcon.tsx`**
- `case 'iron':` → `case 'disagreed':`

**`src/components/RankRail.tsx`**
- CSS class refs: `rank-rail-iron` → `rank-rail-disagreed`, `iron-divider` → `disagreed-divider`, `rank-sheet-iron-toggle` → `rank-sheet-disagreed-toggle`

**`src/index.css`**
- `--tier-iron-border` → `--tier-disagreed-border`
- `--tier-iron-ink` → `--tier-disagreed-ink`
- `.tier-row-iron` → `.tier-row-disagreed`
- `.tier-ghost-iron` → `.tier-ghost-disagreed`

Any other `iron` references (grep the full codebase before closing this out).

---

## D4 — Remove quote truncation

**Decision:** Delete the two-line clamp on quote text in RankList entirely.

**`src/components/RankList.tsx`** — inside `SortableRow`, remove from the quote text element:
```
WebkitLineClamp: 2,
WebkitBoxOrient: 'vertical',
overflow: 'hidden',
display: '-webkit-box',
```

Full quote text must be visible at all times in the ranked list.

---

## D5 — Issue selection screen

**Decision:** Insert a new `'issue-selection'` phase between race selection and evaluation.

### Screen design
- **Title:** "Choose your issues."
- **Subtitle:** "Every issue keeps its own ranking. Rank them all, or just the ones you care about."
- Each topic rendered as a full-row toggle:
  - Selected state: coral check tile on left, topic name, quote count on right
  - Unselected state: empty border tile on left
- **NOT SCORED topics** (topics where unique `candidateToken` count === 1):
  - Dashed border style
  - Non-selectable (grayed out)
  - "NOT SCORED" label in small text
- All scorable topics selected by default (opt-out model)
- **CTA:** "Start · N quotes · about N minutes"
  - `N quotes` = sum of quotes across selected topics
  - `N minutes` = `Math.ceil(totalQuotes / 8)` (assumes ~8 quotes/minute)
  - Disabled when 0 topics selected

### Store changes (`src/store/useReadRankStore.ts`)
- Add `'issue-selection'` to `Phase` union
- Add `selectedTopicKeys: string[]` to `RaceProgress`
- Add action `setSelectedTopics(keys: string[]): void`
- Add action `confirmIssueSelection(): void` — sets `phase` to `'evaluation'`
- Navigation: after race selection → `phase = 'issue-selection'`; after confirm → `phase = 'evaluation'`

### New file: `src/components/IssueSelection.tsx`
- Reads `selectedTopicKeys` from store
- Reads race topics + quote counts from race data
- Renders topic list with toggle logic
- Renders live-computing CTA

---

## D6 — Drag reordering with spring physics

**Decision:** The ranked list must support drag reordering that feels like a magnet settling into place — spring physics, overshoot on drop.

**Note:** This was not in the original spec but was added as a confirmed requirement.

### Implementation

**`src/components/RankList.tsx`**
- Replace direct CSS transform approach with `DragOverlay` from `@dnd-kit/core`
- `SortableRow` continues to use `useSortable`; render a ghost placeholder in its place while dragging
- `DragOverlay` renders the lifted card at cursor position with a subtle scale (`1.02`) and box-shadow elevation
- On drag start: lifted item scales up slightly (`scale: 1.02`), elevation shadow appears
- During drag: items below/above shift with framer-motion `layout` spring animation
  ```
  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
  ```
- On drop (drag end): item snaps into slot with a brief overshoot
  ```css
  /* CSS for the drop snap */
  transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
  ```
  The `1.56` overshoot coefficient gives the magnet-settling feel.

**Packages already available:** `@dnd-kit/core`, `@dnd-kit/sortable`, `framer-motion` (all present in the project).

---

## Change summary

| ID | Area | Files affected |
|---|---|---|
| D1 | Coin press paddles | `ActionButtons.tsx`, `QuoteCard.tsx` |
| D2 | Tier mark solid tiles | `TierIcon.tsx`, `index.css` |
| D3 | Rename iron → disagreed | `tiers.ts`, `TierIcon.tsx`, `RankRail.tsx`, `index.css` (+ grep) |
| D4 | Remove quote truncation | `RankList.tsx` |
| D5 | Issue selection screen | `useReadRankStore.ts`, new `IssueSelection.tsx`, navigation wiring |
| D6 | Spring drag physics | `RankList.tsx`, `@dnd-kit/core` DragOverlay |
