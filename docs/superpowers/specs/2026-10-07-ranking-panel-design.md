# Ranking panel + topic-complete refresh — design

**Date:** 2026-10-07
**Status:** Approved in conversation, pending spec review
**Source:** Aditi's UX prototype (rr#109) — `docs/design/readrank-ux-redesign/screenshots/06-topic-complete-ranking.png`, `prototype/read.html`
**Builds on:** palette (#112), landing (#117), issues (#119), reading screen (#120) — all on `main`.

## Goal

Bring the ranking panel and the topic-complete card to Aditi's visual and copy layer while keeping
the approved **"Record" ranking interaction** unchanged (memory: ranking-surface-record-redesign,
reorder-drag-only-a11y).

## Decisions (from the prototype comparison + review)

| Topic | Decision |
|---|---|
| Interaction model | **Unchanged:** numbers-led slips, tap-to-assign popover, ties ("="), "Place the rest as agreed", Reorder toggle with drag-only keyboard-operable grip (no ▲▼), collapsed disagreed tray, slim mobile dock + sheet. The prototype's ▲▼ buttons and stacked mobile panel are **not** adopted. |
| Visual/copy | Adopt: panel heading + contextual subtitle, visible empty state, first-place emphasis, "Move to my ranking" recover wording, privacy footer, richer topic-complete card. |

## 1. Ranking panel

Files: `AgreedQuotesSidebar.tsx` (desktop header), `RankRail.tsx` (shared by the desktop sidebar,
the mobile `RankSheet` and the pizza warm-up), `RankList.tsx` (first-place class), `index.css`.

### 1a. Header (desktop sidebar only — the mobile sheet keeps its own header)

- "Your ranking" becomes `<h2 className="rank-panel-title">` — 16 px, weight 800, `--text-heading`, margin 0.
- Count chip unchanged in content ("{n} agreed", shown when n > 0); styles move from inline to a
  class (`.rank-panel-count`), tokens only.

### 1b. Subtitle (`RankRail`, both sidebar and sheet)

A `<p className="rank-panel-sub">` at the top of the rail (14 px, `--text-secondary`):

| Agreed count | Text |
|---|---|
| 0 | "Quotes you agree with land here." |
| 1 | "Agree with more quotes to compare them here." |
| ≥ 2 | not rendered — the existing toolbar hint ("Tap a number to place it in your top three." / "Drag the handles to reorder.") is the guidance |

### 1c. Empty state (`RankRail`, agreed count 0)

Replace the current `sr-only` paragraph with a visible box `.rank-empty`: 1.5 px dashed
`--border-medium`, radius 12 px, padding 1.5rem 1rem, centred; a list icon (SVG, `aria-hidden`,
`--text-tertiary`) above the text "Agree with a quote to add it here. Then put the one you trust
most on top." (14 px, `--text-secondary`). Not rendered once a quote is agreed.

### 1d. First place emphasis (`RankList`)

The slip at index 0 that is ranked (not in the "also agreed" group) gets an extra class
`rank-slip-first`: border `--action-primary` (1.5 px), background `--surface-raised`. Ties at first
place: only index 0 gets the class (the tied slip keeps its existing tie styling). No change to the
number badge or behaviour.

### 1e. Disagreed tray (`RankRail`)

Unchanged behaviour (collapsed bar → expand → recover). The recover button text becomes
"Move to my ranking" with a leading up-arrow icon (SVG `aria-hidden`). Its accessible name is
"Move to my ranking". The live-region message becomes `Moved "{stub}" to your ranking.`

### 1f. Privacy footer (`RankRail`)

At the bottom of the rail: a 1 px `--border-subtle` top rule, then a lock icon (SVG, `aria-hidden`)
+ "Names and parties stay hidden until you see your full ballot." (13 px, `--text-tertiary`).
Shown in the race (sidebar and sheet). **Hidden in the pizza warm-up**: `RankRail` gets a prop
`showPrivacyNote?: boolean` (default `true`); `EvaluationSurface` passes `showTrustFooter` through
`RankedListSidebar` and `RankSheet` to it (the warm-up passes `showTrustFooter={false}`).

## 2. Topic-complete card (`EvaluationPhase.tsx` `completeState`)

```
        ( ✓ )
    Topic complete
 [1 AGREED] [1 DISAGREED]
Move on to the next topic, or keep arranging your ranking.
 [ Next topic → ]  [ See your full ballot ]
```

- Card: `--surface-card`, 1 px `--border-subtle`, radius 16 px, padding 2rem, `--shadow-card`, centred content.
- Icon: 56 px circle, `--surface-raised` bg, `--text-link` check (SVG `aria-hidden`).
- Heading: `<h2 tabIndex={-1}>` "Topic complete" (or "All topics done" on the last topic) — 24 px, 800, `--text-heading`. When the card mounts, focus moves to this heading (`preventScroll: true`), so screen-reader and keyboard users land on it.
- Counts (current topic): chips "{agreed} AGREED" (`--surface-raised` bg, `--text-link`) and "{disagreed} DISAGREED" (`--surface-sunken` bg, `--text-secondary`), 12 px / 700 / uppercase / 0.06em, radius full. A chip with count 0 is still shown.
- Text: not last topic → "Move on to the next topic, or keep arranging your ranking."; last topic → "Reveal your ballot when you're ready." (15 px, `--text-secondary`).
- Buttons (row, wraps on narrow widths, gap 0.75rem):
  - Not last topic: "Next topic →" (primary, `ev-button-primary`) + "See your full ballot" (outlined, `ev-button-secondary`) **only when `canReveal`**. The second button's label is the existing `revealLabel` ("See your full ballot" when the race is complete, else "Reveal ballot") and it calls `revealBallot`.
  - Last topic: the reveal button as **primary** (label `revealLabel`), shown when `canReveal` (it always is once all topics are done).
- **No duplicate:** while the complete card is shown, `EvaluationSurface` does not render its separate desktop reveal CTA under the card. Mechanism: `EvaluationSurface` renders `revealCta` only when `currentQuote` is defined. (Mobile keeps the reveal in the sheet footer as today.)
- The pizza warm-up's own completion UI (`PracticeRound`) is unchanged.

## Testing

- `RankRail`: subtitle text for 0 / 1 / 2 agreed; empty box visible at 0 and gone at 1; recover button named "Move to my ranking" calls `reAgree` and announces `Moved "…" to your ranking.`; privacy footer shown by default and hidden with `showPrivacyNote={false}`.
- `RankList`: first ranked slip has `rank-slip-first`; second does not; "also agreed" slips never do.
- `AgreedQuotesSidebar`: heading role h2 "Your ranking".
- `EvaluationPhase`: after the last quote of a non-last topic — heading "Topic complete" has focus; chips show the topic's counts; "Next topic →" and (when allowed) "See your full ballot" present; no second reveal button elsewhere; last topic shows "All topics done" with the reveal as the main button.
- Existing ranking tests (tap-to-assign, ties, drag, recover, dock/sheet) pass; update any that assert the old "Move to agreed" text or old live-region copy.
- Browser check at 1280 and 1024 px, light and dark: empty panel, 1 agreed, ≥2 agreed with first-place emphasis, disagreed tray open, topic complete, last topic.

## Out of scope

- Any change to ranking interaction, ties, ranked-count, dock/sheet behaviour.
- The full-ballot screen.
