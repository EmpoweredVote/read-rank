# Read & Rank — Context

A glossary of the domain language used in Read & Rank. Definitions only — no
implementation details, no specs. When a term here conflicts with how the code
or a conversation uses a word, that conflict is a bug in one of them.

## Terms

### Race
A single contest a user can play: one office, in one jurisdiction, decided on one
election date, among two or more candidates. The unit a `RaceCard` represents.

### Race label (the three zones)
The canonical anatomy every race tile renders into. Decided to mirror how
Essentials presents politician and election cards. Three zones, each with one job:

1. **Jurisdiction line** — place + election context, e.g. `Indiana · May 5, 2026`.
2. **Office** — the position being sought, with no district baked in, e.g.
   `US Representative`, `State House`, `Governor`, `Mayor`,
   `County Commissioner`.
3. **Seat** — *which* seat within that office, e.g. `District 21`, `At-Large`,
   `Ward 3`, `Division 5`. Absent for single-seat offices (Governor, Mayor).

The bug being fixed: today the backend mangles these — the office word is
sometimes destroyed (Utah tiles show `Utah` as the office) and the district is
sometimes baked into the office, sometimes split out, inconsistently per race.

### Office
The position being sought, independent of which seat. `Governor`,
`State Representative`, `US Representative`, `Mayor`. NOT the chamber alone where
an office word exists, though source data sometimes encodes the office only as a
chamber (`State House` ⇒ office is a State Representative seat).

### Seat
The specific seat within an office. Usually a numbered district (`District 21`),
but also non-geographic: `At-Large`, `Ward 3`, judicial `Division 5`. "District"
is too narrow a word for this zone because at-large and ward seats are not
districts.

### Topic
A single issue within a race (e.g. "Housing", "Cannabis Legalization"). A race
groups its quotes by topic. Each topic keeps its own independent ranking.

### Scorable topic
A topic with at least two candidates' quotes — the only topics that can be
ranked. A topic with one voice is not a comparison and is shown as NOT SCORED,
never rankable.

### Selected topics
The subset of scorable topics a user chose to work on when they entered a race.
Selection is "what I'm working on now," not a permanent lock on what exists — a
user may rank a subset, reveal, and later return to rank the rest.

### Topic done
A topic where the user has rendered a verdict on every quote in it. Agree and
disagree both count — "done" is about judgment coverage, not agreement.

### Progress state (a race, per user)
What a race tile communicates to a returning user. Defined on two axes: has the
user revealed, and have they finished every *currently scorable* topic. Four states:
- **Not started** — no stored progress.
- **In progress** — started but has not revealed. A user who finished every quote
  in their selected topics but bounced before revealing is still In progress, with
  a "Reveal your ballot" call to action.
- **Partially complete** — revealed, but scorable topics remain undone (skipped at
  selection, or newly added since). Surfaced as a calm, informational signal
  ("Ranked 2 of 4"), never as guilt or pressure (the brief forbids dark patterns).
- **Complete** — revealed AND every currently-scorable topic done.

Completeness is measured against the *live* scorable-topic count
(`rankableTopicCount` from the races API), not a snapshot from play time. So when
the backend gains quotes that make a new topic scorable, a previously Complete
race automatically reverts to Partially complete. A "N new topics" label on that
transition is a deliberate future step, not built yet.
