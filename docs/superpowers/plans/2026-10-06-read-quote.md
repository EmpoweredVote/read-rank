# "Read a quote" Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the evaluation screen's triage column — question, progress, quote card, verdict buttons, shortcut hint — to Aditi's prototype without changing behaviour.

**Architecture:** `ActionButtons` gets icons, new styles and an in-card variant. A new pure `QuoteProgress` component replaces the inline progress bar. `QuoteCard` gains a blind line and a `children` slot; on mouse devices `EvaluationSurface` renders the verdict buttons inside the card and a shortcut hint under it. Question/eyebrow are CSS-only changes.

**Tech Stack:** React 19, framer-motion, Tailwind v4 + semantic CSS tokens in `src/index.css`, Vitest + Testing Library + user-event.

**Spec:** `docs/superpowers/specs/2026-10-06-read-quote-design.md`. Worktree `/Users/chrisandrews/Documents/GitHub/read-rank-issues`, branch `feat/read-redesign` (spec commit `6a756df`).

## Global Constraints

- Colours only through tokens (`var(--…)`); no hex literals added; no Tailwind `dark:` classes.
- Copy, verbatim: "Disagree" (with ⊘ icon), "Agree" (with ✓ icon), "Quote {n} of {total}", "Speaker and source are shown when you see your ballot", "Shortcut:", "disagree ·", "agree".
- Accessible names unchanged: "Disagree with this quote", "Agree with this quote".
- Blind invariant: nothing on the card may show source, party, name or `candidateToken`.
- Behaviour unchanged: keyboard (←/→, A/D), swipe + peek labels, flight animation, coach marks, reveal CTA, verdict logic, analytics.
- Blind line and ⓘ only when `showTrustFooter` (hidden in the pizza warm-up).
- Respect reduced motion via `useMotion()` / existing patterns.
- Work only in the worktree above; commit with explicit pathspecs; messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Change |
|---|---|
| `src/components/ActionButtons.tsx` | Icons; `inCard` prop |
| `src/components/QuoteProgress.tsx` | **New** — label + segmented progress |
| `src/components/QuoteCard.tsx` | Blind line; `children` slot |
| `src/components/EvaluationSurface.tsx` | Use `QuoteProgress`; buttons inside card on mouse devices; shortcut hint |
| `src/index.css` | `.action-button*`, `.question-banner*`, `.issue-eyebrow*`, `.ev-quote-card*`; new `.rr-qprogress*`, `.rr-blind-line`, `.rr-shortcut-hint`, `.action-buttons-incard` |
| Tests | new `ActionButtons.test.tsx`, `QuoteProgress.test.tsx`, `EvaluationSurface.layout.test.tsx` |

---

### Task 1: Verdict buttons — icons, styles, in-card variant

**Files:** Modify `src/components/ActionButtons.tsx`, `src/index.css` (the `Action Buttons` block, `.action-buttons-container` … `.action-button-agree.keyboard-active`); Create `src/components/__tests__/ActionButtons.test.tsx`

**Interfaces:** Produces `ActionButtons` props `{ onAgree, onDisagree, disabled?, fixed?, inCard?: boolean }`. With `inCard`, the container gets class `action-buttons-incard`.

- [ ] **Step 1: Failing test** — `src/components/__tests__/ActionButtons.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionButtons } from '../ActionButtons';

describe('ActionButtons', () => {
  it('labels the verdicts Disagree and Agree with icons, keeping accessible names', () => {
    render(<ActionButtons onAgree={() => {}} onDisagree={() => {}} />);
    const disagree = screen.getByRole('button', { name: 'Disagree with this quote' });
    const agree = screen.getByRole('button', { name: 'Agree with this quote' });
    expect(disagree).toHaveTextContent('Disagree');
    expect(agree).toHaveTextContent('Agree');
    expect(disagree.querySelector('svg[data-icon="slash-circle"]')).not.toBeNull();
    expect(agree.querySelector('svg[data-icon="check"]')).not.toBeNull();
  });

  it('calls the handlers', async () => {
    const onAgree = vi.fn(); const onDisagree = vi.fn();
    render(<ActionButtons onAgree={onAgree} onDisagree={onDisagree} />);
    await userEvent.click(screen.getByRole('button', { name: 'Disagree with this quote' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agree with this quote' }));
    expect(onDisagree).toHaveBeenCalledTimes(1);
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('uses the in-card container class when inCard', () => {
    render(<ActionButtons onAgree={() => {}} onDisagree={() => {}} inCard />);
    expect(screen.getByRole('group', { name: 'Verdict' })).toHaveClass('action-buttons-incard');
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/ActionButtons.test.tsx` — expect FAIL (no icons, no `inCard`).

- [ ] **Step 3: Implement** `src/components/ActionButtons.tsx`:

```tsx
import React from 'react';
import { motion, useAnimate } from 'framer-motion';
import { useMotion, DUR, EASE } from '../motion';

interface ActionButtonsProps {
  onAgree: () => void;
  onDisagree: () => void;
  disabled?: boolean;
  /** True on mobile: renders fixed to viewport bottom, full bleed. */
  fixed?: boolean;
  /** Desktop: rendered inside the quote card (two rounded buttons with a gap). */
  inCard?: boolean;
}

const SlashCircle = () => (
  <svg data-icon="slash-circle" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
  </svg>
);
const Check = () => (
  <svg data-icon="check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onAgree, onDisagree, disabled = false, fixed = false, inCard = false }) => {
  const m = useMotion();
  const [sweepScope, animateSweep] = useAnimate();

  const handleAgree = () => {
    if (!m.reduced && sweepScope.current) {
      animateSweep(sweepScope.current, { x: ['-100%', '100%'] }, { duration: m.dur(DUR.flight) / 1000, ease: EASE.standard });
    }
    onAgree();
  };

  const containerClass = ['action-buttons-container', fixed && 'action-buttons-fixed', inCard && 'action-buttons-incard']
    .filter(Boolean).join(' ');

  return (
    <div className={containerClass} role="group" aria-label="Verdict">
      <motion.button onClick={onDisagree} disabled={disabled}
        className="action-button action-button-disagree"
        whileTap={m.tap({ scale: 0.98 })} aria-label="Disagree with this quote">
        <SlashCircle /><span>Disagree</span>
      </motion.button>
      <motion.button onClick={handleAgree} disabled={disabled}
        className="action-button action-button-agree"
        whileTap={m.tap({ scale: 0.98 })} aria-label="Agree with this quote">
        <Check /><span>Agree</span>
        <span ref={sweepScope} className="action-button-sweep" aria-hidden="true" />
      </motion.button>
    </div>
  );
};
```

- [ ] **Step 4: CSS** — in `src/index.css`, replace `.action-button`, `.action-button-disagree`, `.action-button-agree` and their `:hover`/`:active`/`.keyboard-active` rules (keep `.action-buttons-container`, `.action-buttons-fixed`, `.action-button:disabled`, `.action-button-sweep`, `.has-fixed-paddles`, and the `@media (pointer: coarse)` block) with:

```css
.action-button {
  flex: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 1rem;
  letter-spacing: 0.06em; text-transform: uppercase;
  border-radius: 0; cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-standard), filter 0.15s ease;
}
.action-button-disagree {
  background-color: var(--surface-card);
  color: var(--text-heading);
  border: 1.5px solid var(--text-heading);
}
.action-button-agree {
  background-color: var(--action-primary);
  color: var(--action-primary-ink);
  border: 1.5px solid var(--action-primary);
  position: relative; overflow: hidden;
}
.action-button-disagree:hover:not(:disabled),
.action-button-disagree:active:not(:disabled),
.action-button-disagree.keyboard-active { background-color: var(--surface-sunken); }
.action-button-agree:hover:not(:disabled),
.action-button-agree:active:not(:disabled),
.action-button-agree.keyboard-active { background-color: var(--action-primary-hover); border-color: var(--action-primary-hover); }
.action-button:focus-visible { outline: 2px solid var(--text-link); outline-offset: 2px; }

/* Desktop: inside the quote card */
.action-buttons-incard { height: auto; gap: 0.75rem; margin-top: 1.25rem; }
.action-buttons-incard .action-button { border-radius: 0.75rem; min-height: 3.25rem; }
```

- [ ] **Step 5: Run** `npx vitest run src/components/__tests__/ActionButtons.test.tsx src/components/__tests__/EvaluationPhase.test.tsx` — expect PASS.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(read): verdict buttons with ⊘/✓ icons, outlined Disagree, in-card variant

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/ActionButtons.tsx src/components/__tests__/ActionButtons.test.tsx src/index.css
```

---

### Task 2: `QuoteProgress` component

**Files:** Create `src/components/QuoteProgress.tsx`, `src/components/__tests__/QuoteProgress.test.tsx`; Modify `src/index.css` (append)

**Interfaces:** Produces `export function QuoteProgress(props: { current: number; total: number; done: boolean }): JSX.Element` — `current` is the 1-based position of the quote on screen; `done` is true when the topic is complete (no quote on screen).

- [ ] **Step 1: Failing test** — `src/components/__tests__/QuoteProgress.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuoteProgress } from '../QuoteProgress';

describe('QuoteProgress', () => {
  it('labels the current quote and exposes progress to assistive tech', () => {
    render(<QuoteProgress current={2} total={4} done={false} />);
    expect(screen.getByText('Quote 2 of 4')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Quotes in this issue' });
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
    expect(bar).toHaveAttribute('aria-valuetext', 'Quote 2 of 4');
  });

  it('renders one segment per quote with judged/current/upcoming states', () => {
    const { container } = render(<QuoteProgress current={2} total={4} done={false} />);
    const segs = container.querySelectorAll('.rr-qprogress__seg');
    expect(segs).toHaveLength(4);
    expect(segs[0]).toHaveClass('rr-qprogress__seg--done');
    expect(segs[1]).toHaveClass('rr-qprogress__seg--current');
    expect(segs[2]).not.toHaveClass('rr-qprogress__seg--done');
  });

  it('shows total of total when the topic is done', () => {
    render(<QuoteProgress current={4} total={4} done />);
    expect(screen.getByText('Quote 4 of 4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  });

  it('falls back to one continuous bar above 12 quotes', () => {
    const { container } = render(<QuoteProgress current={8} total={20} done={false} />);
    expect(container.querySelectorAll('.rr-qprogress__seg')).toHaveLength(0);
    const fill = container.querySelector('.rr-qprogress__fill') as HTMLElement;
    expect(fill.style.width).toBe('35%'); // 7 judged of 20
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/QuoteProgress.test.tsx` — expect FAIL.

- [ ] **Step 3: Implement** `src/components/QuoteProgress.tsx`:

```tsx
const MAX_SEGMENTS = 12;

interface QuoteProgressProps {
  /** 1-based position of the quote on screen (ignored when done). */
  current: number;
  total: number;
  /** Topic complete — no quote on screen. */
  done: boolean;
}

/** "Quote n of total" + a segmented bar (one segment per quote; a single bar above 12). */
export function QuoteProgress({ current, total, done }: QuoteProgressProps) {
  const shown = done ? total : Math.min(Math.max(current, 1), total);
  const judged = done ? total : shown - 1;
  const label = `Quote ${shown} of ${total}`;
  return (
    <div className="rr-qprogress">
      <span className="rr-qprogress__label">{label}</span>
      <div className="rr-qprogress__track" role="progressbar" aria-label="Quotes in this issue"
        aria-valuemin={0} aria-valuemax={total} aria-valuenow={judged} aria-valuetext={label}>
        {total > MAX_SEGMENTS ? (
          <div className="rr-qprogress__bar">
            <div className="rr-qprogress__fill" style={{ width: `${total ? (judged / total) * 100 : 0}%` }} />
          </div>
        ) : (
          Array.from({ length: total }, (_, i) => (
            <span key={i} className={`rr-qprogress__seg${i < judged ? ' rr-qprogress__seg--done' : ''}${!done && i === judged ? ' rr-qprogress__seg--current' : ''}`} />
          ))
        )}
      </div>
    </div>
  );
}
```

Append to `src/index.css`:

```css
/* Quote progress (evaluation) */
.rr-qprogress { display: flex; align-items: center; gap: 0.875rem; }
.rr-qprogress__label { font-size: 0.875rem; color: var(--text-secondary); white-space: nowrap; }
.rr-qprogress__track { flex: 1; display: flex; gap: 4px; min-width: 0; }
.rr-qprogress__seg { flex: 1; height: 6px; border-radius: 9999px; background: var(--border-subtle); }
.rr-qprogress__seg--done { background: var(--action-primary); }
.rr-qprogress__seg--current { background: color-mix(in srgb, var(--action-primary) 45%, var(--border-subtle)); }
.rr-qprogress__bar { flex: 1; height: 6px; border-radius: 9999px; background: var(--border-subtle); overflow: hidden; }
.rr-qprogress__fill { height: 100%; background: var(--action-primary); border-radius: 9999px; transition: width var(--dur-base) var(--ease-standard); }
@media (prefers-reduced-motion: reduce) { .rr-qprogress__fill { transition: none; } }
```

- [ ] **Step 4: Run** the test — expect PASS.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(read): QuoteProgress — Quote n of total with segmented bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/QuoteProgress.tsx src/components/__tests__/QuoteProgress.test.tsx src/index.css
```

---

### Task 3: Card, question and surface wiring

**Files:** Modify `src/components/QuoteCard.tsx`, `src/components/EvaluationSurface.tsx` (progress block ~lines 225–255; card render ~258–300; desktop `ActionButtons` render ~311–318; `triageContent`), `src/index.css` (`.ev-quote-card`, `.ev-quote-card::before`, `.ev-quote-text`, `.question-banner`, `.question-banner h2`, `.question-banner-hl`, `.issue-eyebrow*`); Create `src/components/__tests__/EvaluationSurface.layout.test.tsx`

**Interfaces:**
- Consumes: `ActionButtons` `inCard` (Task 1); `QuoteProgress` (Task 2).
- Produces: `QuoteCard` accepts `children?: React.ReactNode`, rendered after the quote text and blind line.

- [ ] **Step 1: Failing test** — `src/components/__tests__/EvaluationSurface.layout.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvaluationPhase } from '../EvaluationPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-layout', positionName: 'Governor',
  topics: [{ topicKey: 'housing', title: 'Housing', question: 'How to fix housing?', quotes: [
    { id: 'q1', text: 'Layout quote one.', candidateToken: 'tok-zz1', topicKey: 'housing' },
    { id: 'q2', text: 'Layout quote two.', candidateToken: 'tok-zz2', topicKey: 'housing' },
  ] }],
};

const originalMatchMedia = window.matchMedia;
function forcePointer(fine: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: fine ? query.includes('pointer: fine') : query.includes('pointer: coarse'),
    media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
  useReadRankStore.getState().completeCoachMarks();
});
afterEach(() => { window.matchMedia = originalMatchMedia; });

describe('evaluation layout', () => {
  it('shows "Quote 1 of 2" with a progressbar', async () => {
    render(<EvaluationPhase />);
    expect(await screen.findByText('Quote 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Quotes in this issue' })).toHaveAttribute('aria-valuetext', 'Quote 1 of 2');
  });

  it('shows the blind line on the card and no candidate data', async () => {
    render(<EvaluationPhase />);
    const line = await screen.findByText('Speaker and source are shown when you see your ballot');
    const card = line.closest('.ev-quote-card') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.textContent).not.toContain('tok-zz'); // tokens never rendered
  });

  it('desktop: verdict buttons sit inside the card and the shortcut hint shows', async () => {
    forcePointer(true);
    render(<EvaluationPhase />);
    const agree = await screen.findByRole('button', { name: 'Agree with this quote' });
    expect(agree.closest('.ev-quote-card')).not.toBeNull();
    expect(screen.getByText('Shortcut:')).toBeInTheDocument();
  });

  it('touch: buttons stay outside the card and there is no shortcut hint', async () => {
    forcePointer(false);
    render(<EvaluationPhase />);
    const agree = await screen.findByRole('button', { name: 'Agree with this quote' });
    expect(agree.closest('.ev-quote-card')).toBeNull();
    expect(screen.queryByText('Shortcut:')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/EvaluationSurface.layout.test.tsx` — expect FAIL.

- [ ] **Step 3: `QuoteCard.tsx`** — add `children?: React.ReactNode` to `QuoteCardProps`, destructure it, and after the `ev-quote-text` div add:

```tsx
        {showTrustFooter && (
          <p className="rr-blind-line">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M1 1l22 22" />
            </svg>
            Speaker and source are shown when you see your ballot
          </p>
        )}
        {children}
```

Also change the quote text style to `fontSize: 'clamp(1.125rem, 2.4vw, 1.375rem)'` and remove `paddingLeft`.

- [ ] **Step 4: `EvaluationSurface.tsx`:**
  1. `import { QuoteProgress } from './QuoteProgress';`
  2. Replace the whole progress `<div …>` block (the one with the "Fill sweep" and the two clipped label spans) with:
     ```tsx
     <QuoteProgress current={progress.current} total={progress.total} done={!currentQuote} />
     ```
     and delete the now-unused `shownCount` / `progressPercent` constants.
  3. In both `QuoteCard` renders (mouse and touch branches), pass children only on mouse devices:
     ```tsx
     <QuoteCard ref={quoteCardRef} key={currentQuote.id} quote={currentQuote} showTrustFooter={showTrustFooter}>
       {isMouseDevice && (
         <div data-no-drag onPointerDownCapture={(e) => e.stopPropagation()}>
           <ActionButtons onAgree={() => handleButtonSwipe('agree')} onDisagree={() => handleButtonSwipe('disagree')}
             disabled={isAnimating} inCard />
         </div>
       )}
     </QuoteCard>
     ```
     (The touch branch renders `QuoteCard` with no children — keep it self-closing there.)
  4. Replace the desktop `{currentQuote && isMouseDevice && (<ActionButtons … fixed={false} />)}` block under the card with the shortcut hint:
     ```tsx
     {currentQuote && isMouseDevice && (
       <p className="rr-shortcut-hint">
         Shortcut: <kbd>←</kbd> disagree · <kbd>→</kbd> agree
       </p>
     )}
     ```
     Keep the text nodes so `getByText('Shortcut:')` finds the leading "Shortcut:" — wrap it as `<span>Shortcut:</span>` if the test cannot match the mixed node.
  5. The mobile `.mobile-verdict-stack` `ActionButtons` render is unchanged.

- [ ] **Step 5: CSS** — in `src/index.css`:

  Card:
  ```css
  .ev-quote-card { border-radius: 1rem; padding: 2rem 2rem 1.5rem; }
  .ev-quote-card::before {
    content: '\201C' / '';
    display: block; position: static;
    font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 3.5rem; line-height: 0.6;
    height: 1.75rem; margin-bottom: 0.25rem;
    color: var(--color-ev-yellow); pointer-events: none;
  }
  .ev-quote-text { line-height: 1.5; }
  .rr-blind-line {
    display: flex; align-items: center; gap: 0.5rem; margin: 1rem 0 0;
    font-size: 0.8125rem; color: var(--text-tertiary);
  }
  .rr-shortcut-hint {
    margin: 0.75rem 0 0; text-align: center; font-size: 0.8125rem; color: var(--text-tertiary);
  }
  .rr-shortcut-hint kbd {
    display: inline-block; font-family: inherit; font-size: 0.75rem; line-height: 1.4;
    padding: 0 0.375rem; border: 1px solid var(--border-medium); border-radius: 4px;
    background: var(--surface-card); color: var(--text-secondary);
  }
  ```
  (Edit the existing `.ev-quote-card`, `.ev-quote-card::before` and `.ev-quote-text` rules in place: change only the listed properties; remove `position: absolute; top; left; opacity` from `::before`.)

  Question (replace `.question-banner` and `.question-banner h2`; keep `.question-banner-hl` and its `.dark` override but change the light highlight to a marker band):
  ```css
  .question-banner { margin: 0.25rem 0 1rem; }
  .question-banner h2 {
    margin: 0; font-family: 'Manrope', sans-serif; font-weight: 800;
    font-size: clamp(1.625rem, 3.2vw, 2.25rem); line-height: 1.2;
    text-align: left; text-wrap: balance; color: var(--text-heading);
  }
  .question-banner-hl {
    background: linear-gradient(transparent 55%, color-mix(in srgb, var(--color-ev-yellow) 70%, transparent) 55%);
    color: var(--text-heading);
    padding: 0 0.1em; border-radius: 0;
    -webkit-box-decoration-break: clone; box-decoration-break: clone;
  }
  ```
  Keep the existing `.dark .question-banner-hl` rule unchanged (yellow text on the dark page, no band).

  Eyebrow: in the `.issue-eyebrow*` rules set the kicker colour to `var(--text-tertiary)`, the topic colour to `var(--text-link)`, font-size `0.75rem`, weight 700, `letter-spacing: 0.1em`, uppercase, and `justify-content: flex-start` / `text-align: left` on `.issue-eyebrow`. Do not change its button behaviour.

- [ ] **Step 6: Run** `npx vitest run src/components/__tests__/EvaluationSurface.layout.test.tsx src/components/__tests__/EvaluationPhase.test.tsx src/components/__tests__/PracticeRound.parity.test.tsx src/components/__tests__/QuoteCard.test.tsx src/components/__tests__/QuestionBanner.test.tsx`, then `npm test`, `npx tsc -b`, `npm run build`, `npx eslint src/components/EvaluationSurface.tsx src/components/QuoteCard.tsx src/components/ActionButtons.tsx src/components/QuoteProgress.tsx`. Update any existing test that asserted the old "N of M" progress text or old button text ("AGREE"/"DISAGREE") to the new copy, and say so in the commit body.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(read): prototype question, quote card with blind line, in-card verdicts, shortcut hint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/QuoteCard.tsx src/components/EvaluationSurface.tsx src/index.css src/components/__tests__/EvaluationSurface.layout.test.tsx
```
(add any updated existing test files to the pathspec)

---

### Task 4: Browser check, then PR

- [ ] Build a dev bundle of the worktree (`NODE_ENV=development npx vite build --mode development --outDir <scratch>`) and serve it to Playwright through request interception (abort `/api` with `connectionrefused` so the mock race loads; block only `https://*.posthog.com`). Do not start a dev server in the main `read-rank` checkout.
- [ ] Check at 1280, 1024 and 390 px, light and dark: question, progress, card with blind line, in-card buttons + hint (desktop), bottom stack (phone), the pizza warm-up (no blind line, no ⓘ), and an agree flight on desktop.
- [ ] Push `feat/read-redesign`; open a PR to `main` with the summary, screenshots described, spec/plan links; end with the Claude Code attribution line.
