# Staged Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship priority #4 from REDESIGN_SPEC.md (§1.4) — the reveal as a staged, user-paced unmasking: a threshold moment, the user's tier-framed ranking rendered anonymously (continuity with the rank rail), per-quote flips that unmask name + office + source, an evidence-toned insight sentence, the RCV education beat with race-type differentiation (§9), and the existing candidate ballot demoted to a "how candidates stack up" summary below.

**Architecture:** `ResultsPhase` becomes a small state machine: `threshold` → `board` (→ summary content appears below the board once all quotes are revealed). New components: `RevealCard` (flip card: anonymous tier-framed front, identity back), `RevealBoard` (ordered list + Reveal all + live region), `ThresholdInterstitial`, `RcvEducationPanel`. New pure utils: `buildQuoteIdentityMap` (quoteId → candidate identity from the reveal payload) and `buildInsightSentence`. The existing `BallotCard` list is kept intact as the post-unmasking candidate summary. An optional `usesRcv` flag is added to `RevealResult` (mock: `false` — Indiana does not use RCV).

**Blindness invariant:** a quote's candidate name must NOT exist anywhere in the DOM until that quote's reveal is triggered. Once triggered, the name enters the accessible tree immediately — the flip animation is purely decorative (§7.2: content never inaccessible during transition).

**ev-yellow debut:** the threshold underline (approved placement #5) and the insight strip's 3px top rule (#6) are the app's first ev-yellow accents. Yellow is decorative only; adjacent text carries the information.

**Deviation from spec, recorded:** §1.4 describes the threshold as a 1–2s auto-advancing skippable interstitial. This plan makes it user-paced (a single primary button) — no timer to race for screen-reader users, inherently reduced-motion-safe, and the emotional beat lands when the user chooses. The entrance animation still plays for motion-tolerant users.

**Tech Stack:** React 19, framer-motion (flips + entrances, all gated on useReducedMotion), vitest + RTL (58 passing at start).

**Copy rules:** no em dashes; two spaces after periods via `&nbsp;` + space.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/data/api.ts` | Modify | `usesRcv?: boolean` on `RevealResult` |
| `src/data/mockData.ts` | Modify | Mock reveal sets `usesRcv: false` |
| `src/utils/revealInsight.ts` | Create | `buildQuoteIdentityMap`, `buildInsightSentence` |
| `src/utils/__tests__/revealInsight.test.ts` | Create | Identity map + insight sentence logic |
| `src/components/RevealCard.tsx` | Create | Flip card: anonymous front, identity back |
| `src/components/__tests__/RevealCard.test.tsx` | Create | Blindness invariant, reveal, SourceLine |
| `src/components/RevealBoard.tsx` | Create | Ordered board, Reveal all, live region, completion |
| `src/components/__tests__/RevealBoard.test.tsx` | Create | Order, reveal-all, announcements, callback |
| `src/components/ThresholdInterstitial.tsx` | Create | The threshold moment |
| `src/components/RcvEducationPanel.tsx` | Create | RCV beat with usesRcv variants |
| `src/components/__tests__/RevealExtras.test.tsx` | Create | Interstitial + education panel |
| `src/components/ResultsPhase.tsx` | Modify | Orchestration; ballot demoted to summary |
| `src/components/__tests__/ResultsPhase.test.tsx` | Modify | New flow coverage; existing tests preserved |
| `src/index.css` | Modify | Threshold, flip, insight strip, yellow accents |

---

### Task 0: Branch

- [x] **Step 1:**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
git checkout -b feat/staged-reveal
```

---

### Task 1: Data plumbing + insight utils

**Files:**
- Modify: `src/data/api.ts`, `src/data/mockData.ts`
- Create: `src/utils/revealInsight.ts`, `src/utils/__tests__/revealInsight.test.ts`

- [x] **Step 1: Write the failing tests** — create `src/utils/__tests__/revealInsight.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildQuoteIdentityMap, buildInsightSentence } from '../revealInsight';
import type { RevealResult } from '../../data/api';
import type { AgreedQuote } from '../../store/useReadRankStore';

const reveal: RevealResult = {
  raceId: 'r1',
  positionName: 'Governor',
  usesRcv: false,
  ballot: [
    {
      rank: 1, candidateId: 'jane', name: 'Jane Doe', office: 'Candidate for Governor', photo: '',
      essentialsUrl: 'https://example.com/jane',
      evidence: { agreementCount: 2, firstPlaceCount: 1, topicsWithAgreement: 2 },
      perTopic: [
        { topicKey: 'a', title: 'A', userTopWinner: true, quotes: [
          { quoteId: 'q1', text: 'One.', supported: true, rank: 1, sourceName: 'S1', sourceUrl: 'https://s.example/1' },
        ]},
        { topicKey: 'b', title: 'B', userTopWinner: false, quotes: [
          { quoteId: 'q4', text: 'Four.', supported: true, rank: 4, sourceName: 'S4', sourceUrl: 'https://s.example/4' },
        ]},
      ],
    },
    {
      rank: 2, candidateId: 'sam', name: 'Sam Roe', office: 'Candidate for Governor', photo: '',
      essentialsUrl: 'https://example.com/sam',
      evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
      perTopic: [
        { topicKey: 'a', title: 'A', userTopWinner: false, quotes: [
          { quoteId: 'q2', text: 'Two.', supported: true, rank: 2, sourceName: 'S2', sourceUrl: 'https://s.example/2' },
        ]},
      ],
    },
    {
      rank: 3, candidateId: 'kim', name: 'Kim Poe', office: 'Candidate for Governor', photo: '',
      essentialsUrl: 'https://example.com/kim',
      evidence: { agreementCount: 1, firstPlaceCount: 0, topicsWithAgreement: 1 },
      perTopic: [
        { topicKey: 'a', title: 'A', userTopWinner: false, quotes: [
          { quoteId: 'q3', text: 'Three.', supported: true, rank: 3, sourceName: 'S3', sourceUrl: 'https://s.example/3' },
        ]},
      ],
    },
  ],
};

const agreedQuote = (id: string): AgreedQuote => ({
  id, text: id, candidateToken: 't', topicKey: 'a', addedAt: 1,
});

describe('buildQuoteIdentityMap', () => {
  it('maps every ballot quote to its candidate identity with source', () => {
    const map = buildQuoteIdentityMap(reveal);
    expect(map.get('q1')).toMatchObject({ name: 'Jane Doe', office: 'Candidate for Governor', sourceName: 'S1' });
    expect(map.get('q2')).toMatchObject({ name: 'Sam Roe', essentialsUrl: 'https://example.com/sam' });
    expect(map.get('q3')).toMatchObject({ name: 'Kim Poe' });
    expect(map.get('missing')).toBeUndefined();
  });
});

describe('buildInsightSentence', () => {
  it('notices when all top three picks share one candidate', () => {
    const map = buildQuoteIdentityMap(reveal);
    map.set('x1', map.get('q1')!);
    map.set('x2', map.get('q1')!);
    const agreed = [agreedQuote('q1'), agreedQuote('x1'), agreedQuote('x2')];
    expect(buildInsightSentence(agreed, map)).toBe(
      'All three of your top picks came from one candidate: Jane Doe.'
    );
  });

  it('notices three different candidates', () => {
    const map = buildQuoteIdentityMap(reveal);
    const agreed = [agreedQuote('q1'), agreedQuote('q2'), agreedQuote('q3')];
    expect(buildInsightSentence(agreed, map)).toBe(
      'Your top three choices came from three different candidates.'
    );
  });

  it('notices a two-of-three majority', () => {
    const map = buildQuoteIdentityMap(reveal);
    map.set('x1', map.get('q1')!);
    const agreed = [agreedQuote('q1'), agreedQuote('x1'), agreedQuote('q2')];
    expect(buildInsightSentence(agreed, map)).toBe(
      'Two of your top three picks came from Jane Doe.'
    );
  });

  it('falls back to the top pick when fewer than three are ranked', () => {
    const map = buildQuoteIdentityMap(reveal);
    expect(buildInsightSentence([agreedQuote('q1')], map)).toBe(
      'Your top pick came from Jane Doe.'
    );
  });

  it('returns null with nothing agreed', () => {
    expect(buildInsightSentence([], buildQuoteIdentityMap(reveal))).toBeNull();
  });
});
```

- [x] **Step 2:** Run — FAIL (module not found; also `usesRcv` type error is expected until Step 3).

- [x] **Step 3: Add the flag.** In `src/data/api.ts`, add to `RevealResult`:

```ts
export interface RevealResult {
  raceId: string;
  positionName: string;
  /** True where this race is actually decided by ranked choice voting. */
  usesRcv?: boolean;
  ballot: BallotEntry[];
}
```

In `src/data/mockData.ts`, `buildMockReveal`'s return becomes:

```ts
  return { raceId: MOCK_RACE_ID, positionName: mockRaceSummary.positionName, usesRcv: false, ballot };
```

- [x] **Step 4: Create `src/utils/revealInsight.ts`:**

```ts
import type { RevealResult } from '../data/api';
import type { AgreedQuote } from '../store/useReadRankStore';

export interface QuoteIdentity {
  candidateId: string;
  name: string;
  office: string;
  photo: string;
  essentialsUrl: string;
  sourceName?: string;
  sourceUrl?: string;
}

/**
 * quoteId → candidate identity, derived from the reveal payload. Every agreed
 * quote is covered: candidates earn a ballot entry by having at least one
 * supported verdict, and their perTopic lists carry all judged quotes.
 */
export function buildQuoteIdentityMap(reveal: RevealResult): Map<string, QuoteIdentity> {
  const map = new Map<string, QuoteIdentity>();
  for (const entry of reveal.ballot) {
    for (const topic of entry.perTopic) {
      for (const q of topic.quotes) {
        map.set(q.quoteId, {
          candidateId: entry.candidateId,
          name: entry.name,
          office: entry.office,
          photo: entry.photo,
          essentialsUrl: entry.essentialsUrl,
          sourceName: q.sourceName,
          sourceUrl: q.sourceUrl,
        });
      }
    }
  }
  return map;
}

/**
 * One evidence-toned sentence about the user's top picks (REDESIGN_SPEC §1.4
 * step 4). Returns null when there is nothing to say.
 */
export function buildInsightSentence(
  agreed: AgreedQuote[],
  identities: Map<string, QuoteIdentity>
): string | null {
  const top = agreed.slice(0, 3).map((q) => identities.get(q.id)).filter(Boolean) as QuoteIdentity[];
  if (top.length === 0) return null;
  if (top.length < 3) return `Your top pick came from ${top[0].name}.`;

  const names = top.map((c) => c.name);
  const unique = new Set(names);
  if (unique.size === 1) {
    return `All three of your top picks came from one candidate: ${names[0]}.`;
  }
  if (unique.size === 3) {
    return 'Your top three choices came from three different candidates.';
  }
  const majority = names.find((n) => names.filter((m) => m === n).length === 2)!;
  return `Two of your top three picks came from ${majority}.`;
}
```

- [x] **Step 5:** Run the test file (6 passed), full suite (`npm test`, expect 64), build, lint (baseline 12).

- [x] **Step 6: Commit**

```bash
git add src/data/ src/utils/revealInsight.ts src/utils/__tests__/revealInsight.test.ts
git commit -m "feat: reveal identity map, insight sentences, and usesRcv flag"
```

(End every commit in this plan with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`)

---

### Task 2: RevealCard — the flip

**Files:**
- Create: `src/components/RevealCard.tsx`, `src/components/__tests__/RevealCard.test.tsx`

- [x] **Step 1: Write the failing tests:**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevealCard } from '../RevealCard';
import type { QuoteIdentity } from '../../utils/revealInsight';

const identity: QuoteIdentity = {
  candidateId: 'jane',
  name: 'Jane Doe',
  office: 'Candidate for Governor',
  photo: '',
  essentialsUrl: 'https://example.com/jane',
  sourceName: 'KQED Forum',
  sourceUrl: 'https://example.com/kqed',
};

describe('RevealCard', () => {
  it('keeps the candidate fully absent from the DOM until revealed', () => {
    render(
      <RevealCard quoteText="A quote." index={0} identity={identity} revealed={false} onReveal={vi.fn()} />
    );
    expect(screen.getByText('A quote.')).toBeInTheDocument();
    expect(screen.queryByText(/jane doe/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/jane/i);
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
  });

  it('requests the reveal on tap', async () => {
    const onReveal = vi.fn();
    render(
      <RevealCard quoteText="A quote." index={0} identity={identity} revealed={false} onReveal={onReveal} />
    );
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it('shows identity, retained quote, source, and tier frame once revealed', () => {
    render(
      <RevealCard quoteText="A quote." index={1} identity={identity} revealed onReveal={vi.fn()} />
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Candidate for Governor')).toBeInTheDocument();
    expect(screen.getByText('A quote.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /verify source: KQED Forum/i })).toBeInTheDocument();
    expect(screen.getByText('A quote.').closest('.tier-row')).toHaveClass('tier-row-gold');
    expect(screen.queryByRole('button', { name: /^reveal$/i })).not.toBeInTheDocument();
  });

  it('links to the candidate profile once revealed', () => {
    render(
      <RevealCard quoteText="A quote." index={0} identity={identity} revealed onReveal={vi.fn()} />
    );
    const link = screen.getByRole('link', { name: /view candidate/i });
    expect(link).toHaveAttribute('href', 'https://example.com/jane');
  });
});
```

- [x] **Step 2:** Run — FAIL (module not found).

- [x] **Step 3: Create `src/components/RevealCard.tsx`:**

```tsx
import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TIER_META, tierForIndex } from '../utils/tiers';
import { TierIcon } from './TierIcon';
import { SourceLine } from './SourceLine';
import type { QuoteIdentity } from '../utils/revealInsight';

export interface RevealCardProps {
  quoteText: string;
  /** Position in the user's agreed ranking (0-based) — sets the tier frame. */
  index: number;
  identity: QuoteIdentity;
  revealed: boolean;
  onReveal: () => void;
}

/**
 * One quote on the reveal board (REDESIGN_SPEC §1.4, §3.5). The front face is
 * the user's anonymous tier-framed ranking row; the back face unmasks the
 * candidate. The candidate name never enters the DOM until `revealed` —
 * blindness is structural here too. The flip is decorative; identity content
 * mounts instantly on reveal (§7.2).
 */
export const RevealCard: React.FC<RevealCardProps> = ({ quoteText, index, identity, revealed, onReveal }) => {
  const prefersReducedMotion = useReducedMotion();
  const tier = tierForIndex(index);
  const meta = TIER_META[tier];
  const [imgOk, setImgOk] = useState(true);

  const frame = (
    <>
      {tier !== 'bronze' && (
        <div className={`tier-label tier-label-${tier}`}>
          <TierIcon tier={tier} size={12} />
          {meta.label}
        </div>
      )}
    </>
  );

  if (!revealed) {
    return (
      <div className={`tier-row tier-row-${tier} reveal-card`}>
        <span className="tier-rank-num" aria-hidden="true">{index + 1}</span>
        <div className="reveal-card-main">
          {frame}
          <p className="reveal-card-quote">&ldquo;{quoteText}&rdquo;</p>
        </div>
        <button type="button" className="reveal-card-trigger" onClick={onReveal}>
          Reveal
        </button>
      </div>
    );
  }

  const initials = identity.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <motion.div
      className={`tier-row tier-row-${tier} reveal-card reveal-card-revealed`}
      initial={prefersReducedMotion ? false : { rotateY: 90, opacity: 0.4 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="tier-rank-num" aria-hidden="true">{index + 1}</span>
      <div className="reveal-card-main">
        {frame}
        <div className="reveal-card-identity">
          {identity.photo && imgOk ? (
            <img
              src={identity.photo}
              alt=""
              onError={() => setImgOk(false)}
              className="reveal-card-photo"
            />
          ) : (
            <span className="reveal-card-photo reveal-card-initials" aria-hidden="true">{initials}</span>
          )}
          <div>
            <div className="reveal-card-name">{identity.name}</div>
            <div className="reveal-card-office">{identity.office}</div>
          </div>
        </div>
        <p className="reveal-card-quote">&ldquo;{quoteText}&rdquo;</p>
        <div className="reveal-card-footer">
          <SourceLine sourceName={identity.sourceName} sourceUrl={identity.sourceUrl} variant="compact" />
          <a
            href={identity.essentialsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="reveal-card-profile-link"
          >
            View candidate
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </motion.div>
  );
};
```

- [x] **Step 4: Add reveal-card CSS to `src/index.css`** (new section after the Tier Frames section):

```css
/* ============================================
   Staged Reveal (REDESIGN_SPEC §1.4)
   ============================================ */

.reveal-card {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
  transform-style: preserve-3d;
}

.reveal-card-main {
  flex: 1;
  min-width: 0;
}

.reveal-card-quote {
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--text-ink);
  margin: 0.25rem 0 0;
}

.reveal-card-trigger {
  flex-shrink: 0;
  background: none;
  border: 1.5px solid var(--text-link);
  border-radius: 9999px;
  color: var(--text-link);
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  min-height: 2.75rem;
  padding: 0 1rem;
}

.reveal-card-trigger:hover {
  background-color: var(--text-link);
  color: var(--surface-card);
}

.reveal-card-identity {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 0.375rem 0;
}

.reveal-card-photo {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border-medium);
}

.reveal-card-initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--surface-raised);
  color: var(--text-tertiary);
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 0.8125rem;
}

.reveal-card-name {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 0.9375rem;
  color: var(--text-heading);
}

.reveal-card-office {
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.reveal-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.375rem;
  flex-wrap: wrap;
}

.reveal-card-profile-link {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--text-link);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 2.75rem;
}
```

- [x] **Step 5:** Run the test file (4 passed), full suite (expect 68), build, lint. Commit:

```bash
git add src/components/RevealCard.tsx src/components/__tests__/RevealCard.test.tsx src/index.css
git commit -m "feat: RevealCard flip with structural blindness until reveal"
```

---

### Task 3: RevealBoard — order, Reveal all, announcements

**Files:**
- Create: `src/components/RevealBoard.tsx`, `src/components/__tests__/RevealBoard.test.tsx`

- [x] **Step 1: Write the failing tests:**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevealBoard } from '../RevealBoard';
import type { QuoteIdentity } from '../../utils/revealInsight';
import type { AgreedQuote } from '../../store/useReadRankStore';

const idFor = (name: string): QuoteIdentity => ({
  candidateId: name.toLowerCase(),
  name,
  office: 'Candidate for Governor',
  photo: '',
  essentialsUrl: `https://example.com/${name.toLowerCase()}`,
  sourceName: 'Forum',
  sourceUrl: 'https://example.com/forum',
});

const agreed: AgreedQuote[] = [
  { id: 'q1', text: 'First quote.', candidateToken: 'a', topicKey: 'k', addedAt: 1 },
  { id: 'q2', text: 'Second quote.', candidateToken: 'b', topicKey: 'k', addedAt: 2 },
];

const identities = new Map<string, QuoteIdentity>([
  ['q1', idFor('Jane Doe')],
  ['q2', idFor('Sam Roe')],
]);

describe('RevealBoard', () => {
  it('renders the agreed ranking anonymously with a Reveal all control', () => {
    render(<RevealBoard agreed={agreed} identities={identities} onAllRevealed={vi.fn()} />);
    expect(screen.getByText('First quote.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/jane|sam/i);
    expect(screen.getByRole('button', { name: /reveal all/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^reveal$/i })).toHaveLength(2);
  });

  it('announces each reveal and fires completion after the last one', async () => {
    const onAllRevealed = vi.fn();
    render(<RevealBoard agreed={agreed} identities={identities} onAllRevealed={onAllRevealed} />);
    const reveals = screen.getAllByRole('button', { name: /^reveal$/i });
    await userEvent.click(reveals[0]);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    const status = screen.getAllByRole('status').find((el) => /revealed/i.test(el.textContent ?? ''));
    expect(status).toHaveTextContent(/1st choice revealed: Jane Doe, Candidate for Governor/i);
    expect(onAllRevealed).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /^reveal$/i }));
    expect(onAllRevealed).toHaveBeenCalledOnce();
  });

  it('reveals everything at once via Reveal all', async () => {
    const onAllRevealed = vi.fn();
    render(<RevealBoard agreed={agreed} identities={identities} onAllRevealed={onAllRevealed} />);
    await userEvent.click(screen.getByRole('button', { name: /reveal all/i }));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Sam Roe')).toBeInTheDocument();
    expect(onAllRevealed).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 2:** Run — FAIL (module not found).

- [x] **Step 3: Create `src/components/RevealBoard.tsx`:**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { RevealCard } from './RevealCard';
import { TIER_META, tierForIndex } from '../utils/tiers';
import type { QuoteIdentity } from '../utils/revealInsight';
import type { AgreedQuote } from '../store/useReadRankStore';

export interface RevealBoardProps {
  agreed: AgreedQuote[];
  identities: Map<string, QuoteIdentity>;
  onAllRevealed: () => void;
}

/**
 * The unmasking board (REDESIGN_SPEC §1.4 steps 2-3): the user's ranking,
 * rendered exactly as the rank rail showed it, unmasked at the user's pace.
 */
export const RevealBoard: React.FC<RevealBoardProps> = ({ agreed, identities, onAllRevealed }) => {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState('');
  const completedRef = useRef(false);

  const visible = agreed.filter((q) => identities.has(q.id));

  useEffect(() => {
    if (!completedRef.current && visible.length > 0 && revealed.size >= visible.length) {
      completedRef.current = true;
      onAllRevealed();
    }
  }, [revealed, visible.length, onAllRevealed]);

  const revealOne = (quote: AgreedQuote, index: number) => {
    const identity = identities.get(quote.id);
    if (!identity) return;
    setRevealed((prev) => {
      if (prev.has(quote.id)) return prev;
      const next = new Set(prev);
      next.add(quote.id);
      return next;
    });
    const meta = TIER_META[tierForIndex(index)];
    setAnnouncement(`${meta.label} revealed: ${identity.name}, ${identity.office}`);
  };

  const revealAll = () => {
    setRevealed(new Set(visible.map((q) => q.id)));
    setAnnouncement('All choices revealed');
  };

  const remaining = visible.length - revealed.size;

  return (
    <div className="reveal-board">
      <div className="reveal-board-header">
        <p className="reveal-board-hint">
          Tap each quote to see who said it.&nbsp; Start anywhere.
        </p>
        {remaining > 0 && (
          <button type="button" className="reveal-board-all" onClick={revealAll}>
            Reveal all
          </button>
        )}
      </div>
      <div className="reveal-board-list">
        {visible.map((q, i) => (
          <RevealCard
            key={q.id}
            quoteText={q.text}
            index={i}
            identity={identities.get(q.id)!}
            revealed={revealed.has(q.id)}
            onReveal={() => revealOne(q, i)}
          />
        ))}
      </div>
      <div className="sr-only" role="status">{announcement}</div>
    </div>
  );
};
```

- [x] **Step 4: Add board CSS to `src/index.css`** (in the Staged Reveal section):

```css
.reveal-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.625rem;
}

.reveal-board-hint {
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0;
}

.reveal-board-all {
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--text-link);
  min-height: 2.75rem;
  padding: 0 0.5rem;
  flex-shrink: 0;
}

.reveal-board-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
```

- [x] **Step 5:** Run the test file (3 passed), full suite (expect 71), build, lint. Commit:

```bash
git add src/components/RevealBoard.tsx src/components/__tests__/RevealBoard.test.tsx src/index.css
git commit -m "feat: RevealBoard user-paced unmasking with announcements"
```

---

### Task 4: ThresholdInterstitial + RcvEducationPanel

**Files:**
- Create: `src/components/ThresholdInterstitial.tsx`, `src/components/RcvEducationPanel.tsx`, `src/components/__tests__/RevealExtras.test.tsx`

- [x] **Step 1: Write the failing tests:**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThresholdInterstitial } from '../ThresholdInterstitial';
import { RcvEducationPanel } from '../RcvEducationPanel';

describe('ThresholdInterstitial', () => {
  it('states what was ranked and advances on the button', async () => {
    const onContinue = vi.fn();
    render(<ThresholdInterstitial rankedCount={5} topicCount={3} onContinue={onContinue} />);
    expect(screen.getByText(/you ranked 5 quotes across 3 topics/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /see who you agreed with/i }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('handles singular counts', () => {
    render(<ThresholdInterstitial rankedCount={1} topicCount={1} onContinue={vi.fn()} />);
    expect(screen.getByText(/you ranked 1 quote across 1 topic/i)).toBeInTheDocument();
  });
});

describe('RcvEducationPanel', () => {
  it('explains the mirror and the real-RCV connection', () => {
    render(<RcvEducationPanel usesRcv={true} />);
    expect(screen.getByText(/mirrors ranked choice voting/i)).toBeInTheDocument();
    expect(screen.getByText(/this race is decided exactly this way/i)).toBeInTheDocument();
  });

  it('contrasts with single-choice races', () => {
    render(<RcvEducationPanel usesRcv={false} />);
    expect(screen.getByText(/decided with a single choice instead/i)).toBeInTheDocument();
    expect(screen.getByText(/only your top pick would count/i)).toBeInTheDocument();
  });

  it('stays generic when the method is unknown', () => {
    render(<RcvEducationPanel usesRcv={undefined} />);
    expect(screen.getByText(/mirrors ranked choice voting/i)).toBeInTheDocument();
    expect(screen.queryByText(/single choice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/exactly this way/i)).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2:** Run — FAIL.

- [x] **Step 3: Create `src/components/ThresholdInterstitial.tsx`:**

```tsx
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface ThresholdInterstitialProps {
  rankedCount: number;
  topicCount: number;
  onContinue: () => void;
}

/**
 * The threshold moment (REDESIGN_SPEC §1.4 step 1): a dark beat between
 * ranking and unmasking. User-paced (no auto-advance) — the recorded
 * deviation from the spec's 1-2s timer, for SR and reduced-motion safety.
 */
export const ThresholdInterstitial: React.FC<ThresholdInterstitialProps> = ({ rankedCount, topicCount, onContinue }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="reveal-threshold">
      <motion.div
        className="reveal-threshold-inner"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="reveal-threshold-count">
          You ranked {rankedCount} quote{rankedCount === 1 ? '' : 's'} across {topicCount} topic{topicCount === 1 ? '' : 's'}.
        </p>
        <h2 className="reveal-threshold-headline">
          Now see <span className="reveal-threshold-who">who</span> you agreed with.
        </h2>
        <button type="button" className="ev-button-primary reveal-threshold-button" onClick={onContinue}>
          See who you agreed with
        </button>
      </motion.div>
    </div>
  );
};
```

And `src/components/RcvEducationPanel.tsx`:

```tsx
import React from 'react';

export interface RcvEducationPanelProps {
  usesRcv?: boolean;
}

/**
 * The one place the mechanic is named (REDESIGN_SPEC §1.4 step 5, §9).
 * Evidence-toned: present the comparison, never editorialize.
 */
export const RcvEducationPanel: React.FC<RcvEducationPanelProps> = ({ usesRcv }) => {
  return (
    <section className="rcv-panel">
      <h3 className="rcv-panel-heading">What you just did mirrors ranked choice voting.</h3>
      <p className="rcv-panel-body">
        You ordered preferences instead of picking one winner.
        {usesRcv === true && (
          <>
            &nbsp; This race is decided exactly this way.&nbsp; Your real ballot will ask for the
            same ordered preferences you just made.
          </>
        )}
        {usesRcv === false && (
          <>
            &nbsp; This race is decided with a single choice instead.&nbsp; On a traditional
            ballot, only your top pick would count.
          </>
        )}
      </p>
    </section>
  );
};
```

- [x] **Step 4: Add CSS to `src/index.css`** (Staged Reveal section):

```css
.reveal-threshold {
  background-color: var(--color-ev-black, #1c1c1c);
  border-radius: 0.75rem;
  padding: 3rem 1.5rem;
  display: flex;
  justify-content: center;
  text-align: center;
}

.reveal-threshold-count {
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
  margin: 0 0 0.625rem;
}

.reveal-threshold-headline {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  color: #ffffff;
  margin: 0 0 1.5rem;
  letter-spacing: -0.01em;
}

/* ev-yellow accent — approved placement #5 (decorative; the text carries) */
.reveal-threshold-who {
  box-shadow: inset 0 -3px 0 var(--color-ev-yellow, #fed12e);
  padding-bottom: 2px;
}

.reveal-threshold-button {
  font-size: 0.9375rem;
  min-height: 3rem;
}

.rcv-panel {
  border: 1px solid var(--border-subtle);
  border-radius: 0.625rem;
  background-color: var(--surface-card);
  padding: 1rem 1.125rem;
}

.rcv-panel-heading {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 0.9375rem;
  color: var(--text-heading);
  margin: 0 0 0.375rem;
}

.rcv-panel-body {
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin: 0;
}

/* ev-yellow accent — approved placement #6 */
.insight-strip {
  border-top: 3px solid var(--color-ev-yellow, #fed12e);
  background-color: var(--surface-card);
  border-radius: 0 0 0.625rem 0.625rem;
  border-left: 1px solid var(--border-subtle);
  border-right: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.875rem 1.125rem;
  font-family: 'Manrope', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-ink);
}
```

NOTE: check whether `--color-ev-yellow` / `--color-ev-black` variables exist in index.css; if not, use the literals `#fed12e` / `#1c1c1c` directly (the `var(--x, fallback)` form above is safe either way).

- [x] **Step 5:** Run the test file (5 passed), full suite (expect 76), build, lint. Commit:

```bash
git add src/components/ThresholdInterstitial.tsx src/components/RcvEducationPanel.tsx src/components/__tests__/RevealExtras.test.tsx src/index.css
git commit -m "feat: threshold interstitial and RCV education panel"
```

---

### Task 5: ResultsPhase orchestration

**Files:**
- Modify: `src/components/ResultsPhase.tsx`, `src/components/__tests__/ResultsPhase.test.tsx`

The flow: loading → (empty ballot → existing empty state, no threshold) → `threshold` → `board`; when all quotes are revealed, the summary content (insight strip, RCV panel, candidate ballot, actions) appears below the board. The existing `BallotCard` list is kept verbatim as the summary. The existing header (explainer trigger) renders in the `board` stage so the explainer stays reachable.

- [x] **Step 1: Extend the tests.** In `src/components/__tests__/ResultsPhase.test.tsx`, KEEP the existing BallotCard test and explainer test unchanged (with `currentRaceId: null` the ballot is empty, the threshold is skipped, and the header + empty state render — verify this still holds after the rewrite). ADD a flow test seeding the store and exercising threshold → board → summary:

```tsx
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const flowPayload: RacePayload = {
  raceId: 'mock-in-gov-2024',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'cannabis-legalization',
      title: 'Cannabis Legalization',
      question: 'Q?',
      quotes: [
        { id: 'braun-cannabis-test', text: 'Quote A.', candidateToken: 'tok-9d4b', topicKey: 'cannabis-legalization' },
      ],
    },
  ],
};

describe('ResultsPhase staged flow', () => {
  it('walks threshold, board, and summary', async () => {
    window.localStorage?.clear();
    useReadRankStore.getState().reset();
    useReadRankStore.getState().selectRace(flowPayload);
    const q = flowPayload.topics[0].quotes[0];
    useReadRankStore.getState().agree(q);
    useReadRankStore.getState().finishRace();

    render(<ResultsPhase />);

    // Threshold (after loading resolves)
    const continueBtn = await screen.findByRole('button', { name: /see who you agreed with/i }, { timeout: 3000 });
    expect(screen.getByText(/you ranked 1 quote across 1 topic/i)).toBeInTheDocument();

    // Board — anonymous until revealed
    await userEvent.click(continueBtn);
    expect(await screen.findByRole('button', { name: /reveal all/i })).toBeInTheDocument();
    expect(screen.getByText('Quote A.')).toBeInTheDocument();

    // Reveal → summary appears
    await userEvent.click(screen.getByRole('button', { name: /reveal all/i }));
    expect(await screen.findByText(/mirrors ranked choice voting/i)).toBeInTheDocument();
    expect(screen.getByText(/your top pick came from/i)).toBeInTheDocument();
  });
});
```

IMPORTANT test-design notes:
- The seeded quote id (`braun-cannabis-test`) will NOT match mock data, so `buildMockReveal` (the fetch fallback) returns an EMPTY ballot for it — that breaks the flow test. Instead, use a REAL mock quote id and token so the mock reveal resolves identities: use `id: 'q-103'`, `candidateToken: 'tok-9d4b'` (Mike Braun's cannabis quote — check `src/data/mockData.ts` for the current opaque ids after the de-identification pass and use the real values; the raceId must be `mock-in-gov-2024` so the store's verdicts flow into `buildMockReveal`).
- `getRaceVerdicts` must produce a supported verdict for the agreed quote — read the store's `getRaceVerdicts` implementation first to confirm what it derives verdicts from, and adapt the seeding minimally (e.g. evaluation completion requirements) so one supported verdict reaches the reveal. If this proves deeper than expected, STOP and report rather than redesigning the store.

- [x] **Step 2:** Run — flow test FAILS (no threshold exists).

- [x] **Step 3: Rewrite `src/components/ResultsPhase.tsx` orchestration.** Keep: `MegaParticles`, `BallotCard` (exported), the loading state, the empty state, the header block (title + subtitle + explainer trigger), and the "Play another race" button. Add imports:

```tsx
import { RevealBoard } from './RevealBoard';
import { ThresholdInterstitial } from './ThresholdInterstitial';
import { RcvEducationPanel } from './RcvEducationPanel';
import { buildInsightSentence, buildQuoteIdentityMap } from '../utils/revealInsight';
```

Inside `ResultsPhase`, add stage state and derived data:

```tsx
  const [stage, setStage] = useState<'threshold' | 'board'>('threshold');
  const [allRevealed, setAllRevealed] = useState(false);

  const agreed = race?.agreed ?? [];
  const topicCount = race ? race.topicOrder.length : 0;
  const identities = useMemo(() => (reveal ? buildQuoteIdentityMap(reveal) : new Map()), [reveal]);
  const insight = useMemo(() => buildInsightSentence(agreed, identities), [agreed, identities]);
```

(Add `useMemo` to the React import.)

Render logic after the loading guard:

```tsx
  const ballot = reveal?.ballot ?? [];

  if (ballot.length === 0) {
    return ( /* existing empty-state JSX, with the existing header above it — unchanged */ );
  }

  if (stage === 'threshold') {
    return (
      <div className="pb-12 max-w-2xl mx-auto">
        <ThresholdInterstitial
          rankedCount={agreed.length}
          topicCount={topicCount}
          onContinue={() => setStage('board')}
        />
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* existing header motion.div (title, subtitle, SourceInfoButton) — unchanged */}

      <div className="max-w-2xl mx-auto space-y-3">
        <RevealBoard
          agreed={agreed}
          identities={identities}
          onAllRevealed={() => setAllRevealed(true)}
        />

        {allRevealed && (
          <>
            {insight && <div className="insight-strip">{insight}</div>}
            <RcvEducationPanel usesRcv={reveal?.usesRcv} />
            <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', margin: '1.25rem 0 0.25rem' }}>
              How the candidates stack up
            </h3>
            {ballot.map((entry, i) => (
              <BallotCard key={entry.candidateId} entry={entry} index={i} verdictMap={verdictMap}
                address={locationFilter?.address} prefersReducedMotion={prefersReducedMotion} />
            ))}
          </>
        )}
      </div>

      {allRevealed && ( /* existing "Play another race" motion.div — unchanged */ )}
    </div>
  );
```

Adapt structure minimally to the actual file (the header/empty-state/CTA JSX already exist — reuse them; the goal is orchestration, not a rewrite of the pieces). The header should render in the `board` stage but NOT in the threshold stage (the threshold is its own beat). Edge case: a race with agreed quotes but `ballot.length > 0` while some agreed ids are missing from the identity map — `RevealBoard` already filters to `identities.has(q.id)`.

- [x] **Step 4:** Run the ResultsPhase test file — ALL tests pass (2 existing + 1 flow). Full suite (expect 77), build, lint.

- [x] **Step 5: Commit**

```bash
git add src/components/ResultsPhase.tsx src/components/__tests__/ResultsPhase.test.tsx
git commit -m "feat: staged reveal orchestration - threshold, unmasking board, insight, summary"
```

---

### Task 6: Final verification

- [x] **Step 1:** `npm test` (77), `npm run lint` (baseline 12), `npm run build` (exit 0).

- [x] **Step 2: Browser walkthrough** (mobile 375px + desktop, light + dark):

1. Complete the mock race → threshold appears: dark panel, count line, "Now see **who** you agreed with" with the yellow underline under "who", single button. No auto-advance.
2. Continue → board: the ranking exactly as the rail showed it (tier frames, order), all anonymous; devtools body text contains no candidate names.
3. Reveal one card: flip plays (or instant under emulated reduced motion), name + office + photo + SourceLine + View candidate; live region announces "1st choice revealed: …".
4. Reveal all → insight strip (yellow top rule) with a correct sentence for the session's picks; RCV panel shows the single-choice contrast copy (mock is `usesRcv: false`); "How the candidates stack up" ballot below; Play another race at the bottom.
5. Explainer (ⓘ) reachable from the board header; per-quote sources only appear on revealed cards.
6. Empty path: a race finished with zero agreements still shows the existing empty state with no threshold.

- [x] **Step 3:** Fix findings inline (small commits), then hand off via superpowers:finishing-a-development-branch.

---

## Execution Notes (recorded during implementation)

- Plan's quote-mark JSX would have failed its own tests (RTL text-node matching); quote text is span-wrapped with aria-hidden glyph siblings.
- Blindness tests upgraded from textContent to innerHTML (guards attribute leaks: href/src/title).
- Focus management added beyond plan: revealed card root takes focus (tabIndex -1, prev-value ref so already-revealed mounts don't steal), preventing focus loss when the Reveal button unmounts. Reveal-all focuses the last card — acceptable, revisit if SR feedback says otherwise.
- RevealBoard completes vacuously on an empty visible list (prevents a summary soft-lock under hostile payloads).
- perspective: 1200px on the board list gives the flip real depth; the plan's preserve-3d was dead and removed.
- Insight memo keyed on the store's actual array reference (agreedList) — correct recompute semantics, no lint suppression.
- Final test count 80 (plan's 77 estimate predated review-rider tests).
- Browser-verified: threshold (yellow underline debut), anonymous board, per-card + reveal-all unmasking, insight correctness, RCV contrast copy, demoted ballot summary.
