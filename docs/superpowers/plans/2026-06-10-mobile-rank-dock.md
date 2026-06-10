# Mobile Rank Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship priority #2 from REDESIGN_SPEC.md (§1.3, §2) — the mobile combined Evaluate+Rank layout: a persistent collapsed Rank Dock (live scoreboard of the top 3 + Bronze/Iron counters), an expandable bottom-sheet ranking surface with long-press drag and ▲▼ move buttons, recoverable disagreed quotes, auto-expand on completion with a pinned See Results, co-equal Agree/Disagree buttons on touch devices, and an axis-locked quote card.

**Architecture:** Two new components (`RankDock`, `RankSheet`) replace the mobile `rank-counter-pill` + `InlineRankPanel` pattern in `EvaluationPhase`. The sheet reuses the native-`<dialog>` pattern proven in `SourceExplainer` (focus trap + Esc free; StrictMode close-event guard required — see Execution Notes in the two-stage-trust plan). `RankList` gains long-press drag activation and move buttons. One new store action (`reAgree`) makes disagreed quotes recoverable. Desktop layout is untouched.

**Tech Stack:** React 19, framer-motion (dock pulse, handle drag-to-dismiss), @dnd-kit (existing sort machinery), zustand, native `<dialog>`, vitest + RTL (23 tests passing at start).

**Design contract:** REDESIGN_SPEC.md §1.3 (dock anatomy, gesture rules), §2 (pattern summary), §3.3 (56px ActionButtons). Copy rules: no em dashes; two spaces after periods via `&nbsp;` + space.

**Gesture ownership rules being implemented (spec §1.3):**
1. QuoteCard owns horizontal only → framer `drag="x"` + `touchAction: 'pan-y'`.
2. Sheet vertical drag from its handle region only.
3. Reorder in the sheet = long-press lift (250ms) on the grip, or ▲▼ buttons.
4. One gesture context at a time → the sheet is a modal `<dialog>` (background inert while open).

**Scope cuts (recorded):** PracticeRound keeps its existing inline rank pattern (the dock is the real-race experience). Desktop rail unification into one RankRail (spec §3.2) is deferred. Tier frames (Diamond/Gold/Silver visual language) are priority #3 — the dock uses rank numerals 1/2/3 until then.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/store/useReadRankStore.ts` | Modify | Add `reAgree` action (disagreed → agreed, recoverable verdicts) |
| `src/store/__tests__/reAgree.test.ts` | Create | Store action behavior |
| `src/components/RankList.tsx` | Modify | `longPressDrag` + `showMoveButtons` props, move announcements |
| `src/components/__tests__/RankList.test.tsx` | Create | Move buttons, boundaries, announcements |
| `src/components/RankDock.tsx` | Create | Collapsed bottom strip: slots, counters, pulse, open trigger |
| `src/components/__tests__/RankDock.test.tsx` | Create | Slots/ghosts/counters/aria/open |
| `src/components/RankSheet.tsx` | Create | Bottom-sheet dialog: rank list, Iron section, completion footer |
| `src/components/__tests__/RankSheet.test.tsx` | Create | Open/close, reorder surface, reAgree, See Results |
| `src/components/EvaluationPhase.tsx` | Modify | Mobile wiring: dock+sheet replace pill+panel; buttons on touch |
| `src/components/QuoteCard.tsx` | Modify | Axis-locked drag |
| `src/components/InlineRankPanel.tsx` | Delete | Superseded by RankSheet |
| `src/index.css` | Modify | Dock/sheet styles; un-hide action buttons on touch; 56px touch targets |

---

### Task 0: Branch

- [x] **Step 1:**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
git checkout -b feat/mobile-rank-dock
```

---

### Task 1: Store — `reAgree` action

Disagreed quotes become recoverable: `reAgree` removes a quote from its topic's `disagreed` list and appends it to the race-wide `agreed` pile (bottom position — never displaces the user's ranking). Undo is a trust feature (spec §1.2).

**Files:**
- Modify: `src/store/useReadRankStore.ts`
- Test: `src/store/__tests__/reAgree.test.ts`

- [x] **Step 1: Write the failing tests** — create `src/store/__tests__/reAgree.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useReadRankStore } from '../useReadRankStore';
import type { RacePayload } from '../useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-test',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'q1', text: 'Quote one.', candidateToken: 'tok-a', topicKey: 'housing' },
        { id: 'q2', text: 'Quote two.', candidateToken: 'tok-b', topicKey: 'housing' },
      ],
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
});

describe('reAgree', () => {
  it('moves a disagreed quote to the bottom of the agreed pile', () => {
    const s = useReadRankStore.getState();
    const [q1, q2] = payload.topics[0].quotes;
    s.agree(q1);
    s.disagree(q2);

    let race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.disagreed.map((q) => q.id)).toEqual(['q2']);

    useReadRankStore.getState().reAgree(q2);

    race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.topics.housing.disagreed).toEqual([]);
    expect(race.agreed.map((q) => q.id)).toEqual(['q1', 'q2']);
  });

  it('is a no-op when the quote is already agreed', () => {
    const s = useReadRankStore.getState();
    const [q1] = payload.topics[0].quotes;
    s.agree(q1);
    useReadRankStore.getState().reAgree(q1);
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.agreed.map((q) => q.id)).toEqual(['q1']);
  });

  it('does not advance the topic evaluation index', () => {
    const s = useReadRankStore.getState();
    const [q1] = payload.topics[0].quotes;
    s.disagree(q1);
    const before = useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.currentIndex;
    useReadRankStore.getState().reAgree(q1);
    const after = useReadRankStore.getState().getCurrentRaceProgress()!.topics.housing.currentIndex;
    expect(after).toBe(before);
  });
});
```

- [x] **Step 2:** Run `npm test -- src/store/__tests__/reAgree.test.ts`
Expected: FAIL — `reAgree is not a function`.

- [x] **Step 3: Implement.** In `src/store/useReadRankStore.ts`:

Add to the `ReadRankState` interface, after `reorderAgreed: (orderedIds: string[]) => void;`:

```ts
  /** Recover a disagreed quote: remove from its topic's disagreed list, append to agreed. */
  reAgree: (quote: BlindQuote) => void;
```

Add the implementation in the store body, after the `reorderAgreed` action:

```ts
      reAgree: (quote) => {
        const patch = withCurrentRace(get(), (race) => {
          if (race.agreed.some((q) => q.id === quote.id)) return race;
          const topic = race.topics[quote.topicKey];
          if (!topic) return race;
          return {
            ...race,
            agreed: [...race.agreed, { ...quote, addedAt: Date.now() }],
            topics: {
              ...race.topics,
              [quote.topicKey]: {
                ...topic,
                disagreed: topic.disagreed.filter((q) => q.id !== quote.id),
              },
            },
          };
        });
        if (patch) set(patch);
      },
```

- [x] **Step 4:** Run the test file — expected: 3 passed. Then `npm test` (expect 26) and `npm run build` (exit 0).

- [x] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: reAgree store action makes disagreed quotes recoverable"
```

(End every commit in this plan with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`)

---

### Task 2: RankList — long-press drag, move buttons, announcements

The sheet needs scroll-safe reorder (long-press lift on the grip) and a pointer-free alternative (▲▼ buttons, 44px targets) per spec §1.3 and §7.1. Both are opt-in props so the desktop sidebar is untouched.

**Files:**
- Modify: `src/components/RankList.tsx`
- Test: `src/components/__tests__/RankList.test.tsx`

- [x] **Step 1: Write the failing tests** — create `src/components/__tests__/RankList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankList } from '../RankList';
import type { AgreedQuote } from '../../store/useReadRankStore';

const items: AgreedQuote[] = [
  { id: 'a', text: 'Alpha quote.', candidateToken: 't1', topicKey: 'k', addedAt: 1 },
  { id: 'b', text: 'Bravo quote.', candidateToken: 't2', topicKey: 'k', addedAt: 2 },
  { id: 'c', text: 'Charlie quote.', candidateToken: 't3', topicKey: 'k', addedAt: 3 },
];

describe('RankList move buttons', () => {
  it('renders no move buttons by default', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /move up/i })).not.toBeInTheDocument();
  });

  it('moves a row down and reports the new order', async () => {
    const onReorder = vi.fn();
    render(<RankList items={items} onReorder={onReorder} showMoveButtons />);
    await userEvent.click(screen.getByRole('button', { name: /move down.*ranked 1/i }));
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('moves a row up and reports the new order', async () => {
    const onReorder = vi.fn();
    render(<RankList items={items} onReorder={onReorder} showMoveButtons />);
    await userEvent.click(screen.getByRole('button', { name: /move up.*ranked 3/i }));
    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('disables the boundary buttons', () => {
    render(<RankList items={items} onReorder={vi.fn()} showMoveButtons />);
    expect(screen.getByRole('button', { name: /move up.*ranked 1/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move down.*ranked 3/i })).toBeDisabled();
  });

  it('announces moves through a status region', async () => {
    render(<RankList items={items} onReorder={vi.fn()} showMoveButtons />);
    await userEvent.click(screen.getByRole('button', { name: /move down.*ranked 1/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/moved to position 2 of 3/i);
  });
});
```

- [x] **Step 2:** Run the test file — expected FAIL (no move buttons exist).

- [x] **Step 3: Implement in `src/components/RankList.tsx`.**

Add `useState` to the React import:

```tsx
import React, { useState } from 'react';
```

Extend `RankListProps`:

```tsx
interface RankListProps {
  items: AgreedQuote[];
  onReorder: (orderedIds: string[]) => void;
  compact?: boolean;
  emptyHint?: string;
  /** 250ms long-press drag activation — use inside scrollable sheets. */
  longPressDrag?: boolean;
  /** Pointer-free reorder: 44px up/down buttons per row. */
  showMoveButtons?: boolean;
}
```

Extend `RowProps` and `SortableRow` — add after the existing props:

```tsx
interface RowProps {
  quote: AgreedQuote;
  index: number;
  compact?: boolean;
  onMove?: (from: number, dir: -1 | 1) => void;
  isFirst?: boolean;
  isLast?: boolean;
}
```

In `SortableRow`, accept `onMove`, `isFirst`, `isLast` in the destructure, and render the buttons after the quote-text `<div style={{ flex: 1 ... }}>` block (inside the row, as the last children):

```tsx
      {onMove && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.125rem' }}>
          <button
            type="button"
            className="rank-move-button"
            aria-label={`Move up — currently ranked ${rank}`}
            disabled={isFirst}
            onClick={() => onMove(index, -1)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6" /></svg>
          </button>
          <button
            type="button"
            className="rank-move-button"
            aria-label={`Move down — currently ranked ${rank}`}
            disabled={isLast}
            onClick={() => onMove(index, 1)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </span>
      )}
```

In `RankList`, accept the new props, switch the pointer sensor, add the move handler + announcement state:

```tsx
export const RankList: React.FC<RankListProps> = ({ items, onReorder, compact, emptyHint, longPressDrag, showMoveButtons }) => {
  const [announcement, setAnnouncement] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: longPressDrag ? { delay: 250, tolerance: 8 } : { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleMove = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= items.length) return;
    const ids = items.map((q) => q.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    onReorder(ids);
    setAnnouncement(`Moved to position ${to + 1} of ${ids.length}`);
  };
```

Pass to rows inside the map:

```tsx
            <SortableRow
              key={q.id}
              quote={q}
              index={i}
              compact={compact}
              onMove={showMoveButtons ? handleMove : undefined}
              isFirst={i === 0}
              isLast={i === items.length - 1}
            />
```

Render the status region just inside the returned `DndContext`, after `</SortableContext>`:

```tsx
      <div className="sr-only" role="status">{announcement}</div>
```

Add the button style to `src/index.css` (near `.rank-drag-handle` rules if present, otherwise with the other rank styles):

```css
.rank-move-button {
  background: none;
  border: 1px solid var(--border-subtle);
  border-radius: 0.375rem;
  color: var(--text-secondary);
  min-width: 2.75rem;
  min-height: 1.375rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.rank-move-button:disabled { opacity: 0.35; cursor: default; }
@media (pointer: coarse) {
  .rank-move-button { min-height: 2.75rem; }
}
```

- [x] **Step 4:** Run the test file (5 passed), full suite, build. Note: the two stacked ▲▼ buttons are 22px tall on fine pointers (compact desktop affordance) and 44px on coarse pointers via the media query — the WCAG target floor applies to the touch context.

- [x] **Step 5: Commit**

```bash
git add src/components/RankList.tsx src/components/__tests__/RankList.test.tsx src/index.css
git commit -m "feat: RankList long-press drag, move buttons, and move announcements"
```

---

### Task 3: RankDock — the collapsed strip

**Files:**
- Create: `src/components/RankDock.tsx`
- Test: `src/components/__tests__/RankDock.test.tsx`
- Modify: `src/index.css`

- [x] **Step 1: Write the failing tests** — create `src/components/__tests__/RankDock.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankDock } from '../RankDock';
import type { AgreedQuote } from '../../store/useReadRankStore';

const quote = (id: string, text: string): AgreedQuote => ({
  id, text, candidateToken: 't', topicKey: 'k', addedAt: 1,
});

describe('RankDock', () => {
  it('shows ghost slots when nothing is ranked', () => {
    render(<RankDock agreed={[]} disagreedCount={0} onOpen={vi.fn()} />);
    expect(screen.getByText('1st')).toBeInTheDocument();
    expect(screen.getByText('2nd')).toBeInTheDocument();
    expect(screen.getByText('3rd')).toBeInTheDocument();
  });

  it('fills slots with quote stubs and shows overflow + disagreed counters', () => {
    const agreed = [quote('a', 'Alpha quote.'), quote('b', 'Bravo quote.'), quote('c', 'Charlie quote.'), quote('d', 'Delta quote.'), quote('e', 'Echo quote.')];
    render(<RankDock agreed={agreed} disagreedCount={2} onOpen={vi.fn()} />);
    expect(screen.getByText('Alpha quote.')).toBeInTheDocument();
    expect(screen.getByText('Charlie quote.')).toBeInTheDocument();
    expect(screen.queryByText('Delta quote.')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText(/⊘ 2/)).toBeInTheDocument();
  });

  it('is one labeled button that opens the sheet', async () => {
    const onOpen = vi.fn();
    render(<RankDock agreed={[quote('a', 'Alpha quote.')]} disagreedCount={1} onOpen={onOpen} />);
    const dock = screen.getByRole('button', { name: /open your ranking.*1 ranked.*1 disagreed/i });
    await userEvent.click(dock);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 2:** Run — expected FAIL (module not found).

- [x] **Step 3: Create `src/components/RankDock.tsx`:**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { AgreedQuote } from '../store/useReadRankStore';

const GHOST_LABELS = ['1st', '2nd', '3rd'];

export interface RankDockProps {
  agreed: AgreedQuote[];
  disagreedCount: number;
  onOpen: () => void;
}

/**
 * Collapsed mobile rank strip (REDESIGN_SPEC §1.3): a live, glanceable
 * scoreboard of the top 3 + overflow/disagreed counters, and the single
 * entry point to the RankSheet. Always visible during mobile evaluation.
 */
export const RankDock = React.forwardRef<HTMLButtonElement, RankDockProps>(
  ({ agreed, disagreedCount, onOpen }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const prevCount = useRef(agreed.length);
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
      if (agreed.length > prevCount.current) {
        setPulse(true);
        const t = setTimeout(() => setPulse(false), 500);
        prevCount.current = agreed.length;
        return () => clearTimeout(t);
      }
      prevCount.current = agreed.length;
    }, [agreed.length]);

    const overflow = Math.max(0, agreed.length - 3);

    return (
      <motion.button
        ref={ref}
        type="button"
        className="rank-dock"
        onClick={onOpen}
        aria-label={`Open your ranking. ${agreed.length} ranked, ${disagreedCount} disagreed.`}
        animate={pulse && !prefersReducedMotion ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <span className="rank-dock-handle" aria-hidden="true" />
        <span className="rank-dock-row">
          {[0, 1, 2].map((i) => {
            const q = agreed[i];
            return (
              <span key={i} className={`rank-dock-slot ${q ? '' : 'rank-dock-slot-empty'}`}>
                <span className="rank-dock-slot-rank" aria-hidden="true">{i + 1}</span>
                {q ? (
                  <span className="rank-dock-slot-stub">{q.text}</span>
                ) : (
                  <span className="rank-dock-slot-ghost">{GHOST_LABELS[i]}</span>
                )}
              </span>
            );
          })}
          {overflow > 0 && <span className="rank-dock-counter">+{overflow}</span>}
          {disagreedCount > 0 && (
            <span className="rank-dock-counter rank-dock-counter-iron">⊘ {disagreedCount}</span>
          )}
          <svg className="rank-dock-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </span>
      </motion.button>
    );
  }
);
RankDock.displayName = 'RankDock';
```

- [x] **Step 4: Add dock styles to `src/index.css`** (new section after the Inline Rank Panel section):

```css
/* ============================================
   Rank Dock (mobile collapsed strip)
   ============================================ */

.rank-dock {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background-color: var(--surface-card);
  border: none;
  border-top: 1px solid var(--border-subtle);
  box-shadow: 0 -4px 16px rgba(28, 28, 28, 0.08);
  padding: 0.25rem 0.875rem calc(0.5rem + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
  cursor: pointer;
  min-height: 3.5rem;
}

.rank-dock-handle {
  width: 2.25rem;
  height: 0.25rem;
  border-radius: 9999px;
  background-color: var(--border-medium);
  margin: 0.25rem auto 0;
}

.rank-dock-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.rank-dock-slot {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  padding: 0.25rem 0.375rem;
  background-color: var(--surface-sunken);
  min-width: 0;
  flex: 1 1 0;
  overflow: hidden;
}

.rank-dock-slot-empty {
  border-style: dashed;
  background: none;
  opacity: 0.7;
}

.rank-dock-slot-rank {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 0.6875rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.rank-dock-slot-stub,
.rank-dock-slot-ghost {
  font-family: 'Manrope', sans-serif;
  font-size: 0.6875rem;
  color: var(--text-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-dock-slot-ghost { color: var(--text-tertiary); }

.rank-dock-counter {
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 0.6875rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.rank-dock-counter-iron { color: var(--text-tertiary); }

.rank-dock-chevron { color: var(--text-tertiary); flex-shrink: 0; }
```

- [x] **Step 5:** Run the test file (3 passed), full suite, build. Commit:

```bash
git add src/components/RankDock.tsx src/components/__tests__/RankDock.test.tsx src/index.css
git commit -m "feat: RankDock collapsed mobile rank strip"
```

---

### Task 4: RankSheet — the bottom-sheet ranking surface

Native `<dialog>` (focus trap + Esc free, background inert = one gesture context at a time). **Carry the StrictMode lesson:** the dialog's `onClose` must ignore stale close events (`if (!ref.current?.open)` guard) and the jsdom stub queues close events — both already in place from the two-stage-trust work.

**Files:**
- Create: `src/components/RankSheet.tsx`
- Test: `src/components/__tests__/RankSheet.test.tsx`
- Modify: `src/index.css`

- [x] **Step 1: Write the failing tests** — create `src/components/__tests__/RankSheet.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RankSheet } from '../RankSheet';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-sheet',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'housing',
      title: 'Housing',
      question: 'How to fix housing?',
      quotes: [
        { id: 'q1', text: 'First agreed quote.', candidateToken: 'a', topicKey: 'housing' },
        { id: 'q2', text: 'A disagreed quote.', candidateToken: 'b', topicKey: 'housing' },
      ],
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
  const [q1, q2] = payload.topics[0].quotes;
  useReadRankStore.getState().agree(q1);
  useReadRankStore.getState().disagree(q2);
});

describe('RankSheet', () => {
  it('renders nothing while closed', () => {
    render(<RankSheet open={false} allDone={false} onClose={vi.fn()} onSeeResults={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the agreed ranking and closes via Done', async () => {
    const onClose = vi.fn();
    render(<RankSheet open allDone={false} onClose={onClose} onSeeResults={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('First agreed quote.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('recovers a disagreed quote into the ranking', async () => {
    render(<RankSheet open allDone={false} onClose={vi.fn()} onSeeResults={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /disagreed \(1\)/i }));
    await userEvent.click(screen.getByRole('button', { name: /move to agreed/i }));
    const race = useReadRankStore.getState().getCurrentRaceProgress()!;
    expect(race.agreed.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(race.topics.housing.disagreed).toEqual([]);
  });

  it('pins See Results in the completion state', async () => {
    const onSeeResults = vi.fn();
    render(<RankSheet open allDone onClose={vi.fn()} onSeeResults={onSeeResults} />);
    expect(screen.getByText(/all quotes read/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /see results/i }));
    expect(onSeeResults).toHaveBeenCalled();
  });
});
```

- [x] **Step 2:** Run — expected FAIL (module not found).

- [x] **Step 3: Create `src/components/RankSheet.tsx`:**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { RankList } from './RankList';

export interface RankSheetProps {
  open: boolean;
  /** All topics fully evaluated — show the completion header + See Results. */
  allDone: boolean;
  onClose: () => void;
  onSeeResults: () => void;
}

/** Mobile bottom-sheet ranking surface (REDESIGN_SPEC §1.3). Mounts only while open. */
export const RankSheet: React.FC<RankSheetProps> = (props) => {
  if (!props.open) return null;
  return <RankSheetDialog {...props} />;
};

const RankSheetDialog: React.FC<RankSheetProps> = ({ allDone, onClose, onSeeResults }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const { getCurrentRaceProgress, reorderAgreed, reAgree } = useReadRankStore();
  const race = getCurrentRaceProgress();
  const agreed = race?.agreed ?? [];
  const disagreed = race ? Object.values(race.topics).flatMap((t) => t.disagreed) : [];
  const [showDisagreed, setShowDisagreed] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="rank-sheet"
      onClose={() => {
        // Ignore stale close events from StrictMode's effect replay.
        if (!ref.current?.open) onClose();
      }}
      onCancel={onClose}
      aria-label={allDone ? 'All quotes read. Review your ranking.' : 'Your ranking'}
    >
      <motion.div
        className="rank-sheet-handle-region"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80) onClose();
        }}
      >
        <span className="rank-sheet-handle" aria-hidden="true" />
      </motion.div>

      <header className="rank-sheet-header">
        <h2 className="rank-sheet-title">
          {allDone ? (
            <>All quotes read.&nbsp; Happy with your order?</>
          ) : (
            'Your ranking'
          )}
        </h2>
        <button type="button" className="rank-sheet-done" onClick={onClose}>
          Done
        </button>
      </header>

      <div className="rank-sheet-body">
        <RankList
          items={agreed}
          onReorder={reorderAgreed}
          compact
          longPressDrag
          showMoveButtons
          emptyHint="Agree with quotes and they will file in here, ready to rank."
        />

        {disagreed.length > 0 && (
          <section className="rank-sheet-iron">
            <button
              type="button"
              className="rank-sheet-iron-toggle"
              aria-expanded={showDisagreed}
              onClick={() => setShowDisagreed((p) => !p)}
            >
              ⊘ Disagreed ({disagreed.length})
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                style={{ transform: showDisagreed ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showDisagreed && (
              <div className="rank-sheet-iron-list">
                {disagreed.map((q) => (
                  <div key={q.id} className="rank-sheet-iron-row">
                    <span className="rank-sheet-iron-stub">{q.text}</span>
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

      {agreed.length > 0 && (
        <div className="rank-sheet-footer">
          <button type="button" className="ev-button-primary rank-sheet-results" onClick={onSeeResults}>
            See Results
          </button>
        </div>
      )}
    </dialog>
  );
};
```

(The footer renders whenever at least one quote is agreed — this preserves the current product's early-reveal ability on mobile, since Task 5 removes the inline reveal CTA from the mobile column.  The completion header is what changes at `allDone`.)

- [x] **Step 4: Add sheet styles to `src/index.css`** (after the Rank Dock section):

```css
/* ============================================
   Rank Sheet (mobile bottom sheet)
   ============================================ */

dialog.rank-sheet {
  position: fixed;
  inset: 0;
  margin: auto 0 0;
  width: 100%;
  max-width: 100%;
  height: min(88dvh, 100%);
  max-height: 88dvh;
  border: none;
  border-radius: 1rem 1rem 0 0;
  padding: 0;
  background: var(--surface-card);
  color: var(--text-ink);
}

dialog.rank-sheet[open] {
  display: flex;
  flex-direction: column;
}

.rank-sheet-handle-region {
  padding: 0.5rem 0 0.25rem;
  display: flex;
  justify-content: center;
  touch-action: none;
  cursor: grab;
}

.rank-sheet-handle {
  width: 2.5rem;
  height: 0.3125rem;
  border-radius: 9999px;
  background-color: var(--border-medium);
}

.rank-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 1rem 0.625rem;
  border-bottom: 1px solid var(--border-subtle);
}

.rank-sheet-title {
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 0.9375rem;
  color: var(--text-heading);
  margin: 0;
}

.rank-sheet-done {
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--text-link);
  min-height: 2.75rem;
  padding: 0 0.5rem;
}

.rank-sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.875rem 1rem calc(1rem + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.rank-sheet-iron-toggle {
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: 'Manrope', sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  min-height: 2.75rem;
  padding: 0;
}

.rank-sheet-iron-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.rank-sheet-iron-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  border: 1px dashed var(--border-subtle);
  border-radius: 0.5rem;
  padding: 0.5rem 0.625rem;
}

.rank-sheet-iron-stub {
  flex: 1;
  min-width: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rank-sheet-iron-recover {
  background: none;
  border: 1px solid var(--border-medium);
  border-radius: 0.375rem;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 0.6875rem;
  color: var(--text-secondary);
  min-height: 2.75rem;
  padding: 0 0.625rem;
  flex-shrink: 0;
}

.rank-sheet-footer {
  border-top: 1px solid var(--border-subtle);
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
}

.rank-sheet-results {
  width: 100%;
  min-height: 3.5rem;
  font-size: 1rem;
}
```

- [x] **Step 5:** Run the test file (4 passed), full suite, build. Commit:

```bash
git add src/components/RankSheet.tsx src/components/__tests__/RankSheet.test.tsx src/index.css
git commit -m "feat: RankSheet bottom-sheet ranking surface with recoverable disagreed quotes"
```

---

### Task 5: Wire the mobile experience — EvaluationPhase, QuoteCard axis lock, ActionButtons on touch

**Files:**
- Modify: `src/components/EvaluationPhase.tsx`, `src/components/QuoteCard.tsx`, `src/index.css`
- Delete: `src/components/InlineRankPanel.tsx`

No new unit tests in this task (the device-type branch is jsdom-hostile — `useDeviceType` resolves 'mouse' under the stubbed matchMedia); behavior is covered by Task 6's browser walkthrough. Keep the full suite green throughout.

- [x] **Step 1: QuoteCard axis lock.** In `src/components/QuoteCard.tsx`:

Change the drag prop on the `motion.div` from:

```tsx
      drag={isDraggable && !isCurrentlyAnimating}
```

to:

```tsx
      drag={isDraggable && !isCurrentlyAnimating ? 'x' : false}
```

In the same `motion.div`, the className string contains `touch-none` — remove `touch-none` and add `touchAction: 'pan-y'` to the `style` object instead (vertical page scroll must stay native while the card owns horizontal).

- [x] **Step 2: ActionButtons on touch.** In `src/index.css`, DELETE this rule (line ~613):

```css
@media (pointer: coarse) and (hover: none) {
  .action-buttons-container { display: none; }
}
```

Replace it with 56px touch sizing (spec §3.3):

```css
@media (pointer: coarse) {
  .action-button {
    min-height: 3.5rem;
    flex: 1 1 0;
  }
  .action-buttons-container {
    width: 100%;
    gap: 0.625rem;
  }
}
```

- [x] **Step 3: Rewire `src/components/EvaluationPhase.tsx`.**

Imports — remove `InlineRankPanel` and `SwipeInstructions` imports; add:

```tsx
import { RankDock } from './RankDock';
import { RankSheet } from './RankSheet';
```

State — replace `const [showFullRankList, setShowFullRankList] = useState(false);` with:

```tsx
  const [sheetOpen, setSheetOpen] = useState(false);
  const autoOpenedRef = useRef(false);
  const dockRef = useRef<HTMLButtonElement>(null);
```

Remove `inlinePanelRef`.

Derive the disagreed count after the `agreed` line:

```tsx
  const disagreedCount = race
    ? Object.values(race.topics).reduce((n, t) => n + t.disagreed.length, 0)
    : 0;
```

Coach-mark effect — DELETE the existing `useEffect` that sets `setShowFullRankList(true)` for tour step 2 (the step-2 coach mark now points at the dock while the sheet is closed; nothing replaces this effect).

Auto-expand on completion (mobile only, once) — add where the deleted effect was:

```tsx
  useEffect(() => {
    if (!isMouseDevice && allTopicsDone && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setSheetOpen(true);
    }
  }, [isMouseDevice, allTopicsDone]);
```

Buttons + instructions — in `triageContent`, replace:

```tsx
        {isMouseDevice && currentQuote && (
          <ActionButtons onAgree={() => handleButtonSwipe('agree')} onDisagree={() => handleButtonSwipe('disagree')} disabled={isAnimating} />
        )}
        {!isMouseDevice && currentQuote && <SwipeInstructions />}
```

with (buttons are co-equal affordances on every device; the swipe coach mark teaches the gesture):

```tsx
        {currentQuote && (
          <ActionButtons onAgree={() => handleButtonSwipe('agree')} onDisagree={() => handleButtonSwipe('disagree')} disabled={isAnimating} />
        )}
```

Mobile rank surface — in `mainColumn`, DELETE the entire "Mobile: rank pile toggle + panel" block (the `rank-counter-pill` button and the `showFullRankList && <InlineRankPanel .../>` render).

Reveal CTA — change the final line of `mainColumn` from:

```tsx
      {(allTopicsDone || canReveal) && revealCta}
```

to (mobile gets the CTA inside the sheet instead; desktop unchanged):

```tsx
      {isMouseDevice && (allTopicsDone || canReveal) && revealCta}
```

Mobile return — replace:

```tsx
  return (
    <div>
      {mainColumn}
      {coachMarkOverlay}
    </div>
  );
```

with:

```tsx
  return (
    <div className="evaluation-mobile">
      {mainColumn}
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
          dockRef.current?.focus();
        }}
        onSeeResults={() => {
          setSheetOpen(false);
          finishRace();
        }}
      />
      {coachMarkOverlay}
    </div>
  );
```

Coach mark step 2 (mobile) — the third `<CoachMark>` currently targets `inlinePanelRef` with `show={tourStep === 2 && agreed.length >= 1 && showFullRankList}`. Retarget it to the dock and stop requiring the open panel:

```tsx
      {!isMouseDevice && (
        <CoachMark
          targetRef={dockRef}
          show={tourStep === 2 && agreed.length >= 1 && !sheetOpen}
          allowSpotlightInteraction={false}
          stepLabel="2 of 2"
          onDismiss={finishTour}
        >
          Your agreed quotes file in here.  Tap to rank them — your top 3 are your podium.
        </CoachMark>
      )}
```

(Note: `CoachMark`'s `targetRef` prop type may be `RefObject<HTMLDivElement>` — if so, widen it to `RefObject<HTMLElement>`; a button ref is an HTMLElement. Check `CoachMark.tsx` and make the minimal type change if needed. Final state: only the completion effect auto-opens the sheet.)

Add bottom padding so the fixed dock never covers content — in `src/index.css`:

```css
.evaluation-mobile {
  padding-bottom: 5.5rem;
}
```

- [x] **Step 4: Delete the superseded component.**

```bash
rm src/components/InlineRankPanel.tsx
```

Then remove the `.inline-rank-panel` CSS block from `src/index.css` (the "Inline Rank Panel (mobile)" section) — but KEEP `.rank-counter-pill` styles (PracticeRound still uses them).

- [x] **Step 5: Verify.** `npm test` (expect 38: 23 at start + 3 reAgree + 5 RankList + 3 RankDock + 4 RankSheet), `npm run build` (exit 0), `npm run lint` (no NEW errors beyond the 13 pre-existing).

- [x] **Step 6: Commit**

```bash
git add -A src/
git commit -m "feat: mobile rank dock + sheet replace pill/panel; buttons on touch; axis-locked card"
```

---

### Task 6: Final verification

- [x] **Step 1:** `npm test`, `npm run lint`, `npm run build` — all green / no new lint errors.

- [x] **Step 2: Browser walkthrough — mobile viewport (380×800).** Using the preview tooling (`.claude/launch.json` exists) with the viewport resized:

1. Skip practice, enter the mock race. The dock is pinned at the bottom with three ghost slots (1st/2nd/3rd); Agree/Disagree buttons render at 56px.
2. Agree with a quote → it files into slot 1; dock aria-label updates; pulse animates (skipped under reduced motion).
3. Disagree with a quote → "⊘ 1" counter appears.
4. Tap the dock → sheet opens to ~88% height with scrim; background inert; ▲▼ buttons reorder; long-press drag lifts a row; "Disagreed (1)" expands and "Move to agreed" recovers the quote into the bottom of the ranking.
5. Esc / Done / handle-drag-down all close the sheet; focus returns to the dock.
6. Complete all topics → sheet auto-opens once with "All quotes read.  Happy with your order?" and a pinned See Results that navigates to the reveal.
7. Vertical page scroll works over the card (axis lock); horizontal swipe still agrees/disagrees.
8. Quote card footer (ⓘ) still opens the explainer; no drag starts from the footer.

- [x] **Step 3: Desktop regression (1280px).** Evaluation split layout unchanged: sidebar rank list, ActionButtons under the card, no dock/sheet rendered, reveal CTA inline.

- [x] **Step 4:** Fix anything found (small fixes inline with clear commits), then hand off via superpowers:finishing-a-development-branch.

---

## Execution Notes (recorded during implementation)

- Node 26's experimental localStorage shadowed jsdom's in tests; setup.ts gained a conditional in-memory stub.
- dnd-kit injects its own role="status" live region; the announcement test queries getAllByRole + filter.
- RankList boundary buttons use aria-disabled (not disabled) so focus survives a move onto a boundary; announcements include a quote stub so repeats are never swallowed.
- RankDock pulse is imperative (useAnimate) — setState-in-effect tripped the React Compiler lint; forwarded ref wired via useImperativeHandle.
- reAgree hardened: only recovers quotes actually present in topic.disagreed.
- CRITICAL catch in review: window keydown shortcuts fired behind open modal dialogs (sheet AND explainer); guarded with sheetOpen + dialog[open] checks, regression-tested via the desktop explainer path.
- React Compiler bailout diagnostics resolved by dropping useCallback from handleDragStateChange/handleButtonSwipe and using a latest-ref for the keydown listener.
- Browser walkthrough catch: focus return to the dock must be deferred (requestAnimationFrame) — focus() is silently ignored while the modal is open.
- Browser-verified at 375px (ghost slots, counters, sheet, recover, auto-open completion, See Results → reveal) and desktop regression clean. Long-press drag not synthesizable in the preview; verified by sensor config + on-device testing recommended.
