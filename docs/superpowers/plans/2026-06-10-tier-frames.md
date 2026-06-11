# Tier Frame System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship priority #3 from REDESIGN_SPEC.md (§3.4) — the Diamond/Gold/Silver/Bronze/Iron tier frame system across every rank surface (RankList rows, ghost slots, the RankDock, and a new unified RankRail used by both the desktop sidebar and the mobile sheet), colorblind-safe (icon + label + frame treatment before hue), with the Iron-vs-Bronze severance treatment and tier-aware announcements.

**Architecture:** A pure tier model (`src/utils/tiers.ts`) + a `TierIcon` SVG component + CSS custom properties (light/dark) drive everything. `RankList` rows swap podium classes for tier frames and gain ghost slots. A new `RankRail` component (list + ghosts + Iron section with severance divider + recover) replaces the duplicated markup in `RankSheet` and `AgreedQuotesSidebar` — the spec §3.2 unification. The dock's filled slots adopt tier frames. The reveal's `podium-rank-badge` classes are untouched (those rank candidates, not quotes — reveal redesign is priority #4).

**Tech Stack:** React 19, CSS custom properties, vitest + RTL (41 tests passing at start).

**Design contract:** REDESIGN_SPEC.md §3.4 (tier table, four Iron cues, grayscale test), §3.2 (RankRail), §7.3 (contrast: identity = icon + label first; all five frames distinguishable in grayscale via double/solid-2/solid-1.5/solid-1-filled/dashed-hatched borders). The spec prohibits ev-yellow as a tier color — this plan retires the current `--podium-gold: #fed12e` usage from rank rows (the variable stays for the reveal's candidate badges until priority #4).

**Copy rules:** no em dashes; two spaces after periods via `&nbsp;` + space. Announcement format (spec §3.2): tier changes announced as "1st choice, Diamond" etc.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/utils/tiers.ts` | Create | Pure tier model: `tierForIndex`, `TIER_META`, announcement strings |
| `src/utils/__tests__/tiers.test.ts` | Create | Tier model behavior |
| `src/components/TierIcon.tsx` | Create | One SVG icon per tier (gem, medal-2, medal-3, check-circle, slash-circle) |
| `src/components/__tests__/TierIcon.test.tsx` | Create | Renders per tier, aria-hidden |
| `src/components/RankList.tsx` | Modify | Tier-framed rows, ghost slots, tier announcements |
| `src/components/__tests__/RankList.test.tsx` | Modify | Updated announcement regex + new tier/ghost tests |
| `src/components/RankRail.tsx` | Create | List + ghosts + Iron section (severance divider, recover) |
| `src/components/__tests__/RankRail.test.tsx` | Create | Ghosts, Iron severance, recover |
| `src/components/RankSheet.tsx` | Modify | Body becomes `<RankRail variant="sheet" />` |
| `src/components/AgreedQuotesSidebar.tsx` | Modify | Body becomes `<RankRail variant="sidebar" />` |
| `src/components/RankDock.tsx` | Modify | Filled slots get tier classes |
| `src/components/__tests__/RankDock.test.tsx` | Modify | Tier class assertions |
| `src/index.css` | Modify | Tier tokens (light/dark), frame classes, ghost/divider/iron styles |

---

### Task 0: Branch

- [x] **Step 1:**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
git checkout -b feat/tier-frames
```

---

### Task 1: Tier model + TierIcon + CSS foundation

**Files:**
- Create: `src/utils/tiers.ts`, `src/utils/__tests__/tiers.test.ts`, `src/components/TierIcon.tsx`, `src/components/__tests__/TierIcon.test.tsx`
- Modify: `src/index.css`

- [x] **Step 1: Write the failing tests** — create `src/utils/__tests__/tiers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tierForIndex, TIER_META, tierAnnouncement } from '../tiers';

describe('tier model', () => {
  it('maps agreed positions to tiers (1/1/1/unlimited)', () => {
    expect(tierForIndex(0)).toBe('diamond');
    expect(tierForIndex(1)).toBe('gold');
    expect(tierForIndex(2)).toBe('silver');
    expect(tierForIndex(3)).toBe('bronze');
    expect(tierForIndex(11)).toBe('bronze');
  });

  it('carries labels and names for every tier', () => {
    expect(TIER_META.diamond).toEqual({ tier: 'diamond', label: '1st choice', name: 'Diamond' });
    expect(TIER_META.gold).toEqual({ tier: 'gold', label: '2nd choice', name: 'Gold' });
    expect(TIER_META.silver).toEqual({ tier: 'silver', label: '3rd choice', name: 'Silver' });
    expect(TIER_META.bronze).toEqual({ tier: 'bronze', label: 'Agreed', name: 'Bronze' });
    expect(TIER_META.iron).toEqual({ tier: 'iron', label: 'Disagreed', name: 'Iron' });
  });

  it('builds tier announcements per spec', () => {
    expect(tierAnnouncement(0, 5)).toBe('1st choice, Diamond');
    expect(tierAnnouncement(1, 5)).toBe('2nd choice, Gold');
    expect(tierAnnouncement(2, 5)).toBe('3rd choice, Silver');
    expect(tierAnnouncement(4, 5)).toBe('position 5 of 5, Bronze');
  });
});
```

And `src/components/__tests__/TierIcon.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TierIcon } from '../TierIcon';
import type { Tier } from '../../utils/tiers';

const tiers: Tier[] = ['diamond', 'gold', 'silver', 'bronze', 'iron'];

describe('TierIcon', () => {
  it.each(tiers)('renders a decorative svg for %s', (tier) => {
    const { container } = render(<TierIcon tier={tier} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass(`tier-icon-${tier}`);
  });
});
```

- [x] **Step 2:** Run both — expected FAIL (modules not found).

- [x] **Step 3: Create `src/utils/tiers.ts`:**

```ts
/**
 * The tier frame model (REDESIGN_SPEC §3.4). Position in the agreed pile IS
 * the tier: exactly one Diamond/Gold/Silver, everything else Bronze.
 * Iron is not positional — it marks disagreed quotes.
 */
export type Tier = 'diamond' | 'gold' | 'silver' | 'bronze' | 'iron';

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
  iron: { tier: 'iron', label: 'Disagreed', name: 'Iron' },
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

- [x] **Step 4: Create `src/components/TierIcon.tsx`:**

```tsx
import React from 'react';
import type { Tier } from '../utils/tiers';

export interface TierIconProps {
  tier: Tier;
  size?: number;
}

/**
 * Decorative tier glyphs (REDESIGN_SPEC §3.4): gem, medal-2, medal-3,
 * check-circle, slash-circle. Always paired with a visible text label —
 * the icon alone never carries the tier.
 */
export const TierIcon: React.FC<TierIconProps> = ({ tier, size = 14 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: `tier-icon tier-icon-${tier}`,
  };

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
          <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor" stroke="none">2</text>
        </svg>
      );
    case 'silver':
      return (
        <svg {...common}>
          <circle cx="12" cy="14" r="7" />
          <path d="M8.5 2.5 11 7.5M15.5 2.5 13 7.5" />
          <text x="12" y="17" textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor" stroke="none">3</text>
        </svg>
      );
    case 'bronze':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
        </svg>
      );
    case 'iron':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M5.6 5.6l12.8 12.8" />
        </svg>
      );
  }
};
```

- [x] **Step 5: Add tier tokens + frame classes to `src/index.css`.** Tokens go in the `:root` block (after the podium variables) and the `.dark` block (same position). Frame classes go in a new section after the Rank Sheet section.

In `:root` (light):

```css
  /* Tier frames (REDESIGN_SPEC §3.4) — hue is the LAST identity channel */
  --tier-diamond-bg: #eaf6fa;
  --tier-diamond-border: #2b7f96;
  --tier-diamond-ink: #06303a;
  --tier-gold-bg: #faf3dd;
  --tier-gold-border: #a07d1f;
  --tier-gold-ink: #3a2e00;
  --tier-silver-bg: #f1f4f6;
  --tier-silver-border: #5f7682;
  --tier-silver-ink: #243036;
  --tier-bronze-bg: #f5efe9;
  --tier-bronze-border: #8a6648;
  --tier-bronze-ink: #3a2a1a;
  --tier-iron-border: #8a939c;
  --tier-iron-ink: var(--text-tertiary);
```

In `.dark`:

```css
  --tier-diamond-bg: rgba(108, 198, 219, 0.1);
  --tier-diamond-border: #6cc6db;
  --tier-diamond-ink: #cfeaf2;
  --tier-gold-bg: rgba(254, 209, 46, 0.08);
  --tier-gold-border: #cfa84a;
  --tier-gold-ink: #ecdfae;
  --tier-silver-bg: rgba(159, 179, 189, 0.1);
  --tier-silver-border: #9fb3bd;
  --tier-silver-ink: #dbe4e9;
  --tier-bronze-bg: rgba(191, 154, 118, 0.1);
  --tier-bronze-border: #bf9a76;
  --tier-bronze-ink: #e8d8c8;
  --tier-iron-border: #6b7480;
```

New section (after Rank Sheet styles):

```css
/* ============================================
   Tier Frames (REDESIGN_SPEC §3.4)
   Identity channels in order: icon, label, frame treatment, hue.
   Grayscale test: double / 2px solid / 1.5px solid / 1px solid filled /
   1px dashed + hatch must stay distinguishable with color removed.
   ============================================ */

.tier-row {
  border-radius: 0.5rem;
  transition: border-color 0.25s ease, background-color 0.25s ease;
}

.tier-row-diamond {
  border: 4px double var(--tier-diamond-border);
  background-color: var(--tier-diamond-bg);
}

.tier-row-gold {
  border: 2px solid var(--tier-gold-border);
  background-color: var(--tier-gold-bg);
}

.tier-row-silver {
  border: 1.5px solid var(--tier-silver-border);
  background-color: var(--tier-silver-bg);
}

.tier-row-bronze {
  border: 1px solid var(--tier-bronze-border);
  background-color: var(--tier-bronze-bg);
}

.tier-row-iron {
  position: relative;
  border: 1px dashed var(--tier-iron-border);
  background: none;
  overflow: hidden;
}

/* Hatch strip — the "raw ore" texture cue, color-independent */
.tier-row-iron::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background-image: repeating-linear-gradient(
    45deg,
    var(--tier-iron-border) 0 2px,
    transparent 2px 5px
  );
  opacity: 0.55;
}

.tier-row-iron .tier-iron-muted { opacity: 0.75; }

.tier-label {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.125rem;
}

.tier-label-diamond { color: var(--tier-diamond-ink); }
.tier-label-gold { color: var(--tier-gold-ink); }
.tier-label-silver { color: var(--tier-silver-ink); }
.tier-label-bronze { color: var(--tier-bronze-ink); }
.tier-label-iron { color: var(--tier-iron-ink); }

.tier-icon-diamond { color: var(--tier-diamond-border); }
.tier-icon-gold { color: var(--tier-gold-border); }
.tier-icon-silver { color: var(--tier-silver-border); }
.tier-icon-bronze { color: var(--tier-bronze-border); }
.tier-icon-iron { color: var(--tier-iron-border); }

.tier-rank-num {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 0.75rem;
  color: var(--text-secondary);
  min-width: 1.25rem;
  text-align: center;
  flex-shrink: 0;
}

/* Ghost slots — unfilled podium positions teach the structure */
.tier-ghost {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  opacity: 0.65;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tier-ghost-diamond { border: 2px dashed var(--tier-diamond-border); color: var(--tier-diamond-ink); }
.tier-ghost-gold { border: 2px dashed var(--tier-gold-border); color: var(--tier-gold-ink); }
.tier-ghost-silver { border: 2px dashed var(--tier-silver-border); color: var(--tier-silver-ink); }

/* Iron severance — spatial cue #1: a different shelf, not the next rung */
.iron-divider {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 1rem 0 0.5rem;
  font-family: 'Manrope', sans-serif;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.iron-divider::before,
.iron-divider::after {
  content: '';
  flex: 1;
  border-top: 1px dashed var(--tier-iron-border);
}
```

- [x] **Step 6:** Run the two new test files (3 + 5 passed), full suite (`npm test`, expect 49), `npm run build` (exit 0), `npm run lint` (no new problems; baseline 12).

- [x] **Step 7: Commit**

```bash
git add src/utils/ src/components/TierIcon.tsx src/components/__tests__/TierIcon.test.tsx src/index.css
git commit -m "feat: tier model, tier icons, and tier frame design tokens"
```

(End every commit in this plan with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`)

---

### Task 2: Tier frames in RankList rows + ghost slots + tier announcements

**Files:**
- Modify: `src/components/RankList.tsx`, `src/components/__tests__/RankList.test.tsx`

- [x] **Step 1: Update/extend the tests.** In `src/components/__tests__/RankList.test.tsx`:

(a) UPDATE the existing announcement test — moving row 1 down lands at position 2 = Gold:

```tsx
  it('announces moves with the tier', async () => {
    render(<RankList items={items} onReorder={vi.fn()} showMoveButtons />);
    await userEvent.click(screen.getByRole('button', { name: /move down, currently ranked 1/i }));
    const region = screen.getAllByRole('status').find((el) => /moved/i.test(el.textContent ?? ''));
    expect(region).toHaveTextContent(/moved .*to 2nd choice, gold/i);
  });
```

(Replace the old `/moved .*to position 2 of 3/i` assertion with this — keep the same test slot.)

(b) ADD new tests at the end of the describe block:

```tsx
  it('frames the top three rows by tier with icon labels', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.getByText('1st choice')).toBeInTheDocument();
    expect(screen.getByText('2nd choice')).toBeInTheDocument();
    expect(screen.getByText('3rd choice')).toBeInTheDocument();
    expect(screen.getByText('Alpha quote.').closest('.tier-row')).toHaveClass('tier-row-diamond');
    expect(screen.getByText('Bravo quote.').closest('.tier-row')).toHaveClass('tier-row-gold');
    expect(screen.getByText('Charlie quote.').closest('.tier-row')).toHaveClass('tier-row-silver');
  });

  it('frames rows past third as Bronze without a per-row label', () => {
    const four = [...items, { id: 'd', text: 'Delta quote.', candidateToken: 't4', topicKey: 'k', addedAt: 4 }];
    render(<RankList items={four} onReorder={vi.fn()} />);
    expect(screen.getByText('Delta quote.').closest('.tier-row')).toHaveClass('tier-row-bronze');
    expect(screen.queryByText('Agreed')).not.toBeInTheDocument();
  });

  it('renders ghost slots for unfilled podium positions', () => {
    render(<RankList items={items.slice(0, 1)} onReorder={vi.fn()} showGhostSlots />);
    expect(screen.getByText('Alpha quote.').closest('.tier-row')).toHaveClass('tier-row-diamond');
    const ghosts = document.querySelectorAll('.tier-ghost');
    expect(ghosts).toHaveLength(2);
    expect(ghosts[0]).toHaveClass('tier-ghost-gold');
    expect(ghosts[1]).toHaveClass('tier-ghost-silver');
  });

  it('renders three ghost slots instead of the empty state when showGhostSlots', () => {
    render(<RankList items={[]} onReorder={vi.fn()} showGhostSlots />);
    expect(document.querySelectorAll('.tier-ghost')).toHaveLength(3);
    expect(screen.queryByText(/agree with quotes/i)).not.toBeInTheDocument();
  });
```

- [x] **Step 2:** Run — the updated announcement test and all four new tests FAIL.

- [x] **Step 3: Implement in `src/components/RankList.tsx`.**

Add imports:

```tsx
import { TIER_META, tierAnnouncement, tierForIndex } from '../utils/tiers';
import { TierIcon } from './TierIcon';
```

Delete the `PODIUM_LABELS` constant.

In `SortableRow`: replace the `badgeClass`/`podiumClass` lines and the row's inline background/border styling with tier classes. The row's outer div becomes:

```tsx
  const tier = tierForIndex(index);
  const meta = TIER_META[tier];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        padding: compact ? '0.5rem 0.625rem' : '0.625rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        opacity: isDragging ? 0.85 : 1,
      }}
      className={`tier-row tier-row-${tier} ${isDragging ? 'rank-row-dragging' : ''}`}
    >
```

(Remove `backgroundColor`, `border`, and `borderRadius` from the inline style — the tier classes own them now.)

Replace `<span className={badgeClass}>{rank}</span>` with:

```tsx
      <span className="tier-rank-num" aria-hidden="true">{rank}</span>
```

Replace the `{isPodium && (...)}` label block with:

```tsx
        {tier !== 'bronze' && (
          <div className={`tier-label tier-label-${tier}`}>
            <TierIcon tier={tier} size={12} />
            {meta.label}
          </div>
        )}
```

(Keep `isPodium` deleted if now unused.)

Update the grip button's aria-label so screen readers hear the tier:

```tsx
        aria-label={`Reorder, currently ranked ${rank}, ${meta.name}`}
```

In `RankList`: add the `showGhostSlots?: boolean` prop to `RankListProps`:

```tsx
  /** Render dashed tier slots for unfilled podium positions. */
  showGhostSlots?: boolean;
```

Accept it in the component signature. Change `handleMove`'s announcement line to:

```tsx
    setAnnouncement(`Moved "${stub}" to ${tierAnnouncement(to, ids.length)}`);
```

Change the empty-state branch: when `showGhostSlots` is set, skip the empty-state box (ghosts render below instead):

```tsx
  if (items.length === 0 && !showGhostSlots) {
```

Add the ghost slots inside the `motion.div` (after the rows map):

```tsx
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
```

NOTE: with `items.length === 0` and `showGhostSlots`, the component must still render the `DndContext` wrapper (or a plain div) so ghosts appear — verify the early return only fires for the no-ghost case.

- [x] **Step 4:** Run the RankList test file (9 passed), full suite (`npm test`, expect 53), build, lint (baseline).

- [x] **Step 5: Commit**

```bash
git add src/components/RankList.tsx src/components/__tests__/RankList.test.tsx
git commit -m "feat: tier-framed rank rows, ghost podium slots, tier announcements"
```

---

### Task 3: RankRail — unify the rank surface, sever Iron

**Files:**
- Create: `src/components/RankRail.tsx`, `src/components/__tests__/RankRail.test.tsx`
- Modify: `src/components/RankSheet.tsx`, `src/components/AgreedQuotesSidebar.tsx`, `src/index.css`

- [x] **Step 1: Write the failing tests** — create `src/components/__tests__/RankRail.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankRail } from '../RankRail';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-rail',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'q1', text: 'Rail agreed quote.', candidateToken: 'a', topicKey: 'housing' },
        { id: 'q2', text: 'Rail disagreed quote.', candidateToken: 'b', topicKey: 'housing' },
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
});

describe('RankRail', () => {
  it('shows three ghost slots before anything is ranked', () => {
    render(<RankRail variant="sidebar" />);
    expect(document.querySelectorAll('.tier-ghost')).toHaveLength(3);
  });

  it('severs Iron below a labeled divider', async () => {
    const [q1, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().disagree(q2);
    render(<RankRail variant="sheet" />);
    expect(screen.getByText(/you disagreed with everything below this line/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /disagreed \(1\)/i }));
    const ironRow = screen.getByText('Rail disagreed quote.').closest('.tier-row');
    expect(ironRow).toHaveClass('tier-row-iron');
  });

  it('omits the severance line when nothing is agreed yet', () => {
    const [, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().disagree(q2);
    render(<RankRail variant="sheet" />);
    expect(screen.queryByText(/below this line/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disagreed \(1\)/i })).toBeInTheDocument();
  });

  it('recovers a disagreed quote into the ranking', async () => {
    const [q1, q2] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().disagree(q2);
    render(<RankRail variant="sheet" />);
    await userEvent.click(screen.getByRole('button', { name: /disagreed \(1\)/i }));
    await userEvent.click(screen.getByRole('button', { name: /move to agreed/i }));
    expect(useReadRankStore.getState().getCurrentRaceProgress()!.agreed.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(screen.queryByRole('button', { name: /disagreed \(/i })).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2:** Run — FAIL (module not found).

- [x] **Step 3: Create `src/components/RankRail.tsx`** (the Iron markup moves here from RankSheet, upgraded to tier-row-iron with TierIcon):

```tsx
import React, { useState } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { RankList } from './RankList';
import { TierIcon } from './TierIcon';

export interface RankRailProps {
  /** 'sidebar' = desktop rail; 'sheet' = mobile bottom sheet (compact + long-press). */
  variant: 'sidebar' | 'sheet';
}

/**
 * The unified rank surface (REDESIGN_SPEC §3.2): tier-framed list with ghost
 * podium slots, and the Iron section severed below a labeled divider with
 * per-quote recovery. Used by the desktop sidebar and the mobile sheet.
 */
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

      {disagreed.length > 0 && (
        <section className="rank-rail-iron">
          {agreed.length > 0 && (
            <div className="iron-divider" role="separator">
              <span>You disagreed with everything below this line</span>
            </div>
          )}
          <button
            type="button"
            className="rank-sheet-iron-toggle"
            aria-expanded={showDisagreed}
            aria-label={`Disagreed (${disagreed.length})`}
            onClick={() => setShowDisagreed((p) => !p)}
          >
            <TierIcon tier="iron" size={13} />
            Disagreed ({disagreed.length})
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              style={{ transform: showDisagreed ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {showDisagreed && (
            <div className="rank-rail-iron-list">
              {disagreed.map((q) => (
                <div key={q.id} className="tier-row tier-row-iron rank-rail-iron-row">
                  <TierIcon tier="iron" size={13} />
                  <span className="rank-rail-iron-stub tier-iron-muted">{q.text}</span>
                  <button type="button" className="rank-sheet-iron-recover" onClick={() => reAgree(q)}>
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

- [x] **Step 4: Slim `src/components/RankSheet.tsx`.** Replace the entire `rank-sheet-body` contents (the `RankList` AND the `disagreed.length > 0` iron `<section>`) with:

```tsx
      <div className="rank-sheet-body">
        <RankRail variant="sheet" />
      </div>
```

Then remove from RankSheetDialog everything now unused: the `showDisagreed` state, `reorderAgreed`/`reAgree` from the store destructure (keep `getCurrentRaceProgress` — `agreed` still gates the footer), the `disagreed` derivation, the `RankList` import (replaced by `import { RankRail } from './RankRail';`), and the `useState` import if unused.

- [x] **Step 5: Slim `src/components/AgreedQuotesSidebar.tsx`.** Replace the `<RankList items={agreed} onReorder={reorderAgreed} />` line with `<RankRail variant="sidebar" />`, delete the `disagreedCount` derivation and the trailing "N disagreed" paragraph (the rail's Iron section replaces it), update the hint copy (the current one has an em dash) to:

```tsx
          Drag to rank.&nbsp; Your top 3 carry the most weight.
```

Adjust imports (`RankList` → `RankRail`; drop `reorderAgreed` from the destructure if unused).

- [x] **Step 6: Add rail CSS to `src/index.css`** (after the Tier Frames section):

```css
.rank-rail {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rank-rail-iron-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.rank-rail-iron-row {
  align-items: center;
  display: flex;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem 0.5rem 0.875rem;
}

.rank-rail-iron-stub {
  flex: 1;
  min-width: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
  color: var(--tier-iron-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

Then DELETE the now-unused `.rank-sheet-iron-list`, `.rank-sheet-iron-row`, and `.rank-sheet-iron-stub` rules (KEEP `.rank-sheet-iron-toggle` and `.rank-sheet-iron-recover` — RankRail reuses them).

- [x] **Step 7:** Run the RankRail test file (4 passed) and the FULL suite — the existing RankSheet tests must still pass unchanged (their accessible names were preserved: `Disagreed (1)` toggle, `Move to agreed`, recovery assertions). Expect 57 total. Build + lint clean.

- [x] **Step 8: Commit**

```bash
git add src/components/RankRail.tsx src/components/__tests__/RankRail.test.tsx src/components/RankSheet.tsx src/components/AgreedQuotesSidebar.tsx src/index.css
git commit -m "feat: unified RankRail with Iron severance, recover, and ghost slots"
```

---

### Task 4: Tier frames on the dock slots

**Files:**
- Modify: `src/components/RankDock.tsx`, `src/components/__tests__/RankDock.test.tsx`, `src/index.css`

- [x] **Step 1: Extend the dock tests** — add to `src/components/__tests__/RankDock.test.tsx`:

```tsx
  it('frames filled slots by tier', () => {
    const agreed = [quote('a', 'Alpha quote.'), quote('b', 'Bravo quote.')];
    render(<RankDock agreed={agreed} disagreedCount={0} onOpen={vi.fn()} />);
    expect(screen.getByText('Alpha quote.').closest('.rank-dock-slot')).toHaveClass('rank-dock-slot-diamond');
    expect(screen.getByText('Bravo quote.').closest('.rank-dock-slot')).toHaveClass('rank-dock-slot-gold');
    expect(screen.getByText('3rd')).toBeInTheDocument();
  });
```

- [x] **Step 2:** Run — FAIL (no tier classes yet).

- [x] **Step 3: Implement in `src/components/RankDock.tsx`.** Import the tier model:

```tsx
import { tierForIndex } from '../utils/tiers';
```

In the slots map, change the filled-slot className:

```tsx
            const tier = tierForIndex(i);
            return (
              <span key={i} className={`rank-dock-slot ${q ? `rank-dock-slot-${tier}` : 'rank-dock-slot-empty'}`}>
```

- [x] **Step 4: Add slot tier styles to `src/index.css`** (in the Rank Dock section, after `.rank-dock-slot-empty`):

```css
.rank-dock-slot-diamond {
  border: 3px double var(--tier-diamond-border);
  background-color: var(--tier-diamond-bg);
}

.rank-dock-slot-gold {
  border: 2px solid var(--tier-gold-border);
  background-color: var(--tier-gold-bg);
}

.rank-dock-slot-silver {
  border: 1.5px solid var(--tier-silver-border);
  background-color: var(--tier-silver-bg);
}

.rank-dock-slot-diamond .rank-dock-slot-rank { color: var(--tier-diamond-ink); }
.rank-dock-slot-gold .rank-dock-slot-rank { color: var(--tier-gold-ink); }
.rank-dock-slot-silver .rank-dock-slot-rank { color: var(--tier-silver-ink); }
.rank-dock-slot-diamond .rank-dock-slot-stub { color: var(--tier-diamond-ink); }
.rank-dock-slot-gold .rank-dock-slot-stub { color: var(--tier-gold-ink); }
.rank-dock-slot-silver .rank-dock-slot-stub { color: var(--tier-silver-ink); }
```

- [x] **Step 5:** Run the dock tests (4 passed), full suite (expect 58), build, lint. Commit:

```bash
git add src/components/RankDock.tsx src/components/__tests__/RankDock.test.tsx src/index.css
git commit -m "feat: tier-framed dock slots"
```

---

### Task 5: Final verification

- [x] **Step 1:** `npm test` (58), `npm run lint` (baseline 12, none new), `npm run build` (exit 0).

- [x] **Step 2: Browser walkthrough — mobile (375px) + desktop, light + dark.**

Mobile:
1. Fresh race: dock shows three ghost slots; sheet (via dock) shows three tier ghost slots instead of the empty hint.
2. Agree ×4, disagree ×1: dock slots 1–3 framed Diamond (double) / Gold (2px) / Silver (1.5px) with tinted backgrounds; "+1" and "⊘ 1" counters.
3. Sheet: rows framed by tier with icon + "1st/2nd/3rd choice" labels; row 4 Bronze (filled, no label); severance divider "You disagreed with everything below this line"; Iron rows dashed with hatch strip and muted text; Move to agreed recovers (row turns Bronze at the bottom); ▲▼ move announces "Moved … to 2nd choice, Gold".
4. Drag a row across a tier boundary: frame transitions smoothly (border/background 0.25s); with reduced motion emulated, transitions are instant (global media rule).

Desktop:
5. Sidebar shows the same tier language: ghost slots when empty, tier-framed rows, Iron section with severance + recover. The old yellow/coral podium left-borders are gone from rank rows.
6. Reveal screen unchanged (candidate badges still use podium classes — that redesign is priority #4).

Dark mode (toggle the app theme): all five frames legible, tinted backgrounds subtle, borders ≥3:1 against the card surface.

Grayscale sanity: with `document.documentElement.style.filter = 'grayscale(1)'` applied in the console, the five treatments remain distinguishable (double / 2px / 1.5px / filled / dashed+hatch).

- [x] **Step 3:** Fix anything found (small inline commits), then hand off via superpowers:finishing-a-development-branch.

---

## Execution Notes (recorded during implementation)

- Contrast math independently verified in review: all inks 12:1+, borders 3.09:1 to 8.28:1; iron border passes only on card surfaces (both consumers render on --surface-card; verified).
- dnd-kit's inline transition overrides class transitions during drags — merged via [transition, frameTransition].filter(Boolean).join(', ') so tier frames animate across boundaries mid-drag.
- Move-button aria-labels carry the tier name (symmetry with the grip label).
- Ghost slots are aria-hidden; an sr-only "Nothing ranked yet" hint covers screen readers when the rail is empty (tested).
- The medal icons' SVG numerals concatenate into textContent ("22nd choice" in DOM probes) — harmless: aria-hidden excludes them from accessible names and RTL matches text nodes.
- 1x-DPR caveat (recorded as accepted tradeoff): gold/silver/bronze grayscale separation relies on border width, which can round at DPR 1; icon + label carry identity there per §7.3 priority order.
- Browser-verified: mobile dark sheet (all five frames + severance + recover), desktop light sidebar, full-page grayscale(1) pass. PracticeRound rows inherit tier frames (intended — teaches the real ranking language).
