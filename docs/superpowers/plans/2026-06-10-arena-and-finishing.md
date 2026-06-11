# Arena Hub + Finishing Touches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the remaining REDESIGN_SPEC.md items: the hub-as-arena race cards (§1.1), the alignment grid + Compass cross-link on the summary (§1.6, §10), the remaining ev-yellow placements (§5: wordmark underline, active-card rule, stepper underline, hub progress dots, Inform chip), and the feasible degraded states (§8: thin-topic filtering, missing Essentials profile).

**Scope cuts (recorded):**
- Issue-selection takeover screen (§1.1 step 4): topics already auto-sequence via TopicStepper; the arena treatment applies to race cards. Revisit if issue choice becomes a product requirement.
- Compass-priority issue ordering (§1.1): no Compass calibration data is available to this app yet.
- Low-differentiation indicator (§8): requires quote-similarity data that does not exist.
- Video clip slots (§8): no video data; text-source rendering is already the graceful state.
- Community verification badge (§4): future feature, no reserved UI yet.

**Compass URL:** `https://compass.empowered.vote` — extracted from the ev-ui Header's own nav config (not invented).

**Tech Stack:** React 19, vitest + RTL (80 passing at start). Copy rules: no em dashes; two spaces after periods via `&nbsp;` + space.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/data/api.ts` | Modify | `usesRcv?: boolean` on `RaceSummary`; thin-topic filter in `sanitizeRacePayload` |
| `src/data/mockData.ts` | Modify | `usesRcv: false` on `mockRaceSummary` |
| `src/data/__tests__/api.test.ts` | Modify | Thin-topic filter test |
| `src/components/RevealCard.tsx` | Modify | Omit View-candidate link when essentialsUrl is empty |
| `src/components/__tests__/RevealCard.test.tsx` | Modify | Missing-profile test |
| `src/components/QuoteCard.tsx` | Modify | ev-yellow active-card rule |
| `src/components/__tests__/QuoteCard.test.tsx` | Modify | Active-rule class test |
| `src/components/TopicStepper.tsx` | Modify | Yellow underline on the current chip |
| `src/components/RaceHub.tsx` | Modify | Arena cards: wordmark underline, stakes, chips, progress dots |
| `src/components/__tests__/RaceHub.test.tsx` | Create | Card content via mock fallback |
| `src/utils/alignmentGrid.ts` | Create | `buildAlignmentGrid(reveal, agreedIds, topics)` |
| `src/utils/__tests__/alignmentGrid.test.ts` | Create | Grid cell tier logic |
| `src/components/AlignmentGrid.tsx` | Create | Accessible candidates × topics tier table |
| `src/components/CompassCrossLink.tsx` | Create | Dismissible §10 invitation card with Inform chip |
| `src/components/__tests__/SummaryExtras.test.tsx` | Create | Grid component + Compass card |
| `src/components/ResultsPhase.tsx` | Modify | Wire grid + Compass card into the summary |
| `src/components/__tests__/ResultsPhase.test.tsx` | Modify | Flow test gains grid/compass assertions |
| `src/index.css` | Modify | Wordmark/stepper/hub-dot/card-rule yellow accents; grid + compass card styles |

---

### Task 0: Branch

- [x] **Step 1:**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
git checkout -b feat/arena-finishing
```

---

### Task 1: Degraded states + data plumbing

**Files:** `src/data/api.ts`, `src/data/mockData.ts`, `src/data/__tests__/api.test.ts`, `src/components/RevealCard.tsx`, `src/components/__tests__/RevealCard.test.tsx`

- [x] **Step 1: Failing tests.** In `src/data/__tests__/api.test.ts`, add inside the existing describe (reuse its fetch-stubbing pattern — read the file first):

```ts
  it('drops topics with fewer than two quotes (REDESIGN_SPEC §8)', async () => {
    const payload = {
      raceId: 'race-1',
      positionName: 'Governor',
      topics: [
        {
          topicKey: 'thin', title: 'Thin', question: 'Q?',
          quotes: [{ id: 'only', text: 'Lonely quote.', candidateToken: 'a', topicKey: 'thin' }],
        },
        {
          topicKey: 'full', title: 'Full', question: 'Q?',
          quotes: [
            { id: 'f1', text: 'One.', candidateToken: 'a', topicKey: 'full' },
            { id: 'f2', text: 'Two.', candidateToken: 'b', topicKey: 'full' },
          ],
        },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
    const result = await fetchRaceQuotes('race-1');
    expect(result.topics.map((t) => t.topicKey)).toEqual(['full']);
  });
```

In `src/components/__tests__/RevealCard.test.tsx`, add:

```tsx
  it('omits the candidate profile link when no Essentials profile exists', () => {
    render(
      <RevealCard quoteText="A quote." index={0} identity={{ ...identity, essentialsUrl: '' }} revealed onReveal={vi.fn()} />
    );
    expect(screen.queryByRole('link', { name: /view candidate/i })).not.toBeInTheDocument();
  });
```

- [x] **Step 2:** Run both files — the two new tests FAIL.

- [x] **Step 3: Implement.**

In `src/data/api.ts`:
- Add to `RaceSummary` (after `isLocal: boolean;`):

```ts
  /** True where this race is actually decided by ranked choice voting. */
  usesRcv?: boolean;
```

- In `sanitizeRacePayload`, filter thin topics — change the `topics:` mapping to map first, then filter:

```ts
    topics: (raw.topics ?? [])
      .map((topic) => ({
        topicKey: topic.topicKey,
        title: topic.title,
        question: topic.question,
        quotes: (topic.quotes ?? []).map(
          (quote): BlindQuote => ({
            id: quote.id,
            text: quote.text,
            candidateToken: quote.candidateToken,
            topicKey: quote.topicKey,
          })
        ),
      }))
      // A topic with one voice is not a comparison (REDESIGN_SPEC §8).
      .filter((topic) => topic.quotes.length >= 2),
```

In `src/data/mockData.ts`, add `usesRcv: false,` to `mockRaceSummary` (Indiana does not use RCV).

In `src/components/RevealCard.tsx`, wrap the View-candidate anchor:

```tsx
          {identity.essentialsUrl && (
            <a
              href={identity.essentialsUrl}
              ...existing props/children...
            </a>
          )}
```

- [x] **Step 4:** Both test files green; `npm test` 82; build; lint baseline 12. Commit:

```bash
git add src/data/ src/components/RevealCard.tsx src/components/__tests__/RevealCard.test.tsx
git commit -m "feat: drop single-voice topics, omit missing Essentials links, RCV flag on summaries"
```

(End every commit in this plan with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`)

---

### Task 2: ev-yellow accents — active card rule + stepper underline

**Files:** `src/components/QuoteCard.tsx`, `src/components/__tests__/QuoteCard.test.tsx`, `src/components/TopicStepper.tsx`, `src/index.css`

- [x] **Step 1: Failing test.** In `src/components/__tests__/QuoteCard.test.tsx`:

```tsx
  it('carries the Inform accent rule when it is the active card', () => {
    const { container } = render(<QuoteCard quote={quote} onAgree={vi.fn()} onDisagree={vi.fn()} />);
    expect(container.firstElementChild).toHaveClass('ev-quote-card-active');
  });

  it('drops the accent rule when stacked behind the active card', () => {
    const { container } = render(
      <QuoteCard quote={quote} isStacked stackIndex={1} onAgree={vi.fn()} onDisagree={vi.fn()} />
    );
    expect(container.firstElementChild).not.toHaveClass('ev-quote-card-active');
  });
```

- [x] **Step 2:** Run — FAIL.

- [x] **Step 3: Implement.**

In `src/components/QuoteCard.tsx`, the root `motion.div`'s className template includes `ev-quote-card` — add the active class for the draggable (non-stacked) card:

```tsx
        ev-quote-card ${isDraggable ? 'ev-quote-card-active' : ''} w-full max-w-lg md:max-w-xl relative
```

In `src/components/TopicStepper.tsx`, give the chips classes (keep all existing inline styles): add to the `<button>` `className={isCurrent ? 'topic-chip topic-chip-current' : 'topic-chip'}` and add `position: 'relative'` to its style object.

In `src/index.css` (new "Inform accents" section near the Staged Reveal section):

```css
/* ============================================
   ev-yellow Inform accents (REDESIGN_SPEC §5)
   Yellow never carries meaning alone — adjacent text/structure does.
   ============================================ */

/* #2: active quote card left rule (inset shadow: no layout shift) */
.ev-quote-card-active {
  box-shadow: inset 3px 0 0 var(--color-ev-yellow);
}

/* #4: current step underline */
.topic-chip-current::after {
  content: '';
  position: absolute;
  left: 0.625rem;
  right: 0.625rem;
  bottom: -0.3125rem;
  height: 3px;
  border-radius: 2px;
  background-color: var(--color-ev-yellow);
}

/* #1: wordmark underline (used in the hub header) */
.wordmark-underline {
  display: inline-block;
  box-shadow: inset 0 -3px 0 var(--color-ev-yellow);
  padding-bottom: 2px;
}
```

NOTE: `.ev-quote-card` may already define a box-shadow — check `src/index.css`; if it does, the active rule must COMBINE (e.g. `box-shadow: inset 3px 0 0 var(--color-ev-yellow), <existing shadow>;`) rather than clobber. Adapt and report.

Also check `.topic-chip-current::after` is not clipped: the stepper's flex container has `marginBottom: '0.5rem'` — if the underline clips, bump the chip row's margin/padding minimally.

- [x] **Step 4:** Tests green (84 total); build; lint. Commit:

```bash
git add src/components/QuoteCard.tsx src/components/__tests__/QuoteCard.test.tsx src/components/TopicStepper.tsx src/index.css
git commit -m "feat: ev-yellow Inform accents - active card rule, stepper underline, wordmark class"
```

---

### Task 3: RaceHub arena cards

**Files:** `src/components/RaceHub.tsx`, `src/components/__tests__/RaceHub.test.tsx`, `src/index.css`

- [x] **Step 1: Failing tests** — create `src/components/__tests__/RaceHub.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RaceHub } from '../RaceHub';
import { useReadRankStore } from '../../store/useReadRankStore';

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('RaceHub arena cards', () => {
  it('shows the wordmark with its Inform underline', async () => {
    render(<RaceHub />);
    const wordmark = await screen.findByText(/read & rank/i, undefined, { timeout: 3000 });
    expect(wordmark.closest('h1')?.querySelector('.wordmark-underline')).not.toBeNull();
  });

  it('renders the race as a stakes card with election date and meta chips', async () => {
    render(<RaceHub />);
    // jsdom fetch fails → mock fallback supplies the Indiana demo race.
    expect(await screen.findByText('Governor', undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/2024 indiana governor/i)).toBeInTheDocument();
    expect(screen.getByText(/nov 5, 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/4 candidates/i)).toBeInTheDocument();
    expect(screen.getByText(/3 topics/i)).toBeInTheDocument();
    expect(screen.queryByText(/ranked choice election/i)).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2:** Run — FAIL (no underline class, no formatted date).

- [x] **Step 3: Implement in `src/components/RaceHub.tsx`.**

Add a date formatter near the top of the file:

```tsx
function formatElectionDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
```

Wordmark — change the `<h1>` content to:

```tsx
          <span className="wordmark-underline">Read &amp; Rank</span>
```

Replace the card body `<div style={{ padding: '0.75rem 1rem' }}>` contents with the arena layout (keep the surrounding `motion.button`, accent border, status chip logic):

```tsx
              <div style={{ padding: '0.75rem 1rem' }}>
                <div className="flex items-center justify-between gap-2">
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-heading)', margin: 0 }}>
                    {race.positionName}
                    {race.isLocal && (
                      /* keep the existing Local chip exactly as is */
                    )}
                  </h3>
                  <span className="shrink-0" style={{ /* keep the existing status chip exactly as is */ }}>
                    {isCompleted || isInProgress ? statusText : 'Play'}
                  </span>
                </div>

                {/* Stakes line — the election is real (REDESIGN_SPEC §1.1) */}
                <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.4, margin: '0.25rem 0 0' }}>
                  {race.electionName}
                  {race.state ? ` · ${race.state}` : ''}
                  {formatElectionDate(race.electionDate) ? ` · ${formatElectionDate(race.electionDate)}` : ''}
                </p>

                {/* Meta chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                  <span className="hub-meta-chip">{race.candidateCount} candidates</span>
                  <span className="hub-meta-chip">{race.topicCount} topics</span>
                  {race.usesRcv && (
                    <span className="hub-meta-chip hub-meta-chip-rcv">Ranked choice election</span>
                  )}
                </div>

                {/* Issue progress — only while in progress */}
                {isInProgress && progress && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem' }}>
                    <span style={{ display: 'inline-flex', gap: '0.25rem' }} aria-hidden="true">
                      {progress.topicOrder.map((key) => {
                        const t = progress.topics[key];
                        const done = t.currentIndex >= t.quotesToEvaluate.length;
                        const isActive = key === progress.currentTopicKey;
                        return (
                          <span
                            key={key}
                            className={`hub-progress-dot ${done ? 'hub-progress-dot-done' : ''} ${isActive ? 'hub-progress-dot-active' : ''}`}
                          />
                        );
                      })}
                    </span>
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                      {progress.topicOrder.filter((key) => {
                        const t = progress.topics[key];
                        return t.currentIndex >= t.quotesToEvaluate.length;
                      }).length} of {progress.topicOrder.length} topics
                    </span>
                  </div>
                )}
              </div>
```

(The old combined `electionName — N candidates · M topics` paragraph is replaced by the stakes line + chips.)

- [x] **Step 4: Hub CSS** in `src/index.css` (Inform accents section or adjacent):

```css
.hub-meta-chip {
  font-family: 'Manrope', sans-serif;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 9999px;
  padding: 0.125rem 0.5rem;
}

.hub-meta-chip-rcv {
  color: var(--text-link);
  border-color: var(--text-link);
}

.hub-progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background-color: var(--border-medium);
  display: inline-block;
}

.hub-progress-dot-done {
  background-color: var(--color-ev-light-blue);
}

/* §5 placement #3: yellow halo around the dark active dot — text carries the info */
.hub-progress-dot-active {
  background-color: var(--text-heading);
  box-shadow: 0 0 0 2px var(--color-ev-yellow);
}
```

- [x] **Step 5:** RaceHub tests green; full suite (expect 86); build; lint. Commit:

```bash
git add src/components/RaceHub.tsx src/components/__tests__/RaceHub.test.tsx src/index.css
git commit -m "feat: arena race cards - stakes line, meta chips, RCV chip, progress dots"
```

---

### Task 4: Alignment grid

**Files:** `src/utils/alignmentGrid.ts`, `src/utils/__tests__/alignmentGrid.test.ts`, `src/components/AlignmentGrid.tsx`, part of `src/components/__tests__/SummaryExtras.test.tsx`, `src/index.css`

- [x] **Step 1: Failing tests** — create `src/utils/__tests__/alignmentGrid.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAlignmentGrid } from '../alignmentGrid';
import type { RevealResult } from '../../data/api';

const reveal: RevealResult = {
  raceId: 'r1',
  positionName: 'Governor',
  ballot: [
    {
      rank: 1, candidateId: 'jane', name: 'Jane Doe', office: 'O', photo: '', essentialsUrl: '',
      evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
      perTopic: [
        { topicKey: 'a', title: 'Topic A', userTopWinner: true, quotes: [
          { quoteId: 'q1', text: 'One.', supported: true, rank: 1 },
        ]},
        { topicKey: 'b', title: 'Topic B', userTopWinner: false, quotes: [
          { quoteId: 'q9', text: 'Nine.', supported: false, rank: null },
        ]},
      ],
    },
    {
      rank: 2, candidateId: 'sam', name: 'Sam Roe', office: 'O', photo: '', essentialsUrl: '',
      evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
      perTopic: [
        { topicKey: 'a', title: 'Topic A', userTopWinner: false, quotes: [
          { quoteId: 'q2', text: 'Two.', supported: true, rank: 4 },
        ]},
      ],
    },
  ],
};

const topics = [
  { key: 'a', title: 'Topic A' },
  { key: 'b', title: 'Topic B' },
];

describe('buildAlignmentGrid', () => {
  it('maps each candidate-topic cell to the tier the user gave that quote', () => {
    const grid = buildAlignmentGrid(reveal, ['q1', 'q3', 'q4', 'q2'], topics);
    expect(grid).toEqual([
      { name: 'Jane Doe', cells: ['diamond', 'iron'] },
      { name: 'Sam Roe', cells: ['bronze', null] },
    ]);
  });

  it('marks unjudged or missing topics as null', () => {
    const grid = buildAlignmentGrid(reveal, [], topics);
    expect(grid[0].cells).toEqual([null, 'iron']);
  });
});
```

(Cell semantics: supported quote → tier by its position in the agreed order; unsupported → iron; no judged quote for that candidate-topic → null. In the second test, q1 is supported in the reveal but absent from the agreed order — a payload/store skew — and degrades to null, not a phantom tier.)

- [x] **Step 2:** Run — FAIL.

- [x] **Step 3: Create `src/utils/alignmentGrid.ts`:**

```ts
import type { RevealResult } from '../data/api';
import { tierForIndex, type Tier } from './tiers';

export interface AlignmentTopic {
  key: string;
  title: string;
}

export interface AlignmentRow {
  name: string;
  cells: (Tier | null)[];
}

/**
 * The candidates × topics tier grid (REDESIGN_SPEC §1.6): each cell is the
 * tier the user's ranking gave that candidate's quote on that topic.
 * Supported → positional tier; disagreed → iron; unjudged/absent → null.
 */
export function buildAlignmentGrid(
  reveal: RevealResult,
  agreedIds: string[],
  topics: AlignmentTopic[]
): AlignmentRow[] {
  return reveal.ballot.map((entry) => {
    const byTopic = new Map(entry.perTopic.map((t) => [t.topicKey, t]));
    const cells = topics.map((topic) => {
      const t = byTopic.get(topic.key);
      const quote = t?.quotes[0];
      if (!quote) return null;
      if (!quote.supported) return 'iron' as Tier;
      const position = agreedIds.indexOf(quote.quoteId);
      if (position === -1) return null;
      return tierForIndex(position);
    });
    return { name: entry.name, cells };
  });
}
```

- [x] **Step 4: Create `src/components/AlignmentGrid.tsx`:**

```tsx
import React from 'react';
import { TIER_META } from '../utils/tiers';
import { TierIcon } from './TierIcon';
import type { AlignmentRow, AlignmentTopic } from '../utils/alignmentGrid';

export interface AlignmentGridProps {
  topics: AlignmentTopic[];
  rows: AlignmentRow[];
}

/**
 * Candidates × topics tier grid (REDESIGN_SPEC §1.6) — the "true alignment"
 * artifact. Colorblind-safe: each cell is icon + sr-only tier name, never
 * color alone.
 */
export const AlignmentGrid: React.FC<AlignmentGridProps> = ({ topics, rows }) => {
  if (rows.length === 0 || topics.length === 0) return null;

  return (
    <div className="alignment-grid-wrap">
      <table className="alignment-grid">
        <caption className="sr-only">
          Your alignment by candidate and topic.&nbsp; Each cell is the tier your ranking gave
          that candidate's quote.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="alignment-grid-corner">Candidate</th>
            {topics.map((t) => (
              <th scope="col" key={t.key}>{t.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              {row.cells.map((tier, i) => (
                <td key={topics[i].key} title={tier ? TIER_META[tier].name : 'Not judged'}>
                  {tier ? (
                    <>
                      <TierIcon tier={tier} size={16} />
                      <span className="sr-only">{TIER_META[tier].name}</span>
                    </>
                  ) : (
                    <span aria-hidden="true" className="alignment-grid-empty">·</span>
                  )}
                  {!tier && <span className="sr-only">Not judged</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

- [x] **Step 5: Grid CSS** in `src/index.css`:

```css
.alignment-grid-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
  border-radius: 0.625rem;
  background-color: var(--surface-card);
}

.alignment-grid {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
}

.alignment-grid th,
.alignment-grid td {
  padding: 0.5rem 0.625rem;
  text-align: center;
  border-bottom: 1px solid var(--border-subtle);
}

.alignment-grid thead th {
  font-weight: 700;
  color: var(--text-secondary);
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.alignment-grid tbody th {
  text-align: left;
  font-weight: 700;
  color: var(--text-heading);
  white-space: nowrap;
}

.alignment-grid tbody tr:last-child th,
.alignment-grid tbody tr:last-child td {
  border-bottom: none;
}

.alignment-grid-empty {
  color: var(--text-tertiary);
}
```

- [x] **Step 6:** Util tests green; full suite (expect 88); build; lint. Commit:

```bash
git add src/utils/alignmentGrid.ts src/utils/__tests__/alignmentGrid.test.ts src/components/AlignmentGrid.tsx src/index.css
git commit -m "feat: candidates-by-topics alignment grid with tier cells"
```

---

### Task 5: Compass cross-link + summary wiring

**Files:** `src/components/CompassCrossLink.tsx`, `src/components/__tests__/SummaryExtras.test.tsx`, `src/components/ResultsPhase.tsx`, `src/components/__tests__/ResultsPhase.test.tsx`, `src/index.css`

- [x] **Step 1: Failing tests** — create `src/components/__tests__/SummaryExtras.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlignmentGrid } from '../AlignmentGrid';
import { CompassCrossLink } from '../CompassCrossLink';

beforeEach(() => {
  window.localStorage?.clear();
});

describe('AlignmentGrid', () => {
  it('renders an accessible tier table', () => {
    render(
      <AlignmentGrid
        topics={[{ key: 'a', title: 'Housing' }]}
        rows={[{ name: 'Jane Doe', cells: ['diamond'] }]}
      />
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('Diamond')).toBeInTheDocument();
  });
});

describe('CompassCrossLink', () => {
  it('frames the invitation around the observed top topic with the Inform chip', () => {
    render(<CompassCrossLink raceId="r1" topTopicTitle="Housing" />);
    expect(screen.getByText('Inform')).toBeInTheDocument();
    expect(screen.getByText(/based on what you ranked, housing appears to matter most to you/i)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /calibrate your compass/i });
    expect(cta).toHaveAttribute('href', 'https://compass.empowered.vote');
  });

  it('falls back to a generic invitation without a top topic', () => {
    render(<CompassCrossLink raceId="r1" topTopicTitle={null} />);
    expect(screen.getByText(/map where you stand on every issue/i)).toBeInTheDocument();
  });

  it('dismisses politely and stays dismissed for the race', async () => {
    const { unmount } = render(<CompassCrossLink raceId="r1" topTopicTitle="Housing" />);
    await userEvent.click(screen.getByRole('button', { name: /maybe later/i }));
    expect(screen.queryByRole('link', { name: /calibrate your compass/i })).not.toBeInTheDocument();
    unmount();
    render(<CompassCrossLink raceId="r1" topTopicTitle="Housing" />);
    expect(screen.queryByRole('link', { name: /calibrate your compass/i })).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2:** Run — FAIL.

- [x] **Step 3: Create `src/components/CompassCrossLink.tsx`:**

```tsx
import React, { useState } from 'react';

const COMPASS_URL = 'https://compass.empowered.vote';
const dismissKey = (raceId: string) => `compass-cta-dismissed:${raceId}`;

export interface CompassCrossLinkProps {
  raceId: string;
  topTopicTitle: string | null;
}

/**
 * The Compass invitation (REDESIGN_SPEC §10): insight-framed, dismissible,
 * once per race, never a modal, never repeated as a banner. The yellow
 * Inform chip is approved placement #7 — the one place yellow is a surface.
 */
export const CompassCrossLink: React.FC<CompassCrossLinkProps> = ({ raceId, topTopicTitle }) => {
  const [dismissed, setDismissed] = useState(
    () => window.localStorage?.getItem(dismissKey(raceId)) === '1'
  );

  if (dismissed) return null;

  const dismiss = () => {
    window.localStorage?.setItem(dismissKey(raceId), '1');
    setDismissed(true);
  };

  return (
    <section className="compass-card">
      <span className="inform-chip">Inform</span>
      <h3 className="compass-card-heading">
        {topTopicTitle ? (
          <>Based on what you ranked, {topTopicTitle} appears to matter most to you.</>
        ) : (
          <>Map where you stand on every issue.</>
        )}
      </h3>
      <p className="compass-card-body">
        Compass lets you map where you stand on every issue, and your next Read &amp; Rank will
        start with what you care about.
      </p>
      <div className="compass-card-actions">
        <a className="ev-button-primary compass-card-cta" href={COMPASS_URL} target="_blank" rel="noopener noreferrer">
          Calibrate your Compass
        </a>
        <button type="button" className="compass-card-later" onClick={dismiss}>
          Maybe later
        </button>
      </div>
    </section>
  );
};
```

- [x] **Step 4: Compass CSS** in `src/index.css`:

```css
.compass-card {
  border: 1px solid var(--border-subtle);
  border-radius: 0.625rem;
  background-color: var(--surface-card);
  padding: 1rem 1.125rem;
}

/* §5 placement #7: the one approved yellow surface — always ev-black text */
.inform-chip {
  display: inline-block;
  background-color: var(--color-ev-yellow);
  color: #1c1c1c;
  font-family: 'Manrope', sans-serif;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 9999px;
  padding: 0.1875rem 0.5rem;
  margin-bottom: 0.5rem;
}

.compass-card-heading {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 0.9375rem;
  color: var(--text-heading);
  margin: 0 0 0.375rem;
}

.compass-card-body {
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0 0 0.875rem;
}

.compass-card-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.compass-card-cta {
  font-size: 0.875rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
}

.compass-card-later {
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  min-height: 2.75rem;
  padding: 0 0.5rem;
}
```

- [x] **Step 5: Wire into `src/components/ResultsPhase.tsx`.** Imports:

```tsx
import { AlignmentGrid } from './AlignmentGrid';
import { CompassCrossLink } from './CompassCrossLink';
import { buildAlignmentGrid, type AlignmentTopic } from '../utils/alignmentGrid';
```

Derivations (next to the existing memos; reuse `agreedList`-style stable deps as done for `insight`):

```tsx
  const alignmentTopics = useMemo<AlignmentTopic[]>(
    () => (race ? race.topicOrder.map((key) => ({ key, title: race.topics[key].title })) : []),
    [race]
  );
  const alignmentRows = useMemo(
    () => (reveal ? buildAlignmentGrid(reveal, (agreedList ?? []).map((q) => q.id), alignmentTopics) : []),
    [reveal, agreedList, alignmentTopics]
  );
  const topTopicTitle = race && agreedList && agreedList.length > 0
    ? race.topics[agreedList[0].topicKey]?.title ?? null
    : null;
```

In the `allRevealed` summary block, the order becomes: insight strip → `<AlignmentGrid topics={alignmentTopics} rows={alignmentRows} />` → RcvEducationPanel → "How the candidates stack up" + BallotCards → `<CompassCrossLink raceId={reveal?.raceId ?? ''} topTopicTitle={topTopicTitle} />` → Play-another-race CTA.

- [x] **Step 6: Extend the flow test.** In the ResultsPhase flow test's summary assertions, add:

```tsx
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /calibrate your compass/i })).toBeInTheDocument();
```

- [x] **Step 7:** All green (`npm test` expect 92); build; lint baseline. Commit:

```bash
git add src/components/CompassCrossLink.tsx src/components/__tests__/SummaryExtras.test.tsx src/components/ResultsPhase.tsx src/components/__tests__/ResultsPhase.test.tsx src/index.css
git commit -m "feat: Compass invitation card and alignment grid wired into the summary"
```

---

### Task 6: Final verification

- [x] **Step 1:** `npm test` (92), `npm run lint` (baseline 12), `npm run build` (exit 0).

- [x] **Step 2: Browser walkthrough** (mobile + desktop, light + dark):

1. Hub: wordmark underline; race card shows stakes line with formatted date, meta chips, no RCV chip for Indiana; start a race, return to hub (browser back is not in-app — use Play another race loop later) — in-progress card shows progress dots with yellow halo on the active dot + "X of Y topics".
2. Evaluation: active quote card carries the 3px yellow left rule; stacked cards don't; TopicStepper's current chip shows the yellow underline.
3. Complete the race → summary: alignment grid renders candidates × topics with tier icons (grayscale-check the icons remain distinguishable); Compass card shows the Inform chip + topic-derived heading; "Maybe later" dismisses and stays dismissed after the reveal is revisited; "Calibrate your Compass" points at compass.empowered.vote.
4. Yellow audit: every yellow accent is decorative-adjacent-to-text (underlines, halo, rule) or the Inform chip with ev-black text. No yellow as the sole signal anywhere.
5. Degraded: confirm by test (jsdom) — single-voice topics filtered at the API boundary; RevealCard without essentialsUrl shows no profile link.

- [x] **Step 3:** Fix findings inline (small commits), then merge to main (the user pre-authorized the merge for this branch), verify the merged result (tests + build), delete the branch.

---

## Execution Notes (recorded during implementation)

- The plan's missing-Essentials test was vacuous (empty-href anchors have no link role); review proved it empirically and a queryByText assertion now pins the guard. The mock fallback is also routed through sanitizeRacePayload so blindness + thin-topic invariants hold structurally on both paths.
- The pre-existing api blindness test carried a latent 1-quote topic that the new filter would drop; fixed by adding a second quote (original assertions preserved).
- .ev-quote-card already had a box-shadow; the active yellow rule combines rather than clobbers. Stepper underline needed a 14px row margin to avoid clipping.
- buildAlignmentGrid aggregates multi-quote cells (best supported tier wins; iron only when nothing supported ranked) — the reveal type allows multiple judged quotes per candidate-topic even though the mock has one. Rows keyed by candidateId (same-name candidates exist).
- Persisted-progress dot maps guard missing topics (pre-filter persisted races can disagree with fresh summaries — cosmetic count skew, no crash).
- CompassCrossLink body copy rephrased to avoid a duplicate getByText match with the fallback heading; spec intent preserved.
- The old "DEFERRED: compass-feed" code comment (saving positions INTO Compass — a different feature from the §10 cross-link) was displaced by the summary rewiring; re-recording it here: compass-feed remains unbuilt and undesigned.
- Browser-verified: hub stakes cards + wordmark underline, active-card rule + stepper underline (computed-style checked), alignment grid (4×3 with tier icons), Compass card with Inform chip + topic-derived heading + dismissal.
