# Reveal + Results Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the reveal gate into the results page and rebuild the reveal around a numbers-led mark vocabulary (no medals), Essentials-style candidate cards with an expandable three-layer quote drawer, and a responsive alignment matrix↔pills layout.

**Architecture:** Frontend-only, built against *optional* new API fields with graceful degradation; the dev mock (`mockData.ts`) carries full examples so the whole experience is visible without ev-accounts changes. The evaluation/ranking surface (`TierIcon`, `tiers.ts`) is left untouched — only the reveal stops importing them. New presentational components are small and single-purpose; `ResultsPhase` composes them.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, framer-motion, Zustand, Vitest + @testing-library/react. Design tokens are CSS vars in `src/index.css`. Icons: inline SVG (no icon webfont in-app).

**Branch:** `reveal-results-redesign` (already created; spec committed).

**Spec:** `docs/superpowers/specs/2026-07-08-reveal-results-redesign-design.md`

---

## File Map

| File | Responsibility | Change |
|---|---|---|
| `src/data/api.ts` | Reveal/ballot types | Add optional fields to `RevealQuote` + `BallotEntry` |
| `src/data/mockData.ts` | Dev fallback data | Add verbatim/editorNote/video/date + split identity to a few entries |
| `src/utils/alignmentMarks.ts` | Mark model + pure mappers | **Create** |
| `src/utils/__tests__/alignmentMarks.test.ts` | Mark mapper tests | **Create** |
| `src/utils/alignmentGrid.ts` | Candidate×topic rows | Rewrite to emit `AlignmentMark` (drop `Tier`, drop `agreedIds`) |
| `src/utils/__tests__/alignmentGrid.test.ts` | Grid builder tests | Update to marks |
| `src/utils/candidateLines.ts` | Identity line formatting | **Create** |
| `src/utils/__tests__/candidateLines.test.ts` | Line formatting tests | **Create** |
| `src/components/RankNumber.tsx` | Teal rank number chip | **Create** |
| `src/components/AlignmentMark.tsx` | One mark (number/check/x/dash) + sr-only | **Create** |
| `src/components/__tests__/AlignmentMark.test.tsx` | Mark render tests | **Create** |
| `src/components/AlignmentGrid.tsx` | Desktop matrix (sticky/rotated/fade) | Rewrite to marks |
| `src/components/AlignmentPills.tsx` | Mobile per-candidate wrapping pills | **Create** |
| `src/components/__tests__/AlignmentPills.test.tsx` | Pills tests | **Create** |
| `src/components/AlignmentSection.tsx` | Label + responsive matrix↔pills | **Create** |
| `src/components/EssentialsLogo.tsx` | Essentials symbol link (light/dark) | **Create** |
| `src/assets/essentials-symbol-light.svg` | Logo asset (light) | **Create (copy)** |
| `src/assets/essentials-symbol-dark.svg` | Logo asset (dark) | **Create (copy)** |
| `src/components/PoliticianIdentityCard.tsx` | Photo + name/position/district + logo | **Create** |
| `src/components/__tests__/PoliticianIdentityCard.test.tsx` | Identity card tests | **Create** |
| `src/components/EditorNotePopover.tsx` | Footnote (i) + a11y popover | **Create** |
| `src/components/__tests__/EditorNotePopover.test.tsx` | Popover tests | **Create** |
| `src/components/QuoteBlock.tsx` | One topic: edited↔verbatim + attribution | **Create** |
| `src/components/__tests__/QuoteBlock.test.tsx` | Quote block tests | **Create** |
| `src/components/QuoteDrawer.tsx` | Per-topic quote blocks (sorted) | **Create** |
| `src/components/CandidateBallotCard.tsx` | rank + identity + strip + drawer | **Create** |
| `src/components/__tests__/CandidateBallotCard.test.tsx` | Card tests | **Create** |
| `src/components/RevealBand.tsx` | Dark hero band | **Create** |
| `src/components/ResultsPhase.tsx` | Compose the page | Rewrite (remove threshold stage, insight, TierIcon) |
| `src/components/__tests__/ResultsPhase.test.tsx` | Page tests | Update |
| `src/components/ThresholdInterstitial.tsx` | (gate) | **Delete** |
| `src/index.css` | Styles | Add band/mark/pills/matrix/card/strip/drawer/popover; remove `.insight-strip` |

**Out of scope (tracked in spec §8, separate ev-accounts work):** reveal endpoint returning split identity, the three quote layers, edited-span offsets, video timestamps, and `firstPlaceCount` tie-breaking. This plan renders them when present and degrades gracefully when absent.

**Note on the mark number vs. "agreed":** per `getRaceVerdicts`, every agreed quote has a per-topic rank (1-based) and disagreed quotes have `rank: null`. The reveal shows a **number** only for ranks 1–3; rank ≥4 shows the **agreed check** ("a pick" vs "also agreed", matching the ranking panel).

---

## Task 1: Extend reveal types + mock data (foundation)

**Files:**
- Modify: `src/data/api.ts:68-99`
- Modify: `src/data/mockData.ts`

- [ ] **Step 1: Add optional fields to `RevealQuote` and `BallotEntry` in `api.ts`**

Replace the `RevealQuote` interface (lines 68-75) with:

```ts
export interface RevealQuote {
  quoteId: string;
  /** Edited/revealed quote — the source of truth shown by default. */
  text: string;
  supported: boolean;
  /** Per-topic rank (1-based) for agreed quotes; null for disagreed. */
  rank: number | null;
  sourceName?: string;
  sourceUrl?: string;
  /** Human date string, e.g. "Oct 3, 2025". */
  sourceDate?: string;
  /** Full original quote. `text` is a contiguous substring of this. */
  verbatimText?: string;
  /** Editorial note, shown only in the verbatim/raw view. */
  editorNote?: string;
  /** Source video URL. */
  videoUrl?: string;
  /** Deep-link start time in seconds. */
  videoTimestampSeconds?: number;
}
```

In `BallotEntry` (lines 84-99), add three optional identity fields right after `office: string;`:

```ts
  office: string;
  /** Position/title, e.g. "City Council Member". Falls back to `office`. */
  title?: string;
  /** Governing body, e.g. "Salt Lake City Council". */
  chamber?: string;
  /** Seat/district, e.g. "District 4". */
  district?: string;
```

- [ ] **Step 2: Extend the mock quote type + a few quotes in `mockData.ts`**

Find the mock quote interface (the block near line 79 with `sourceUrl?` / `sourceName?`). Add these optional fields to that interface:

```ts
  sourceDate?: string;
  verbatimText?: string;
  editorNote?: string;
  videoUrl?: string;
  videoTimestampSeconds?: number;
```

On **two** existing `MOCK_QUOTES` entries (pick the first agreed-topic quote and one other), add full examples so the drawer demonstrates every state. Example additions (append these properties to two quote objects):

```ts
    sourceDate: 'Oct 3, 2025',
    verbatimText: "Look, the reason young families can't afford a home here is that we've made it almost illegal to build one. We need to open up more land for suburban, single-family homes, cap the fees that cities pile on builders, and stop the endless CEQA lawsuits that block construction for years. That's how you bring costs down.",
    editorNote: 'Bolded text is what appeared on the blind card. A rhetorical opener and closing aside were trimmed; the housing proposals are unchanged.',
    videoUrl: 'https://www.youtube.com/watch?v=example',
    videoTimestampSeconds: 743,
```

The edited `text` for those two quotes MUST be a contiguous substring of the `verbatimText` you provide (so the bold-span logic in Task 9 finds it). Adjust the existing `text` value to match a span inside `verbatimText`.

- [ ] **Step 3: Add split-identity fields to mock identities**

Find `MOCK_IDENTITIES` (the object keyed by token, entries with `office`). Add `title`, `chamber`, `district` to each identity object where sensible, e.g.:

```ts
    office: 'Candidate for Indiana Governor',
    title: 'Candidate for Governor',
    chamber: 'State of Indiana',
    district: '',
```

In the ballot mapper (near line 230 where `office: id.office` is set), add:

```ts
      office: id.office,
      title: id.title,
      chamber: id.chamber,
      district: id.district,
```

(Only add the fields you defined on `MOCK_IDENTITIES`; TypeScript will flag missing ones.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/api.ts src/data/mockData.ts
git commit -m "feat(reveal): extend reveal types + mock with quote layers and split identity"
```

---

## Task 2: Mark model + pure mappers

**Files:**
- Create: `src/utils/alignmentMarks.ts`
- Create: `src/utils/__tests__/alignmentMarks.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/alignmentMarks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { markForQuotes, markStrength, type AlignmentMark } from '../alignmentMarks';
import type { RevealQuote } from '../../data/api';

const q = (o: Partial<RevealQuote>): RevealQuote => ({
  quoteId: 'x', text: 't', supported: true, rank: null, ...o,
});

describe('markForQuotes', () => {
  it('returns a rank mark for supported rank 1-3', () => {
    expect(markForQuotes([q({ supported: true, rank: 2 })])).toEqual({ kind: 'rank', rank: 2 });
  });
  it('returns agreed for supported rank >= 4', () => {
    expect(markForQuotes([q({ supported: true, rank: 5 })])).toEqual({ kind: 'agreed' });
  });
  it('returns agreed for supported with null rank', () => {
    expect(markForQuotes([q({ supported: true, rank: null })])).toEqual({ kind: 'agreed' });
  });
  it('returns disagreed when only disagreed quotes', () => {
    expect(markForQuotes([q({ supported: false, rank: null })])).toEqual({ kind: 'disagreed' });
  });
  it('prefers the best supported rank over disagreed', () => {
    expect(markForQuotes([
      q({ supported: false, rank: null }),
      q({ supported: true, rank: 1 }),
    ])).toEqual({ kind: 'rank', rank: 1 });
  });
  it('returns null for no quotes', () => {
    expect(markForQuotes([])).toBeNull();
  });
});

describe('markStrength (lower = stronger, for sorting)', () => {
  it('orders rank < agreed < disagreed', () => {
    const marks: AlignmentMark[] = [
      { kind: 'disagreed' }, { kind: 'agreed' }, { kind: 'rank', rank: 3 }, { kind: 'rank', rank: 1 },
    ];
    const sorted = [...marks].sort((a, b) => markStrength(a) - markStrength(b));
    expect(sorted).toEqual([
      { kind: 'rank', rank: 1 }, { kind: 'rank', rank: 3 }, { kind: 'agreed' }, { kind: 'disagreed' },
    ]);
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- --run alignmentMarks`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/utils/alignmentMarks.ts`**

```ts
import type { RevealQuote } from '../data/api';

/** How a candidate's quote on a topic is marked at the reveal. null = not judged. */
export type AlignmentMark =
  | { kind: 'rank'; rank: number } // ranks 1-3 (a "pick")
  | { kind: 'agreed' }             // supported, rank >= 4 or unranked
  | { kind: 'disagreed' }
  | null;

/** Reduce a candidate's quotes on one topic to a single mark (best wins). */
export function markForQuotes(quotes: RevealQuote[]): AlignmentMark {
  let bestRank = Infinity;
  let sawSupported = false;
  let sawDisagreed = false;
  for (const quote of quotes) {
    if (quote.supported) {
      sawSupported = true;
      if (quote.rank != null && quote.rank < bestRank) bestRank = quote.rank;
    } else {
      sawDisagreed = true;
    }
  }
  if (sawSupported) {
    if (bestRank <= 3) return { kind: 'rank', rank: bestRank };
    return { kind: 'agreed' };
  }
  if (sawDisagreed) return { kind: 'disagreed' };
  return null;
}

/** Sort key: lower is stronger. Ranks first (by number), then agreed, then disagreed, then null. */
export function markStrength(mark: AlignmentMark): number {
  if (mark == null) return 100;
  if (mark.kind === 'rank') return mark.rank;      // 1,2,3
  if (mark.kind === 'agreed') return 10;
  return 20;                                       // disagreed
}
```

- [ ] **Step 4: Run — confirm pass**

Run: `npm test -- --run alignmentMarks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/alignmentMarks.ts src/utils/__tests__/alignmentMarks.test.ts
git commit -m "feat(reveal): add alignment mark model and mappers"
```

---

## Task 3: Rewrite `buildAlignmentGrid` to emit marks

**Files:**
- Modify: `src/utils/alignmentGrid.ts`
- Modify: `src/utils/__tests__/alignmentGrid.test.ts`

- [ ] **Step 1: Update the test to expect marks and the new signature**

Replace the body of `src/utils/__tests__/alignmentGrid.test.ts` after the imports. Change the import line to:

```ts
import { buildAlignmentGrid } from '../alignmentGrid';
import type { RevealResult } from '../../data/api';
```

Replace the `describe` block with:

```ts
describe('buildAlignmentGrid', () => {
  it('maps each candidate-topic cell to a mark', () => {
    const grid = buildAlignmentGrid(reveal, topics);
    // Jane: topic a rank 1 -> rank mark; topic b disagreed -> disagreed
    expect(grid[0].cells).toEqual([{ kind: 'rank', rank: 1 }, { kind: 'disagreed' }]);
    // Sam: topic a rank 4 -> agreed; topic b none -> null
    expect(grid[1].cells).toEqual([{ kind: 'agreed' }, null]);
  });
});
```

(The `reveal` and `topics` fixtures above stay as-is. Note Sam's topic-a quote has `rank: 4` in the fixture — update the fixture's Sam quote `rank: 4` if it isn't already; the existing fixture uses `rank: 4`.)

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- --run alignmentGrid`
Expected: FAIL (signature/shape mismatch).

- [ ] **Step 3: Rewrite `src/utils/alignmentGrid.ts`**

```ts
import type { RevealResult } from '../data/api';
import { markForQuotes, type AlignmentMark } from './alignmentMarks';

export interface AlignmentTopic {
  key: string;
  title: string;
}

export interface AlignmentRow {
  candidateId: string;
  name: string;
  cells: AlignmentMark[];
}

/**
 * Candidates × topics marks (spec §3). Each cell is the mark the user's verdict
 * gave that candidate's quote on that topic: a rank number (1-3), an agreed
 * check, a disagreed cross, or null when nothing was judged.
 */
export function buildAlignmentGrid(
  reveal: RevealResult,
  topics: AlignmentTopic[]
): AlignmentRow[] {
  return reveal.ballot.map((entry) => {
    const byTopic = new Map(entry.perTopic.map((t) => [t.topicKey, t]));
    const cells = topics.map((topic) => markForQuotes(byTopic.get(topic.key)?.quotes ?? []));
    return { candidateId: entry.candidateId, name: entry.name, cells };
  });
}
```

- [ ] **Step 4: Run — confirm pass**

Run: `npm test -- --run alignmentGrid`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/alignmentGrid.ts src/utils/__tests__/alignmentGrid.test.ts
git commit -m "refactor(reveal): buildAlignmentGrid emits marks, drops tier + agreedIds"
```

---

## Task 4: `RankNumber` + `AlignmentMark` components

**Files:**
- Create: `src/components/RankNumber.tsx`
- Create: `src/components/AlignmentMark.tsx`
- Create: `src/components/__tests__/AlignmentMark.test.tsx`
- Modify: `src/index.css` (mark styles)

- [ ] **Step 1: Write failing tests**

Create `src/components/__tests__/AlignmentMark.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlignmentMarkView } from '../AlignmentMark';

describe('AlignmentMarkView', () => {
  it('renders the rank number with an sr-only label', () => {
    render(<AlignmentMarkView mark={{ kind: 'rank', rank: 2 }} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Ranked 2')).toHaveClass('sr-only');
  });
  it('renders an agreed check with sr-only label', () => {
    const { container } = render(<AlignmentMarkView mark={{ kind: 'agreed' }} />);
    expect(container.querySelector('.mark-agreed')).toBeInTheDocument();
    expect(screen.getByText('Agreed')).toHaveClass('sr-only');
  });
  it('renders a disagreed cross with sr-only label', () => {
    const { container } = render(<AlignmentMarkView mark={{ kind: 'disagreed' }} />);
    expect(container.querySelector('.mark-disagreed')).toBeInTheDocument();
    expect(screen.getByText('Disagreed')).toHaveClass('sr-only');
  });
  it('renders a not-judged dash with sr-only label', () => {
    render(<AlignmentMarkView mark={null} />);
    expect(screen.getByText('Not judged')).toHaveClass('sr-only');
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- --run AlignmentMark`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/RankNumber.tsx`**

```tsx
import React from 'react';

export interface RankNumberProps {
  rank: number;
  /** Diameter in px. */
  size?: number;
}

/** Teal filled rank chip. Same visual weight for every rank (spec §2). */
export const RankNumber: React.FC<RankNumberProps> = ({ rank, size = 24 }) => (
  <span
    className="rank-number"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.52) }}
    aria-hidden="true"
  >
    {rank}
  </span>
);
```

- [ ] **Step 4: Create `src/components/AlignmentMark.tsx`**

```tsx
import React from 'react';
import type { AlignmentMark } from '../utils/alignmentMarks';
import { RankNumber } from './RankNumber';

export interface AlignmentMarkViewProps {
  mark: AlignmentMark;
  /** Icon/number size in px. */
  size?: number;
}

const CircleCheck: React.FC<{ size: number }> = ({ size }) => (
  <svg className="mark-agreed" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
  </svg>
);
const CircleX: React.FC<{ size: number }> = ({ size }) => (
  <svg className="mark-disagreed" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" />
  </svg>
);
const Dash: React.FC<{ size: number }> = ({ size }) => (
  <svg className="mark-none" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M7 12h10" />
  </svg>
);

/** One alignment mark: number chip, agreed check, disagreed cross, or a faint dash. */
export const AlignmentMarkView: React.FC<AlignmentMarkViewProps> = ({ mark, size = 22 }) => {
  if (mark == null) {
    return (<span className="alignment-mark mark-none-wrap"><Dash size={size} /><span className="sr-only">Not judged</span></span>);
  }
  if (mark.kind === 'rank') {
    return (<span className="alignment-mark"><RankNumber rank={mark.rank} size={size + 2} /><span className="sr-only">Ranked {mark.rank}</span></span>);
  }
  if (mark.kind === 'agreed') {
    return (<span className="alignment-mark mark-agreed-wrap"><CircleCheck size={size} /><span className="sr-only">Agreed</span></span>);
  }
  return (<span className="alignment-mark mark-disagreed-wrap"><CircleX size={size} /><span className="sr-only">Disagreed</span></span>);
};
```

- [ ] **Step 5: Add mark styles to `src/index.css`**

Append near the end (or after the removed insight-strip block from Task 11):

```css
/* ============================================
   Reveal marks (spec §2) — numbers-led, no medals
   ============================================ */
.rank-number {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 9999px; background: var(--text-link); color: #fff;
  font-family: 'Manrope', sans-serif; font-weight: 800; flex-shrink: 0; line-height: 1;
}
.dark .rank-number { background: var(--color-ev-light-blue); color: #06232b; }
.alignment-mark { display: inline-flex; align-items: center; justify-content: center; }
.mark-agreed { color: var(--agree); }
.mark-disagreed { color: #a8a29e; }
.dark .mark-disagreed { color: #8b96a5; }
.mark-none { color: var(--border-medium); }
```

- [ ] **Step 6: Run — confirm pass + typecheck**

Run: `npm test -- --run AlignmentMark && npx tsc --noEmit 2>&1 | head`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/RankNumber.tsx src/components/AlignmentMark.tsx src/components/__tests__/AlignmentMark.test.tsx src/index.css
git commit -m "feat(reveal): RankNumber + AlignmentMark components"
```

---

## Task 5: Desktop alignment matrix (`AlignmentGrid` rewrite)

**Files:**
- Modify: `src/components/AlignmentGrid.tsx`
- Modify: `src/index.css` (matrix styles: sticky first column, rotated headers, edge fade)

- [ ] **Step 1: Rewrite `src/components/AlignmentGrid.tsx`**

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import { AlignmentMarkView } from './AlignmentMark';
import type { AlignmentRow, AlignmentTopic } from '../utils/alignmentGrid';

export interface AlignmentGridProps {
  topics: AlignmentTopic[];
  rows: AlignmentRow[];
  /** When true, cells pop in one at a time on the reveal timeline. */
  animate?: boolean;
  /** ms before the frame settles. */
  frameDelayMs?: number;
  /** ms before the first cell pops. */
  cellBaseDelayMs?: number;
}

/**
 * Desktop candidates × topics matrix (spec §3). Colourblind-safe (icon + sr-only
 * label). Wide races scroll horizontally with the candidate column pinned and an
 * edge fade; the mobile alternative is AlignmentPills.
 */
export const AlignmentGrid: React.FC<AlignmentGridProps> = ({
  topics, rows, animate = false, frameDelayMs = 0, cellBaseDelayMs = 0,
}) => {
  const m = useMotion();
  const play = animate && !m.reduced;
  if (rows.length === 0 || topics.length === 0) return null;

  let cellIndex = 0;
  return (
    <motion.div className="alignment-grid-wrap"
      initial={play ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={play ? { duration: DUR.base / 1000, ease: EASE.settle, delay: frameDelayMs / 1000 } : { duration: 0 }}>
      <table className="alignment-grid">
        <caption className="sr-only">Your alignment by candidate and topic. Each cell is what your ranking gave that candidate's quote.</caption>
        <thead>
          <tr>
            <th scope="col" className="alignment-grid-corner">Candidate</th>
            {topics.map((t) => (
              <th scope="col" key={t.key}><span className="alignment-col-label">{t.title}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.candidateId}>
              <th scope="row">{row.name}</th>
              {row.cells.map((mark, ci) => {
                const order = cellIndex++;
                const delay = cellBaseDelayMs + order * STAGGER.gridCell;
                return (
                  <td key={topics[ci].key}>
                    <motion.span style={{ display: 'inline-flex' }}
                      initial={play ? { scale: 0.4, opacity: 0 } : false}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={play ? { duration: DUR.moderate / 1000, ease: EASE.overshoot, delay: delay / 1000 } : { duration: 0 }}>
                      <AlignmentMarkView mark={mark} size={22} />
                    </motion.span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};
```

- [ ] **Step 2: Update matrix CSS in `src/index.css`**

Find the `.alignment-grid` block (search `Alignment Grid (REDESIGN_SPEC §1.6)`). Replace the `.alignment-grid` rules through `.alignment-grid-empty` with:

```css
.alignment-grid-wrap {
  position: relative;
  overflow-x: auto;
  border: 1px solid var(--border-medium);
  border-radius: 0.75rem;
  background-color: var(--surface-card);
}
.alignment-grid { width: 100%; border-collapse: collapse; font-family: 'Manrope', sans-serif; font-size: 0.875rem; }
.alignment-grid th, .alignment-grid td { padding: 0.75rem 0.75rem; text-align: center; border-bottom: 1px solid var(--border-subtle); }
.alignment-grid thead th { vertical-align: bottom; }
.alignment-grid .alignment-col-label {
  display: inline-block; writing-mode: vertical-rl; transform: rotate(180deg);
  font-weight: 700; font-size: 0.6875rem; letter-spacing: 0.03em; text-transform: uppercase;
  color: var(--text-secondary); max-height: 68px; white-space: nowrap;
}
.alignment-grid tbody th {
  text-align: left; font-weight: 700; font-size: 0.875rem; color: var(--text-heading); white-space: nowrap;
  position: sticky; left: 0; background: var(--surface-card); box-shadow: 1px 0 0 var(--border-subtle); z-index: 1;
}
.alignment-grid-corner { position: sticky; left: 0; background: var(--surface-card); z-index: 2; text-align: left; font-weight: 700; font-size: 0.6875rem; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-secondary); }
.alignment-grid tbody tr:last-child th, .alignment-grid tbody tr:last-child td { border-bottom: none; }
```

(The old `.alignment-grid td.spotlight-diamond` and `@keyframes diamond-glow` are no longer referenced — leave them or delete; they're harmless dead CSS. Delete them if you want a clean file.)

- [ ] **Step 3: Typecheck (ResultsPhase will still reference old props — that's fixed in Task 11)**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: errors ONLY in `ResultsPhase.tsx` (old props `medalBaseDelayMs`, `spotlight*`, `buildAlignmentGrid(...agreedIds...)`). These are resolved in Task 11. Note them and continue.

- [ ] **Step 4: Commit**

```bash
git add src/components/AlignmentGrid.tsx src/index.css
git commit -m "feat(reveal): rebuild desktop alignment matrix with marks, sticky name, rotated headers"
```

---

## Task 6: Mobile alignment pills (`AlignmentPills`)

**Files:**
- Create: `src/components/AlignmentPills.tsx`
- Create: `src/components/__tests__/AlignmentPills.test.tsx`
- Modify: `src/index.css` (pill styles)

- [ ] **Step 1: Write failing test**

Create `src/components/__tests__/AlignmentPills.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AlignmentPills } from '../AlignmentPills';
import type { RevealResult } from '../../data/api';

const reveal: RevealResult = {
  raceId: 'r', positionName: 'Gov',
  ballot: [{
    rank: 1, candidateId: 'a', name: 'Ann Lee', office: 'O', photo: '', essentialsUrl: '',
    evidence: { agreementCount: 3, firstPlaceCount: 1, topicsWithAgreement: 3 },
    perTopic: [
      { topicKey: 'h', title: 'Housing', userTopWinner: true, quotes: [{ quoteId: 'q1', text: '', supported: true, rank: 5 }] },
      { topicKey: 't', title: 'Transit', userTopWinner: true, quotes: [{ quoteId: 'q2', text: '', supported: true, rank: 1 }] },
      { topicKey: 'p', title: 'Policing', userTopWinner: false, quotes: [{ quoteId: 'q3', text: '', supported: false, rank: null }] },
    ],
  }],
};
const topics = [{ key: 'h', title: 'Housing' }, { key: 't', title: 'Transit' }, { key: 'p', title: 'Policing' }];

describe('AlignmentPills', () => {
  it('renders one block per candidate with strongest-first pills', () => {
    render(<AlignmentPills reveal={reveal} topics={topics} />);
    const block = screen.getByText('Ann Lee').closest('.pills-candidate')!;
    const labels = within(block as HTMLElement).getAllByTestId('pill-topic').map((n) => n.textContent);
    // rank 1 (Transit) first, then agreed (Housing rank 5), then disagreed (Policing)
    expect(labels).toEqual(['Transit', 'Housing', 'Policing']);
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- --run AlignmentPills`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/AlignmentPills.tsx`**

```tsx
import React from 'react';
import type { RevealResult } from '../data/api';
import type { AlignmentTopic } from '../utils/alignmentGrid';
import { markForQuotes, markStrength } from '../utils/alignmentMarks';
import { AlignmentMarkView } from './AlignmentMark';

export interface AlignmentPillsProps {
  reveal: RevealResult;
  topics: AlignmentTopic[];
}

/**
 * Mobile alternative to the matrix (spec §3): per-candidate mark pills that wrap
 * instead of scrolling. Pills are sorted strongest-first so density signals strength.
 */
export const AlignmentPills: React.FC<AlignmentPillsProps> = ({ reveal, topics }) => {
  const titleByKey = new Map(topics.map((t) => [t.key, t.title]));
  return (
    <div className="pills-wrap">
      {reveal.ballot.map((entry) => {
        const byTopic = new Map(entry.perTopic.map((t) => [t.topicKey, t]));
        const pills = topics
          .map((t) => ({ key: t.key, title: titleByKey.get(t.key) ?? t.title, mark: markForQuotes(byTopic.get(t.key)?.quotes ?? []) }))
          .filter((p) => p.mark != null)
          .sort((a, b) => markStrength(a.mark) - markStrength(b.mark));
        return (
          <div key={entry.candidateId} className="pills-candidate">
            <p className="pills-name">{entry.name}</p>
            <div className="pills-row">
              {pills.map((p) => (
                <span key={p.key} className={`pill ${p.mark?.kind === 'disagreed' ? 'pill-dis' : ''}`}>
                  <AlignmentMarkView mark={p.mark} size={17} />
                  <span data-testid="pill-topic">{p.title}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 4: Add pill styles to `src/index.css`**

```css
/* Mobile alignment pills (spec §3) */
.pills-wrap { display: flex; flex-direction: column; gap: 0.5rem; }
.pills-candidate { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: 0.625rem; padding: 0.625rem 0.75rem; }
.pills-name { font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 0.875rem; color: var(--text-heading); margin: 0 0 0.5rem; }
.pills-row { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.pill { display: inline-flex; align-items: center; gap: 0.3125rem; padding: 0.1875rem 0.5rem 0.1875rem 0.25rem; border-radius: 9999px; font-family: 'Manrope', sans-serif; font-size: 0.75rem; font-weight: 600; color: var(--text-strong); border: 1px solid var(--border-subtle); background: var(--surface-sunken); }
.pill-dis { color: var(--text-tertiary); }
```

- [ ] **Step 5: Run — confirm pass**

Run: `npm test -- --run AlignmentPills`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/AlignmentPills.tsx src/components/__tests__/AlignmentPills.test.tsx src/index.css
git commit -m "feat(reveal): mobile alignment pills, strongest-first"
```

---

## Task 7: Responsive `AlignmentSection`

**Files:**
- Create: `src/components/AlignmentSection.tsx`
- Create: `src/components/__tests__/AlignmentSection.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/__tests__/AlignmentSection.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@empoweredvote/ev-ui', () => ({ useMediaQuery: vi.fn() }));
import { useMediaQuery } from '@empoweredvote/ev-ui';
import { AlignmentSection } from '../AlignmentSection';
import type { RevealResult } from '../../data/api';

const reveal: RevealResult = {
  raceId: 'r', positionName: 'Gov',
  ballot: [{
    rank: 1, candidateId: 'a', name: 'Ann Lee', office: 'O', photo: '', essentialsUrl: '',
    evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
    perTopic: [{ topicKey: 'h', title: 'Housing', userTopWinner: true, quotes: [{ quoteId: 'q', text: '', supported: true, rank: 1 }] }],
  }],
};
const topics = [{ key: 'h', title: 'Housing' }];

describe('AlignmentSection', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders the label and the matrix on desktop', () => {
    (useMediaQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true); // desktop
    render(<AlignmentSection reveal={reveal} topics={topics} />);
    expect(screen.getByText('Your alignment at a glance')).toBeInTheDocument();
    expect(document.querySelector('.alignment-grid')).toBeInTheDocument();
  });
  it('renders pills on mobile', () => {
    (useMediaQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false); // mobile
    render(<AlignmentSection reveal={reveal} topics={topics} />);
    expect(document.querySelector('.pills-wrap')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- --run AlignmentSection`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/AlignmentSection.tsx`**

```tsx
import React, { useMemo } from 'react';
import { useMediaQuery } from '@empoweredvote/ev-ui';
import type { RevealResult } from '../data/api';
import { buildAlignmentGrid, type AlignmentTopic } from '../utils/alignmentGrid';
import { AlignmentGrid } from './AlignmentGrid';
import { AlignmentPills } from './AlignmentPills';

export interface AlignmentSectionProps {
  reveal: RevealResult;
  topics: AlignmentTopic[];
  /** Passed through to the matrix for the reveal choreography. */
  animate?: boolean;
  frameDelayMs?: number;
  cellBaseDelayMs?: number;
}

/** Label + responsive matrix (desktop) / pills (mobile). */
export const AlignmentSection: React.FC<AlignmentSectionProps> = ({
  reveal, topics, animate, frameDelayMs, cellBaseDelayMs,
}) => {
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const rows = useMemo(() => buildAlignmentGrid(reveal, topics), [reveal, topics]);
  if (topics.length === 0 || rows.length === 0) return null;
  return (
    <section>
      <p className="alignment-section-label">Your alignment at a glance</p>
      {isDesktop ? (
        <AlignmentGrid topics={topics} rows={rows} animate={animate} frameDelayMs={frameDelayMs} cellBaseDelayMs={cellBaseDelayMs} />
      ) : (
        <AlignmentPills reveal={reveal} topics={topics} />
      )}
    </section>
  );
};
```

- [ ] **Step 4: Add label style to `src/index.css`**

```css
.alignment-section-label { font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 0.75rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-secondary); margin: 0 0 0.5rem; }
```

- [ ] **Step 5: Run — confirm pass**

Run: `npm test -- --run AlignmentSection`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/AlignmentSection.tsx src/components/__tests__/AlignmentSection.test.tsx src/index.css
git commit -m "feat(reveal): responsive AlignmentSection (matrix desktop / pills mobile)"
```

---

## Task 8: Essentials logo + identity card

**Files:**
- Create: `src/assets/essentials-symbol-light.svg`, `src/assets/essentials-symbol-dark.svg`
- Create: `src/components/EssentialsLogo.tsx`
- Create: `src/utils/candidateLines.ts`
- Create: `src/utils/__tests__/candidateLines.test.ts`
- Create: `src/components/PoliticianIdentityCard.tsx`
- Create: `src/components/__tests__/PoliticianIdentityCard.test.tsx`
- Modify: `src/index.css` (identity card styles)

- [ ] **Step 1: Copy the SVG assets**

```bash
mkdir -p src/assets
cp /Users/chrisandrews/Documents/GitHub/ev-landing/icons/essentials-symbol-light.svg src/assets/essentials-symbol-light.svg
cp /Users/chrisandrews/Documents/GitHub/ev-landing/icons/essentials-symbol-dark.svg src/assets/essentials-symbol-dark.svg
```

Expected: two files exist under `src/assets/`.

- [ ] **Step 2: Write failing tests for `candidateLines`**

Create `src/utils/__tests__/candidateLines.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { candidateLines } from '../candidateLines';

describe('candidateLines', () => {
  it('uses title + chamber/district when present', () => {
    expect(candidateLines({ office: 'x', title: 'City Council Member', chamber: 'Salt Lake City', district: 'District 4' }))
      .toEqual({ line2: 'City Council Member', line3: 'Salt Lake City · District 4' });
  });
  it('falls back to office when split fields are absent', () => {
    expect(candidateLines({ office: 'Candidate for Governor' }))
      .toEqual({ line2: 'Candidate for Governor', line3: '' });
  });
  it('drops empty chamber/district segments', () => {
    expect(candidateLines({ office: 'x', title: 'Mayor', chamber: 'Provo', district: '' }))
      .toEqual({ line2: 'Mayor', line3: 'Provo' });
  });
});
```

- [ ] **Step 3: Run — confirm fail**

Run: `npm test -- --run candidateLines`
Expected: FAIL (module not found).

- [ ] **Step 4: Create `src/utils/candidateLines.ts`**

```ts
export interface CandidateLineFields {
  office: string;
  title?: string;
  chamber?: string;
  district?: string;
}

/** Compose the card's 2nd (position) and 3rd (jurisdiction) lines, with office fallback. */
export function candidateLines(f: CandidateLineFields): { line2: string; line3: string } {
  const line2 = f.title?.trim() || f.office;
  const line3 = [f.chamber, f.district].map((s) => s?.trim()).filter(Boolean).join(' · ');
  return { line2, line3 };
}
```

- [ ] **Step 5: Run — confirm pass**

Run: `npm test -- --run candidateLines`
Expected: PASS.

- [ ] **Step 6: Create `src/components/EssentialsLogo.tsx`**

```tsx
import React from 'react';
import lightSymbol from '../assets/essentials-symbol-light.svg';
import darkSymbol from '../assets/essentials-symbol-dark.svg';

export interface EssentialsLogoProps {
  href: string;
  /** Rendered height in px. */
  size?: number;
  onClick?: () => void;
}

/** Essentials symbol that links out to a candidate's Essentials profile. */
export const EssentialsLogo: React.FC<EssentialsLogoProps> = ({ href, size = 30, onClick }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}
    className="essentials-logo" aria-label="View on Essentials">
    <img src={lightSymbol} alt="" aria-hidden="true" className="essentials-logo-light" style={{ height: size }} />
    <img src={darkSymbol} alt="" aria-hidden="true" className="essentials-logo-dark" style={{ height: size }} />
  </a>
);
```

- [ ] **Step 7: Write failing test for identity card**

Create `src/components/__tests__/PoliticianIdentityCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PoliticianIdentityCard } from '../PoliticianIdentityCard';

describe('PoliticianIdentityCard', () => {
  it('renders name, position, district, and an Essentials link', () => {
    render(<PoliticianIdentityCard name="Ana Rivera" photo="" essentialsUrl="https://e/x"
      office="Council" title="City Council Member" chamber="Salt Lake City" district="District 4" />);
    expect(screen.getByText('Ana Rivera')).toBeInTheDocument();
    expect(screen.getByText('City Council Member')).toBeInTheDocument();
    expect(screen.getByText('Salt Lake City · District 4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View on Essentials' })).toHaveAttribute('href', 'https://e/x');
  });
  it('shows initials when there is no photo', () => {
    render(<PoliticianIdentityCard name="Ben Chen" photo="" essentialsUrl="#" office="Council" />);
    expect(screen.getByText('BC')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run — confirm fail**

Run: `npm test -- --run PoliticianIdentityCard`
Expected: FAIL (module not found).

- [ ] **Step 9: Create `src/components/PoliticianIdentityCard.tsx`**

```tsx
import React, { useState } from 'react';
import { candidateLines } from '../utils/candidateLines';
import { EssentialsLogo } from './EssentialsLogo';

export interface PoliticianIdentityCardProps {
  name: string;
  photo: string;
  essentialsUrl: string;
  office: string;
  title?: string;
  chamber?: string;
  district?: string;
  onEssentialsClick?: () => void;
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

/**
 * Faithful to Essentials `PoliticianCard` (photo · teal name · position ·
 * jurisdiction) but themed with read-rank vars for dark mode, and with the
 * Essentials symbol top-right (a slot ev-ui's card doesn't expose). Fixed height:
 * the photo never stretches, so the drawer below can grow independently.
 */
export const PoliticianIdentityCard: React.FC<PoliticianIdentityCardProps> = ({
  name, photo, essentialsUrl, office, title, chamber, district, onEssentialsClick,
}) => {
  const [imgOk, setImgOk] = useState(true);
  const { line2, line3 } = candidateLines({ office, title, chamber, district });
  return (
    <div className="pid-card">
      <div className="pid-photo">
        {photo && imgOk
          ? <img src={photo} alt={name} onError={() => setImgOk(false)} />
          : <span className="pid-initials">{initials(name)}</span>}
      </div>
      <div className="pid-content">
        <div className="pid-lines">
          <p className="pid-name">{name}</p>
          <p className="pid-position">{line2}</p>
          {line3 && <p className="pid-district">{line3}</p>}
        </div>
        <EssentialsLogo href={essentialsUrl} onClick={onEssentialsClick} />
      </div>
    </div>
  );
};
```

- [ ] **Step 10: Add identity-card + logo styles to `src/index.css`**

```css
/* Candidate identity card (spec §4) — faithful to Essentials PoliticianCard, themed */
.pid-card { display: flex; background: var(--surface-card); }
.pid-photo { width: 64px; flex-shrink: 0; background: var(--text-link); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.pid-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
.pid-initials { color: #fff; font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 0.9375rem; }
.pid-content { flex: 1; min-width: 0; padding: 0.5625rem 0.6875rem; display: flex; justify-content: space-between; gap: 0.5rem; }
.pid-name { font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 0.875rem; color: var(--text-link); margin: 0; line-height: 1.2; }
.pid-position { font-family: 'Manrope', sans-serif; font-weight: 400; font-size: 0.75rem; color: var(--text-secondary); margin: 0.0625rem 0 0; }
.pid-district { font-family: 'Manrope', sans-serif; font-weight: 400; font-size: 0.6875rem; color: var(--text-tertiary); margin: 0.0625rem 0 0; }
.essentials-logo { flex-shrink: 0; display: inline-flex; align-items: flex-start; line-height: 0; }
.essentials-logo-dark { display: none; }
.dark .essentials-logo-light { display: none; }
.dark .essentials-logo-dark { display: inline; }
```

- [ ] **Step 11: Run — confirm pass + typecheck**

Run: `npm test -- --run PoliticianIdentityCard && npx tsc --noEmit 2>&1 | grep -v ResultsPhase | head`
Expected: PASS; no NEW type errors outside ResultsPhase. (SVG imports resolve via Vite's default `*.svg` → string typing; if tsc complains about the `.svg` module, confirm `src/vite-env.d.ts` references `vite/client` — it does by default in Vite React templates.)

- [ ] **Step 12: Commit**

```bash
git add src/assets/essentials-symbol-light.svg src/assets/essentials-symbol-dark.svg src/components/EssentialsLogo.tsx src/utils/candidateLines.ts src/utils/__tests__/candidateLines.test.ts src/components/PoliticianIdentityCard.tsx src/components/__tests__/PoliticianIdentityCard.test.tsx src/index.css
git commit -m "feat(reveal): Essentials logo + faithful themed identity card"
```

---

## Task 9: Editor-note popover + quote block (three layers)

**Files:**
- Create: `src/components/EditorNotePopover.tsx`
- Create: `src/components/__tests__/EditorNotePopover.test.tsx`
- Create: `src/components/QuoteBlock.tsx`
- Create: `src/components/__tests__/QuoteBlock.test.tsx`
- Modify: `src/index.css` (quote block + popover styles)

- [ ] **Step 1: Write failing test for the popover**

Create `src/components/__tests__/EditorNotePopover.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorNotePopover } from '../EditorNotePopover';

describe('EditorNotePopover', () => {
  it('hides the note until the trigger is activated (keyboard/tap)', async () => {
    const user = userEvent.setup();
    render(<EditorNotePopover note="Trimmed for length." />);
    expect(screen.queryByText('Trimmed for length.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /editor's note/i }));
    expect(screen.getByText('Trimmed for length.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- --run EditorNotePopover`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/EditorNotePopover.tsx`**

```tsx
import React, { useId, useState } from 'react';

export interface EditorNotePopoverProps {
  note: string;
}

/**
 * Quiet footnote "(i) editor's note". It's a real <button>, so a single toggle
 * handler covers mouse click, touch tap, and keyboard (Enter/Space) — fully
 * accessible without hover. (A hover-open nicety can be layered in CSS later; we
 * deliberately keep state on click only so focus-then-click can't cancel itself.)
 */
export const EditorNotePopover: React.FC<EditorNotePopoverProps> = ({ note }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="editor-note">
      <button type="button" className="editor-note-trigger"
        aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((o) => !o)}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
        editor&rsquo;s note
      </button>
      {open && <span role="note" id={id} className="editor-note-pop">{note}</span>}
    </span>
  );
};
```

- [ ] **Step 4: Run — confirm pass**

Run: `npm test -- --run EditorNotePopover`
Expected: PASS.

- [ ] **Step 5: Write failing test for the quote block**

Create `src/components/__tests__/QuoteBlock.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteBlock } from '../QuoteBlock';
import type { RevealQuote } from '../../data/api';

const base: RevealQuote = {
  quoteId: 'q', supported: true, rank: 1,
  text: 'cap the fees that cities pile on builders',
  verbatimText: 'We need to cap the fees that cities pile on builders and stop lawsuits.',
  editorNote: 'Trimmed a closing aside.',
  sourceName: 'KSL debate', sourceDate: 'Oct 3, 2025', sourceUrl: 'https://ksl/x',
  videoUrl: 'https://v/x', videoTimestampSeconds: 743,
};

describe('QuoteBlock', () => {
  it('shows the edited quote and source + date by default', () => {
    render(<QuoteBlock topicTitle="Housing" quote={base} mark={{ kind: 'rank', rank: 1 }} />);
    expect(screen.getByText(/cap the fees/)).toBeInTheDocument();
    // Attribution text is split across span + anchor, so assert on the container.
    const attrib = document.querySelector('.quote-attrib')!;
    expect(attrib.textContent).toContain('KSL debate');
    expect(attrib.textContent).toContain('Oct 3, 2025');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
  it('expands to verbatim with the edited span bold + editor note', async () => {
    const user = userEvent.setup();
    render(<QuoteBlock topicTitle="Housing" quote={base} mark={{ kind: 'rank', rank: 1 }} />);
    await user.click(screen.getByRole('button', { name: /show full quote/i }));
    const bold = screen.getByText('cap the fees that cities pile on builders', { selector: 'b' });
    expect(bold).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editor's note/i })).toBeInTheDocument();
  });
  it('offers a video deep-link when present', () => {
    render(<QuoteBlock topicTitle="Housing" quote={base} mark={{ kind: 'agreed' }} />);
    expect(screen.getByRole('link', { name: /watch at 12:23/i })).toHaveAttribute('href', 'https://v/x?t=743');
  });
  it('omits the full-quote toggle when there is no verbatim text', () => {
    render(<QuoteBlock topicTitle="Housing" quote={{ ...base, verbatimText: undefined }} mark={{ kind: 'rank', rank: 1 }} />);
    expect(screen.queryByRole('button', { name: /show full quote/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run — confirm fail**

Run: `npm test -- --run QuoteBlock`
Expected: FAIL (module not found).

- [ ] **Step 7: Create `src/components/QuoteBlock.tsx`**

```tsx
import React, { useState } from 'react';
import type { RevealQuote } from '../data/api';
import type { AlignmentMark } from '../utils/alignmentMarks';
import { AlignmentMarkView } from './AlignmentMark';
import { EditorNotePopover } from './EditorNotePopover';

export interface QuoteBlockProps {
  topicTitle: string;
  quote: RevealQuote;
  mark: AlignmentMark;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Render verbatim text with the edited span (a substring) in bold. Falls back to
 *  plain verbatim if the edited text isn't found inside it. */
function renderVerbatim(verbatim: string, edited: string): React.ReactNode {
  const idx = edited ? verbatim.indexOf(edited) : -1;
  if (idx === -1) return verbatim;
  return (
    <>
      {verbatim.slice(0, idx)}
      <b>{verbatim.slice(idx, idx + edited.length)}</b>
      {verbatim.slice(idx + edited.length)}
    </>
  );
}

/** One topic's quote: edited by default, expandable to verbatim (bold span) +
 *  editor's note; source + date shown in both states (spec §5). */
export const QuoteBlock: React.FC<QuoteBlockProps> = ({ topicTitle, quote, mark }) => {
  const [raw, setRaw] = useState(false);
  const hasVerbatim = !!quote.verbatimText && quote.verbatimText !== quote.text;
  const disagreed = mark?.kind === 'disagreed';

  const videoHref = quote.videoUrl && quote.videoTimestampSeconds != null
    ? `${quote.videoUrl}?t=${quote.videoTimestampSeconds}`
    : null;

  return (
    <div className="quote-block">
      <div className="quote-block-head">
        <AlignmentMarkView mark={mark} size={17} />
        <p className="quote-block-topic">{topicTitle}</p>
      </div>

      {raw && hasVerbatim ? (
        <p className={`quote-verbatim ${disagreed ? 'is-dis' : ''}`}>
          &ldquo;{renderVerbatim(quote.verbatimText!, quote.text)}&rdquo;
        </p>
      ) : (
        <p className={`quote-edited ${disagreed ? 'is-dis' : ''}`}>&ldquo;{quote.text}&rdquo;</p>
      )}

      <p className="quote-attrib">
        {quote.sourceName && <span className="quote-src">{quote.sourceName}</span>}
        {quote.sourceDate && <> · {quote.sourceDate}</>}
        {(quote.sourceUrl || videoHref) && <> · </>}
        {videoHref ? (
          <a className="quote-video" href={videoHref} target="_blank" rel="noopener noreferrer">
            ▶ Watch at {formatTimestamp(quote.videoTimestampSeconds!)}
          </a>
        ) : quote.sourceUrl ? (
          <a className="quote-srclink" href={quote.sourceUrl} target="_blank" rel="noopener noreferrer">View source ↗</a>
        ) : null}
      </p>

      {hasVerbatim && (
        <div className="quote-actions">
          <button type="button" className="quote-toggle" onClick={() => setRaw((r) => !r)}>
            {raw ? 'Show edited version' : 'Show full quote'}
          </button>
          {raw && quote.editorNote && <EditorNotePopover note={quote.editorNote} />}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 8: Add quote-block + popover styles to `src/index.css`**

```css
/* Quote drawer blocks (spec §5) */
.quote-block { padding: 0.6875rem 0; border-bottom: 1px solid var(--border-faint); }
.quote-block:last-child { border-bottom: none; }
.quote-block-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4375rem; }
.quote-block-topic { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-secondary); margin: 0; }
.quote-edited { font-family: 'Manrope', sans-serif; font-size: 0.8125rem; line-height: 1.6; margin: 0 0 0.375rem; color: var(--text-ink); }
.quote-verbatim { font-family: 'Manrope', sans-serif; font-size: 0.8125rem; line-height: 1.62; margin: 0 0 0.375rem; color: var(--text-strong); } /* AAA-safe surrounding tone */
.quote-verbatim b { color: var(--text-heading); font-weight: 700; }
.dark .quote-verbatim b { font-weight: 800; } /* weight carries emphasis in dark */
.quote-edited.is-dis, .quote-verbatim.is-dis { color: var(--text-tertiary); }
.quote-attrib { font-family: 'Manrope', sans-serif; font-size: 0.6875rem; color: var(--text-tertiary); margin: 0; }
.quote-src { font-weight: 600; color: var(--text-secondary); }
.quote-srclink { color: var(--text-link); font-weight: 600; text-decoration: none; }
.quote-video { color: var(--color-ev-coral, #ff5740); font-weight: 600; text-decoration: none; }
.quote-actions { display: flex; align-items: center; gap: 0.875rem; margin-top: 0.375rem; }
.quote-toggle { background: none; border: none; padding: 0; cursor: pointer; font-family: 'Manrope', sans-serif; font-size: 0.75rem; font-weight: 700; color: var(--text-link); }
.quote-toggle:hover { text-decoration: underline; }
/* Editor's note footnote + popover */
.editor-note { position: relative; display: inline-flex; }
.editor-note-trigger { display: inline-flex; align-items: center; gap: 0.25rem; background: none; border: none; padding: 0; cursor: pointer; font-family: 'Manrope', sans-serif; font-size: 0.6875rem; font-weight: 400; color: var(--text-tertiary); }
.editor-note-trigger:hover { color: var(--text-secondary); text-decoration: underline; }
.editor-note-pop { position: absolute; bottom: calc(100% + 6px); left: 0; z-index: 20; width: max-content; max-width: 280px; background: var(--surface-card); border-left: 3px solid var(--color-ev-yellow, #fed12e); border-radius: 0 6px 6px 0; box-shadow: var(--shadow-hover); padding: 0.5rem 0.6875rem; font-family: 'Manrope', sans-serif; font-size: 0.75rem; line-height: 1.5; color: var(--text-secondary); }
```

- [ ] **Step 9: Run — confirm pass**

Run: `npm test -- --run QuoteBlock`
Expected: PASS. (The video test expects `12:23` for 743s — 743 = 12*60 + 23.)

- [ ] **Step 10: Commit**

```bash
git add src/components/EditorNotePopover.tsx src/components/QuoteBlock.tsx src/components/__tests__/EditorNotePopover.test.tsx src/components/__tests__/QuoteBlock.test.tsx src/index.css
git commit -m "feat(reveal): three-layer quote block with editor-note popover"
```

---

## Task 10: Quote drawer + candidate ballot card

**Files:**
- Create: `src/components/QuoteDrawer.tsx`
- Create: `src/components/CandidateBallotCard.tsx`
- Create: `src/components/__tests__/CandidateBallotCard.test.tsx`
- Modify: `src/index.css` (card / strip / drawer container styles)

- [ ] **Step 1: Create `src/components/QuoteDrawer.tsx`**

```tsx
import React from 'react';
import type { BallotEntry } from '../data/api';
import { markForQuotes, markStrength } from '../utils/alignmentMarks';
import { QuoteBlock } from './QuoteBlock';

export interface QuoteDrawerProps {
  entry: BallotEntry;
}

/** Per-topic quote blocks, sorted strongest-first, including disagreed (spec §5). */
export const QuoteDrawer: React.FC<QuoteDrawerProps> = ({ entry }) => {
  const topics = entry.perTopic
    .map((t) => ({ topic: t, mark: markForQuotes(t.quotes) }))
    .filter((t) => t.mark != null)
    .sort((a, b) => markStrength(a.mark) - markStrength(b.mark));
  return (
    <div className="quote-drawer">
      {topics.map(({ topic, mark }) => {
        // Show the strongest quote for the topic (best supported, else the disagreed one).
        const quote = [...topic.quotes].sort((a, b) =>
          (a.supported ? (a.rank ?? 99) : 999) - (b.supported ? (b.rank ?? 99) : 999))[0];
        return <QuoteBlock key={topic.topicKey} topicTitle={topic.title} quote={quote} mark={mark} />;
      })}
    </div>
  );
};
```

- [ ] **Step 2: Write failing test for the card**

Create `src/components/__tests__/CandidateBallotCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CandidateBallotCard } from '../CandidateBallotCard';
import type { BallotEntry } from '../../data/api';

const entry: BallotEntry = {
  rank: 1, candidateId: 'c', name: 'Ana Rivera', office: 'Council',
  title: 'City Council Member', chamber: 'Salt Lake City', district: 'District 4',
  photo: '', essentialsUrl: 'https://e/x',
  evidence: { agreementCount: 5, firstPlaceCount: 3, topicsWithAgreement: 3 },
  perTopic: [
    { topicKey: 'h', title: 'Housing', userTopWinner: true, quotes: [{ quoteId: 'q1', text: 'Edited housing.', supported: true, rank: 1, sourceName: 'S', sourceDate: 'Jan 2025' }] },
  ],
};

describe('CandidateBallotCard', () => {
  it('shows the rank number and evidence with top picks', () => {
    render(<CandidateBallotCard entry={entry} totalTopics={6} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    // Evidence text is split across <strong>/<span>, so assert on the container.
    const ev = document.querySelector('.ballot-evidence')!;
    expect(ev.textContent).toContain('Agreed with 5 of 6');
    expect(ev.textContent).toContain('3 top picks');
  });
  it('omits top picks when firstPlaceCount is 0', () => {
    render(<CandidateBallotCard entry={{ ...entry, evidence: { ...entry.evidence, firstPlaceCount: 0 } }} totalTopics={6} />);
    expect(document.querySelector('.ballot-topk')).not.toBeInTheDocument();
  });
  it('shows a Tied tag when tied', () => {
    render(<CandidateBallotCard entry={entry} totalTopics={6} tied />);
    expect(screen.getByText(/tied/i)).toBeInTheDocument();
  });
  it('expands the drawer on toggle', async () => {
    const user = userEvent.setup();
    render(<CandidateBallotCard entry={entry} totalTopics={6} />);
    expect(screen.queryByText(/Edited housing/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /see what they said/i }));
    expect(screen.getByText(/Edited housing/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run — confirm fail**

Run: `npm test -- --run CandidateBallotCard`
Expected: FAIL (module not found).

- [ ] **Step 4: Create `src/components/CandidateBallotCard.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR } from '../motion';
import type { BallotEntry } from '../data/api';
import { PoliticianIdentityCard } from './PoliticianIdentityCard';
import { QuoteDrawer } from './QuoteDrawer';
import { RankNumber } from './RankNumber';
import { track } from '../lib/analytics';

export interface CandidateBallotCardProps {
  entry: BallotEntry;
  /** Denominator for "agreed with X of Y". */
  totalTopics: number;
  /** True when this entry shares its rank with another. */
  tied?: boolean;
  /** ms delay for the reveal cascade. */
  landDelayMs?: number;
}

interface Particle { dx: number; dy: number; size: number; delay: number; isLarge: boolean; }

/** Celebratory burst on the #1 card — the one earned celebration (spec §7). */
const MegaParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const ref = useRef<Particle[]>([]);
  if (ref.current.length === 0) {
    ref.current = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360;
      const dist = 40 + ((i * 37) % 70);
      return {
        dx: Math.cos((angle * Math.PI) / 180) * dist,
        dy: Math.sin((angle * Math.PI) / 180) * dist,
        size: 2 + ((i * 13) % 5), delay: (i % 5) * 0.03, isLarge: i % 4 === 0,
      };
    });
  }
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: -20, pointerEvents: 'none', zIndex: 20 }}>
      {ref.current.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', width: p.isLarge ? p.size * 2 : p.size, height: p.isLarge ? p.size * 2 : p.size,
          borderRadius: '50%',
          background: p.isLarge ? 'radial-gradient(circle, var(--color-ev-coral), transparent)' : 'var(--color-ev-coral)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          animation: `megaBurst var(--dur-burst) ${p.delay}s var(--ease-burst) forwards`,
          ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`,
          opacity: 0.9, filter: p.isLarge ? 'blur(1px)' : 'none',
        }} />
      ))}
    </div>
  );
};

/** rank number + identity card + summary strip + quote drawer (spec §4-5). The
 *  identity card is fixed height; only the drawer grows, so the photo never stretches. */
export const CandidateBallotCard: React.FC<CandidateBallotCardProps> = ({
  entry, totalTopics, tied = false, landDelayMs = 0,
}) => {
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const m = useMotion();
  const { agreementCount, firstPlaceCount } = entry.evidence;

  // #1 celebration: fire the burst once the card has landed (wall-clock timer so it
  // survives the preview rAF throttle, matching the old ResultsPhase behaviour).
  useEffect(() => {
    if (m.reduced || entry.rank !== 1) return;
    const on = setTimeout(() => setBurst(true), landDelayMs);
    const off = setTimeout(() => setBurst(false), landDelayMs + DUR.burst + 200);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [m.reduced, entry.rank, landDelayMs]);

  return (
    <motion.div className="ballot-row"
      initial={m.reduced ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={m.transition(DUR.moderate, EASE.settle, { delay: landDelayMs / 1000 })}>
      {!m.reduced && entry.rank === 1 && <MegaParticles active={burst} />}
      <div className="ballot-rankcol">
        <RankNumber rank={entry.rank} size={28} />
        {tied && <span className="ballot-tie">Tied</span>}
      </div>

      <div className="ballot-outer">
        <PoliticianIdentityCard
          name={entry.name} photo={entry.photo} essentialsUrl={entry.essentialsUrl}
          office={entry.office} title={entry.title} chamber={entry.chamber} district={entry.district}
          onEssentialsClick={() => track('readrank_essentials_link_clicked', { candidate_id: entry.candidateId, rank: entry.rank })} />

        <div className="ballot-strip">
          <p className="ballot-evidence">
            Agreed with <strong>{agreementCount} of {totalTopics}</strong>
            {firstPlaceCount > 0 && (
              <> · <span className="ballot-topk">{firstPlaceCount} top pick{firstPlaceCount === 1 ? '' : 's'}</span></>
            )}
          </p>
          {entry.perTopic.length > 0 && (
            <button type="button" className="ballot-toggle"
              aria-expanded={open}
              onClick={() => {
                setOpen((o) => {
                  if (!o) track('readrank_candidate_details_expanded', { candidate_id: entry.candidateId, rank: entry.rank });
                  return !o;
                });
              }}>
              {open ? 'Hide quotes' : 'See what they said'}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}
        </div>

        {open && <QuoteDrawer entry={entry} />}
      </div>
    </motion.div>
  );
};
```

- [ ] **Step 5: Add card/strip/drawer styles to `src/index.css`**

```css
/* Candidate ballot card (spec §4) */
.ballot-row { position: relative; display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
.ballot-rankcol { display: flex; flex-direction: column; align-items: center; gap: 0.1875rem; flex-shrink: 0; padding-top: 1.375rem; }
.ballot-tie { font-family: 'Manrope', sans-serif; font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-tertiary); }
.ballot-outer { flex: 1; min-width: 0; border: 1px solid var(--border-subtle); border-radius: 0.75rem; overflow: hidden; background: var(--surface-card); }
.ballot-strip { display: flex; align-items: center; justify-content: space-between; gap: 0.625rem; padding: 0.5rem 0.75rem; border-top: 1px solid var(--border-subtle); }
.ballot-evidence { font-family: 'Manrope', sans-serif; font-size: 0.75rem; color: var(--text-secondary); margin: 0; }
.ballot-evidence strong { color: var(--text-heading); }
.ballot-topk { color: var(--text-link); font-weight: 700; white-space: nowrap; }
.ballot-toggle { display: inline-flex; align-items: center; gap: 0.25rem; background: none; border: none; padding: 0.125rem 0; cursor: pointer; font-family: 'Manrope', sans-serif; font-size: 0.75rem; font-weight: 700; color: var(--text-link); white-space: nowrap; }
.ballot-toggle:hover { text-decoration: underline; }
.quote-drawer { background: var(--surface-sunken); border-top: 1px solid var(--border-subtle); padding: 0.25rem 0.875rem 0.625rem; }
```

- [ ] **Step 6: Run — confirm pass + typecheck (excluding ResultsPhase)**

Run: `npm test -- --run CandidateBallotCard && npx tsc --noEmit 2>&1 | grep -v ResultsPhase | head`
Expected: PASS; no new type errors outside ResultsPhase.

- [ ] **Step 7: Commit**

```bash
git add src/components/QuoteDrawer.tsx src/components/CandidateBallotCard.tsx src/components/__tests__/CandidateBallotCard.test.tsx src/index.css
git commit -m "feat(reveal): quote drawer + candidate ballot card"
```

---

## Task 11: Reveal band + compose `ResultsPhase` (remove threshold, insight, medals)

**Files:**
- Create: `src/components/RevealBand.tsx`
- Modify: `src/components/ResultsPhase.tsx`
- Delete: `src/components/ThresholdInterstitial.tsx`
- Modify: `src/index.css` (band styles; remove `.insight-strip`)
- Modify: `src/components/__tests__/ResultsPhase.test.tsx`

- [ ] **Step 1: Create `src/components/RevealBand.tsx`**

```tsx
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface RevealBandProps {
  office: string;
  rankedCount: number;
  topicCount: number;
}

/** The merged reveal beat (spec §1): a persistent dark band atop the results. */
export const RevealBand: React.FC<RevealBandProps> = ({ office, rankedCount, topicCount }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div className="reveal-band"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <p className="reveal-band-eyebrow">
        {office ? <>{office} · </> : null}
        You ranked {rankedCount} quote{rankedCount === 1 ? '' : 's'} across {topicCount} topic{topicCount === 1 ? '' : 's'}
      </p>
      <h2 className="reveal-band-headline">
        Now see <span className="reveal-band-who">who</span> you agreed with
      </h2>
    </motion.div>
  );
};
```

- [ ] **Step 2: Add band styles to `src/index.css` and remove `.insight-strip`**

Add:

```css
/* Reveal band (spec §1) — merged gate, persistent hero */
.reveal-band { background-color: var(--color-ev-black, #1c1c1c); border-radius: 0.75rem; padding: 1.625rem 1.375rem; text-align: center; margin-bottom: 1rem; }
.dark .reveal-band { background-color: #232c38; border: 1px solid #313d4c; }
.reveal-band-eyebrow { font-family: 'Manrope', sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.72); margin: 0 0 0.5rem; }
.reveal-band-headline { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 1.375rem; color: #fff; margin: 0; letter-spacing: -0.01em; }
.reveal-band-who { box-shadow: inset 0 -3px 0 var(--color-ev-yellow, #fed12e); padding-bottom: 2px; }
```

Delete the `.insight-strip { … }` rule block (search `insight-strip`). Also delete the `.reveal-threshold*` block (search `reveal-threshold`) since the component is going away.

- [ ] **Step 3: Rewrite `src/components/ResultsPhase.tsx`**

Replace the whole file. This removes: the threshold stage, the insight strip, `TierIcon`/`tierForIndex`, `buildInsightSentence`/`buildQuoteIdentityMap`, `ThresholdInterstitial`, the old `BallotCard`, and the grid spotlight. It composes the new components and keeps the loading / empty / play-again states, the reveal timeline, and analytics.

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR } from '../motion';
import { computeRevealTimeline } from '../utils/revealTimeline';
import { useReadRankStore, getAllAgreedQuotes, getActiveTopicKeys } from '../store/useReadRankStore';
import { fetchRaceReveal, type RevealResult } from '../data/api';
import { AlignmentSection } from './AlignmentSection';
import { CandidateBallotCard } from './CandidateBallotCard';
import { RevealBand } from './RevealBand';
import { CompassCrossLink } from './CompassCrossLink';
import type { AlignmentTopic } from '../utils/alignmentGrid';
import { track } from '../lib/analytics';

export const ResultsPhase: React.FC = () => {
  const { goToHub, currentRaceId, getRaceVerdicts, getCurrentRaceProgress } = useReadRankStore();
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [loading, setLoading] = useState(true);
  const m = useMotion();
  const race = getCurrentRaceProgress();

  useEffect(() => {
    if (!currentRaceId) { setLoading(false); return; }
    fetchRaceReveal(currentRaceId, getRaceVerdicts(currentRaceId))
      .then(setReveal)
      .finally(() => setTimeout(() => setLoading(false), 600));
  }, [currentRaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const agreedList = race ? getAllAgreedQuotes(race) : [];
  const activeTopicKeys = race ? getActiveTopicKeys(race) : [];
  const topicCount = activeTopicKeys.length;

  const alignmentTopics = useMemo<AlignmentTopic[]>(
    () => (race ? getActiveTopicKeys(race).map((key) => ({ key, title: race.topics[key].title })) : []),
    [race]
  );

  const ballot = reveal?.ballot ?? [];
  const office = race?.positionName ?? reveal?.positionName ?? '';

  // Detect shared ranks for the tie tag.
  const tiedRanks = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of ballot) counts.set(e.rank, (counts.get(e.rank) ?? 0) + 1);
    return counts;
  }, [ballot]);

  const filledCells = useMemo(
    () => alignmentTopics.length * ballot.length, // upper bound is fine for the timeline pacing
    [alignmentTopics.length, ballot.length]
  );
  const timeline = useMemo(
    () => computeRevealTimeline({ filledCells, reduced: m.reduced }),
    [filledCells, m.reduced]
  );

  if (loading) {
    return (
      <div className="text-center py-16">
        <motion.div className="inline-block w-6 h-6 border-2 rounded-full"
          style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--color-ev-muted-blue)' }}
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500, color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Tallying your ballot…
        </p>
      </div>
    );
  }

  if (ballot.length === 0) {
    return (
      <div className="pb-12 max-w-2xl mx-auto">
        <RevealBand office={office} rankedCount={agreedList.length} topicCount={topicCount} />
        <div className="text-center py-10">
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            No agreements yet
          </p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            You didn&apos;t agree with any quotes, so there&apos;s no ballot to build. Try another race.
          </p>
        </div>
        <div className="flex justify-center pt-6">
          <button onClick={() => { track('readrank_play_again_clicked'); goToHub(); }} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
            Play another race near you
          </button>
        </div>
      </div>
    );
  }

  const top = ballot[0];
  const revealAnnouncement = top
    ? `Ballot revealed. Your number one is ${top.name}, agreed with ${top.evidence.agreementCount} position${top.evidence.agreementCount === 1 ? '' : 's'}.`
    : '';

  return (
    <div className="pb-12 max-w-2xl mx-auto">
      <div aria-live="polite" role="status" className="sr-only">{revealAnnouncement}</div>

      <RevealBand office={office} rankedCount={agreedList.length} topicCount={topicCount} />

      <div className="space-y-4">
        <AlignmentSection reveal={reveal!} topics={alignmentTopics}
          animate frameDelayMs={timeline.gridFrame} cellBaseDelayMs={timeline.medalsStart} />

        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', margin: '1.25rem 0 0.25rem' }}>
          How the candidates stack up
        </h3>

        {ballot.map((entry, i) => (
          <CandidateBallotCard key={entry.candidateId} entry={entry} totalTopics={topicCount}
            tied={(tiedRanks.get(entry.rank) ?? 0) > 1}
            landDelayMs={timeline.cardDelay(i)} />
        ))}

        <CompassCrossLink raceId={reveal?.raceId ?? ''} topTopicTitle={null} />
      </div>

      <motion.div className="flex justify-center pt-6"
        {...m.enter({ y: 12 })}
        transition={m.transition(DUR.moderate, EASE.settle, { delay: (timeline.cardDelay(ballot.length) + DUR.moderate) / 1000 })}>
        <button onClick={() => goToHub()} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
          Play another race near you
        </button>
      </motion.div>
    </div>
  );
};
```

- [ ] **Step 4: Delete `ThresholdInterstitial`**

```bash
git rm src/components/ThresholdInterstitial.tsx
```

Search for other imports: `grep -rn "ThresholdInterstitial" src` — expected: none after this file is rewritten. If any test imports it, delete that test.

- [ ] **Step 5: Update `ResultsPhase.test.tsx`**

Open `src/components/__tests__/ResultsPhase.test.tsx` and `src/components/__tests__/ResultsPhase.reducedMotion.test.tsx`. Remove any assertions about the threshold stage (clicking "See who you agreed with"), the insight strip, or `TierIcon`/medals. The page now renders directly. If the tests drive the flow by clicking the threshold button, delete those steps and assert on `RevealBand` text instead. Minimal smoke assertion to keep:

```tsx
// after mocking the reveal fetch to resolve with a ballot:
expect(await screen.findByText(/Now see/)).toBeInTheDocument();
expect(screen.getByText(/How the candidates stack up/)).toBeInTheDocument();
```

(Match the existing file's mocking setup — it already mocks `fetchRaceReveal`. Keep that; only change the interaction/assertions.)

- [ ] **Step 6: Full typecheck + test suite**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no errors.

Run: `npm test -- --run 2>&1 | tail -25`
Expected: all pass. Fix any leftover references to removed props/exports (`buildInsightSentence`, `TierIcon` in reveal, `medalBaseDelayMs`, `spotlight*`).

- [ ] **Step 7: Lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: no new errors (warnings tolerated if the repo already has them).

- [ ] **Step 8: Commit**

```bash
git add src/components/RevealBand.tsx src/components/ResultsPhase.tsx src/index.css src/components/__tests__/ResultsPhase.test.tsx src/components/__tests__/ResultsPhase.reducedMotion.test.tsx
git commit -m "feat(reveal): merge gate into results, compose new reveal page, drop medals+insight"
```

---

## Task 12: In-browser verification (light + dark, desktop + mobile)

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Use the preview tooling (`preview_start`) with the project's dev config. If none exists, create `.claude/launch.json` with the Vite dev server (`npm run dev`, port from `vite.config`).

- [ ] **Step 2: Reach the results page via the mock**

The reveal falls back to `buildMockReveal` when the API is unavailable, so playing any race to the reveal shows the redesign with the extended mock quotes. Drive: pick a race → evaluate a few quotes (agree/disagree, rank some) → reveal.

- [ ] **Step 3: Verify against the spec (record findings, fix source, re-check):**

- Dark band shows `{office} · You ranked N quotes across M topics` + "Now see **who** you agreed with"; **no** intermediate click.
- Matrix (desktop): numbers 1–3, agreed checks, disagreed crosses, faint dash for not-judged; candidate column stays pinned when scrolling a wide race.
- Resize to mobile (`preview_resize` mobile): matrix becomes wrapping pills, sorted strongest-first.
- Candidate card: leading teal number (same size all ranks), Essentials symbol top-right, evidence "Agreed with X of Y · Z top picks", visible teal "See what they said".
- Drawer: edited quote + source + date; "Show full quote" → verbatim with the edited span bold; `(i) editor's note` popover on hover/focus/click; coral "Watch at MM:SS" when video present.
- Toggle `preview_resize` colorScheme dark: band = elevated charcoal (not page-black, not light); numbers use ev light blue; verbatim bold heavier; identity card legible.
- No console errors (`preview_console_logs level: error`).

- [ ] **Step 4: Screenshot proof (light + dark)**

`preview_screenshot` in both color schemes; confirm the composition matches the approved mock.

- [ ] **Step 5: Final commit if any fixes were made**

```bash
git add -A
git commit -m "fix(reveal): address in-browser verification findings"
```

---

## Notes for the implementer

- **Do not touch** `TierIcon.tsx`, `tiers.ts`, `RankList.tsx`, or evaluation-phase files — those power the (already shipped) ranking surface. Only the reveal stops importing tiers.
- The three quote layers, split identity, video timestamps, and tie-breaking are **backend/API** work (spec §8). This plan degrades gracefully without them; the mock demonstrates the full experience.
- `useMediaQuery` is imported from `@empoweredvote/ev-ui` (already a dependency).
- Keep DRY: `AlignmentMarkView` and `markForQuotes`/`markStrength` are the single source for marks across matrix, pills, and drawer.

---

## Task 11.5: Per-topic marks (correction — discovered in Task 12 verification)

**Why:** The reveal's `RevealQuote.rank` is a **global** rank (`getRaceVerdicts` flattens all
agreed quotes across topics and numbers them 1..N). The approved design intends **per-topic**
ranks: a candidate can be your #1 in several topics, and "N top picks" = the number of topics
where they are your #1. Under global ranks only three numbered cells exist (clustered in the
first-evaluated topic) and "top picks" maxes at 1. This task recomputes marks per-topic.

**Key insight:** per-topic rank is derivable from the reveal alone — within a topic, global
ranks preserve the per-topic order, so grouping a topic's agreed quotes and sorting by global
rank yields per-topic ranks 1,2,3… A single `Map<quoteId, perTopicRank>` built once in
`ResultsPhase` is threaded to the matrix, pills, drawer, and the top-picks count.

**Files:**
- Modify: `src/utils/alignmentMarks.ts` (+ test)
- Modify: `src/utils/alignmentGrid.ts` (+ test)
- Modify: `src/components/AlignmentPills.tsx` (+ test)
- Modify: `src/components/AlignmentSection.tsx` (+ test)
- Modify: `src/components/QuoteDrawer.tsx`
- Modify: `src/components/CandidateBallotCard.tsx` (+ test)
- Modify: `src/components/ResultsPhase.tsx`

- [ ] **Step 1: `alignmentMarks.ts` — add per-topic helpers, change `markForQuotes` signature**

Add `buildPerTopicRankMap` and `countTopPicks`; change `markForQuotes` to read rank from a map:

```ts
import type { RevealQuote, RevealResult } from '../data/api';

export type AlignmentMark =
  | { kind: 'rank'; rank: number }
  | { kind: 'agreed' }
  | { kind: 'disagreed' }
  | null;

/** quoteId → the quote's rank WITHIN its topic (1-based). Derived from the reveal:
 *  global ranks preserve per-topic order, so per topic we sort agreed quotes by
 *  global rank and number them 1,2,3… Disagreed/unranked quotes are omitted. */
export function buildPerTopicRankMap(reveal: RevealResult): Map<string, number> {
  const byTopic = new Map<string, { quoteId: string; rank: number }[]>();
  for (const entry of reveal.ballot) {
    for (const t of entry.perTopic) {
      for (const q of t.quotes) {
        if (!q.supported || q.rank == null) continue;
        const arr = byTopic.get(t.topicKey) ?? [];
        arr.push({ quoteId: q.quoteId, rank: q.rank });
        byTopic.set(t.topicKey, arr);
      }
    }
  }
  const map = new Map<string, number>();
  for (const arr of byTopic.values()) {
    arr.sort((a, b) => a.rank - b.rank);
    arr.forEach((q, i) => map.set(q.quoteId, i + 1));
  }
  return map;
}

/** Reduce a candidate's quotes on one topic to a mark, using per-topic ranks. */
export function markForQuotes(quotes: RevealQuote[], rankMap: Map<string, number>): AlignmentMark {
  let bestRank = Infinity;
  let sawSupported = false;
  let sawDisagreed = false;
  for (const quote of quotes) {
    if (quote.supported) {
      sawSupported = true;
      const r = rankMap.get(quote.quoteId);
      if (r != null && r < bestRank) bestRank = r;
    } else {
      sawDisagreed = true;
    }
  }
  if (sawSupported) return bestRank <= 3 ? { kind: 'rank', rank: bestRank } : { kind: 'agreed' };
  if (sawDisagreed) return { kind: 'disagreed' };
  return null;
}

export function markStrength(mark: AlignmentMark): number {
  if (mark == null) return 100;
  if (mark.kind === 'rank') return mark.rank;
  if (mark.kind === 'agreed') return 10;
  return 20;
}

/** Number of topics where this candidate holds the user's #1 (per-topic rank 1). */
export function countTopPicks(quotes: RevealQuote[], rankMap: Map<string, number>): number {
  return quotes.filter((q) => q.supported && rankMap.get(q.quoteId) === 1).length;
}
```

Update `alignmentMarks.test.ts`: pass a `Map` to `markForQuotes` in every case (build a map like
`new Map([['x', 2]])`); add tests for `buildPerTopicRankMap` (two candidates' quotes in one topic
with global ranks 1 and 4 → per-topic ranks 1 and 2) and `countTopPicks`.

- [ ] **Step 2: `alignmentGrid.ts` — take the rank map**

```ts
export function buildAlignmentGrid(
  reveal: RevealResult,
  topics: AlignmentTopic[],
  rankMap: Map<string, number>
): AlignmentRow[] {
  return reveal.ballot.map((entry) => {
    const byTopic = new Map(entry.perTopic.map((t) => [t.topicKey, t]));
    const cells = topics.map((topic) => markForQuotes(byTopic.get(topic.key)?.quotes ?? [], rankMap));
    return { candidateId: entry.candidateId, name: entry.name, cells };
  });
}
```

Update `alignmentGrid.test.ts`: build `const rankMap = buildPerTopicRankMap(reveal)` and pass it.
New expectations for the existing fixture (topic-a has q1@global1 and q2@global4 → per-topic 1 and 2;
topic-b has only q9 disagreed): Jane `[{kind:'rank',rank:1}, {kind:'disagreed'}]`, Sam
`[{kind:'rank',rank:2}, null]`.

- [ ] **Step 3: `AlignmentPills.tsx` — accept `rankMap` prop**

Add `rankMap: Map<string, number>` to `AlignmentPillsProps`; use `markForQuotes(quotes, rankMap)`.
Update `AlignmentPills.test.tsx` to pass `rankMap={buildPerTopicRankMap(reveal)}`. In that fixture
each topic has exactly one agreed quote, so all are per-topic rank 1 → strongest-first sort keeps
input topic order; assert order `['Housing','Transit','Policing']` (rank-1, rank-1, disagreed).

- [ ] **Step 4: `AlignmentSection.tsx` — thread `rankMap`**

Add `rankMap: Map<string, number>` to props; pass to `buildAlignmentGrid(reveal, topics, rankMap)`
and to `<AlignmentPills rankMap={rankMap} .../>`. Update `AlignmentSection.test.tsx` to pass a
`rankMap` (can be `new Map()` for the render-path assertions, or `buildPerTopicRankMap(reveal)`).

- [ ] **Step 5: `QuoteDrawer.tsx` — accept `rankMap`, use it for marks + strongest-quote sort**

Add `rankMap: Map<string, number>` to props. Compute each topic's mark via
`markForQuotes(t.quotes, rankMap)`; for the strongest-quote-per-topic selection, sort by
`rankMap.get(q.quoteId) ?? Infinity` for supported quotes (disagreed last). Pass the resulting
`mark` to `QuoteBlock` (unchanged).

- [ ] **Step 6: `CandidateBallotCard.tsx` — top picks from the map**

Add `rankMap: Map<string, number>` to props. Replace `evidence.firstPlaceCount` in the strip with
`const topPicks = countTopPicks(entry.perTopic.flatMap((t) => t.quotes), rankMap);` and render
`{topPicks} top pick(s)` (omit when 0). Pass `rankMap` to `<QuoteDrawer .../>`.
Update `CandidateBallotCard.test.tsx`: pass a `rankMap` prop. For the "3 top picks" case, seed the
map so three of the entry's quotes are rank 1 (one per topic); for the "omits" case seed none at 1.

- [ ] **Step 7: `ResultsPhase.tsx` — build the map once, thread it**

```tsx
import { buildPerTopicRankMap } from '../utils/alignmentMarks';
// ...
const rankMap = useMemo(() => (reveal ? buildPerTopicRankMap(reveal) : new Map<string, number>()), [reveal]);
// pass rankMap to <AlignmentSection ... rankMap={rankMap} /> and each <CandidateBallotCard ... rankMap={rankMap} />
```

- [ ] **Step 8: Gates**

`npx tsc -b --noEmit` → 0 errors. `npm test -- --run` → all green (update every test touched above).
`npm run lint` → no new errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "fix(reveal): per-topic marks and top-pick counts (not global rank)"
```
