# Unranked Candidates at the Reveal — Implementation Plan (read-rank frontend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reveal render candidates the user judged but never agreed with, so a race with zero agreements still produces a real "who said what" ballot instead of an apology.

**Architecture:** `BallotEntry.rank` becomes `number | null`. `ResultsPhase` partitions the ballot into ranked and unranked and renders them as two sections; `CandidateBallotCard` drops the rank chip and celebration for unranked entries; `RevealBand` gains a second copy variant. The alignment matrix and pills need no changes — `buildPerTopicRankMap` already skips null-rank quotes and `markForQuotes` already emits disagreed marks.

**Tech Stack:** React 19, TypeScript, Zustand, framer-motion, Vitest + @testing-library/react.

**Scope:** This plan covers **read-rank only**. The matching ev-accounts rule change (a candidate enters the ballot on ≥1 *judged* quote rather than ≥1 agreed) is a separate plan in that repo. Per the spec §9 this side **must ship first** — it is inert until the backend starts sending nulls, whereas the reverse order makes today's UI render empty rank chips and spurious "Tied" tags.

**Spec:** `docs/superpowers/specs/2026-07-28-unranked-candidates-reveal-design.md`

**Run tests with:** `npx vitest run <path>` for one file, `npm run test` for all, `npx tsc -b` to typecheck.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/data/api.ts` | Modify (`BallotEntry.rank`) | Wire type — the single source of the nullable rank |
| `src/components/CandidateBallotCard.tsx` | Modify | Renders one entry, ranked or not |
| `src/components/ResultsPhase.tsx` | Modify | Partitions the ballot, owns section headings and empty states |
| `src/components/RevealBand.tsx` | Modify | Band copy for both states |
| `src/data/mockData.ts` | Modify (`buildMockReveal`) | Offline dev must model the same inclusion rule |
| `src/components/__tests__/CandidateBallotCard.unranked.test.tsx` | Create | Card behaviour with `rank: null` |
| `src/components/__tests__/ResultsPhase.unranked.test.tsx` | Create | Sections, announcement, empty-ballot split |
| `src/components/__tests__/RevealBand.test.tsx` | Create | Both copy variants |
| `src/data/__tests__/mockReveal.test.ts` | Create | Mock inclusion rule |
| `src/utils/__tests__/alignmentMarks.test.ts` | Modify (append) | Characterisation guard: null ranks don't perturb the mark layer |

---

## Task 1: Tolerate unranked entries

Making `rank` nullable breaks the compiler in exactly two places — `RankNumber rank={entry.rank}` and the `tiedRanks` `Map<number, number>`. Those fixes ship with the type change because `npx tsc -b` cannot pass without them. The screen-reader announcement (`ballot[0]`) is addressed in Task 3, where sections are introduced.

**Files:**
- Modify: `src/data/api.ts:101-103`
- Modify: `src/components/CandidateBallotCard.tsx:59-93`
- Modify: `src/components/ResultsPhase.tsx:58-63`, `src/components/ResultsPhase.tsx:156`
- Test: `src/components/__tests__/CandidateBallotCard.unranked.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/CandidateBallotCard.unranked.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CandidateBallotCard } from '../CandidateBallotCard';
import type { BallotEntry } from '../../data/api';

const unranked: BallotEntry = {
  rank: null,
  candidateId: 'cand-u',
  name: 'Dana Reyes',
  office: 'County Commissioner',
  photo: '',
  essentialsUrl: 'https://essentials.empowered.vote/politician/cand-u',
  evidence: { agreementCount: 0, firstPlaceCount: 0, topicsWithAgreement: 0 },
  perTopic: [
    {
      topicKey: 'housing',
      title: 'Housing',
      userTopWinner: false,
      quotes: [{ quoteId: 'u1', text: 'Build less.', supported: false, rank: null }],
    },
  ],
};

const ranked: BallotEntry = {
  ...unranked,
  rank: 2,
  candidateId: 'cand-r',
  name: 'Sam Okafor',
  evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
  perTopic: [
    {
      topicKey: 'housing',
      title: 'Housing',
      userTopWinner: false,
      quotes: [{ quoteId: 'r1', text: 'Build more.', supported: true, rank: 2 }],
    },
  ],
};

describe('CandidateBallotCard with an unranked entry', () => {
  it('renders no rank chip', () => {
    const { container } = render(
      <CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} />
    );
    expect(container.querySelector('.rank-number')).toBeNull();
  });

  it('announces "Not ranked" instead of a rank', () => {
    render(<CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} />);
    expect(screen.getByText(/not ranked/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Ranked \d/)).not.toBeInTheDocument();
  });

  it('never shows a tie tag, even if tied is passed', () => {
    render(<CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} tied />);
    expect(screen.queryByText(/^Tied$/)).not.toBeInTheDocument();
  });

  it('still renders the identity and the quote toggle', () => {
    render(<CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} />);
    expect(screen.getByText(/dana reyes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /see what they said/i })).toBeInTheDocument();
  });

  it('still renders the rank chip for a ranked entry', () => {
    const { container } = render(
      <CandidateBallotCard entry={ranked} totalTopics={3} rankMap={new Map()} />
    );
    expect(container.querySelector('.rank-number')?.textContent).toBe('2');
    expect(screen.getByText(/^Ranked 2$/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/CandidateBallotCard.unranked.test.tsx`

Expected: FAIL. TypeScript rejects `rank: null` in the fixture (`Type 'null' is not assignable to type 'number'`), and at runtime the "Not ranked" assertion fails because the card always renders a chip.

- [ ] **Step 3: Make `rank` nullable in the wire type**

In `src/data/api.ts`, in `interface BallotEntry`, replace:

```ts
export interface BallotEntry {
  rank: number;
```

with:

```ts
export interface BallotEntry {
  /** 1-based rank, or null when the user judged this candidate but never agreed
   *  with any of their quotes. See
   *  docs/superpowers/specs/2026-07-28-unranked-candidates-reveal-design.md */
  rank: number | null;
```

- [ ] **Step 4: Render the rank column conditionally**

In `src/components/CandidateBallotCard.tsx`, immediately after the `topPicks` line in the component body, add:

```tsx
  // Captured as a const so TypeScript narrows it inside the JSX below.
  const rank = entry.rank;
```

Then replace the rank column block:

```tsx
      {!m.reduced && entry.rank === 1 && <MegaParticles active={burst} />}
      <div className="ballot-rankcol">
        <RankNumber rank={entry.rank} size={28} />
        <span className="sr-only">Ranked {entry.rank}{tied ? ', tied' : ''}</span>
        {tied && <span className="ballot-tie">Tied</span>}
      </div>
```

with:

```tsx
      {!m.reduced && rank === 1 && <MegaParticles active={burst} />}
      <div className="ballot-rankcol">
        {rank != null ? (
          <>
            <RankNumber rank={rank} size={28} />
            <span className="sr-only">Ranked {rank}{tied ? ', tied' : ''}</span>
            {tied && <span className="ballot-tie">Tied</span>}
          </>
        ) : (
          <span className="sr-only">Not ranked</span>
        )}
      </div>
```

`RankNumber`'s own prop type stays `number` — the card decides not to render it, rather than the chip learning to render nothing.

The `#1` celebration needs no separate guard: `rank === 1` is false for `null`, so `MegaParticles` and the burst timer are unreachable for unranked entries by construction. There is deliberately no test for it — asserting the absence of an unclassed particle `div` would pin markup, not behaviour.

- [ ] **Step 5: Stop `tiedRanks` bucketing nulls together**

In `src/components/ResultsPhase.tsx`, replace:

```tsx
  // Detect shared ranks for the tie tag.
  const tiedRanks = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of ballot) counts.set(e.rank, (counts.get(e.rank) ?? 0) + 1);
    return counts;
  }, [ballot]);
```

with:

```tsx
  // Detect shared ranks for the tie tag. Unranked entries share no rank —
  // bucketing their nulls together would tag every one of them "Tied".
  const tiedRanks = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of ballot) {
      if (e.rank == null) continue;
      counts.set(e.rank, (counts.get(e.rank) ?? 0) + 1);
    }
    return counts;
  }, [ballot]);
```

And in the same file replace the `tied` prop:

```tsx
            tied={(tiedRanks.get(entry.rank) ?? 0) > 1}
```

with:

```tsx
            tied={entry.rank != null && (tiedRanks.get(entry.rank) ?? 0) > 1}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/CandidateBallotCard.unranked.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 7: Typecheck and run the whole suite**

Run: `npx tsc -b && npm run test`
Expected: `tsc` silent; all tests pass. If `tsc` reports another `rank` site, null-guard it the same way and note it in the commit body.

- [ ] **Step 8: Commit**

```bash
git add src/data/api.ts src/components/CandidateBallotCard.tsx src/components/ResultsPhase.tsx src/components/__tests__/CandidateBallotCard.unranked.test.tsx
git commit -m "feat(reveal): tolerate ballot entries with no rank

BallotEntry.rank becomes number | null so the reveal can carry candidates
the user judged but never agreed with. The card renders no chip, no tie
tag and no #1 burst for them, and tiedRanks skips nulls rather than
bucketing every unranked entry into one 'Tied' group."
```

---

## Task 2: Mock the new inclusion rule

`buildMockReveal` is the only implementation of the reveal that runs in local dev and in most tests, so it must model the backend rule rather than the old one. Divergence here is what produced the false "you didn't agree with any quotes" screen in #87.

**Files:**
- Modify: `src/data/mockData.ts:219-290`
- Test: `src/data/__tests__/mockReveal.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/data/__tests__/mockReveal.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildMockReveal, buildMockRacePayload } from '../mockData';
import type { VerdictRecord } from '../../store/useReadRankStore';

// Derive fixtures from the mock payload rather than hardcoding ids, so these
// tests survive edits to the mock quote set.
const payload = buildMockRacePayload();
const allQuotes = payload.topics.flatMap((t) => t.quotes);
const tokens = [...new Set(allQuotes.map((q) => q.candidateToken))];

function verdict(quoteId: string, supported: boolean, rank: number | null): VerdictRecord {
  return { quote_id: quoteId, supported, rank, session_size: allQuotes.length };
}

describe('buildMockReveal inclusion rule', () => {
  it('returns every judged candidate unranked when nothing was agreed', () => {
    const verdicts = allQuotes.map((q) => verdict(q.id, false, null));
    const result = buildMockReveal(verdicts);

    expect(result.ballot.length).toBe(tokens.length);
    expect(result.ballot.every((e) => e.rank === null)).toBe(true);
    expect(result.ballot.every((e) => e.evidence.agreementCount === 0)).toBe(true);
  });

  it('includes a candidate the user only disagreed with, unranked, alongside ranked ones', () => {
    const agreedToken = tokens[0];
    const disagreedOnly = tokens[1];
    const relevant = allQuotes.filter((q) =>
      q.candidateToken === agreedToken || q.candidateToken === disagreedOnly
    );
    let rank = 1;
    const verdicts = relevant.map((q) =>
      q.candidateToken === agreedToken ? verdict(q.id, true, rank++) : verdict(q.id, false, null)
    );

    const result = buildMockReveal(verdicts);
    const ranked = result.ballot.filter((e) => e.rank != null);
    const unranked = result.ballot.filter((e) => e.rank == null);

    expect(ranked.length).toBe(1);
    expect(unranked.length).toBe(1);
    expect(unranked[0].evidence.agreementCount).toBe(0);
    // The unranked candidate still carries their quotes, with provenance.
    expect(unranked[0].perTopic.flatMap((t) => t.quotes).length).toBeGreaterThan(0);
    expect(unranked[0].perTopic.flatMap((t) => t.quotes).every((q) => q.supported === false)).toBe(true);
  });

  it('puts ranked candidates before unranked ones', () => {
    const agreedToken = tokens[0];
    let rank = 1;
    const verdicts = allQuotes.map((q) =>
      q.candidateToken === agreedToken ? verdict(q.id, true, rank++) : verdict(q.id, false, null)
    );
    const result = buildMockReveal(verdicts);

    const firstUnranked = result.ballot.findIndex((e) => e.rank == null);
    const lastRanked = result.ballot.map((e) => e.rank != null).lastIndexOf(true);
    expect(lastRanked).toBeLessThan(firstUnranked);
  });

  it('excludes candidates the user never judged', () => {
    const onlyToken = tokens[0];
    const verdicts = allQuotes
      .filter((q) => q.candidateToken === onlyToken)
      .map((q, i) => verdict(q.id, true, i + 1));
    const result = buildMockReveal(verdicts);

    expect(result.ballot.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/__tests__/mockReveal.test.ts`
Expected: FAIL — the first test gets `ballot.length` of `0` instead of `tokens.length`, because `buildMockReveal` skips unsupported verdicts before creating an aggregate.

- [ ] **Step 3: Aggregate on judged, score on agreed**

In `src/data/mockData.ts`, replace the verdict loop:

```ts
  for (const v of verdicts) {
    const q = quoteById.get(v.quote_id);
    if (!q || !v.supported) continue;
    const a = ensure(q.token);
    a.agreementCount += 1;
```

with:

```ts
  for (const v of verdicts) {
    const q = quoteById.get(v.quote_id);
    if (!q) continue;
    // Judging a candidate is enough to put them on the ballot; only agreements
    // score and rank. Mirrors the backend rule (spec §2).
    const a = ensure(q.token);
    if (!v.supported) continue;
    a.agreementCount += 1;
```

- [ ] **Step 4: Split ranked from unranked when building entries**

Still in `src/data/mockData.ts`, update the comment above the per-topic loop:

```ts
  // Build per-topic detail for every candidate the user agreed with.
```

to:

```ts
  // Build per-topic detail for every candidate the user judged.
```

Then replace the sort-and-map block:

```ts
  const ranked = [...aggs.values()].sort(
    (x, y) => y.score - x.score || y.agreementCount - x.agreementCount || y.firstPlaceCount - x.firstPlaceCount
  );

  const ballot: BallotEntry[] = ranked.map((a, i) => {
```

with:

```ts
  const all = [...aggs.values()];
  const ranked = all
    .filter((a) => a.agreementCount > 0)
    .sort((x, y) => y.score - x.score || y.agreementCount - x.agreementCount || y.firstPlaceCount - x.firstPlaceCount);
  // Judged but never agreed with: no rank, and they follow the ranked tail in a
  // stable order (insertion order of `aggs`, which follows the verdict list).
  const unrankedAggs = all.filter((a) => a.agreementCount === 0);

  const toEntry = (a: Agg, rank: number | null): BallotEntry => {
```

Then, inside the existing entry body, change the `rank` property from `rank: i + 1` to `rank,` and close the helper followed by the two mapped lists. The full replacement for the entry construction is:

```ts
  const toEntry = (a: Agg, rank: number | null): BallotEntry => {
    const id = MOCK_IDENTITIES[a.token];
    return {
      rank,
      candidateId: id.candidateId,
      name: id.name,
      office: id.office,
      title: id.title,
      chamber: id.chamber,
      district: id.district,
      photo: id.photo,
      essentialsUrl: `https://essentials.empowered.vote/politician/${id.candidateId}`,
      evidence: {
        agreementCount: a.agreementCount,
        firstPlaceCount: a.firstPlaceCount,
        topicsWithAgreement: a.topicsWithAgreement.size,
      },
      perTopic: [...a.perTopic.values()],
      score: a.score,
    };
  };

  const ballot: BallotEntry[] = [
    ...ranked.map((a, i) => toEntry(a, i + 1)),
    ...unrankedAggs.map((a) => toEntry(a, null)),
  ];
```

Note: `interface Agg` is declared inside `buildMockReveal`, so `toEntry` must be declared after it — keeping it in the same function body as shown satisfies that.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/data/__tests__/mockReveal.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Run the whole suite**

Run: `npx tsc -b && npm run test`

Expected: all pass. `ResultsPhase.test.tsx` relies on `buildMockReveal` via the offline fallback and agrees with one quote, so its candidate stays ranked — but if any assertion there counts ballot entries, it will now see the previously-hidden disagreed candidates. Update those expectations to match the new rule rather than weakening the rule.

- [ ] **Step 7: Commit**

```bash
git add src/data/mockData.ts src/data/__tests__/mockReveal.test.ts
git commit -m "feat(reveal): mock includes judged-but-unagreed candidates

buildMockReveal now aggregates on judged rather than agreed, emitting
rank: null for candidates with no agreements, ranked entries first. Keeps
offline dev honest about the shape production will send — mock/real
divergence is what produced the false empty-ballot screen in #87."
```

---

## Task 3: Two sections in `ResultsPhase`

**Files:**
- Modify: `src/components/ResultsPhase.tsx:134-158`
- Test: `src/components/__tests__/ResultsPhase.unranked.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/ResultsPhase.unranked.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsPhase } from '../ResultsPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';
import type { BallotEntry, RevealResult } from '../../data/api';

const payload: RacePayload = {
  raceId: 'real-race-u',
  positionName: 'County Commissioner',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How do we make housing affordable?',
      quotes: [
        { id: 'u-q1', text: 'Build more starter homes.', candidateToken: 'a', topicKey: 'housing' },
        { id: 'u-q2', text: 'Expand rental assistance.', candidateToken: 'b', topicKey: 'housing' },
      ],
    },
  ],
};

function entry(over: Partial<BallotEntry>): BallotEntry {
  return {
    rank: null,
    candidateId: 'c1',
    name: 'Dana Reyes',
    office: 'County Commissioner',
    photo: '',
    essentialsUrl: 'https://essentials.empowered.vote/politician/c1',
    evidence: { agreementCount: 0, firstPlaceCount: 0, topicsWithAgreement: 0 },
    perTopic: [
      {
        topicKey: 'housing',
        title: 'Housing',
        userTopWinner: false,
        quotes: [{ quoteId: 'u-q2', text: 'Expand rental assistance.', supported: false, rank: null }],
      },
    ],
    ...over,
  };
}

function stubReveal(ballot: BallotEntry[]) {
  const body: RevealResult = { raceId: 'real-race-u', positionName: 'County Commissioner', ballot };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }));
}

const s = () => useReadRankStore.getState();

function play() {
  window.localStorage?.clear();
  s().reset();
  s().selectRace(payload);
  s().agree(payload.topics[0].quotes[0]);
  s().disagree(payload.topics[0].quotes[1]);
  s().revealBallot();
}

afterEach(() => vi.unstubAllGlobals());

describe('ResultsPhase with unranked candidates', () => {
  it('splits ranked and unranked into two sections', async () => {
    stubReveal([
      entry({ rank: 1, candidateId: 'c-ranked', name: 'Sam Okafor', evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 } }),
      entry({}),
    ]);
    play();
    render(<ResultsPhase />);

    expect(await screen.findByText(/how the candidates stack up/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/also on the ballot/i)).toBeInTheDocument();
    expect(screen.getByText(/didn't agree with any of their positions/i)).toBeInTheDocument();
  });

  it('uses a single "Who said what" heading when nothing is ranked', async () => {
    stubReveal([entry({}), entry({ candidateId: 'c2', name: 'Sam Okafor' })]);
    play();
    render(<ResultsPhase />);

    expect(await screen.findByText(/who said what/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/how the candidates stack up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/also on the ballot/i)).not.toBeInTheDocument();
  });

  it('never announces a number one when nothing is ranked', async () => {
    stubReveal([entry({})]);
    play();
    render(<ResultsPhase />);

    await screen.findByText(/who said what/i, {}, { timeout: 3000 });
    expect(screen.queryByText(/your number one/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no ranking/i)).toBeInTheDocument();
  });

  it('announces the number one from the ranked entries only', async () => {
    stubReveal([
      entry({ rank: 1, candidateId: 'c-ranked', name: 'Sam Okafor', evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 } }),
      entry({}),
    ]);
    play();
    render(<ResultsPhase />);

    expect(await screen.findByText(/your number one is Sam Okafor/i, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('does not tag unranked entries as tied', async () => {
    stubReveal([entry({}), entry({ candidateId: 'c2', name: 'Sam Okafor' })]);
    play();
    render(<ResultsPhase />);

    await screen.findByText(/who said what/i, {}, { timeout: 3000 });
    expect(screen.queryByText(/^Tied$/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/ResultsPhase.unranked.test.tsx`
Expected: FAIL — no "Also on the ballot" or "Who said what" text exists yet, and the announcement names an unranked entry as number one.

- [ ] **Step 3: Partition the ballot**

In `src/components/ResultsPhase.tsx`, directly after the `tiedRanks` `useMemo`, add:

```tsx
  const ranked = useMemo(() => ballot.filter((e) => e.rank != null), [ballot]);
  const unranked = useMemo(() => ballot.filter((e) => e.rank == null), [ballot]);
```

- [ ] **Step 4: Announce from the ranked entries only**

Replace:

```tsx
  const top = ballot[0];
  const revealAnnouncement = top
    ? `Ballot revealed. Your number one is ${top.name}, agreed with ${top.evidence.agreementCount} position${top.evidence.agreementCount === 1 ? '' : 's'}.`
    : '';
```

with:

```tsx
  const top = ranked[0];
  const revealAnnouncement = top
    ? `Ballot revealed. Your number one is ${top.name}, agreed with ${top.evidence.agreementCount} position${top.evidence.agreementCount === 1 ? '' : 's'}.`
    : "Ballot revealed. You didn't agree with any of these positions, so there's no ranking — here's who said what.";
```

- [ ] **Step 5: Render the two sections**

Replace the heading and single map:

```tsx
        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', margin: '1.25rem 0 0.25rem' }}>
          How the candidates stack up
        </h3>

        {ballot.map((entry, i) => (
          <CandidateBallotCard key={entry.candidateId} entry={entry} totalTopics={topicCount}
            rankMap={rankMap}
            tied={entry.rank != null && (tiedRanks.get(entry.rank) ?? 0) > 1}
            landDelayMs={timeline.cardDelay(i)} />
        ))}
```

with:

```tsx
        {ranked.length > 0 && (
          <>
            <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', margin: '1.25rem 0 0.25rem' }}>
              How the candidates stack up
            </h3>
            {ranked.map((entry, i) => (
              <CandidateBallotCard key={entry.candidateId} entry={entry} totalTopics={topicCount}
                rankMap={rankMap}
                tied={entry.rank != null && (tiedRanks.get(entry.rank) ?? 0) > 1}
                landDelayMs={timeline.cardDelay(i)} />
            ))}
          </>
        )}

        {unranked.length > 0 && (
          <>
            <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', margin: '1.25rem 0 0.25rem' }}>
              {ranked.length > 0 ? 'Also on the ballot' : 'Everyone you read'}
            </h3>
            {ranked.length > 0 && (
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
                You read them, but didn&apos;t agree with any of their positions.
              </p>
            )}
            {/* Cascade index continues across both sections so the animation
                doesn't restart at the second heading. */}
            {unranked.map((entry, i) => (
              <CandidateBallotCard key={entry.candidateId} entry={entry} totalTopics={topicCount}
                rankMap={rankMap}
                landDelayMs={timeline.cardDelay(ranked.length + i)} />
            ))}
          </>
        )}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/ResultsPhase.unranked.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 7: Run the whole suite and typecheck**

Run: `npx tsc -b && npm run test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/ResultsPhase.tsx src/components/__tests__/ResultsPhase.unranked.test.tsx
git commit -m "feat(reveal): separate section for candidates you didn't rank

Ranked candidates keep 'How the candidates stack up'; unranked ones sit
under 'Also on the ballot', or a single 'Who said what' when nothing is
ranked at all. The reveal cascade index runs continuously across both
sections, and the screen-reader announcement no longer names an unranked
candidate as the user's number one."
```

---

## Task 4: Honest summary strip for unranked entries

`Agreed with 0 of 7` is true and useless. Replace it with the fact that applies.

**Files:**
- Modify: `src/components/CandidateBallotCard.tsx:95-101`
- Test: `src/components/__tests__/CandidateBallotCard.unranked.test.tsx` (append)

- [ ] **Step 1: Write the failing test**

Append to `src/components/__tests__/CandidateBallotCard.unranked.test.tsx`, inside the existing `describe`:

```tsx
  it('reports what it disagreed on instead of "Agreed with 0"', () => {
    render(<CandidateBallotCard entry={unranked} totalTopics={3} rankMap={new Map()} />);
    expect(screen.getByText(/disagreed on/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 3/)).toBeInTheDocument();
    expect(screen.queryByText(/agreed with/i)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/CandidateBallotCard.unranked.test.tsx -t "disagreed on"`
Expected: FAIL — the strip currently renders "Agreed with 0 of 3".

- [ ] **Step 3: Branch the strip on rank**

In `src/components/CandidateBallotCard.tsx`, add below the `rank` const from Task 1:

```tsx
  // Topics where the user judged one of this candidate's quotes and rejected it.
  const disagreedTopics = entry.perTopic.filter((t) => t.quotes.some((q) => !q.supported)).length;
```

Then replace:

```tsx
          <p className="ballot-evidence">
            Agreed with <strong>{agreementCount} of {totalTopics}</strong>
            {topPicks > 0 && (
              <> · <span className="ballot-topk">{topPicks} top pick{topPicks === 1 ? '' : 's'}</span></>
            )}
          </p>
```

with:

```tsx
          <p className="ballot-evidence">
            {rank != null ? (
              <>
                Agreed with <strong>{agreementCount} of {totalTopics}</strong>
                {topPicks > 0 && (
                  <> · <span className="ballot-topk">{topPicks} top pick{topPicks === 1 ? '' : 's'}</span></>
                )}
              </>
            ) : (
              <>
                Disagreed on <strong>{disagreedTopics} of {totalTopics}</strong> topic{disagreedTopics === 1 ? '' : 's'}
              </>
            )}
          </p>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/CandidateBallotCard.unranked.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Run the whole suite**

Run: `npx tsc -b && npm run test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/CandidateBallotCard.tsx src/components/__tests__/CandidateBallotCard.unranked.test.tsx
git commit -m "feat(reveal): unranked cards report disagreements, not 'Agreed with 0'"
```

---

## Task 5: `RevealBand` copy for a ballot with nothing ranked

> **Spec correction.** Spec §6 says to derive the variant from `rankedCount === 0` "so the band can't disagree with the roster below it". That reasoning is wrong: `rankedCount` is the count of *quotes the user agreed with* (from the store), while the roster is built from the *ballot the backend returned*. Those can disagree — a ballot of all-unranked entries alongside a non-zero agreed count. Driving copy off the store while the list below is driven off the response is exactly the class of bug that produced #87. So the variant is passed in explicitly, computed from the roster. Fold this correction back into the spec after the plan is approved.

**Files:**
- Modify: `src/components/RevealBand.tsx`
- Modify: `src/components/ResultsPhase.tsx` (three `RevealBand` call sites, plus the explanatory line)
- Test: `src/components/__tests__/RevealBand.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/RevealBand.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevealBand } from '../RevealBand';

describe('RevealBand', () => {
  it('reports ranked quotes and the agreement headline when the roster has ranks', () => {
    render(<RevealBand office="CA Governor" rankedCount={4} judgedCount={12} topicCount={3} nothingRanked={false} />);
    expect(screen.getByText(/you ranked 4 quotes across 3 topics/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /now see who you agreed with/i })).toBeInTheDocument();
  });

  it('reports quotes read and the who-said-what headline when the roster has none', () => {
    render(<RevealBand office="CA Governor" rankedCount={0} judgedCount={12} topicCount={3} nothingRanked />);
    expect(screen.getByText(/you read 12 quotes across 3 topics/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /now see who said what/i })).toBeInTheDocument();
    expect(screen.queryByText(/you ranked 0/i)).not.toBeInTheDocument();
  });

  it('follows the roster, not the agreed count, when the two disagree', () => {
    // Backend ranked nobody despite the user having agreed with something. The
    // band must not promise a ranking the list below it doesn't have.
    render(<RevealBand office="CA Governor" rankedCount={2} judgedCount={12} topicCount={3} nothingRanked />);
    expect(screen.getByRole('heading', { name: /now see who said what/i })).toBeInTheDocument();
    expect(screen.getByText(/you read 12 quotes/i)).toBeInTheDocument();
  });

  it('singularises one quote and one topic', () => {
    render(<RevealBand office="" rankedCount={0} judgedCount={1} topicCount={1} nothingRanked />);
    expect(screen.getByText(/you read 1 quote across 1 topic$/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/RevealBand.test.tsx`
Expected: FAIL — `judgedCount` is not a prop, and the band always renders the "you ranked" / "you agreed with" copy.

- [ ] **Step 3: Add the variant to `RevealBand`**

Replace the whole body of `src/components/RevealBand.tsx` below the imports:

```tsx
export interface RevealBandProps {
  office: string;
  /** Quotes the user agreed with — shown in the ranked variant. */
  rankedCount: number;
  /** Quotes the user judged, agreed or disagreed — shown in the unranked variant. */
  judgedCount: number;
  topicCount: number;
  /** True when the revealed ballot has no ranked candidates. Driven by the
   *  roster rather than by rankedCount, which counts quotes from the local
   *  store and can disagree with what the backend actually ranked. */
  nothingRanked: boolean;
}

/** The merged reveal beat (spec §1): a persistent dark band atop the results.
 *  With nothing ranked, the band drops the ranking language entirely — "You
 *  ranked 0 quotes" reads as an error message rather than a summary. */
export const RevealBand: React.FC<RevealBandProps> = ({ office, rankedCount, judgedCount, topicCount, nothingRanked }) => {
  const reduced = useReducedMotion();
  const count = nothingRanked ? judgedCount : rankedCount;
  return (
    <motion.div className="reveal-band"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <p className="reveal-band-eyebrow">
        {office ? <>{office} · </> : null}
        You {nothingRanked ? 'read' : 'ranked'} {count} quote{count === 1 ? '' : 's'} across {topicCount} topic{topicCount === 1 ? '' : 's'}
      </p>
      <h2 className="reveal-band-headline">
        {nothingRanked ? (
          <>Now see <span className="reveal-band-who">who</span> said what</>
        ) : (
          <>Now see <span className="reveal-band-who">who</span> you agreed with</>
        )}
      </h2>
    </motion.div>
  );
};
```

- [ ] **Step 4: Compute `judgedCount` and pass it at all three call sites**

In `src/components/ResultsPhase.tsx`, after the `agreedList` line, add:

```tsx
  const disagreedList = race ? activeTopicKeys.flatMap((k) => race.topics[k]?.disagreed ?? []) : [];
  const judgedCount = agreedList.length + disagreedList.length;
```

Then update every `<RevealBand ... />` in the file — there are three right now (the failure state, the empty state, and the main return; Task 6 later drops the empty-state one) — from:

```tsx
        <RevealBand office={office} rankedCount={agreedList.length} topicCount={topicCount} />
```

to:

```tsx
        <RevealBand office={office} rankedCount={agreedList.length} judgedCount={judgedCount} topicCount={topicCount} nothingRanked={ranked.length === 0} />
```

`ranked` is a `useMemo` declared above every early return, so it is in scope at all three sites.

- [ ] **Step 5: Add the explanatory line under the band**

In the main return of `src/components/ResultsPhase.tsx`, between the `<RevealBand .../>` and the `<div className="space-y-4">`, insert:

```tsx
      {ranked.length === 0 && unranked.length > 0 && (
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '1rem 0 0' }}>
          You didn&apos;t agree with any of these positions, so there&apos;s no ranking to build. Here&apos;s who said them.
        </p>
      )}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/components/__tests__/RevealBand.test.tsx src/components/__tests__/ResultsPhase.unranked.test.tsx`
Expected: PASS.

- [ ] **Step 7: Run the whole suite and typecheck**

Run: `npx tsc -b && npm run test`
Expected: all pass. `ResultsPhase.test.tsx` asserts `you ranked 1 quote across 1 topic` — that path still has a ranked entry, so the copy is unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/components/RevealBand.tsx src/components/ResultsPhase.tsx src/components/__tests__/RevealBand.test.tsx
git commit -m "feat(reveal): band copy for a ballot with nothing ranked

'You ranked 0 quotes across 3 topics' reads as an error. With nothing
ranked the band counts quotes read and the headline becomes 'Now see who
said what', with one line below it saying what happened and why."
```

---

## Task 6: Split the empty ballot into two states

An empty ballot no longer means "agreed with nothing" — it means nothing resolved. Two different situations hide behind it (spec §4).

**Files:**
- Modify: `src/components/ResultsPhase.tsx:113-132` (the `ballot.length === 0` block) and the `failed` guard above it
- Test: `src/components/__tests__/ResultsPhase.unranked.test.tsx` (append)

- [ ] **Step 1: Write the failing test**

Append to `src/components/__tests__/ResultsPhase.unranked.test.tsx`:

```tsx
describe('ResultsPhase empty-ballot states', () => {
  it('offers a retry when the user judged quotes but nothing resolved', async () => {
    stubReveal([]);
    play();                       // agrees with one quote, disagrees with another
    render(<ResultsPhase />);

    expect(await screen.findByText(/couldn't build your ballot/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/no agreements yet/i)).not.toBeInTheDocument();
  });

  it('says there is nothing to reveal when the user judged nothing', async () => {
    stubReveal([]);
    window.localStorage?.clear();
    s().reset();
    s().selectRace(payload);
    s().revealBallot();           // straight to results, nothing judged
    render(<ResultsPhase />);

    expect(await screen.findByText(/nothing to reveal yet/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/ResultsPhase.unranked.test.tsx -t "empty-ballot"`
Expected: FAIL — both cases currently render "No agreements yet".

- [ ] **Step 3: Route judged-but-empty into the failure state**

In `src/components/ResultsPhase.tsx`, change the failure guard from:

```tsx
  if (failed) {
```

to:

```tsx
  // An empty ballot after real verdicts means the backend resolved nobody — the
  // same class of problem as an outage, not a statement about the user's choices.
  if (failed || (ballot.length === 0 && judgedCount > 0)) {
```

- [ ] **Step 4: Replace the old empty state**

Replace the entire `if (ballot.length === 0) { ... }` block with:

```tsx
  // Nothing judged at all — e.g. deep-linked straight to /results. Legitimate,
  // so no retry: there is simply nothing to reveal yet.
  if (ballot.length === 0) {
    return (
      <div className="pb-12 max-w-2xl mx-auto">
        {/* No band here: "Now see who said what" over an empty screen promises a
            reveal that doesn't exist yet. */}
        <div className="text-center py-10">
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            Nothing to reveal yet
          </p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Read a topic first and this is where you&apos;ll find out who said what.
          </p>
        </div>
        <div className="flex justify-center pt-6">
          <button onClick={() => setPhase('issue-selection')} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
            ← Back to your topics
          </button>
        </div>
      </div>
    );
  }
```

This retires "You didn't agree with any quotes, so there's no ballot to build. Try another race." — an apology plus a dead-end teaser, which `REDESIGN_SPEC` §8 rules out.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/components/__tests__/ResultsPhase.unranked.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 6: Run the whole suite and typecheck**

Run: `npx tsc -b && npm run test`

Expected: all pass. `ResultsPhase.revealFailure.test.tsx` has a case asserting "No agreements yet" for a `200` with an empty ballot — that scenario judges quotes first, so it now correctly lands in the retry state. Update that test's expectation to the retry copy; the behaviour it was pinning has been deliberately replaced.

- [ ] **Step 7: Commit**

```bash
git add src/components/ResultsPhase.tsx src/components/__tests__/ResultsPhase.unranked.test.tsx src/components/__tests__/ResultsPhase.revealFailure.test.tsx
git commit -m "feat(reveal): split the empty ballot into nothing-judged vs unresolved

With unranked candidates on the ballot, empty no longer means 'agreed
with nothing'. Judged-but-empty is anomalous and gets the retry state;
judged-nothing gets 'Nothing to reveal yet' and a route back to topics.
Retires the 'try another race' dead-end copy (REDESIGN_SPEC §8)."
```

---

## Task 7: Characterisation guard on the mark layer

The spec claims the alignment matrix and pills need no changes. This task pins that claim so a future refactor can't quietly break it. These tests pass on first run — they document existing behaviour rather than driving new code, which is the point.

**Files:**
- Modify: `src/utils/__tests__/alignmentMarks.test.ts` (append)

- [ ] **Step 1: Write the characterisation tests**

Append to `src/utils/__tests__/alignmentMarks.test.ts`:

```ts
describe('mark layer tolerates unranked ballot entries', () => {
  const reveal: RevealResult = {
    raceId: 'r',
    positionName: 'Office',
    ballot: [
      {
        rank: 1,
        candidateId: 'ranked',
        name: 'Ranked Person',
        office: 'Office',
        photo: '',
        essentialsUrl: '',
        evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
        perTopic: [
          { topicKey: 'housing', title: 'Housing', userTopWinner: true,
            quotes: [{ quoteId: 'a1', text: 'Yes.', supported: true, rank: 1 }] },
        ],
      },
      {
        rank: null,
        candidateId: 'unranked',
        name: 'Unranked Person',
        office: 'Office',
        photo: '',
        essentialsUrl: '',
        evidence: { agreementCount: 0, firstPlaceCount: 0, topicsWithAgreement: 0 },
        perTopic: [
          { topicKey: 'housing', title: 'Housing', userTopWinner: false,
            quotes: [{ quoteId: 'd1', text: 'No.', supported: false, rank: null }] },
        ],
      },
    ],
  };

  it('builds per-topic ranks from the agreed quotes only', () => {
    const map = buildPerTopicRankMap(reveal);
    expect(map.get('a1')).toBe(1);
    expect(map.has('d1')).toBe(false);
  });

  it('reduces an all-disagreed candidate to a disagreed mark', () => {
    const map = buildPerTopicRankMap(reveal);
    const quotes = reveal.ballot[1].perTopic[0].quotes;
    expect(markForQuotes(quotes, map)).toEqual({ kind: 'disagreed' });
  });

  it('counts no top picks for an unranked candidate', () => {
    const map = buildPerTopicRankMap(reveal);
    expect(countTopPicks(reveal.ballot[1].perTopic[0].quotes, map)).toBe(0);
  });
});
```

If the existing file's imports don't already cover them, add `buildPerTopicRankMap`, `markForQuotes`, `countTopPicks` from `../alignmentMarks` and `type RevealResult` from `../../data/api`.

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/utils/__tests__/alignmentMarks.test.ts`
Expected: PASS. If any of these fail, the spec's "no changes needed" claim is wrong — stop and report rather than editing the mark layer to suit the test.

- [ ] **Step 3: Run the whole suite and typecheck**

Run: `npx tsc -b && npm run test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/utils/__tests__/alignmentMarks.test.ts
git commit -m "test(reveal): pin that the mark layer tolerates null ranks"
```

---

## Task 8: Verify in the browser

Automated tests don't prove the reveal looks right. The mock now models the new rule, so the whole unranked path is reachable in local dev without the backend.

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Use the `read-rank-dev` configuration in `.claude/launch.json` (port 5180). Never start a dev server with a raw shell command.

- [ ] **Step 2: Walk the zero-agreement path**

Go to `/race/mock-in-gov-2024/topics`, start the race, and **disagree with every quote** in all three topics. Click "See your full ballot".

Expected:
- Band reads "GOVERNOR · YOU READ 12 QUOTES ACROSS 3 TOPICS" and "Now see who said what".
- The line "You didn't agree with any of these positions, so there's no ranking to build. Here's who said them."
- A single "Everyone you read" heading — no "How the candidates stack up", no "Also on the ballot".
- Every candidate card: no rank chip, no "Tied", a "Disagreed on N of 3 topics" strip, and a working "See what they said" drawer with sources.
- The alignment matrix shows disagreed marks, no rank numbers.

- [ ] **Step 3: Walk the mixed path**

Reset progress, replay, and agree with **one** quote in the first topic while disagreeing with everything else.

Expected: "How the candidates stack up" with the ranked candidate, then "Also on the ballot" with the explanatory line and the remaining candidates unranked. The card cascade animates continuously through both sections rather than restarting.

- [ ] **Step 4: Check the console and take a screenshot**

Read console messages — expect no errors. Screenshot both states.

- [ ] **Step 5: Commit nothing; report findings**

If anything looks wrong, fix it with a test that would have caught it, then re-verify.

---

## Done when

- `npm run test` and `npx tsc -b` both pass.
- Both browser paths in Task 8 look right.
- No occurrence of "You didn't agree with any quotes" remains in `src/` — check with
  `grep -rn "didn't agree with any" src/`.
- The reachability tests from `c6e5c08`
  (`src/components/__tests__/EvaluationPhase.zeroAgreement.test.tsx`) are still
  passing and unmodified — they cover getting *to* this screen, which every task
  here assumes.
- The spec correction noted in Task 5 has been folded back into
  `docs/superpowers/specs/2026-07-28-unranked-candidates-reveal-design.md` §6.
- The ev-accounts plan has **not** yet been executed — this side ships first (spec §9).
