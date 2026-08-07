# Showcase Races — Contrast as the Shipping Bar: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CA Governor and LA Mayor exemplars where every shipped topic is a real choice, and leave behind reusable machinery (a `topic-no-contrast` judgment check, a relaxed ranking-question rule, aimed discovery) that applies the same bar to any race.

**Architecture:** Most of this is **documentation and data, not application code.** `audit-quotes`' judgment pass has no Python — it is a prompt template in `CHECKS.md §4` that the skill-following agent dispatches via the Agent tool. So the new check is a catalog row plus prompt text, and the Python work is confined to three small things: a race-attribution bug fix in the audit's scope SQL, two new columns on the ranking-question override table, and surfacing those columns to the judgment agent through `fetch_stance`.

**Tech Stack:** Python 3 (psycopg2, pytest) for the `audit-quotes` skill scripts; raw SQL migrations in `ev-accounts/backend/migrations/`; Markdown for the skill catalogs and the principles doc.

**Spec:** `read-rank/docs/superpowers/specs/2026-08-07-showcase-races-contrast-design.md`

---

## Repos touched

| Repo | Path | What changes |
|---|---|---|
| ev-accounts | `backend/migrations/` | Repoint pipeline row; add `off_axis` + `question_source_url` |
| on-the-record | `.claude/skills/audit-quotes/` | Race-attribution fix, `fetch_stance` columns, `CHECKS.md`, `SKILL.md` |
| on-the-record | `.claude/skills/race-pipeline/SKILL.md` | Shared-question sourcing target |
| on-the-record | `tests/` | New tests for the audit scripts (none exist today) |
| essentials | `docs/QUOTE-CURATION-PRINCIPLES.md` | §4.6 contrast-as-pair; §7.3 relaxed axis rule |
| read-rank | `docs/superpowers/specs/` | Status update at the end |

## File structure

**Created:**
- `ev-accounts/backend/migrations/1564_repoint_la_mayor_pipeline_row.sql` — 0a
- `ev-accounts/backend/migrations/1565_readrank_race_topic_questions_off_axis.sql` — Part 2 schema
- `on-the-record/tests/test_audit_scope.py` — race-attribution regression test (Task 3)
- `on-the-record/tests/test_audit_checks.py` — topic-check regression test (Task 4)

**Modified:**
- `on-the-record/.claude/skills/audit-quotes/scripts/db.py` — `SCOPE_SQL` race attribution; `fetch_stance` columns
- `on-the-record/.claude/skills/audit-quotes/CHECKS.md` — new check, rewritten `question-override`, gated `coupling-in-tension`
- `on-the-record/.claude/skills/audit-quotes/SKILL.md` — workflow wiring
- `on-the-record/.claude/skills/race-pipeline/SKILL.md` — shared-question sourcing
- `essentials/docs/QUOTE-CURATION-PRINCIPLES.md` — §4.6, §7.3

**Boundary note:** `SCOPE_SQL` is currently a module-level string interpolated by `fetch_rows`. Task 3 extracts the race-attribution expression into a named helper so it can be unit-tested without a database. That is the only structural change; everything else is additive.

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

## Task 1: Repoint the LA Mayor pipeline row (spec 0a)

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

## Task 2: Add `off_axis` and `question_source_url` to the override table (spec Part 2)

**Files:**
- Create: `ev-accounts/backend/migrations/1565_readrank_race_topic_questions_off_axis.sql`

These columns exist so that an axis shift is a **declared choice** rather than silent drift, and
so the source of the real question is recorded. Nothing reads them until Task 5.

- [ ] **Step 1: Write the migration**

```sql
-- 1565_readrank_race_topic_questions_off_axis.sql
-- Read & Rank spec 2026-08-07 (showcase-races-contrast), Part 2: relax axis-invariance.
--
-- QUOTE-CURATION-PRINCIPLES §7.3 previously required a per-race ranking question to stay on the
-- same Compass axis. Read & Rank never surfaces a Compass value (the reveal payload joins
-- inform.compass_topics only for the topic title), so the only thing that genuinely depended on
-- axis-invariance was cross-race pooling of a topic. An axis shift is now permitted when it is
-- DECLARED here; off_axis = true also marks the topic race-local so nationwide aggregation knows
-- not to pool it, and tells audit-quotes to skip the coupling-in-tension check for that race-topic
-- (comparing a quote to a Compass value measured on a different axis yields noise).
--
-- question_source_url records the debate/forum/questionnaire the question was actually taken from.
-- §7.3 already required "record the source"; there was no column for it.

BEGIN;

ALTER TABLE essentials.readrank_race_topic_questions
  ADD COLUMN off_axis boolean NOT NULL DEFAULT false,
  ADD COLUMN question_source_url text NULL;

COMMENT ON COLUMN essentials.readrank_race_topic_questions.off_axis IS
  'True when this ranking question deliberately engages a different axis than the Compass question. Declared, not inferred: marks the topic race-local and suppresses coupling-in-tension in audit-quotes (spec 2026-08-07).';

COMMENT ON COLUMN essentials.readrank_race_topic_questions.question_source_url IS
  'The debate / forum / questionnaire this question was taken from. QUOTE-CURATION-PRINCIPLES §7.3 requires the real question be recorded.';

COMMENT ON TABLE essentials.readrank_race_topic_questions IS
  'Read & Rank per-race ranking-question override; resolves via COALESCE over inform.compass_topics.question_text. May shift axis only when off_axis is set (QUOTE-CURATION-PRINCIPLES §7.3).';

COMMIT;
```

Note the table comment is rewritten — the old one asserted "Axis-invariant (QUOTE-CURATION-PRINCIPLES §7.3)", which this change makes false.

- [ ] **Step 2: Apply the migration**

Same procedure as Task 1 Step 3 — show the user, get an OK, run against production.

- [ ] **Step 3: Verify the columns and the existing row's defaults**

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
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema='essentials' and table_name='readrank_race_topic_questions'
  order by ordinal_position
""")
for r in cur.fetchall(): print(r)
cur.execute("select race_id::text, topic_key, off_axis, question_source_url from essentials.readrank_race_topic_questions")
print("rows:", cur.fetchall())
PY
```

Expected: `off_axis` (boolean, NOT NULL, default false) and `question_source_url` (text, nullable)
present. The one existing row (CA Governor / `fossil-fuels`) shows `off_axis = False` — it was
written under the old axis-invariant rule, so false is correct and no backfill is needed.

- [ ] **Step 4: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/ev-accounts
git add backend/migrations/1565_readrank_race_topic_questions_off_axis.sql
git commit -m "feat(readrank): declared off-axis ranking questions + recorded question source

Relaxes the §7.3 axis-invariance rule behind an explicit flag. Read & Rank
never surfaces a Compass value, so only cross-race pooling depended on it;
off_axis marks the topic race-local and suppresses coupling-in-tension.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Fix race attribution in the audit's scope SQL (spec 0c)

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

## Task 4: Surface `off_axis` and `question_source_url` to the judgment agent

**Files:**
- Modify: `on-the-record/.claude/skills/audit-quotes/scripts/db.py` (`fetch_stance`)
- Create: `on-the-record/tests/test_audit_checks.py`

The judgment agent reads `stance` from the context bundle. It cannot honour the new rule unless
`off_axis` is in there.

- [ ] **Step 1: Write the failing test**

Create `on-the-record/tests/test_audit_checks.py`:

```python
import importlib.util
from pathlib import Path

_SPEC_PATH = Path(__file__).resolve().parents[1] / ".claude/skills/audit-quotes/scripts/db.py"
_spec = importlib.util.spec_from_file_location("audit_db2", _SPEC_PATH)
audit_db = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(audit_db)


def test_stance_sql_selects_the_override_axis_fields():
    """The judgment agent gates coupling-in-tension on off_axis, so it must be in the bundle."""
    sql = audit_db.STANCE_SQL
    assert "off_axis" in sql
    assert "question_source_url" in sql


def test_stance_sql_defaults_off_axis_false_when_no_override():
    """A topic with no override row must report off_axis false, not null."""
    sql = audit_db.STANCE_SQL
    assert "COALESCE(rtq.off_axis, false)" in sql
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/test_audit_checks.py -v
```

Expected: FAIL — `AttributeError: module 'audit_db2' has no attribute 'STANCE_SQL'`.

- [ ] **Step 3: Implement**

In `.claude/skills/audit-quotes/scripts/db.py`, extract the stance query to a module constant and
add the two fields. Replace `fetch_stance` (lines 39-61) with:

```python
STANCE_SQL = """
  SELECT t.question_text AS compass_question_text,
         COALESCE(rtq.question_text, t.question_text) AS question_text,
         (rtq.question_text IS NOT NULL) AS override_active,
         COALESCE(rtq.off_axis, false) AS off_axis,
         rtq.question_source_url AS question_source_url,
         (SELECT a.value FROM inform.politician_answers a
          WHERE a.topic_id=t.id AND a.politician_id=%s::uuid) AS value,
         (SELECT json_agg(json_build_object('v', s.value, 'text', s.text) ORDER BY s.value)
          FROM inform.compass_stances s WHERE s.topic_id=t.id) AS chairs
  FROM inform.compass_topics t
  LEFT JOIN essentials.readrank_race_topic_questions rtq
    ON rtq.race_id = %s::uuid AND rtq.topic_key = t.topic_key
  WHERE t.topic_key=%s
"""


def fetch_stance(conn, politician_id, topic_key, race_id=None):
    """Returns the candidate+topic stance, or None.

    `question_text` is the RESOLVED ranking question (per-race override ?? Compass), which is what
    Read & Rank gates responsiveness against. `compass_question_text` is the canonical Compass
    question and `override_active` says whether an override applied. `off_axis` says the override
    deliberately engages a different axis (spec 2026-08-07) — when true the agent must SKIP
    coupling-in-tension, because `value` is measured on a different axis than the question asked.
    Keyed on politician_id (names collide across the national race set)."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(STANCE_SQL, (politician_id, race_id, topic_key))
        row = cur.fetchone()
        return dict(row) if row else None
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/test_audit_checks.py -v
```

Expected: 2 passed.

- [ ] **Step 5: Verify the bundle carries the fields**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
../../../.venv/bin/python -m scripts.audit --race bc936a36-287c-4ffd-abd8-5e4fd798bae5 \
  --topic fossil-fuels --out .runs/offaxis-check --scope-label "CA Gov fossil-fuels"
../../../.venv/bin/python -c "
import json,glob
b = json.load(open(glob.glob('.runs/offaxis-check/context/*.json')[0]))
s = b['topics']['fossil-fuels']['quotes'][0]['stance']
print({k: s[k] for k in ('override_active','off_axis','question_source_url')})
print('Q:', s['question_text'])
"
```

Expected: `{'override_active': True, 'off_axis': False, 'question_source_url': None}` and the
California-specific fossil-fuels question. That row predates the flag, so `off_axis False` is
correct.

- [ ] **Step 6: Run the whole suite to check nothing regressed**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python -m pytest tests/ -q
```

Expected: all pass (the pre-existing suite plus the 5 new tests).

- [ ] **Step 7: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add tests/test_audit_checks.py .claude/skills/audit-quotes/scripts/db.py
git commit -m "feat(audit-quotes): carry off_axis + question_source_url into the stance bundle

The judgment agent skips coupling-in-tension on a declared off-axis topic;
it can only do that if the flag reaches the context bundle.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Add `topic-no-contrast` to the check catalog (spec Part 1)

**Files:**
- Modify: `on-the-record/.claude/skills/audit-quotes/CHECKS.md`

This is the check itself. There is no Python: the judgment pass is a prompt the skill-following
agent dispatches, so the catalog row and the prompt text *are* the implementation.

- [ ] **Step 1: Add the row to the §3 judgment-checks table**

Append this row to the table under `## 3. Judgment checks` (after `non-differentiating-goal`):

```markdown
| `topic-no-contrast` | **Topic-level, judged over the pair, not one quote.** The best available pairing for this topic presents no real choice: both candidates assert materially the same position by materially the same mechanism. A citizen ranking them blind is choosing between two ways of saying one thing. **Articulacy is not contrast in either direction** — the same position stated more fluently by one candidate still trips this (ranking it measures rhetoric, not policy), and a plainly-worded genuine difference does not. Same direction by *different mechanisms* is a real choice and passes. | high | decision-required |
```

- [ ] **Step 2: Add the procedure section**

Insert a new section after §3's table and before `## 4. Judgment-agent prompt template`:

```markdown
### 3.1 `topic-no-contrast` — judging the pair

Every other judgment check reads one quote. This one reads a **race×topic group** and asks the
question Read & Rank actually depends on: *does this topic offer a real choice?*

It exists because a topic where both candidates say something specific, mechanism-bearing, and
substantively identical passes every other check and ships as a fake choice.
`non-differentiating-goal` reads a single quote in isolation; `not-rankable` counts *whether* two
candidates are live, never *what they said*.

**Inputs.** All quotes in the group, **drafts included** — run the audit with `--include-drafts`
for this check to do its job. Reading drafts is what lets it recommend a pairing rather than only
grade the shipped one.

**Procedure.**

1. **Drop every quote you flagged `off-question`.** Responsiveness precedes contrast: an
   off-question quote is not an eligible comparison point however distinctive it is
   (QUOTE-CURATION-PRINCIPLES §7.1, §8).
2. **Find the best available pairing** among survivors — one quote per candidate, the pairing that
   makes the sharpest legitimate comparison.
3. **Judge that pairing** against the verdicts below.

**Verdicts.**

| verdict | meaning | emit |
|---|---|---|
| `real-choice` | Different positions, **or** the same direction pursued by different mechanisms. | No finding. If the pairing is not the currently-live one, emit an **informational** `topic-no-contrast` finding with `severity: "low"` naming the stronger pairing — this is the selection recommendation. |
| `same-position` | Materially the same assertion by materially the same mechanism. | `topic-no-contrast`, `severity: "high"`, `fix_class: "decision-required"`. |
| `no-eligible-pair` | Fewer than 2 candidates have an on-question quote. | Nothing — `not-rankable` already covers it. Do not double-report. |

**Two guardrails, both mandatory.**

- **Articulacy is not a contrast signal, in either direction.** Two candidates holding the same
  position, one stating it more eloquently, is `same-position`. Ranking that pairing measures
  rhetoric rather than policy, which is exactly what this check exists to prevent. Symmetrically,
  a blunt, plainly-worded real difference is `real-choice`. Never reward eloquence; never penalise
  its absence.
- **Never manufacture contrast.** `suggested_fix` may **not** propose sourcing a quote *in order
  to* create contrast — the same guardrail `coverage-skew` carries (§8: never engineer outcome
  balance). If the candidates genuinely agree, that is a true fact about the race, and the honest
  response is that the topic does not ship. You cannot rank identical positions; a topic offering
  no choice is not a comparison, the same logic REDESIGN_SPEC §8 applies to one-voice topics.

This is **not** a substance-policing check. It judges whether the *pair* differs — never whether a
position is good, deep, or well-argued. When in doubt, prefer `real-choice`: a marginal difference
that a citizen could plausibly weigh is a difference.

**Finding fields.** `level: "topic"`, `race_id` and `topic_key` set, `quote_id` and `candidate`
**null** — the finding is about the pairing, not one quote. Name the pairing's quote ids and
candidates inside `what`.

**The gate is policy, not automation.** A `same-position` topic must not be live, but this check
never flips `readrank_selected` itself. The demotion runs through `apply_fixes.py`'s `set_live`
op with the normal dry-run and explicit user OK.
```

- [ ] **Step 3: Wire it into the §4 prompt template — the rules block**

In the `## The rules` list inside the prompt template, immediately after the **Prefer the HOW**
bullet, add:

```markdown
- **A topic must offer a real choice.** Beyond judging each quote, judge the *pair*: for each
  topic, take the best available pairing (one quote per candidate, after discarding anything you
  flagged `off-question`) and ask whether a citizen ranking them blind faces a genuine choice.
  Different positions, or the same direction by different mechanisms, is a real choice. Materially
  the same assertion by materially the same mechanism is not — flag it, even when one candidate
  states it far more eloquently, because ranking that measures rhetoric rather than policy. Never
  suggest sourcing a quote in order to create contrast: if the candidates genuinely agree, the
  honest outcome is that the topic does not ship.
```

- [ ] **Step 4: Wire it into the §4 prompt template — the task list**

In the `## Your task` list, append after the `non-differentiating-goal` bullet:

```markdown
- `topic-no-contrast` — the topic's best available pairing presents no real choice: both
  candidates assert materially the same position by the same mechanism (severity high,
  decision-required). Judged **per topic**, not per quote.
```

- [ ] **Step 5: Amend the output contract in §4**

The prompt currently says `level` is `"quote"` for every check and caps the agent at nine ids.
Replace those two constraints:

Replace `- `level` is `"quote"` for every check in this list.` with:

```markdown
- `level` is `"quote"` for every check except `topic-no-contrast`, which is `"topic"`.
- For a `topic-no-contrast` finding, set `race_id` and `topic_key`; leave `quote_id` and
  `candidate` **null** and name the pairing's quote ids and candidates inside `what`.
```

Replace `and do not invent findings outside the nine check ids above.` with:

```markdown
and do not invent findings outside the ten check ids above.
```

- [ ] **Step 6: Gate `coupling-in-tension` on `off_axis`**

Two edits, so the rule holds in both the catalog and the prompt.

In the §3 table, replace the `coupling-in-tension` row's description with:

```markdown
| `coupling-in-tension` | The quote pulls against the direction of the candidate's synthesized Compass `value` for this topic (as opposed to reinforcing it or elaborating on a different sub-dimension). This doesn't mean the quote is wrong — it means the tension needs resolving before the quote is surfaced next to the value. **Skip this check entirely when `stance.off_axis` is true**: the ranking question deliberately engages a different axis than `value` measures, so the comparison is meaningless rather than merely uncertain. | medium | decision-required |
```

In the §4 prompt's **Coupling to the Compass value** bullet, append:

```markdown
  **When `stance.off_axis` is true, skip this check for that quote entirely** — the ranking
  question deliberately measures a different axis than `value` does, so any verdict would be
  comparing two different measurements. Emit no `coupling-in-tension` finding, not even a
  hedged one.
```

- [ ] **Step 7: Rewrite `question-override` for the relaxed rule**

In the §3 table, replace the `question-override` row with:

```markdown
| `question-override` | A per-race ranking-question override (`stance.override_active`) is invalid. An override **may** shift the axis away from `stance.compass_question_text` — but only when **declared** via `stance.off_axis`. Flag when: the axis shifts and `off_axis` is false (undeclared drift); OR it names/contextually leaks a candidate (not blind, §4.2); OR it is not derived from a question actually asked in the race. An override that shifts the axis *with* `off_axis` true is valid — do not flag it. | high | decision-required |
```

In the §4 prompt, replace the **Override must stay on-axis** bullet with:

```markdown
- **Overrides may shift axis, but only when declared.** When `stance.override_active` is true, the
  override (`stance.question_text`) must be blind (name no candidate) and derived from a question
  actually asked in the race — a debate, forum, or questionnaire prompt, tightened for clarity.
  It **may** engage a different axis than `stance.compass_question_text`, but only when
  `stance.off_axis` is true: a candidate answers the question they were asked, and a rankable topic
  on a slightly different question beats an unrankable one. Flag `question-override` for an
  **undeclared** axis shift (axis moved but `off_axis` is false), a non-blind question, or one not
  derived from a real question. A declared off-axis override is valid — do not flag it.
```

- [ ] **Step 8: Add `off_axis` to the prompt's context-field description**

In `## Context`, replace the `stance` field description with:

```markdown
  - `stance` — `{question_text, compass_question_text, override_active, off_axis,
    question_source_url, value, chairs}` for this candidate+topic. `question_text` is the
    **ranking question** you gate responsiveness against (the per-race override if
    `override_active`, else the Compass question). `compass_question_text` is the canonical Compass
    question. `off_axis` is true when the override deliberately engages a different axis than the
    Compass question — when it is true, SKIP `coupling-in-tension` and do not flag
    `question-override` for the axis shift alone. `question_source_url` is where the real question
    came from. `value` is the candidate's numeric Compass value on this topic's spectrum (may be
    null), and `chairs` are the spectrum's labeled anchor points (roughly 1-5, from one pole to
    the other)
```

- [ ] **Step 9: Verify the catalog is internally consistent**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
grep -c "topic-no-contrast" CHECKS.md
grep -n "nine check ids\|ten check ids" CHECKS.md
grep -n "off_axis" CHECKS.md
```

Expected: `topic-no-contrast` appears at least 5 times (§3 row, §3.1 heading and body, §4 rules,
§4 task list, §4 output contract); no remaining "nine check ids"; `off_axis` appears in the
`coupling-in-tension` row, the `question-override` row, the Context block, the coupling bullet,
and the override bullet.

- [ ] **Step 10: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add .claude/skills/audit-quotes/CHECKS.md
git commit -m "feat(audit-quotes): topic-no-contrast — judge the pair, not the quote

A topic where both candidates say something specific, mechanism-bearing and
substantively identical passed every existing check and shipped as a fake
choice. Adds the first judgment check at level:topic, with two hard
guardrails: articulacy is not contrast in either direction, and never
suggest sourcing a quote in order to create contrast.

Also relaxes question-override for declared off-axis questions and skips
coupling-in-tension when off_axis is set.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Wire the check into the audit workflow

**Files:**
- Modify: `on-the-record/.claude/skills/audit-quotes/SKILL.md`

The skill's workflow tells the operating agent what to run. Without this, `topic-no-contrast`
exists in the catalog but nothing invokes it, and the default run excludes the drafts it needs.

- [ ] **Step 1: Update the skill description**

Replace the `description:` line in the frontmatter with:

```yaml
description: Audit curated quotes in essentials.quotes (ev-accounts DB) against the Read & Rank curation principles — mechanical checks, a per-race judgment pass, a per-topic contrast pass, and a portfolio pass — and surface findings with gated, human-confirmed fixes. Use when the user wants to audit quotes, review quotes, check quotes against principles, check whether a race's topics offer real choices, audit the quotes in the DB, or run a quote audit.
```

- [ ] **Step 2: Update the opening paragraph**

Replace `It runs a free mechanical pass, fans out a judgment pass per race, runs a portfolio
(coverage-skew) pass, and renders a consolidated report.` with:

```markdown
It runs a free mechanical pass, fans out a judgment pass per race (which includes the per-topic
`topic-no-contrast` contrast pass), runs a portfolio (coverage-skew) pass, and renders a
consolidated report.
```

- [ ] **Step 3: Add the drafts guidance to the workflow checklist**

Insert a new checklist item immediately after the **Resolve scope + confirm** item:

```markdown
- [ ] **Offer `--include-drafts` when contrast matters.** `topic-no-contrast` judges the *best
      available* pairing for a topic, so on a default (live-only) run it can only grade what
      already shipped. With drafts in scope it also recommends which pairing to select — which is
      the point when a race has a large unselected draft pool. Turn it on for any run whose
      purpose is deciding what to ship; leave it off for a pure did-we-ship-the-right-thing audit.
      Drafts cost nothing extra (no network I/O), just a larger judgment bundle.
```

- [ ] **Step 4: Update the judgment fan-out item**

Replace the **Judgment fan-out** checklist item with:

```markdown
- [ ] **Judgment fan-out.** For each `.runs/<date>/context/<race>.json` bundle, dispatch a
      parallel `Agent`-tool subagent using the judgment-agent prompt template in CHECKS.md §4
      (fill in `{context_bundle_json}` with the bundle; the agent also needs the principles doc).
      Each subagent returns a JSON array of findings (empty array = clean for that race). The pass
      covers both the per-quote checks and the per-topic `topic-no-contrast` check (CHECKS.md
      §3.1) — one agent handles both, since judging the pair requires having judged the quotes.
      Aggregate these with the mechanical findings.
```

- [ ] **Step 5: Add the gate to Non-negotiables**

Append to the `## Non-negotiables` list:

```markdown
- **A `same-position` topic must not stay live.** `topic-no-contrast` is a gate in policy: a topic
  whose best pairing offers no real choice is not a comparison and should be demoted. But it is
  never auto-applied — the demotion goes through `apply_fixes.py`'s `set_live` op with the normal
  dry-run and explicit user OK, like every other write.
- **Never suggest sourcing a quote in order to create contrast.** If two candidates genuinely
  agree, the topic doesn't ship. Manufacturing a difference is worse than dropping a topic.
```

- [ ] **Step 6: Verify**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
grep -n "topic-no-contrast\|include-drafts" SKILL.md
```

Expected: `topic-no-contrast` in the description, the opening paragraph, the fan-out item and the
non-negotiables; `--include-drafts` in the new checklist item and the existing flags list.

- [ ] **Step 7: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add .claude/skills/audit-quotes/SKILL.md
git commit -m "docs(audit-quotes): wire topic-no-contrast into the workflow

Names the contrast pass in the fan-out step, tells the operator when to add
--include-drafts (the check can only recommend a pairing if it can see the
draft pool), and records the gate + no-manufacturing rules as
non-negotiables.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Update the curation principles (spec Parts 1 and 2)

**Files:**
- Modify: `essentials/docs/QUOTE-CURATION-PRINCIPLES.md` (§4.6 and §7.3)

The principles doc is canonical — `CHECKS.md` says so explicitly ("If the two disagree, the
principles doc wins"). Tasks 5 and 6 currently contradict it on both points.

- [ ] **Step 1: Extend §4.6 with contrast-as-a-pair**

Append to the end of `### 4.6 Differentiation — prefer the HOW`, after the worked example:

```markdown
**Per-quote preference vs. per-topic gate.** Everything above judges a *single* quote, and it is a
preference. There is a second, stricter question that only makes sense over a *pair*: do the two
quotes a topic ships present a real choice? Two candidates can each clear every per-quote check —
on-question, mechanism-bearing, well-sourced — and still assert materially the same position by
materially the same mechanism. That topic is not a comparison, and shipping it asks a citizen to
rank two ways of saying one thing.

So: **a topic whose best available pairing offers no real choice does not ship.** Same direction by
different mechanisms *is* a real choice and does ship. This extends the rule already in
REDESIGN_SPEC §8 — a topic with one voice is not a comparison — to its obvious sibling: a topic
with two identical voices is not a comparison either. Audited as `topic-no-contrast`.

Two limits on that gate, both load-bearing:

- **Articulacy is not contrast, in either direction.** If two candidates hold the same position and
  one states it more eloquently, the topic still does not ship — ranking it would measure rhetoric
  rather than policy. Conversely a blunt, plainly-worded genuine difference ships. Fluency is never
  evidence of contrast and never evidence against it.
- **Never manufacture contrast.** If the candidates genuinely agree, that is a true fact about the
  race and the honest response is silence on that topic — never a hunt for a spicier quote, and
  never a reach for an off-question one. This is the §8 rule against engineering outcomes, applied
  to contrast rather than to balance.
```

- [ ] **Step 2: Replace the axis bullet in §7.3**

In `### 7.3 Race-local ranking questions (the override)`, replace the **Stay on the same axis**
bullet with:

```markdown
- **Shift axis only by declaring it.** Prefer an override that engages the same Compass
  axis/dimension as the topic. But candidates answer the question they were actually asked, and **a
  rankable topic on a slightly different question beats an unrankable topic** — so an override
  *may* engage a different axis when it is explicitly declared (`off_axis` on the override row).
  Declaring it marks the topic **race-local** (nationwide aggregation must not pool it) and
  suppresses the §7.2 coupling check for that race-topic, because the candidate's Compass value is
  measured on an axis the question no longer engages. An **undeclared** axis shift is drift, and is
  audited as `question-override`.
```

- [ ] **Step 3: Replace the closing paragraph of §7.3**

The section ends by asserting axis-invariance holds. Replace `Because it is axis-invariant,
"answers the ranking question" still implies "is evidence on the Compass axis," so responsiveness
(§7.1) and coupling (§7.2) both continue to hold.` with:

```markdown
When the override is on-axis, "answers the ranking question" still implies "is evidence on the
Compass axis," so responsiveness (§7.1) and coupling (§7.2) both continue to hold. When it is
declared off-axis, responsiveness still holds — it is gated against the ranking question, which is
the question the candidates answered — but **coupling (§7.2) does not**, and is skipped rather
than reported: comparing a quote to a Compass value measured on a different axis produces noise,
not a finding.

Read & Rank never surfaces a Compass value (the reveal shows candidate, topic, quotes, agreement
and sources — no spectrum), which is why relaxing this costs nothing a citizen sees. The real cost
is cross-race comparability, which the race-local marking contains. Watch the aggregate: if one
topic accumulates many off-axis overrides, the *Compass question* is the thing that is wrong —
escalate to `compass-topic-builder` rather than papering over it race by race.
```

- [ ] **Step 4: Verify no stale axis-invariance claims remain**

```bash
cd /Users/chrisandrews/Documents/GitHub/essentials
grep -n "axis-invariant\|axis invariant\|Stay on the same axis" docs/QUOTE-CURATION-PRINCIPLES.md
```

Expected: no hit asserting invariance as an unconditional rule. A hit inside the new conditional
wording ("When the override is on-axis…") is correct.

- [ ] **Step 5: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/essentials
git add docs/QUOTE-CURATION-PRINCIPLES.md
git commit -m "docs(curation): contrast is a property of the pair; overrides may declare off-axis

§4.6 gains the per-topic gate — a topic whose best pairing offers no real
choice does not ship — with the two limits that keep it honest: articulacy
is not contrast in either direction, and never manufacture contrast.

§7.3 relaxes axis-invariance behind an explicit off_axis declaration. Read &
Rank never surfaces a Compass value, so only cross-race pooling depended on
it; declaring the shift marks the topic race-local and skips §7.2 coupling.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Make shared-question moments a sourcing target (spec Part 3)

**Files:**
- Modify: `on-the-record/.claude/skills/race-pipeline/SKILL.md`

- [ ] **Step 1: Add the shared-question paragraph to the `needs_quotes → quotes_staged` transition**

Insert immediately before the existing `**Video-ingest shortlist (always).**` paragraph:

```markdown
**Hunt shared-question moments first.** A question BOTH candidates answered — a debate or forum
question they were each asked, or the same questionnaire item (Vote411, LWV chapters, outlet
questionnaire pages) — is worth more than two separately-sourced quotes, because it delivers three
things at once: a tier 1–2 source, a natural race-local ranking question, and a genuine
head-to-head. Under the contrast bar (`audit-quotes` `topic-no-contrast`) a topic ships only if the
pairing presents a real choice, and answers to a shared prompt are the cleanest way to establish
that one does. When you find one, record the question and its URL — it is a candidate for a
per-race ranking-question override (`essentials.readrank_race_topic_questions`, with
`question_source_url` set). Questionnaires are the highest-yield form: both candidates, same
prompt, unedited answers, safe under the written-source verbatim rule.
```

- [ ] **Step 2: Note the relaxed override rule in the same transition**

Append to the end of the same `needs_quotes → quotes_staged` section:

```markdown
An override may now engage a *different* axis than the Compass question when the shift is declared
(`off_axis = true`) — a rankable topic on the question the candidates actually answered beats an
unrankable topic on ours (QUOTE-CURATION-PRINCIPLES §7.3). Declare it; don't drift into it.
```

- [ ] **Step 3: Verify**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
grep -n "shared-question\|off_axis\|topic-no-contrast" .claude/skills/race-pipeline/SKILL.md
```

Expected: hits in both new paragraphs.

- [ ] **Step 4: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add .claude/skills/race-pipeline/SKILL.md
git commit -m "docs(race-pipeline): hunt shared-question moments first

A prompt both candidates answered yields a tier 1-2 source, a race-local
ranking question and a genuine head-to-head at once — which is what the new
topic-no-contrast bar actually needs.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Identify the debate behind the 30 orphan LA Mayor quotes (spec 0b)

**Files:**
- Create: `on-the-record/docs/audits/2026-08-07-la-mayor-orphan-quote-provenance.md`
- Modify (via `apply_fixes.py` / a migration): `essentials.quotes` rows

Research task, not a code task. 30 quotes (Bass 14, Raman 16) have NULL `source_url`, blank
`source_name` and blank `editor_note`. They are almost certainly one mayoral debate — consecutive
answers to shared questions on homelessness, the 41.18 ordinance, multi-family housing approval
timelines and police pay. They are load-bearing for most of LA Mayor's 11 candidate topics.

- [ ] **Step 1: Pull the full text of all 30**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
.venv/bin/python - <<'PY'
import sys, json
sys.path.insert(0, ".claude/skills/_shared")
from ev_env import ev_accounts_database_url
import psycopg2, psycopg2.extras
conn = psycopg2.connect(ev_accounts_database_url("."))
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute("""
  select q.id::text, p.full_name, q.topic_key, q.quote_text, q.created_at
  from essentials.quotes q join essentials.politicians p on p.id = q.politician_id
  where q.source_url is null
    and q.politician_id in ('21c9e711-fb18-4afb-884f-08acd2b598ba',
                            '26dbe16a-9dff-42c0-939f-5b5e529063ca')
  order by q.created_at, p.full_name
""")
print(json.dumps([dict(r) for r in cur.fetchall()], indent=2, default=str))
PY
```

`created_at` clustering is the strongest signal for how many distinct import events there were.

- [ ] **Step 2: Identify the event(s)**

Search for the source using distinctive verbatim phrases. Start with the pairs that read as
consecutive debate answers — e.g. Bass's *"Making it illegal and arresting people is not the way to
solve this problem"* against Raman's *"Yes, that people need to go inside."*

Likely venues, in order: a televised LA mayoral debate (2026 cycle), an LWV Los Angeles or civic-org
candidate forum, a news-outlet-hosted forum. Check the race's Ballotpedia page and Vote411 for
scheduled or recorded debates.

**Verify, don't assume.** A candidate match is only confirmed when a distinctive contiguous run of
the quote appears in the source. This is the same standard `--verify-written` applies.

- [ ] **Step 3: Write the findings doc**

Create `on-the-record/docs/audits/2026-08-07-la-mayor-orphan-quote-provenance.md` with, per quote:
the quote id, the identified source URL (or `UNRESOLVED`), the timestamp in seconds if the source
is video, and the verbatim run that confirmed the match. Group by event.

- [ ] **Step 4: Backfill the resolved quotes**

For every resolved quote, set `source_url`, `source_name` and an `editor_note`. Notes must follow
the house style: justify the selection and state how the quote aligns with the candidate's Compass
stance, self-contained, no section references.

`apply_fixes.py` handles `editor_note` but its allowed `set_field` fields are `editor_note`,
`deidentified_text`, `quote_text`, `topic_key` — **`source_url` and `source_name` are not
writable through it**. Write those via a numbered ev-accounts migration
(`1566_backfill_la_mayor_debate_provenance.sql`), one `UPDATE ... WHERE id = '<uuid>'` per quote,
wrapped in `BEGIN`/`COMMIT` with a guard asserting the expected row count.

- [ ] **Step 5: Retire what cannot be traced**

Any quote whose source cannot be confirmed is retired, not guessed. Set `readrank_selected = false`
(most already are) and record it in the findings doc with the search that failed. A quote without
provenance is not a Read & Rank quote.

- [ ] **Step 6: File an ingest row for any video found**

For each video source identified, insert into `essentials.discovered_sources` with
`discovered_via='agent'`, `status='pending'`, `route='ingest'`, `source_key` per
`src/source_key.py`, `race_id = '9e888818-c50b-4c61-a106-a0839ff2479d'`,
`matched_politician_ids` set to Bass and Raman, and a one-sentence `why` citing the evidence. That
routes it into the transcript pipeline so future quotes from it get timestamp deep links.

- [ ] **Step 7: Verify no live LA Mayor quote lacks a source**

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
  select count(*) from essentials.quotes
  where source_url is null and readrank_selected = true
    and politician_id in ('21c9e711-fb18-4afb-884f-08acd2b598ba',
                          '26dbe16a-9dff-42c0-939f-5b5e529063ca')
""")
print("live LA Mayor quotes with no source:", cur.fetchone()[0])
PY
```

Expected: `0`.

- [ ] **Step 8: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add docs/audits/2026-08-07-la-mayor-orphan-quote-provenance.md
git commit -m "docs(audit): provenance for the 30 orphan LA Mayor quotes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

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

## Task 11: Run the contrast audit and produce the selection worklist

**Files:**
- Create: `on-the-record/docs/audits/2026-08-07-quote-audit-ca-gov-contrast.md`
- Create: `on-the-record/docs/audits/2026-08-07-quote-audit-la-mayor-contrast.md`

Depends on Tasks 1–7 and 9. This is the first real exercise of the new check.

- [ ] **Step 1: Run the mechanical pass on CA Governor with drafts**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
../../../.venv/bin/python -m scripts.audit \
  --race bc936a36-287c-4ffd-abd8-5e4fd798bae5 --include-drafts --verify-written \
  --out .runs/2026-08-07-ca-gov --scope-label "CA Governor (contrast)"
```

Expected: a `SCOPE:` line showing **99 quotes across 25 race-topic groups** (measured
2026-08-07: Hilton 45 + Becerra 54), a `MECHANICAL+SOURCE FINDINGS:` count, and one bundle at
`.runs/2026-08-07-ca-gov/context/bc936a36-….json`. `--verify-written` is cheap on a single race
and closes the highest-severity blind spot.

- [ ] **Step 2: Run the judgment + contrast pass**

Dispatch the CHECKS.md §4 prompt against the bundle via the Agent tool, per SKILL.md's fan-out
step. The agent returns a JSON array including `topic-no-contrast` findings at `level: "topic"`.

- [ ] **Step 3: Render the CA Governor report**

Merge mechanical + judgment + portfolio findings and render with `scripts/report.py`'s
`render(findings, scope_label)` to
`docs/audits/2026-08-07-quote-audit-ca-gov-contrast.md`.

- [ ] **Step 4: Repeat for LA Mayor**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record/.claude/skills/audit-quotes
../../../.venv/bin/python -m scripts.audit \
  --race 9e888818-c50b-4c61-a106-a0839ff2479d --include-drafts --verify-written \
  --out .runs/2026-08-07-la-mayor --scope-label "LA Mayor (contrast)"
```

Expected: **81 quotes across 22 race-topic groups** (measured 2026-08-07: Bass 34 + Raman 47).
Then the same judgment fan-out and render to
`docs/audits/2026-08-07-quote-audit-la-mayor-contrast.md`.

**Check the bundle filename is `9e888818-….json`.** If it is `24bc3631-….json`, Task 3 did not
land and every stance lookup in this run used the wrong race.

- [ ] **Step 5: Extract the selection worklist**

From both reports, produce a per-race list of topics with a `real-choice` verdict and the
recommended pairing (quote ids + candidates). That list is what the human acts on in
`/admin/readrank-quotes`. Separately list every `same-position` topic — those are demotions, not
selections.

- [ ] **Step 6: Present to the user and stop**

Show: per race, the topics that would ship and their pairings, the topics gated as
`same-position`, and any topic where a sharper race-local ranking question might convert a
`same-position` into a `real-choice`. **Live selection is a human step** — do not proceed past this
without the user.

- [ ] **Step 7: Commit the reports**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add docs/audits/2026-08-07-quote-audit-ca-gov-contrast.md \
        docs/audits/2026-08-07-quote-audit-la-mayor-contrast.md
git commit -m "docs(audit): first contrast audit of the two showcase races

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 12: Apply selections, add race-local questions, re-audit

Depends on Task 11 and on the user's decisions there. Iterative: a sharper ranking question can
turn a `same-position` verdict into `real-choice`, so expect to loop between steps 2 and 3.

- [ ] **Step 1: Apply the demotions**

For each `same-position` topic, build a fixes JSON demoting the live quotes:

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

The user selects the recommended pairing per topic in `/admin/readrank-quotes`. This is not
automatable — `readrank_selected` is a human decision by design.

- [ ] **Step 3: Add race-local ranking questions**

Where Task 9 or Task 10 surfaced a real shared question, insert an override. Migration
`1567_seed_showcase_race_topic_questions.sql`:

```sql
-- Ranking questions taken from the questions the candidates were actually asked
-- (QUOTE-CURATION-PRINCIPLES §7.3). off_axis is set only where the real question
-- engages a different Compass axis; question_source_url records where it came from.
BEGIN;

INSERT INTO essentials.readrank_race_topic_questions
  (race_id, topic_key, question_text, off_axis, question_source_url, updated_by)
VALUES
  ('9e888818-c50b-4c61-a106-a0839ff2479d', '<topic_key>',
   '<the real question, tightened for clarity, naming no candidate>',
   <true|false>, '<source url>', 'spec-2026-08-07')
ON CONFLICT (race_id, topic_key) DO UPDATE
  SET question_text = EXCLUDED.question_text,
      off_axis = EXCLUDED.off_axis,
      question_source_url = EXCLUDED.question_source_url,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by;

COMMIT;
```

Each question must be **blind** (name no candidate; "Los Angeles" is fine) and **derived from the
real question**. Set `off_axis = true` only when it genuinely engages a different axis than the
Compass question — declaring it when it is not needed suppresses a coupling check that should have
run.

- [ ] **Step 4: Re-audit both races**

Re-run Task 11 steps 1–4. Expected: every remaining live topic carries a `real-choice` verdict,
no `question-override` findings, and no `coupling-in-tension` findings on topics marked
`off_axis`.

- [ ] **Step 5: Confirm the showcase state**

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
        select lower(q.topic_key)
        from essentials.race_candidates rc
        join essentials.quotes q on q.politician_id = rc.politician_id
         and q.deidentified_text is not null and q.readrank_selected
        join inform.compass_topics ct on ct.topic_key = lower(q.topic_key) and ct.is_live
        where rc.race_id = %s and coalesce(rc.candidate_status,'active') <> 'withdrawn'
        group by 1 having count(distinct rc.politician_id) >= 2
      ) x
    """, (rid,))
    print(label, "rankable topics:", cur.fetchone()[0])
    cur.execute("""
      select count(*) from essentials.quotes q
      join essentials.race_candidates rc on rc.politician_id = q.politician_id
      where rc.race_id = %s and q.readrank_selected and q.source_url is null
    """, (rid,))
    print(label, "live quotes with no source:", cur.fetchone()[0])
PY
```

Expected: both races report **0 live quotes with no source**. The rankable-topic count is an
**outcome, not a target** — a race that honestly supports 6 real choices reports 6.

---

## Task 13: Close out the spec and write the playbook

**Files:**
- Modify: `read-rank/docs/superpowers/specs/2026-08-07-showcase-races-contrast-design.md`
- Modify: `on-the-record/.claude/skills/audit-quotes/CHECKS.md` (calibration notes)

- [ ] **Step 1: Record calibration notes from the first real run**

CHECKS.md documents calibration for other checks (see the `source-nested-quotation` false-positive
notes in §2.3). Add the equivalent for `topic-no-contrast` under §3.1: which verdicts were
contested, any false `same-position` calls and what caused them, and any rule that needed
tightening. This is what makes the check trustworthy on race 3 through 607.

- [ ] **Step 2: Resolve or restate the open question on multi-candidate races**

The spec defers how contrast is judged in 3+ candidate races (both showcase races are two-way).
Either resolve it in §3.1 now that the two-way case has run, or restate it explicitly as still
open so a pipeline session on a multi-candidate race knows it is unspecified rather than assuming
the two-way rule generalises.

- [ ] **Step 3: Update the spec status header**

Change `**Status:** Design — approved in conversation, not yet planned or implemented` to
`**Status:** Implemented — <date>` with a one-line result per race (rankable topic counts, and
whether discovery is now sweeping them).

- [ ] **Step 4: Commit**

```bash
cd /Users/chrisandrews/Documents/GitHub/on-the-record
git add .claude/skills/audit-quotes/CHECKS.md
git commit -m "docs(audit-quotes): calibration notes for topic-no-contrast

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"

cd /Users/chrisandrews/Documents/GitHub/read-rank
git add docs/superpowers/specs/2026-08-07-showcase-races-contrast-design.md
git commit -m "spec: showcase races contrast — implemented

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Dependency graph

```
Task 1 (repoint) ─────────────┬──> Task 10 (discovery)
Task 2 (migration) ──> Task 4 ─┤
Task 3 (race attribution) ─────┼──> Task 11 (contrast audit) ──> Task 12 ──> Task 13
Task 5 (CHECKS.md) ────────────┤
Task 6 (SKILL.md) ─────────────┤
Task 7 (principles) ───────────┤
Task 8 (race-pipeline) ────────┘
Task 9 (orphan provenance) ────┘
```

Tasks 5–8 are documentation and can run in parallel with each other and with 1–4. Task 9 is
independent research and can start immediately. Task 11 needs everything before it.

## Verification summary

| Task | How you know it worked |
|---|---|
| 1 | Pipeline row's tracked-candidate count is 2, not 14 |
| 2 | `off_axis` and `question_source_url` on the override table; existing row defaults false |
| 3 | 3 tests pass; `--race <general>` writes `9e888818-….json`, not `24bc3631-….json` |
| 4 | 2 tests pass; bundle stance carries `off_axis`; full suite green |
| 5 | `topic-no-contrast` in 5+ places in CHECKS.md; no "nine check ids" left |
| 6 | `topic-no-contrast` in SKILL.md description, fan-out, non-negotiables |
| 7 | No unconditional axis-invariance claim left in the principles doc |
| 8 | Shared-question paragraph present in race-pipeline SKILL.md |
| 9 | 0 live LA Mayor quotes with NULL `source_url` |
| 10 | `discovered_sources` rows exist for both races; `discovery_race_state` rows present |
| 11 | Two audit reports; contrast verdicts for every topic |
| 12 | Both races: 0 live quotes without a source; every live topic `real-choice` |
| 13 | Spec status updated; calibration notes recorded |
