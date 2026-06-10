# Read & Rank — UX/UI Redesign Specification

**Status:** Proposal
**Grounding:** Current codebase (`src/components/`, `src/store/useReadRankStore.ts`), ev-ui palette (`tailwind.config.js`), product mission and review findings.

---

## 0. Design Principles (derived from mission)

1. **The quote is the candidate.** During evaluation, nothing on screen may hint at identity. Typography carries the experience; the quote text is always the largest, highest-contrast element.
2. **Trust is a visible feature — after the reveal.** During evaluation the quote is fully blind: no source, no verify link, no video. Any per-quote provenance is an identity vector (an outlet, a venue, or a date can telegraph the speaker, and a verify link invites a mid-task identity lookup). Trust during evaluation is signaled generically (a verified-quote mark + the "How we source quotes" explainer); from the reveal onward, full provenance appears on every quote, on every screen, styled as a credential, not a footnote.
3. **Two workflows, one screen.** Evaluate-then-rank and rank-as-you-go are both first-class. The interface never forces a mode.
4. **The reveal is the payoff.** Everything before it builds tension; the reveal spends it.
5. **Structurally anti-partisan.** No party data exists in any component prop, state field, or API response consumed by the UI. (Audit note: verify `BlindQuote`, `RacePayload`, and candidate types in `useReadRankStore.ts` and `src/data/api.ts` carry no party field — absence at the type level is the enforcement mechanism.)
6. **ev-yellow whispers "Inform."** Yellow appears as a thin, recurring signature, never a surface.

### Palette reference (from ev-ui)

| Token | Hex | Role in Read & Rank |
|---|---|---|
| ev-black | `#1c1c1c` | Primary text, dark surfaces |
| ev-white | `#ffffff` | Default surface |
| ev-coral | `#ff5740` | Primary action (Agree), reveal celebration |
| ev-teal / ev-muted-blue | `#00657c` | Secondary action, links, focus rings |
| ev-light-blue | `#59b0c4` | Tints, progress fills |
| ev-yellow | `#fed12e` | Inform pillar accent only |

**Contrast facts that drive decisions below:**
- ev-black on ev-yellow ≈ 11.3:1 → AA/AAA. Yellow chips/badges must always carry ev-black text.
- ev-yellow on white ≈ 1.5:1 → fails 3:1 UI-component contrast. **Yellow may never be the sole indicator of anything on a light surface.** It is decorative reinforcement next to a compliant cue (text label, dark icon, position).
- ev-teal on white ≈ 6.2:1 → AA for text; use teal for all links and focus rings.
- ev-coral on white ≈ 3.4:1 → passes for large text/UI components only; pair coral buttons with white text at 18px+ semibold, or use coral fills with ev-black text.

---

## 1. Screen-by-Screen UX Flow

### 1.1 Race/Issue Hub (`RaceHub.tsx`) — "entering an arena"

**Problem today:** reads like a settings form. **Goal:** the moment of choosing a race should feel like stepping into a real contest with real stakes.

**Layout (mobile-first, single column; desktop: 2-col card grid):**

1. **Header band** — "Read & Rank" wordmark with a 3px ev-yellow underline (the pillar signature). Subhead: "Blind ranking reveals true alignment."
2. **Location context** — existing `AddressFilterInput` restyled as a quiet utility row ("Races near Minneapolis, MN · change"), not a form field dominating the page.
3. **Race cards (the arena posters).** Each race is a large tappable card:
   - **Top line:** Office + jurisdiction in display weight ("Minneapolis Mayor"), election date beneath in body weight ("General Election · November 4, 2026"). The date is the stakes signal — always show it.
   - **Candidate count chip:** "5 candidates" (anonymized — never names here).
   - **Method chip (race-type differentiation, see §9):** for RCV jurisdictions, a small ev-teal outline chip: "Ranked choice election". Non-RCV races show no chip (absence, not a downgrade label).
   - **Issue progress:** a horizontal row of issue dots; completed issues filled ev-light-blue with a check, the active/next issue dot ringed with a 2px ev-yellow halo around an ev-black dot (yellow is reinforcement; the dark dot + label carry the meaning).
   - **Primary affordance:** whole card is the tap target (min height 88px); button-styled label inside: "Enter race" / "Continue · 2 of 4 issues".
4. **Issue selection (after race tap)** — full-screen takeover, not an accordion. Issues render as a vertical stack of statement cards ("Housing", "Public Safety", …) each with quote count ("4 candidates weighed in") and a one-line neutral framing of the issue. If the user has a calibrated Compass, sort by their Compass priority and show one quiet chip at the top: "Ordered by your Compass priorities" linking to Compass. Users without Compass see default order and **no Compass mention here** (the connection is earned post-results, not pitched pre-task — see §10).
5. **Degraded state:** an issue with <2 candidates' quotes renders at the bottom, 60% opacity, non-tappable, labeled "Incomplete · more candidates needed" (see §8).

**ev-yellow here:** wordmark underline; active-issue dot halo. Nothing else.

**Accessibility:** cards are `<a>`/`<button>` elements with full text as accessible name ("Minneapolis Mayor, ranked choice election, 2 of 4 issues complete"). Issue dots have `aria-hidden` with progress conveyed by visible text ("2 of 4 issues"). All chips ≥3:1 against card surface.

---

### 1.2 Combined Evaluate + Rank — Desktop

**Layout: two-region stage, 60/40 split at ≥1024px.**

**Left region — Evaluation stage (~60%):**
- `TopicStepper` condensed to a single line above the card: issue name + "Quote 3 of 5" (also in an `aria-live="polite"` region).
- One `QuoteCard` (redesigned, §3.1) centered, max-width 640px. Card has a 3px ev-yellow left rule when it is the active card.
- Beneath the card: `ActionButtons` — Disagree (left, ev-teal outline) and Agree (right, ev-coral filled). Buttons are the primary affordance on desktop; drag remains available.
- Keyboard: `←` Disagree, `→` Agree, `U` Undo last verdict, `Tab` reaches buttons in DOM order.

**Right region — Rank rail (~40%, sticky, full height):**
- Replaces `AgreedQuotesSidebar` + `InlineRankPanel` with one component: **RankRail**.
- Header: "Your ranking" + count. No tier jargon in the header.
- Tier-framed slots (§3.4): Diamond slot, Gold slot, Silver slot rendered as labeled frames even when empty ("1st choice", "2nd choice", "3rd choice" ghost slots). Empty slots make the structure legible before anything is ranked — users understand the game from the first agree.
- Bronze section below ("Also agreed") holds overflow, unlimited.
- Iron section at the very bottom, visually severed (§3.4): collapsed by default to a single row "Disagreed (3) ▸", expandable. Disagreed quotes are reviewable and recoverable ("Move back to agreed" action on each row) — undo is a trust feature.
- Drag-to-reorder anywhere in the agreed range; auto-rebalance animates tier frames as items cross slot boundaries.
- When the last quote is evaluated, the left stage clears and a **See Results** panel takes its place ("You have read all 5 quotes.  Adjust your ranking, then reveal who said what."), keeping the rank rail in place rather than navigating away — the final-check moment happens with the ranking still on screen.

**Why a rail and not a panel-toggle:** the two tasks compete for attention by design; the resolution is *peripheral persistence*. The rail is always visible but visually quieter than the stage (smaller type, lower contrast surface), so evaluation stays primary while ranking stays one glance away.

---

### 1.3 Combined Evaluate + Rank — Mobile (the hard problem)

**Pattern: card stage + persistent Rank Dock (collapsible bottom sheet).**

**Default state (evaluating):**
- **Top bar (~48px):** issue name, "3 of 5", overflow menu (How we source quotes, Restart issue).
- **Card stage (~60–65% viewport):** the active QuoteCard, swipeable horizontally. `SwipeBackground` repurposed as edge glows: left edge tints teal with a "Disagree" label as you drag left, right edge tints coral with "Agree" — labels, not just color.
- **Action row:** Disagree / Agree buttons, 56px tall, full-width split. These are not a fallback; they are co-equal affordances (many users never swipe).
- **Rank Dock (~72px, pinned to bottom):** a collapsed strip showing the live state of the ranking:
  - Three mini-slots for Diamond/Gold/Silver rendered as small framed chips with rank numerals (1, 2, 3) and a truncated 3–4 word quote stub, plus a "+2" Bronze counter and a muted "⊘ 3" Iron counter.
  - A drag handle + chevron centered above the strip.
  - When a quote is agreed, it animates from the card stage into the dock (shrink-and-file motion) and the dock slot it landed in pulses once. New agrees enter at the **bottom of the agreed order** — never displacing the user's existing top three without consent.

**Expanded state (ranking):**
- Tap the dock or drag its handle up → bottom sheet expands to ~88% height over a scrim. The card stage pauses underneath (dimmed, inert).
- Full RankRail content (same component as desktop, narrower): tier-framed list, drag-to-reorder, per-row ▲▼ move buttons (44px targets) as the non-drag alternative, Iron section collapsed at bottom.
- Dismiss: drag handle down, tap scrim, or "Done" button (top right of sheet). Closing returns focus to the card stage.

**Gesture conflict resolution (explicit rules):**
1. **Axis ownership.** The quote card owns *horizontal* drag only (axis-locked at gesture start; framer-motion `drag="x"` instead of free drag — change from current `QuoteCard.tsx` which uses unconstrained drag). The dock/sheet owns *vertical* drag, initiated only from the handle region. No gesture is ambiguous because no surface listens on both axes.
2. **Reorder vs scroll inside the sheet:** rows lift on **long-press (250ms)** with haptic tick; plain vertical pan scrolls the list. The ▲▼ buttons bypass the distinction entirely.
3. **No system-edge conflicts:** the sheet never requires edge swipes; the card's horizontal swipe threshold (currently 150px in `QuoteCard.tsx`) stays well inside browser back-gesture zones; add `touch-action: pan-y` on the stage container so vertical scroll is never hijacked.
4. **While the sheet is open, card gestures are disabled** (inert background), and vice-versa: only one gesture context is live at any moment.

**Why this beats alternatives considered:**
- *Tabs (Evaluate | Rank):* breaks the "both at once" promise; rank state becomes invisible while evaluating.
- *Split screen:* on a 380px-wide viewport, both halves become unusable; quote text (the hero) cannot shrink.
- *Rank overlay after every agree:* punishes the power-through workflow with interruptions.
- The dock keeps rank state *ambiently visible* (the collapsed strip is a live scoreboard) while giving each task the full screen when it has focus.

**Completion:** when the final quote is judged, the dock auto-expands to the full sheet with a header change: "All quotes read.  Happy with your order?" and a pinned **See Results** button (coral, full-width, 56px). This is the deliberate beat before the reveal — see §6.4.

---

### 1.4 Reveal (`ResultsPhase.tsx`) — the emotional climax

**Problem today:** lands flat — a page swap to a list. **Redesign: a staged, user-paced unmasking.**

**Sequence:**
1. **Threshold moment (1–2s, skippable):** dark ev-black interstitial: "You ranked 5 positions on Housing.  Now see who you agreed with." A single ev-yellow underline animates beneath "who". (Reduced motion: static screen, same copy, Continue button.)
2. **The board:** the user's ranked list renders exactly as it looked in the rank rail — same tier frames, same order, quotes still anonymous. Familiarity confirms "this is *your* ranking."
3. **User-paced unmasking:** each card has a "Reveal" affordance; tapping flips the card (3D flip, 400ms) to show **name + office only** ("Maya Wiley · New York City Mayor") with a small photo, the quote retained beneath, and the full SourceLine appearing for the first time — citation, verify link, and the video play row when a clip exists.  The reveal is where verification begins: now that identity is known, the user can check the receipt. A "Reveal all" button serves impatient users. Reveal order is user-chosen — letting people start with their Diamond pick is the dopamine moment. (Reduced motion: crossfade, 150ms, or instant on tap.)
4. **Insight strip (after all revealed):** one synthesized sentence, evidence-toned: "Your top three choices came from three different candidates." or "All three of your top picks came from one candidate: Maya Wiley." This is the alignment payoff in words.
5. **RCV education beat (the only place the mechanic is named):** a quiet panel: "What you just did mirrors ranked choice voting.  You ordered preferences instead of picking one winner." For RCV races, it continues: "Minneapolis uses exactly this method.  Your ballot in November will look like this." For non-RCV races: "California decides this race with a single choice.  Here is how your ranking would translate." (See §9.)
6. **Next actions:** Continue to next issue (primary) · candidate cross-links (§10) · final summary if last issue.

**During the flip animation, content is never inaccessible:** the back face mounts with the candidate name in the accessible tree immediately; the flip is purely visual. Each reveal fires an `aria-live="polite"` announcement: "First choice revealed: Maya Wiley, New York City Mayor."

**ev-yellow here:** the animated underline in the threshold moment; a 3px top rule on the insight strip. Candidate photos get **no** colored treatment (no halos that could read as scoring).

---

### 1.5 Candidate Detail (`CandidateAlignmentPage.tsx`)

Currently a 26-line stub — this page does the trust heavy-lifting post-reveal.

**Layout:**
1. **Identity header:** photo, name, office sought. Nothing else — no slogans, no party (structurally absent), no endorsements.
2. **Your alignment:** "You ranked this candidate's quotes:" followed by each quote with its tier frame, the issue it belonged to, and full provenance block (§4): source name, date, link, video if available. If a quote came from the candidate's own Empowered profile, a labeled chip: "From the candidate's Empowered profile" (ev-teal outline chip — prominent, as required).
3. **Research deeper:** Essentials cross-link as a full-width card (§10). Omitted entirely if no Essentials profile exists (§8).
4. **Back to results** persistent at top.

---

### 1.6 Final Summary (race complete)

A new screen after the last issue's reveal:

1. **Headline:** "Minneapolis Mayor · your alignment across 4 issues."
2. **Alignment grid:** candidates as rows, issues as columns, each cell showing the tier the user gave that candidate's quote on that issue (tier icon + label, not color alone). This is the "true alignment" artifact — the screenshot-worthy moment. Include a "Share image" export that contains quotes + tiers but is built from the same anti-partisan template.
3. **Compass insight card (§10):** "Based on what you ranked, housing appears to matter most to you.  See how candidates compare across every race." → Compass.
4. **Essentials links** per candidate row.
5. **Another race** → back to Hub with this race marked complete.

---

## 2. The Mobile Evaluate+Rank Solution (summary of §1.3)

**Pattern name: Rank Dock.** A persistent 72px collapsed bottom sheet that is simultaneously (a) a live, glanceable scoreboard of the user's current Diamond/Gold/Silver + Bronze/Iron counts, and (b) the entry point to the full ranking surface. Evaluation owns the screen by default; ranking is always one tap away and never more than 72px out of sight. Gesture safety comes from axis ownership (card = horizontal only, dock = vertical from handle only), long-press lift for reorder, and strict one-context-at-a-time (open sheet inerts the stage). Both workflows are supported with zero mode switches: power-through users ignore the dock until the end (it auto-expands after the last quote); rank-as-you-go users tap the dock between quotes.

---

## 3. Component Redesigns

### 3.1 QuoteCard (evaluation — deliberately blind)

Current state (`QuoteCard.tsx:102-137`): quote number + quote text only.

**Design decision: the evaluation card carries no source, no verify link, and no video.**  Per-quote provenance is an identity vector — an outlet name, a debate venue, or a date can telegraph the speaker, and a verify link is a one-tap invitation to look up the answer mid-task.  Blindness is structural: the data shape sent to the evaluation screen should not even include the source fields (enforce at the API/store boundary, same pattern as the no-party rule in §0).

**Redesigned anatomy (top to bottom):**

```
┌─────────────────────────────────────┐
│▌ QUOTE 3 OF 5          [issue chip] │  ▌= 3px ev-yellow left rule (active card only)
│                                     │
│  "Full quote text, never truncated, │  18–20px, 1.6 line-height, ev-black
│   set as the typographic hero..."   │
│                                     │
│  ───────────────────────────        │  hairline divider
│  ✓ Verified quote · source at the   │  blind-trust footer, 13px, muted —
│    reveal                        ⓘ  │  ⓘ opens "How we source quotes"
└─────────────────────────────────────┘
│        [Disagree]    [Agree]        │  (outside card on mobile)
```

- **Full quote, always.** Card height is content-driven; long quotes scroll *within the card* past ~70vh with a fade affordance rather than truncating.
- **Blind-trust footer:** a single muted line — "Verified quote.  Source shown at the reveal." — with the ⓘ explainer trigger beside it.  This converts the *absence* of a citation from a credibility hole into a stated rule of the game: the quote is real, the receipt comes when you finish.  The footer sits in a `data-no-drag` zone so tapping ⓘ never triggers a swipe.
- **No identity vectors:** no avatars, no source, no video, no voice, no candidate-count hints in styling.
- Drag becomes `drag="x"` (axis-locked), keeping `touch-action: pan-y` for scroll.

Full provenance — SourceLine, verify link, video play row — debuts on the **reveal card** (§3.5) and persists on candidate detail and the final summary.

### 3.2 RankRail (replaces AgreedQuotesSidebar + InlineRankPanel + RankList)

One component, three render contexts (desktop rail, mobile sheet, mobile dock-collapsed). Rows: rank numeral, tier frame, quote stub (2 lines max with full text on expand), grip icon, ▲▼ buttons. Ghost slots for unfilled 1st/2nd/3rd. Auto-rebalance per the cap rule (1/1/1/∞). `aria-live` announcements on every tier change: "Moved to 2nd choice, Gold."

### 3.3 ActionButtons

- 56px tall, full-width pair on mobile (44px+ target met with margin).
- Disagree: ev-teal 2px outline, teal text, white fill. Agree: ev-coral fill, white text, 18px semibold (meets large-text contrast at 3.4:1; add `#e63e27` pressed state which passes 4.5:1 for belt-and-braces).
- Icons + labels, never icon-only. Iconography: ✓ for agree, ✕ for disagree is wrong (✕ reads "dismiss/error"); use **thumbs metaphor-free** verbs: "Agree" with a check, "Disagree" with a slash-circle ⊘ — consistent with Iron's icon (§3.4) so the symbol system teaches itself.
- Press feedback mirrors the swipe edge-glow (button flash + card exits in that direction).

### 3.4 Tier Frames (colorblind-safe, Iron vs Bronze legible at a glance)

Color is the *third* channel, after icon and label. Every tier = icon + text label + frame treatment + (last) hue.

| Tier | Label shown | Icon | Frame treatment | Hue (decorative) |
|---|---|---|---|---|
| Diamond | "1st choice" | ◆ faceted gem | Double-line border, subtle facet pattern in header strip | Ice blue tint `#eaf6fa` |
| Gold | "2nd choice" | Medal with numeral 2 | Solid 2px border | Warm tint `#faf3dd` |
| Silver | "3rd choice" | Medal with numeral 3 | Solid 1.5px border | Cool gray tint `#f1f4f6` |
| Bronze | "Agreed" | Filled circle-check | 1px border, filled surface | Warm gray `#f5efe9` |
| Iron | "Disagreed" | ⊘ slash-circle | **Dashed 1px border, no fill, 45° hatch texture strip on left edge, 75% text opacity** | Neutral `#fafafa` |

**Iron vs Bronze is communicated by four redundant cues:**
1. **Spatial severance:** Iron lives below a full-width labeled divider ("You disagreed with everything below this line") with extra whitespace — it is not the next rung, it is a different shelf.
2. **Outline vs fill:** all agreed tiers are *filled, solid-bordered* (refined metal); Iron is *hollow and dashed* (raw ore — unrefined, set aside).
3. **Icon system:** agreed tiers use positive icons (gem, medals, check); Iron uses ⊘, the same symbol as the Disagree button — the user has already learned it.
4. **Label:** the word "Disagreed" appears on the section and on each row's tooltip/aria-label.

All tints are decorative; tier identity survives grayscale, which is the test every frame must pass. Tier numerals/icons render at ≥4.5:1 against their tint.

### 3.5 Reveal cards

Front face = exact rank-rail row (continuity). Back face = name + office + small round photo (48px) + quote + **full SourceLine (its first appearance: citation, verify link, video play row when available)** + tier frame retained + "View candidate" link. Photos get neutral gray ring only.  This is where the video slot lives: a 44px play row beneath the quote, opening the clip in a modal; text-only quotes show the citation alone, clean, not apologetic (§8).

### 3.6 Issue hub cards — see §1.1.

### 3.7 Post-completion cross-link panels — see §10.

---

## 4. Trust & Transparency Design System

**Two-stage trust model.**  Before the reveal, trust is *generic*: the blind-trust footer on every evaluation card ("Verified quote.  Source shown at the reveal.") plus the ⓘ explainer.  No per-quote provenance appears anywhere pre-reveal — not on cards, not on rank rows, not in the dock — because provenance identifies speakers.  From the reveal onward, trust is *specific*: every quote carries its full citation everywhere it appears.

One reusable primitive: **`SourceLine`** — used identically on reveal cards, the final summary grid (compact variant), and candidate detail (expanded variant).  Never rendered pre-reveal.

- **Anatomy:** `[▶ if video] Source name · Month Year [↗]`. 14px Manrope, ev-teal link color (6.2:1), underline on hover/focus.
- **Compact variant** (summary grid cells, post-reveal lists): source name only, full line in tooltip/expanded row.
- **Expanded variant** (candidate detail): adds source tier badge — "Debate video", "Official transcript", "Candidate statement", "Verified news" — matching the four-tier source-quality hierarchy, plus "From the candidate's Empowered profile" chip when applicable, plus retrieval date.
- **"How we source quotes":** a single ⓘ icon button (44px target) — in the evaluation top bar, the reveal header, and the hub footer. Opens a bottom sheet/modal, ~120 words, four-tier hierarchy explained in plain language, link to methodology page. Same component everywhere; users learn it once.
- **Tone rule:** attribution is set in confident UI type, never italic-gray-small "disclaimer" styling. It sits *inside* the card frame as part of the content, not below it as legal fine print.
- **Community verification (future):** reserve a 20px slot left of the source name in the expanded variant; ships empty (no placeholder graphic).

---

## 5. ev-yellow Accent Guide (Inform pillar signature)

**Rule: yellow never carries meaning alone; it reinforces a cue that is already AA-compliant.** ev-black on ev-yellow (11.3:1) is the only approved text-on-yellow pairing. Yellow elements on white are decorative and must sit adjacent to a dark element.

Approved placements (complete list — anything else needs a design review):

| # | Placement | Spec |
|---|---|---|
| 1 | Wordmark underline ("Read & Rank") | 3px rule, full wordmark width, all screens' headers |
| 2 | Active quote card left rule | 3px × full card height, only the top/active card |
| 3 | Hub: active issue dot halo | 2px ring around ev-black 8px dot |
| 4 | TopicStepper current-step indicator | 3px underline beneath current issue label (label itself ev-black) |
| 5 | Reveal threshold underline animation | 3px animated rule (static when reduced motion) |
| 6 | Insight strip top rule (reveal + summary) | 3px |
| 7 | "Inform" pillar chip (cross-link panels to Essentials/Compass) | ev-yellow fill, ev-black text, 12px semibold — the one place yellow is a surface |
| 8 | Source link hover/focus underline thickening (post-reveal screens only) | teal link gains 2px yellow underline on hover only |

**Prohibited:** yellow text on any light surface; yellow as tier color (would collide with Gold semantics); yellow on the Agree/Disagree pair (would read as warning); yellow fills larger than a chip; yellow in the Iron section (no decoration on disagreement).

Sizes are deliberately thin (2–3px) — the signature should be subliminal across Inform features, and a 3px decorative rule is exempt from UI-component contrast requirements because the adjacent dark text carries the information.

---

## 6. Micro-interactions & Animation (every entry has a reduced-motion alternative)

### 6.1 Swipe feedback
- Card follows finger on x-axis, rotation ±12° (keep current), edge glow + verb label fades in proportionally ("Agree" right/coral, "Disagree" left/teal) — label, not color alone.
- Past threshold: a soft haptic tick + label scales to 110% — "armed" state, clearly distinct from "dragging."
- **Reduced motion:** card does not translate with the gesture preview from buttons; on commit, instant swap to next card with a 150ms opacity crossfade; edge labels appear without animation.

### 6.2 Agree → dock filing (mobile)
- Card shrinks to a stub and arcs into its dock position (450ms, single ease-out curve); the receiving slot pulses once (scale 1 → 1.06 → 1).
- **Reduced motion:** card disappears; dock counter increments with a 150ms fade; an `aria-live` message covers the information ("Added to your agreed list, position 4").

### 6.3 Tier rebalance (including Bronze→Iron boundary)
- During drag, ghost slot previews where the item will land; on drop, displaced rows slide (200ms) and any row crossing a tier boundary morphs its frame (border style/icon crossfade, 250ms).
- A row moving **into Iron** (user drags a quote below the divider to change their verdict, or taps "Move to disagreed") plays a distinct transition: fill drains to hollow + border dashes in — visibly "unrefining." Crossing back refills.
- **Reduced motion:** frames swap instantly; the live region announces every change ("Moved to Disagreed").

### 6.4 Phase transition (evaluate+rank → reveal)
- Not a route swap: the rank sheet's "See Results" press dims the UI, the ranked list *persists* and re-lights on the reveal board (shared-element continuity), then the threshold interstitial plays. The user's artifact never disappears; it gets unmasked.
- **Reduced motion:** interstitial as a static screen with a Continue button; list renders identically on both screens (continuity preserved by layout, not motion).

### 6.5 Identity reveal flip
- 400ms 3D flip per card, user-triggered; "Reveal all" staggers flips 120ms apart (total <1.5s for 6 candidates). Nothing flashes; no flash >3/sec anywhere in the app.
- **Reduced motion:** 150ms crossfade per card, or instant.

All motion gated on `prefers-reduced-motion` via a single `useReducedMotion()` hook (framer-motion ships one) — not per-component opt-in.

---

## 7. Accessibility Specification (WCAG 2.1 AA)

### 7.1 Keyboard navigation map

| Context | Keys |
|---|---|
| Evaluation stage | `←` Disagree · `→` Agree · `U` Undo last · `Tab` through: card (focusable, reads quote), ⓘ explainer trigger, Disagree, Agree, dock/rail |
| Rank rail/sheet | `Tab`/`↑↓` move selection · `Space/Enter` lift row (grab) · `↑↓` while grabbed moves it · `Space/Enter` drop · `Esc` cancel drag · per-row ▲▼ buttons as pointer-free path |
| Mobile sheet | `Esc` or Done closes; focus trapped while open; focus returns to the stage card on close |
| Reveal | `Tab` between cards · `Enter` reveals focused card · "Reveal all" reachable first |
| Global | Skip link to main content; ⓘ explainer opens as proper `dialog` with focus trap |

Visible focus: 2px ev-teal ring + 2px white offset on all interactive elements (visible on every surface including yellow chips and dark interstitial — on ev-black surfaces the ring switches to ev-light-blue).

### 7.2 ARIA strategy
- QuoteCard: `role="group"`, `aria-roledescription="quote card"`, `aria-label="Quote 3 of 5 on Housing"`; quote text is plain DOM text (not aria-label) so it reflows and zooms.
- Rank rows (pre-reveal): `aria-label="2nd choice, Gold: [quote stub]"` — no source in the accessible name, for the same blindness reason it is absent visually. Post-reveal rows add candidate and source: `aria-label="2nd choice, Gold: Maya Wiley, New York City Mayor. Source: KQED forum."` Reorder via `aria-grabbed` pattern + live region announcements for every move and tier change.
- Progress: single `aria-live="polite"` region for "Quote N of M", verdict confirmations, tier changes, reveal announcements — one region, queued messages, to avoid screen-reader spam.
- Reveal: candidate name exists in the accessible tree the moment reveal is triggered, independent of animation state.

### 7.3 Contrast approach for tiers
Identity = icon + label first (both ≥4.5:1 ev-black on tint); hue is supplementary and all five frames are distinguishable in grayscale (double-line / solid / thin / filled / dashed-hatched). Verified against deuteranopia/protanopia/tritanopia simulation as a release gate.

### 7.4 Touch & zoom
All targets ≥44×44px (buttons 56px; ▲▼ 44px; source links padded to 44px hit area). `viewport` meta keeps `user-scalable=yes`. Layout tested at 200% zoom and 320px width: rank rail stacks below stage on desktop-at-200%; no text in images anywhere (tier icons are SVG with text labels beside them). Body text ≥16px.

---

## 8. Degraded States

| Condition | Treatment |
|---|---|
| **Topic has 1 candidate with a quote** | Topic hidden from issue list by default.  If shown (config), renders non-interactive at list bottom: muted card, "Incomplete · more candidates needed", no tap affordance, excluded from progress counts. |
| **Near-identical quotes (low differentiation)** | A quiet slate chip on the *second* quote's card: "Similar to a quote you already read", with a "Skip this quote" text button beside the action row.  Skipped quotes go to neither Bronze nor Iron; they are excluded from ranking and listed under "Skipped" on the reveal board (unranked, still attributed).  Never auto-skip — the user decides. |
| **No video clip** | On reveal cards and candidate detail, SourceLine renders text citation + verify link only.  No empty play button, no "video unavailable" apology — absence of the row *is* the state.  (Evaluation cards never show video regardless; see §3.1.) |
| **No Essentials profile** | Cross-link card omitted entirely from reveal and candidate detail.  No "profile coming soon" teaser (a dead-end teaser erodes trust). |
| **No Compass calibration** | Hub shows default issue order, zero Compass mentions pre-task; post-summary Compass card uses the invitation copy (§10) instead of the "reading your mind" copy. |

---

## 9. Race Type Differentiation (RCV vs non-RCV)

**Recommendation: the core experience is identical; the distinction lives in exactly two places — a hub chip and the post-reveal education beat.** Forking the ranking UI by race type would undermine the product's pedagogical claim that preference ordering is valuable everywhere.

1. **Hub (pre-task):** RCV races carry the "Ranked choice election" outline chip (§1.1). Non-RCV races carry no chip. This is the only pre-reveal difference — it sets accurate expectations without lecturing.
2. **Evaluation + ranking:** byte-identical between race types. The tier system is the lesson; it does not change.
3. **Post-reveal education beat (§1.4 step 5):**
   - **RCV race (Minneapolis):** "What you just did mirrors ranked choice voting.  Minneapolis elects its mayor exactly this way.  Your real ballot in November will ask for the same ordered preferences you just made." Optional expandable: a 1-screen visual of an actual Minneapolis ballot layout.
   - **Non-RCV race (California Governor):** "What you just did mirrors ranked choice voting.  California decides this race with a single choice instead.  On a traditional ballot, only your Diamond pick would count.  Here is what your ballot would look like under each method." — followed by a small two-column comparison (your RCV ballot vs. your single-choice ballot). This is the strongest persuasion moment the product has: the user *feels* the information their ranking contains that a single vote discards. Tone stays evidence-based: present the comparison, never editorialize ("RCV is better") — the contrast speaks.

---

## 10. Cross-link Design (Essentials & Compass)

**Timing principle: cross-links appear only after value has been delivered (post-reveal), never during the task.** Pre-task, the only Compass surface is the passive "Ordered by your Compass priorities" chip for already-calibrated users.

### Essentials (per-candidate, on reveal cards + candidate detail + summary rows)
- **Placement:** a compact row inside the revealed card footer and a full-width card on candidate detail.
- **Anatomy:** small "Inform" yellow chip (§5.7) + "Empowered Essentials" label + one line of concrete value + chevron.
- **Copy:** "See Maya Wiley's full record.  Funding, votes, and committees in one place." CTA: "Open Essentials profile".
- **Anonymous users:** identical — Essentials is public.  No login wall framing.
- **Authenticated users:** identical copy; may add "You've viewed this profile before" as a subtle visited state.

### Compass (one card, final summary only — not after every issue)
- **Placement:** §1.6 step 3, after the alignment grid. One card per race completion, never repeated as a banner.
- **Copy, calibrated user (insight framing):** "Your Compass marks housing as a top priority, and your rankings here agree.  See how every candidate in your races compares on it." CTA: "Open your Compass".
- **Copy, uncalibrated user (invitation framing, derived from observed behavior):** "Based on what you ranked, housing policy appears to matter most to you.  Compass lets you map where you stand on every issue, and your next Read & Rank will start with what you care about." CTA: "Calibrate your Compass". Secondary text button: "Maybe later" (dismisses for this race, no nagging, no badge).
- **Why this works:** the copy leads with something the product *learned about the user* (insight), and the feature is framed as making *this* tool better ("your next Read & Rank will start with what you care about") rather than as another product to adopt. No modal, no interstitial, dismissible, never blocks the Continue path.
- **Anonymous users:** same card; Compass calibration works anonymously with local storage, with a one-line note "Saved on this device.  Create a free account to keep it." (account is the optional layer, not the gate).

---

## 11. The Five Highest-Impact Changes (ship these first)

1. **The two-stage trust system (§3.1, §3.5, §4).** The codebase currently renders zero provenance anywhere — and the review's core finding is that this is a trust product. Ship the pair together: the blind-trust footer on evaluation cards ("Verified quote.  Source shown at the reveal.") plus the full `SourceLine` (citation, verify link, video row) debuting on reveal cards and candidate detail, with the "How we source quotes" explainer reachable from both phases. Cheapest change with the largest credibility return, and the SourceLine primitive reuses on every post-reveal screen.
2. **The mobile Rank Dock (§1.3).** The combined evaluate+rank screen is the product's core loop and its hardest layout problem; the persistent dock + axis-owned gestures makes both workflows real on the device most users hold. Includes the 56px ActionButtons row (which is also the accessibility keystone — swipe stops being the only affordance).
3. **Tier frames with the Iron/Bronze split (§3.4).** The tier system is the RCV pedagogy. Ghost slots for 1st/2nd/3rd teach the structure before the first agree; the hollow-dashed-severed Iron treatment makes "disagreed ≠ low preference" legible at a glance and in grayscale.
4. **The staged reveal (§1.4).** User-paced unmasking + shared-element continuity + the insight sentence turns the flat list into the payoff the whole flow is building toward — and it is where the RCV lesson and the non-RCV ballot comparison land.
5. **Accessibility baseline (§7):** axis-locked drag with full keyboard reorder path, one live region, focus management on the sheet, reduced-motion gating via a single hook. Done now, it is a pattern every later component inherits; retrofitted, it is a quarter of rework.

(Deliberately not in the top five: hub-as-arena and cross-link panels — high value, but they depend on none of the above and risk less by shipping second.)

---

## Appendix A — Copy style checklist (user-facing strings)

- No em dashes.  Use periods or commas.
- Two spaces after periods.
- No party names, labels, colors, or framing — enforced at the data-type level, not the style guide level.
- Invitational verbs ("See", "Open", "Compare"), never pressure ("Don't miss", "Unlock").
- Transparency copy is confident: "Verify this source", not "Source may be subject to…".
