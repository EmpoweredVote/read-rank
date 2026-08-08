# Draft for review — splitting LA Mayor's economic-development question

**Status:** DRAFT. Nothing written to the database. This is the first real use of the
question-as-unit model, so §7.3's two faithfulness gates apply and you asked to be in the loop on
neutralising moderator framing.

**Recommendation up front: draft the questions now, but do not attach quotes and do not expect two
rankable sets today.** The reason is in §3 below and it is not what I expected when I proposed this.

---

## 1. The real moderator questions

Both halves come from the 2026-05-06 NBC4/Telemundo debate, meeting
`f2cf80ef-a811-4d95-990d-b9c598284eb6`.

**Downtown** — seg-357 (t=4468) and seg-361 (t=4638):

> "Downtown Los Angeles seems to be in a state of crisis. The high rises there, the office buildings
> are worth a fraction of what they used to be. That will impact the budget…"
>
> "Mayor Bass, can we afford to let downtown LA die…?"

**Film** — seg-394 (t=4848) and seg-398 (t=4990):

> "…this next topic, a lot of viewers when we put up the QR code wanted to know about this. It has
> to do with a film and television industry. A lot of people think we're nowhere close to where we
> should be."
>
> "Council Member Ra[m]an, if elected, what would you do differently here? Is enough being done?"

Both need neutralising. *"Can we afford to let downtown LA die"* is loaded — it presupposes the
answer. *"A lot of people think we're nowhere close to where we should be"* imports the moderator's
framing as fact.

## 2. Proposed ranking questions

### A — film and television

> **What should Los Angeles do to keep film and television production from leaving?**

- **Gate 1 (neutral generalisation).** An opponent can answer in the opposite direction without it
  feeling rigged: "nothing — this is Sacramento's job, not the city's" is a legitimate answer the
  wording permits. It presupposes only that production is leaving, which is the factual premise both
  candidates accepted on stage.
- **Blind.** Names no candidate. "Los Angeles" is the race, which §7.3 explicitly allows.
- **On-axis.** The Compass question for `economic-development` is *"How should government attract
  businesses and support economic development?"* — this is a species of it, so `origin='moderator'`
  with no off-axis declaration and §7.2 coupling still applies.

### B — downtown

> **How should Los Angeles respond to the decline of its downtown core?**

- **Gate 1.** "Focus resources elsewhere; downtown's office market is a private problem" is a
  legitimate available answer. The loaded "can we afford to let it die" framing is dropped.
- **Blind.** Yes.
- **On-axis.** Same as A.

Both keep `topic_key = 'economic-development'`. Multiple questions under one topic is exactly what
`readrank_questions` is for, and it is the case Task 4 built the bundle to handle — it will be the
first `(race_id, topic_key)` group in the database carrying more than one question.

## 3. Why this does not produce two rankable sets — the finding that changed my advice

The per-quote pass flagged **both of Bass's economic-development quotes `not-forward`, high
severity** — her answers to both halves are record recitals:

| quote | candidate | half | finding |
|---|---|---|---|
| `ce9bb5b9` | Bass | film | **`not-forward`** — "Entirely record: *we have expedited permits. I established one person who is a czar… We also lowered the cost*" |
| `b2d1f06d` | Bass | downtown | **`not-forward`** — "The operative clause is record: *We have a strategy that is working…*" |

Those are her **only two** economic-development quotes. Under §3's *Record-only is still absent* —
and the casebook's *Record ≠ position* — Bass is **absent from both halves** on current material.

So the split as proposed yields **two single-voice questions, not two rankable ones.** Raman answers
both; Bass answers neither in a forward-looking way.

This also casts doubt on the existing combined question. The per-set pass ruled `ded400bd` rankable
on the pairing Bass `ce9bb5b9` / Raman `79641bcb` — but if `ce9bb5b9` is record, that set was never
rankable either. The per-set agent anticipated exactly this and proposed a casebook entry for it:
*"the per-set verdict is provisional wherever a candidate's set member carries a `not-forward`
finding."* This is that case, and it argues the entry should be written.

**Both of Raman's answers also need work before shipping** — `f7625f7b`'s blind text names the
opponent outright (*"what Mayor Bass has done is to dismantle our economic development department"*),
which is a `deid-dishonest` at high severity, and all four rows have an empty `editor_note`.

## 4. What I recommend

1. **Create both questions now.** They are correct, they are derived from real prompts, and they
   pass both gates. The question bank is durable — the comparability model's §10 explicitly says to
   front-load the question harvest because questions outlive any one sourcing pass.
2. **Do not attach quotes yet.** Gate 2 requires that every attached quote genuinely answers the
   question, and a record recital does not state a position to answer with. Attaching `ce9bb5b9`
   or `b2d1f06d` would launder record into a pseudo-position — precisely what §3 forbids.
3. **Source a forward Bass answer on at least one half.** She is the incumbent on a topic where she
   has a real record, so the material almost certainly exists — just not in this debate, where she
   was answering "what have you done." A questionnaire or a later interview is the natural home.
4. **Fix the two Raman rows** (`deid-dishonest`, empty notes) so they are ready when Bass's side
   arrives.

## 5. The alternative, if you want the split to pay off immediately

Attach Raman's answers to both questions and let them **surface as single-voice** rather than rank.
The question-as-unit design supports this explicitly: *"A question is rankable (enters the ranking
game) only with ≥2 candidates answering; a single candidate's answer is still surfaced (≥1) on the
race/profile page as 'here's where they stand.' Being the only voice on a question is honest
presence, not exclusion."*

That is defensible and it is inclusion-positive. But it makes the asymmetry visible — Raman speaks
to downtown and film, Bass does not — and §8's symmetry rule says a skew that flatters one candidate
is a signal to *investigate*, not to publish as-is. On a two-candidate race I would rather fill the
gap than ship the asymmetry, so I recommend option 4 above unless you disagree.

## 6. Decisions I need

1. **Approve the two question texts** as worded, or redraft them.
2. **Attach nothing now** (my recommendation), or **surface Raman single-voice** (§5).
3. Whether to write the per-set agent's proposed casebook entry — *a per-set verdict is provisional
   where a set member carries a `not-forward` finding* — which this case demonstrates.
