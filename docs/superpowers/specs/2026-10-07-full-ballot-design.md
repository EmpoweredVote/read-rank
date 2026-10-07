# Full ballot refresh — design

**Date:** 2026-10-07
**Status:** Approved in conversation, pending spec review
**Source:** Aditi's UX prototype (rr#109) — `docs/design/readrank-ux-redesign/prototype/ballot.html`, `screenshots/07-ballot-loading.png` (screenshot 08 was removed; re-captured from `ballot.html` during the comparison)
**Builds on:** palette (#112), landing (#117), issues (#119), reading (#120), ranking panel (#121) — all on `main`.

## Goal

Polish the results screen (`ResultsPhase`) to Aditi's prototype while keeping everything the
prototype got wrong or left out: real candidate photos and the Essentials link
(`PoliticianIdentityCard`), the three-layer quote drawer with full provenance (`QuoteDrawer` /
`QuoteBlock`), and the per-card partial reveal (the ballot shows the cards ranked so far).

## Decisions (from review)

| Topic | Decision |
|---|---|
| Loader | Aditi's look, driven by real loading state — no artificial delay beyond today's. |
| Disagreed mark | **⊘ in a neutral circle**, the same symbol as the Disagree button and the ranking panel's disagreed tray (REDESIGN_SPEC §3.4: one symbol system; no colour on disagreement). Not the prototype's coral ✕. |
| Identity | Keep photos + Essentials link; the prototype's initials avatars are not adopted. |
| Quote drawer | Keep the three-layer drawer with sources; the prototype's source-less drawer is not adopted. |
| Reveal model | Unchanged (per-card partial reveal, combined ballot grows). |

## 1. Loading step (`ResultsPhase`, new `BallotLoader` component)

Replaces the spinner + "Tallying your ballot…".

```
      ┌──────────┐   (two stacked card shapes, CSS only)
      │ ▬▬▬▬▬    │
      │ ▬▬▬      │
      └──────────┘
   Tallying your ballot
   Matching your rankings to candidates…
   ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  (progress bar)
```

- `BallotLoader` props: `{ step: 'matching' | 'revealing' }`.
- Title "Tallying your ballot" (18 px, 800, `--text-heading`); step line (14 px, `--text-secondary`):
  `matching` → "Matching your rankings to candidates…", `revealing` → "Revealing names…".
- Bar: 16rem wide, 4 px, radius full, track `--border-subtle`, fill `--action-primary`.
  `matching` → fill animates from 0 to 70 % over 1.2 s (ease-out) and holds; `revealing` → fill 100 %.
  Reduced motion: no animation (fill jumps to the step's value).
- Card illustration: two 8rem × 5.5rem rounded rectangles (`--surface-card`, 1 px `--border-medium`
  / `--action-primary` on the front one, radius 12 px), the back one rotated 4°, two bars inside
  (a `--color-ev-yellow` bar and a `--border-subtle` bar). `aria-hidden`.
- The loader container is `role="status"` with `aria-live="polite"`, so the step text is announced.
- **Timing (replaces the 600 ms floor):** while the reveal request is pending → `matching`. When it
  resolves successfully → `revealing` for 400 ms, then the ballot renders. On failure → straight to
  the existing error state (no `revealing` step). Reduced motion: `revealing` still shows for 400 ms
  (it is text, not motion).

## 2. Reveal band (`RevealBand` CSS only)

- Headline: `font-size: clamp(1.75rem, 3.6vw, 2.5rem)`, weight 800, `letter-spacing: -0.02em`, line-height 1.15.
- Eyebrow: `letter-spacing: 0.12em`, 12 px, weight 700.
- Padding 2.25rem 1.5rem; radius 16 px. Background unchanged (`--color-ev-black` light / `--surface-raised` dark) and the yellow underline under "who" unchanged.
- Replace the eyebrow's `rgba(255,255,255,0.72)` and the headline's `#fff` with tokens: add
  `--on-dark-ink: #FFFFFF` and `--on-dark-muted: rgba(255,255,255,0.72)` to `:root` and `.dark`
  (same values in both) and use them.

## 3. Alignment table (`AlignmentGrid` + CSS) and pills (`AlignmentPills`)

- **Horizontal column headers:** remove the rotated label treatment (`.alignment-col-label`
  rotation, the fixed 92 px header height). Headers are horizontal, centred, 12 px / 700 /
  uppercase / 0.06em, `--text-tertiary`, wrap to at most two lines (`max-width: 9rem`,
  `-webkit-line-clamp: 2`), with the full title in a `title` attribute. Column `min-width: 6rem`.
  Wide races keep horizontal scroll with the pinned candidate column and the edge fade.
- Header row background `--surface-sunken`; the table sits in a card (`--surface-card`, 1 px
  `--border-subtle`, radius 12 px, `overflow: hidden` on the wrap's inner border box); row
  separators 1 px `--border-subtle`; candidate cells left-aligned, 15 px, weight 600.
- **Marks (`AlignmentMark.tsx`):**
  - Rank → existing `RankNumber` (unchanged).
  - Agreed → existing check circle (unchanged; `--text-link`).
  - Disagreed → **slash-circle ⊘**: `<svg className="mark-disagreed">` with `<circle cx=12 cy=12 r=9/>` and `<path d="M5.6 5.6l12.8 12.8"/>` drawn inside a filled neutral disc: wrapper `.mark-disagreed-wrap` gets `background: var(--surface-sunken)`, radius full, the stroke colour `--text-tertiary`. sr-only label stays "Disagreed".
  - Not judged → dash (unchanged).
- Replace `.mark-disagreed { color: #a8a29e }` and `.dark .mark-disagreed { color: #8b96a5 }` with `color: var(--text-tertiary)` (one rule).
- Pills use `AlignmentMarkView`, so they get ⊘ automatically; `.pill-dis` uses `--surface-sunken` bg and `--text-secondary` text (tokens).

## 4. Candidate cards (`CandidateBallotCard` + CSS)

- **First place:** when `entry.rank === 1` (including a tie for first), `.ballot-outer` gets the
  modifier `ballot-outer--first`: 1.5 px `--action-primary` border.
- **Agreement bar:** in the strip, before "Agreed with **N of M**", a small segmented bar
  (`aria-hidden`): `M` segments (max 8; above 8 a continuous bar), each 14 px × 4 px, gap 2 px,
  radius full; the first `N` use `--action-primary`, the rest `--border-subtle`. Shown only for
  ranked entries (unranked entries keep their existing strip text). M = `totalTopics`,
  N = `entry.evidence.agreementCount`.
- Everything else unchanged: rank column + `RankNumber`, tie tag, `PoliticianIdentityCard` (photo,
  Essentials link), "See what they said" toggle and the `QuoteDrawer`, the first-place burst.

## 5. Unchanged

Compass cross-link box, bottom buttons, the sr-only reveal announcement, the "Also on the ballot" /
"Everyone you read" sections, the empty and error states, analytics.

## Testing

- `BallotLoader`: renders title + "Matching your rankings to candidates…" for `matching`, "Revealing names…" for `revealing`; container has `role="status"`.
- `ResultsPhase`: with `fetchRaceReveal` mocked as a pending promise → loader shows the matching step; after it resolves → "Revealing names…" then (advance timers 400 ms) the band headline; on rejection → the error state without the revealing step. Existing ResultsPhase tests keep passing (update any that depended on the 600 ms floor or the old spinner text "Tallying your ballot…" with an ellipsis).
- `AlignmentMark`: disagreed renders the slash-circle (`path d` starts with "M5.6 5.6") and sr-only "Disagreed".
- `CandidateBallotCard`: rank 1 → `ballot-outer--first`; rank 2 → not; agreement bar has `totalTopics` segments with `agreementCount` filled (and a continuous bar when totalTopics > 8).
- A hex guard: `src/components/AlignmentMark.tsx`, `src/components/RevealBand.tsx`, `src/components/BallotLoader.tsx` have no hex literals (extend `src/__tests__/noHardcodedChrome.test.ts`'s `CHROME_FILES`).
- Browser check: desktop 1280/1024 and phone (touch) 390, light and dark — loader, band, table with ⊘, first-place card with bar, drawer still showing sources.

## Out of scope

- The Browse screen (screenshot 2).
- Any change to reveal data, ranking or the drawer's content.
