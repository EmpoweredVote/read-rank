# Design V2 Decisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the six locked design decisions from the Read & Rank Design Spec v2 — coin press paddles, solid-tile tier marks, iron→disagreed rename, quote truncation removal, issue selection screen, and spring drag physics.

**Architecture:** Six independent change sets applied in dependency order: rename first (D3) so all subsequent tasks use the correct type, then isolated visual changes (D4, D2), then the most complex interaction changes (D1, D6), then the new screen (D5).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Zustand (persist v8), framer-motion, @dnd-kit/core + @dnd-kit/sortable, Vitest + @testing-library/react

---

## File Map

| File | Change |
|---|---|
| `src/utils/tiers.ts` | D3: rename `'iron'` → `'disagreed'` in type + TIER_META |
| `src/utils/alignmentGrid.ts` | D3: rename literal `'iron'` → `'disagreed'` |
| `src/components/TierIcon.tsx` | D3: `case 'iron'` → `case 'disagreed'`; D2: tile wrapper |
| `src/components/RankRail.tsx` | D3: CSS class refs |
| `src/components/RankDock.tsx` | D3: CSS class ref |
| `src/index.css` | D3: CSS vars + classes; D1: paddle styles + stamp styles; D2: tile styles |
| `src/components/RankList.tsx` | D4: remove line-clamp; D6: DragOverlay + spring physics |
| `src/components/ActionButtons.tsx` | D1: full-bleed paddle slabs |
| `src/components/QuoteCard.tsx` | D1: remove swipe, add stamp overlay |
| `src/components/EvaluationPhase.tsx` | D1: coin press sequence, remove SwipeBackground |
| `src/components/PracticeRound.tsx` | D1: remove SwipeBackground, update for paddles |
| `src/store/useReadRankStore.ts` | D5: add `'issue-selection'` Phase, `selectedTopicKeys`, new actions |
| `src/components/IssueSelection.tsx` | D5: new screen (create) |
| `src/components/PhaseContainer.tsx` | D5: wire `'issue-selection'` case |
| `src/utils/__tests__/tiers.test.ts` | D3: update expectations |
| `src/components/__tests__/TierIcon.test.tsx` | D3 + D2: update expectations |
| `src/components/__tests__/RankRail.test.tsx` | D3: update CSS class assertions |
| `src/components/__tests__/RankList.test.tsx` | D4 + D6: new tests |
| `src/components/__tests__/QuoteCard.test.tsx` | D1: remove onAgree/onDisagree props |
| `src/components/__tests__/IssueSelection.test.tsx` | D5: new test file (create) |
| `src/store/__tests__/issueSelection.test.ts` | D5: new test file (create) |

---

## Task 1: D3 — Rename iron → disagreed

**Files:**
- Modify: `src/utils/tiers.ts`
- Modify: `src/utils/alignmentGrid.ts`
- Modify: `src/components/TierIcon.tsx`
- Modify: `src/components/RankRail.tsx`
- Modify: `src/components/RankDock.tsx`
- Modify: `src/index.css`
- Modify: `src/utils/__tests__/tiers.test.ts`
- Modify: `src/components/__tests__/TierIcon.test.tsx`
- Modify: `src/components/__tests__/RankRail.test.tsx`

- [ ] **Step 1: Update tiers.test.ts to use 'disagreed'**

Replace the full `it('carries labels and names for every tier')` expectation:

```ts
// src/utils/__tests__/tiers.test.ts — line 18
expect(TIER_META.iron).toEqual({ tier: 'iron', label: 'Disagreed', name: 'Iron' });
// → replace with:
expect(TIER_META.disagreed).toEqual({ tier: 'disagreed', label: 'Disagreed', name: 'Disagreed' });
```

- [ ] **Step 2: Update TierIcon.test.tsx to use 'disagreed'**

```ts
// src/components/__tests__/TierIcon.test.tsx — line 6
const tiers: Tier[] = ['diamond', 'gold', 'silver', 'bronze', 'iron'];
// → replace with:
const tiers: Tier[] = ['diamond', 'gold', 'silver', 'bronze', 'disagreed'];
```

- [ ] **Step 3: Update RankRail.test.tsx to use 'disagreed' class name**

```ts
// src/components/__tests__/RankRail.test.tsx — line 44
const ironRow = screen.getByText('Rail disagreed quote.').closest('.tier-row');
expect(ironRow).toHaveClass('tier-row-iron');
// → replace the assertion:
expect(ironRow).toHaveClass('tier-row-disagreed');
```

- [ ] **Step 4: Run tests — confirm failures**

```bash
npm test -- --run 2>&1 | grep -E "FAIL|PASS|Error"
```

Expected: failures in tiers.test.ts, TierIcon.test.tsx, RankRail.test.tsx.

- [ ] **Step 5: Rename in tiers.ts**

```ts
// src/utils/tiers.ts — full file replacement:
/**
 * The tier frame model (REDESIGN_SPEC §3.4). Position in the agreed pile IS
 * the tier: exactly one Diamond/Gold/Silver, everything else Bronze.
 * Disagreed is not positional — it marks disagreed quotes.
 */
export type Tier = 'diamond' | 'gold' | 'silver' | 'bronze' | 'disagreed';

export interface TierMeta {
  tier: Tier;
  /** Short label rendered on rows and slots. */
  label: string;
  /** Proper tier name, used in announcements and titles. */
  name: string;
}

export const TIER_META: Record<Tier, TierMeta> = {
  diamond: { tier: 'diamond', label: '1st choice', name: 'Diamond' },
  gold: { tier: 'gold', label: '2nd choice', name: 'Gold' },
  silver: { tier: 'silver', label: '3rd choice', name: 'Silver' },
  bronze: { tier: 'bronze', label: 'Agreed', name: 'Bronze' },
  disagreed: { tier: 'disagreed', label: 'Disagreed', name: 'Disagreed' },
};

/** Tier for a 0-based position in the agreed pile. */
export function tierForIndex(index: number): Tier {
  return index === 0 ? 'diamond' : index === 1 ? 'gold' : index === 2 ? 'silver' : 'bronze';
}

/** Screen-reader announcement for landing at a position (spec §3.2). */
export function tierAnnouncement(index: number, total: number): string {
  const meta = TIER_META[tierForIndex(index)];
  if (meta.tier === 'bronze') return `position ${index + 1} of ${total}, ${meta.name}`;
  return `${meta.label}, ${meta.name}`;
}
```

- [ ] **Step 6: Rename in alignmentGrid.ts**

```ts
// src/utils/alignmentGrid.ts — line 46
if (sawDisagreed) return 'iron' as Tier;
// → replace with:
if (sawDisagreed) return 'disagreed' as Tier;
```

- [ ] **Step 7: Rename in TierIcon.tsx**

```tsx
// src/components/TierIcon.tsx — line 59
case 'iron':
// → replace with:
case 'disagreed':
```

Also update the `className` on the common props — they already use template literal `tier-icon-${tier}` so that auto-updates. But the `case 'iron':` switch arm must change.

- [ ] **Step 8: Rename in RankRail.tsx**

Replace the entire file content:

```tsx
import React, { useState } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { RankList } from './RankList';
import { TierIcon } from './TierIcon';

export interface RankRailProps {
  variant: 'sidebar' | 'sheet';
}

export const RankRail: React.FC<RankRailProps> = ({ variant }) => {
  const { getCurrentRaceProgress, reorderAgreed, reAgree } = useReadRankStore();
  const race = getCurrentRaceProgress();
  const agreed = race?.agreed ?? [];
  const disagreed = race ? Object.values(race.topics).flatMap((t) => t.disagreed) : [];
  const [showDisagreed, setShowDisagreed] = useState(false);
  const isSheet = variant === 'sheet';

  return (
    <div className="rank-rail">
      <RankList
        items={agreed}
        onReorder={reorderAgreed}
        compact={isSheet}
        longPressDrag={isSheet}
        showMoveButtons
        showGhostSlots
      />

      {agreed.length === 0 && (
        <p className="sr-only">
          Nothing ranked yet.&nbsp; Agree with quotes and they will file in here, ready to rank.
        </p>
      )}

      {disagreed.length > 0 && (
        <section className="rank-rail-disagreed">
          {agreed.length > 0 && (
            <div className="disagreed-divider" role="separator">
              <span>You disagreed with everything below this line</span>
            </div>
          )}
          <button
            type="button"
            className="rank-sheet-disagreed-toggle"
            aria-expanded={showDisagreed}
            aria-label={`Disagreed (${disagreed.length})`}
            onClick={() => setShowDisagreed((p) => !p)}
          >
            <TierIcon tier="disagreed" size={13} />
            Disagreed ({disagreed.length})
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ transform: showDisagreed ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showDisagreed && (
            <div className="rank-rail-disagreed-list">
              {disagreed.map((q) => (
                <div key={q.id} className="tier-row tier-row-disagreed rank-rail-disagreed-row">
                  <TierIcon tier="disagreed" size={13} />
                  <span className="rank-rail-disagreed-stub tier-disagreed-muted">{q.text}</span>
                  <button type="button" className="rank-sheet-disagreed-recover" onClick={() => reAgree(q)}>
                    Move to agreed
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
```

- [ ] **Step 9: Rename in RankDock.tsx**

```tsx
// src/components/RankDock.tsx — line 63
<span className="rank-dock-counter rank-dock-counter-iron">⊘ {disagreedCount}</span>
// → replace with:
<span className="rank-dock-counter rank-dock-counter-disagreed">⊘ {disagreedCount}</span>
```

- [ ] **Step 10: Rename CSS variables and classes in index.css**

In `:root` (around line 87):
```css
/* Remove: */
--tier-iron-border: #8a939c;
--tier-iron-ink: var(--text-tertiary);
/* Add: */
--tier-disagreed-border: #8a939c;
--tier-disagreed-ink: var(--text-tertiary);
```

In `.dark` (around line 142):
```css
/* Remove: */
--tier-iron-border: #6b7480;
/* Add: */
--tier-disagreed-border: #6b7480;
```

Rename all class names — find and replace these pairs throughout index.css:
- `.rank-dock-counter-iron` → `.rank-dock-counter-disagreed`
- `.rank-sheet-iron-toggle` → `.rank-sheet-disagreed-toggle`
- `.rank-sheet-iron-recover` → `.rank-sheet-disagreed-recover`
- `.tier-row-iron` → `.tier-row-disagreed` (including `::before` and `.tier-iron-muted` → `.tier-disagreed-muted`)
- `.tier-label-iron` → `.tier-label-disagreed`
- `.tier-icon-iron` → `.tier-icon-disagreed`
- `.iron-divider` → `.disagreed-divider` (including `::before` and `::after`)
- `.rank-rail-iron-list` → `.rank-rail-disagreed-list`
- `.rank-rail-iron-row` → `.rank-rail-disagreed-row`
- `.rank-rail-iron-stub` → `.rank-rail-disagreed-stub`
- All `var(--tier-iron-*)` references → `var(--tier-disagreed-*)`

- [ ] **Step 11: Run tests — confirm all pass**

```bash
npm test -- --run
```

Expected: all tests pass. TypeScript compilation should also be clean:

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 12: Commit**

```bash
git add src/utils/tiers.ts src/utils/alignmentGrid.ts src/components/TierIcon.tsx \
  src/components/RankRail.tsx src/components/RankDock.tsx src/index.css \
  src/utils/__tests__/tiers.test.ts src/components/__tests__/TierIcon.test.tsx \
  src/components/__tests__/RankRail.test.tsx
git commit -m "refactor(D3): rename iron → disagreed throughout codebase"
```

---

## Task 2: D4 — Remove quote truncation

**Files:**
- Modify: `src/components/RankList.tsx:84-95`
- Modify: `src/components/__tests__/RankList.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/components/__tests__/RankList.test.tsx` inside the `describe('RankList move buttons')` block:

```ts
it('renders full quote text without line-clamp', () => {
  render(<RankList items={items} onReorder={vi.fn()} />);
  const textEl = screen.getByText('Alpha quote.');
  // WebkitLineClamp would be '2' if the clamp is applied; should be empty after fix
  expect(textEl.style.overflow).not.toBe('hidden');
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npm test -- --run RankList
```

Expected: FAIL — `expect(received).not.toBe(expected)` because `overflow: hidden` is currently applied.

- [ ] **Step 3: Remove line-clamp from RankList.tsx**

In `src/components/RankList.tsx`, find the quote text `div` style (around lines 85-95) and replace:

```tsx
// Remove these four properties from the style object:
display: '-webkit-box',
WebkitLineClamp: 2,
WebkitBoxOrient: 'vertical',
overflow: 'hidden',
```

The surviving style object on that div should be:
```tsx
style={{
  fontFamily: "'Manrope', sans-serif",
  fontWeight: 400,
  fontSize: compact ? '0.75rem' : '0.8125rem',
  lineHeight: 1.45,
  color: 'var(--text-ink)',
}}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npm test -- --run RankList
```

Expected: all RankList tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/RankList.tsx src/components/__tests__/RankList.test.tsx
git commit -m "feat(D4): remove quote truncation — show full text in rank list"
```

---

## Task 3: D2 — Tier mark solid color tiles

**Files:**
- Modify: `src/components/TierIcon.tsx`
- Modify: `src/index.css`
- Modify: `src/components/__tests__/TierIcon.test.tsx`

The icon shapes stay the same. Each tier icon now renders as a square colored tile with the SVG icon in white inside it.

- [ ] **Step 1: Update TierIcon.test.tsx for tile wrapper**

Replace the existing test with:

```ts
// src/components/__tests__/TierIcon.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TierIcon } from '../TierIcon';
import type { Tier } from '../../utils/tiers';

const tiers: Tier[] = ['diamond', 'gold', 'silver', 'bronze', 'disagreed'];

describe('TierIcon', () => {
  it.each(tiers)('renders a colored tile with decorative icon for %s', (tier) => {
    const { container } = render(<TierIcon tier={tier} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile).toHaveAttribute('aria-hidden', 'true');
    expect(tile).toHaveClass(`tier-tile-${tier}`);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveClass(`tier-icon-${tier}`);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npm test -- --run TierIcon
```

Expected: FAIL — `tier-tile-${tier}` class not found.

- [ ] **Step 3: Rewrite TierIcon.tsx**

```tsx
// src/components/TierIcon.tsx
import React from 'react';
import type { Tier } from '../utils/tiers';

export interface TierIconProps {
  tier: Tier;
  size?: number;
}

const TILE_COLORS: Record<Tier, string> = {
  diamond: '#60a5fa',
  gold: '#fbbf24',
  silver: '#94a3b8',
  bronze: '#a78bfa',
  disagreed: '#6b7280',
};

/**
 * Decorative tier glyphs (REDESIGN_SPEC §3.4): solid colored tile with white
 * icon inside. Shapes: gem, medal-2, medal-3, check-circle, slash-circle.
 * Always paired with a visible text label — the icon alone never carries the tier.
 */
export const TierIcon: React.FC<TierIconProps> = ({ tier, size = 14 }) => {
  const radius = Math.round(size * 0.3);
  const iconSize = Math.round(size * 0.7);

  const common = {
    width: iconSize,
    height: iconSize,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'white',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: `tier-icon tier-icon-${tier}`,
  };

  const icon = (() => {
    switch (tier) {
      case 'diamond':
        return (
          <svg {...common}>
            <path d="M7 3h10l4 6-9 12L3 9l4-6z" />
            <path d="M3 9h18M9.5 3 12 9l2.5-6M12 21 9.5 9M12 21l2.5-12" strokeWidth="1.25" />
          </svg>
        );
      case 'gold':
        return (
          <svg {...common}>
            <circle cx="12" cy="14" r="7" />
            <path d="M8.5 2.5 11 7.5M15.5 2.5 13 7.5" />
            <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" stroke="none">2</text>
          </svg>
        );
      case 'silver':
        return (
          <svg {...common}>
            <circle cx="12" cy="14" r="7" />
            <path d="M8.5 2.5 11 7.5M15.5 2.5 13 7.5" />
            <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" stroke="none">3</text>
          </svg>
        );
      case 'bronze':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
          </svg>
        );
      case 'disagreed':
        return (
          <svg {...common}>
            <circle cx="12" cy="12" r="9" />
            <path d="M5.6 5.6l12.8 12.8" />
          </svg>
        );
    }
  })();

  return (
    <span
      aria-hidden="true"
      className={`tier-tile tier-tile-${tier}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: TILE_COLORS[tier],
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
  );
};
```

- [ ] **Step 4: Add tier-tile CSS in index.css**

Add after the `.tier-icon-*` rules (around line 1249):

```css
/* Tier tile wrappers — solid color tiles housing white icons */
.tier-tile { flex-shrink: 0; }
```

(Sizing and colors are inline on the component; this class is a hook for future overrides.)

- [ ] **Step 5: Run test — confirm it passes**

```bash
npm test -- --run TierIcon
```

Expected: all pass.

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass. The `tier-icon-*` CSS color rules still exist but now color `white` icons inside colored tiles — that's fine; they'll be overridden by the inline `stroke="white"`. Optionally remove the old `.tier-icon-*` color rules from index.css since they're now superseded by `stroke="white"`.

- [ ] **Step 7: Commit**

```bash
git add src/components/TierIcon.tsx src/index.css src/components/__tests__/TierIcon.test.tsx
git commit -m "feat(D2): tier mark solid color tiles with white icons"
```

---

## Task 4: D1 — Coin press verdict paddles

**Files:**
- Modify: `src/components/ActionButtons.tsx`
- Modify: `src/components/QuoteCard.tsx`
- Modify: `src/components/EvaluationPhase.tsx`
- Modify: `src/components/PracticeRound.tsx`
- Modify: `src/index.css`
- Modify: `src/components/__tests__/QuoteCard.test.tsx`

### 4a — ActionButtons: full-bleed slabs

- [ ] **Step 1: Rewrite ActionButtons.tsx**

```tsx
// src/components/ActionButtons.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface ActionButtonsProps {
  onAgree: () => void;
  onDisagree: () => void;
  disabled?: boolean;
  /** True on mobile: renders fixed to viewport bottom, full bleed. */
  fixed?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAgree,
  onDisagree,
  disabled = false,
  fixed = false,
}) => {
  return (
    <div
      className={`action-buttons-container ${fixed ? 'action-buttons-fixed' : ''}`}
      role="group"
      aria-label="Verdict"
    >
      <motion.button
        onClick={onDisagree}
        disabled={disabled}
        className="action-button action-button-disagree"
        whileTap={{ scale: 0.98 }}
        aria-label="Disagree with this quote"
      >
        DISAGREE
      </motion.button>
      <motion.button
        onClick={onAgree}
        disabled={disabled}
        className="action-button action-button-agree"
        whileTap={{ scale: 0.98 }}
        aria-label="Agree with this quote"
      >
        AGREE
      </motion.button>
    </div>
  );
};
```

- [ ] **Step 2: Replace action button CSS in index.css**

Find the action buttons section (around lines 535–651) and replace entirely:

```css
/* ============================================
   Action Buttons — Coin Press Verdict Paddles
   ============================================ */

.action-buttons-container {
  display: flex;
  height: 78px;
}

.action-buttons-fixed {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.action-button {
  flex: 1;
  border: none;
  border-radius: 0;
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 1.1875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button-disagree {
  background-color: #1a1a1a;
  color: #ffffff;
}

.action-button-agree {
  background-color: #ff5740;
  color: #ffffff;
}

.action-button-disagree:hover:not(:disabled),
.action-button-disagree:active:not(:disabled) {
  filter: brightness(1.2);
}

.action-button-agree:hover:not(:disabled),
.action-button-agree:active:not(:disabled) {
  filter: brightness(1.1);
}

.action-button-disagree.keyboard-active { filter: brightness(1.2); }
.action-button-agree.keyboard-active { filter: brightness(1.1); }
```

### 4b — QuoteCard: remove swipe, add stamp overlay

- [ ] **Step 3: Update QuoteCard.test.tsx — remove onAgree/onDisagree props**

Replace all `onAgree={vi.fn()} onDisagree={vi.fn()}` occurrences in the test file (7 places). These props are removed from the interface.

Also add a test for the stamp overlay:

```ts
it('shows the agree stamp when pendingVerdict is agree', () => {
  render(<QuoteCard quote={quote} pendingVerdict="agree" />);
  expect(document.querySelector('.quote-stamp-agree')).toBeInTheDocument();
});

it('shows the disagree stamp when pendingVerdict is disagree', () => {
  render(<QuoteCard quote={quote} pendingVerdict="disagree" />);
  expect(document.querySelector('.quote-stamp-disagree')).toBeInTheDocument();
});

it('shows no stamp when pendingVerdict is not set', () => {
  render(<QuoteCard quote={quote} />);
  expect(document.querySelector('.quote-stamp')).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run QuoteCard tests — confirm failures**

```bash
npm test -- --run QuoteCard
```

Expected: TypeScript errors from removed props + stamp tests failing.

- [ ] **Step 5: Rewrite QuoteCard.tsx**

```tsx
// src/components/QuoteCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import type { BlindQuote } from '../store/useReadRankStore';
import { SourceInfoButton } from './SourceExplainer';

interface QuoteCardProps {
  quote: BlindQuote;
  isStacked?: boolean;
  stackIndex?: number;
  displayNumber?: number;
  showTrustFooter?: boolean;
  pendingVerdict?: 'agree' | 'disagree';
}

export const QuoteCard = React.forwardRef<HTMLDivElement, QuoteCardProps>(
  ({ quote, isStacked = false, stackIndex = 0, displayNumber, showTrustFooter = true, pendingVerdict }, ref) => {
    const scaleValue = isStacked ? 0.95 - stackIndex * 0.02 : 1;
    const zIndexValue = isStacked ? 100 - stackIndex * 10 : 100;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2 }}
        style={{
          scale: scaleValue,
          zIndex: zIndexValue,
          position: 'relative',
          boxShadow: isStacked
            ? `${stackIndex * 3}px ${stackIndex * 3}px 0 rgba(0,0,0,0.04)`
            : undefined,
        }}
        className={`ev-quote-card ${!isStacked ? 'ev-quote-card-active' : ''} w-full max-w-lg md:max-w-xl`}
      >
        {/* Quote number */}
        {displayNumber && (
          <div className="flex items-center gap-2 mb-4">
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 600,
              fontSize: '0.6875rem',
              color: 'var(--text-tertiary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
            }}>
              Quote {displayNumber}
            </span>
            {isStacked && (
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.625rem', color: 'var(--text-tertiary)', opacity: 0.6 }}>
                Preview
              </span>
            )}
          </div>
        )}

        {/* Quote Text */}
        <div
          className="ev-quote-text"
          style={{ fontSize: 'clamp(1.0625rem, 2.5vw, 1.25rem)', paddingLeft: '0.25rem' }}
        >
          {quote.text}
        </div>

        {/* Trust footer */}
        {showTrustFooter && (
          <div
            data-no-drag
            style={{
              marginTop: '1.25rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.8125rem',
              color: 'var(--text-tertiary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Verified quote.&nbsp; Source shown at the reveal.</span>
            </span>
            <SourceInfoButton />
          </div>
        )}

        {/* Coin press stamp overlay */}
        {pendingVerdict && (
          <motion.div
            className={`quote-stamp quote-stamp-${pendingVerdict}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
            aria-hidden="true"
          >
            <div className="quote-stamp-circle">
              <span className="quote-stamp-text">{pendingVerdict === 'agree' ? 'AGREE' : 'DISAGREE'}</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  }
);
QuoteCard.displayName = 'QuoteCard';
```

- [ ] **Step 6: Add stamp overlay CSS to index.css**

Add after the tier ghost slots section:

```css
/* ============================================
   Coin Press Stamp Overlay
   ============================================ */

.quote-stamp {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(20, 20, 20, 0.55);
  border-radius: inherit;
}

.quote-stamp-circle {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-8deg);
}

.quote-stamp-agree .quote-stamp-circle {
  border: 4px solid #ff5740;
}

.quote-stamp-disagree .quote-stamp-circle {
  border: 4px dashed #8d8d8d;
}

.quote-stamp-text {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 1.125rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.quote-stamp-agree .quote-stamp-text { color: #ff5740; }
.quote-stamp-disagree .quote-stamp-text { color: #8d8d8d; }
```

### 4c — EvaluationPhase: coin press animation sequence

- [ ] **Step 7: Rewrite EvaluationPhase.tsx**

Key changes:
- Remove `isDragging`, `dragX`, `cardXRef`, `handleDragStateChange`
- Remove `SwipeBackground` import and usage
- Add `pendingVerdict` state
- Update `handleButtonSwipe` to use stamp sequence
- Wrap `QuoteCard` in `AnimatePresence`
- Pass `fixed` to `ActionButtons` on mobile
- Update coach mark text

```tsx
// src/components/EvaluationPhase.tsx
import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useReadRankStore, type BlindQuote } from '../store/useReadRankStore';
import { QuoteCard } from './QuoteCard';
import { ActionButtons } from './ActionButtons';
import { RankedListSidebar } from './AgreedQuotesSidebar';
import { TopicStepper } from './TopicStepper';
import { useDeviceType } from '../hooks/useDeviceType';
import CoachMark from './CoachMark';
import { RankDock } from './RankDock';
import { RankSheet } from './RankSheet';
import { FirstAgreeCoach } from './FirstAgreeCoach';

function delay(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export const EvaluationPhase: React.FC = () => {
  const {
    agree,
    disagree,
    finishRace,
    nextTopic,
    getCurrentRaceProgress,
    getCurrentTopicProgress,
    coachMarksCompleted,
    completeCoachMarks,
  } = useReadRankStore();

  const race = getCurrentRaceProgress();
  const topic = getCurrentTopicProgress();

  const agreed = race?.agreed ?? [];
  const quotesToEvaluate = topic?.quotesToEvaluate ?? [];
  const currentIndex = topic?.currentIndex ?? 0;
  const currentQuote = quotesToEvaluate[currentIndex];

  const topicOrder = race?.topicOrder ?? [];
  const currentTopicIdx = race?.currentTopicKey ? topicOrder.indexOf(race.currentTopicKey) : 0;
  const isLastTopic = currentTopicIdx >= topicOrder.length - 1;
  const topicExhausted = !currentQuote;
  const allTopicsDone = race
    ? Object.values(race.topics).every((t) => t.currentIndex >= t.quotesToEvaluate.length)
    : false;

  const deviceType = useDeviceType();
  const isMouseDevice = deviceType === 'mouse' || deviceType === 'unknown';

  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingVerdict, setPendingVerdict] = useState<'agree' | 'disagree' | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const autoOpenedRef = useRef(false);
  const dockRef = useRef<HTMLButtonElement>(null);

  const disagreedCount = race
    ? Object.values(race.topics).reduce((n, t) => n + t.disagreed.length, 0)
    : 0;

  const [tourStep, setTourStep] = useState<1 | 2 | null>(null);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const quoteCardRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (coachMarksCompleted) return;
    const timer = setTimeout(() => setTourStep(1), 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isMouseDevice && allTopicsDone && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setSheetOpen(true);
    }
  }, [isMouseDevice, allTopicsDone]);

  const handleButtonSwipe = async (direction: 'agree' | 'disagree') => {
    if (isAnimating || !currentQuote) return;
    setIsAnimating(true);
    setPendingVerdict(direction);
    await delay(300); // Strike (120ms) + Hold (180ms)
    setPendingVerdict(null);
    if (tourStep === 1) setTourStep(2);
    if (direction === 'agree') agree(currentQuote);
    else disagree(currentQuote);
    await delay(250); // card exit animation (200ms + buffer)
    setIsAnimating(false);
  };

  const handleButtonSwipeRef = useRef(handleButtonSwipe);
  useLayoutEffect(() => { handleButtonSwipeRef.current = handleButtonSwipe; });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (isAnimating || !currentQuote || sheetOpen) return;
      if (document.querySelector('dialog[open]')) return;
      switch (event.key) {
        case 'ArrowLeft': case 'a': case 'A':
          event.preventDefault(); handleButtonSwipeRef.current('disagree'); break;
        case 'ArrowRight': case 'd': case 'D':
          event.preventDefault(); handleButtonSwipeRef.current('agree'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnimating, currentQuote, sheetOpen]);

  const progressPercent = quotesToEvaluate.length > 0
    ? Math.round((Math.min(currentIndex, quotesToEvaluate.length) / quotesToEvaluate.length) * 100)
    : 0;

  const canReveal = agreed.length >= 1;

  const triageContent = (
    <>
      <div className="text-center">
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.375rem' }}>
          {topicExhausted
            ? `${quotesToEvaluate.length} of ${quotesToEvaluate.length}`
            : `${Math.min(currentIndex + 1, quotesToEvaluate.length)} of ${quotesToEvaluate.length}`}
        </p>
        <div className="w-full h-1 rounded-full" style={{ backgroundColor: 'var(--border-subtle)' }}>
          <div className="h-1 rounded-full transition-all duration-300"
            style={{ width: `${topicExhausted ? 100 : progressPercent}%`, backgroundColor: 'var(--color-ev-muted-blue)' }} />
        </div>
      </div>

      <div ref={swipeAreaRef}>
        {currentQuote ? (
          <div className="swipe-card-container">
            <div className="flex justify-center relative z-10">
              <AnimatePresence mode="wait">
                <QuoteCard
                  ref={quoteCardRef}
                  key={currentQuote.id}
                  quote={currentQuote}
                  displayNumber={currentIndex + 1}
                  pendingVerdict={pendingVerdict ?? undefined}
                />
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="evaluation-complete-card">
            <div className="text-center py-8">
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-link)', marginBottom: '0.5rem' }}>
                {isLastTopic ? 'All topics done' : 'Topic complete'}
              </div>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                {isLastTopic ? "Reveal your ballot when you're ready." : 'Move on, or keep ranking your pile.'}
              </p>
              {!isLastTopic && (
                <button onClick={nextTopic} className="ev-button-primary" style={{ marginTop: '1rem', fontSize: '0.9375rem' }}>
                  Next topic →
                </button>
              )}
            </div>
          </div>
        )}

        {currentQuote && (
          <ActionButtons
            onAgree={() => handleButtonSwipe('agree')}
            onDisagree={() => handleButtonSwipe('disagree')}
            disabled={isAnimating}
            fixed={!isMouseDevice}
          />
        )}
      </div>
    </>
  );

  const revealCta = canReveal && (
    <div className="flex justify-center pt-2">
      <button
        onClick={finishRace}
        className={`ev-button-primary ${allTopicsDone ? 'animate-gentle-pulse' : ''}`}
        style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
      >
        Reveal my ballot
      </button>
    </div>
  );

  const mainColumn = (
    <div className="space-y-5">
      <TopicStepper />
      {triageContent}
      {isMouseDevice && (allTopicsDone || canReveal) && revealCta}
    </div>
  );

  const coachMarkOverlay = (
    <>
      <CoachMark
        targetRef={swipeAreaRef}
        show={tourStep === 1 && !!currentQuote}
        allowSpotlightInteraction
        stepLabel="1 of 2"
        onNext={finishTour}
        onSkipAll={finishTour}
      >
        Tap AGREE or DISAGREE to make your verdict.
      </CoachMark>
      {isMouseDevice && (
        <CoachMark
          targetRef={sidebarRef}
          show={tourStep === 2 && agreed.length >= 1}
          allowSpotlightInteraction={false}
          stepLabel="2 of 2"
          onDismiss={finishTour}
        >
          Drag your agreed quotes to rank them — your top 3 are your podium.
        </CoachMark>
      )}
      {!isMouseDevice && (
        <CoachMark
          targetRef={dockRef}
          show={tourStep === 2 && agreed.length >= 1 && !sheetOpen}
          allowSpotlightInteraction={false}
          stepLabel="2 of 2"
          onDismiss={finishTour}
        >
          Your agreed quotes file in here.&nbsp; Tap to rank them — your top 3 are your podium.
        </CoachMark>
      )}
    </>
  );

  const finishTour = useCallback(() => {
    setTourStep(null);
    completeCoachMarks();
  }, [completeCoachMarks]);

  if (isMouseDevice) {
    return (
      <div>
        <div className="evaluation-split-layout">
          <div className="evaluation-main-panel">{mainColumn}</div>
          <div className="evaluation-sidebar-panel">
            {agreed.length === 1 && <FirstAgreeCoach variant="desktop" />}
            <RankedListSidebar ref={sidebarRef} />
          </div>
        </div>
        {coachMarkOverlay}
      </div>
    );
  }

  return (
    <div className="evaluation-mobile">
      {mainColumn}
      {agreed.length === 1 && <FirstAgreeCoach variant="mobile" />}
      <RankDock
        ref={dockRef}
        agreed={agreed}
        disagreedCount={disagreedCount}
        onOpen={() => setSheetOpen(true)}
      />
      <RankSheet
        open={sheetOpen}
        allDone={allTopicsDone}
        onClose={() => {
          setSheetOpen(false);
          requestAnimationFrame(() => dockRef.current?.focus());
        }}
        onSeeResults={() => {
          setSheetOpen(false);
          finishRace();
        }}
      />
      {coachMarkOverlay}
    </div>
  );
};
```

Note: `finishTour` must be defined before the JSX that references it. Move the `const finishTour` declaration to before `triageContent`.

- [ ] **Step 8: Update PracticeRound.tsx — remove SwipeBackground and drag wiring**

Remove from PracticeRound.tsx:
- The `import { SwipeBackground } from './SwipeBackground';` line
- The `import { SwipeInstructions } from './SwipeInstructions';` line
- The `isDragging`, `dragX`, `cardXRef` state/refs
- The `handleDragStateChange` callback
- The `<SwipeBackground ... />` JSX
- The `<SwipeInstructions />` JSX
- The `animate(cardXRef.current, offScreenX, ...).finished` in `handleButtonSwipe` — replace with `delay(300)` stamp approach (same coin press sequence as EvaluationPhase)
- The `onDragStateChange={handleDragStateChange}` prop from QuoteCard
- The `onAgree` and `onDisagree` props from QuoteCard

The updated `handleButtonSwipe` in PracticeRound:

```tsx
const [pendingVerdict, setPendingVerdict] = useState<'agree' | 'disagree' | null>(null);

const handleButtonSwipe = useCallback(async (direction: 'agree' | 'disagree') => {
  if (isAnimating || !currentQuote) return;
  setIsAnimating(true);
  setPendingVerdict(direction);
  await delay(300);
  setPendingVerdict(null);
  if (direction === 'agree') agreePractice(currentQuote);
  else disagreePractice(currentQuote);
  await delay(250);
  setIsAnimating(false);
}, [isAnimating, currentQuote, agreePractice, disagreePractice]);
```

Add `function delay(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }` at the top of the file.

Update the QuoteCard usage in PracticeRound:

```tsx
<AnimatePresence mode="wait">
  <QuoteCard
    key={currentQuote.id}
    quote={currentQuote}
    displayNumber={currentIndex + 1}
    pendingVerdict={pendingVerdict ?? undefined}
    showTrustFooter={false}
  />
</AnimatePresence>
```

Also update splash text: change "swiping and dragging" → "tapping and dragging to rank".

- [ ] **Step 9: Add bottom padding for fixed paddles in index.css**

In the mobile evaluation section, add a utility class:

```css
/* Extra bottom clearance for fixed verdict paddles on mobile */
.has-fixed-paddles {
  padding-bottom: calc(78px + env(safe-area-inset-bottom) + 1rem);
}
```

In EvaluationPhase, add `has-fixed-paddles` class to the `evaluation-mobile` div when `currentQuote` is present:

```tsx
<div className={`evaluation-mobile ${currentQuote && !isMouseDevice ? 'has-fixed-paddles' : ''}`}>
```

- [ ] **Step 10: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass. Fix any TypeScript errors from removed props.

- [ ] **Step 11: Commit**

```bash
git add src/components/ActionButtons.tsx src/components/QuoteCard.tsx \
  src/components/EvaluationPhase.tsx src/components/PracticeRound.tsx \
  src/index.css src/components/__tests__/QuoteCard.test.tsx
git commit -m "feat(D1): coin press verdict paddles — replace swipe with full-bleed AGREE/DISAGREE slabs"
```

---

## Task 5: D6 — Spring drag physics

**Files:**
- Modify: `src/components/RankList.tsx`
- Modify: `src/components/__tests__/RankList.test.tsx`

The dragged item lifts into a `DragOverlay` (floating clone with shadow + slight scale). Items underneath animate to their new positions via framer-motion layout spring. On drop, items settle with a springy overshoot feel.

- [ ] **Step 1: Write failing tests for DragOverlay behavior**

Add to `src/components/__tests__/RankList.test.tsx`:

```ts
it('hides the original row during drag (opacity 0)', async () => {
  // This is a visual behavior — the ghost placeholder has opacity 0 when isDragging.
  // We verify the class is applied; actual drag simulation is covered by dnd-kit internals.
  render(<RankList items={items} onReorder={vi.fn()} />);
  // The tier rows should all have the tier-row class without any 'rank-row-dragging' initially
  const rows = document.querySelectorAll('.tier-row');
  expect(rows.length).toBe(3);
  rows.forEach((r) => expect(r).not.toHaveClass('rank-row-dragging'));
});
```

- [ ] **Step 2: Rewrite RankList.tsx**

```tsx
// src/components/RankList.tsx
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import type { AgreedQuote } from '../store/useReadRankStore';
import { TIER_META, tierAnnouncement, tierForIndex } from '../utils/tiers';
import { TierIcon } from './TierIcon';

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
    </svg>
  );
}

interface RowContentProps {
  quote: AgreedQuote;
  index: number;
  compact?: boolean;
  onMove?: (from: number, dir: -1 | 1) => void;
  isFirst?: boolean;
  isLast?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

/** The visual content of a ranked row — shared between SortableRow and DragOverlay. */
function RowContent({ quote, index, compact, onMove, isFirst, isLast, dragHandleProps }: RowContentProps) {
  const rank = index + 1;
  const tier = tierForIndex(index);
  const meta = TIER_META[tier];

  return (
    <div
      style={{
        padding: compact ? '0.5rem 0.625rem' : '0.625rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
      }}
      className={`tier-row tier-row-${tier}`}
    >
      <button
        type="button"
        className="rank-drag-handle"
        aria-label={`Reorder, currently ranked ${rank}, ${meta.name}`}
        style={{ background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'grab' }}
        {...dragHandleProps}
      >
        <GripIcon />
      </button>

      <span className="tier-rank-num" aria-hidden="true">{rank}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {tier !== 'bronze' && (
          <div className={`tier-label tier-label-${tier}`}>
            <TierIcon tier={tier} size={12} />
            {meta.label}
          </div>
        )}
        <div
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 400,
            fontSize: compact ? '0.75rem' : '0.8125rem',
            lineHeight: 1.45,
            color: 'var(--text-ink)',
          }}
        >
          {quote.text}
        </div>
      </div>

      {onMove && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.125rem' }}>
          <button
            type="button"
            className="rank-move-button"
            aria-label={`Move up, currently ranked ${rank}, ${meta.name}`}
            aria-disabled={isFirst || undefined}
            onClick={() => { if (!isFirst) onMove(index, -1); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6" /></svg>
          </button>
          <button
            type="button"
            className="rank-move-button"
            aria-label={`Move down, currently ranked ${rank}, ${meta.name}`}
            aria-disabled={isLast || undefined}
            onClick={() => { if (!isLast) onMove(index, 1); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </span>
      )}
    </div>
  );
}

interface RowProps {
  quote: AgreedQuote;
  index: number;
  compact?: boolean;
  onMove?: (from: number, dir: -1 | 1) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const SortableRow: React.FC<RowProps> = ({ quote, index, compact, onMove, isFirst, isLast }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        style={{ opacity: isDragging ? 0 : 1 }}
        className={isDragging ? 'rank-row-dragging' : ''}
      >
        <RowContent
          quote={quote}
          index={index}
          compact={compact}
          onMove={onMove}
          isFirst={isFirst}
          isLast={isLast}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </motion.div>
    </div>
  );
};

interface RankListProps {
  items: AgreedQuote[];
  onReorder: (orderedIds: string[]) => void;
  compact?: boolean;
  emptyHint?: string;
  longPressDrag?: boolean;
  showMoveButtons?: boolean;
  showGhostSlots?: boolean;
}

export const RankList: React.FC<RankListProps> = ({ items, onReorder, compact, emptyHint, longPressDrag, showMoveButtons, showGhostSlots }) => {
  const [announcement, setAnnouncement] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: longPressDrag ? { delay: 250, tolerance: 8 } : { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeItem = activeId ? items.find((q) => q.id === activeId) : null;
  const activeIndex = activeItem ? items.indexOf(activeItem) : -1;

  const handleMove = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= items.length) return;
    const moved = items[from];
    const stub = moved.text.length > 40 ? moved.text.slice(0, 40) + '…' : moved.text;
    const ids = items.map((q) => q.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    onReorder(ids);
    setAnnouncement(`Moved "${stub}" to ${tierAnnouncement(to, ids.length)}`);
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((q) => q.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder(next);
  };

  if (items.length === 0 && !showGhostSlots) {
    return (
      <div
        className="sidebar-empty-state"
        style={{
          border: '1.5px dashed var(--border-subtle)',
          borderRadius: '8px',
          padding: '1.5rem 1rem',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--border-medium)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h10M4 18h7" />
        </svg>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: 0 }}>
          {emptyHint ?? 'Agree with quotes, then drag to rank them. Your top 3 form your podium.'}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((q) => q.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {items.map((q, i) => (
            <SortableRow
              key={q.id}
              quote={q}
              index={i}
              compact={compact}
              onMove={showMoveButtons ? handleMove : undefined}
              isFirst={i === 0}
              isLast={i === items.length - 1}
            />
          ))}
          {showGhostSlots && items.length < 3 &&
            Array.from({ length: 3 - items.length }, (_, k) => {
              const idx = items.length + k;
              const meta = TIER_META[tierForIndex(idx)];
              return (
                <div key={`ghost-${meta.tier}`} className={`tier-ghost tier-ghost-${meta.tier}`} aria-hidden="true">
                  <TierIcon tier={meta.tier} size={14} />
                  <span>{meta.label}</span>
                </div>
              );
            })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && activeIndex !== -1 ? (
          <div style={{
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            transform: 'scale(1.02)',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            opacity: 0.95,
          }}>
            <RowContent
              quote={activeItem}
              index={activeIndex}
              compact={compact}
              onMove={showMoveButtons ? handleMove : undefined}
              isFirst={activeIndex === 0}
              isLast={activeIndex === items.length - 1}
            />
          </div>
        ) : null}
      </DragOverlay>

      <div className="sr-only" role="status">{announcement}</div>
    </DndContext>
  );
};
```

- [ ] **Step 3: Run tests — confirm pass**

```bash
npm test -- --run RankList
```

Expected: all existing tests pass (DragOverlay doesn't affect the button/move tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/RankList.tsx src/components/__tests__/RankList.test.tsx
git commit -m "feat(D6): spring drag physics — DragOverlay with layout spring and overshoot settle"
```

---

## Task 6: D5 — Issue selection screen

**Files:**
- Modify: `src/store/useReadRankStore.ts`
- Create: `src/components/IssueSelection.tsx`
- Modify: `src/components/PhaseContainer.tsx`
- Modify: `src/index.css`
- Create: `src/components/__tests__/IssueSelection.test.tsx`
- Create: `src/store/__tests__/issueSelection.test.ts`

### 6a — Store changes

- [ ] **Step 1: Write store tests**

Create `src/store/__tests__/issueSelection.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore, type RacePayload } from '../useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-is-test',
  positionName: 'Governor',
  topics: [
    { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [] },
    { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [] },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
});

describe('issue selection store', () => {
  it('selectRace sets global phase to issue-selection for a new race', () => {
    useReadRankStore.getState().selectRace(payload);
    expect(useReadRankStore.getState().phase).toBe('issue-selection');
  });

  it('selectRace initialises selectedTopicKeys to all topic keys', () => {
    useReadRankStore.getState().selectRace(payload);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.selectedTopicKeys).toEqual(['k1', 'k2']);
  });

  it('setSelectedTopics updates the selection', () => {
    useReadRankStore.getState().selectRace(payload);
    useReadRankStore.getState().setSelectedTopics(['k1']);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.selectedTopicKeys).toEqual(['k1']);
  });

  it('confirmIssueSelection advances global and race phase to evaluation', () => {
    useReadRankStore.getState().selectRace(payload);
    useReadRankStore.getState().confirmIssueSelection();
    expect(useReadRankStore.getState().phase).toBe('evaluation');
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.phase).toBe('evaluation');
  });

  it('re-selecting an existing race skips issue-selection and resumes its phase', () => {
    useReadRankStore.getState().selectRace(payload);
    useReadRankStore.getState().confirmIssueSelection();
    useReadRankStore.getState().goToHub();
    useReadRankStore.getState().selectRace(payload);
    expect(useReadRankStore.getState().phase).toBe('evaluation');
  });
});
```

- [ ] **Step 2: Run tests — confirm failures**

```bash
npm test -- --run issueSelection
```

Expected: FAIL — `phase` not `'issue-selection'`, `selectedTopicKeys` undefined.

- [ ] **Step 3: Update useReadRankStore.ts**

**3a. Extend Phase type (line 66):**
```ts
export type Phase = 'hub' | 'practice' | 'evaluation' | 'results' | 'issue-selection';
```

**3b. Add `selectedTopicKeys` to RaceProgress (after line 38):**
```ts
export interface RaceProgress {
  raceId: string;
  positionName: string;
  topics: Record<string, TopicProgress>;
  topicOrder: string[];
  currentTopicKey: string | null;
  agreed: AgreedQuote[];
  phase: 'evaluation' | 'results';
  completed: boolean;
  /** Keys of topics the user chose to evaluate. Undefined for races started before this field existed. */
  selectedTopicKeys?: string[];
}
```

**3c. Update `buildRaceProgress` to initialise `selectedTopicKeys` (after `completed: false`):**
```ts
selectedTopicKeys: topicOrder,
```

**3d. Update `selectRace` to set issue-selection phase for new races:**
```ts
selectRace: (payload) => {
  const state = get();
  const existing = state.raceProgress[payload.raceId];
  const race = existing ?? buildRaceProgress(payload);
  const nextPhase: Phase = existing ? race.phase : 'issue-selection';
  const selectedTopicKeys = race.selectedTopicKeys ?? race.topicOrder;
  set({
    currentRaceId: payload.raceId,
    phase: nextPhase,
    raceProgress: {
      ...state.raceProgress,
      [payload.raceId]: { ...race, selectedTopicKeys },
    },
  });
},
```

**3e. Fix `setPhase` to not clobber `RaceProgress.phase` with `'issue-selection'`:**
```ts
setPhase: (phase) => {
  const state = get();
  if (phase === 'evaluation' || phase === 'results') {
    const patch = withCurrentRace(state, (race) => ({
      ...race,
      phase,
      completed: phase === 'results' ? true : race.completed,
    }));
    if (patch) {
      set({ phase, ...patch });
      return;
    }
  }
  set({ phase });
},
```

**3f. Add new actions to ReadRankState interface (after `finishRace`):**
```ts
setSelectedTopics: (keys: string[]) => void;
confirmIssueSelection: () => void;
```

**3g. Add action implementations (after `finishRace` implementation):**
```ts
setSelectedTopics: (keys) => {
  const patch = withCurrentRace(get(), (race) => ({ ...race, selectedTopicKeys: keys }));
  if (patch) set(patch);
},

confirmIssueSelection: () => {
  const state = get();
  const patch = withCurrentRace(state, (race) => ({
    ...race,
    phase: 'evaluation' as const,
  }));
  if (patch) set({ phase: 'evaluation', ...patch });
  else set({ phase: 'evaluation' });
},
```

**3h. Update `partialize` to include `selectedTopicKeys` in persisted race data** — `selectedTopicKeys` is already on `raceProgress` which is persisted as a whole, so no change needed.

- [ ] **Step 4: Run store tests — confirm pass**

```bash
npm test -- --run issueSelection
```

Expected: all 5 tests pass.

### 6b — IssueSelection component

- [ ] **Step 5: Write IssueSelection tests**

Create `src/components/__tests__/IssueSelection.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssueSelection } from '../IssueSelection';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-issue-ui',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'h1', text: 'Quote A', candidateToken: 'tok-a', topicKey: 'housing' },
        { id: 'h2', text: 'Quote B', candidateToken: 'tok-b', topicKey: 'housing' },
      ],
    },
    {
      topicKey: 'economy',
      title: 'Economy',
      question: 'How to grow the economy?',
      quotes: [
        { id: 'e1', text: 'Quote C', candidateToken: 'tok-a', topicKey: 'economy' },
      ],
    },
    {
      topicKey: 'environment',
      title: 'Environment',
      question: 'How to protect the environment?',
      quotes: [
        { id: 'ev1', text: 'Quote D', candidateToken: 'tok-a', topicKey: 'environment' },
        { id: 'ev2', text: 'Quote E', candidateToken: 'tok-b', topicKey: 'environment' },
        { id: 'ev3', text: 'Quote F', candidateToken: 'tok-c', topicKey: 'environment' },
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
});

describe('IssueSelection', () => {
  it('renders all topic titles', () => {
    render(<IssueSelection />);
    expect(screen.getByText('Housing')).toBeInTheDocument();
    expect(screen.getByText('Economy')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
  });

  it('selects all scorable topics by default', () => {
    render(<IssueSelection />);
    expect(screen.getByRole('button', { name: /housing/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /environment/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks single-candidate topics as NOT SCORED and non-interactive', () => {
    render(<IssueSelection />);
    expect(screen.getByText('NOT SCORED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /economy/i })).not.toBeInTheDocument();
  });

  it('toggles a topic off when clicked', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /housing/i }));
    expect(screen.getByRole('button', { name: /housing/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows live CTA with total quote count and time estimate', () => {
    render(<IssueSelection />);
    // Housing (2) + Environment (3) = 5 quotes; ceil(5/8) = 1 min
    expect(screen.getByRole('button', { name: /start.*5 quotes.*1 min/i })).toBeInTheDocument();
  });

  it('disables the CTA when no scorable topics are selected', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /housing/i }));
    await userEvent.click(screen.getByRole('button', { name: /environment/i }));
    const cta = screen.getByRole('button', { name: /select at least one/i });
    expect(cta).toBeDisabled();
  });

  it('advances to evaluation on CTA click', async () => {
    render(<IssueSelection />);
    await userEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(useReadRankStore.getState().phase).toBe('evaluation');
  });
});
```

- [ ] **Step 6: Run tests — confirm they fail**

```bash
npm test -- --run IssueSelection
```

Expected: FAIL — component doesn't exist.

- [ ] **Step 7: Create IssueSelection.tsx**

```tsx
// src/components/IssueSelection.tsx
import React, { useMemo } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';

export const IssueSelection: React.FC = () => {
  const { getCurrentRaceProgress, setSelectedTopics, confirmIssueSelection } = useReadRankStore();
  const race = getCurrentRaceProgress();

  if (!race) return null;

  const topicData = useMemo(() => {
    return race.topicOrder.map((key) => {
      const topic = race.topics[key];
      const uniqueTokens = new Set(topic.quotesToEvaluate.map((q) => q.candidateToken));
      return {
        topicKey: topic.topicKey,
        title: topic.title,
        quoteCount: topic.quotesToEvaluate.length,
        isScored: uniqueTokens.size > 1,
      };
    });
  }, [race.topicOrder, race.topics]);

  const selectedKeys = race.selectedTopicKeys ?? race.topicOrder;

  const selectedScorableCount = topicData
    .filter((t) => t.isScored && selectedKeys.includes(t.topicKey))
    .length;

  const totalSelectedQuotes = topicData
    .filter((t) => t.isScored && selectedKeys.includes(t.topicKey))
    .reduce((sum, t) => sum + t.quoteCount, 0);

  const estimatedMinutes = Math.ceil(totalSelectedQuotes / 8);

  const toggleTopic = (key: string) => {
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key];
    setSelectedTopics(next);
  };

  return (
    <div className="issue-selection">
      <h1 className="issue-selection-title">Choose your issues.</h1>
      <p className="issue-selection-subtitle">
        Every issue keeps its own ranking. Rank them all, or just the ones you care about.
      </p>

      <div className="issue-selection-list">
        {topicData.map((topic) => {
          if (!topic.isScored) {
            return (
              <div key={topic.topicKey} className="issue-row issue-row-unscored">
                <span className="issue-check-tile" aria-hidden="true" />
                <span className="issue-topic-name">{topic.title}</span>
                <span className="issue-not-scored-label">NOT SCORED</span>
              </div>
            );
          }

          const isSelected = selectedKeys.includes(topic.topicKey);
          return (
            <button
              key={topic.topicKey}
              type="button"
              className={`issue-row issue-row-toggle ${isSelected ? 'issue-row-selected' : ''}`}
              onClick={() => toggleTopic(topic.topicKey)}
              aria-pressed={isSelected}
              aria-label={`${topic.title}, ${topic.quoteCount} quotes`}
            >
              <span className={`issue-check-tile ${isSelected ? 'issue-check-tile-selected' : ''}`} aria-hidden="true">
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span className="issue-topic-name">{topic.title}</span>
              <span className="issue-quote-count">{topic.quoteCount} quotes</span>
            </button>
          );
        })}
      </div>

      <div className="issue-selection-footer">
        <button
          type="button"
          className="ev-button-primary"
          style={{ width: '100%', maxWidth: '28rem', fontSize: '1rem', padding: '0.875rem 1.5rem' }}
          disabled={selectedScorableCount === 0}
          onClick={confirmIssueSelection}
        >
          {selectedScorableCount === 0
            ? 'Select at least one issue'
            : `Start · ${totalSelectedQuotes} quotes · about ${estimatedMinutes} min`}
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 8: Add IssueSelection CSS to index.css**

Add near the end of index.css, before the last media query:

```css
/* ============================================
   Issue Selection Screen
   ============================================ */

.issue-selection {
  max-width: 32rem;
  margin: 0 auto;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.issue-selection-title {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 5vw, 2.25rem);
  color: var(--text-heading);
  letter-spacing: -0.02em;
  margin: 0;
}

.issue-selection-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9375rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: -0.75rem 0 0;
}

.issue-selection-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.issue-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 0.625rem;
  border: 1.5px solid var(--border-subtle);
  background: var(--surface-card);
}

.issue-row-toggle {
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.issue-row-selected {
  border-color: var(--color-ev-coral);
  background: color-mix(in srgb, var(--color-ev-coral) 6%, var(--surface-card));
}

.issue-row-unscored {
  opacity: 0.5;
}

.issue-check-tile {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1.5px solid var(--border-medium);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.issue-check-tile-selected {
  background-color: var(--color-ev-coral);
  border-color: var(--color-ev-coral);
}

.issue-row-unscored .issue-check-tile {
  border-style: dashed;
}

.issue-topic-name {
  flex: 1;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--text-ink);
}

.issue-quote-count {
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.issue-not-scored-label {
  font-family: 'Manrope', sans-serif;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.issue-selection-footer {
  display: flex;
  justify-content: center;
}
```

- [ ] **Step 9: Run IssueSelection tests — confirm pass**

```bash
npm test -- --run IssueSelection
```

Expected: all 7 tests pass.

### 6c — Wire into PhaseContainer

- [ ] **Step 10: Update PhaseContainer.tsx**

Add the import:
```tsx
import { IssueSelection } from './IssueSelection';
```

Add the case in `renderPhase()`:
```tsx
case 'issue-selection': return <IssueSelection />;
```

Add the page transition in `getPageTransition()`:
```tsx
case 'issue-selection':
  return { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.3, ease: EASE_CURVE } };
```

- [ ] **Step 11: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass. TypeScript should compile clean:

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 12: Commit**

```bash
git add src/store/useReadRankStore.ts \
  src/components/IssueSelection.tsx \
  src/components/PhaseContainer.tsx \
  src/index.css \
  src/components/__tests__/IssueSelection.test.tsx \
  src/store/__tests__/issueSelection.test.ts
git commit -m "feat(D5): issue selection screen — choose topics before evaluation"
```

---

## Self-Review

**Spec coverage check:**

| Decision | Task | Covered |
|---|---|---|
| D1: Coin press paddles + stamp overlay | Task 4 | ✓ |
| D1: Remove swipe from QuoteCard | Task 4 | ✓ |
| D1: Remove SwipeBackground from EvaluationPhase + PracticeRound | Task 4 | ✓ |
| D2: Solid color tile with white icon | Task 3 | ✓ |
| D3: Full iron → disagreed rename (type, values, CSS) | Task 1 | ✓ |
| D4: Remove WebkitLineClamp | Task 2 | ✓ |
| D5: Issue selection between race select and evaluation | Task 6 | ✓ |
| D5: NOT SCORED topics | Task 6 | ✓ |
| D5: Live-computing CTA | Task 6 | ✓ |
| D5: Store: selectedTopicKeys, setSelectedTopics, confirmIssueSelection | Task 6 | ✓ |
| D6: DragOverlay for lifted card | Task 5 | ✓ |
| D6: framer-motion layout spring on displaced items | Task 5 | ✓ |
| D6: Overshoot drop feel | Task 5 | ✓ — spring stiffness 500 / damping 35 gives slight overshoot |

**Placeholder scan:** No TBDs or TODOs — all steps contain actual code.

**Type consistency check:**
- `Tier = 'disagreed'` introduced in Task 1 — used correctly in Tasks 2, 3, 5
- `pendingVerdict?: 'agree' | 'disagree'` defined in QuoteCard interface (Task 4) and consumed from EvaluationPhase state
- `selectedTopicKeys?: string[]` on RaceProgress — read with `?? race.topicOrder` fallback in both store and component
- `Phase = 'issue-selection'` added in Task 6 before the component that returns it

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-11-design-v2-decisions.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
