# Bespoke race-topic questions (Read & Rank)

**Date:** 2026-07-15
**Status:** Design approved, pending spec review
**Spans three repos:** `read-rank` (frontend), `ev-accounts` (data model + curation),
`on-the-record` / `essentials` (curation principles + skills)

---

## 1. Problem

On the Read & Rank evaluation card, the question a citizen sees is
`inform.compass_topics.question_text`, joined to quotes by `topic_key` only
([`readrankService.ts:520,531`](../../../../ev-accounts/backend/src/lib/readrankService.ts)).
It is a single generic Compass question **reused across every race** that includes the topic.

Two problems follow:

1. **Content — the question is often "slightly off."** It was never written for the specific
   debate the candidates were actually answering. The motivating case is **CA Governor →
   fossil fuels**, where the displayed question does not match what the candidates responded to.
2. **Visual — the question doesn't read as the thing you're answering.** Today it renders at
   15px / weight 700 ([`TopicStepper.tsx:39-45`](../../../src/components/TopicStepper.tsx)); it
   should be bolder and clearly the hero of the card.

## 2. Model & decisions

### 2.1 One shared question per race-topic (not per-candidate)

Read & Rank ranks candidates **head-to-head on one issue**. The single shared question is what
makes the ranking a valid "same question, different answers" comparison. We keep that model —
we do **not** attach a per-candidate question to the blind card. (Rejected alternatives:
per-candidate debate question; hybrid per-card "they were asked" line.)

### 2.2 The two questions (the core reconciliation)

The principles' §7.1 responsiveness gate currently says a quote must answer *"that topic's framed
question"* and that the ranking is valid only because quotes are *"comparable answers to the same
question."* Today that string is the Compass question, so the doc never had to distinguish two
things it conflates:

- **Compass question (canonical).** Tied to the Compass **axis/stance**, global (until Compass
  topics become hyper-local — see §2.5). *This is what people answer when they take their Compass.
  We never change it via this feature* → nobody re-takes their Compass.
- **Ranking question (resolved).** What Read & Rank **displays** and what **responsiveness gates
  against**. Defined as: `ranking question = race-topic override ?? Compass question`.

**Responsiveness (§7.1) is re-anchored to the ranking question.** All ranked quotes in a race-topic
must be comparable answers to the *ranking* question. "Same question" means *same as the other
quotes ranked together* — not *identical to the Compass string*. Across races the ranking question
may differ; ranking is always within a single race-topic, so comparability is preserved.

### 2.3 Axis-invariance (the guard that protects coupling)

An override may **re-word, localize, add debate context, or shorten** — but it **must engage the
same Compass axis/dimension** as the topic it overrides. Because if it stays on-axis, then
"answers the ranking question" still implies "is evidence on the Compass axis," so the §7.2
quote↔Compass-value coupling holds and Read & Rank still ties to the Compass topic (via `topic_key`
+ axis) despite different wording. **An override that shifts the axis is not allowed** — if the
axis is wrong for the race, that is a Compass fix or a re-home (§7.1b), never an override.

### 2.4 Override vs. escalate

Two remedies, clear boundary:

- **Race-local reframe → per-race override.** The debate framed this topic differently for *this*
  race; other races are fine.
- **Systemically wrong question → escalate to `compass-topic-builder`** (the existing §7.1 line 411
  remedy) to fix the Compass topic globally.

The override is **never** an excuse to skip fixing a globally-broken Compass question.

### 2.5 Relationship to the hyper-local future

The override lets Read & Rank's *questioning* become race-specific now — on the same axis — without
waiting for Compass topics to become hyper-local, and without disturbing anyone's existing Compass.
When Compass topics eventually go hyper-local, the canonical question catches up and overrides can
retire.

### 2.6 Scope guard — override is Read-&-Rank-local

The override is a **ranking-question** concern only. Anywhere the *Compass* question is surfaced
(Compass, Essentials) continues to show the **canonical Compass question**, not the override. This
keeps the coupling story honest: the override changes how Read & Rank *asks*, not what Compass *is*.

---

## 3. Part A — Data model (ev-accounts)

### 3.1 New table

```sql
-- backend/migrations/1323_readrank_race_topic_questions.sql (next migration number)
CREATE TABLE IF NOT EXISTS essentials.readrank_race_topic_questions (
  race_id       uuid NOT NULL REFERENCES essentials.races(id) ON DELETE CASCADE,
  topic_key     text NOT NULL CHECK (topic_key = lower(topic_key)),
  question_text text NOT NULL CHECK (length(btrim(question_text)) > 0),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    text,
  PRIMARY KEY (race_id, topic_key)
);
```

`topic_key` is stored lowercased (matching how the read path lowercases `q.topic_key`). No FK to
`inform.compass_topics` is required (topic_key is text there too), but the write path should
validate the key exists and is live.

### 3.2 Query change — resolve override server-side

In `getRaceBlindQuotes` ([`readrankService.ts:513-535`](../../../../ev-accounts/backend/src/lib/readrankService.ts)):

```sql
LEFT JOIN essentials.readrank_race_topic_questions rtq
  ON rtq.race_id = r.id AND rtq.topic_key = lower(q.topic_key)
...
COALESCE(rtq.question_text, ct.question_text) AS topic_question
```

**The API contract is unchanged** — the payload still carries one `question` string per topic. The
reveal/results query ([`readrankService.ts:576+`](../../../../ev-accounts/backend/src/lib/readrankService.ts))
selects only `short_title`, not the question, so it needs no change.

### 3.3 Authoring surface

- **Now:** seed via migration (matches how this repo curates data). See Part D.
- **Follow-up (out of scope for this pass):** a race-scoped admin surface. The current admin
  ([`ReadRankQuotesPage.tsx`](../../../../ev-accounts/admin/src/pages/admin/ReadRankQuotesPage.tsx))
  is per-politician; per-race-topic authoring is a new surface. Noted, not built here.

---

## 4. Part B — Frontend (read-rank)

Because ev-accounts resolves override-or-default server-side, the frontend needs **zero data
changes** — only the banner treatment.

**Decisions locked via the visual companion:** Option B, no kicker, **22px / weight 800**.

- **Light mode:** yellow **highlighter** behind black text (`#fed12e` bg, `#1c1c1c` text — the
  already-approved "one yellow surface, always ev-black text" pattern, `index.css` §5 placement #7).
- **Dark mode:** the question **text** is yellow (`--color-ev-yellow` on the dark banner).
- Boxed banner kept. Move the current inline styles in
  [`TopicStepper.tsx:40-44`](../../../src/components/TopicStepper.tsx) into `.question-banner h2` CSS
  ([`index.css:620`](../../../src/index.css)) with proper light/dark rules and sensible mobile
  wrapping (line-height, ~3 lines on a phone for long questions).

Accessibility: black-on-yellow (light) and yellow-on-dark (dark) both meet AA; verify with the
actual token values.

---

## 5. Part C — Curation principles & skills

The per-race override is a **new curation artifact**. The principles doc and both skills currently
govern only quotes; they must be updated so they are neither silent nor contradictory about the
ranking question.

### 5.1 `essentials/docs/QUOTE-CURATION-PRINCIPLES.md`

- **§7.1** — introduce the **two questions** (Compass vs. ranking). State that responsiveness gates
  against the **resolved ranking question** (`override ?? Compass`). Clarify "same question" =
  *same as the other quotes ranked together*, scoped to a single race-topic.
- **§7.1** — add the **override vs. escalate** boundary (§2.4 above), alongside the existing line
  411 escalate-to-`compass-topic-builder` remedy (keep that remedy; position the override as the
  race-local sibling).
- **New subsection (e.g. §7.3 "Race-local ranking questions")** — define the override: what it may
  do (re-word / localize / add debate context / shorten), the **axis-invariance hard rule**, the
  blindness constraint (shown identically to all candidates; must not name or leak a candidate),
  and the derive-from-the-actual-debate-question guidance.
- **§7.2** — update line 432 ("always the same question") for the two-questions scope; reaffirm
  that coupling holds *because* the override is axis-invariant.
- **§9 worked example** — the `question:` shown is the *ranking* question; note where an override
  would/would not apply.

### 5.2 `on-the-record/.claude/skills/publish-quotes/`

- **`SKILL.md`** — add a race-level step: when curating a race, check whether the Compass question
  fits the debate; if not, author a race-topic override (derived from the actual debate question,
  shortened, axis-preserving, blind) or escalate if the topic is systemically wrong. The existing
  off-question guidance (SKILL.md:36-39) now reads against the resolved ranking question.
- **`REFERENCE.md`** — document the `essentials.readrank_race_topic_questions` table/field
  alongside the existing quote-record field table.
- **`EDITORIAL.md`** — the override text follows the same editing mechanics (no injected emotion,
  honest shortening, etc.); note it explicitly if needed.

### 5.3 `on-the-record/.claude/skills/audit-quotes/`

- **`CHECKS.md`** — point the `off-question` check (CHECKS.md:81) and the `stance.question_text`
  input (CHECKS.md:111-112, 128) at the **resolved ranking question**.
- **`CHECKS.md`** — add a new check for the override itself: **faithful** to the actual debate
  question, **neutral/blind** (no candidate leak), and **axis-preserving** (does not shift the
  Compass axis). Severity/decision-required consistent with the existing `off-question` check.
- **`SKILL.md`** — reflect the new check in the audit flow.

---

## 6. Part D — CA-governor fossil-fuels seed (first real override)

Seed the first override via migration (`1323_…`) for the CA-governor fossil-fuels topic.

**Open input — the only thing blocking Part D:** the *actual* sharpened question text. The mockup
placeholder ("Should California phase out oil & gas drilling — and how fast?") is **not** to be
treated as real. The override must be derived from the actual debate question the candidates
answered. Resolution path (pick at execution time):

- The user provides the debate question / source, **or**
- Pull the CA-governor fossil-fuels **current Compass question + the candidates' selected quotes**
  from ev-accounts and draft the override for the user's approval (axis-invariant, blind, shortened).

**Source (per user):** the quotes come from on-the-record meeting
`6f206fe5-a18b-4af5-b945-c72178d53289`
(https://ontherecord.empowered.vote/meetings/6f206fe5-a18b-4af5-b945-c72178d53289) — the actual
debate question posed in that meeting is the basis for the sharpened ranking question. Meeting
transcript segments live in `meetings.segments` (ev-accounts DB).

A prior audit exists to draw on:
[`2026-07-10-quote-audit-ca-governor.md`](../../../../on-the-record/docs/audits/2026-07-10-quote-audit-ca-governor.md).

---

## 7. Invariants & guards (must hold)

- **Blindness** — the ranking question is shown identically to everyone; no per-candidate field;
  the override text must not name or contextually leak a candidate.
- **Coupling (§7.2)** — override is axis-invariant; Read & Rank ties to `topic_key` + axis.
- **Comparability (§7.1)** — all ranked quotes answer the same *resolved* ranking question.
- **Compass untouched** — no change to `inform.compass_topics`; no one re-takes Compass.
- **Scope** — override affects Read & Rank only; Compass/Essentials show the canonical question.

## 8. Testing

- **ev-accounts** — `readrankService` test: COALESCE resolves override when present, falls back to
  the Compass question when absent; blindness/thin-topic invariants still hold.
- **read-rank** — banner render test (renders resolved question; light/dark treatment applied).
- **a11y** — verify AA contrast for both themes with actual token values.

## 9. Order of operations

1. **A** — ev-accounts migration + query + test (additive; safe to ship first, no behavior change
   until an override row exists).
2. **C** — principles + skills updates (documentation; can land in parallel with A).
3. **D** — resolve the CA-governor fossil-fuels question, seed the override (depends on A + the
   open input).
4. **B** — read-rank banner treatment (independent of A/C/D; can land anytime).

## 10. Open inputs

- The real CA-governor fossil-fuels ranking question (Part D) — source or draft-from-DB.
- Confirmation of exact §7.3 subsection numbering/placement in the principles doc.
