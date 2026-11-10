# Full Ballot Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the results screen to Aditi's prototype — real-state loader, larger reveal band, horizontal-header alignment table with a ⊘ disagreed mark, first-place card emphasis and an agreement bar — keeping photos, the Essentials link, the sourced quote drawer and the partial reveal.

**Architecture:** A new presentational `BallotLoader` replaces the spinner, driven by a two-step loading state in `ResultsPhase` (matching while the reveal request is pending, revealing for 400 ms after success). `AlignmentMark` swaps the disagreed glyph; CSS restyles the grid, band and pills onto tokens. `CandidateBallotCard` gains a first-place modifier and a small `AgreementBar`.

**Tech Stack:** React 19, framer-motion, Tailwind v4 + semantic CSS tokens in `src/index.css`, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-07-full-ballot-design.md`. Worktree `/Users/chrisandrews/Documents/GitHub/read-rank-issues`, branch `feat/ballot-redesign` (spec commit `aaf6d4b`).

## Global Constraints

- Keep: `PoliticianIdentityCard` (photo, Essentials link), `QuoteDrawer`/`QuoteBlock` (sources), per-card partial reveal, Compass cross-link, bottom buttons, sr-only reveal announcement, empty and error states, analytics.
- Disagreed mark = slash-circle ⊘ (`<circle cx=12 cy=12 r=9/>` + `<path d="M5.6 5.6l12.8 12.8"/>`) on a neutral disc; no coral.
- Copy, verbatim: "Tallying your ballot" · "Matching your rankings to candidates…" · "Revealing names…".
- Loader timing: matching while pending; revealing 400 ms after success; failure → error state directly. No other artificial delay.
- Colours only through tokens; no hex literals in components; no Tailwind `dark:` classes.
- Respect reduced motion (`useMotion()` / `useReducedMotion`).
- Work only in the worktree; commit with explicit pathspecs; messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Change |
|---|---|
| `src/components/BallotLoader.tsx` | **New** |
| `src/components/ResultsPhase.tsx` | loading state machine; use `BallotLoader` |
| `src/components/AlignmentMark.tsx` | ⊘ disagreed glyph |
| `src/components/AlignmentGrid.tsx` | header `title` attribute |
| `src/components/CandidateBallotCard.tsx` | first-place modifier; `AgreementBar` |
| `src/index.css` | `.ballot-loader*`, `.reveal-band*`, `.alignment-grid*`, `.mark-disagreed*`, `.pill-dis`, `.ballot-outer--first`, `.agree-bar*`, `--on-dark-*` tokens |
| Tests | new `BallotLoader.test.tsx`, `ResultsPhase.loader.test.tsx`; update `AlignmentMark.test.tsx`, `CandidateBallotCard.test.tsx`, `noHardcodedChrome.test.ts`, `ResultsPhase.test.tsx` comment |

---

### Task 1: Loader

**Files:** Create `src/components/BallotLoader.tsx`, `src/components/__tests__/BallotLoader.test.tsx`, `src/components/__tests__/ResultsPhase.loader.test.tsx`; Modify `src/components/ResultsPhase.tsx` (state + effect ~lines 19-40, the `if (loading)` block ~lines 100-110), `src/index.css` (append)

**Interfaces:** Produces `export function BallotLoader({ step }: { step: 'matching' | 'revealing' }): JSX.Element`.

- [ ] **Step 1: Failing tests.**

`src/components/__tests__/BallotLoader.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BallotLoader } from '../BallotLoader';

describe('BallotLoader', () => {
  it('shows the matching step in a polite status region', () => {
    render(<BallotLoader step="matching" />);
    expect(screen.getByText('Tallying your ballot')).toBeInTheDocument();
    expect(screen.getByText('Matching your rankings to candidates…')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
  it('shows the revealing step', () => {
    render(<BallotLoader step="revealing" />);
    expect(screen.getByText('Revealing names…')).toBeInTheDocument();
  });
});
```

`src/components/__tests__/ResultsPhase.loader.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

let resolveReveal: (v: unknown) => void = () => {};
let rejectReveal: (e: unknown) => void = () => {};
vi.mock('../../data/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../data/api')>();
  return {
    ...mod,
    fetchRaceReveal: vi.fn(() => new Promise((res, rej) => { resolveReveal = res; rejectReveal = rej; })),
  };
});
import { ResultsPhase } from '../ResultsPhase';

const payload: RacePayload = {
  raceId: 'race-loader', positionName: 'Governor',
  topics: [{ topicKey: 'k', title: 'Housing', question: 'Q', quotes: [
    { id: 'q1', text: 'one', candidateToken: 'tA', topicKey: 'k' },
    { id: 'q2', text: 'two', candidateToken: 'tB', topicKey: 'k' },
  ] }],
};
const reveal = {
  raceId: 'race-loader', positionName: 'Governor',
  ballot: [{
    rank: 1, candidateId: 'c1', name: 'Ana Rivera', office: 'Gov', title: 'Candidate', chamber: '', district: '',
    photo: '', essentialsUrl: '',
    evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
    perTopic: [{ topicKey: 'k', title: 'Housing', userTopWinner: true, quotes: [{ quoteId: 'q1', text: 'one', supported: true, rank: 1 }] }],
  }],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
  useReadRankStore.getState().agree(payload.topics[0].quotes[0]);
  useReadRankStore.getState().disagree(payload.topics[0].quotes[1]);
  useReadRankStore.getState().revealBallot();
});

describe('ResultsPhase loader', () => {
  it('matching while pending, revealing for 400 ms after success, then the ballot', async () => {
    vi.useFakeTimers();
    try {
      render(<ResultsPhase />);
      expect(screen.getByText('Matching your rankings to candidates…')).toBeInTheDocument();
      await act(async () => { resolveReveal(reveal); });
      expect(screen.getByText('Revealing names…')).toBeInTheDocument();
      expect(screen.queryByText(/Now see/i)).not.toBeInTheDocument();
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(screen.getByText(/Now see/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('goes straight to the error state on failure (no revealing step)', async () => {
    render(<ResultsPhase />);
    await act(async () => { rejectReveal(new Error('down')); });
    expect(screen.queryByText('Revealing names…')).not.toBeInTheDocument();
    expect(screen.getByText(/We couldn.t build your ballot/i)).toBeInTheDocument();
  });
});
```

If the `RevealResult` / `BallotEntry` type in `src/data/api.ts` needs fields not listed in `reveal` above, add them with neutral values (keep it a valid object; cast with `as never` only if a field is irrelevant to rendering).

- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/BallotLoader.test.tsx src/components/__tests__/ResultsPhase.loader.test.tsx` — expect FAIL.

- [ ] **Step 3: `BallotLoader.tsx`:**

```tsx
interface BallotLoaderProps {
  step: 'matching' | 'revealing';
}

const STEP_TEXT: Record<BallotLoaderProps['step'], string> = {
  matching: 'Matching your rankings to candidates…',
  revealing: 'Revealing names…',
};

/** Loading beat before the reveal (prototype screen 07). Driven by real state, not a script. */
export function BallotLoader({ step }: BallotLoaderProps) {
  return (
    <div className="ballot-loader" role="status" aria-live="polite">
      <div className="ballot-loader__cards" aria-hidden="true">
        <span className="ballot-loader__card ballot-loader__card--back" />
        <span className="ballot-loader__card ballot-loader__card--front">
          <span className="ballot-loader__line ballot-loader__line--accent" />
          <span className="ballot-loader__line" />
        </span>
      </div>
      <p className="ballot-loader__title">Tallying your ballot</p>
      <p className="ballot-loader__step">{STEP_TEXT[step]}</p>
      <div className="ballot-loader__track" aria-hidden="true">
        <div className={`ballot-loader__fill ballot-loader__fill--${step}`} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `ResultsPhase.tsx`:**
  1. `import { BallotLoader } from './BallotLoader';`
  2. Replace `const [loading, setLoading] = useState(true);` with
     `const [loadStep, setLoadStep] = useState<'matching' | 'revealing' | null>('matching');`
  3. Replace the fetch effect body with:
     ```tsx
     useEffect(() => {
       if (!currentRaceId) { setLoadStep(null); return; }
       let cancelled = false;
       let timer: ReturnType<typeof setTimeout> | undefined;
       setLoadStep('matching');
       setFailed(false);
       fetchRaceReveal(currentRaceId, getRaceVerdicts(currentRaceId))
         .then((result) => {
           if (cancelled) return;
           setReveal(result);
           setLoadStep('revealing');
           timer = setTimeout(() => { if (!cancelled) setLoadStep(null); }, 400);
         })
         .catch(() => { if (!cancelled) { setFailed(true); setLoadStep(null); } });
       return () => { cancelled = true; if (timer) clearTimeout(timer); };
     }, [currentRaceId, attempt]); // eslint-disable-line react-hooks/exhaustive-deps
     ```
  4. Replace the `if (loading) { return (…spinner…) }` block with:
     ```tsx
     if (loadStep) {
       return <BallotLoader step={loadStep} />;
     }
     ```
  5. In `src/components/__tests__/ResultsPhase.test.tsx`, update the comment "(600ms setTimeout in the effect)" to "(400 ms revealing step after the reveal resolves)". Other ResultsPhase tests use `findBy…` with timeouts and should keep passing; if any asserted the old spinner text "Tallying your ballot…", update it to "Tallying your ballot".

- [ ] **Step 5: CSS** — append to `src/index.css`:

```css
/* Ballot loader */
.ballot-loader { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 4rem 1rem; text-align: center; }
.ballot-loader__cards { position: relative; width: 8rem; height: 5.5rem; margin-bottom: 1rem; }
.ballot-loader__card {
  position: absolute; inset: 0; border-radius: 0.75rem; background: var(--surface-card);
  border: 1px solid var(--border-medium);
}
.ballot-loader__card--back { transform: rotate(4deg) translate(6px, -4px); }
.ballot-loader__card--front {
  border-color: var(--action-primary); box-shadow: var(--shadow-card);
  display: flex; flex-direction: column; gap: 0.5rem; padding: 1.25rem 1rem;
}
.ballot-loader__line { display: block; height: 6px; width: 55%; border-radius: 9999px; background: var(--border-subtle); }
.ballot-loader__line--accent { width: 85%; background: var(--color-ev-yellow); }
.ballot-loader__title { margin: 0; font-family: 'Manrope', sans-serif; font-size: 1.125rem; font-weight: 800; color: var(--text-heading); }
.ballot-loader__step { margin: 0; font-size: 0.875rem; color: var(--text-secondary); }
.ballot-loader__track { width: 16rem; max-width: 80%; height: 4px; border-radius: 9999px; background: var(--border-subtle); overflow: hidden; margin-top: 0.75rem; }
.ballot-loader__fill { height: 100%; border-radius: 9999px; background: var(--action-primary); }
.ballot-loader__fill--matching { width: 70%; animation: ballot-loader-fill 1.2s var(--ease-settle) both; }
.ballot-loader__fill--revealing { width: 100%; transition: width var(--dur-base) var(--ease-standard); }
@keyframes ballot-loader-fill { from { width: 0; } to { width: 70%; } }
@media (prefers-reduced-motion: reduce) {
  .ballot-loader__fill--matching { animation: none; }
  .ballot-loader__fill--revealing { transition: none; }
}
```

- [ ] **Step 6: Run** the Step 2 command, then `npx vitest run src/components/__tests__/ResultsPhase.test.tsx src/components/__tests__/ResultsPhase.reducedMotion.test.tsx src/components/__tests__/ResultsPhase.revealFailure.test.tsx src/components/__tests__/ResultsPhase.unranked.test.tsx`, `npm test`, `npx tsc -b`.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(ballot): real-state loader — matching, then revealing names

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/BallotLoader.tsx src/components/ResultsPhase.tsx src/index.css src/components/__tests__/BallotLoader.test.tsx src/components/__tests__/ResultsPhase.loader.test.tsx src/components/__tests__/ResultsPhase.test.tsx
```

---

### Task 2: Band, alignment table, ⊘ mark, pills

**Files:** Modify `src/components/AlignmentMark.tsx`, `src/components/AlignmentGrid.tsx` (header `th`), `src/index.css` (`:root`/`.dark` tokens; `.reveal-band*` ~line 2151-2156; `.alignment-grid*` ~2245-2275; `.mark-disagreed` ~2574-2575; `.pill-dis`), `src/__tests__/noHardcodedChrome.test.ts`; Test `src/components/__tests__/AlignmentMark.test.tsx`

- [ ] **Step 1: Failing tests.**

In `AlignmentMark.test.tsx`, change the disagreed case to:

```tsx
  it('renders a disagreed slash-circle (⊘) with sr-only label', () => {
    const { container } = render(<AlignmentMarkView mark={{ kind: 'disagreed' }} />);
    const svg = container.querySelector('.mark-disagreed')!;
    expect(svg).toBeInTheDocument();
    expect(svg.querySelector('path')!.getAttribute('d')).toMatch(/^M5\.6 5\.6/);
    expect(screen.getByText('Disagreed')).toHaveClass('sr-only');
  });
```

In `src/__tests__/noHardcodedChrome.test.ts`, add `'src/components/AlignmentMark.tsx'`, `'src/components/RevealBand.tsx'` and `'src/components/BallotLoader.tsx'` to `CHROME_FILES`.

Add to `src/components/__tests__/AlignmentSection.test.tsx` (or a new `AlignmentGrid.test.tsx` if that file does not render the grid) a check that each topic header has a `title` attribute equal to the topic title — render `AlignmentGrid` with `topics=[{ key:'k', title:'Cannabis Legalization', question:'Q' }]` and one row `{ candidateId:'c', name:'Ana', cells:[{ kind:'rank', rank:1 }] }` (match the `AlignmentRow` type in `src/utils/alignmentGrid.ts`), then `expect(screen.getByRole('columnheader', { name: 'Cannabis Legalization' })).toHaveAttribute('title', 'Cannabis Legalization')`.

- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/AlignmentMark.test.tsx src/__tests__/noHardcodedChrome.test.ts` plus the grid test — expect the ⊘ and title cases to FAIL.

- [ ] **Step 3: `AlignmentMark.tsx`** — replace `CircleX` with:

```tsx
const SlashCircle: React.FC<{ size: number }> = ({ size }) => (
  <svg className="mark-disagreed" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
  </svg>
);
```
and render `<SlashCircle size={size} />` in the disagreed branch (keep its wrapper class `alignment-mark mark-disagreed-wrap` and the sr-only "Disagreed").

- [ ] **Step 4: `AlignmentGrid.tsx`** — the topic header becomes
  `<th scope="col" key={t.key} className="alignment-topic-col" title={t.title}><span className="alignment-col-label">{t.title}</span></th>`.

- [ ] **Step 5: CSS** in `src/index.css`:

  Tokens: in `:root` and in `.dark` add
  ```css
  --on-dark-ink: #FFFFFF;
  --on-dark-muted: rgba(255, 255, 255, 0.72);
  ```

  Band (replace the existing four `.reveal-band*` rules' listed properties; keep backgrounds and `.reveal-band-who`):
  ```css
  .reveal-band { background-color: var(--color-ev-black, #1c1c1c); border-radius: 1rem; padding: 2.25rem 1.5rem; text-align: center; margin-bottom: 1rem; }
  .reveal-band-eyebrow { font-family: 'Manrope', sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--on-dark-muted); margin: 0 0 0.625rem; }
  .reveal-band-headline { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: clamp(1.75rem, 3.6vw, 2.5rem); line-height: 1.15; letter-spacing: -0.02em; color: var(--on-dark-ink); margin: 0; }
  ```
  (`.dark .reveal-band` stays. In dark mode the band background is `--surface-raised`, on which `--on-dark-ink` white still has high contrast.)

  Grid — replace the rotated-header rules (`.alignment-grid thead th { … height: 92px … }`, `.alignment-grid .alignment-col-label { … rotate … }`, `.alignment-grid thead th.alignment-spacer { height: 92px; }`) and the `min-width: 4rem` column rule with:
  ```css
  .alignment-grid thead th { background: var(--surface-sunken); vertical-align: middle; padding: 0.625rem 0.5rem; }
  .alignment-grid thead th.alignment-topic-col, .alignment-grid td.alignment-mark-col { min-width: 6rem; }
  .alignment-grid .alignment-col-label {
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    max-width: 9rem; margin: 0 auto;
    font-weight: 700; font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase;
    line-height: 1.3; color: var(--text-tertiary); white-space: normal; text-align: center;
  }
  .alignment-grid-corner { background: var(--surface-sunken); }
  .alignment-grid tbody th { font-size: 0.9375rem; font-weight: 600; }
  ```
  Keep the sticky candidate column, the spacer width rule, and the last-row border rule.

  Marks:
  ```css
  .mark-disagreed { color: var(--text-tertiary); }
  .mark-disagreed-wrap { background: var(--surface-sunken); border-radius: 9999px; }
  ```
  (delete the two hex rules `.mark-disagreed { color: #a8a29e; }` / `.dark .mark-disagreed { color: #8b96a5; }`.)

  Pills: set `.pill-dis` (find its rule) to `background: var(--surface-sunken); color: var(--text-secondary);` — tokens only.

- [ ] **Step 6: Run** the focused tests, `npx vitest run src/components/__tests__/AlignmentSection.test.tsx src/components/__tests__/AlignmentPills.test.tsx src/components/__tests__/RevealBand.test.tsx src/components/__tests__/ResultsPhase.test.tsx`, `npm test`, `npx tsc -b`.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(ballot): larger reveal band, horizontal table headers, ⊘ disagreed mark

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/AlignmentMark.tsx src/components/AlignmentGrid.tsx src/index.css src/__tests__/noHardcodedChrome.test.ts src/components/__tests__/AlignmentMark.test.tsx
```
(add the grid test file to the pathspec)

---

### Task 3: Candidate cards — first place and agreement bar

**Files:** Modify `src/components/CandidateBallotCard.tsx` (`.ballot-outer` div ~line 100; evidence strip ~lines 106-115), `src/index.css` (append); Test `src/components/__tests__/CandidateBallotCard.test.tsx`

**Interfaces:** Produces (in `CandidateBallotCard.tsx`, not exported) `function AgreementBar({ agreed, total }: { agreed: number; total: number })`.

- [ ] **Step 1: Failing tests** — append to `CandidateBallotCard.test.tsx` (the file's `entry` has rank 1, agreementCount 5; `rankMap` defined):

```tsx
  it('emphasises the first-place card', () => {
    render(<CandidateBallotCard entry={entry} totalTopics={6} rankMap={rankMap} />);
    expect(document.querySelector('.ballot-outer')).toHaveClass('ballot-outer--first');
  });
  it('does not emphasise other ranks', () => {
    render(<CandidateBallotCard entry={{ ...entry, rank: 2 }} totalTopics={6} rankMap={rankMap} />);
    expect(document.querySelector('.ballot-outer')).not.toHaveClass('ballot-outer--first');
  });
  it('shows a segmented agreement bar: total segments, agreed filled', () => {
    render(<CandidateBallotCard entry={entry} totalTopics={6} rankMap={rankMap} />);
    const segs = document.querySelectorAll('.agree-bar__seg');
    expect(segs).toHaveLength(6);
    expect(document.querySelectorAll('.agree-bar__seg--on')).toHaveLength(5);
  });
  it('uses a continuous bar above 8 topics', () => {
    render(<CandidateBallotCard entry={entry} totalTopics={10} rankMap={rankMap} />);
    expect(document.querySelectorAll('.agree-bar__seg')).toHaveLength(0);
    expect((document.querySelector('.agree-bar__fill') as HTMLElement).style.width).toBe('50%');
  });
  it('shows no agreement bar for an unranked entry', () => {
    render(<CandidateBallotCard entry={{ ...entry, rank: null }} totalTopics={6} rankMap={rankMap} />);
    expect(document.querySelector('.agree-bar')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/CandidateBallotCard.test.tsx` — expect FAIL.

- [ ] **Step 3: Implement** in `CandidateBallotCard.tsx`:

```tsx
const MAX_SEGMENTS = 8;

/** Small "agreed N of M" meter for the evidence strip (decorative; the text carries the numbers). */
function AgreementBar({ agreed, total }: { agreed: number; total: number }) {
  if (total <= 0) return null;
  const n = Math.max(0, Math.min(agreed, total));
  return (
    <span className="agree-bar" aria-hidden="true">
      {total > MAX_SEGMENTS ? (
        <span className="agree-bar__track"><span className="agree-bar__fill" style={{ width: `${(n / total) * 100}%` }} /></span>
      ) : (
        Array.from({ length: total }, (_, i) => (
          <span key={i} className={`agree-bar__seg${i < n ? ' agree-bar__seg--on' : ''}`} />
        ))
      )}
    </span>
  );
}
```

  - `.ballot-outer` div: `className={`ballot-outer${rank === 1 ? ' ballot-outer--first' : ''}`}`.
  - In the evidence `<p>`, inside the `rank != null` branch, render `<AgreementBar agreed={agreementCount} total={totalTopics} />` immediately before "Agreed with". (`agreementCount` is the variable the strip already uses; if it is named differently, use `entry.evidence.agreementCount`.)

- [ ] **Step 4: CSS** — append:

```css
.ballot-outer.ballot-outer--first { border: 1.5px solid var(--action-primary); }
.agree-bar { display: inline-flex; align-items: center; gap: 2px; margin-right: 0.5rem; vertical-align: middle; }
.agree-bar__seg { width: 14px; height: 4px; border-radius: 9999px; background: var(--border-subtle); }
.agree-bar__seg--on { background: var(--action-primary); }
.agree-bar__track { width: 4.5rem; height: 4px; border-radius: 9999px; background: var(--border-subtle); overflow: hidden; display: inline-block; }
.agree-bar__fill { display: block; height: 100%; border-radius: 9999px; background: var(--action-primary); }
```

- [ ] **Step 5: Run** the test file, `npx vitest run src/components/__tests__/CandidateBallotCard.unranked.test.tsx src/components/__tests__/ResultsPhase.test.tsx`, `npm test`, `npx tsc -b`, `npm run build`, `npx eslint src/components/CandidateBallotCard.tsx src/components/ResultsPhase.tsx src/components/BallotLoader.tsx src/components/AlignmentMark.tsx src/components/AlignmentGrid.tsx`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(ballot): first-place card emphasis and agreement bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/CandidateBallotCard.tsx src/index.css src/components/__tests__/CandidateBallotCard.test.tsx
```

---

### Task 4: Browser check, then PR

- [ ] Build a dev bundle of the worktree (`NODE_ENV=development npx vite build --mode development --outDir <scratch>`) and serve it to Playwright via request interception (abort `/api` with `connectionrefused`; block only `https://*.posthog.com`). For the phone check, use a touch context with a `matchMedia` override (`pointer: fine` false, `pointer: coarse` true) and drive it with `tap()` only.
- [ ] Desktop 1280/1024 and phone 390, light and dark: loader, band, table with horizontal headers and ⊘, pills on phone, first-place card with the bar, drawer still showing sources.
- [ ] Push `feat/ballot-redesign`; open a PR to `main` (the repo allows squash merges only) with summary, spec/plan links and the Claude Code attribution line.
