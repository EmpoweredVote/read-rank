# Read & Rank — Ties & Truncation in the Ranking Step (design)

Status: **design / approved-in-brainstorm** (next: implementation plan)
Date: 2026-07-24
Companion: on-the-record `docs/superpowers/specs/2026-07-23-readrank-comparability-model.md` §12 (the "crowd problem" that motivated this).

## Problem

Read & Rank's phase 3 forces a **strict total order** over every quote the user agreed with (swiped right) in phase 1. That breaks down when a question/field has many candidates who **say similar things** — surfaced starkly by the Kansas U.S. Senate Dem primary quality pass: **8 candidates live on one healthcare question**, most converging on "restore/expand the ACA and Medicaid." Forcing a voter to order six near-identical quotes 1-2-3-4-5-6 produces **fake precision** — an ordering the voter doesn't actually feel — which is noise, not signal, and it's exactly the decision-fatigue that costs the return visit (Read & Rank's primary purpose is to *inform the vote*; a bad/forced ranking undermines that).

The core issue is **convergence**, not raw count: a 2-candidate race with two genuinely different views is fine; a large field that mostly agrees is not. The number that should matter is the number of *distinct positions the voter perceives*, not the number of cards.

## What the current algorithm already does (important)

- A quote carries `supported: boolean` (phase-1 swipe) and `rank: number | null` (global 1-based rank across the race; `null` for disagreed). Per-topic ranks are re-derived from the global order (`buildPerTopicRankMap`).
- The alignment marks **already truncate**: per topic, only the top **1/2/3** produce distinct "pick" marks; a supported quote ranked 4th-or-lower — *or supported-but-unranked* — collapses to a plain "agreed" check.
- Therefore the precise ordering of the tail (4th onward) barely affects the result today. **The pain is UX friction, not signal.** Truncation is, in effect, already the model — the UI just doesn't let the user stop.

## Goal / non-goals

**Goal:** let the voter express *genuine equivalence and genuine indifference* instead of being forced into a fake total order, so crowded/convergent fields become usable — while keeping every quote **verbatim and fully visible** and keeping the primary purpose (inform the vote) intact.

**Non-goals:** replacing the swipe→collect→rank→reveal flow; a curator-side merge/clustering of quotes; changing what counts as rankable at publish time (that stays the comparability model's job); solving RCV education as a primary aim (it's a welcome side-effect only).

## Decision

Add two capabilities to phase 3, and let the **voter** do the clustering rather than the curator:

1. **Ties** — a card may share a rank position with adjacent card(s). Near-identical agreed quotes co-rank instead of being force-ordered.
2. **Truncation** — the voter ranks as many as they have real preferences for and places the rest as "agreed, unranked" in one action; those stay `supported` with `rank = null` (already an "agreed" check downstream).

Clustering thus happens in the voter's hands (co-ranking equivalents), so there is **no curator merge, no privileged representative quote, no synthesized label** — every real quote is shown, in full, separately. This mirrors real RCV's *truncation* and *helps* with RCV's genuinely hard part (ordering options you feel equally about) instead of forcing it.

## Interaction design (phase 3)

- Cards remain a **vertical, drag-ordered stack**; each shows its **full quote at all times** (no collapsing, no side-by-side, no hidden text).
- **Ties:** a card can be dropped into the *same rank slot* as the card above/below it. Tied cards stay adjacent and full-height; they share **one rank number** (e.g., both show "2") and are joined by a **connecting accent on the left edge** (a bracket/bar spanning the tied group) so it reads as "same position" without merging.
- **Truncation:** the voter can stop ranking at any point and "place the rest as agreed" — one action drops all still-unranked supported quotes into an unranked "also agree" state (`rank = null`, `supported = true`). They remain visible below the ranked group.
- Ranking beyond the top few is optional; the UI should make "these are my top picks, the rest I just agree with" the natural path, consistent with what the algorithm already rewards.

## Data model & algorithm

- **`rank` may repeat** across quotes (ties). It stays a global 1-based value; a tie is two quotes sharing the same integer.
- **Per-topic rank derivation** (`buildPerTopicRankMap`) assigns tied quotes the *same* per-topic number (stable), rather than forcing a strict 1,2,3 sequence.
- **Top-picks / ≤3 logic** handles a tie group: e.g., three quotes tied at #1 are all "rank 1" picks; `countTopPicks` counts each. Define the cutoff behavior when a tie group straddles the top-3 boundary (see Open Questions).
- **Truncation** needs no algorithm change: supported + `rank = null` already renders as "agreed."
- Reveal/alignment API (`RevealQuote.rank`, `BallotEntry`) already carries nullable ranks; ties only relax the uniqueness assumption in the derivation utilities and the drag UI's rank assignment.

## Rejected alternatives (and why)

1. **Curator-side merge / collapse near-identical cards into one.** Reduces cards up front, but it's an *editorial thumb on the scale* — someone decides which quotes are "the same" and (if a single card) which candidate's phrasing represents the group. Conflicts with the faithfulness line the project holds (verbatim, no curator summaries). The voter, not the curator, should judge equivalence. Rejected.
2. **Represent each cluster with one synthesized/neutral position statement.** Cleaner cards, but the ranked text becomes curator-authored rather than a candidate's own words — breaks the verbatim premise outright. Rejected.
3. **Replace the strict list with a tier system (strongly agree / agree / lean).** Handles convergence, but it's a larger rebuild of an interaction the team isn't sold on, and it discards the ordinal ranking that RCV education benefits from. Ties + truncation get most of the benefit as an *extension* of today's list rather than a replacement. Rejected (for now).
4. **Cap candidates per question (top-N by viability).** Directly shrinks the field, but excluding candidates from the ranking re-creates the very two-party/front-runner marginalization the comparability model fights to avoid, and it needs a contestable "viability" judgment. Rejected — inclusion is protected elsewhere in the model, and ties/truncation make a large field usable without dropping anyone.

## Open questions (for the plan)

- **Tie group crossing the top-3 boundary:** if four quotes tie at #1, are all four "rank 1" picks, and does that change `countTopPicks` weighting or the alignment-grid mark set? Pick a rule and make it explicit.
- **Truncation UX affordance:** exact control for "place the rest as agreed" (button, drop zone, divider you drag) — a small mockup call during planning.
- **Guest reveal payload:** confirm the reveal POST tolerates repeated `rank` values without server-side assumptions of uniqueness.

## Relation to the comparability model

This addresses one item on the comparability model's post-race to-do list (the "crowd problem"). It is complementary to, not a substitute for, the other open items there (a compass-topic escape hatch for questions like Israel aid; worktree isolation for background agents). Publish-time rankability (`≥2` candidates on a question) is unchanged; this is purely how the citizen *interacts* with whatever got published.
