# Task 7 — proposed changes to QUOTE-CURATION-PRINCIPLES.md

**Status:** DRAFT FOR REVIEW. Nothing applied. The principles doc is canonical — `CHECKS.md` defers
to it — so this lands only after you've read it.

**Why it's urgent-ish:** as of `5b8a151`, `audit-quotes` **knowingly contradicts §5**. CHECKS.md
§3.2 carries a ⚠️ naming the conflict rather than hiding it, but that state shouldn't persist.

Three sections change. Two are straightforward; **§5 has a real decision in it** and **§7.3 has a
gap I created** — both flagged below.

---

## §5 — Source principles

### What it says now

> **Hierarchy (best → worst):**
>
> 1. **Debates & candidate forums** — spoken, on-record, probed.
> 2. **News interviews** — spoken, on-record, questioned.
> 3. **Prepared public remarks** — stump/floor speeches, testimony (spoken, unprobed).
> 4. **Candidate-bylined written** — op-eds, official platform, *only if clearly the candidate's own
>    words, quoted as a verbatim sentence…*
> 5. **Hard-excluded** — hot-mic, private, secretly-recorded, "gotcha".
>
> - **Hard filter, soft preference:** strongly prefer tiers 1–2; allow 3–4 *with a justification
>   note explaining why*; hard-exclude tier 5.

Note this ladder **never mentions questionnaires at all** — while `race-pipeline/SKILL.md` was
updated on 2026-08-05 to call them tier 2. The skill and the canonical doc already disagreed before
any of this work started.

### Proposed replacement

> **Hierarchy — directness of answer (best → worst):**
>
> 1. **Answered *this* question.** The candidate was asked this question, or its clear equivalent,
>    and this is their answer. Debate and forum answers, and **candidate questionnaires** (Vote411,
>    LWV chapters, outlet questionnaire pages) both land here: a questionnaire is written and
>    self-published, yet every candidate answers an *identical prompt* and every ballot-qualified
>    candidate is invited — so it solves comparability and inclusion at once. Prefer these.
> 2. **Answered an adjacent question.** Genuinely responsive, but the prompt they were given
>    differed — a news interview that circled the subject, an answer to a narrower or broader
>    version of the question.
> 3. **Curator-extracted.** The position was lifted from material not organised as an answer at
>    all: stump speeches, floor remarks, op-eds, platform pages. Allowed with a justification note.
>    Sometimes it is all a candidate has — that is honest presence, not a defect.
> 4. **Hard-excluded — not merely deprioritized:** hot-mic, private, secretly-recorded, or clearly
>    off-the-cuff "gotcha" remarks. Using off-guard speech is the manufactured-drama we reject and
>    it corrodes trust. **Do not use.**
>
> - **Why directness and not medium.** The old ladder ranked by *questioner independence*
>   (debates > news interviews > prepared remarks > candidate-bylined written). That instinct was
>   really tracking directness, and ranking by medium got questionnaires exactly backwards — it
>   filed the most directly comparable source we have under "written, lowest tier." Questioner
>   independence still carries real information (a debate answer is probed; a questionnaire answer
>   is not), so use it to break ties **within** a level — never to override the level itself.
> - **Hard filter, soft preference:** strongly prefer level 1; allow 2–3 *with a justification note
>   explaining why*; hard-exclude level 4.
> - **Written sources at any level yield verbatim sentences only** — never a curator-summarized
>   bullet list ("Support DACA, oppose Muslim ban and family separation" is a summary, not a
>   quote). This applies to questionnaires exactly as it does to op-eds.

**Unchanged:** the "Social media is a distribution channel, not a source type" bullet and the whole
**Accuracy floor** block. Both are orthogonal to directness.

### ⚠️ DECISION 1 — the numbers collide with source discovery

`src/discovery/classify.py` prompts for `source_tier: 1-4` against the **old** ladder, stores it as
`discovered_sources.source_tier_guess`, orders the triage queue by it, and scores it in the
classifier eval — across seven source files and six test files.

If §5 keeps numbers, "tier 2" means *news interview* to discovery and *adjacent question* to
curation. Same word, same range, different meaning, no error anywhere.

Three ways out:

| | What it means | Cost |
|---|---|---|
| **A. Name the levels, don't number them** (recommended) | §5 refers to `answered-this-question` / `adjacent` / `curator-extracted` / `excluded`. Discovery keeps `tier 1-4` as its own thing. | Slight prose churn. Collision becomes impossible rather than merely documented. |
| **B. Keep numbers, document the divergence** | §5 says "level 1-4"; a note says discovery's tiers are a different scale. | Cheapest now, but two 1–4 scales in one codebase is a trap that will be stepped in. |
| **C. Realign discovery to directness** | One model, one scale. | Seven source files, six test files, a live triage queue, and a 2026-08-05 recalibration built on it. Out of scope here. |

I recommend **A**. It costs almost nothing and it makes the collision unrepresentable. It also
leaves **C** open later without a rename.

There is a real argument for discovery keeping its own scale permanently: it is guessing from a
title and channel name *before anything has been read*, where questioner independence is genuinely
the best available proxy. Directness isn't knowable until you've seen the content. Under that
reading discovery's tier is a **triage-priority** signal, not a quality claim — and the two scales
*should* be named differently.

The draft below assumes **A**. Say the word if you'd rather have B or C.

---

## §4.6 — Differentiation

### What changes

§4.6 currently ends with the worked example about non-car mobility. **Everything above stays.**
This appends a new subsection.

> **Per-quote preference vs. per-set property.** Everything above judges a *single* quote, and it is
> a preference. There is a second question that only exists across a *set*: do the answers to one
> question actually let a citizen make a meaningful choice? Two properties, both required:
>
> - **Commensurable** — a shared latent dimension exists, so preferring one answer over the other
>   *means* something. Not "same words," not "mutually exclusive." Healthcare coverage vs. healthcare
>   supply are commensurable — both are positions on how large a role government should play. "Cap
>   insulin prices" vs. "build more medical schools" are not: no axis, so no meaningful ordering.
>   Incommensurable answers are the signal that these are **two questions** — split them, and each
>   half becomes rank-or-surface on its own.
> - **Differentiated** — real distance along that axis. Commensurable-but-identical is not rankable.
>
> **Undifferentiated is not a failure. Agreement is information.** When candidates genuinely
> converge, show that they converge — do not rank it, and **never hide agreement to make a race look
> sharper.** Dropping the question would discard a true fact about the race.
>
> Three limits keep this honest:
>
> - **Contrast is observed, never engineered.** Select each candidate's *most faithful* answer
>   first; only then look at the set and ask whether real difference exists. Never pick a quote
>   *because* it contrasts. This ordering is the guardrail — it is why the audit runs its per-set
>   pass strictly after its per-quote pass.
> - **Articulacy is not a differentiation signal, in either direction.** Same position, one
>   candidate more fluent, is still undifferentiated — ranking it would measure rhetoric rather than
>   policy. A blunt, plainly-worded genuine difference is differentiated. Fluency is never evidence
>   either way.
> - **Difference often lives in the HOW.** When candidates share a goal, the mechanism is usually
>   where they diverge — so hunting genuine differentiation is usually hunting the mechanism-bearing
>   quote, which is what this section already asks for.

No decision needed here — this is the comparability model's §4/§7/§8 written into the canonical doc,
plus the articulacy rule.

---

## §7.3 — Race-local ranking questions

### What changes

Replace the **Stay on the same axis** bullet:

> - **Prefer the same axis; shift only deliberately.** Prefer a ranking question that engages the
>   same Compass axis as its topic. But candidates answer the question they were actually asked, and
>   **a rankable question on a slightly different axis beats an unrankable one** — so a race-local
>   question may sit off the Compass axis, and may even have no Compass topic at all (an emergent
>   local question). When it does: the topic is **race-local** and must not be pooled across races,
>   and the §7.2 coupling check is **skipped**, not reported — comparing a quote to a Compass value
>   measured on a different axis produces noise, not a finding.

and the closing paragraph:

> When the question is on-axis, "answers the ranking question" still implies "is evidence on the
> Compass axis," so responsiveness (§7.1) and coupling (§7.2) both hold. When it is off-axis,
> responsiveness still holds — it is gated against the ranking question, which is the question the
> candidates answered — but coupling does not, and is skipped.
>
> Read & Rank never surfaces a Compass value (the reveal shows candidate, topic, quotes, agreement
> and sources — no spectrum), which is why this costs nothing a citizen sees. The real cost is
> cross-race comparability, contained by marking the topic race-local. Watch the aggregate: if one
> topic accumulates many off-axis questions, the *Compass question* is what is wrong — escalate to
> `compass-topic-builder` rather than papering over it race by race.

**Unchanged:** the "Stay blind" and "Derive from the real question" bullets, and §7.1's cross-team
signal that an override is never a substitute for fixing a globally-broken Compass question.

### ⚠️ DECISION 2 — a gap I created

The original Part 2 declared an off-axis shift with a new `off_axis` column on
`readrank_race_topic_questions`. **I removed that when Task 2 was rewritten** (that table is slated
for retirement, and the real blocker turned out to be the payload joins). So "shift only
deliberately" currently has **no mechanism to declare anything with** — and the audit has no way to
know when to skip the §7.2 coupling check.

`essentials.readrank_questions` already has a field that can carry this: **`origin`**.

- `origin = 'compass'` — on-axis by construction. Coupling applies.
- `origin = 'moderator' | 'emergent'` — a real question someone actually asked, which may or may not
  sit on the Compass axis. Coupling is unreliable → **skip `coupling-in-tension`**.

That is slightly blunter than a dedicated flag (a moderator question can perfectly well be on-axis,
and we'd skip a coupling check that would have been valid). But it uses a field that already exists
and is already populated, needs no migration, and errs toward *not* emitting a finding it cannot
justify — which is the right direction for a check whose output is "this needs human resolution."

The alternative is adding `off_axis boolean` to `readrank_questions` after all — precise, but one
more column and one more thing for a curator to set correctly.

The draft assumes **`origin`**. Tell me if you'd rather have the explicit flag.

---

## What I am NOT proposing

- **No change to §7.1 (responsiveness).** It already says the right thing: *"'Same question' means
  the quotes ranked together answer the same question as each other within one race-topic — not that
  the string is identical to the Compass question or the same across races."* That is the
  comparability model's position, already written down.
- **No change to §8 (portfolio balance).** The symmetry rule and the skew-audit framing survive
  intact; the per-set layer sits under §4.6, not §8.
- **No change to the accuracy floor, the social-media classification, or the editing rules.**

---

## Summary of decisions

1. **§5 numbering** — name the levels (A, recommended), keep numbers with a documented divergence
   (B), or realign discovery (C, out of scope now).
2. **§7.3 declaration mechanism** — use the existing `readrank_questions.origin` (recommended), or
   add an explicit `off_axis` column.

Both defaults are what the draft above assumes. Approve as-is, or tell me which to change and I'll
revise before anything touches the canonical doc.
