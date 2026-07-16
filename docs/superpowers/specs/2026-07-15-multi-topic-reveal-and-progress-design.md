# Multi-topic reveal & race progress — design

**Date:** 2026-07-15
**Status:** Approved design, pending implementation plan
**Area:** race flow (store, routing, evaluation, reveal, hub/browse progress)

## Problem

Two user-reported defects, one root cause.

1. **Finishing one topic ends the whole race.** After ranking a single topic (e.g.
   fossil-fuels) and tapping "Reveal my ballot", the entire race is marked
   `completed` / `phase: 'results'`. Re-entering the race lands straight on the
   reveal, with no path back to the topics the user hasn't done yet.
2. **The main-page progress indicator disappeared.** A returning user expects a
   "resume" indicator ("Continue · N of M topics"). Because the race was flagged
   complete after one topic, the hub label flips from the actionable
   `in-progress` "Continue · …" to the past-tense `partial` "Ranked N of M",
   and the Browse view never rendered progress at all.

Root cause: `finishRace` (`src/store/useReadRankStore.ts:417`) and the
`phase === 'results'` branch of `setPhase` (`:275`) treat a single reveal as
whole-race completion, and `selectRace` (`:291`) restores the saved `results`
phase on re-entry with no route back to unfinished topics.

## Model

A race contains multiple topics. The unit of completion is the **topic**; the
race completes only when the user has evaluated **every rankable (scorable)
topic** in it.

- **Topic done** ⟺ every quote in the topic has been evaluated (agreed or
  disagreed): `agreed.length + disagreed.length >= quotesToEvaluate.length`.
  This is the existing `isDone` in `src/utils/raceProgressState.ts:22`.
- **Race complete** ⟺ every *live scorable* topic is done
  (`doneTopics >= rankableTopicCount`). Completion is **derived**, never set as a
  side effect of revealing.
- **Reveal is not completion.** Revealing produces the ballot for the topics
  evaluated so far and always leaves the race open to continue.

### The reveal surface

There is **one** reveal surface — the combined candidate ballot (today's
`ResultsPhase`) — shown progressively. It reflects whatever verdicts the user has
cast so far, so after two topics it ranks candidates across those two topics.
"See your full ballot" at the end is the same surface with every topic present.

There is **no** separate per-topic identity reveal.

### Blindness note (intentional invariant evolution)

The reveal only ever includes topics the user has already ranked, so ranking
stays blind: quotes are never attributed on the card. A candidate's
`candidateToken` is stable across topics, so revealing a partial ballot does
associate a name with a token — but the token is never surfaced in the UI (only
in devtools, where the whole blind payload is already visible), so a user cannot
carry that association into an unranked topic's blind cards. This is an accepted,
owner-approved refinement of the CLAUDE.md / REDESIGN_SPEC "blindness is
structural" invariant: **provenance may debut incrementally as topics are
revealed, rather than once per race.** CLAUDE.md should be updated to match when
this ships.

## Flow

```
First entry
  Issue selection ("Choose your issues")   — pick a subset, e.g. 2 of 7
  → Evaluate topic 1 (all quotes)
      complete state: primary "Next topic →"; "Reveal ballot" available (shows topic 1)
  → Evaluate topic 2 (all quotes)
      complete state: primary "Reveal ballot" (shows topics 1 + 2) when it is the
      last selected-and-unrevealed topic; else "Next topic →"

Re-entry (partial race)
  Issue selection / hub — topics 1 & 2 shown as ✓ done (not re-selectable for
  re-ranking here; tappable to re-view); remaining 5 selectable. User adds some.
  → Evaluate the newly selected topics (all quotes each)
  → last topic complete state: primary "See your full ballot →"
  → Combined race summary (all evaluated topics)

Re-entry (complete race: all rankable topics done)
  → Combined race summary directly, with a way back into the hub to re-view a
    single topic.
```

## Changes

### Store (`src/store/useReadRankStore.ts`)

- **Replace `finishRace` with `revealBallot`** (or repurpose): sets
  `phase: 'results'` but **does not** set `completed`. Reveal is re-enterable and
  reversible.
- **Stop forcing `completed` in `setPhase`** (`:275`). Remove the
  `completed: phase === 'results' ? true : …` coupling.
- **`completed` becomes derived, not stored-on-reveal.** Compute race completion
  from topic done-state against the live scorable count. Where the store needs a
  boolean (e.g. routing), derive it via a helper (`isRaceComplete(race,
  rankableTopicCount)`); the persisted `completed` field is retired or ignored
  for routing. Migrate persisted races: an existing `completed: true` race whose
  topics are not all done is treated as in-progress.
- **`selectRace` re-entry routing** (`:291`): choose the landing phase from
  completion state, not the saved `race.phase`:
  - not started → `issue-selection`
  - in progress (≥1 topic done, not all) → `issue-selection` (the hub)
  - complete (all rankable done) → `results`
  The `rankableTopicCount` needed for this comes from the `RaceSummary` the hub
  already holds; pass it through `selectRace`'s `meta`, or fall back to the
  scorable topics visible in progress.

### Issue selection as the re-entry hub (`src/components/IssueSelection.tsx`)

- On re-entry, mark already-**done** topics with a done affordance (✓, "Ranked",
  disabled-from-reselection but tappable to re-view their slice of the ballot).
- Present remaining scorable topics as selectable (default: unselected on
  re-entry so the user opts into more; on first entry keep the current
  all-selected default).
- Footer CTA reflects newly-selected work; when nothing new is selected but done
  topics exist, offer "See your ballot" instead of forcing a selection.
- Reuse the existing `TopicPickerSheet` styling/derivations where practical.

### Evaluation complete state (`src/components/EvaluationPhase.tsx`)

- The reveal CTA (`:79`) always renders and is enabled once ≥1 quote is ranked
  anywhere in the race (unchanged gate), but its label and prominence depend on
  position:
  - more selected topics still unranked → primary "Next topic →", secondary
    "Reveal ballot".
  - last selected topic, but the race is **not** yet complete (rankable topics
    remain, e.g. 2 of 7) → primary "Reveal ballot" (shows the topics evaluated so
    far — not billed as the "full" ballot).
  - last selected topic **and** this completes the race (all rankable topics
    done) → primary "See your full ballot →".
- `finishRace` call site becomes `revealBallot`.

### Reveal surface (`src/components/ResultsPhase.tsx`)

- Add a **continue path** when the race is not yet complete: alongside/above
  "Play another race near you", show "← Back to your topics" (routes to the
  issue-selection hub) so a mid-race reveal is not a dead end.
- When the race **is** complete, keep the existing "Play another race" exit and
  add a subtle "Review a topic" affordance back into the hub.
- Header copy adapts: partial ballot vs. full ballot.

### Progress display (fixes issue #2)

- **Hub label** (`src/utils/raceProgressState.ts`): with `completed` no longer
  set on reveal, an in-progress race stays in the `in-progress` state and shows
  `Continue · {doneTopics} of {rankableTopicCount} topics`. Denominator is the
  **live rankable count**, not the user's current selection, so it invites
  finishing everything. `complete` ("Completed") is reached only at
  `doneTopics >= rankableTopicCount`. The `partial` state is effectively retired
  (no longer produced by the reveal path); keep the branch for safety/migration.
- **Browse parity** (`src/components/RaceBrowse.tsx:136`): pass `progress` /
  `progressLabel` to the `RaceCard`s it builds, matching `RaceHub`
  (`RaceHub.tsx:151`), so the status badge shows in search/browse results too.

### Routing (`src/hooks/useRaceRouteSync.ts`)

- `STEP_BY_PHASE` already maps `issue-selection → topics`, `evaluation → read`,
  `results → results`; no new steps needed. Confirm `resumeRaceFromUrl` +
  `selectRace` agree on the completion-derived landing so a refresh mid-flow and
  a hub click resolve consistently.

## Out of scope

- Backend / reveal API changes: `fetchRaceReveal` already accepts the verdicts to
  date and returns a whole-race ballot; a partial ballot is just fewer verdicts.
- Per-topic reveal endpoint (not needed — single progressive ballot).
- Changing the ranking/verdict interaction itself.
- Retroactive migration UI for the handful of races already flagged `completed`
  in a user's localStorage beyond the routing-derivation fallback above.

## Testing

- **Store unit tests:** revealing after one topic leaves `completed`-derivation
  false and race re-enterable; race derives complete only when all rankable
  topics done; `selectRace` landing phase per completion state; migration of a
  stale persisted `completed: true` partial race.
- **`raceProgressState` tests:** in-progress label denominator = rankable count;
  "Completed" only at full; Browse cards receive labels.
- **Flow/integration:** first-entry → 2 topics → reveal shows 2 → back to hub →
  add topics → full ballot; re-entry of a partial race lands on the hub; re-entry
  of a complete race lands on the ballot.
- **Blindness guard:** ranking cards never show attribution; the reveal includes
  only evaluated topics.
