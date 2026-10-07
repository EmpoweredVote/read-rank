# Ranking Panel + Topic-Complete Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the ranking panel and topic-complete card Aditi's visual/copy layer without changing the "Record" ranking interaction.

**Architecture:** `RankRail` (shared by the desktop sidebar, mobile sheet and warm-up) gains a contextual subtitle, a visible empty state, new recover wording and a privacy footer behind a `showPrivacyNote` prop; `RankList` marks the first ranked slip; the sidebar header becomes an `h2`. `EvaluationPhase`'s complete card is rebuilt with counts, two actions and focus management, and `EvaluationSurface` stops rendering its separate reveal CTA while no quote is on screen.

**Tech Stack:** React 19, framer-motion, dnd-kit (unchanged), Tailwind v4 + semantic CSS tokens in `src/index.css`, Vitest + Testing Library + user-event.

**Spec:** `docs/superpowers/specs/2026-10-07-ranking-panel-design.md`. Worktree `/Users/chrisandrews/Documents/GitHub/read-rank-issues`, branch `feat/ranking-panel` (spec commit `87a7f6a`).

## Global Constraints

- Ranking interaction unchanged: tap-to-assign popover, ties ("="), "Place the rest as agreed", Reorder toggle + drag-only keyboard grip (no ▲▼), collapsed disagreed tray, mobile dock + sheet.
- Colours only through tokens (`var(--…)`); no hex added; no Tailwind `dark:` classes.
- Copy, verbatim: "Your ranking" · "Quotes you agree with land here." · "Agree with more quotes to compare them here." · "Agree with a quote to add it here. Then put the one you trust most on top." · "Move to my ranking" · `Moved "{stub}" to your ranking.` · "Names and parties stay hidden until you see your full ballot." · "Topic complete" · "All topics done" · "{n} AGREED" · "{n} DISAGREED" · "Move on to the next topic, or keep arranging your ranking." · "Reveal your ballot when you're ready." · "Next topic →" · reveal label = existing `revealLabel` ("See your full ballot" / "Reveal ballot").
- Privacy footer hidden in the pizza warm-up (`showTrustFooter={false}` path).
- Blind invariant: no candidate identity anywhere in the panel or card.
- Work only in the worktree; commit with explicit pathspecs; messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Change |
|---|---|
| `src/components/RankRail.tsx` | subtitle, empty box, recover copy, privacy footer, `showPrivacyNote` prop |
| `src/components/RankList.tsx` | `rank-slip-first` on the first ranked slip |
| `src/components/AgreedQuotesSidebar.tsx` | `h2` header + class-based chip; pass `showPrivacyNote` |
| `src/components/RankSheet.tsx` | pass `showPrivacyNote` |
| `src/components/EvaluationSurface.tsx` | pass `showTrustFooter` to sidebar/sheet; `revealCta` only with a current quote |
| `src/components/EvaluationPhase.tsx` | new complete card |
| `src/index.css` | `.rank-panel-*`, `.rank-empty`, `.rank-slip-first`, `.rank-privacy`, `.rank-dis-recover` icon, `.topic-done*` |
| Tests | `RankRail.test.tsx`, `RankRail.disagreedRecover.test.tsx`, `RankList.test.tsx`, new `TopicComplete.test.tsx` |

---

### Task 1: Ranking panel layer

**Files:** Modify `src/components/RankRail.tsx`, `src/components/RankList.tsx` (`RowContent`, ~line 82-86), `src/components/AgreedQuotesSidebar.tsx`, `src/components/RankSheet.tsx`, `src/components/EvaluationSurface.tsx` (the `<RankedListSidebar …>` ~line 378 and `<RankSheet …>` ~line 411 renders), `src/index.css`; Tests `src/components/__tests__/RankRail.test.tsx`, `src/components/__tests__/RankRail.disagreedRecover.test.tsx`, `src/components/__tests__/RankList.test.tsx`

**Interfaces:**
- Produces: `RankRailProps` gains `showPrivacyNote?: boolean` (default `true`). `RankedListSidebar` props gain `showPrivacyNote?: boolean` (default `true`). `RankSheetProps` gains `showPrivacyNote?: boolean` (default `true`).

- [ ] **Step 1: Failing tests.**

In `src/components/__tests__/RankRail.test.tsx`, replace the test `'shows a nothing-ranked hint and no ghost slots before anything is ranked'` with:

```tsx
  it('shows the empty state and the zero-agreed subtitle before anything is agreed', () => {
    render(<RaceRankSourceProvider><RankRail variant="sidebar" /></RaceRankSourceProvider>);
    expect(document.querySelectorAll('.tier-ghost')).toHaveLength(0);
    expect(screen.getByText('Quotes you agree with land here.')).toBeInTheDocument();
    expect(screen.getByText('Agree with a quote to add it here. Then put the one you trust most on top.')).toBeVisible();
  });

  it('switches subtitle at one agreed and hides the empty state', () => {
    useReadRankStore.getState().agree(payload.topics[0].quotes[0]);
    render(<RaceRankSourceProvider><RankRail variant="sidebar" /></RaceRankSourceProvider>);
    expect(screen.getByText('Agree with more quotes to compare them here.')).toBeInTheDocument();
    expect(screen.queryByText(/agree with a quote to add it here/i)).not.toBeInTheDocument();
  });

  it('shows the privacy footer by default and hides it on request', () => {
    const { unmount } = render(<RaceRankSourceProvider><RankRail variant="sidebar" /></RaceRankSourceProvider>);
    expect(screen.getByText('Names and parties stay hidden until you see your full ballot.')).toBeInTheDocument();
    unmount();
    render(<RaceRankSourceProvider><RankRail variant="sidebar" showPrivacyNote={false} /></RaceRankSourceProvider>);
    expect(screen.queryByText(/names and parties stay hidden/i)).not.toBeInTheDocument();
  });
```

Add to the same file a test with two agreed quotes — add a third quote to the payload first if needed (`{ id: 'q3', text: 'Rail second agreed.', candidateToken: 'c', topicKey: 'housing' }`) and keep existing tests passing:

```tsx
  it('drops the subtitle at two agreed (the toolbar hint takes over)', () => {
    const [q1, , q3] = payload.topics[0].quotes;
    useReadRankStore.getState().agree(q1);
    useReadRankStore.getState().agree(q3);
    render(<RaceRankSourceProvider><RankRail variant="sidebar" /></RaceRankSourceProvider>);
    expect(screen.queryByText(/land here|compare them here/i)).not.toBeInTheDocument();
    expect(screen.getByText(/tap a number to place it/i)).toBeInTheDocument();
  });
```

In `src/components/__tests__/RankRail.disagreedRecover.test.tsx`, change the recover button query to `{ name: 'Move to my ranking' }` (if it queries by name) and the announcement regex from `/moved .* back to agreed/i` to `/moved ".*" to your ranking\./i`.

In `src/components/__tests__/RankList.test.tsx` add, inside `describe('RankList rows', …)` (it already defines `items` — three `AgreedQuote`s 'Alpha/Bravo/Charlie quote.' — and imports `vi`):

```tsx
  it('marks only the first ranked slip as first place', () => {
    render(<RankList items={items} onReorder={vi.fn()} />);
    expect(screen.getByText('Alpha quote.').closest('.rank-slip')).toHaveClass('rank-slip-first');
    expect(screen.getByText('Bravo quote.').closest('.rank-slip')).not.toHaveClass('rank-slip-first');
  });

  it('never marks an unranked ("also agreed") slip as first place', () => {
    render(<RankList items={items} onReorder={vi.fn()} rankedCount={0} onSetRankedCount={vi.fn()} />);
    document.querySelectorAll('.rank-slip').forEach((el) => expect(el).not.toHaveClass('rank-slip-first'));
  });
```

- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/RankRail.test.tsx src/components/__tests__/RankRail.disagreedRecover.test.tsx src/components/__tests__/RankList.test.tsx` — expect the new/changed cases to FAIL.

- [ ] **Step 3: `RankList.tsx`** — in `RowContent` (view mode), change the slip class line to add the first-place class:

```tsx
  const firstClass = index === 0 && !unranked ? ' rank-slip-first' : '';
  return (
    <div className={`rank-slip ${index < 3 ? 'rank-slip-top' : 'rank-slip-sub'}${tieClass}${alsoAgreeClass}${firstClass}`}>
```

- [ ] **Step 4: `RankRail.tsx`:**

1. Props: add `showPrivacyNote?: boolean;` to `RankRailProps`, destructure with default `showPrivacyNote = true`.
2. `handleRecover`: message becomes `` `Moved "${stub}" to your ranking.` ``.
3. At the top of the returned `<div className="rank-rail">`, before the toolbar:
   ```tsx
   {agreed.length < 2 && (
     <p className="rank-panel-sub">
       {agreed.length === 0 ? 'Quotes you agree with land here.' : 'Agree with more quotes to compare them here.'}
     </p>
   )}
   ```
4. Replace the `{agreed.length === 0 && (<p className="sr-only">…</p>)}` block with:
   ```tsx
   {agreed.length === 0 && (
     <div className="rank-empty">
       <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
         <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
       </svg>
       <p>Agree with a quote to add it here. Then put the one you trust most on top.</p>
     </div>
   )}
   ```
5. Recover button content:
   ```tsx
   <button type="button" className="rank-dis-recover" onClick={() => handleRecover(q)}>
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
     Move to my ranking
   </button>
   ```
6. Before the live-region `div` at the end:
   ```tsx
   {showPrivacyNote && (
     <p className="rank-privacy">
       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
         <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
       </svg>
       Names and parties stay hidden until you see your full ballot.
     </p>
   )}
   ```

- [ ] **Step 5: `AgreedQuotesSidebar.tsx`:**
  - Add `showPrivacyNote?: boolean` to `RankedListSidebarProps`; destructure `({ landingId, showPrivacyNote = true }, ref)`.
  - Replace the header contents with:
    ```tsx
    <div className="sidebar-header">
      <h2 className="rank-panel-title">Your ranking</h2>
      {agreed.length > 0 && <span className="rank-panel-count">{agreed.length} agreed</span>}
    </div>
    ```
  - Pass `showPrivacyNote={showPrivacyNote}` to `<RankRail variant="sidebar" … />`.

- [ ] **Step 6: `RankSheet.tsx`:** add `showPrivacyNote?: boolean` to `RankSheetProps`, thread it through `RankSheet` → `RankSheetDialog` (default `true`), and pass it to `<RankRail variant="sheet" showPrivacyNote={showPrivacyNote} />`.

- [ ] **Step 7: `EvaluationSurface.tsx`:** pass `showPrivacyNote={showTrustFooter}` to `<RankedListSidebar …>` and to `<RankSheet …>`.

- [ ] **Step 8: CSS** — append to `src/index.css`:

```css
/* Ranking panel layer */
.rank-panel-title { margin: 0; font-family: 'Manrope', sans-serif; font-size: 1rem; font-weight: 800; color: var(--text-heading); }
.rank-panel-count {
  font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 0.625rem; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--text-link); background: var(--surface-raised);
  padding: 2px 8px; border-radius: 4px;
}
.rank-panel-sub { margin: 0 0 0.75rem; font-size: 0.875rem; color: var(--text-secondary); }
.rank-empty {
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center;
  border: 1.5px dashed var(--border-medium); border-radius: 0.75rem; padding: 1.5rem 1rem;
  color: var(--text-tertiary);
}
.rank-empty p { margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--text-secondary); }
.rank-slip.rank-slip-first { border: 1.5px solid var(--action-primary); background: var(--surface-raised); }
.rank-dis-recover { display: inline-flex; align-items: center; gap: 0.25rem; }
.rank-privacy {
  display: flex; align-items: flex-start; gap: 0.5rem; margin: 1rem 0 0; padding-top: 0.875rem;
  border-top: 1px solid var(--border-subtle); font-size: 0.8125rem; line-height: 1.45; color: var(--text-tertiary);
}
.rank-privacy svg { flex-shrink: 0; margin-top: 0.125rem; }
```

- [ ] **Step 9: Run** the Step 2 command, then `npx vitest run src/components/__tests__/RankDock.test.tsx src/components/__tests__/RankSheet.test.tsx src/components/__tests__/RankList.rank.test.tsx src/components/__tests__/EvaluationPhase.test.tsx src/components/__tests__/PracticeRound.parity.test.tsx`, `npm test`, `npx tsc -b`. Update any other test asserting the removed "Nothing ranked yet" text or "Move to agreed" copy (list them in the commit body).

- [ ] **Step 10: Commit**

```bash
git commit -m "feat(rank): panel heading, contextual subtitle, empty state, first-place emphasis, privacy note

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/RankRail.tsx src/components/RankList.tsx src/components/AgreedQuotesSidebar.tsx src/components/RankSheet.tsx src/components/EvaluationSurface.tsx src/index.css src/components/__tests__/RankRail.test.tsx src/components/__tests__/RankRail.disagreedRecover.test.tsx src/components/__tests__/RankList.test.tsx
```

---

### Task 2: Topic-complete card

**Files:** Modify `src/components/EvaluationPhase.tsx` (`completeState` ~lines 62-80), `src/components/EvaluationSurface.tsx` (`mainColumn` — the `{isMouseDevice && revealCta}` line), `src/index.css`; Create `src/components/__tests__/TopicComplete.test.tsx`

**Interfaces:** Consumes the store (`agree`, `disagree`, `nextTopic`, `revealBallot`) and existing `revealLabel` / `canReveal` / `isLastTopic` in `EvaluationPhase`.

- [ ] **Step 1: Failing test** — `src/components/__tests__/TopicComplete.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EvaluationPhase } from '../EvaluationPhase';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-done', positionName: 'Governor',
  topics: [
    { topicKey: 'k1', title: 'T1', question: 'Q1', quotes: [
      { id: 'a1', text: 'one', candidateToken: 'tA', topicKey: 'k1' },
      { id: 'a2', text: 'two', candidateToken: 'tB', topicKey: 'k1' },
    ] },
    { topicKey: 'k2', title: 'T2', question: 'Q2', quotes: [
      { id: 'b1', text: 'three', candidateToken: 'tA', topicKey: 'k2' },
      { id: 'b2', text: 'four', candidateToken: 'tB', topicKey: 'k2' },
    ] },
  ],
};
const s = () => useReadRankStore.getState();
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  window.localStorage?.clear();
  s().reset(); s().selectRace(payload); s().confirmIssueSelection(); s().completeCoachMarks();
  window.matchMedia = ((q: string) => ({
    matches: q.includes('pointer: fine'), media: q, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { window.matchMedia = originalMatchMedia; });

function finishTopic(topicKey: 'k1' | 'k2') {
  const [x, y] = s().getCurrentRaceProgress()!.topics[topicKey].quotesToEvaluate;
  s().agree(x); s().disagree(y);
}

describe('topic-complete card', () => {
  it('shows heading (focused), this topic\'s counts, Next topic and the reveal button once', async () => {
    finishTopic('k1');
    render(<EvaluationPhase />);
    const h = await screen.findByRole('heading', { level: 2, name: 'Topic complete' });
    await waitFor(() => expect(h).toHaveFocus());
    expect(screen.getByText('1 AGREED')).toBeInTheDocument();
    expect(screen.getByText('1 DISAGREED')).toBeInTheDocument();
    expect(screen.getByText('Move on to the next topic, or keep arranging your ranking.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next topic →' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /reveal ballot|see your full ballot/i })).toHaveLength(1);
  });

  it('last topic: "All topics done" with the reveal as the main button', async () => {
    finishTopic('k1'); s().nextTopic(); finishTopic('k2');
    render(<EvaluationPhase />);
    expect(await screen.findByRole('heading', { level: 2, name: 'All topics done' })).toBeInTheDocument();
    expect(screen.getByText("Reveal your ballot when you're ready.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next topic →' })).not.toBeInTheDocument();
    const reveal = screen.getAllByRole('button', { name: /see your full ballot/i });
    expect(reveal).toHaveLength(1);
    expect(reveal[0]).toHaveClass('ev-button-primary');
  });
});
```

(If `confirmIssueSelection` is not needed to enter evaluation in this store version, keep it — it is harmless; the existing `EvaluationPhase.test.tsx` shows the setup pattern.)

- [ ] **Step 2: Run** `npx vitest run src/components/__tests__/TopicComplete.test.tsx` — expect FAIL.

- [ ] **Step 3: `EvaluationPhase.tsx`** — add `useEffect, useRef` to the React import, then replace `completeState` with:

```tsx
  const topicAgreed = topic?.agreed.length ?? 0;
  const topicDisagreed = topic?.disagreed.length ?? 0;
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);
  const showingComplete = !currentQuote;
  useEffect(() => {
    if (showingComplete) doneHeadingRef.current?.focus({ preventScroll: true });
  }, [showingComplete, race?.currentTopicKey]);

  const revealButton = canReveal && (
    <button type="button" onClick={revealBallot}
      className={isLastTopic ? 'ev-button-primary' : 'ev-button-secondary'}>
      {revealLabel}
    </button>
  );

  const completeState = (
    <div className="topic-done">
      <span className="topic-done__icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
          strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </span>
      <h2 ref={doneHeadingRef} tabIndex={-1} className="topic-done__title">
        {isLastTopic ? 'All topics done' : 'Topic complete'}
      </h2>
      <div className="topic-done__chips">
        <span className="topic-done__chip topic-done__chip--agreed">{topicAgreed} AGREED</span>
        <span className="topic-done__chip topic-done__chip--disagreed">{topicDisagreed} DISAGREED</span>
      </div>
      <p className="topic-done__text">
        {isLastTopic ? "Reveal your ballot when you're ready." : 'Move on to the next topic, or keep arranging your ranking.'}
      </p>
      <div className="topic-done__actions">
        {!isLastTopic && (
          <button type="button" onClick={nextTopic} className="ev-button-primary">Next topic →</button>
        )}
        {revealButton}
      </div>
    </div>
  );
```

Hooks rule: the `useRef`/`useEffect` must sit with the other top-level hooks — before any early return in the component (there is none today; keep it that way).

- [ ] **Step 4: `EvaluationSurface.tsx`** — in `mainColumn`, change `{isMouseDevice && revealCta}` to `{isMouseDevice && currentQuote && revealCta}`.

- [ ] **Step 5: CSS** — in `src/index.css`, replace the existing `.evaluation-complete-card` rules (if any; search for the class — `EvaluationPhase` no longer uses it, and confirm no other component does before deleting) and append:

```css
/* Topic complete */
.topic-done {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem;
  background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: 1rem;
  padding: 2rem 1.5rem; box-shadow: var(--shadow-card);
}
.topic-done__icon {
  width: 3.5rem; height: 3.5rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center;
  background: var(--surface-raised); color: var(--text-link);
}
.topic-done__title { margin: 0; font-family: 'Manrope', sans-serif; font-size: 1.5rem; font-weight: 800; color: var(--text-heading); }
.topic-done__title:focus { outline: none; }
.topic-done__title:focus-visible { outline: 2px solid var(--text-link); outline-offset: 4px; border-radius: 0.25rem; }
.topic-done__chips { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
.topic-done__chip {
  font-size: 0.75rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 0.25rem 0.75rem; border-radius: 9999px;
}
.topic-done__chip--agreed { background: var(--surface-raised); color: var(--text-link); }
.topic-done__chip--disagreed { background: var(--surface-sunken); color: var(--text-secondary); }
.topic-done__text { margin: 0; max-width: 34ch; font-size: 0.9375rem; line-height: 1.5; color: var(--text-secondary); }
.topic-done__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.75rem; margin-top: 0.5rem; }
```

- [ ] **Step 6: Run** `npx vitest run src/components/__tests__/TopicComplete.test.tsx src/components/__tests__/EvaluationPhase.test.tsx src/components/__tests__/EvaluationPhase.zeroAgreement.test.tsx src/components/__tests__/EvaluationSurface.layout.test.tsx`, then `npm test`, `npx tsc -b`, `npm run build`, `npx eslint src/components/EvaluationPhase.tsx src/components/EvaluationSurface.tsx`. Update any existing test asserting the old complete-card markup or the old always-visible reveal CTA (list them in the commit body).

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(rank): topic-complete card with counts, two actions and focus

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/EvaluationPhase.tsx src/components/EvaluationSurface.tsx src/index.css src/components/__tests__/TopicComplete.test.tsx
```
(add any updated test files to the pathspec)

---

### Task 3: Browser check, then PR

- [ ] Build a dev bundle of the worktree (`NODE_ENV=development npx vite build --mode development --outDir <scratch>`) and serve it to Playwright via request interception (abort `/api` with `connectionrefused`; block only `https://*.posthog.com`). Do not start a dev server in the main `read-rank` checkout.
- [ ] At 1280 and 1024 px, light and dark: empty panel; one agreed; two agreed (first-place emphasis, toolbar hint); disagreed tray open ("Move to my ranking"); topic complete; last topic.
- [ ] Push `feat/ranking-panel`; open a PR to `main` with summary, spec/plan links and the Claude Code attribution line.
