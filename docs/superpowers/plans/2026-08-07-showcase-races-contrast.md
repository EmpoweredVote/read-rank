# Showcase Races — Contrast as the Shipping Bar: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CA Governor and LA Mayor exemplars where every shipped question is either a real choice or an honest convergence, and leave behind reusable machinery — the comparability rubric encoded in `audit-quotes`, a casebook of binding rulings, and aimed discovery — that applies the same bar to any race.

**Architecture:** Most of this is **documentation and data, not application code.** `audit-quotes`' judgment pass has no Python — it is a prompt template in `CHECKS.md §4` that the skill-following agent dispatches via the Agent tool, so most checks are catalog rows plus prompt text. The code work is confined to four things: a race-attribution bug in the audit's scope SQL, grouping the audit bundle by question as well as topic, retiring one mechanical check, and converting four compass-topic joins in the ev-accounts payload so a question can ship without a live compass topic.

**Relationship to prior design.** This plan implements the deferred *"compelling/contrast layer"* of `on-the-record/docs/superpowers/specs/2026-07-21-readrank-question-as-unit-design.md`, following the rubric in its companion `2026-07-23-readrank-comparability-model.md` (§4 rankability, §7 the seven dimensions, §8 the differentiation guardrail, §11 the casebook). Where this plan and those specs differ, **those specs win** — they carry five races of empirical grounding. Read both before starting.

**Tech Stack:** Python 3 (psycopg2, pytest) for the `audit-quotes` skill scripts; TypeScript + vitest for the ev-accounts services; raw SQL migrations in `ev-accounts/backend/migrations/`; Markdown for the skill catalogs, the casebook and the principles doc.

**Spec:** `read-rank/docs/superpowers/specs/2026-08-07-showcase-races-contrast-design.md`

---

## Repos touched

| Repo | Path | What changes |
|---|---|---|
| ev-accounts | `backend/migrations/` | Repoint the LA Mayor pipeline row (Task 1) |
| ev-accounts | `backend/src/lib/readrankService.ts` | Four compass-topic joins → LEFT, with fallbacks (Task 2) |
| on-the-record | `.claude/skills/audit-quotes/` | Race attribution, question-grouped bundle, rubric checks, `CASEBOOK.md`, `SKILL.md` |
| on-the-record | `.claude/skills/race-pipeline/SKILL.md` | Shared-question sourcing + directness hierarchy |
| on-the-record | `tests/` | New tests for the audit scripts (none existed) |
| essentials | `docs/QUOTE-CURATION-PRINCIPLES.md` | §4.6 per-set layer; §5 directness; §7.3 off-axis |
| read-rank | `docs/superpowers/specs/` | Status update at the end |

## File structure

**Created:**
- `ev-accounts/backend/migrations/1564_repoint_la_mayor_pipeline_row.sql` — Task 1
- `on-the-record/.claude/skills/audit-quotes/CASEBOOK.md` — Task 14
- `on-the-record/tests/test_audit_scope.py` — race-attribution regression (Task 3)
- `on-the-record/tests/test_audit_checks.py` — stance/checks regression (Tasks 4, 5)
- `on-the-record/tests/test_audit_bundle.py` — bundle-grouping regression (Task 4)

**Already created and applied (Task 9, done 2026-08-07):**
- `ev-accounts/backend/migrations/1566_backfill_la_mayor_debate_provenance.sql`
- `ev-accounts/backend/migrations/1567_dedupe_la_mayor_debate_quotes.sql`
- `on-the-record/docs/audits/2026-08-07-la-mayor-orphan-quote-provenance.md`

**Modified:**
- `ev-accounts/backend/src/lib/readrankService.ts` — compass-topic joins + title/question fallbacks
- `on-the-record/.claude/skills/audit-quotes/scripts/db.py` — race attribution, question columns
- `on-the-record/.claude/skills/audit-quotes/scripts/audit.py` — `build_bundle` extraction
- `on-the-record/.claude/skills/audit-quotes/scripts/checks.py` — retire `check_source_tier`
- `on-the-record/.claude/skills/audit-quotes/CHECKS.md` — rubric checks, per-set pass, casebook pointer
- `on-the-record/.claude/skills/audit-quotes/SKILL.md` — workflow wiring
- `on-the-record/.claude/skills/race-pipeline/SKILL.md` — shared-question sourcing
- `essentials/docs/QUOTE-CURATION-PRINCIPLES.md` — §4.6, §5, §7.3

**Boundary notes.** `SCOPE_SQL` is a module-level string interpolated by `fetch_rows`; Task 3 extracts the race expression into a named helper and Task 4 adds question columns, both so they are testable without a database. Task 4 extracts `build_bundle` out of `audit.py`'s `main()` for the same reason. Those are the only structural changes; everything else is additive.
---

## Environment

All Python commands run from the on-the-record checkout with its venv:

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
```

The audit scripts are invoked as a module from the skill directory (module path resolution):

```bash
cd .claude/skills/audit-quotes && ../../../.venv/bin/python -m scripts.audit --help
```

Tests run from the repo root:

```bash
.venv/bin/python -m pytest tests/ -v
```

## Constants used throughout

| Thing | Value |
|---|---|
| CA Governor race | `bc936a36-287c-4ffd-abd8-5e4fd798bae5` |
| LA Mayor **general** race (correct) | `9e888818-c50b-4c61-a106-a0839ff2479d` |
| LA Mayor **primary** race (wrong) | `24bc3631-22cf-41ab-a731-672481502214` |
| LA Mayor pipeline row | `9612b60a-ca29-4da4-9dda-8ff34baf7d9e` |
| Steve Hilton | `9a60d603-194d-410f-ae01-85bd6293f1a7` |
| Xavier Becerra | `0f74219c-7d10-4d29-85fe-0f1d834df8a7` |
| Karen Bass | `21c9e711-fb18-4afb-884f-08acd2b598ba` |
| Nithya Raman | `26dbe16a-9dff-42c0-939f-5b5e529063ca` |

**Production database.** Every migration and every `apply_fixes.py` run is against production. Dry-run and show the user the diff before committing, without exception.

---

## Task 1: Repoint the LA Mayor pipeline row (spec 0a) — ✅ DONE 2026-08-07

**Applied** as `ev-accounts/backend/migrations/1564_repoint_la_mayor_pipeline_row.sql`. Dry-run
first; both guards passed. Pipeline row `9612b60a` now carries `9e888818` (the November general).

Verified through discovery's own code path rather than only by reading the row back:
`src.discovery.db.fetch_tracked_candidates` now returns exactly **Karen Ruth Bass** and
**Nithya Raman** on race `9e888818` — previously 14 names, 12 of them eliminated primary
candidates. `refresh_readrank_pipeline_counters()` re-run; `rankable_topics` stays at 1, which is
correct (both candidates sit on both rosters, and `public-safety-approach` is still the only topic
with two live quotes).

The original step list is kept below for the record.

---

### Original steps

**Files:**
- Create: `ev-accounts/backend/migrations/1564_repoint_la_mayor_pipeline_row.sql`

- [ ] **Step 1: Confirm the current wrong state**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python - <<'PY'
import pathlib, sys
sys.path.insert(0, ".claude/skills/_shared")
from ev_env import ev_accounts_database_url
import psycopg2
conn = psycopg2.connect(ev_accounts_database_url("."))
cur = conn.cursor()
cur.execute("""
  select id::text, race_label, race_id::text, status
  from essentials.readrank_race_pipeline
  where id = '9612b60a-ca29-4da4-9dda-8ff34baf7d9e'
""")
print(cur.fetchall())
PY
```

Expected: one row whose `race_id` is `24bc3631-22cf-41ab-a731-672481502214` (the primary).

- [ ] **Step 2: Write the migration**

```sql
-- 1564_repoint_la_mayor_pipeline_row.sql
-- The Read & Rank pipeline row labelled "Los Angeles Mayor (CA, 2026-11-03)" carried the
-- race_id of the JUNE 2 PRIMARY race (24bc3631, 14 candidates, 12 eliminated) instead of the
-- November general/runoff (9e888818, Bass v Raman).
--
-- Consequence: src/discovery/db.py::fetch_tracked_candidates joins the pipeline to
-- race_candidates on race_id, so source discovery would hunt quotes for the eliminated
-- primary field and ignore the two candidates actually on the November ballot.
-- refresh_readrank_pipeline_counters() also counted rankable_topics against the wrong roster.

BEGIN;

UPDATE essentials.readrank_race_pipeline
   SET race_id = '9e888818-c50b-4c61-a106-a0839ff2479d'
 WHERE id = '9612b60a-ca29-4da4-9dda-8ff34baf7d9e'
   AND race_id = '24bc3631-22cf-41ab-a731-672481502214';

-- Guard: exactly one row must have moved.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM essentials.readrank_race_pipeline
   WHERE id = '9612b60a-ca29-4da4-9dda-8ff34baf7d9e'
     AND race_id = '9e888818-c50b-4c61-a106-a0839ff2479d';
  IF n <> 1 THEN
    RAISE EXCEPTION 'expected the LA Mayor pipeline row to point at the general race, found % row(s)', n;
  END IF;
END $$;

COMMIT;
```

- [ ] **Step 3: Apply the migration**

Apply it the way this repo normally applies a numbered migration (psql against the ev-accounts
`DATABASE_URL`). Show the user the statement and get an explicit OK before running — this is
production.

Expected: `UPDATE 1`, then `COMMIT`. The `DO` block raises and rolls back if anything is off.

- [ ] **Step 4: Verify, including the counter refresh**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python - <<'PY'
import pathlib, sys
sys.path.insert(0, ".claude/skills/_shared")
from ev_env import ev_accounts_database_url
import psycopg2
conn = psycopg2.connect(ev_accounts_database_url("."))
cur = conn.cursor()
cur.execute("select essentials.refresh_readrank_pipeline_counters()")
conn.commit()
cur.execute("""
  select race_label, race_id::text, status, rankable_topics
  from essentials.readrank_race_pipeline
  where id = '9612b60a-ca29-4da4-9dda-8ff34baf7d9e'
""")
print(cur.fetchall())
cur.execute("""
  select count(*) from essentials.race_candidates rc
  join essentials.readrank_race_pipeline p on p.race_id = rc.race_id
  where p.id = '9612b60a-ca29-4da4-9dda-8ff34baf7d9e'
    and coalesce(rc.candidate_status,'active') not in ('withdrawn','removed')
""")
print("tracked candidates:", cur.fetchone())
PY
```

Expected: `race_id` is `9e888818-…`, and **tracked candidates: (2,)** — Bass and Raman, not 14.

- [ ] **Step 5: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/ev-accounts
git add backend/migrations/1564_repoint_la_mayor_pipeline_row.sql
git commit -m "fix(pipeline): point the LA Mayor row at the November general, not the June primary

fetch_tracked_candidates joins the pipeline to race_candidates on race_id, so
source discovery would have hunted quotes for the 12 eliminated primary
candidates and skipped Bass and Raman entirely.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Let a question ship without a live compass topic (spec Part 2, revised)

**Files:**
- Modify: `ev-accounts/backend/src/lib/readrankService.ts` (four join sites: 314, 333, 535, 603)
- Test: `ev-accounts/backend/src/lib/readrankService.test.ts`

**Why this replaced the original task.** The original added `off_axis` + `question_source_url` to
`essentials.readrank_race_topic_questions`. Three things were wrong with that:

1. That table is slated for retirement — the question-as-unit design folds it into
   `essentials.readrank_questions`.
2. **There is no FK to relax.** `readrank_questions.topic_key` has only `NOT NULL` and a lowercase
   CHECK; no foreign key to `inform.compass_topics` exists. The casebook's diagnosis names the
   wrong mechanism.
3. What actually blocks a non-compass question is the **read path** — four inner joins on
   `inform.compass_topics … AND ct.is_live = true`. A quote whose topic isn't a live compass topic
   is invisible to the app no matter what the DB permits.

This is the MI Senate Israel-aid case from the casebook: a genuinely salient 2-way comparison that
could not ship because no foreign-policy compass topic exists.

`readrankQuestionsService.ts:30` already documents half of this deliberately — it does *not* gate on
`is_live` precisely so emergent/moderator questions survive. This task brings the evaluation payload
into line.

**The trap to avoid.** A naive `INNER` → `LEFT` conversion silently destroys a kill switch:
`is_live = false` on a compass topic currently pulls it out of Read & Rank everywhere. With the
predicate in a `LEFT JOIN`'s `ON` clause, a non-live topic produces `ct IS NULL` and the row
**survives** — the opposite of what `is_live` is for. The predicate must become *"either there is no
compass topic at all, or the compass topic is live."*

- [ ] **Step 1: Write the failing tests**

Add to `ev-accounts/backend/src/lib/readrankService.test.ts`:

```ts
describe('non-compass topics', () => {
  it('surfaces a quote whose topic_key has no compass_topics row', async () => {
    // israel-aid has no row in inform.compass_topics
    const payload = await getRaceBlindQuotes(RACE_WITH_NON_COMPASS_TOPIC);
    const keys = payload!.topics.map((t) => t.topicKey);
    expect(keys).toContain('israel-aid');
  });

  it('still hides a quote whose compass topic exists but is not live', async () => {
    // the is_live kill switch must survive the LEFT JOIN conversion
    const payload = await getRaceBlindQuotes(RACE_WITH_RETIRED_TOPIC);
    const keys = payload!.topics.map((t) => t.topicKey);
    expect(keys).not.toContain(RETIRED_TOPIC_KEY);
  });

  it('falls back to the question text when there is no compass question', async () => {
    const payload = await getRaceBlindQuotes(RACE_WITH_NON_COMPASS_TOPIC);
    const topic = payload!.topics.find((t) => t.topicKey === 'israel-aid');
    expect(topic!.question).toBe(MODERATOR_QUESTION_TEXT);
    expect(topic!.title).toBe('Israel Aid'); // derived from the key, not blank
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /Users/chrisandrews/Documents/GitHub/ev-accounts/backend
npm test -- readrankService
```

Expected: the three new tests fail — the first two because the inner join drops the row, the third
because `title` and `question` come back empty.

- [ ] **Step 3: Convert the four join sites**

At each of the four sites, replace

```sql
    JOIN inform.compass_topics ct
      ON ct.topic_key = lower(q.topic_key) AND ct.is_live = true
```

with

```sql
    LEFT JOIN inform.compass_topics ct
      ON ct.topic_key = lower(q.topic_key)
```

and add to that query's `WHERE` clause:

```sql
      AND (ct.topic_key IS NULL OR ct.is_live = true)
```

The four sites are the `rankable_topic_count` subquery (~314, where the predicate goes in the
subquery's own `WHERE`, and `ct2` is the alias), the race-list main join (~333), the evaluation
payload (~535) and the reveal payload (~603).

- [ ] **Step 4: Add the title and question fallbacks**

In the **evaluation payload** (`getRaceBlindQuotes`), join the question table and widen both
COALESCEs:

```sql
           COALESCE(ct.short_title, initcap(replace(lower(q.topic_key), '-', ' '))) AS topic_title,
           COALESCE(rq.question_text, rtq.question_text, ct.question_text) AS topic_question,
```

adding, alongside the existing `rtq` join:

```sql
    LEFT JOIN essentials.readrank_questions rq
      ON rq.id = q.question_id
```

In the **reveal payload**, apply the same title fallback:

```sql
           COALESCE(ct.short_title, initcap(replace(lower(q.topic_key), '-', ' '))) AS topic_title,
```

`initcap(replace(...))` turns `israel-aid` into `Israel Aid` — honest and readable, and it avoids a
blank heading. The question text is the display-critical field and now resolves
question → race-override → compass.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd /Users/chrisandrews/Documents/GitHub/ev-accounts/backend
npm test -- readrankService
```

Expected: all pass, including the pre-existing ones. If a pre-existing test breaks because more
races now appear in the list, that is the intended behaviour change — update the fixture, don't
weaken the assertion.

- [ ] **Step 6: Confirm nothing unexpected surfaced in production data**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python - <<'PY'
import sys
sys.path.insert(0, ".claude/skills/_shared")
from ev_env import ev_accounts_database_url
import psycopg2
conn = psycopg2.connect(ev_accounts_database_url("."))
cur = conn.cursor()
cur.execute("""
  select lower(q.topic_key), count(*)
  from essentials.quotes q
  left join inform.compass_topics ct on ct.topic_key = lower(q.topic_key)
  where q.readrank_selected and q.deidentified_text is not null and ct.topic_key is null
  group by 1 order by 2 desc
""")
print("LIVE quotes on non-compass topics (these become newly visible):")
for r in cur.fetchall(): print("  ", r)
PY
```

Expected: review the list before merging. Anything here starts appearing to citizens. If a
topic_key is a typo rather than a real local topic, fix the data — don't ship the typo as a heading.

- [ ] **Step 7: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/ev-accounts
git add backend/src/lib/readrankService.ts backend/src/lib/readrankService.test.ts
git commit -m "feat(readrank): let a question ship without a live compass topic

Four inner joins on inform.compass_topics gated every surface on the topic
spine, so a salient local question with no compass topic could not ship --
the MI Senate Israel-aid case. readrankQuestionsService already skipped the
is_live gate on purpose; this brings the evaluation payload into line.

The is_live kill switch is preserved: the predicate moves to WHERE as
(ct.topic_key IS NULL OR ct.is_live), so an existing-but-retired topic still
disappears while an unknown one passes through. Title falls back to the
topic key title-cased; question resolves question -> race override -> compass.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Fix race attribution in the audit's scope SQL (spec 0c) — ✅ DONE 2026-08-07

**Applied** on branch `fix/audit-race-attribution` (on-the-record), commits `b46e07c` + `fdbcc82`.
`SCOPE_SQL` is replaced by `race_id_expr(race)` and `build_scope_sql(race)`; `--race` is now
authoritative, unscoped runs keep the lowest-id fallback.

Verified read-only against production: `--race 9e888818-…` writes
`9e888818-c50b-4c61-a106-a0839ff2479d.json` (77 quotes, 22 race-topic groups, zero occurrences of
`24bc3631` anywhere in the bundle); `--candidate "Karen Ruth Bass"` unscoped still writes
`24bc3631-….json`. Full suite: **2049 passed, 3 skipped** (skips pre-existing, need `DATABASE_URL`
exported).

**Test gap found and closed.** The three tests this plan specified assert on the *shape of the
generated SQL string* — so a regression reverting `fetch_rows` to `build_scope_sql(None)` would
have passed all three while silently restoring the bug. A fourth and fifth test now drive
`fetch_rows` through a fake cursor and assert the scoped expression and the bound `race` parameter
actually arrive. Confirmed by breaking the call: only the new test goes red. **This was a defect in
the plan, not in the implementation.**

**Note on effect.** No ranking-question override exists on either LA Mayor race today, so all 77
quotes report `override_active: false` either way. The correction is *latent* — the stance lookup
now keys on the right race, so a future general-race override registers instead of being silently
missed. Do not expect the audit output to change beyond the bundle filename until Task 12 seeds
questions.

**Branch note.** `fix/audit-race-attribution` was cut from `research/la-mayor-quote-provenance`
rather than `main`, so it carries the two Task 9 research commits (`aa770ab`, `64fc760`). That was
the right call — checking out `main` would have churned a working tree holding uncommitted
`EDITORIAL.md` work. `git cherry-pick b46e07c fdbcc82` onto `main` is clean if a standalone PR is
wanted; the fix touches neither research file.

The original step list is kept below for the record.

---

### Original steps

**Files:**
- Modify: `on-the-record/.claude/skills/audit-quotes/scripts/db.py:15-37`
- Create: `on-the-record/tests/test_audit_scope.py`

The bug: `SCOPE_SQL` derives each quote's race with `ORDER BY rc.race_id LIMIT 1` — the
lexicographically lowest race the politician appears in. Bass and Raman are on both LA Mayor
rosters and `24bc3631…` < `9e888818…`, so all 81 of their quotes are labelled with the June
primary even under `--race 9e888818…`. That sends `fetch_stance` to the wrong race and makes a
general-race override invisible.

The fix: when `--race` is supplied it is authoritative. `fetch_rows` already receives it.

- [ ] **Step 1: Write the failing test**

Create `on-the-record/tests/test_audit_scope.py`:

```python
import importlib.util
from pathlib import Path

# Load the script module by path (it lives under .claude/skills, not on sys.path).
_SPEC_PATH = Path(__file__).resolve().parents[1] / ".claude/skills/audit-quotes/scripts/db.py"
_spec = importlib.util.spec_from_file_location("audit_db", _SPEC_PATH)
audit_db = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(audit_db)

LA_GENERAL = "9e888818-c50b-4c61-a106-a0839ff2479d"


def test_race_expr_prefers_the_requested_race():
    """With --race, that race is authoritative — not the lowest-sorting one.

    Bass and Raman sit on both LA Mayor rosters; the June primary id sorts first, so the
    old `ORDER BY rc.race_id LIMIT 1` mislabelled every quote in the November race.
    """
    expr = audit_db.race_id_expr(race=LA_GENERAL)
    assert "%(race)s" in expr
    assert "ORDER BY rc.race_id" not in expr


def test_race_expr_falls_back_to_lowest_when_unscoped():
    """An unscoped sweep has no race to prefer, so the deterministic fallback stays."""
    expr = audit_db.race_id_expr(race=None)
    assert "ORDER BY rc.race_id" in expr


def test_scope_sql_embeds_the_race_expression():
    sql = audit_db.build_scope_sql(race=LA_GENERAL)
    assert audit_db.race_id_expr(race=LA_GENERAL) in sql
    assert "AS race_id" in sql
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/test_audit_scope.py -v
```

Expected: FAIL — `AttributeError: module 'audit_db' has no attribute 'race_id_expr'`.

- [ ] **Step 3: Implement the fix**

In `.claude/skills/audit-quotes/scripts/db.py`, replace the module-level `SCOPE_SQL` constant and
`fetch_rows` (lines 13-37) with:

```python
# Each quote maps to one race for grouping. When the caller scoped the run to a race, THAT race is
# authoritative: a politician can sit on several rosters (Bass and Raman are on both the LA Mayor
# June primary and the November general), and picking the lowest-sorting race id silently
# mislabelled every quote in the general — which sent fetch_stance to the wrong race and made a
# general-race ranking-question override invisible. Unscoped sweeps keep the lowest-id fallback so
# grouping stays deterministic and a politician is audited once, not once per race.
_RACE_EXPR_SCOPED = "%(race)s"
_RACE_EXPR_LOWEST = """(SELECT rc.race_id::text FROM essentials.race_candidates rc
        WHERE rc.politician_id = q.politician_id ORDER BY rc.race_id LIMIT 1)"""


def race_id_expr(race=None) -> str:
    """The SQL expression that labels a quote with its race."""
    return _RACE_EXPR_SCOPED if race else _RACE_EXPR_LOWEST


def build_scope_sql(race=None) -> str:
    return f"""
SELECT q.id, q.topic_key, q.readrank_selected, q.quote_text, q.deidentified_text,
       q.editor_note, q.source_name, q.source_url,
       q.politician_id::text AS politician_id,
       p.full_name AS candidate,
       {race_id_expr(race)} AS race_id
FROM essentials.quotes q
JOIN essentials.politicians p ON p.id = q.politician_id
WHERE (%(ids)s IS NULL OR q.id = ANY(%(ids)s::uuid[]))
  AND (%(candidate)s IS NULL OR lower(p.full_name) = lower(%(candidate)s))
  AND (%(topic)s IS NULL OR q.topic_key = %(topic)s)
  AND (%(race)s IS NULL OR EXISTS (
        SELECT 1 FROM essentials.race_candidates rc2
        WHERE rc2.politician_id = q.politician_id AND rc2.race_id::text = %(race)s))
  AND (%(drafts)s OR q.readrank_selected = true)
ORDER BY race_id, q.topic_key, q.readrank_selected DESC
"""


def fetch_rows(conn, ids=None, candidate=None, topic=None, race=None, include_drafts=False):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(build_scope_sql(race),
                    dict(ids=ids, candidate=candidate, topic=topic, race=race, drafts=include_drafts))
        return [dict(r) for r in cur.fetchall()]
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/test_audit_scope.py -v
```

Expected: 3 passed.

- [ ] **Step 5: Verify against the real database**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
../../../.venv/bin/python -m scripts.audit --race 9e888818-c50b-4c61-a106-a0839ff2479d \
  --include-drafts --out .runs/la-mayor-attribution-check --scope-label "LA Mayor general"
ls .runs/la-mayor-attribution-check/context/
```

Expected: the context directory contains **`9e888818-c50b-4c61-a106-a0839ff2479d.json`** and NOT
`24bc3631-…json`. Before the fix it was the reverse.

Then confirm the unscoped path still groups:

```bash
../../../.venv/bin/python -m scripts.audit --candidate "Karen Ruth Bass" --include-drafts \
  --out .runs/bass-unscoped --scope-label "Bass unscoped"
ls .runs/bass-unscoped/context/
```

Expected: one bundle, named with the lowest-sorting race id (`24bc3631-…json`) — the fallback is
unchanged for unscoped runs.

- [ ] **Step 6: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add tests/test_audit_scope.py .claude/skills/audit-quotes/scripts/db.py
git commit -m "fix(audit-quotes): --race is authoritative for a quote's race label

A politician on several rosters got the lowest-sorting race id, so every Bass
and Raman quote was labelled with the LA Mayor June primary even under
--race <general>. fetch_stance then looked up ranking-question overrides on
the wrong race and found none, silently.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Group the audit bundle by question, not only by topic

**Files:**
- Modify: `on-the-record/.claude/skills/audit-quotes/scripts/db.py` (`build_scope_sql`)
- Modify: `on-the-record/.claude/skills/audit-quotes/scripts/audit.py` (bundle construction)
- Test: `on-the-record/tests/test_audit_checks.py`

The per-set checks in Task 5 judge **a question's answers**, not a topic's quotes. Multiple
questions can live under one topic (that is the whole point of `readrank_questions`), so a
topic-keyed bundle would hand the judgment agent a mixed bag and invite it to compare answers to
different questions — exactly the incommensurability the rubric exists to catch.

The bundle keeps its `topics` map (the per-quote checks and the existing report all key on topic)
and gains a parallel `questions` map.

- [ ] **Step 1: Write the failing tests**

Append to `on-the-record/tests/test_audit_checks.py`:

```python
def test_scope_sql_selects_question_columns():
    """Per-set checks need the question a quote answers, not just its topic."""
    sql = audit_db.build_scope_sql(race=None)
    assert "q.question_id" in sql
    assert "rq.question_text" in sql
    assert "rq.origin" in sql


def test_scope_sql_left_joins_questions_so_unattached_quotes_survive():
    """question_id is nullable; an unattached quote must still be audited."""
    sql = audit_db.build_scope_sql(race=None)
    assert "LEFT JOIN essentials.readrank_questions rq" in sql
```

And create `on-the-record/tests/test_audit_bundle.py`:

```python
import importlib.util
from pathlib import Path

_SPEC_PATH = Path(__file__).resolve().parents[1] / ".claude/skills/audit-quotes/scripts/audit.py"
_spec = importlib.util.spec_from_file_location("audit_cli", _SPEC_PATH)
audit_cli = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(audit_cli)

ROWS = [
    {"id": "q1", "race_id": "r1", "topic_key": "housing", "candidate": "A",
     "question_id": "Q1", "question_text": "How fast should permits move?", "question_origin": "moderator"},
    {"id": "q2", "race_id": "r1", "topic_key": "housing", "candidate": "B",
     "question_id": "Q1", "question_text": "How fast should permits move?", "question_origin": "moderator"},
    {"id": "q3", "race_id": "r1", "topic_key": "housing", "candidate": "A",
     "question_id": "Q2", "question_text": "Should the state preempt local zoning?", "question_origin": "emergent"},
    {"id": "q4", "race_id": "r1", "topic_key": "housing", "candidate": "B",
     "question_id": None, "question_text": None, "question_origin": None},
]


def test_two_questions_under_one_topic_stay_separate():
    bundle = audit_cli.build_bundle("r1", ROWS, stances={})
    assert set(bundle["questions"]) == {"Q1", "Q2"}
    assert [q["id"] for q in bundle["questions"]["Q1"]["quotes"]] == ["q1", "q2"]
    assert [q["id"] for q in bundle["questions"]["Q2"]["quotes"]] == ["q3"]


def test_topic_map_still_holds_every_quote():
    bundle = audit_cli.build_bundle("r1", ROWS, stances={})
    assert [q["id"] for q in bundle["topics"]["housing"]["quotes"]] == ["q1", "q2", "q3", "q4"]


def test_unattached_quotes_are_collected_not_dropped():
    """A quote with no question_id can't be judged per-set, but must stay visible."""
    bundle = audit_cli.build_bundle("r1", ROWS, stances={})
    assert bundle["unattached_quote_ids"] == ["q4"]


def test_question_metadata_is_carried():
    bundle = audit_cli.build_bundle("r1", ROWS, stances={})
    assert bundle["questions"]["Q1"]["question_text"] == "How fast should permits move?"
    assert bundle["questions"]["Q1"]["origin"] == "moderator"
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/test_audit_bundle.py tests/test_audit_checks.py -v
```

Expected: FAIL — `build_bundle` does not exist, and the SQL assertions fail.

- [ ] **Step 3: Add the question columns to the scope SQL**

In `scripts/db.py`'s `build_scope_sql`, add to the SELECT list (after `p.full_name AS candidate,`):

```sql
       q.question_id::text AS question_id,
       rq.question_text AS question_text,
       rq.origin AS question_origin,
```

and add the join after the politicians join:

```sql
LEFT JOIN essentials.readrank_questions rq ON rq.id = q.question_id
```

`LEFT`, because `question_id` is nullable and an unattached quote must still be audited.

- [ ] **Step 4: Extract the bundle builder**

`audit.py` currently builds the bundle inline inside its per-race loop. Extract it so it is
testable without a database, and add the `questions` map. Replace the loop body with a call to a
new module-level function:

```python
def build_bundle(race_id, rows, stances):
    """Group one race's rows for the judgment agent.

    `topics` drives the per-quote checks and the existing report. `questions` drives the per-set
    checks: several questions can share one topic, so judging a whole topic as a set would compare
    answers to different questions -- the incommensurability the rubric exists to catch.
    Quotes with no question_id can't be judged per-set; they are listed rather than dropped.
    """
    bundle = {"race_id": race_id, "topics": {}, "questions": {}, "unattached_quote_ids": []}
    for r in rows:
        enriched = {**r, "stance": stances.get((r["race_id"], r.get("politician_id"), r["topic_key"]))}
        topic = bundle["topics"].setdefault(
            r["topic_key"], {"topic_key": r["topic_key"], "quotes": []})
        topic["quotes"].append(enriched)

        qid = r.get("question_id")
        if not qid:
            bundle["unattached_quote_ids"].append(r["id"])
            continue
        question = bundle["questions"].setdefault(qid, {
            "question_id": qid,
            "question_text": r.get("question_text"),
            "origin": r.get("question_origin"),
            "topic_key": r["topic_key"],
            "quotes": [],
        })
        question["quotes"].append(enriched)
    return bundle
```

Then in `main()`, replace the inline bundle construction with:

```python
    for race, rrows in by_race.items():
        for r in rrows:
            key = (r["race_id"], r["politician_id"], r["topic_key"])
            if key not in stance_cache:
                stance_cache[key] = fetch_stance(
                    conn, r["politician_id"], r["topic_key"], race_id=r["race_id"]
                )
        bundle = build_bundle(race, rrows, stance_cache)
        safe = str(race).replace("/", "_")
        (run_dir / "context" / f"{safe}.json").write_text(json.dumps(bundle, indent=2, default=str))
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/test_audit_bundle.py tests/test_audit_checks.py tests/test_audit_scope.py -v
```

Expected: all pass.

- [ ] **Step 6: Verify against the real LA Mayor data**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
../../../.venv/bin/python -m scripts.audit --race 9e888818-c50b-4c61-a106-a0839ff2479d \
  --include-drafts --out .runs/bundle-check --scope-label "LA Mayor bundle check"
../../../.venv/bin/python -c "
import json, glob
b = json.load(open(glob.glob('.runs/bundle-check/context/*.json')[0]))
print('topics :', len(b['topics']))
print('questions:', len(b['questions']))
print('unattached:', len(b['unattached_quote_ids']))
multi = [(t, len({q['question_id'] for q in v['quotes'] if q.get('question_id')}))
         for t, v in b['topics'].items()]
print('topics carrying >1 question:', [m for m in multi if m[1] > 1])
"
```

Expected: a `questions` map is present and non-empty. Any topic carrying more than one question is
exactly the case that would have been mis-judged as a single set before this task.

- [ ] **Step 7: Run the whole suite**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/ -q
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add tests/test_audit_bundle.py tests/test_audit_checks.py \
        .claude/skills/audit-quotes/scripts/db.py .claude/skills/audit-quotes/scripts/audit.py
git commit -m "feat(audit-quotes): group the context bundle by question as well as topic

Per-set checks judge a question's answers. Several questions can share one
topic, so a topic-keyed set would compare answers to different questions --
the incommensurability the rubric exists to catch. Extracts build_bundle so
the grouping is testable without a DB, and lists unattached quotes rather
than dropping them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Encode the comparability rubric in audit-quotes (spec Part 1, revised)

**Files:**
- Modify: `on-the-record/.claude/skills/audit-quotes/CHECKS.md`
- Modify: `on-the-record/.claude/skills/audit-quotes/scripts/checks.py` (retire `check_source_tier`)
- Test: `on-the-record/tests/test_audit_checks.py`

**Why this replaced the original task.** The original added one check, `topic-no-contrast`, keyed on
race×topic, gating topics with no contrast. `docs/superpowers/specs/2026-07-23-readrank-comparability-model.md`
already specifies this in more depth and with five races of evidence, and corrects it in three ways:

- **Two properties, not one verdict.** *Commensurable* (a shared latent axis exists) and
  *Differentiated* (real distance on it) are separate tests with **different remedies** —
  incommensurable means you have two questions and should split them; undifferentiated means the
  candidates agree.
- **Agreement is information, not a gate.** §4: *"Undifferentiated ≠ failure… Show 'these candidates
  converge here'; just don't rank it."* Dropping the topic loses true information about the race.
- **Layering is the guardrail.** §7: per-set runs strictly after per-quote *"so contrast can never
  leak backward into selection."* A prose rule is not enough; the ordering has to be real.

The rubric's 7 dimensions map onto the existing catalog as: `off-question` = **Responsive**;
`deid-dishonest` + `source-summary` + `not-forward` + `is-attack` = **Faithful** (incomplete — see
`misleading-verbatim` below); `non-differentiating-goal` = **Substantive**; `source-tier-4` =
**Provenance** (wrong hierarchy — replaced below); `coverage-skew` ≈ **Inclusive origination**
(adjacent, left as-is). **Commensurable** and **Differentiated** are net-new.

### 5a. Replace `source-tier-4` with `source-not-an-answer`

- [ ] **Step 1: Write the failing test**

Append to `on-the-record/tests/test_audit_checks.py`:

```python
import importlib.util
from pathlib import Path

_CHECKS_PATH = Path(__file__).resolve().parents[1] / ".claude/skills/audit-quotes/scripts/checks.py"
_cspec = importlib.util.spec_from_file_location("audit_checks", _CHECKS_PATH)
audit_checks = importlib.util.module_from_spec(_cspec)
_cspec.loader.exec_module(audit_checks)


def _row(**over):
    r = {"id": "q1", "topic_key": "housing", "race_id": "r1", "candidate": "A",
         "quote_text": "We should cut permit times to sixty days.", "deidentified_text": None,
         "editor_note": "note", "source_url": "https://example.com/x", "source_name": "x"}
    r.update(over)
    return r


def test_campaign_site_no_longer_mechanically_flagged():
    """Provenance is directness of answer, not medium. A questionnaire or platform page can be
    the MOST direct answer there is, so a URL pattern cannot decide this -- it moves to judgment."""
    findings = audit_checks.run_mechanical([_row(source_url="https://jane2026.com/issues")])
    assert not [f for f in findings if f.check_id == "source-tier-4"]


def test_source_tier_check_is_gone():
    assert not hasattr(audit_checks, "check_source_tier")
    assert "source-tier-4" not in {c.__name__ for c in audit_checks.QUOTE_CHECKS}


def test_aggregator_and_scorecard_checks_survive():
    """Retiring the medium ladder must not retire the bad-source classes."""
    findings = audit_checks.run_mechanical([_row(source_url="https://www.ontheissues.org/x.htm")])
    assert [f for f in findings if f.check_id == "invalid-source"]
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/test_audit_checks.py -v
```

Expected: FAIL — `check_source_tier` still exists and still flags the campaign URL.

- [ ] **Step 3: Retire the mechanical check**

In `scripts/checks.py`, delete `check_source_tier` (lines 114-124) and remove it from
`QUOTE_CHECKS`. Leave the `CAMPAIGN_SITE` regex if other checks use it; delete it if nothing else
references it. **Do not touch** `check_invalid_source`, `check_unquotable_source` or
`check_scorecard_source` — those detect *bad* sources, which is orthogonal to directness.

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/test_audit_checks.py -v
```

Expected: all pass.

- [ ] **Step 5: Add the judgment replacement to CHECKS.md §3**

Remove the `source-tier-4` row from the §2 mechanical table and add to the §3 judgment table:

```markdown
| `source-not-an-answer` | **Provenance = directness of answer, not medium.** Rank the quote on: (1) *answered-this-question* — the candidate was asked this question (or its clear equivalent) and this is their answer; (2) *answered-an-adjacent-question* — responsive, but the prompt they were given differed; (3) *curator-extracted* — the position was lifted from material not organised as an answer (stump speech, platform page, op-ed). Flag at level 3 when a more direct answer plausibly exists, or when nothing establishes the candidate was answering anything. A **questionnaire answer is level 1** even though it is written and self-published — identical prompts across candidates make it the most directly comparable source there is. Not a gate: a level-3 quote may be the only thing a candidate has, and that is honest presence. | medium | decision-required |
```

Then add this note under the table:

```markdown
> **Why this replaced `source-tier-4`.** The old check ranked by *medium* and questioner
> independence, which made a Vote411/LWV questionnaire a low-tier source. The comparability model
> (§6) found the old "spoken > scraped" instinct was a proxy for something else — *directness of
> answer* — and that questionnaires are **gold**: identical questions across candidates, and every
> ballot-qualified candidate is invited, so they solve comparability and inclusion at once. Ranking
> them down was actively wrong.
>
> **What did not change:** hot-mic / secretly-recorded / "gotcha" speech is still hard-excluded;
> written sources at any tier still yield verbatim sentences only (`source-summary`); and the
> accuracy floor (correct speaker, no fabricated completions, working deep-link) is untouched.
> Those are orthogonal to directness.
```

### 5b. Add `misleading-verbatim`

The casebook's Paxton ruling — *"$3,500 limit only on the challenger side"* when the cap applies to
everyone — has no check today. Verbatim accuracy is not the same as fairness.

- [ ] **Step 6: Add to the §3 judgment table**

```markdown
| `misleading-verbatim` | The quote is accurately transcribed and genuinely the candidate's words, yet **misleads the reader as presented** — it states as fact something the source context contradicts, or a trim has removed the qualifier that made it true. Verbatim is a floor, not a defence. Judge what a citizen would take away from the blind card, against what the full passage supports. | high | decision-required |
```

### 5c. Add the two per-set checks

- [ ] **Step 7: Add the §3.1 section**

Insert after the §3 table, before `## 4. Judgment-agent prompt template`:

```markdown
### 3.1 The per-set layer — judging a question's answers together

Everything above judges one quote. These two judge a **question's answer set**, and they run in a
**separate, later pass** (§4.1). They are the audit half of
`read-rank/docs/superpowers/specs/2026-07-23-readrank-comparability-model.md` §4.

Read the **`questions`** map in the context bundle, not `topics`: several questions can share one
topic, and comparing answers across different questions is precisely the error being tested for.

**A set is rankable when its answers sit at different points on a shared latent dimension, such
that a preference between them is meaningful.** Two properties, both required:

| check | fails when | remedy | severity |
|---|---|---|---|
| `set-incommensurable` | **No shared axis.** The answers are responsive but not rival — "cap insulin prices" vs "build more medical schools" have no dimension along which preferring one is meaningful. | **Split into two questions**, then each half becomes rank-or-surface on its own. NOT a quality problem with either quote. | high, decision-required |
| `set-undifferentiated` | **Shared axis, no distance.** Both answers sit at effectively the same point — e.g. two candidates who both want tariffs rolled back. | **Show convergence, do not rank.** Agreement is information; surface it as agreement. Never drop the question to hide it, and never hunt a sharper quote to manufacture a gap. | medium, decision-required |

**Guardrails, all mandatory:**

- **Articulacy is not a differentiation signal, in either direction.** Two candidates at the same
  point on the axis, one more fluent, is `set-undifferentiated`. Ranking that measures rhetoric,
  not policy. Symmetrically, a blunt, plainly-worded real difference is differentiated. Never
  reward eloquence; never penalise its absence.
- **Contrast is observed, never engineered** (model §8). Each candidate's quote was already chosen
  on its own faithfulness in the earlier pass. You may not recommend swapping in a different quote
  *because* it contrasts more. If a more faithful quote also happens to contrast more, that is a
  per-quote finding, made on faithfulness grounds.
- **Never manufacture, never hide.** Genuine difference → rank. Genuine agreement → show
  convergence. *"Never hide agreement to make a race look sharper."*
- **Not a substance-policing test.** Judge whether the answers *differ*, never whether a position
  is good, deep or well-argued. When genuinely unsure, prefer "rankable" — a marginal difference a
  citizen could weigh is a difference.
- **No upper bound problem is yours to fix here.** The Kansas run found 8 candidates converging on
  one question; flag it `set-undifferentiated` and say so. Presentation caps for crowded fields are
  a product decision, not an audit finding.

**Finding fields.** `level: "topic"`, `race_id` set, `topic_key` set to the question's parent topic,
`quote_id` and `candidate` **null**. Name the question id, the question text, and the quote ids and
candidates in the set inside `what`.

**The gate is policy, not automation.** Neither check flips `readrank_selected`. Any demotion runs
through `apply_fixes.py`'s `set_live` op with the normal dry-run and explicit user OK.
```

### 5d. Split the judgment pass in two

- [ ] **Step 8: Add §4.1 describing the second pass**

The existing §4 prompt becomes the **per-quote** pass. Add after it:

```markdown
## 4.1 The per-set pass (second dispatch)

Run **after** the per-quote pass for a race has returned. This ordering is the guardrail, not a
convenience: it is what stops contrast leaking backward into which quote gets chosen
(comparability model §7). One dispatch per race.

The prompt is the §4 prompt with these differences:

- **Input:** the bundle's `questions` map, plus the per-quote findings the first pass returned.
- **Discard first:** drop every quote the first pass flagged `off-question`. Responsiveness precedes
  comparability — an off-question quote is not an eligible member of the set.
- **Then:** for each question with ≥2 candidates still standing, apply `set-incommensurable` and
  `set-undifferentiated` per §3.1. A question with <2 remaining is *surfaced, not rankable* — that
  is `not-rankable`, already emitted mechanically; do not double-report it.
- **Output:** a JSON array of findings using only the two per-set check ids. `level` is `"topic"`.
- **Explicitly forbidden:** proposing a different quote for a candidate. If the set is weak, say so;
  re-selection is a per-quote judgment made on faithfulness, in the earlier pass.
- **Casebook:** consult `CASEBOOK.md` before ruling, and propose a new entry for any ruling the
  casebook does not already cover (see §6).
```

- [ ] **Step 9: Verify the catalog is consistent**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
grep -c "source-not-an-answer\|set-incommensurable\|set-undifferentiated\|misleading-verbatim" CHECKS.md
grep -n "source-tier-4" CHECKS.md SKILL.md scripts/checks.py
grep -n "nine check ids" CHECKS.md
```

Expected: the four new ids appear; **no** remaining `source-tier-4` anywhere (it must also be
removed from SKILL.md's prose if mentioned); no "nine check ids" (the per-quote list is now ten:
the original nine, minus none, plus `source-not-an-answer` and `misleading-verbatim` — update the
count to eleven and re-count when editing).

- [ ] **Step 10: Run the suite**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/ -q
```

Expected: all pass.

- [ ] **Step 11: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add .claude/skills/audit-quotes/CHECKS.md .claude/skills/audit-quotes/scripts/checks.py \
        tests/test_audit_checks.py
git commit -m "feat(audit-quotes): encode the comparability rubric — per-set layer + directness

Adds the two per-set checks the model specifies, with different remedies:
set-incommensurable means you have two questions (split them);
set-undifferentiated means the candidates agree (show convergence, don't
rank). Agreement is information, so neither drops the question.

Replaces source-tier-4 with source-not-an-answer: provenance is directness
of answer, not medium. The old ladder ranked Vote411/LWV questionnaires as
low-tier when identical prompts across candidates make them the most
comparable source available. Hard exclusions and the accuracy floor are
untouched.

Adds misleading-verbatim for the Paxton ruling — verbatim is a floor, not a
defence — and splits the judgment pass so per-set runs strictly after
per-quote, which is what stops contrast leaking into selection.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Wire the rubric into the audit workflow

**Files:**
- Modify: `on-the-record/.claude/skills/audit-quotes/SKILL.md`

The skill's workflow tells the operating agent what to run. Without this, the per-set checks exist
in the catalog but nothing dispatches them, and the default run excludes the drafts they need.

- [ ] **Step 1: Update the skill description**

Replace the `description:` line in the frontmatter with:

```yaml
description: Audit curated quotes in essentials.quotes (ev-accounts DB) against the Read & Rank curation principles — mechanical checks, a per-quote judgment pass, a per-set comparability pass, and a portfolio pass — and surface findings with gated, human-confirmed fixes. Use when the user wants to audit quotes, review quotes, check quotes against principles, check whether a race's questions are genuinely rankable, audit the quotes in the DB, or run a quote audit.
```

- [ ] **Step 2: Update the opening paragraph**

Replace `It runs a free mechanical pass, fans out a judgment pass per race, runs a portfolio
(coverage-skew) pass, and renders a consolidated report.` with:

```markdown
It runs a free mechanical pass, fans out a **per-quote** judgment pass per race, then a **per-set**
comparability pass over that race's questions, runs a portfolio (coverage-skew) pass, and renders a
consolidated report. The two judgment passes are ordered deliberately — see step 4.
```

- [ ] **Step 3: Add the drafts guidance**

Insert a checklist item immediately after **Resolve scope + confirm**:

```markdown
- [ ] **Offer `--include-drafts` when the run decides what to ship.** The per-set pass judges the
      answers a question actually carries. On a default (live-only) run it can only grade what
      already shipped; with drafts in scope the per-quote pass can also identify a more faithful
      answer that is sitting unselected. Turn it on for any run whose purpose is deciding what to
      ship — that is most of them on a race with a large draft pool. Drafts cost no network I/O,
      just a larger bundle.
```

- [ ] **Step 4: Replace the judgment fan-out item with the two-pass version**

```markdown
- [ ] **Judgment fan-out — pass 1 (per quote).** For each `.runs/<date>/context/<race>.json`
      bundle, dispatch a parallel `Agent`-tool subagent with the CHECKS.md §4 prompt (fill in
      `{context_bundle_json}`; the agent also needs the principles doc and
      [CASEBOOK.md](CASEBOOK.md)). Each returns a JSON array of quote-level findings; an empty
      array is clean.
- [ ] **Judgment fan-out — pass 2 (per set).** Only **after** pass 1 returns for a race, dispatch a
      second subagent per race with the CHECKS.md §4.1 prompt, giving it the bundle's `questions`
      map **and pass 1's findings**. It emits `set-incommensurable` / `set-undifferentiated`.
      **This ordering is a guardrail, not a convenience** — running them together lets contrast
      leak backward into which quote gets picked, which is exactly what the differentiation rule
      forbids (QUOTE-CURATION-PRINCIPLES §4.6; comparability model §7–8). Never merge the passes to
      save a dispatch.
```

- [ ] **Step 5: Add to Non-negotiables**

```markdown
- **Never merge the two judgment passes.** Per-set runs strictly after per-quote so contrast cannot
  influence selection. Merging them to save a round-trip silently breaks the guardrail the whole
  rubric rests on.
- **Agreement is information.** An undifferentiated question is *shown as convergence*, not dropped
  and not sharpened. Never hide agreement to make a race look sharper, and never suggest sourcing
  or swapping a quote in order to create contrast.
- **Demotions are policy, not automation.** Neither per-set check flips `readrank_selected`; any
  change goes through `apply_fixes.py`'s dry-run and explicit OK like every other write.
```

- [ ] **Step 6: Verify**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
grep -n "per-set\|pass 2\|include-drafts\|CASEBOOK" SKILL.md
grep -n "source-tier-4\|topic-no-contrast" SKILL.md
```

Expected: the per-set pass appears in the description, the opening paragraph, the fan-out steps and
the non-negotiables; **no** hits for the retired ids.

- [ ] **Step 7: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add .claude/skills/audit-quotes/SKILL.md
git commit -m "docs(audit-quotes): wire the two-pass judgment flow into the workflow

Names the per-set pass, and makes its ordering explicit and non-negotiable:
running it after per-quote is what stops contrast leaking into selection.
Also tells the operator when to add --include-drafts, and records
'agreement is information' as a non-negotiable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Update the curation principles (spec Parts 1 and 2, revised)

**Files:**
- Modify: `essentials/docs/QUOTE-CURATION-PRINCIPLES.md` (§4.6, §5, §7.3)

The principles doc is canonical — `CHECKS.md` says so ("If the two disagree, the principles doc
wins"). Tasks 2 and 5 currently contradict it in three places.

**Note on §5 and recent history.** The source ladder was revised on 2026-08-05 (`9cf83d6`,
"tier ladder by questioner independence"), which promoted candidate questionnaires to tier 2 in
`race-pipeline/SKILL.md`. **§5 of the principles doc was never updated to match** — it still lists
the old four-tier ladder and does not mention questionnaires at all. So the skill and the canonical
doc already disagree. This task resolves that drift in the direction the comparability model
established: directness of answer is the thing the medium ladder was approximating.

- [ ] **Step 1: Rewrite §5's hierarchy as directness of answer**

Replace the `**Hierarchy (best → worst):**` block and the `**Hard filter, soft preference**` bullet
with:

```markdown
**Hierarchy — directness of answer (best → worst):**

1. **Answered *this* question.** The candidate was asked this question, or its clear equivalent,
   and this is their answer. Debate and forum answers, and **candidate questionnaires**
   (Vote411, LWV chapters, outlet questionnaire pages) both land here: a questionnaire is written
   and self-published, yet every candidate answers an *identical prompt* and every ballot-qualified
   candidate is invited — so it solves comparability and inclusion at once. Prefer these.
2. **Answered an adjacent question.** Genuinely responsive, but the prompt they were given differed
   — a news interview that circled the subject, an answer to a narrower or broader version.
3. **Curator-extracted.** The position was lifted from material not organised as an answer at all:
   stump speeches, floor remarks, op-eds, platform pages. Allowed with a justification note.
   Sometimes it is all a candidate has — that is honest presence, not a defect.
4. **Hard-excluded — not merely deprioritized:** hot-mic, private, secretly-recorded, or clearly
   off-the-cuff "gotcha" remarks. Using off-guard speech is the manufactured-drama we reject and
   it corrodes trust. **Do not use.**

- **Why directness and not medium.** The old ladder ranked by *questioner independence*
  (debates > news interviews > prepared remarks > candidate-bylined written). That instinct was
  really tracking directness, and ranking by medium got questionnaires exactly backwards — it
  filed the most directly comparable source we have under "written, lowest tier." Questioner
  independence still carries information (a debate answer is probed; a questionnaire answer is
  not), so use it to break ties *within* a level — never to override the level itself.
- **Hard filter, soft preference:** strongly prefer level 1; allow 2–3 *with a justification note
  explaining why*; hard-exclude level 4.
- **Written sources at any level yield verbatim sentences only** — never a curator-summarized
  bullet list (e.g. "Support DACA, oppose Muslim ban and family separation" is a summary, not a
  quote). This applies to questionnaires exactly as it does to op-eds.
```

Leave the "Social media is a distribution channel" bullet and the whole **Accuracy floor** block
untouched — both are orthogonal to directness.

- [ ] **Step 2: Extend §4.6 with the per-set layer**

Append to the end of `### 4.6 Differentiation — prefer the HOW`, after the worked example:

```markdown
**Per-quote preference vs. per-set property.** Everything above judges a *single* quote, and it is
a preference. There is a second question that only exists across a *set*: do the answers to one
question actually let a citizen make a meaningful choice? Two properties, both required:

- **Commensurable** — a shared latent dimension exists, so preferring one answer over the other
  *means* something. Not "same words," not "mutually exclusive." Healthcare coverage vs. healthcare
  supply are commensurable — both are positions on how large a role government should play. "Cap
  insulin prices" vs. "build more medical schools" are not: there is no axis, so there is no
  meaningful ordering. Incommensurable answers are the signal that these are **two questions** —
  split them, and each half becomes rank-or-surface on its own.
- **Differentiated** — real distance along that axis. Commensurable-but-identical is not rankable.

**Undifferentiated is not a failure. Agreement is information.** When candidates genuinely converge,
show that they converge — do not rank it, and **never hide agreement to make a race look sharper.**
Dropping the question would discard a true fact about the race.

Three limits keep this honest:

- **Contrast is observed, never engineered.** Select each candidate's *most faithful* answer first;
  only then look at the set and ask whether real difference exists. Never pick a quote *because* it
  contrasts. This ordering is the guardrail — it is why the audit runs its per-set pass strictly
  after its per-quote pass.
- **Articulacy is not a differentiation signal, in either direction.** Same position, one candidate
  more fluent, is still undifferentiated — ranking it would measure rhetoric rather than policy.
  A blunt, plainly-worded genuine difference is differentiated. Fluency is never evidence either way.
- **Difference often lives in the HOW.** When candidates share a goal, the mechanism is usually
  where they diverge — so hunting genuine differentiation is usually hunting the mechanism-bearing
  quote, which is the same thing this section already asks for.
```

- [ ] **Step 3: Relax §7.3**

Replace the **Stay on the same axis** bullet with:

```markdown
- **Prefer the same axis; shift only deliberately.** Prefer a ranking question that engages the same
  Compass axis as its topic. But candidates answer the question they were actually asked, and **a
  rankable question on a slightly different axis beats an unrankable one** — so a race-local question
  may sit off the Compass axis, and may even have no Compass topic at all (an emergent local
  question). When it does: the topic is **race-local** and must not be pooled across races, and the
  §7.2 coupling check is **skipped**, not reported — comparing a quote to a Compass value measured on
  a different axis produces noise, not a finding.
```

Replace the closing paragraph (`Because it is axis-invariant, …`) with:

```markdown
When the question is on-axis, "answers the ranking question" still implies "is evidence on the
Compass axis," so responsiveness (§7.1) and coupling (§7.2) both hold. When it is off-axis,
responsiveness still holds — it is gated against the ranking question, which is the question the
candidates answered — but coupling does not, and is skipped.

Read & Rank never surfaces a Compass value (the reveal shows candidate, topic, quotes, agreement and
sources — no spectrum), which is why this costs nothing a citizen sees. The real cost is cross-race
comparability, contained by marking the topic race-local. Watch the aggregate: if one topic
accumulates many off-axis questions, the *Compass question* is what is wrong — escalate to
`compass-topic-builder` rather than papering over it race by race.
```

- [ ] **Step 4: Verify no stale claims remain**

```bash
cd /Users/chrisandrews/Documents/GitHub/essentials
grep -n "axis-invariant\|Stay on the same axis\|tier 1–2 spoken\|News interviews" docs/QUOTE-CURATION-PRINCIPLES.md
grep -rn "questioner independence" ../on-the-record/.claude/skills/
```

Expected: no unconditional axis-invariance claim; no surviving copy of the old four-tier medium
ladder in §5. `race-pipeline/SKILL.md` will still say "questioner independence" until Task 8 —
that is expected and Task 8 fixes it.

- [ ] **Step 5: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/essentials
git add docs/QUOTE-CURATION-PRINCIPLES.md
git commit -m "docs(curation): directness of answer; comparability as a per-set property

§5's medium ladder becomes directness of answer. The old hierarchy ranked
Vote411/LWV questionnaires as low-tier written sources when identical
prompts across candidates make them the most directly comparable source we
have. Questioner independence survives as a tiebreaker within a level. Hard
exclusions, the verbatim rule and the accuracy floor are unchanged. This
also closes drift: race-pipeline promoted questionnaires on 2026-08-05 but
§5 was never updated to match.

§4.6 gains the per-set layer — commensurable and differentiated, with
different remedies (split vs show convergence) — plus the three limits:
contrast observed not engineered, articulacy is not a signal, difference
lives in the how.

§7.3 lets a race-local question sit off the Compass axis, or carry no
Compass topic, when deliberate; coupling is skipped rather than reported.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Make shared-question moments a sourcing target (spec Part 3, revised)

**Files:**
- Modify: `on-the-record/.claude/skills/race-pipeline/SKILL.md`

Two changes: the source hierarchy in the `needs_quotes → quotes_staged` transition becomes
directness-of-answer (Task 7 rewrote §5 of the principles doc, and the skill must not contradict
the canonical doc), and shared-question moments become an explicit sourcing target rather than a
byproduct.

- [ ] **Step 1: Replace the tier ladder with the directness hierarchy**

The transition currently reads "work DOWN the source hierarchy (QUOTE-CURATION-PRINCIPLES §5, ranked
by questioner independence): 1 debates, forums & town halls; 2 independent-press interviews &
candidate questionnaires; 3 partisan-host interviews & prepared remarks; 4 candidate-bylined
written." Replace that sentence with:

```markdown
Per candidate, work DOWN the source hierarchy (QUOTE-CURATION-PRINCIPLES §5, ranked by
**directness of answer**): 1 answered *this* question — debate/forum answers AND candidate
questionnaires (Vote411, LWV, outlet questionnaires), which are level 1 despite being written
because every candidate answers an identical prompt; 2 answered an adjacent question — news
interviews that circled the subject; 3 curator-extracted — stump speeches, floor remarks, op-eds,
platform pages. Levels 2–3 need a justification note; any WRITTEN source at any level yields
verbatim sentences only. Hot-mic/gotcha is banned. Questioner independence breaks ties *within* a
level, never across them — a level-3 source is never excluded when it is a candidate's only
sourceable speech, and the justification note says so.
```

- [ ] **Step 2: Add the shared-question paragraph**

Insert immediately before the existing `**Video-ingest shortlist (always).**` paragraph:

```markdown
**Hunt shared-question moments first.** A question BOTH candidates answered — a debate or forum
question they were each asked, or the same questionnaire item — is worth more than two separately
sourced quotes, because it delivers three things at once: a level-1 source, a ready-made ranking
question, and a genuine head-to-head. Comparability is created in the room: the casebook's MI
Governor case (one common multi-candidate debate) yielded twice the rankable questions of AZ-01's
two party-segregated ones, where the general-election candidates were never asked the same question
in the same room. When you find one, record the question, its meeting/segment and its URL, and
insert it as an `essentials.readrank_questions` row with `origin = 'moderator'` and `source_ref`
set — neutralize the moderator's framing and name no candidate first. Questionnaires are the
highest-yield form: same prompt, every ballot-qualified candidate invited, so they fix
comparability and inclusion at once.
```

- [ ] **Step 3: Note the per-set bar**

Append to the end of the same `needs_quotes → quotes_staged` section:

```markdown
Sourcing is judged twice downstream: per quote (is it faithful, responsive, direct?) and per set
(do a question's answers actually let a citizen choose?). Source for **faithfulness only** — never
pick a quote because it contrasts. Genuine agreement between candidates is a real finding and is
shown as convergence, so a question whose answers converge is not a sourcing failure. A ranking
question may sit off the Compass axis, or carry no Compass topic at all, when the candidates
answered something the taxonomy doesn't cover (QUOTE-CURATION-PRINCIPLES §7.3).
```

- [ ] **Step 4: Verify**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
grep -n "directness of answer" .claude/skills/race-pipeline/SKILL.md
grep -n "shared-question moments" .claude/skills/race-pipeline/SKILL.md
grep -n "questioner independence" .claude/skills/race-pipeline/SKILL.md
```

Expected: hits in all three new blocks. "questioner independence" should now appear only as the
within-level tiebreaker clause, never as the ranking axis.

- [ ] **Step 5: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add .claude/skills/race-pipeline/SKILL.md
git commit -m "docs(race-pipeline): directness hierarchy + hunt shared-question moments

Replaces the questioner-independence ladder with directness of answer, which
promotes questionnaires to level 1 — identical prompts across candidates make
them the most comparable source available. Questioner independence survives
as a within-level tiebreaker.

Makes shared-question moments an explicit target: comparability is created in
the room, and one common forum yields far more rankable questions than
separate ones. Records that sourcing is for faithfulness only, and that
convergence is a real finding rather than a sourcing failure.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Identify the debate behind the 30 orphan LA Mayor quotes (spec 0b) — ✅ DONE 2026-08-07

**Outcome:** all 30 confirmed to **one** event — the NBC4 Los Angeles / Telemundo 52 mayoral debate
of **2026-05-06** (Bass, Raman, Spencer Pratt), which was **already ingested** as
`meetings.meetings f2cf80ef-a811-4d95-990d-b9c598284eb6` (379 diarized segments, from
`youtube.com/watch?v=8rI3A6alVHM`). The orphans were a bulk extraction from our own transcript that
bypassed `publish-quotes`. **0 UNRESOLVED.**

Confirmation standard held: an exact contiguous run per quote (shortest 12 words, median 45.5),
present in both `meetings.segments` and the YouTube auto-captions, with diarization naming the
expected speaker 30/30. The four lowest-similarity rows were independently re-verified before
applying — contiguous runs of 35w / 56w / 10w / 87w, word coverage 0.97 / 1.00 / 0.88 / 1.00; the
sub-1.00 scores are interior elisions across a segment boundary.

**Applied:**
- `ev-accounts/backend/migrations/1566_backfill_la_mayor_debate_provenance.sql` — 30 rows given
  `source_url` + `source_name`. Dry-run first, guards passed. **0 Bass/Raman quotes unsourced.**
- `ev-accounts/backend/migrations/1567_dedupe_la_mayor_debate_quotes.sql` — four rows duplicating
  another row's moment removed, chosen on content rather than age, with the dropped row's
  `editor_note` merged onto the keeper first. Bass + Raman: 81 → 77 quotes.

**Evidence:** `on-the-record/docs/audits/2026-08-07-la-mayor-orphan-quote-provenance.md`.

**Still open:** `editor_note` is blank on **56** Bass/Raman quotes. Notes need house style and human
sign-off — deliberately not automated.

**What it changed for the rest of the plan.** This is the **MI Governor pattern**, not AZ-01: both
November candidates answered the *same moderator questions in the same room*, which the casebook
records as the configuration yielding the highest comparability. The shared questions are
recoverable from `meetings.segments` and should seed `essentials.readrank_questions` rows with
`origin = 'moderator'` — do that as part of Task 12 step 3. Spencer Pratt is not on the November
ballot, so his answers are out of scope, but the questions he was asked are the same ones.

---

## Task 10: Aim discovery at both races (spec Part 3)

**Files:**
- Modify: `essentials.source_outlets` (data, via the outlet-pack recipe)

Depends on Task 1. Discovery has never swept either race: 53 of 475 tracked races have ever been
swept, and there are **zero CA outlets registered**.

- [ ] **Step 1: Confirm the LA Mayor roster now resolves correctly**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python - <<'PY'
import sys
sys.path.insert(0, ".claude/skills/_shared")
from ev_env import ev_accounts_database_url
from src.discovery import db as ddb   # resolves from the repo root
import psycopg2
conn = psycopg2.connect(ev_accounts_database_url("."))
cur = conn.cursor()
tracked = ddb.fetch_tracked_candidates(cur)
for t in tracked:
    if "Mayor" in (t.race_label or "") and "Angeles" in (t.race_label or ""):
        print(t.race_id, t.full_name)
PY
```

Expected: exactly two rows, both on `9e888818-…` — Karen Ruth Bass and Nithya Raman. If 14 names
appear, Task 1 did not land.

- [ ] **Step 2: Build the CA outlet pack**

Follow the outlet-pack recipe in `docs/runbooks/source-discovery.md` ("Outlet packs (rolling
seed)"). Research and insert 8–15 CA outlets with `added_via='seed'`, `state='CA'`, registering
**both** surfaces where they exist: the YouTube channel RSS
(`kind='youtube_channel'`, `feed_url='https://www.youtube.com/feeds/videos.xml?channel_id=UC…'`)
and the politics-section feed (`kind='web_rss'`).

Starting list: LAist/KPCC, KCRW, PBS SoCal, CalMatters, Spectrum News 1 SoCal, LWV California,
LWV Los Angeles, the Cal Channel, LA Public Press, LA Times politics.

**ToS gate at registration (mandatory).** Skim each site's ToS for an explicit AI/ML-processing
bar. If present, do NOT register and record the finding in the pack notes. **KTLA is Nexstar**,
which is on the barred-chain list — do not register it. Generic no-scraping boilerplate does not
disqualify. Record the ToS verdict in `notes`. Set `county = 'Los Angeles'` on the LA-specific
outlets (LWV Los Angeles, LA Public Press).

- [ ] **Step 3: Force a sweep on each race**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python scripts/poll_discovery.py --race bc936a36-287c-4ffd-abd8-5e4fd798bae5
.venv/bin/python scripts/poll_discovery.py --race 9e888818-c50b-4c61-a106-a0839ff2479d
```

Expected: each ends in a `DONE examined=…` line with a nonzero examined count and exit 0. A
`SWEEP ABORT` means a bot-check wave — retry later rather than looping.

- [ ] **Step 4: Verify rows landed**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python - <<'PY'
import sys
sys.path.insert(0, ".claude/skills/_shared")
from ev_env import ev_accounts_database_url
import psycopg2
conn = psycopg2.connect(ev_accounts_database_url("."))
cur = conn.cursor()
cur.execute("""
  select race_id::text, status, route, count(*)
  from essentials.discovered_sources
  where race_id in ('bc936a36-287c-4ffd-abd8-5e4fd798bae5',
                    '9e888818-c50b-4c61-a106-a0839ff2479d')
  group by 1,2,3 order by 1,2,3
""")
for r in cur.fetchall(): print(r)
cur.execute("""
  select race_id::text, last_swept_at from essentials.discovery_race_state
  where race_id in ('bc936a36-287c-4ffd-abd8-5e4fd798bae5',
                    '9e888818-c50b-4c61-a106-a0839ff2479d')
""")
print("sweep state:", cur.fetchall())
PY
```

Expected: rows for both races (previously zero), and a `discovery_race_state` row per race. An
empty `discovery_race_state` row after a `DONE` line means the sweep hit the spend cap or a search
failure — check `poll.log`.

- [ ] **Step 5: Run the gap-filler deep hunt**

Use the agent gap-filler prompt from `docs/runbooks/source-discovery.md`, once per race, with this
addition: **prioritise events where both candidates answered the same prompt** — debates, candidate
forums, and Vote411 / LWV questionnaires. Those are what the contrast bar needs.

- [ ] **Step 6: Triage the queue**

Work the Discovery tab for both races: approve to `quote_source` (text sources for race-pipeline
pickup) or to `ingest` (video for the transcript pipeline), reject with a reason otherwise. Note
that the table currently has **zero approved rows across all 755** — this is the first triage pass,
so expect to calibrate.

---

## Task 11: Run the comparability audit and produce the selection worklist

**Files:**
- Create: `on-the-record/docs/audits/2026-08-07-quote-audit-ca-gov-contrast.md`
- Create: `on-the-record/docs/audits/2026-08-07-quote-audit-la-mayor-contrast.md`

Depends on Tasks 1–8 and 14. This is the first real exercise of the rubric — and per the
comparability model §10, the goal is to **mine edge cases**, not to perfect either race.

- [ ] **Step 1: Mechanical pass on CA Governor, with drafts**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
../../../.venv/bin/python -m scripts.audit \
  --race bc936a36-287c-4ffd-abd8-5e4fd798bae5 --include-drafts --verify-written \
  --out .runs/2026-08-07-ca-gov --scope-label "CA Governor (comparability)"
```

Expected: `SCOPE:` reporting **99 quotes across 25 race-topic groups** (measured 2026-08-07:
Hilton 45 + Becerra 54), a `MECHANICAL+SOURCE FINDINGS:` count, and one bundle at
`.runs/2026-08-07-ca-gov/context/bc936a36-….json` carrying both `topics` and `questions`.
`--verify-written` is cheap on a single race and closes the highest-severity blind spot.

- [ ] **Step 2: Judgment pass 1 (per quote)**

Dispatch the CHECKS.md §4 prompt against the bundle, with the principles doc and `CASEBOOK.md`.
Collect the quote-level findings.

- [ ] **Step 3: Judgment pass 2 (per set)**

**Only after step 2 returns.** Dispatch the §4.1 prompt with the `questions` map and step 2's
findings. Collect `set-incommensurable` / `set-undifferentiated` findings.

- [ ] **Step 4: Render the CA Governor report**

Merge mechanical + both judgment passes + portfolio findings and render with `scripts/report.py`'s
`render(findings, scope_label)` to `docs/audits/2026-08-07-quote-audit-ca-gov-contrast.md`.

- [ ] **Step 5: Repeat for LA Mayor**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
../../../.venv/bin/python -m scripts.audit \
  --race 9e888818-c50b-4c61-a106-a0839ff2479d --include-drafts --verify-written \
  --out .runs/2026-08-07-la-mayor --scope-label "LA Mayor (comparability)"
```

Expected: **77 quotes** (81 minus the four deduped in Task 9) across ~22 race-topic groups. **Check
the bundle filename is `9e888818-….json`** — if it is `24bc3631-….json`, Task 3 did not land and
every stance lookup used the wrong race.

Then the same two-pass fan-out and render to
`docs/audits/2026-08-07-quote-audit-la-mayor-contrast.md`.

- [ ] **Step 6: Extract the worklist**

Per race, produce three lists:

1. **Rankable** — questions whose set is commensurable and differentiated, with the quote ids and
   candidates. This is what the human selects in `/admin/readrank-quotes`.
2. **Convergence** — `set-undifferentiated` questions. These are *shown as agreement*, not
   demoted and not sharpened. Note what the shared position is.
3. **Split** — `set-incommensurable` questions. Each needs to become two questions; note the two
   axes you saw.

- [ ] **Step 7: Present and stop**

Show the three lists per race, plus any question where a sharper race-local ranking question might
convert an incommensurable set into two rankable ones. **Live selection is a human step** — do not
proceed past this without the user.

- [ ] **Step 8: Commit the reports**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add docs/audits/2026-08-07-quote-audit-ca-gov-contrast.md \
        docs/audits/2026-08-07-quote-audit-la-mayor-contrast.md
git commit -m "docs(audit): first comparability audit of the two showcase races

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 12: Apply selections, seed the debate's questions, re-audit

Depends on Task 11 and the user's decisions there. Iterative: splitting an incommensurable set
often produces two rankable questions, so expect to loop between steps 3 and 4.

- [ ] **Step 1: Apply demotions**

For any live quote the per-quote pass found unfaithful (not for contrast reasons — contrast never
drives selection), build a fixes JSON:

```json
[
  {"kind": "set_live", "id": "quote-uuid-1", "value": false},
  {"kind": "set_live", "id": "quote-uuid-2", "value": false}
]
```

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
../../../.venv/bin/python -m scripts.apply_fixes fixes.json          # dry-run, shows diff
../../../.venv/bin/python -m scripts.apply_fixes fixes.json --commit  # only after explicit OK
```

Show the user the dry-run diff and get an explicit OK before `--commit`. Production DB.

- [ ] **Step 2: Human live-selection pass**

The user selects the recommended answer per question in `/admin/readrank-quotes`. Not automatable —
`readrank_selected` is a human decision by design.

- [ ] **Step 3: Seed the LA Mayor debate's moderator questions**

Task 9 established that the 2026-05-06 NBC4/Telemundo debate is fully ingested as meeting
`f2cf80ef-a811-4d95-990d-b9c598284eb6`, and that Bass and Raman answered **the same moderator
questions in the same room**. Harvest those questions from `meetings.segments` and insert them as
`essentials.readrank_questions` rows with `origin = 'moderator'`, then attach the corresponding
quotes via `essentials.quotes.question_id`.

Migration `1568_seed_la_mayor_moderator_questions.sql`:

```sql
-- Moderator questions harvested from the 2026-05-06 NBC4/Telemundo LA mayoral debate
-- (meetings.meetings f2cf80ef-a811-4d95-990d-b9c598284eb6). Both November candidates answered
-- these in the same room, which is the highest-comparability configuration we have
-- (comparability casebook: "one common multi-candidate forum beats several separate ones").
-- Questions are neutralized/blinded before becoming ranking questions: strip the moderator's
-- framing, name no candidate.
BEGIN;

INSERT INTO essentials.readrank_questions
  (id, race_id, topic_key, question_text, origin, source_ref, status, updated_by)
VALUES
  (gen_random_uuid(), '9e888818-c50b-4c61-a106-a0839ff2479d', '<topic_key>',
   '<the moderator question, neutralized and blinded>', 'moderator',
   jsonb_build_object('meeting_id', 'f2cf80ef-a811-4d95-990d-b9c598284eb6',
                      'segment_index', <n>, 'start_time', <seconds>),
   'confirmed', 'spec-2026-08-07');

COMMIT;
```

Then a follow-up `UPDATE essentials.quotes SET question_id = … WHERE id = …` per quote, so each
answer attaches to the question it actually answered.

**Two faithfulness gates apply** (question-as-unit design §"The two faithfulness gates"): the
question must be a neutral generalization an opponent could answer in the opposite direction
without it feeling rigged, and every attached quote must genuinely answer it — otherwise the
candidate is **absent**, never force-fit.

Spencer Pratt is not on the November ballot; his answers are out of scope, but the questions he was
asked are the same ones and are part of the harvest.

- [ ] **Step 4: Re-audit both races**

Re-run Task 11 steps 1–5. Expected: no `question-override` findings, no `coupling-in-tension`
findings on off-axis questions, and every remaining live question resolving to either rankable or
convergence.

- [ ] **Step 5: Confirm the state**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python - <<'PY'
import sys
sys.path.insert(0, ".claude/skills/_shared")
from ev_env import ev_accounts_database_url
import psycopg2
conn = psycopg2.connect(ev_accounts_database_url("."))
cur = conn.cursor()
for rid, label in [('bc936a36-287c-4ffd-abd8-5e4fd798bae5', 'CA Governor'),
                   ('9e888818-c50b-4c61-a106-a0839ff2479d', 'LA Mayor')]:
    cur.execute("""
      select count(*) from (
        select rq.id from essentials.readrank_questions rq
        join essentials.quotes q on q.question_id = rq.id
         and q.readrank_selected and q.deidentified_text is not null
        join essentials.race_candidates rc on rc.politician_id = q.politician_id
         and rc.race_id = rq.race_id
         and coalesce(rc.candidate_status,'active') <> 'withdrawn'
        where rq.race_id = %s and rq.status = 'confirmed'
        group by rq.id having count(distinct rc.politician_id) >= 2
      ) x
    """, (rid,))
    print(label, "questions with >=2 answering candidates:", cur.fetchone()[0])
    cur.execute("""select count(*) from essentials.quotes q
                   join essentials.race_candidates rc on rc.politician_id = q.politician_id
                   where rc.race_id = %s and q.readrank_selected and q.source_url is null""", (rid,))
    print(label, "live quotes with no source:", cur.fetchone()[0])
PY
```

Expected: **0** live quotes without a source in both races. The rankable-question count is an
**outcome, not a target** — a race that honestly supports 6 real choices reports 6, and the
convergence list is a legitimate part of the result rather than a shortfall.

---

## Task 13: Grow the casebook and close out the spec

**Files:**
- Modify: `on-the-record/.claude/skills/audit-quotes/CASEBOOK.md`
- Modify: `read-rank/docs/superpowers/specs/2026-08-07-showcase-races-contrast-design.md`

Per the comparability model §10, *"post-mortem is a required step each round — it's the learning
engine."* This task is that post-mortem.

- [ ] **Step 1: Append this run's rulings to the casebook**

For every judgment call these two races forced that `CASEBOOK.md` did not already cover, add an
entry in **situation → decision → principle** form. Candidates to look for specifically:

- Any `set-incommensurable` call — what the two axes turned out to be, and how you told them apart.
- Any case where a moderator question needed neutralizing before it could be a ranking question.
- Any case where a candidate's most faithful answer was *less* differentiated than an alternative,
  and you kept the faithful one. That is the guardrail working; record it so it stays working.
- Any case where following an existing entry felt wrong. **Surface the contradiction to the user
  rather than overruling it** — an overturned ruling is information about the rubric.

- [ ] **Step 2: Record what broke**

Add a short "what went wrong this round" note to the casebook or the audit report: rubric gaps,
checks that mis-fired, prompts that produced mush. The model is explicit that the residue which
*won't* convert into a rule is the frontier where humans stay longest — naming it is the point,
not a failure.

- [ ] **Step 3: Resolve or restate the multi-candidate open question**

The spec defers how comparability is judged in 3+ candidate races (both showcase races are
two-way). The Kansas run already shows the shape of the problem — 8 candidates converging on one
question, with `rankable = ≥2` carrying no upper bound. Either resolve it in CHECKS.md §3.1 now, or
restate it explicitly as open so a pipeline session on a multi-candidate race knows it is
unspecified rather than assuming the two-way rule generalizes.

- [ ] **Step 4: Update the spec status header**

Change `**Status:** Design — approved in conversation, not yet planned or implemented` to
`**Status:** Implemented — <date>`, with a one-line result per race (rankable questions, convergence
questions, whether discovery is now sweeping them) and a pointer to the two audit reports.

- [ ] **Step 5: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add .claude/skills/audit-quotes/CASEBOOK.md
git commit -m "docs(audit-quotes): casebook entries from the CA Gov + LA Mayor round

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"

cd /Users/chrisandrews/Documents/GitHub/read-rank
git add docs/superpowers/specs/2026-08-07-showcase-races-contrast-design.md
git commit -m "spec: showcase races contrast — implemented

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 14: Build and seed the casebook

**Files:**
- Create: `on-the-record/.claude/skills/audit-quotes/CASEBOOK.md`
- Modify: `on-the-record/.claude/skills/audit-quotes/SKILL.md` (workflow step)
- Modify: `on-the-record/.claude/skills/audit-quotes/CHECKS.md` (§6 pointer)

**Do this before Task 11** — the first contrast run should reason from precedent and append to it,
not invent rulings that evaporate.

The comparability model §10–11 is explicit about why this exists: the rubric's job is to *"convert
'vibes' into teachable rulings,"* the residue that will not convert is the frontier where a human
stays longest, and rulings are stored as **situation → decision → principle** *"so the agent reasons
by precedent and the human audits reasoning without re-reading source."* This is the artifact that
makes the rubric improve instead of drifting.

- [ ] **Step 1: Create the casebook with its contract and the seeded rulings**

Create `on-the-record/.claude/skills/audit-quotes/CASEBOOK.md`:

```markdown
# Casebook — rulings that bind the audit

Precedent for `audit-quotes`. `CHECKS.md` says *what* each check looks for; this says *how it was
actually ruled* in cases that were genuinely hard. Read it before a judgment pass; append to it
after one.

Every entry is **situation → decision → principle**. The principle is the transferable part; the
situation is what lets you tell whether a new case is really the same one.

**How to use it.** Find the nearest precedent before ruling. If your case matches, rule the same way
and cite the entry. If it differs in a way that matters, say how — and propose a new entry. If a new
case *contradicts* an entry, do not quietly overrule it: surface both to the human. An overturned
ruling is a signal about the rubric, which is the point.

**What belongs here.** Rulings that were genuinely contested, where the rule alone did not settle it.
Not restatements of `CHECKS.md`, and not routine applications.

**Source.** Seeded from `read-rank/docs/superpowers/specs/2026-07-23-readrank-comparability-model.md`
§11 (TX Senate 2026, the first reference run) and the runs after it.

---

## Responsiveness and set membership

### Off-question vs non-rival are different failures
- **Situation.** Two candidates both speak to a topic, but their answers don't line up.
- **Decision.** Distinguish the cause. *Off-question* — the quote doesn't answer the question →
  the candidate is **absent**. *Non-rival* — both genuinely answer, but no shared axis exists →
  **split into two questions**; neither quote is at fault.
- **Principle.** Diagnose before remedying: absence and splitting fix different problems, and
  applying the wrong one either silences a candidate or manufactures a false comparison.

### Record ≠ position
- **Situation.** Paxton on immigration enforcement: everything on the record is what he *did*, or
  attacks on opponents. No forward statement.
- **Decision.** **Absent** from the question. De-identification may anonymise a blame target
  ("Biden" → "the previous administration") but **cannot manufacture a stance** from a critique.
- **Principle.** A critique is not a position. Laundering record into a pseudo-position is worse
  than an empty cell.

### Evasion is absence
- **Situation.** MI Senate Dem primary: Stevens was on stage and deflected every question.
- **Decision.** **Absent** — no forward position, despite being present and speaking.
- **Principle.** Presence in the room is not an answer. Being on stage doesn't earn a cell.

## Faithfulness

### Misleading-verbatim is rejected
- **Situation.** Paxton on campaign finance: *"$3,500 limit only on the challenger side"* — accurate
  transcription, but the cap applies to everyone.
- **Decision.** Not ranked, despite being verbatim.
- **Principle.** **Verbatim is a floor, not a defence.** Judge what a citizen takes away from the
  blind card against what the full passage supports. Audited as `misleading-verbatim`.

## Comparability

### Commensurable-but-undifferentiated → show agreement, don't rank
- **Situation.** TX Senate tariffs: Talarico wants them rolled back, Brown is free-trade. Same axis,
  no gap.
- **Decision.** Show convergence. Do not rank. Do not drop the question.
- **Principle.** **Agreement is information.** Never hide it to make a race look sharper, and never
  hunt a sharper quote to manufacture a gap.

### Differentiation is observed, never engineered
- **Situation.** The temptation, once a set looks flat, to swap in a spicier quote.
- **Decision.** Select each candidate's most faithful answer first; diagnose contrast only after.
- **Principle.** Contrast may never influence selection. This is why the audit's per-set pass runs
  strictly after its per-quote pass — the ordering is the guardrail, not the intention.

### Convergence at scale still collapses
- **Situation.** Kansas Senate Dem primary: 8 candidates live on one healthcare question, nearly all
  "restore ACA / expand Medicaid," several mere fragments.
- **Decision.** `set-undifferentiated`. Eight near-identical answers collapse to "these converge,"
  not an 8-way rank.
- **Principle.** `rankable = ≥2` has no upper bound, and a big set is not a rich one. Crowded
  same-party primaries are the worst case: many candidates, high agreement, thin sourcing.

### Same goal, different mechanism IS a real choice
- **Situation.** LA Mayor, 2026-05-06 debate, both answering the same moderator question on street
  camping. Bass: *"Everybody needs to go inside. Making it illegal and arresting people is not the
  way to solve this problem."* Raman: *"Yes, people need to go inside. When they're offered shelter,
  they go inside. You don't get an opportunity to say no."*
- **Decision.** **Rankable.** Commensurable (both on how compulsory the move indoors should be) and
  differentiated (Raman adds compulsion; Bass rejects criminalisation).
- **Principle.** Shared goal ≠ undifferentiated. When candidates agree on the destination, the
  **mechanism** is the axis — and it is usually the most decision-relevant difference there is.

## Provenance and inclusion

### Directness of answer, not medium
- **Situation.** The old ladder ranked a Vote411/LWV questionnaire as low-tier because it is written
  and self-published.
- **Decision.** Questionnaires are **level 1**. Identical prompts across candidates, and every
  ballot-qualified candidate is invited.
- **Principle.** Provenance is *how directly this is an answer to this question*, not what medium it
  arrived in. Questioner independence breaks ties within a level; it does not set the level.

### Inclusion is protected at origination
- **Situation.** AZ-01: the Libertarian (Alponte) had no substantive spoken media at all — a channel
  with two dog videos.
- **Decision.** Included via campaign-site pledges with a provenance label, **and** allowed to
  originate Libertarian-specific questions that the majors then answer.
- **Principle.** Protect third parties by **whose questions get asked**, never by padding their
  answers. Never manufacture a weak answer to fill a cell.

### Salience exception
- **Situation.** Abortion in TX Senate: no spoken policy statements existed, only theological
  sparring — but it is among the race's highest-salience issues.
- **Decision.** Accurate, unambiguous, genuinely opposite *scraped* positions were kept.
- **Principle.** On a race's highest-salience question, a scraped-but-unambiguous pair can beat
  silence. Narrow: requires high salience, accuracy, and genuine opposition together.

## Forum structure

### One common multi-candidate forum beats several separate ones
- **Situation.** MI Governor R primary: a single debate with all three candidates answering the same
  moderator questions yielded 4 rankables (two of them 3-way). AZ-01's two party-segregated primary
  debates yielded 2 — the GE candidates were never asked the same question in the same room.
- **Decision.** Prioritise sourcing from common forums; treat cross-debate matching as lossy.
- **Principle.** Comparability is created in the room. A shared prompt is worth more than two good
  separate interviews.

### Debates are a QUESTION source even when the answers aren't usable
- **Situation.** AZ-01: third parties weren't invited to the debates.
- **Decision.** Harvest the debate's *questions* as the yardstick; source *answers* from the
  questionnaire, which everyone is invited to.
- **Principle.** The inclusive answer source is the questionnaire, never the debate. The debate's
  durable asset is its question bank.

### Mis-curation, not missing material, is often the bottleneck
- **Situation.** MI Governor R: the live quotes were ontheissues.org scrapes while the real spoken
  debate answers sat as drafts under shared question ids. LA Mayor: 30 debate quotes sat unusable
  with no `source_url` while the debate itself was already ingested.
- **Decision.** Re-select before re-sourcing. MI flipped 4 rankables live in minutes with no new
  sourcing.
- **Principle.** Check what you already have before hunting. The cheapest rankable question is one
  whose material is already in the database.
```

- [ ] **Step 2: Wire it into the skill workflow**

In `SKILL.md`, add to the workflow checklist immediately before **Judgment fan-out**:

```markdown
- [ ] **Read the casebook.** [CASEBOOK.md](CASEBOOK.md) holds the rulings that bind judgment calls —
      situation → decision → principle, seeded from the reference runs. Pass it to every judgment
      subagent alongside the principles doc. It is precedent, not background reading: a case that
      matches an entry is ruled the same way.
```

And append to the workflow, after the gated-fixes step:

```markdown
- [ ] **Append to the casebook.** For every ruling this run made that the casebook did not already
      cover — and for every case where following it felt wrong — propose an entry in
      situation → decision → principle form and confirm it with the user before committing. A run
      that surfaces a *contradiction* with an existing entry is the most valuable outcome there is:
      surface both, never quietly overrule.
```

- [ ] **Step 3: Point CHECKS.md at it**

Add a `## 6. The casebook` section at the end of `CHECKS.md`:

```markdown
## 6. The casebook

[CASEBOOK.md](CASEBOOK.md) carries the rulings that bind judgment calls, as
situation → decision → principle. This file says what each check looks for; the casebook says how
hard cases were actually decided, so an agent reasons by precedent and a human can audit the
reasoning without re-reading the source.

Consult it before every judgment and per-set pass. Propose an entry for any ruling it does not
cover. If a new case contradicts an entry, surface both — never overrule silently. An overturned
ruling is information about the rubric, which is the point.
```

- [ ] **Step 4: Verify**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
grep -c "^### " CASEBOOK.md
grep -n "CASEBOOK" SKILL.md CHECKS.md
```

Expected: 14 rulings; CASEBOOK referenced from both SKILL.md (twice — read, and append) and
CHECKS.md (§6).

- [ ] **Step 5: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add .claude/skills/audit-quotes/CASEBOOK.md .claude/skills/audit-quotes/SKILL.md \
        .claude/skills/audit-quotes/CHECKS.md
git commit -m "feat(audit-quotes): the casebook — precedent for judgment calls

The rubric's job is to convert vibes into teachable rulings; the casebook is
where the rulings live, as situation -> decision -> principle, so an agent
reasons by precedent and a human audits reasoning without re-reading source.

Seeded with 14 rulings from the reference runs (TX Senate, AZ-01, MI Gov R,
MI Senate Dem, KS Senate Dem) plus the LA Mayor same-goal-different-
mechanism case. Wired into the skill workflow both ways: read before
judging, append after. A new case that contradicts an entry surfaces both
rather than overruling silently.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Dependency graph

```
Task 1  (repoint LA Mayor row) ──────────────┬──> Task 10 (discovery)
Task 3  (race attribution) ──> Task 4 ────────┼──> Task 11 (contrast audit) ──> Task 12 ──> Task 13
Task 2  (compass-topic joins) ───────────────┤
Task 5  (rubric checks) ──> Task 6 ──────────┤
Task 7  (principles) ────────────────────────┤
Task 8  (race-pipeline) ─────────────────────┤
Task 14 (casebook) ──────────────────────────┘
Task 9  (orphan provenance) ── ✅ DONE
```

**Ordering that actually matters:**

- **Task 3 → Task 4.** Both edit `db.py`; 4 builds on 3's `build_scope_sql`.
- **Task 4 → Task 5 → Task 6.** The per-set checks read the `questions` map 4 creates; 6 wires 5
  into the workflow.
- **Task 14 → Task 11.** The first contrast run must reason from precedent and append to it, not
  invent rulings that evaporate.
- **Task 7 is canonical.** If 5 and 7 disagree, the principles doc wins — so land 7 before running 11.
- **Task 1 → Task 10.** Discovery resolves LA Mayor's roster through the pipeline row.

Tasks 2, 7, 8 and 14 are independent of each other and can run in any order.

---

## Verification summary

| Task | How you know it worked |
|---|---|
| 1 | Pipeline row's tracked-candidate count is 2, not 14 |
| 2 | Non-compass topic surfaces; a retired (`is_live=false`) topic still does not; title/question fall back |
| 3 | 3 tests pass; `--race <general>` writes `9e888818-….json`, not `24bc3631-….json` |
| 4 | Bundle carries a `questions` map; topics holding >1 question are visible; suite green |
| 5 | `source-tier-4` gone from checks.py and CHECKS.md; four new check ids present; suite green |
| 6 | Per-set pass named in SKILL.md's fan-out; `--include-drafts` guidance present |
| 7 | No old medium ladder in §5; no unconditional axis-invariance claim |
| 8 | Shared-question paragraph and directness hierarchy present in race-pipeline SKILL.md |
| 9 | ✅ 0 Bass/Raman quotes with NULL `source_url`; 81 → 77 after dedupe |
| 10 | `discovered_sources` rows exist for both races; `discovery_race_state` rows present |
| 11 | Two audit reports; every question carries a per-set verdict |
| 12 | Both races: 0 live quotes without a source; every live question rankable or shown as convergence |
| 13 | Spec status updated; casebook grown by this run's rulings |
| 14 | 14 seeded rulings; CASEBOOK referenced from SKILL.md (read + append) and CHECKS.md §6 |
