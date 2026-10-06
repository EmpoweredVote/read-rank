# "Choose your issues" refresh — design

**Date:** 2026-10-06
**Status:** Approved in conversation, pending spec review
**Source:** Aditi's UX prototype (rr#109) — `docs/design/readrank-ux-redesign/screenshots/04-choose-issues.png`, `prototype/issues.html`
**Builds on:** the ev-ui palette (rr#112) and landing refresh (rr#117), both on `main`.

## Goal

Rebuild the issue-selection screen (`IssueSelection.tsx`) to Aditi's two-column layout, keep the
app's existing selection rules, and use one reading-time rule everywhere.

## Decisions (from review)

| Question | Decision |
|---|---|
| Layout | Aditi's two columns: context on the left, issue panel on the right. One column on phones. |
| Race context | A race chip (map motif, state · date, office · seat) replaces the breadcrumb's text label on **this screen only**. Other phases keep `RaceBreadcrumb`. |
| Ranked issues | Locked and shown checked (as today). Not selectable, not counted in the Start total. The prototype let them be re-selected and counted them — that is a prototype bug. |
| Single-candidate issues | Kept, greyed, "Not scored" pill (the prototype omitted them). |
| "See your ballot so far" | Shown under Start once at least one issue is ranked. |
| Reading time | One rule: `estimateMinutes` (`src/utils/estimateMinutes.ts`, 10 s/quote) — per row and in the button. Replaces this screen's `quotes / 8`. |
| Type scale | Same as the landing hero (H1 48 → 60 px, weight 700). |

## Layout

```
‹ All races                                ┌ ISSUES IN THIS RACE      2 available ┐
┌───────────────────────────────┐          │ ☑ Housing                [Not started]│
│ [map] INDIANA · NOV 3, 2026   │          │   2 quotes · about 20 sec             │
│       US Representative · D 7 │          │ ☑ Immigration            [✓ Ranked]   │
└───────────────────────────────┘          │   2 quotes · already ranked           │
Choose your issues                         │ ☐ Taxes                 [Not scored]  │
Pick the topics you care about. …          │   1 quote · one candidate             │
1 of 2 issues ranked        Welcome back   │ [ Start reading · 2 quotes · about 1 min → ] │
▬▬▬▬▬▬▬▬▬▬▬────────────                    │          See your ballot so far       │
⊘ Quotes are shown without names or …      └───────────────────────────────────────┘
```

Grid: `lg:grid-cols-[1fr_minmax(0,32rem)]`, gap 4 → 6rem, `items-start`; container matches the
landing (`max-width: 1512px`, `px-6`). Below `lg` the columns stack (left first).

### Left column

| Element | Spec |
|---|---|
| Back link | "All races" with a left chevron; calls `goToHub` (same as the breadcrumb back). |
| Race chip | Rounded panel (`--surface-raised`, radius 12 px, padding 1rem). Left: the `Motif` (same component and props as `RaceCard`), 48 px. Right: eyebrow "{STATE NAME} · {date}" (12 px / 700 / uppercase / `tracking-widest`, `--text-tertiary`), then "**{office}** · {seat}" (18 px, office weight 700, `--text-heading`; seat weight 400 `--text-secondary`). Date format as RaceCard (`Nov 3, 2026`). Missing pieces are omitted, not shown as blanks. |
| H1 | "Choose your issues" — `text-5xl sm:text-6xl font-bold leading-tight`, `--text-heading`. |
| Lede | "Pick the topics you care about. You'll read what each candidate said, then rank them." — `text-lg leading-relaxed`, `--text-secondary`, max 48ch. |
| Progress (re-entry only) | Shown when at least one scorable issue is ranked. "**{done} of {scorable}** issues ranked" left, "Welcome back" right (14 px, `--text-secondary`); below it a 6 px bar, track `--border-subtle`, fill `--action-primary`, radius full. `role="progressbar"` with `aria-valuenow/min/max` and an accessible label. |
| Blindness note | Separated by a 1 px `--border-subtle` rule. Eye-off icon + "Quotes are shown without names or parties. You'll find out who said what after you rank." (14 px, `--text-tertiary`). |

### Right column — issue panel

White card (`--surface-card`, 1px `--border-subtle`, radius 16 px, padding 1.75rem, `--shadow-card`).

- Header row: "ISSUES IN THIS RACE" (12 px / 700 / uppercase / `tracking-widest`, `--text-tertiary`) and "{scorable} available" on the right.
- Rows (`gap: 0.75rem`), each radius 12 px, padding 1rem 1.25rem, 1 px border:

| Row state | Control | Second line | Pill | Style |
|---|---|---|---|---|
| Scorable, not ranked | `<button aria-pressed>` checkbox tile | "{n} quotes · about {t}" | "Not started" (neutral: `--surface-sunken` bg, `--text-tertiary`) | selected: `--action-primary` border + `--surface-raised` bg; unselected: `--border-subtle` border, `--surface-card` bg |
| Scorable, ranked | non-interactive, checked tile | "{n} quotes · already ranked" | "✓ Ranked" (`--surface-raised` bg, `--text-link`) | `--border-subtle` border, `--surface-raised` bg |
| Not scorable (one candidate) | non-interactive, empty tile | "{n} quote(s) · one candidate" | "Not scored" (neutral) | `--surface-sunken` bg, title in `--text-tertiary` (no opacity — keeps AA contrast) |

  `{t}` = per-row time: `< 60 s` → "about {s} sec" (rounded to 10 s, min 10); otherwise "about {m} min" from `estimateMinutes`.
- Start button (full width, `ev-button-primary` colours, radius 12 px, 18 px / 700): "Start reading · {quotes} quotes · about {m} min →". Disabled state "Select at least one issue" (as today). When re-entry and no undone scorable issue is selected: "See your ballot" → `setPhase('results')` (as today).
- "See your ballot so far" text button under Start (`.rr-text-btn`), shown when ≥ 1 scorable issue is ranked AND the Start button is not already "See your ballot". Calls `setPhase('results')`.
- The `readrank_issue_selection_confirmed` event keeps its props; `estimated_minutes` now uses `estimateMinutes`.

## Data: race chip fields

`RaceProgress` (store) gains optional display fields captured at selection, like `office`/`seat`/`state` (ADR-0001):

```ts
electionDate?: string | null;
tier?: Tier;
scope?: Scope;
boundaryRef?: BoundaryRef | null;   // stored WITHOUT geojson (layer, geoid, bbox only)
frameRef?: BoundaryRef | null;      // stored WITHOUT geojson
```

- `selectRace`'s `meta` argument gains the same optional fields. `RaceHub.handleSelect` passes them from the `RaceSummary` (tier/scope via `deriveTierScope`), stripping `geojson` so localStorage stays small; `Motif` already lazy-loads geometry with `fetchBoundary`.
- Optional fields → no persist-version bump. A race started before this change, or from a cold deep link (`useRaceRouteSync` calls `selectRace` with no meta), shows the chip without the motif or date; office falls back to `positionName`.

## Component boundaries

- `IssueSelection.tsx` — the screen; stays the owner of selection logic.
- New `RaceChip.tsx` — presentational; props `{ office, seat, state, electionDate, tier, scope, boundaryRef, frameRef }`; renders the motif only when `tier` and `scope` are known.
- New pure helper in `src/utils/estimateMinutes.ts`: `formatReadingTime(quoteCount: number): string` → "about 20 sec" / "about 2 min".
- `PhaseContainer.tsx` — render `RaceBreadcrumb` for `evaluation` and `results` only (not `issue-selection`).
- CSS in `src/index.css` replaces the `.issue-selection*` / `.issue-row*` / `.issue-check-tile*` rules (tokens only).

## Testing

- `IssueSelection` tests: rows render the right state/pill for not-ranked, ranked and not-scored; ranked rows are not buttons and not counted; Start text uses `estimateMinutes`; progress block only on re-entry with correct counts and `progressbar` values; "See your ballot so far" visibility rules and action; "All races" calls `goToHub`; chip shows office, seat, state and date, and omits missing fields.
- `formatReadingTime` unit tests (10 s floor, rounding, minute switch).
- Store test: `selectRace` meta stores the new fields and strips `geojson`.
- `PhaseContainer`: breadcrumb absent on issue-selection, present on evaluation.
- Browser check at 1280 and 390 px, light and dark: first visit, re-entry, all-ranked.

## Out of scope

- The read, ranking and ballot screens (later screenshots).
- Changing which topics are scorable, or the per-topic reveal model.
