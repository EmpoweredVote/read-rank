# Read & Rank 2026 Content Pipeline — Design

**Date:** 2026-07-31
**Status:** Implemented — queue live and seeded (607 races, 2026-07-31), sessions running via the `race-pipeline` skill in on-the-record
**Owner repos:** read-rank (this spec), on-the-record (curation skills + playbook), ev-accounts DB (data + work queue)

## Goal

Make Read & Rank genuinely useful for the 2026 cycle:

1. **Deep markets:** full contested-ballot coverage for Bloomington/Monroe County, IN and Los Angeles, CA.
2. **Everyone else:** rankable Governor, US Senate, and US Representative races nationwide.

"Rankable" means what the app already enforces: a topic ships only when **≥2 candidates in the
race have a selected quote on that topic** (REDESIGN_SPEC §8), every quote is the candidate's
verbatim words with verified provenance, and the blind card carries no identity vectors.

## Current state (measured 2026-07-31, ev-accounts DB)

| Category | Races in DB | States | Rankable (≥2 quoted cands) | Zero quotes |
|---|---|---|---|---|
| Governor | 13 | 9 | 4 | 7 |
| US Senate | 51 | 35 | 30 | 9 |
| US House | 463 | 50 | 135 | 232 |

- **~26 of the 36 states electing governors in 2026 have no Governor race in the DB.** Race
  creation is part of this project, not just quote sourcing.
- **Bloomington/Monroe:** only May 5 primary races exist (mostly single-candidate, near-zero
  quotes). The Nov 3 general races do not exist yet.
- **LA:** only June 2 primary races exist (25 races, zero quotes) plus LA Mayor general
  (14 candidates, 2 quoted). Nov general/runoff races need creating from primary results.

## Scope decisions (settled with Chris, 2026-07-31)

1. **House coverage is tiered.** Contested races (≥2 major candidates on the November ballot)
   first; unopposed/safe remainder later. Governor and Senate complete before the House grind.
2. **Primaries first.** Contested Gov/Senate/House primaries in the Aug/Sep states (MI Aug 4,
   WI/MN Aug 11, AK/FL/WY Aug 18, MA Sep 1, NH Sep 8, RI Sep 9, DE Sep 15) are urgent deadline
   work; then everything points at Nov 3. MI (4 days out) is best-effort only.
3. **Race creation is in scope.** Agents research rosters and insert into
   `essentials.elections` / `races` / `race_candidates` via SQL, following existing schema
   conventions, with a verification pass before rows land.
4. **Source bar: the curation-principles tier hierarchy, applied at sourcing time.** Sourcing
   agents hunt down the hierarchy in order (QUOTE-CURATION-PRINCIPLES §5, enforced by
   audit-quotes' `source-tier-4` check): **tier 1** debates & candidate forums, **tier 2** news
   interviews, **tier 3** prepared public remarks (stump/floor speeches, testimony), **tier 4**
   candidate-bylined written (op-eds, platform — verbatim sentences only, never summarized
   bullets) *with a justification note*, and **tier 5 hard-excluded** (hot-mic, private,
   off-the-cuff gotcha). Spoken tiers deep-link to video with timestamps. Social media is a
   distribution channel, not a source type — classify by the utterance.
5. **Deep markets = full contested ballot.** Every race a Bloomington or LA voter sees in
   November with ≥2 candidates: county/city offices, school board, township, state legislative,
   plus their slice of statewide + federal. Skip uncontested races and judicial races/retention.
6. **Tracking lives in the DB** as a work-queue table (below). No parallel markdown tracker.
7. **Pipeline shape: single assembly line.** Every race moves through the same lifecycle;
   sessions pull the highest-priority work regardless of category.

## Component 1: the work queue

New table `essentials.readrank_race_pipeline` (ev-accounts DB) — one row per target race:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `race_id` | uuid null, FK → `essentials.races` | null until the race exists |
| `race_label` | text | human-readable, e.g. "MI Governor (D primary)" |
| `state` | char(2) | |
| `office_category` | text | `governor` \| `us_senate` \| `us_house` \| `local_bloomington` \| `local_la` |
| `election_date` | date | |
| `election_kind` | text | `primary` \| `general` |
| `priority_tier` | smallint | 1 imminent primary · 2 deep market · 3 Governor · 4 US Senate · 5 House contested · 6 House remainder |
| `status` | text | `needs_race` → `needs_roster` → `needs_quotes` → `quotes_staged` → `published` → `audited`; plus `blocked`, `skipped` |
| `status_reason` | text null | required for `blocked`/`skipped` (e.g. "uncontested") |
| `quoted_candidates` | int | refreshed counter |
| `rankable_topics` | int | refreshed counter |
| `claimed_by` | text null | session/agent identifier |
| `claimed_at` | timestamptz null | stale claims (>2h) are reclaimable |
| `notes` | text | |
| `source_urls` | text[] | roster/provenance research links |
| `created_at`, `updated_at` | timestamptz | |

**Priority rule (the only one):** `election_date` ascending, then `priority_tier` ascending. A "next
task" query is `select … where status not in ('audited','skipped') and (claimed_at is null or
claimed_at < now() - interval '2 hours') order by election_date, priority_tier limit N`.

Status meanings:

- `needs_race` — race (and possibly election) rows don't exist yet
- `needs_roster` — race exists; certified candidate list not yet complete/verified
- `needs_quotes` — roster done; per-candidate sourcing not yet at rankable coverage
- `quotes_staged` — quotes drafted/staged, ready for publish-quotes
- `published` — publish-quotes ran (which auto-runs audit-quotes)
- `audited` — audit clean; done
- `blocked` — needs human judgment (audit failure, unverifiable roster, no findable quotes)
- `skipped` — deliberately out of scope with reason

## Component 2: seeding the queue

Three passes, in order:

**Pass A — from the DB (SQL only).** Insert rows for every existing 2026 Gov/Senate/House race
and the Bloomington/LA locals, with coverage counters computed from `essentials.quotes`
(`readrank_selected`) joined through `race_candidates.politician_id`. Existing races start at
`needs_roster` (roster incomplete/unverified) or `needs_quotes` (roster done); races that
already have live `readrank_selected` quotes enter as `published` and go straight to the
audit step.

**Pass B — gap research (parallel cheap-model agents).** Five research lanes:

1. Missing Governor races: the 36-state 2026 gubernatorial map vs. the DB; general-election
   fields for each missing state.
2. Upcoming contested primaries: Gov/Senate/House primaries still ahead (Aug/Sep states),
   contested fields only.
3. Monroe County Nov 3 general: full contested ballot (county offices, township, school board,
   state legislative districts covering Bloomington, IN-09).
4. LA Nov 3 general: which June 2 primary races resolved outright vs. runoff in November, plus
   citywide/county/LAUSD/state-legislative contested races.
5. House contested-classification: all 435 districts bucketed into priority tier 5 (≥2 major
   candidates on the November ballot) vs. tier 6.

Sources: Ballotpedia (verify-then-descend to the original source per the established
re-attribution method), state SOS certified candidate lists. No aggregators (the
ontheissues/wikipedia purge policy stands).

**Pass C — verify + insert.** A checker agent spot-verifies each research lane against a second
source (SOS list vs. Ballotpedia) before pipeline rows are inserted. Discrepancies → the row
lands as `blocked` with notes rather than silently wrong.

## Component 3: per-race lifecycle tasks

Each status transition is one bounded task suitable for a cheap-model agent:

1. **needs_race → needs_roster.** Create `elections`/`races` rows following existing conventions
   (mirror how `CA Governor` / `2026 LA County General` are modeled; reuse existing election rows
   where one exists for that state+date).
2. **needs_roster → needs_quotes.** Insert `race_candidates` rows: full name, party
   (`primary_party` on race for primaries), incumbency, website, `source`, `candidate_status`,
   `external_id` where available. Certified SOS list is the roster of record.
3. **needs_quotes → quotes_staged.** Per candidate: hunt down the source-tier hierarchy —
   debates/forums first, then interviews, then prepared remarks, then bylined written (with a
   justification note); capture timestamp deep links for anything spoken. Extract verbatim
   quotes mapped to Compass topics. **Sourcing agents curate against the audit-quotes check
   catalog up front** (`on-the-record/.claude/skills/audit-quotes/CHECKS.md`) so quotes arrive
   audit-clean rather than getting flagged later: forward-looking operative clause (not record,
   not attack-on-person), genuinely answers the topic's *ranking question* (per-race override
   if active, else Compass), verbatim (never curator-summarized), honest de-identification
   (`…`/`[brackets]`, no self-ID or partisan tells), one live quote per candidate per topic,
   coupling to the Compass value noted, and prefer quotes that state the HOW over agreeable
   mechanism-free goals. Target: every topic shipped has ≥2 candidates quoted; a topic that
   can't reach 2 doesn't ship for that race.
4. **quotes_staged → published.** Run the **publish-quotes** skill
   (`on-the-record/.claude/skills/publish-quotes/`) — the SOP for insertion into
   `essentials.quotes`, de-identification, editor notes, and Compass-stance coupling. It
   auto-runs **audit-quotes**.
5. **published → audited.** Audit clean → done, counters refreshed. Audit findings that a fix
   pass can't clear → `blocked` with notes.

Model guidance: roster/classification research on the cheapest capable model (Haiku-class);
quote extraction and de-identification on a mid-tier model (Sonnet-class); publish/audit gates
and blindness judgment stay on a strong model.

## Component 4: session model

A working session ("pipeline session"):

1. Query the queue for the top N unclaimed races (typically 10–20); claim them.
2. Fan out one agent per race (or per candidate for big quote jobs) to do the pending
   transition; agents run in parallel.
3. Publish/audit steps run from the on-the-record repo where the skills live.
4. Update statuses, refresh `quoted_candidates`/`rankable_topics`, release claims, and print a
   coverage snapshot (rankable races by category vs. target).

The queue is the cross-session memory; any session can stop at any point without losing state.
A **pipeline-session playbook** documenting steps 1–4 (including the exact queue SQL and agent
prompts) is committed alongside publish-quotes/audit-quotes in on-the-record.

## Quality gates (invariants, unchanged)

- **Verbatim words, verified provenance.** Canonical rules:
  `essentials/docs/QUOTE-CURATION-PRINCIPLES.md`; audit mechanics in
  `on-the-record/.claude/skills/audit-quotes/CHECKS.md`. The check catalog doubles as the
  **sourcing rubric** — agents read it before hunting quotes, not just at audit time.
- **Source tiers.** 1 debates/forums · 2 news interviews · 3 prepared remarks · 4
  candidate-bylined written (justification note required) · 5 hot-mic/private/gotcha
  (hard-excluded). Ballotpedia is a *finding aid* to descend from, never cited as the source —
  except Candidate Connection surveys, where Ballotpedia is the original publisher. Quiz sites
  (isidewith.com) publish nothing quotable; aggregators (ontheissues, wikipedia) get
  re-attributed to the original, never cited.
- **Blindness is structural.** `deidentified_text` must carry no identity vectors (names,
  district references, "as sheriff…", signature phrases). Audit-quotes enforces; blind cards
  never show attribution.
- **≥2 candidate quotes per topic** or the topic doesn't ship (a topic with one voice is not a
  comparison).
- **Editor notes** follow the house style: standalone justification of edits + compass-stance
  alignment, no principle-section references.
- **Quotes attach to the politician,** not the race — primary-season sourcing carries into the
  general automatically when candidates advance.

## Explicitly out of scope

- Judicial races and retention questions (even contested ones) — this cycle.
- Uncontested races (recorded as `skipped`/uncontested so the decision is visible).
- Any read-rank app code changes — this is a content/data project; the app already renders
  whatever becomes rankable.
- Building new admin UI; all writes go through SQL + the existing skills.

## Risks

- **MI Aug 4 primary** is 4 days out — flagged best-effort; likely partial or missed.
- **LA runoff math** depends on official June 2 results (outright wins vs. runoffs); the
  research lane must use certified results, not projections.
- **House tier 5 volume** (~150–250 contested races × several candidates) is the long pole;
  the tier system exists so Gov/Senate/deep markets never wait behind it.
- **Parallel-agent collisions** on the queue are handled by `claimed_by`/`claimed_at` with a
  2-hour staleness rule.

## Success criteria

1. Queue seeded and verified: every target race has a row with correct priority_tier/date/status.
2. Deep markets: 100% of contested Bloomington + LA November races `audited`.
3. Governor + Senate: every 2026 general race `audited` (rankable) before early voting starts
   (goal: Oct 1).
4. House: all tier-5 contested races `audited` by Nov 3; tier 6 as capacity allows.
5. Every published quote passes audit-quotes; zero aggregator-sourced quotes.
