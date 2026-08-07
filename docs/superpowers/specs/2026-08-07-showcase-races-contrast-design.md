# Showcase Races — Contrast as the Shipping Bar

**Date:** 2026-08-07
**Status:** Design — approved in conversation, not yet planned or implemented
**Owner repos:** read-rank (this spec), on-the-record (`audit-quotes` skill), essentials
(`QUOTE-CURATION-PRINCIPLES.md`), ev-accounts DB (override flag, pipeline row, quote provenance)

## Goal

Make **CA Governor** and **LA Mayor** exemplars of what Read & Rank does, and produce reusable
machinery so the bar transfers to the other 605 races in the queue.

The bar, chosen deliberately over breadth or source-depth: **every shipped topic is a real
choice.** A citizen ranking two quotes blind should be choosing between genuinely different
positions — not between two ways of saying the same thing, and not between a fluent speaker and
a clumsy one.

Fewer topics that are real choices beats more topics that aren't.

## The races

| | CA Governor | LA Mayor |
|---|---|---|
| Race id | `bc936a36-287c-4ffd-abd8-5e4fd798bae5` | `9e888818-c50b-4c61-a106-a0839ff2479d` |
| Election | 2026-11-03 general | 2026-11-03 general (runoff) |
| Candidates | Steve Hilton, Xavier Becerra | Karen Bass, Nithya Raman |
| Rankable topics today | **7** | **1** |
| Topics with drafts on both sides | ~16 | ~11 |

Both are two-candidate races, so contrast is a clean pairwise judgment rather than an n-way one.
That is lucky, and it is part of why they are good showcase choices.

CA Governor's 7 live topics: `economic-development`, `fossil-fuels`, `healthcare`,
`homelessness`, `housing`, `taxes`, `trans-athletes`. LA Mayor's 1: `public-safety-approach`.

## Current state (measured 2026-08-07, ev-accounts DB)

**Source discovery has never run on either race.** Not "found nothing" — never ran.

- `essentials.discovered_sources`: 755 rows total, **0 for either race**. 0 `approved` rows
  anywhere in the table; the triage queue has never been worked.
- `essentials.discovery_race_state`: **53 races ever swept, out of 475 tracked.** Neither of
  these is among the 53. The sweep is a 7-day cadence over ~6,400 queries
  (`src/discovery/engine.py:200` notes 18h+ at roster scale) — they simply have not come up.
- CA Governor is status `published`, so it also never trips the zero-source alarm:
  `src/discovery/db.py:100` alarms only `needs_quotes`.
- `essentials.source_outlets`: **zero CA outlets** (FL and WY only, plus 54 unscoped national
  YouTube channels). Even when the sweep reaches CA, the feed layer is blind there.

**Provenance is uneven.** CA Governor is healthy — Hilton 36 YouTube-sourced quotes, Becerra 38.
LA Mayor is not: **30 quotes carry a NULL `source_url`** (Bass 14, Raman 16), and those cannot
ship, because the reveal is provenance.

**Race-local ranking questions are barely used.** Exactly **one** override exists across both
races (`readrank_race_topic_questions`: CA Governor / `fossil-fuels`). None for LA Mayor.

## Findings that reshaped the problem

Three things turned up during investigation that change what the work is.

### 1. The bottleneck is contrast judgment, not sourcing

Both races have large draft pools sitting unselected. LA Mayor has 4 Bass drafts and 4 Raman
drafts on `housing`, on `homelessness`, on `homelessness-response` — and ships none of them.
The gap between 1 rankable topic and ~11 is mostly a human selection pass, not a discovery run.

But nothing in the tooling tells that human *which* pairing to select, or whether a pairing is
worth shipping at all. That is the actual missing piece.

### 2. Nothing checks whether a topic is a real choice

`audit-quotes` has nine judgment checks at `level: "quote"` and one portfolio check at
`level: "portfolio"`. Both ends are covered; the middle is empty.

- `non-differentiating-goal` reads **one quote in isolation** — is *this* quote an agreeable
  goal with no mechanism.
- `coverage-skew` counts rows per candidate.

Neither asks: *do the two quotes we ship on this topic, side by side, present a real choice?*
A topic where both candidates say something specific, mechanism-bearing, and **substantively
identical** passes every existing check and ships as a fake choice.

### 3. The 30 orphan LA Mayor quotes are the best material in the race

They are almost certainly all from **the same mayoral debate**. Consecutive answers to one
question are sitting in the table:

> **Bass:** "Everybody needs to go inside. Making it illegal and arresting people is not the way
> to solve this problem."
>
> **Raman:** "Yes, that people need to go inside. When they're offered shelter, they go inside."

There are matching pairs on the 41.18 anti-camping ordinance, on multi-family housing approval
timelines, and on police pay. All 30 also have a blank `editor_note` and blank `source_name`,
so they were bulk-imported from a transcript and never went through `publish-quotes`.

They cover `city-sanitation`, `economic-development`, `growth-and-development`, `homelessness`,
`homelessness-response`, `housing`, `public-safety-approach`, `rent-regulation`,
`residential-zoning`, `campaign-finance`, and `local-environment` — i.e. they are **load-bearing
for most of LA Mayor's 11 candidate topics**.

This is not 30 orphans to re-attribute one at a time. It is one or two events to identify.
Both candidates, same questions, on the record, in a debate — the highest-value material in
either race, currently unusable.

## Non-findings (investigated, nothing to fix)

- **Browse does not show a duplicate LA Mayor card.** `readrankService.ts:285` has no
  election-date filter, but the frontend buckets races `upcoming` / `past` in
  `src/utils/raceGrouping.ts:36`, and the June 2 primary lands in `past`. Working as intended.
- **The reveal does not surface a Compass value.** The reveal payload
  (`readrankService.ts:603`) joins `compass_topics` only for the topic *title* and the `is_live`
  gate. No spectrum, no number; no `compass`/`stance` field in the frontend API types. This
  matters for the override decision below.

---

## Part 0 — Unblock

### 0a. Repoint the LA Mayor pipeline row

Pipeline row `9612b60a-ca29-4da4-9dda-8ff34baf7d9e`, labelled
`Los Angeles Mayor (CA, 2026-11-03)`, carries `race_id` of the **June 2 primary**
(`24bc3631-…`, 14 candidates, 12 eliminated). It must point at the general
(`9e888818-…`, Bass v Raman).

Until it does, `fetch_tracked_candidates` (`src/discovery/db.py:37`) resolves LA Mayor to the
eliminated primary roster, so discovery would hunt sources for the wrong people and
`rankable_topics` would count the wrong race. **This blocks Part 3** and must land first.

Purely internal — no user-visible effect.

### 0b. Identify the debate behind the 30 orphan quotes

One research task, not thirty. Identify the event(s), recover the URL and per-quote timestamps,
and backfill `source_url` / `source_name` / `editor_note`.

If an event yields a video, file it as an ingest row in `essentials.discovered_sources`
(`discovered_via='agent'`, `route='ingest'`) so the transcript lands in `meetings.segments` and
future quotes from it get timestamp deep links for free.

Any quote that cannot be traced to a real source is **retired, not guessed**. A quote without
provenance is not a Read & Rank quote.

This is the highest-leverage single item in the spec.

---

## Part 1 — `topic-no-contrast`, a `level: "topic"` check

A new `audit-quotes` judgment check occupying the empty middle between the per-quote pass and
the per-race portfolio pass.

### Scope and inputs

Runs **once per race×topic**, after the per-quote judgment pass, over **all candidate quotes for
that topic including drafts** — not only live ones. Reading drafts is what makes it a selection
tool as well as an audit: on the races in scope it covers CA Governor's ~16 candidate topics and
LA Mayor's ~11, rather than the 7 and 1 currently live.

### Procedure

1. **Discard anything already flagged `off-question`.** Responsiveness precedes contrast; an
   off-question quote is not an eligible comparison point no matter how distinctive it is
   (principles §7.1, §8).
2. **Identify the best available pairing** among survivors — for a two-candidate race, one quote
   per candidate.
3. **Judge that pairing:** does a citizen ranking these blind face a real choice?

### Verdicts

| verdict | meaning | effect |
|---|---|---|
| `real-choice` | The quotes take different positions, **or** pursue the same direction by different mechanisms. | Ships. The finding **names the pairing** that achieved it — this is the selection recommendation the human acts on in `/admin/readrank-quotes`. |
| `same-position` | Both quotes assert materially the same thing by materially the same mechanism. | **Gates.** |
| `no-eligible-pair` | Fewer than 2 candidates have an on-question quote. | Report only — already covered by the ≥2 rule (REDESIGN_SPEC §8). |

### The two guardrails

**Articulacy is not a contrast signal, in either direction.**
Two candidates holding the same position, one stating it more eloquently, is `same-position` and
gates. Ranking that pairing measures rhetoric rather than policy, which is precisely the failure
this bar exists to prevent. Symmetrically, a plainly-worded genuine difference is `real-choice`.
The check must never reward eloquence and never penalise its absence.

**Never manufacture contrast.**
The finding may not suggest sourcing a quote *in order to* create contrast — the same guardrail
`coverage-skew` already carries (principles §8: never engineer outcome balance). If two
candidates genuinely agree, that is a true fact about the race, and Read & Rank's honest response
is silence on that topic. You cannot rank identical positions; a topic that offers no choice is
not a comparison, which is the same logic REDESIGN_SPEC §8 already applies to one-voice topics.

This is also the boundary against substance-policing: the check judges whether the *pair* differs,
never whether a position is good, deep, or well-argued.

### Finding shape

- `check_id`: `topic-no-contrast`
- `level`: `"topic"` (new — the schema currently has `quote` and `portfolio` only)
- `severity`: `high`
- `fix_class`: `decision-required`
- `race_id`, `topic_key` set; `quote_id` and `candidate` null — the finding is about the pairing,
  not one quote. The pairing's quote ids belong in `what`.

### Gate mechanics

The check does **not** auto-flip `readrank_selected`. The gate is policy — a `same-position` topic
must not be live — and the write flows through the existing `apply_fixes.py` `set_live: false` op
with dry-run and explicit user OK. Gate in principle, human-confirmed in execution, consistent
with the skill's read-only-until-gated-fix non-negotiable.

---

## Part 2 — Relax axis-invariance on race-local ranking questions

### What the rule is

A Compass topic is not a subject bucket — it is a **spectrum with two ends**, and a candidate's
Compass value is a point on it. The "axis" is which spectrum you are measuring on. Principles
§7.3 currently permits a per-race ranking question to reword, localise, or tighten — but requires
it to **stay on the same axis**. An axis-shifting question is supposed to be a re-home or a
Compass fix, never an override.

### Why relax it

Candidates answer the question they were asked, not the one our taxonomy wishes they had been
asked. Holding the axis line strictly means discarding good head-to-head material — plausibly
including much of the LA Mayor debate set in 0b. **A rankable topic on a slightly different
question beats an unrankable topic.**

§7.3 already *prefers* the real question ("Prefer the actual debate/interview question, tightened
for clarity, over an invented one"). Axis-invariance is the only thing standing between that
preference and the material.

### What relaxing actually costs

Three things were thought to depend on axis-invariance. Only one survives inspection.

1. **The reveal** — does not apply. Read & Rank never shows a Compass value (see Non-findings).
2. **The `coupling-in-tension` check** — compares a quote against the candidate's Compass number.
   On an off-axis topic that compares two different measurements and yields noise. This is a
   reason to *skip* the check there, not to forbid the question.
3. **Cross-race meaning** — real, and it survives. If `housing` measures state preemption in LA
   and rent control in Ohio, a nationwide rollup cannot pool them. Addressed by labelling rather
   than prohibition.

### The relaxed rule

An override **may** shift the axis, subject to five guardrails:

- **Declared, not silent.** An explicit off-axis flag on the `readrank_race_topic_questions` row.
  A declared shift is a choice; an undeclared one is drift.
- **Skip coupling.** When the flag is set, `coupling-in-tension` is skipped for that race-topic
  rather than run and believed.
- **Still blind.** The question names or contextually leaks no candidate (§4.2). Unchanged.
- **Still derived from the real question.** Taken from the question actually asked in the
  debate / forum / questionnaire, tightened only for clarity, with the source recorded. Unchanged.
- **Marked race-local**, so nationwide aggregation knows not to pool that topic.

### Knock-on change

The `question-override` judgment check currently treats an axis shift as high-severity
decision-required. It must be rewritten: a **declared** shift is valid; only an **undeclared**
axis shift, a non-blind question, or one not derived from a real question is a finding.

### Accepted cost

Used often enough, topic names drift apart between races. The race-local flag contains the damage
but does not eliminate it. Worth monitoring as this scales past two showcase races — if a topic
accumulates many off-axis overrides, that is a signal the Compass question itself is wrong and
should be escalated to `compass-topic-builder`.

---

## Part 3 — Discovery, aimed

Depends on 0a.

1. **Force both sweeps** — `poll_discovery.py --race <race_id>` for each. They will not come up
   on their own for a long time.
2. **Build a CA outlet pack** — none exist. Per the runbook recipe, 8–15 outlets registering both
   surfaces (YouTube channel RSS + politics-section web feed) where available: LAist/KPCC, KCRW,
   PBS SoCal, CalMatters, Spectrum News 1 SoCal, LWV California, LWV Los Angeles, the Cal Channel,
   LA Public Press, LA Times politics. **ToS gate applies per outlet** — KTLA is Nexstar, which is
   on the barred-chain list.
3. **Run the gap-filler deep hunt**, weighted toward events where **both candidates answered the
   same prompt**: debates, candidate forums, and Vote411 / LWV questionnaires.

### Shared-question moments are the primary target

A questionnaire item or debate question both candidates answered delivers three things at once:
a tier-1/tier-2 source, a natural race-local ranking question, and a genuine head-to-head. Under
a contrast bar this is not a nice byproduct of sourcing — it is the thing being hunted.
Vote411 / LWV questionnaires are the highest-yield form: both candidates, same prompt, unedited
answers, safe under the written-source verbatim rule.

---

## Sequence

1. **0a** repoint the pipeline row (blocks 3).
2. **0b** identify the debate behind the 30 orphan quotes (highest leverage; unblocks most of
   LA Mayor's topic pool).
3. **Part 3** discovery — force sweeps, CA outlet pack, deep hunt. Runs in the background.
4. **Part 1** build `topic-no-contrast`; run it over drafts on both races to produce the
   selection worklist.
5. Human selection pass in `/admin/readrank-quotes`, driven by that worklist.
6. **Part 2** add race-local ranking questions where a shared real question exists, using the
   relaxed rule.
7. Re-run `audit-quotes` on both races → the showcase state.
8. Write the contrast rubric up as the playbook for the remaining races.

Steps 4–6 are iterative rather than strictly ordered: a sharper ranking question can turn a
`same-position` verdict into `real-choice`, so expect to loop.

## Success criteria

- Every live topic in both races carries a `real-choice` verdict.
- No live quote in either race has a NULL `source_url`.
- LA Mayor ships materially more than 1 topic — but the count is an **outcome, not a target**.
  A race that honestly supports 6 real choices ships 6.
- `topic-no-contrast` runs as part of a normal `audit-quotes` invocation on any race, not as
  showcase-only tooling.
- The rubric is written down well enough that a pipeline session on an unrelated race applies the
  same bar without this conversation.

## Open questions

- **Multi-candidate races.** Both showcase races are two-way, so "the pairing" is unambiguous.
  For a 3+ candidate race, is contrast judged over the full set, or pairwise across all pairs,
  or against the modal position? Deferred — resolve before the check ships beyond these races.
- **Where the off-axis flag lives.** A column on `readrank_race_topic_questions` is the obvious
  home; naming and migration are an implementation concern for the plan.
