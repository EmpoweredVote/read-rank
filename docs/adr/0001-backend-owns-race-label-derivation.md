# Backend owns race-label derivation (office / seat / jurisdiction)

## Status

accepted

## Context

Race tiles rendered inconsistently: the same title slot held a bare office, an
office with the district baked in, an un-normalized string (`District 061`,
`Ninth District`), or — for Utah-style legislative seats — the *state name*
(`Utah`) with the office word missing entirely.

The cause was in the read-rank backend (`readrankService.ts`): it built the
title with a lossy suffix-strip — taking `essentials.races.position_name` and
chopping the district `label` off the end. For `"Utah State House District 21"`
that left `"Utah"`, destroying the office at the DB layer. A frontend-only fix is
therefore impossible: the office word is already gone by the time the client
sees it.

## Decision

The backend owns label derivation and emits three clean, ready-to-render fields —
`office`, `seat`, `jurisdiction` — using `district_type` (now selected from
`essentials.districts`) as the reliable signal. The read-rank frontend does no
string parsing; the card is a dumb display surface. This keeps a single source of
truth and matches Essentials' presentation by sharing its derivation *rules*
rather than its client-side parsing code.

The rule has two families:

1. **Legislative seats** (`STATE_LOWER/UPPER`, `NATIONAL_LOWER/UPPER`) — office is
   a fixed, chamber-neutral title from `district_type`
   (`STATE_LOWER`→"State Representative", `STATE_UPPER`→"State Senator",
   `NATIONAL_LOWER`→"US Representative", `NATIONAL_UPPER`→"US Senator"); the place
   is demoted to the jurisdiction line; the number is promoted to `seat`
   (`"State House District 21"` → `"District 21"`, ordinal words → numbers, leading
   zeros stripped).
2. **Executive / local offices** (`COUNTY`, `LOCAL`, `LOCAL_EXEC`, `SCHOOL`,
   statewide execs) — office = cleaned `position_name`, keeping the place where it
   is the office's natural name (`Los Angeles Mayor`, `Monroe County Commissioner`),
   but dropping a redundant statewide prefix so `Governor` stands alone (the
   jurisdiction line already carries the state). `seat` = cleaned `label` when present.

## Considered alternatives

- **Frontend ports Essentials' `cleanPositionName` / `deriveCardTitleSubtitle`.**
  Rejected: Essentials' splitter assumes `"Office, District"` with a comma and
  cannot recover the office from `"Utah State House District 21"`. We would have to
  fix the backend anyway *and* carry parser code on a blindness-sensitive client.
- **Fix the upstream `essentials` source data.** Out of scope; shared with other
  consumers and slow to change.

## Consequences

- Read-rank's `RaceSummary` contract changes: `positionName` + `districtLabel` are
  replaced by `office` / `seat` (jurisdiction line already derives from `state` +
  `electionDate`). Frontend `deriveTierScope` / display code updates accordingly.
- The chamber-neutral office map is a small fixed table that must be kept in sync
  if Essentials revises its office labels.
