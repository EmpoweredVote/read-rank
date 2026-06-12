# Landing Page & Race Card Redesign

**Date:** 2026-06-11
**Status:** Approved

## Overview

Two related changes: updated hero copy on the landing page, and a visual + structural overhaul of the race card. The goal is clearer hierarchy, better readability at desktop sizes, WCAG-compliant text sizing, and a cleaner data layout that separates office title from district.

---

## 1. Landing Page Copy

### Hero headline
Two lines. Second line renders in `var(--text-link)` (teal), matching the existing accent pattern.

```
Read candidates blind.
Rank by what they said.
```

### Hero subtext
```
Read real quotes from real candidates — without knowing who said it.
Form your own view. Then find out who you actually align with.
```

### Pizza warm-up button
Copy stays close to current:
```
Not sure yet? Try a 30-second warm-up with pizza opinions.
```

---

## 2. Race Card — Frontend Changes

All changes are in `RaceCard.tsx` and the `.race-card-v2` CSS block in `index.css`. The `RaceHub.tsx` caller needs one new prop threaded through.

### Layout restructure

The card switches from a float-based layout to a **flex column** so the meta row can be pinned to the bottom and `height: 100%` works correctly for equal-height rows.

```
card (flex column, height: 100%)
  ├── card-top (flex row, flex: 1)
  │     ├── motif (60×60, flex-shrink: 0)
  │     └── body (flex: 1, min-width: 0)
  │           ├── scope-row   "INDIANA · May 6, 2025"
  │           ├── title       "Monroe County Commissioner"
  │           └── district    "District 1"   (absent when no districtLabel)
  └── meta (flex row, flex-shrink: 0, pinned to bottom)
        ├── Candidates
        ├── Topics
        └── Time
```

### Removed elements
- **Arrow** (`race-card-v2__arrow`) — removed entirely; hover state on the card border already signals interactivity
- **"Local" pill** (`race-card-v2__pill`) — removed

### Scope row
- Replaces the old `TIER · SCOPE` label
- Content: full state name + exact election date, separated by `·`
  - State: derived from a `STATE_NAMES` lookup table (`"IN"` → `"Indiana"`)
  - Date: formatted as `"May 6, 2025"` (full month + day + year via `toLocaleDateString`)
- `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` — never wraps

### Title
- Displays the clean `positionName` (office title only, district stripped by backend)
- Font size: **19px** (up from 17px)

### District line
- New element below the title
- Displays `districtLabel` prop when non-null; renders nothing when absent
- Font size: **17px**, font-weight 700, color `var(--text-secondary)`

### Geo line
- **Removed** — its content (state + date) has moved to the scope row

### Meta row
- Columns **centered** (`align-items: center; text-align: center`)
- Label (Candidates / Topics / Time): **10px** (up from 8px), `white-space: nowrap`
- Value: **17px** bold (up from 11px), `white-space: nowrap`

### Typography summary

| Element | Before | After |
|---|---|---|
| Scope label | 9px | 11px |
| Title | 17px | 19px |
| District | — | 17px |
| Meta keys | 8px | 10px |
| Meta values | 11px | 17px |

### Grid

The `.race-grid` container updates its column template to enforce a minimum cell width:

```css
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
```

This prevents cells from shrinking below 280px, which is the minimum width at which all card content (including "~4 min") fits without wrapping or clipping. The `min-width` on the card itself is removed — the grid cell is the right place to enforce this.

### Equal-height rows

Cards use `height: 100%` and `display: flex; flex-direction: column`. CSS grid rows already stretch all cells to the tallest item by default (`align-items: stretch`). The flex column + `height: 100%` ensures the card element itself fills the cell, so shorter cards grow to match taller siblings in the same row.

---

## 3. Backend Contract Change (separate PR — ev-accounts)

A new optional field is added to the race summary API response:

```ts
districtLabel?: string | null
```

Examples: `"District 1"`, `"District 61"`, `"9th District"`, `null` (statewide races)

Simultaneously, `positionName` becomes the clean office title with district information stripped (e.g., `"Monroe County Commissioner"` instead of `"Monroe County Commissioner District 1"`).

### Migration safety

The frontend renders `districtLabel` when present and shows nothing in that slot when absent. This means the frontend can be deployed before the backend change lands without any visible regression — cards will simply show no district line until the backend sends the field.

### Frontend contract update

`RaceSummary` interface in `src/data/api.ts`:
```ts
districtLabel?: string | null;
```

`RaceCardProps` in `src/components/RaceCard.tsx`:
```ts
districtLabel?: string | null;
```

`RaceHub.tsx` passes `race.districtLabel` through to `<RaceCard>`.

---

## Out of scope

- No changes to the motif/map rendering
- No changes to the evaluate or reveal flows
- No changes to the step sidebar on the landing page
- The `usesRcv` "Ranked choice" label in the geo line is removed along with the geo line — if RCV needs to surface somewhere, that's a follow-up
