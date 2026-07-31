# Read & Rank 2026 Content Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and seed the race work-queue (`essentials.readrank_race_pipeline`) plus the pipeline-session playbook, so any future session can pull prioritized races and drive them through roster → quotes → publish → audit.

**Architecture:** A work-queue table in the ev-accounts Postgres (Supabase project `kxsdzaojfaibhuzmclfq`) is seeded in three passes — A: SQL over existing races; B: five web-research lanes run by cheap-model agents writing JSON artifacts; C: verification agents + an idempotent insert script. Operational docs live as a new `race-pipeline` skill in the on-the-record repo next to publish-quotes/audit-quotes.

**Tech Stack:** Postgres (Supabase MCP `apply_migration`/`execute_sql`), Python 3 + psycopg2 (on-the-record venv, `DATABASE_URL` from `on-the-record/.env`), Agent tool with WebSearch/WebFetch for research lanes.

**Spec:** `docs/superpowers/specs/2026-07-31-readrank-2026-content-pipeline-design.md` (read-rank repo). Follow its scope decisions exactly; this plan builds the machine, later "pipeline sessions" run it.

**Ground truth measured 2026-07-31** (verify numbers haven't drifted before trusting them): 2,207 rows in `essentials.races`; house `position_name` formats: `U.S. Representative District 9`, `U.S. House MA-01`, `U.S. Representative At-Large`; `races.office_id` is nullable (CA Governor has null); `race_candidates.source` conventions like `manual:otr-mi-gov-2026`, `ca-sos-2026`.

---

### Task 1: Work-queue table migration

**Files:** none (DB migration via MCP `apply_migration`, name `readrank_race_pipeline`)

- [ ] **Step 1: Apply the migration**

```sql
create table essentials.readrank_race_pipeline (
  id uuid primary key default gen_random_uuid(),
  race_id uuid unique references essentials.races(id) on delete set null,
  race_label text not null,
  state char(2) not null,
  office_category text not null
    check (office_category in ('governor','us_senate','us_house','local_bloomington','local_la')),
  election_date date not null,
  election_kind text not null check (election_kind in ('primary','general')),
  priority_tier smallint not null check (priority_tier between 1 and 6),
  status text not null default 'needs_race'
    check (status in ('needs_race','needs_roster','needs_quotes','quotes_staged',
                      'published','audited','blocked','skipped')),
  status_reason text,
  quoted_candidates int not null default 0,
  rankable_topics int not null default 0,
  claimed_by text,
  claimed_at timestamptz,
  notes text,
  source_urls text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocked_needs_reason
    check (status not in ('blocked','skipped') or status_reason is not null)
);

create index readrank_pipeline_next_idx
  on essentials.readrank_race_pipeline (election_date, priority_tier)
  where status not in ('audited','skipped');

-- natural key for rows whose race doesn't exist yet (race_id null allows dup labels otherwise)
create unique index readrank_pipeline_label_uniq
  on essentials.readrank_race_pipeline (race_label, election_date)
  where race_id is null;
```

- [ ] **Step 2: Verify the table + constraints**

Run via `execute_sql`:

```sql
insert into essentials.readrank_race_pipeline
  (race_label, state, office_category, election_date, election_kind, priority_tier, status, status_reason)
values ('SMOKE TEST ROW', 'XX', 'governor', '2026-11-03', 'general', 3, 'skipped', 'smoke test');
delete from essentials.readrank_race_pipeline where race_label = 'SMOKE TEST ROW';
select count(*) as should_be_zero from essentials.readrank_race_pipeline;
```

Expected: insert + delete succeed, final count 0. Also confirm a bad status is rejected:

```sql
-- expect: check constraint violation
insert into essentials.readrank_race_pipeline
  (race_label, state, office_category, election_date, election_kind, priority_tier, status)
values ('BAD', 'XX', 'governor', '2026-11-03', 'general', 3, 'bogus');
```

Expected: ERROR on `readrank_race_pipeline_status_check`.

### Task 2: Counter-refresh function

**Files:** none (DB migration via MCP `apply_migration`, name `readrank_pipeline_refresh_counters`)

- [ ] **Step 1: Apply the migration**

```sql
create or replace function essentials.refresh_readrank_pipeline_counters()
returns integer language sql as $$
with sel as (
  select rc.race_id, q.topic_key, q.politician_id
  from essentials.race_candidates rc
  join essentials.quotes q
    on q.politician_id = rc.politician_id and q.readrank_selected
),
qc as (
  select race_id, count(distinct politician_id) as quoted_cands
  from sel group by race_id
),
rt as (
  select race_id, count(*) as rankable_topics from (
    select race_id, topic_key from sel
    group by race_id, topic_key
    having count(distinct politician_id) >= 2
  ) t group by race_id
),
upd as (
  update essentials.readrank_race_pipeline p
  set quoted_candidates = coalesce(qc.quoted_cands, 0),
      rankable_topics   = coalesce(rt.rankable_topics, 0),
      updated_at = now()
  from (select p2.id, p2.race_id from essentials.readrank_race_pipeline p2 where p2.race_id is not null) x
  left join qc on qc.race_id = x.race_id
  left join rt on rt.race_id = x.race_id
  where p.id = x.id
    and (p.quoted_candidates is distinct from coalesce(qc.quoted_cands,0)
      or p.rankable_topics   is distinct from coalesce(rt.rankable_topics,0))
  returning 1
)
select count(*)::integer from upd;
$$;
```

- [ ] **Step 2: Verify**

```sql
select essentials.refresh_readrank_pipeline_counters();
```

Expected: returns `0` (queue is empty — no rows updated, no error).

### Task 3: Seed Pass A — existing races (SQL only)

**Files:**
- Create: `on-the-record/.claude/skills/race-pipeline/sql/seed_pass_a.sql` (same SQL, versioned for reruns)

- [ ] **Step 1: Write and run the seed SQL** (via `execute_sql`, and save verbatim to the file above)

```sql
with cov as (
  select rc.race_id,
         count(distinct q.politician_id) filter (where q.readrank_selected) as quoted_cands
  from essentials.race_candidates rc
  join essentials.quotes q on q.politician_id = rc.politician_id
  group by rc.race_id
),
cand as (
  select race_id,
         count(*) filter (where coalesce(candidate_status,'active')
                          not in ('withdrawn','removed')) as active_cands
  from essentials.race_candidates group by race_id
),
base as (
  select r.id as race_id, r.position_name, e.state, e.election_date, e.election_type,
    case
      when e.state='IN' and r.position_name ~* '(monroe|bloomington)' then 'local_bloomington'
      when e.state='CA' and r.position_name ~* '(los angeles|\mLA\M|LAUSD)' then 'local_la'
      when r.position_name ~* 'governor' and r.position_name !~* 'lieutenant' then 'governor'
      when r.position_name ~* '(u\.?s\.?|united states).*(senate|senator)' then 'us_senate'
      when r.position_name ~* '(u\.?s\.?|united states).*(represent|house)'
        or r.position_name ~* 'congressional district' then 'us_house'
    end as office_category,
    coalesce(cov.quoted_cands,0) as qc,
    coalesce(cand.active_cands,0) as ac
  from essentials.races r
  join essentials.elections e on e.id = r.election_id
  left join cov  on cov.race_id  = r.id
  left join cand on cand.race_id = r.id
  where e.election_date >= current_date          -- past primaries are done; skip
    and e.election_date <= '2026-11-03'
)
insert into essentials.readrank_race_pipeline
  (race_id, race_label, state, office_category, election_date, election_kind,
   priority_tier, status, quoted_candidates)
select race_id,
  position_name || ' (' || state || ', ' || to_char(election_date,'YYYY-MM-DD') || ')',
  state, office_category, election_date,
  case when election_type = 'primary' then 'primary' else 'general' end,
  case
    when election_type = 'primary' then 1                                -- imminent primary
    when office_category in ('local_bloomington','local_la') then 2
    when office_category = 'governor' then 3
    when office_category = 'us_senate' then 4
    when office_category = 'us_house' and qc >= 2 then 5                 -- provably contested
    when office_category = 'us_house' then 6                             -- until lane 5 classifies
  end,
  case
    when qc >= 2 then 'published'    -- live quotes exist; goes straight to audit
    when ac >= 2 then 'needs_quotes'
    else 'needs_roster'
  end,
  qc
from base
where office_category is not null
on conflict (race_id) do nothing;
```

- [ ] **Step 2: Refresh counters and verify totals**

```sql
select essentials.refresh_readrank_pipeline_counters();
select office_category, election_kind, status, count(*)
from essentials.readrank_race_pipeline
group by 1,2,3 order by 1,2,3;
```

Expected (sanity, not exact): `us_house` general ≈ 435 rows; `us_senate` ≈ 33–36; `governor` ≈ 10 (the gap lane 1 fills); `local_la` ≈ 1 (LA Mayor general — the gap lane 4 fills); tier-1 primary rows for MI/WI/MN/AK/FL/WY/MA/NH/RI/DE races present. No `local_bloomington` general rows yet (lane 3 fills). If `governor` count exceeds ~15 or `us_house` is far from 435, inspect for regex miscategorization before proceeding.

- [ ] **Step 3: Spot-check two known rows**

```sql
select race_label, office_category, priority_tier, status, quoted_candidates
from essentials.readrank_race_pipeline
where race_label ~* 'CA Governor' or race_label ~* 'Governor of Michigan';
```

Expected: CA Governor = general/tier 3; Governor of Michigan rows = primary/tier 1, status per coverage.

- [ ] **Step 4: Commit the SQL file in on-the-record**

```bash
cd ~/Documents/GitHub/on-the-record
git add .claude/skills/race-pipeline/sql/seed_pass_a.sql
git commit -m "race-pipeline: seed pass A (existing 2026 races into the work queue)"
```

### Task 4: Research lanes 1–4 (Governor gaps, upcoming primaries, Monroe general, LA general)

**Files:**
- Create: `on-the-record/.pipeline/2026-07-31-seed/governor-gaps.json`
- Create: `on-the-record/.pipeline/2026-07-31-seed/upcoming-primaries.json`
- Create: `on-the-record/.pipeline/2026-07-31-seed/monroe-general.json`
- Create: `on-the-record/.pipeline/2026-07-31-seed/la-general.json`

All four lanes share one output schema — a JSON object:

```json
{
  "lane": "<lane-name>",
  "generated": "2026-07-31",
  "races": [
    {
      "race_label": "Governor of Ohio (OH, 2026-11-03)",
      "state": "OH",
      "office_category": "governor",
      "election_date": "2026-11-03",
      "election_kind": "general",
      "priority_tier": 3,
      "contested": true,
      "candidates": [
        {"name": "Full Name", "party": "D", "incumbent": false,
         "website": "https://…", "source_url": "https://…"}
      ],
      "sources": ["https://…", "https://…"],
      "notes": "anything odd (runoff pending, write-in only, etc.)"
    }
  ]
}
```

- [ ] **Step 1: Get the list of Governor states already covered** (input for lane 1's prompt)

```sql
select distinct state from essentials.readrank_race_pipeline
where office_category = 'governor' and election_kind = 'general';
```

- [ ] **Step 2: Dispatch four parallel research agents** (Agent tool, `general-purpose`, model `haiku`), one per lane. Prompt template — fill `{...}`:

```
You are researching US 2026 elections for a voter-information nonprofit. Produce ONLY a JSON
object matching this schema exactly (no prose): {schema from above, lane "<lane>"}.

LANE ASSIGNMENT: {one of the four lane briefs below}

Rules:
- Use Ballotpedia to FIND races, then verify each roster against the state Secretary of
  State / county election office certified candidate list. Record both URLs in "sources".
- "contested" = at least 2 candidates from different major parties OR any 2 candidates in a
  nonpartisan/top-two race, on the ballot for that stage of the election.
- election_date must be the actual date (general = 2026-11-03 everywhere).
- race_label format: "<Position> (<ST>, <YYYY-MM-DD>)".
- If you cannot verify a race with two independent sources, still include it but put
  "UNVERIFIED: <why>" at the start of "notes".
- Do not include judicial races or retention questions. Do not include uncontested races
  EXCEPT in lane governor-gaps (we track all governor races regardless).
Return the JSON object as your entire final message.
```

Lane briefs:

1. **governor-gaps** — "The 2026 gubernatorial map has 36 states. We already cover: {states from Step 1}. For every OTHER 2026 governor race: the November general-election field (post-primary where the primary has happened; certified candidate list where not). office_category governor, priority_tier 3, election_kind general."
2. **upcoming-primaries** — "Contested Governor / US Senate / US House primaries with election dates between 2026-08-01 and 2026-09-30 (MI 8/4, WI+MN 8/11, AK+FL+WY 8/18, MA 9/1, NH 9/8, RI 9/9, DE 9/15 — verify this list and add any state I missed). One race entry per party-primary (e.g. 'Governor of Michigan — R primary'). House labels MUST carry the district as ST-NN, e.g. 'U.S. House MI-10 — D primary (MI, 2026-08-04)'. office_category by office, priority_tier 1, election_kind primary. House primaries: contested ones only."
3. **monroe-general** — "Every contested race on the 2026-11-03 general-election ballot for a voter living in Bloomington, Monroe County, Indiana: county offices (commissioner, council, sheriff, prosecutor, assessor, clerk, recorder, auditor), township boards/trustees, MCCSC school board, Indiana House/Senate districts covering Bloomington (IN House 60/61/62, IN Senate 40 — verify), and US House IN-09. Sources: Monroe County Election Central + Indiana SOS. office_category local_bloomington (use us_house for IN-09), priority_tier 2, election_kind general. Include uncontested county races too but mark contested:false."
4. **la-general** — "Every contested race on the 2026-11-03 ballot for a City of Los Angeles voter: LA Mayor, City Attorney, Controller, odd-numbered City Council districts, LA County Board of Supervisors 1 & 3, Sheriff, Assessor, LAUSD board districts up this cycle, and CA State Assembly/Senate districts covering LA. CRITICAL: the 2026-06-02 primary already happened — use CERTIFIED results (LA County RR/CC, LA City Clerk) to determine which races were WON OUTRIGHT (majority — mark contested:false, notes 'resolved in primary') vs which two candidates advanced to a November RUNOFF. office_category local_la, priority_tier 2, election_kind general."

- [ ] **Step 3: Save each agent's JSON to its artifact path**, validating it parses:

```bash
cd ~/Documents/GitHub/on-the-record
mkdir -p .pipeline/2026-07-31-seed
python3 -c "import json,sys; [json.load(open(f)) for f in sys.argv[1:]]; print('all valid')" \
  .pipeline/2026-07-31-seed/governor-gaps.json \
  .pipeline/2026-07-31-seed/upcoming-primaries.json \
  .pipeline/2026-07-31-seed/monroe-general.json \
  .pipeline/2026-07-31-seed/la-general.json
```

Expected: `all valid`.

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/GitHub/on-the-record
git add .pipeline/2026-07-31-seed/
git commit -m "race-pipeline: pass B research lanes 1-4 (gov gaps, primaries, Monroe, LA)"
```

### Task 5: Research lane 5 — House contested classification

**Files:**
- Create: `on-the-record/.pipeline/2026-07-31-seed/house-classification.json`

- [ ] **Step 1: Dispatch 10 parallel agents** (model `haiku`), each covering 5 states (alphabetical blocks: AL–CO, CT–GA, HI–KS, KY–MD, MA–MO, MS–NH, NJ–NY, NC–OK, OR–SC, SD–WY). Prompt per agent:

```
For each US House district in these states: {5 states}, classify the 2026-11-03 general
election as contested or not. contested = at least 2 candidates from different major
parties on the November ballot (or 2+ candidates in a top-two state like CA/WA).
Use Ballotpedia's per-state "United States House of Representatives elections in <state>,
2026" pages; verify uncertain cases against the state SOS candidate list.
Return ONLY a JSON array (no prose):
[{"state":"AL","district":1,"contested":true,"source":"https://…"}, …]
Use district 0 for at-large seats. Cover every district in every assigned state.
```

- [ ] **Step 2: Merge the 10 arrays into one artifact**

```bash
cd ~/Documents/GitHub/on-the-record
python3 - <<'EOF'
import json, glob
rows = []
for f in sorted(glob.glob('.pipeline/2026-07-31-seed/house-raw-*.json')):
    rows += json.load(open(f))
assert len(rows) == 435, f"expected 435 districts, got {len(rows)}"
seen = {(r['state'], r['district']) for r in rows}
assert len(seen) == 435, "duplicate state+district pairs"
json.dump({"lane": "house-classification", "generated": "2026-07-31", "districts": rows},
          open('.pipeline/2026-07-31-seed/house-classification.json', 'w'), indent=1)
print(f"contested: {sum(1 for r in rows if r['contested'])} / 435")
EOF
```

Expected: prints a contested count (plausible range 300–400 — most districts draw both major parties; if it's under 250, the agents likely conflated "competitive" with "contested" — re-brief and re-run outliers).

- [ ] **Step 3: Commit** (`git add .pipeline/ && git commit -m "race-pipeline: pass B lane 5 (house contested classification)"`)

### Task 6: Pass C — verification agents

**Files:**
- Modify: the five artifact JSONs (adding per-race `"verified"` / `"verify_notes"` fields)

- [ ] **Step 1: Dispatch one checker agent per lane-1–4 artifact** (model `sonnet`), prompt:

```
You are auditing election research before it enters a production database. Input JSON:
{artifact contents}. For EACH race, independently verify against a source NOT already in
its "sources" list (prefer the state/county election office if the researcher leaned on
Ballotpedia, and vice versa): (1) the race exists with this election date and kind,
(2) the candidate list is complete and correctly spelled for that stage, (3) the
contested flag is right. Return the same JSON with two fields added per race:
"verified": true|false, and "verify_notes": "<what you checked / what disagreed>".
Do NOT silently fix discrepancies — set verified:false and describe them.
Return only the JSON.
```

For lane 5, verification is sampling-based: one agent re-checks 40 random districts + every district marked `contested:false`; if >2 of the 40 samples disagree, re-run the affected state batch from Task 5.

- [ ] **Step 2: Overwrite artifacts with verified versions; re-validate JSON parses; commit**

```bash
cd ~/Documents/GitHub/on-the-record
python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('.pipeline/2026-07-31-seed/*.json')]; print('valid')"
git add .pipeline/ && git commit -m "race-pipeline: pass C verification annotations"
```

### Task 7: Pass C — seed insert script + run

**Files:**
- Create: `on-the-record/.claude/skills/race-pipeline/scripts/seed_from_research.py`

- [ ] **Step 1: Write the script**

```python
#!/usr/bin/env python3
"""Seed essentials.readrank_race_pipeline from pass-B research artifacts.

Usage:
  .venv/bin/python seed_from_research.py <artifact.json> [--commit] [--env-file PATH]

Lane files with a "races" array INSERT queue rows (race_id null -> status needs_race;
unverified races land as blocked). The house-classification lane instead UPDATES
priority_tier (5 contested / 6 not) on existing us_house rows, matching districts out
of position_name formats like 'U.S. Representative District 9', 'U.S. House MA-01',
'U.S. Representative At-Large'.
Always dry-runs unless --commit.
"""
import argparse, json, os, re, sys
import psycopg2, psycopg2.extras

DEFAULT_ENV = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".env")

def load_database_url(env_file):
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    with open(env_file) as f:
        for line in f:
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip()
    sys.exit(f"No DATABASE_URL in env or {env_file}")

def district_of(position_name):
    m = re.search(r"District\s+(\d+)", position_name, re.I)
    if m: return int(m.group(1))
    m = re.search(r"-(\d{2})\b", position_name)
    if m: return int(m.group(1))
    if re.search(r"At-Large", position_name, re.I): return 0
    return None

def possible_dups(cur, r):
    """Pass A seeded existing races under DB-derived labels; research lanes use their own.
    Anything already queued for the same slot needs a human eye before we add a second row."""
    cur.execute("""
      select race_label from essentials.readrank_race_pipeline
      where state = %s and office_category = %s and election_date = %s and election_kind = %s
    """, (r["state"], r["office_category"], r["election_date"], r["election_kind"]))
    labels = [row["race_label"] for row in cur.fetchall()]
    if r["office_category"] == "us_house":
        # same-state house races only collide when the district matches
        d = district_of(r["race_label"])
        labels = [l for l in labels if district_of(l) == d]
    return labels

def seed_races(cur, data, commit):
    inserted = skipped = blocked = dup_flagged = 0
    for r in data["races"]:
        dups = possible_dups(cur, r)
        if dups:
            dup_flagged += 1
            print(f"  POSSIBLE DUP (skipping insert): {r['race_label']!r} vs existing {dups}")
            continue
        status = "needs_race"
        reason = None
        if not r.get("verified", False):
            status, reason = "blocked", f"unverified research: {r.get('verify_notes','')[:200]}"
            blocked += 1
        if r.get("contested") is False and status != "blocked":
            status, reason = "skipped", r.get("notes") or "uncontested"
        cur.execute("""
          insert into essentials.readrank_race_pipeline
            (race_label, state, office_category, election_date, election_kind,
             priority_tier, status, status_reason, notes, source_urls)
          values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
          on conflict (race_label, election_date) where race_id is null do nothing
          returning id
        """, (r["race_label"], r["state"], r["office_category"], r["election_date"],
              r["election_kind"], r["priority_tier"], status, reason,
              json.dumps(r["candidates"]),
              r.get("sources", [])))
        if cur.fetchone():
            inserted += 1
        else:
            skipped += 1
    print(f"insert: {inserted} new, {skipped} already present, {blocked} blocked-unverified, "
          f"{dup_flagged} possible-dup (NOT inserted - resolve by hand)")

def classify_house(cur, data, commit):
    cur.execute("""
      select p.id, p.state, r.position_name
      from essentials.readrank_race_pipeline p
      join essentials.races r on r.id = p.race_id
      where p.office_category = 'us_house' and p.election_kind = 'general'
    """)
    rows = cur.fetchall()
    lookup = {(d["state"], d["district"]): d["contested"] for d in data["districts"]}
    hits = misses = 0
    for row in rows:
        dist = district_of(row["position_name"])
        key = (row["state"], dist)
        if dist is None or key not in lookup:
            misses += 1
            print(f"  no match: {row['state']} {row['position_name']}")
            continue
        tier = 5 if lookup[key] else 6
        cur.execute("update essentials.readrank_race_pipeline set priority_tier=%s, updated_at=now() where id=%s",
                    (tier, row["id"]))
        hits += 1
    print(f"classified {hits} house rows, {misses} unmatched (fix by hand)")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("artifact"); ap.add_argument("--commit", action="store_true")
    ap.add_argument("--env-file", default=DEFAULT_ENV)
    args = ap.parse_args()
    data = json.load(open(args.artifact))
    conn = psycopg2.connect(load_database_url(args.env_file))
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if "districts" in data:
        classify_house(cur, data, args.commit)
    else:
        seed_races(cur, data, args.commit)
    if args.commit:
        conn.commit(); print("COMMITTED")
    else:
        conn.rollback(); print("DRY RUN — rolled back (use --commit)")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Dry-run each artifact, review output, then run with `--commit`**

```bash
cd ~/Documents/GitHub/on-the-record
for f in .pipeline/2026-07-31-seed/{governor-gaps,upcoming-primaries,monroe-general,la-general,house-classification}.json; do
  .venv/bin/python .claude/skills/race-pipeline/scripts/seed_from_research.py "$f"
done
# review counts, then repeat each with --commit
```

Expected: governor-gaps inserts ≈ 26 rows; monroe-general ≈ 10–20; la-general ≈ 10–25; upcoming-primaries ≈ 20–60; house-classification reports ~435 classified, few unmatched.

- [ ] **Step 3: Verify the queue end-state**

```sql
select essentials.refresh_readrank_pipeline_counters();
select office_category, status, count(*) from essentials.readrank_race_pipeline
group by 1,2 order by 1,2;
select count(*) filter (where status='blocked') as blocked,
       count(*) filter (where race_id is null and status='needs_race') as to_create
from essentials.readrank_race_pipeline;
```

Expected: every governor state present (36 general rows across seed A + lane 1); blocked rows only where verification failed (each must have `status_reason`).

- [ ] **Step 4: Commit script + artifacts**

```bash
cd ~/Documents/GitHub/on-the-record
git add .claude/skills/race-pipeline/ .pipeline/
git commit -m "race-pipeline: seed insert script + seeded queue from verified research"
```

### Task 8: The race-pipeline skill (session playbook)

**Files:**
- Create: `on-the-record/.claude/skills/race-pipeline/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

````markdown
---
name: race-pipeline
description: Run a Read & Rank content pipeline session - pull the highest-priority races
  from essentials.readrank_race_pipeline, advance each one lifecycle step (create race,
  build roster, source quotes, publish, audit), update the queue. Use when the user wants
  to work the 2026 race queue, source candidate quotes at scale, or check pipeline status.
---

# Race Pipeline Session

Design/spec: `read-rank/docs/superpowers/specs/2026-07-31-readrank-2026-content-pipeline-design.md`.
The queue is `essentials.readrank_race_pipeline` (ev-accounts DB). Priority is always
`election_date` asc, then `priority_tier` asc. The queue is the only cross-session memory.

## Session loop

1. **Claim work** (N = 10–20):

```sql
update essentials.readrank_race_pipeline p
set claimed_by = :session_id, claimed_at = now()
where p.id in (
  select id from essentials.readrank_race_pipeline
  where status not in ('audited','skipped','blocked')
    and (claimed_at is null or claimed_at < now() - interval '2 hours')
  order by election_date, priority_tier
  limit :N
)
returning p.id, p.race_label, p.status, p.race_id;
```

2. **Fan out one agent per race** for its pending transition (transitions below).
   Research on haiku-class, quote extraction on sonnet-class; publish/audit stay on the
   session's main (strong) model.
3. **Advance statuses**, write `notes`, release claims (`claimed_by = null, claimed_at = null`).
4. **Refresh + snapshot**:

```sql
select essentials.refresh_readrank_pipeline_counters();
select office_category, status, count(*),
       count(*) filter (where rankable_topics > 0) as rankable
from essentials.readrank_race_pipeline group by 1,2 order by 1,2;
```

Report the snapshot and list races newly awaiting the human live-selection step.

## Transitions

### needs_race → needs_roster
Create `essentials.elections` (reuse an existing election row for the same state+date+kind
if present!) and `essentials.races` rows. Mirror existing conventions: `position_name` like
existing rows ("Governor of Ohio"), `office_id` nullable (link only if an obvious
`essentials.offices` row exists), party primaries = separate race rows sharing one election,
`primary_party` set. Then set the pipeline row's `race_id`.

### needs_roster → needs_quotes
The pipeline row's `notes` holds the researched candidate JSON. Verify against the SOS list,
then insert `essentials.race_candidates` (full_name, first/last, is_incumbent,
candidate_status 'active', website_url, source like 'manual:pipeline-2026'). Ensure each
major candidate has an `essentials.politicians` row (quotes attach to politician_id) —
create minimal rows if missing. Roster is done when every ballot-listed candidate is present.

### needs_quotes → quotes_staged
Per candidate, work DOWN the source hierarchy (QUOTE-CURATION-PRINCIPLES §5): 1 debates &
forums, 2 news interviews, 3 prepared remarks, 4 candidate-bylined written (verbatim
sentences only + justification note). Tier 5 (hot-mic/gotcha) is banned. Curate against
`.claude/skills/audit-quotes/CHECKS.md` UP FRONT: forward-looking operative clause, answers
the topic's ranking question, honest de-id, no partisan tells, prefer the HOW. Stage as a
publish-quotes `batch.json` per candidate. Goal: >= 2 candidates per topic or the topic
doesn't ship.

### quotes_staged → published
Run the **publish-quotes** skill on each staged batch (dry-run, user OK, --commit). It
inserts drafts and auto-runs **audit-quotes** on the new ids.

### published → audited
Audit findings clean (or fixed via the audit's gated flow) -> `audited`. Findings needing
judgment -> `blocked` + `status_reason`. NOTE: `audited` is machine-done, not voter-visible:
a human still selects the live quote per (candidate, topic) in `/admin/readrank-quotes`;
`rankable_topics` counts only live selections.

## Rules

- Never mark `blocked`/`skipped` without `status_reason`.
- Production DB: additive writes only (inserts, status updates). Never delete/overwrite
  quotes, races, or candidates in a pipeline session.
- All quote sourcing rules live in `essentials/docs/QUOTE-CURATION-PRINCIPLES.md` +
  `.claude/skills/audit-quotes/CHECKS.md` — read both before sourcing.
- MI Aug 4 / WI+MN Aug 11 primaries outrank everything until they pass.
````

- [ ] **Step 2: Verify the skill loads** — from an on-the-record session, invoke `race-pipeline` via the Skill tool; expected: content loads, no YAML frontmatter errors (name/description parse).

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/GitHub/on-the-record
git add .claude/skills/race-pipeline/SKILL.md
git commit -m "race-pipeline: session playbook skill"
```

### Task 9: Smoke-test session + handoff report

**Files:** none

- [ ] **Step 1: Run a miniature pipeline session (N=2)** following SKILL.md exactly: claim the top 2 rows (should be MI primary races), run their pending transitions with real agents, advance statuses, release claims. Stop before any `--commit` quote insert unless Chris is present to approve wording (publish-quotes requires the user's OK — that's the design, not a failure).

- [ ] **Step 2: Verify queue integrity after the session**

```sql
select count(*) as stuck_claims from essentials.readrank_race_pipeline
where claimed_at is not null;                        -- expected 0 after release
select count(*) as reason_missing from essentials.readrank_race_pipeline
where status in ('blocked','skipped') and status_reason is null;  -- expected 0
```

- [ ] **Step 3: Produce the kickoff coverage report for Chris** — the snapshot query from SKILL.md §4 plus: total races by tier, the blocked list with reasons, and the projected order of the next 3 sessions (which races they'd pull). Deliver in the final message.

- [ ] **Step 4: Commit any queue-affecting artifacts and update the spec status line** (`read-rank` spec header: `Status: Implemented — queue live, sessions running`), commit both repos.

---

## Self-review notes

- **Spec coverage:** Component 1 → Task 1; counters → Task 2; Pass A → Task 3; Pass B lanes 1–5 → Tasks 4–5; Pass C → Tasks 6–7; playbook → Task 8; session model proof → Task 9. Quality gates are embedded in Task 8's transition docs (sourcing rubric = CHECKS.md up front).
- **Human gates preserved:** publish-quotes dry-run/commit approval and live-quote selection stay with Chris (Task 8 SKILL.md, Task 9 Step 1).
- **Idempotency:** Task 3 `on conflict (race_id) do nothing`; Task 7 partial-unique `(race_label, election_date) where race_id is null`; both reruns are safe.
- **Known softness (accepted):** research-lane counts are ranges, not exact assertions — election data is external; verification agents + blocked-status are the guard, not fixed expectations.
