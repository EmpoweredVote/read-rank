# Landing page refresh + ev-ui palette — design

**Date:** 2026-10-06
**Status:** Approved in conversation, pending spec review
**Source:** Aditi's UX prototype (rr#109), `docs/design/readrank-ux-redesign/` — screen 1 (`screenshots/01-landing.png`, `prototype/landing.html`)

## Goal

Bring the Read & Rank landing page in line with Aditi's prototype hero, and make Read & Rank
look like the other Empowered Vote apps (Essentials, Financials, Compass) in colour and type.

## Decisions (from review)

| Question | Decision |
|---|---|
| Hero layout | Aditi's hero as drawn: vertical timeline of steps, teal "Choose an election ↓" button, warm-up link under it. The address search leaves the hero. |
| Palette | Switch the **whole app** to the ev-ui palette (cool teal-tint page, ev-ui greys). Drop the warm cream and the paper grain. |
| Race grouping | Keep the closeness tiers ("Your races" / "In {county}" / "More in {state}"). |
| Race cards | Keep the current card (`RaceCard.tsx`, `.race-card-v2`) unchanged. |
| Type scale | Use the sibling hero values (Essentials/Financials), not the prototype's larger, heavier heading. |

## Delivery: two PRs, in order

1. **PR 1 — ev-ui palette.** App-wide token change. No layout change.
2. **PR 2 — landing page.** Hero + "Choose an election" section header. Builds on PR 1's tokens.

PR 1 ships first so PR 2's screenshots and review happen on the final palette.

---

## PR 1 — ev-ui palette

All app colour already flows through the semantic tokens in `src/index.css` (`:root` and
`.dark`). PR 1 changes token **values**; component code changes only where a colour is
hard-coded.

### Light tokens (`:root`)

Values come from `@empoweredvote/ev-ui` `src/tokens.js` (`colorScales`, brand colours).

| Token | Now | New | ev-ui source |
|---|---|---|---|
| `--surface-page` | `#faf7f2` | `#F0F8FA` | `bgLight` (= Essentials page) |
| `--surface-card` | `#fffefb` | `#FFFFFF` | white |
| `--surface-raised` | `#f5f0e8` | `#F5F9FA` | teal-050 |
| `--surface-sunken` | `#faf7f2` | `#F7F7F8` | gray-050 |
| `--text-ink`, `--text-heading` | `#1a1a2e` | `#212326` | gray-900 |
| `--text-strong` | `#2d2d44` | `#2F3237` | gray-800 |
| `--text-secondary` | `#525c6b` | `#535964` | gray-600 |
| `--text-tertiary` | `#5f6877` | `#5F6570` | between gray-500 and gray-600. gray-500 `#6B7280` is only 4.49:1 on `#F0F8FA` (fails AA); `#5F6570` is 5.45:1 |
| `--text-link` | `#00657c` | `#00657C` | teal-500 (unchanged) |
| `--border-subtle` | `#e8e2d9` | `#E2EBEF` | Financials border |
| `--border-medium` | `#d4cdc3` | `#D3D7DE` | gray-200 |
| `--border-faint` | `#f0ebe3` | `#EBEDEF` | gray-100 |
| `--action-primary` | `#00657c` | `#005366` | `buttonPrimary` |
| `--action-primary-hover` | `#004d5c` | `#003E4D` | `buttonPrimary` hover |

### Dark tokens (`.dark`)

| Token | Now | New | ev-ui source |
|---|---|---|---|
| `--surface-page` | `#0f1419` | `#131416` | gray-950 (= Financials, Compass) |
| `--surface-card` | `#1a212b` | `#212326` | gray-900 |
| `--surface-raised` | `#222b37` | `#2F3237` | gray-800 |
| `--surface-sunken` | `#141a21` | `#1A1B1E` | between gray-950 and gray-900 |
| `--text-ink` | `#e8e6e1` | `#EBEDEF` | gray-100 |
| `--text-heading` | `#f4f2ee` | `#F7F7F8` | gray-050 |
| `--text-strong` | `#d8d6d1` | `#D3D7DE` | gray-200 |
| `--text-secondary` | `#aab4c0` | `#B3BBCC` | gray-300 |
| `--text-tertiary` | `#8b95a4` | `#8F9EBC` | gray-400 — 5.84:1 on the dark card |
| `--text-link` | `#6cc6db` | `#59B0C4` | skyblue-500 |
| `--border-subtle` | `#2a323d` | `#2F3237` | gray-800 |
| `--border-medium` | `#38424f` | `#41454E` | gray-700 |
| `--border-faint` | `#232b35` | `#262729` | between gray-900 and gray-800 |
| `--action-primary` | `#59b0c4` | `#59B0C4` | skyblue-500 (unchanged; `--action-primary-ink` `#06303a` stays, 5.65:1) |

### Other changes

- **Remove the paper grain**: delete the `body::before` rule and both `--grain-opacity` tokens.
- **`@theme`**: add `--color-ev-yellow-dark: #D0A301` (ev-ui `yellowDark`); remove any
  `#eab308` use of that name.
- **Hard-coded colours** in components move to tokens:
  `AddressFilterInput.tsx` (`#e8f4f6`, `#00657c`, `#1a1a2e`, `#003E4D`) → `--surface-raised`,
  `--text-link`, `--text-ink`, teal-700. `PracticeRound.tsx` / `PracticeResultsScreen.tsx`
  warm yellows stay — they are the pizza warm-up's own playful palette, not app chrome.
  `practiceData.ts` avatar backgrounds stay for the same reason.
- **Not changed:** agree/disagree tokens, banner tokens (already cool), podium and tier-frame
  tokens (their hues carry meaning), progress tokens, motion tokens, fonts (Manrope stays —
  Financials and empowered.vote use it too).

### PR 1 verification

- `npm run build`, `npm run lint`, `npm test` pass.
- A contrast check script (or test) asserts ≥ 4.5:1 for every text token on the surfaces it
  sits on, in both themes.
- Before/after screenshots at 1280 px and 390 px, light and dark, of: landing, browse, issues,
  read, ranking, ballot. Attach to the PR.

---

## PR 2 — landing page

Files: `src/components/Landing.tsx`, `src/components/RaceHub.tsx`,
`src/components/AddressFilterInput.tsx`, `src/index.css` (`.rr-step*` and new classes).

### Hero (left column)

| Element | Spec |
|---|---|
| Eyebrow | "Read & Rank" — 12 px, 700, `tracking-widest` (0.1em), uppercase, `--text-link`. Unchanged. |
| Heading | Line 1 "Read candidates blind," in `--text-heading`; line 2 "rank by what they said." in `--text-link`. 48 px → 60 px at `sm`, weight 700, `leading-tight`. Unchanged sizes. |
| Lede | "Real quotes from real candidates, with no names and no parties. Form your own view, then see who you actually agree with." — 18 px, `leading-relaxed`, `--text-secondary`, max 60ch. |
| Primary button | "Choose an election ↓" — `--action-primary` fill, `--action-primary-ink` text, 16 px / 700, `px-6 py-3`, radius 12 px (`rounded-xl`, as Financials). Hover `--action-primary-hover`. |
| Warm-up link | Under the button: "Try a warm-up with pizza opinions" (600, `--text-link`) + "30 sec" (14 px, `--text-tertiary`). Same `startPractice` action and `readrank_practice_started` event. Min target height 44 px. |

The button scrolls to the "Choose an election" section (`id="choose-election"`) and moves
focus to its heading (`tabIndex={-1}`). Smooth scroll only when reduced motion is off.
Fire a `readrank_landing_cta_clicked` analytics event.

### Steps (right column): vertical timeline

Replaces the three `.rr-step` cards. Same three steps, Aditi's copy:

1. **Pick an election** — Local and upcoming races in our Alpha communities.
2. **Read the quotes** — Judge positions on their words alone.
3. **Rank the candidates** — See who earned your trust, and where you align.

- An ordered list (`<ol>`), vertically centred in the 380 px column.
- Each step: a 32 px numbered circle, title (16 px / 700, `--text-heading`), body (14 px,
  `--text-secondary`).
- Step 1's circle is filled (`--action-primary`, white numeral). Steps 2–3 are outlined
  (`--border-medium` ring, `--text-tertiary` numeral).
- A 1 px `--border-medium` line joins the circles.
- Remove the "Start here" tag.
- On phones (< `lg`) the timeline stacks under the hero copy, as the cards do today.

### "Choose an election" section

```
Choose an election                                    [ Upcoming | Past ]
📍 Races for 100 W Kirkwood Ave, Bloomington, IN  Change
YOUR RACES · 3
[cards …]
```

- **Header row:** H2 "Choose an election" (unchanged: 24 → 30 px, 600, `--text-link`) on the
  left. On the right, the Upcoming/Past control restyled as a **segmented switch** (one pill
  container, selected segment filled `--action-primary`). The switch shows only when an
  address is known, as today. On phones it wraps under the heading.
- **Address known:** one line under the H2 — pin icon, "Races for **{address}**", and a
  **Change** text button. This replaces the address chip that `AddressFilterInput` renders today.
  - **Change** swaps the line for the address search input (focused), with a **Cancel**
    text button and a **Clear address** text button.
  - Submitting a new address applies it and returns to the line. Cancel returns to the line
    unchanged. Clear address calls `clearLocationFilter()` (same as today's chip ×).
  - Escape acts as Cancel.
- **Address not known:** the address search input shows under the H2 (same component,
  same placeholder and Google Places behaviour), with the featured default race below it,
  as today.
- **Unchanged:** closeness tiers and their labels, `RaceCard`, "Browse other races ›", the
  browse view, the empty-state copy.

### Component boundaries

- `Landing.tsx` owns the hero, the timeline, and the section heading.
- A new `AddressLine` component (in `AddressFilterInput.tsx` or its own file) renders the
  known-address line and the Change → input → Cancel/Clear state. It reuses the existing
  search logic (`handleSubmit` / `handlePlaceSelected`) rather than duplicating it.
- `RaceHub` exposes the time filter so the switch can sit in the section header row
  (lift `timeFilter` state to the store, or pass a render slot — the plan decides; no
  behaviour change).
- `RaceHub` used standalone by `PhaseContainer` (`default: return <RaceHub />`) must keep
  working.

### PR 2 verification

- Unit tests (Vitest + Testing Library):
  - Hero button scrolls to and focuses `#choose-election`.
  - Known address renders "Races for …" and Change; Change shows the input; Cancel and
    Escape restore the line; Clear address clears the filter.
  - No address renders the search input and no "Races for" line.
  - The segmented switch toggles Upcoming/Past (existing behaviour).
- Existing tests pass; `npm run build` and `npm run lint` pass.
- Screenshots at 1280 px and 390 px, light and dark, for: no address, known address,
  Change open, Past selected. Attach to the PR.

## Out of scope

- Race card restyle, date-based grouping, progress bar on cards (declined in review).
- Browse, issues, read, ranking, ballot screens — later PRs, one screen at a time.
- Moving to the ev-ui Tailwind preset (`tailwind-preset.js`) — the semantic-token approach
  is kept.

## Risks

- **Palette change touches every screen.** Mitigation: token-only change, plus the
  before/after screenshot set in PR 1.
- **Address search leaves the hero.** A first-time visitor must scroll or press the button
  to reach it. This is the accepted trade-off of Aditi's hero.
- **Agree colour.** `--action-primary` moves to `#005366`. If the Agree button uses
  `--action-primary`, it darkens slightly. The Agree/Disagree colour-role decision
  (prototype README open question 1) stays open and is not part of this work.
