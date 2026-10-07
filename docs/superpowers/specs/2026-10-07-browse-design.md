# Browse races refresh — design

**Date:** 2026-10-07
**Status:** Approved in conversation, pending spec review
**Source:** Aditi's UX prototype (rr#109) — `docs/design/readrank-ux-redesign/screenshots/03-browse-races.png`, `prototype/browse.html`
**Builds on:** palette (#112), landing (#117), issues (#119), reading (#120), ranking panel (#121), full ballot (#122) — all on `main`.

## Goal

Make Browse its own view with Aditi's page title, filter panel and section headers, while
keeping the current `RaceCard` unchanged and the existing search/filter behaviour.

## Decisions (from review)

| Topic | Decision |
|---|---|
| Race cards | **Keep the current `RaceCard`** (motif, stats row, progress label). The prototype's card is not adopted. |
| Where Browse lives | **Its own view.** While Browse is open, the landing hero, timeline, address box and Upcoming/Past switch are hidden — only one search field is on screen. |
| Section headers | Aditi's style (icon square + uppercase label + count circle + rule), replacing the coloured left-border banners. |
| Behaviour | Unchanged: search synonyms + county names, office pills, state dropdown, tier sections, rankable-only, no pagination, empty state. |

## 1. Browse view (`Landing.tsx`, `RaceHub.tsx`)

- `Landing`: when `browseTarget` is set, render only the picker container's Browse content —
  the hero grid (eyebrow, headlines, intro, CTA, warm-up link, timeline), the picker's
  "Choose an election" `h2`, the `AddressFilterInput` and the `TimeFilterSwitch` are not
  rendered. The `#choose-election` container drops its top border and top padding in this mode.
- `RaceHub` (also used standalone by `PhaseContainer`): when `browseTarget` is set, it does not
  render its own header block or `AddressFilterInput`, whatever `hideHeader` / `hideFilter` say.
- Browse view header (rendered by `RaceHub`'s browse branch, above `RaceBrowse`):
  - Back link: a text button `.rr-browse-back` — "‹ Back to my ballot" when a location is set
    (`locationFilter !== null`), otherwise "‹ Back". 14 px, weight 700, `--text-link`, no border,
    no background; underline on hover; visible focus ring. It calls `setBrowseTarget(null)`.
    Replaces the current `ev-button-secondary` "‹ Back to my ballot" button.
  - Title: `<h1 tabIndex={-1} className="rr-browse-title">Choose an election</h1>` —
    `font-size: clamp(2rem, 4vw, 2.75rem)`, weight 800, `--text-heading`, `letter-spacing: -0.02em`,
    margin 0.5rem 0 1.25rem.
- On entering Browse (the browse branch mounts): `window.scrollTo({ top: 0 })` and focus the H1
  with `preventScroll: true`.
- On leaving Browse (Back): the landing re-renders; scroll the `#choose-election` container
  into view (`block: 'start'`, smooth unless reduced motion) so the user lands back at the picker,
  not the hero.

## 2. Filter panel (`RaceBrowse.tsx` + CSS)

- Wrap the search box and the filter row in `<div className="rr-browse-panel">`:
  `--surface-card` background, 1 px `--border-subtle`, radius 16 px, padding 1rem,
  `--shadow-card`.
- Search input: full width, background `--surface-sunken`, 1 px `--border-subtle`, radius 12 px,
  height 3rem, 15 px text; focus: border `--action-primary` and ring `0 0 0 3px var(--focus-ring)`. Add the new
  token `--focus-ring` to `:root` (`rgba(0, 83, 102, 0.18)`) and `.dark`
  (`rgba(89, 176, 196, 0.28)`). No hex literals in the rule.
- Filter row (`.rr-browse-filters`): flex, wrap, gap 0.5rem, margin-top 0.75rem. Pills on the
  left; the state control pushed right with `margin-left: auto`.
- Pills: 14 px, weight 700, radius full, 1 px `--border-medium`, `--surface-card` bg,
  `--text-strong` text; active pill `--action-primary` bg and border, `--on-dark-ink` text
  (replaces the hard-coded `#fff`).
- State control: the existing `<select>` inside `<label className="rr-browse-state">` with a
  pin icon (SVG, `aria-hidden`) before it; same height and radius as the pills; min-width 11rem.
  `aria-label="Filter by state"` stays on the select.
- Phones (< 640 px): pills wrap; the state control takes its own full-width line
  (`flex-basis: 100%`, `margin-left: 0`).

## 3. Count and section headers

- Count: `<p className="rr-browse-count"><strong>{total}</strong> race{s}</p>` — 14 px,
  `--text-secondary`, the number in `--text-heading`; margin 1.25rem 0 0.75rem.
- Section header `.rr-browse-banner` (replaces the left-border banner and its four colour
  modifiers):
  - Flex row, gap 0.625rem, align centre, margin 1.5rem 0 0.875rem.
  - Icon square: 1.75rem, radius 8 px, `--surface-raised` bg, `--text-link` icon (16 px SVG,
    `aria-hidden`). Icons: Statewide → a flag; U.S. House → a capitol dome;
    State Legislature → a pediment over three columns; Local → a small house.
  - Label: the category name, 12 px, weight 800, uppercase, `letter-spacing: 0.12em`,
    `--text-heading`.
  - Count: a circle chip, min-width 1.5rem, height 1.5rem, radius full, 1 px `--border-subtle`,
    12 px weight 700 `--text-secondary`, centred number. Screen readers hear
    "{label}, {n} races" — the visible row carries `aria-hidden` on the count and the section
    gets `aria-label="{label}, {n} race(s)"`.
  - Rule: a flex-1 1 px line in `--border-subtle`.

## 4. Unchanged

`RaceCard` and `race-grid`, `raceCardProgress`, search/haystack/synonyms, office filter
logic, the state preset from `initial`, the rankable-only filter, the empty-state text,
analytics, the store shape (`browseTarget`).

## Testing

- `Landing` with `browseTarget` set: no hero headline ("Read candidates blind,"), no address
  input, no time switch; H1 "Choose an election" present.
- `RaceHub` browse branch: back link text "‹ Back to my ballot" with a location and "‹ Back"
  without; clicking it calls `setBrowseTarget(null)`; the H1 receives focus on mount.
- `RaceBrowse`: the count shows the total in a `<strong>`; each section has
  `aria-label` "{label}, {n} race(s)"; the panel contains the search input and the filter row;
  existing search/filter tests keep passing.
- Hex guard: add `src/components/RaceBrowse.tsx` to `CHROME_FILES` in
  `src/__tests__/noHardcodedChrome.test.ts`; the new CSS rules use tokens only.
- Browser check: desktop 1280 and phone 390 (touch), light and dark, with a Playwright route
  fixture that serves several races across all four tiers (no change to `mockData.ts`); also
  enter Browse from the address box with a state name, and Back returns to the picker.

## Out of scope

- Any `RaceCard` change.
- The landing page's own race list and Upcoming/Past switch.
- New search features or pagination.
