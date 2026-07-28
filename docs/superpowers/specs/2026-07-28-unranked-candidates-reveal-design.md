# Unranked candidates at the reveal — design spec

**Date:** 2026-07-28
**Surfaces:** `/reveal` (ev-accounts), `ResultsPhase`, `CandidateBallotCard`,
`RevealBand`, `buildMockReveal`.
**Related:** `REDESIGN_SPEC.md` §8 (Degraded States),
`docs/superpowers/specs/2026-07-08-reveal-results-redesign-design.md` (mark
vocabulary, candidate cards, quote drawer).

## Goal

Two defects share one cause, so one rule fixes both:

1. A user who agrees with nothing has no reveal worth reaching. The screen they
   land on apologises and sends them away.
2. A candidate you *only disagreed with* never appears on the reveal at all —
   even in a normal race where you ranked everyone else.

Both come from gating candidate inclusion on agreement. The rule that replaces
it: **a candidate you judged belongs on the reveal, whether or not you ranked
them.** Ranking becomes something a candidate *has* rather than the price of
admission.

This is a post-reveal surface, so full provenance is expected here. Nothing in
this spec touches the blind evaluation card. See `CLAUDE.md` invariants.

---

## 1. What the backend does today

Verified live against `POST /api/readrank/races/:id/reveal` on 2026-07-28, race
`0b5ae739-aa3a-4bfd-b1bf-57cc1c380fd9` (Monroe County Commissioner District 1,
two candidates, two rankable topics):

| Verdicts sent | Response |
|---|---|
| Agree both of candidate A's quotes; disagree both of candidate B's | `200`, ballot of **1** — candidate B absent entirely |
| Agree one of A's quotes; disagree A's other | `200`, A present, `perTopic` includes the disagreed quote as `{supported: false, rank: null}` |
| All quotes disagreed | `200`, `{"ballot": []}` |

So the current rule is precise: **inclusion is gated on ≥1 supported verdict;
once a candidate is in, every quote you judged of theirs comes back, agreed or
not.** The per-topic payload is already correct. Only the roster gate is wrong.

`buildMockReveal` behaves identically (`if (!q || !v.supported) continue`), which
is why local dev never surfaced this.

---

## 2. The rule change (ev-accounts)

- **Inclusion:** a candidate enters the ballot if they have ≥1 judged quote in
  the submitted verdicts — `supported` either way.
- **`rank`:** unchanged for candidates with ≥1 agreement. `null` for candidates
  with none.
- **Ordering:** ranked candidates first, by rank, as today. Unranked candidates
  follow, **sorted by name**. The hard requirement is stability across identical
  requests, so a retry doesn't reshuffle the reveal cascade.

  *Implementation note (2026-07-28):* this section originally said to leave the
  unranked tail in "the race's existing candidate order (whatever the roster
  query already returns)". That is not stable — the reveal `SELECT` in
  `computeRaceMatch` has no `ORDER BY`, so Postgres does not guarantee row order
  across executions, and `aggs` is a `Map` in row-insertion order. Sorting by
  name reuses the tiebreak the ranked comparator already ends with.
- **Not a case:** a candidate you never judged at all — because you only played
  some topics, and they appear solely in ones you skipped — stays out. The
  reveal reports on quotes you actually read; it is not a roster of everyone
  running.
- **`evidence`:** for unranked candidates, `agreementCount`, `firstPlaceCount`
  and `topicsWithAgreement` are all `0`. They are already computed from
  supported verdicts, so this falls out.
- **`perTopic`:** no change. It already returns disagreed quotes with full
  provenance.
- **No new endpoint.** Identities continue to come only from this POST, which
  continues to require the user's own verdicts. A plain `GET` attribution
  endpoint was considered and rejected: it would make quote→identity leakage
  trivial and weaken the blindness posture for no gain.

---

## 3. Frontend type change

```ts
export interface BallotEntry {
  rank: number | null;   // null = judged but never agreed with
  ...
}
```

**What deliberately does not change:** the entire alignment layer.
`buildPerTopicRankMap` already skips quotes where `!q.supported || q.rank == null`,
and `markForQuotes` already returns `{kind: 'disagreed'}` and `null` marks. So
`AlignmentGrid`, `AlignmentPills`, `alignmentGrid.ts` and `alignmentMarks.ts`
need no edits. An unranked candidate simply gets a matrix row of disagreed and
not-judged marks, drawn from the vocabulary the 2026-07-08 spec already defines.

---

## 4. `ResultsPhase` — two sections

Partition the ballot:

```ts
const ranked   = ballot.filter((e) => e.rank != null);
const unranked = ballot.filter((e) => e.rank == null);
```

- **Ranked** keep the existing heading, *How the candidates stack up*.
- **Unranked** go under their own heading, *Also on the ballot*, with one line of
  explanation beneath it: "You read them, but didn't agree with any of their
  positions."
- **When `ranked.length === 0`** there is no split and no "Also on the ballot" —
  a single heading, *Everyone you read*, over the whole roster. ("Also" needs
  something to be also-to.)

Three existing behaviours need null-guarding:

- **`tiedRanks`** buckets entries by `e.rank`. Unguarded, every unranked entry
  lands in the same `null` bucket and renders a "Tied" tag. It must count only
  non-null ranks.
- **`top` and the screen-reader announcement** must come from `ranked[0]`. When
  nothing is ranked, announce the no-ranking case instead of naming a "number
  one" that doesn't exist.
- **The reveal cascade** (`timeline.cardDelay(i)`) must use one continuous index
  across both sections, so the animation doesn't restart at the second heading.

### The empty ballot, now split in two

Under the new rule an empty `ballot` no longer means "agreed with nothing" — it
means nothing resolved. Two genuinely different situations hide behind it, and
they need different answers:

| Condition | Treatment |
|---|---|
| Judged nothing (`judgedCount === 0`) — e.g. deep-linked to `/results` before playing | *Nothing to reveal yet*, with a route back to the topics. Legitimate, not an error. |
| Judged something, ballot still empty | The reveal-failure state from #87 ("We couldn't build your ballot", retry). Anomalous: the backend couldn't resolve anyone from real verdicts. |

The current copy — "You didn't agree with any quotes, so there's no ballot to
build. Try another race." — is **retired**. It describes a condition that will no
longer exist, and it is an apology plus a dead-end teaser, which
`REDESIGN_SPEC` §8 rules out.

---

## 5. `CandidateBallotCard`

When `entry.rank == null`:

- No `RankNumber` chip, no "Ranked N" screen-reader text, no tie tag. The
  screen-reader label becomes "Not ranked".
- No `MegaParticles`. Already conditioned on `entry.rank === 1`, so null is
  safe, but the guard should be explicit rather than incidental.
- The summary strip currently reads `Agreed with 0 of 7`, which is technically
  true and useless. Replace it for unranked entries with the fact that actually
  applies: **"Disagreed on D of M topics"** — `D` = topics where you disagreed
  with one of their quotes, `M` = `totalTopics`, the same denominator the ranked
  strip uses. (For an unranked candidate every judged quote is a disagreement, so
  `D` is also just "topics of theirs you judged".)
- The drawer toggle ("See what they said") stays, unchanged. It is the whole
  point of the section.

`RankNumber`'s own prop type stays `number` — the card decides not to render it,
rather than the chip learning to render nothing.

---

## 6. `RevealBand` copy

Two states, selected on whether anything is ranked.

**Ranked present** — unchanged:

> {office} · You ranked `rankedCount` quotes across `topicCount` topics
> Now see **who** you agreed with

**Nothing ranked:**

> {office} · You read `judgedCount` quotes across `topicCount` topics
> Now see **who** said what

`judgedCount` is agreed + disagreed, not agreed alone. The band currently
receives `rankedCount` only, so with nothing agreed it renders "You ranked 0
quotes across 3 topics" — which reads as an error message rather than a summary.

Beneath the band, above the roster, one line carrying the whole explanation:

> You didn't agree with any of these positions, so there's no ranking to build.
> Here's who said them.

It says what happened, why there's no ranking, and what you get instead — in
that order, in one breath. No apology, no "try another race". And it still pays
off the core promise: you read blind, so you still find out who said it.

Props become `{ office, topicCount, rankedCount, judgedCount }`, with the
variant derived from `rankedCount === 0` rather than passed in, so the band
can't disagree with the roster below it.

---

## 7. Mock parity is not optional

`buildMockReveal` must implement the same inclusion rule, including `rank: null`
for candidates with no agreements.

This is called out separately because divergence here has already cost us once:
the mock resolving only mock quote ids is exactly what let a backend outage
render as "You didn't agree with any quotes" (fixed in #87). Local dev is the
only place the reveal runs without the API, so a mock that models a different
rule than production is a bug generator, not a convenience.

---

## 8. Testing

- **Mock:** all-disagreed → every judged candidate present, all `rank: null`.
- **Mock:** mixed → ranked entries plus the only-disagreed candidate at
  `rank: null`.
- **`alignmentMarks`:** regression guard that `buildPerTopicRankMap` is
  unperturbed by null-rank entries, and that an all-disagreed candidate reduces
  to a `disagreed` mark.
- **`ResultsPhase`:** two sections when mixed; single "Who said what" when
  nothing is ranked; no "Tied" tag on unranked entries; correct announcement in
  both states.
- **`CandidateBallotCard`:** no chip, no burst, no tie tag, and the
  "Disagreed on N of M topics" strip when `rank` is null.
- **`RevealBand`:** both copy variants.
- **Empty ballot, both branches:** `judgedCount === 0` shows "Nothing to reveal
  yet"; judged-but-empty shows the retry state, not the "nothing to reveal" one.
- Retain the reachability tests from `c6e5c08` — they cover getting *to* this
  screen, which this spec assumes.

---

## 9. Sequencing

**Frontend must ship before backend.** If the rule lands server-side first, the
current frontend receives `rank: null` and renders an empty rank chip, a
screen-reader "Ranked null", and a spurious "Tied" tag on every unranked
candidate. Shipping the frontend first is inert — no nulls arrive until the
backend changes, so the new branches stay dormant.

---

## 10. Out of scope

- Re-ranking or changing verdicts from the reveal.
- Anything on the blind evaluation card.
- Tie-breaking or ordering changes among *ranked* candidates.
- The `VITE_API_URL` drift in `render.yaml` (tracked separately).
