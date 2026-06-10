# Two-Stage Trust System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship priority #1 from REDESIGN_SPEC.md — blind evaluation cards with a generic trust footer, full source attribution (SourceLine) debuting at the reveal, a "How we source quotes" explainer reachable from both phases, and type-level enforcement that no party or source data exists pre-reveal.

**Architecture:** Two new presentational components (`SourceLine`, `SourceExplainer`) plus small modifications to `QuoteCard`, `PracticeRound`, `ResultsPhase`, and the data types. The blind payload (`BlindQuote`) already excludes sources — we lock that in with tests. The reveal payload already carries `sourceName`/`sourceUrl` per quote — we upgrade its rendering. `party` is removed from `BallotEntry` and mock data (it is never rendered today; removal makes anti-partisanship structural).

**Tech Stack:** React 19, TypeScript, Zustand, framer-motion, Tailwind 4. Tests: vitest + jsdom + @testing-library/react (new — no test infra exists yet).

**Design contract:** `REDESIGN_SPEC.md` §3.1 (blind-trust footer), §3.5 (reveal SourceLine), §4 (two-stage trust model). Copy rules: no em dashes, two spaces after periods (use `&nbsp;` + space in JSX so it survives HTML whitespace collapsing).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `vitest.config.ts` | Create | Test runner config (separate from vite.config.ts) |
| `src/test/setup.ts` | Create | jest-dom matchers registration |
| `src/test/smoke.test.tsx` | Create | Harness verification |
| `src/data/__tests__/mockData.test.ts` | Create | Locks blind-payload shape + no-party guarantee |
| `src/components/SourceLine.tsx` | Create | Post-reveal source attribution primitive |
| `src/components/__tests__/SourceLine.test.tsx` | Create | SourceLine behavior |
| `src/components/SourceExplainer.tsx` | Create | "How we source quotes" dialog + trigger button |
| `src/components/__tests__/SourceExplainer.test.tsx` | Create | Dialog open/close/copy |
| `src/components/__tests__/QuoteCard.test.tsx` | Create | Blind-trust footer behavior |
| `src/components/__tests__/ResultsPhase.test.tsx` | Create | Reveal attribution + explainer trigger |
| `src/data/api.ts` | Modify (line 44) | Remove `party` from `BallotEntry` |
| `src/data/mockData.ts` | Modify (lines 17, 26, 33, 40, 47, 231) | Remove `party` from mock identities and ballot |
| `src/components/QuoteCard.tsx` | Modify | Add blind-trust footer |
| `src/components/PracticeRound.tsx` | Modify (line 148) | Suppress footer (practice quotes are not real) |
| `src/components/ResultsPhase.tsx` | Modify | SourceLine in breakdown, explainer in header, export BallotCard |
| `package.json` | Modify | Test deps + scripts |

---

### Task 0: Branch

- [x] **Step 1: Create the feature branch**

```bash
cd /Users/chrisandrews/Documents/GitHub/read-rank
git checkout -b feat/two-stage-trust
```

---

### Task 1: Test infrastructure (vitest + Testing Library)

The repo has no test runner. Everything later is TDD, so this comes first.

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`, `src/test/smoke.test.tsx`
- Modify: `package.json`

- [x] **Step 1: Install dev dependencies**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [x] **Step 2: Create `vitest.config.ts`** (standalone — do not touch `vite.config.ts`, it has a conditional local ev-ui alias that tests don't need)

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

- [x] **Step 3: Create `src/test/setup.ts`**

jsdom does not implement `window.matchMedia`, which framer-motion's `useReducedMotion` calls — components like ResultsPhase would crash in tests without this stub.

```ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no matchMedia; framer-motion's useReducedMotion needs it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

- [x] **Step 4: Add scripts to `package.json`** (inside `"scripts"`, after `"lint"`)

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [x] **Step 5: Create `src/test/smoke.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('test harness', () => {
  it('renders React components into jsdom', () => {
    render(<p>hello</p>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
```

- [x] **Step 6: Run the smoke test**

Run: `npm test`
Expected: 1 passed.

- [x] **Step 7: Verify the production build still passes** (test files live under `src/`, so `tsc -b` type-checks them; the jest-dom type augmentation from `src/test/setup.ts` must compile)

Run: `npm run build`
Expected: exits 0.

- [x] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test/
git commit -m "test: add vitest + Testing Library infrastructure"
```

---

### Task 2: Data guarantees — strip `party`, lock the blind payload shape

`BallotEntry.party` exists but is never rendered (BallotCard deliberately omits it). Remove it from types and mock data so anti-partisanship is structural. Same task locks the blind-payload shape with an exact-keys test so sources/identities can never silently leak into evaluation.

**Files:**
- Test: `src/data/__tests__/mockData.test.ts`
- Modify: `src/data/api.ts:44`, `src/data/mockData.ts:17,26,33,40,47,231`

- [x] **Step 1: Write the failing tests** — create `src/data/__tests__/mockData.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { buildMockRacePayload, buildMockReveal } from '../mockData';
import type { VerdictRecord } from '../../store/useReadRankStore';

describe('structural blindness and anti-partisanship', () => {
  it('blind payload quotes expose ONLY id, text, candidateToken, topicKey', () => {
    const payload = buildMockRacePayload();
    expect(payload.topics.length).toBeGreaterThan(0);
    for (const topic of payload.topics) {
      for (const quote of topic.quotes) {
        expect(Object.keys(quote).sort()).toEqual(['candidateToken', 'id', 'text', 'topicKey']);
      }
    }
  });

  it('reveal ballot entries carry no party field', () => {
    const payload = buildMockRacePayload();
    const verdicts: VerdictRecord[] = payload.topics.flatMap((t) =>
      t.quotes.map((q, i) => ({ quote_id: q.id, supported: true, rank: i + 1, session_size: 4 }))
    );
    const reveal = buildMockReveal(verdicts);
    expect(reveal.ballot.length).toBeGreaterThan(0);
    for (const entry of reveal.ballot) {
      expect(entry).not.toHaveProperty('party');
    }
  });

  it('reveal quotes DO carry source attribution', () => {
    const payload = buildMockRacePayload();
    const verdicts: VerdictRecord[] = payload.topics.flatMap((t) =>
      t.quotes.map((q, i) => ({ quote_id: q.id, supported: true, rank: i + 1, session_size: 4 }))
    );
    const reveal = buildMockReveal(verdicts);
    const allQuotes = reveal.ballot.flatMap((b) => b.perTopic.flatMap((t) => t.quotes));
    expect(allQuotes.length).toBeGreaterThan(0);
    for (const q of allQuotes) {
      expect(q.sourceName).toBeTruthy();
      expect(q.sourceUrl).toMatch(/^https?:\/\//);
    }
  });
});
```

- [x] **Step 2: Run tests to verify the party test fails**

Run: `npm test -- src/data/__tests__/mockData.test.ts`
Expected: "blind payload" and "source attribution" tests PASS (already true today); "no party field" FAILS with `expected ... not to have property "party"`.

- [x] **Step 3: Remove `party` from `src/data/api.ts`** — in `BallotEntry` (line 44), delete:

```ts
  party: string;
```

- [x] **Step 4: Remove `party` from `src/data/mockData.ts`** — three edits:

In `MockIdentity` (line 17), delete:

```ts
  party: string;
```

In each of the four `MOCK_IDENTITIES` records (lines 26, 33, 40, 47), delete the `party:` line, e.g.:

```ts
    party: 'Libertarian Party',
```

In `buildMockReveal`'s ballot construction (line 231), delete:

```ts
      party: id.party,
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/data/__tests__/mockData.test.ts`
Expected: 3 passed.

- [x] **Step 6: Verify nothing else referenced `party`**

Run: `grep -rn "party" src/ --include="*.ts" --include="*.tsx"`
Expected: only the comment in `ResultsPhase.tsx:46` ("NO percentage, NO party") remains.

Run: `npm run build`
Expected: exits 0 (proves no TypeScript consumer of `.party` existed).

- [x] **Step 7: Commit**

```bash
git add src/data/
git commit -m "feat: make anti-partisanship structural - remove party from reveal types"
```

---

### Task 3: SourceLine component

The post-reveal attribution primitive (REDESIGN_SPEC §4). Renders nothing without a source name, plain text without a URL, and a verify link with external-tab icon when both exist. Never used pre-reveal.

**Files:**
- Create: `src/components/SourceLine.tsx`
- Test: `src/components/__tests__/SourceLine.test.tsx`

- [x] **Step 1: Write the failing tests** — create `src/components/__tests__/SourceLine.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceLine } from '../SourceLine';

describe('SourceLine', () => {
  it('renders a verify link when name and url are present', () => {
    render(<SourceLine sourceName="WISH-TV Governor's Debate" sourceUrl="https://example.com/debate" />);
    const link = screen.getByRole('link', { name: /verify source: WISH-TV Governor's Debate/i });
    expect(link).toHaveAttribute('href', 'https://example.com/debate');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('renders plain text when there is no url', () => {
    render(<SourceLine sourceName="Campaign Website" />);
    expect(screen.getByText('Campaign Website')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders nothing without a source name', () => {
    const { container } = render(<SourceLine sourceUrl="https://example.com" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not bubble clicks to parent handlers', async () => {
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <SourceLine sourceName="IndyStar" sourceUrl="https://example.com" />
      </div>
    );
    await userEvent.click(screen.getByRole('link'));
    expect(onParentClick).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/__tests__/SourceLine.test.tsx`
Expected: FAIL — `Cannot find module '../SourceLine'` (or equivalent resolve error).

- [x] **Step 3: Create `src/components/SourceLine.tsx`**

```tsx
import React from 'react';

export interface SourceLineProps {
  sourceName?: string;
  sourceUrl?: string;
  /** 'compact' for dense lists (reveal breakdown); 'default' elsewhere. */
  variant?: 'default' | 'compact';
}

/**
 * Post-reveal source attribution. NEVER render this pre-reveal:
 * provenance identifies speakers (REDESIGN_SPEC.md §4).
 */
export const SourceLine: React.FC<SourceLineProps> = ({ sourceName, sourceUrl, variant = 'default' }) => {
  if (!sourceName) return null;

  const fontSize = variant === 'compact' ? '0.6875rem' : '0.875rem';

  if (!sourceUrl) {
    return (
      <span style={{ fontFamily: "'Manrope', sans-serif", fontSize, color: 'var(--text-secondary)' }}>
        {sourceName}
      </span>
    );
  }

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Verify source: ${sourceName} (opens in new tab)`}
      onClick={(e) => e.stopPropagation()}
      style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize,
        fontWeight: 600,
        color: 'var(--color-ev-muted-blue)',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: variant === 'compact' ? '0.125rem 0' : '0.375rem 0',
      }}
    >
      {sourceName}
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
};
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/SourceLine.test.tsx`
Expected: 4 passed. (jsdom may log a "Not implemented: navigation" error on the click test — that is noise, not a failure.)

- [x] **Step 5: Commit**

```bash
git add src/components/SourceLine.tsx src/components/__tests__/SourceLine.test.tsx
git commit -m "feat: add SourceLine post-reveal attribution primitive"
```

---

### Task 4: SourceExplainer dialog + SourceInfoButton trigger

One explainer, reachable from both phases (evaluation card footer, reveal header). Native `<dialog>` + `showModal()` gives focus trap and Esc handling for free. The dialog mounts only while open, so closed state is deterministic in tests.

**Files:**
- Create: `src/components/SourceExplainer.tsx`
- Test: `src/components/__tests__/SourceExplainer.test.tsx`

- [x] **Step 1: Write the failing tests** — create `src/components/__tests__/SourceExplainer.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourceInfoButton } from '../SourceExplainer';

describe('SourceInfoButton', () => {
  it('opens the explainer dialog on click', async () => {
    render(<SourceInfoButton />);
    await userEvent.click(screen.getByRole('button', { name: /how we source quotes/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(/how we source quotes/i);
    expect(dialog).toHaveTextContent(/four kinds of sources/i);
    expect(dialog).toHaveTextContent(/hide each quote's source on purpose/i);
  });

  it('closes via the close button and unmounts the dialog', async () => {
    render(<SourceInfoButton />);
    await userEvent.click(screen.getByRole('button', { name: /how we source quotes/i }));
    await userEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a visible text label when showLabel is set', () => {
    render(<SourceInfoButton showLabel />);
    expect(screen.getByRole('button', { name: /how we source quotes/i })).toHaveTextContent(
      'How we source quotes'
    );
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/__tests__/SourceExplainer.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 3: Create `src/components/SourceExplainer.tsx`**

Copy follows the brand rules: no em dashes, two spaces after periods (`&nbsp;` + space so HTML cannot collapse them), transparency as confidence.

```tsx
import React, { useEffect, useRef, useState } from 'react';

const SOURCE_TIERS = [
  'Video-clipped debate excerpts',
  'Verbatim debate transcripts',
  'Official candidate statements',
  'Verified news reporting',
];

const labelStyle: React.CSSProperties = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
};

const SourceExplainerDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="source-explainer-title"
      style={{
        maxWidth: '26rem',
        border: '1px solid var(--border-subtle)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        fontFamily: "'Manrope', sans-serif",
        color: 'var(--text-ink)',
        background: 'var(--surface-card)',
      }}
    >
      <h2
        id="source-explainer-title"
        style={{ fontWeight: 800, fontSize: '1.125rem', margin: '0 0 0.75rem', color: 'var(--text-heading)' }}
      >
        How we source quotes
      </h2>
      <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
        Every quote is a real, on-the-record statement.&nbsp; We pull from four kinds of sources, in
        order of preference:
      </p>
      <ol style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.75rem', paddingLeft: '1.25rem' }}>
        {SOURCE_TIERS.map((tier) => (
          <li key={tier}>{tier}</li>
        ))}
      </ol>
      <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
        While you evaluate, we hide each quote's source on purpose.&nbsp; An outlet or venue can hint
        at who is speaking.&nbsp; When you reveal your ballot, every quote shows its full citation
        with a link so you can verify it yourself.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} className="ev-button-primary" style={{ fontSize: '0.875rem' }}>
          Close
        </button>
      </div>
    </dialog>
  );
};

export interface SourceInfoButtonProps {
  /** Render the label text beside the icon (used in the reveal header). */
  showLabel?: boolean;
}

/** ⓘ trigger for the "How we source quotes" explainer. 44px minimum target. */
export const SourceInfoButton: React.FC<SourceInfoButtonProps> = ({ showLabel = false }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.375rem',
          minWidth: showLabel ? undefined : '2.75rem',
          minHeight: '2.75rem',
          padding: showLabel ? '0.5rem 0.25rem' : 0,
          color: 'var(--text-tertiary)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        {showLabel ? (
          <span style={labelStyle}>How we source quotes</span>
        ) : (
          <span className="sr-only">How we source quotes</span>
        )}
      </button>
      {open && <SourceExplainerDialog onClose={() => setOpen(false)} />}
    </>
  );
};
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/SourceExplainer.test.tsx`
Expected: 3 passed. (jsdom does not implement `<dialog>` methods at all — `src/test/setup.ts` stubs `showModal`/`close` on the prototype, added during Task 1 review. Tests must assert open/close via the Close button and dialog unmount, never via Esc, since the stub has no real cancel behavior.)

- [x] **Step 5: Commit**

```bash
git add src/components/SourceExplainer.tsx src/components/__tests__/SourceExplainer.test.tsx
git commit -m "feat: add How-we-source-quotes explainer dialog and trigger"
```

(Amendments from review: dialog needs `background: 'var(--surface-card)'` for dark mode; `dialog::backdrop` scrim added to src/index.css; a cancel-event test covers the Esc path. The spec's "link to methodology page" is intentionally deferred — no methodology page exists yet.)

---

### Task 5: Blind-trust footer on QuoteCard

The evaluation card stays blind but states the rule of the game: "Verified quote.  Source shown at the reveal." with the ⓘ trigger. The footer is a no-drag zone (capture-phase stopPropagation) so pressing ⓘ never starts a swipe. PracticeRound suppresses the footer — practice quotes are not real candidate statements, so "Verified quote" would be false there.

**Files:**
- Modify: `src/components/QuoteCard.tsx` (props at lines 5–17, render at lines 128–137)
- Modify: `src/components/PracticeRound.tsx:148`
- Test: `src/components/__tests__/QuoteCard.test.tsx`

- [x] **Step 1: Write the failing tests** — create `src/components/__tests__/QuoteCard.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuoteCard } from '../QuoteCard';
import type { BlindQuote } from '../../store/useReadRankStore';

const quote: BlindQuote = {
  id: 'q1',
  text: 'A policy statement about housing.',
  candidateToken: 'tok-a',
  topicKey: 'housing',
};

describe('QuoteCard blind-trust footer', () => {
  it('shows the footer with explainer trigger by default', () => {
    render(<QuoteCard quote={quote} onAgree={vi.fn()} onDisagree={vi.fn()} />);
    expect(screen.getByText(/verified quote/i)).toBeInTheDocument();
    expect(screen.getByText(/source shown at the reveal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /how we source quotes/i })).toBeInTheDocument();
  });

  it('never renders per-quote source attribution', () => {
    render(<QuoteCard quote={quote} onAgree={vi.fn()} onDisagree={vi.fn()} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('hides the footer when showTrustFooter is false', () => {
    render(<QuoteCard quote={quote} showTrustFooter={false} onAgree={vi.fn()} onDisagree={vi.fn()} />);
    expect(screen.queryByText(/verified quote/i)).not.toBeInTheDocument();
  });

  it('stops footer pointer events from reaching the drag surface', () => {
    const { container } = render(<QuoteCard quote={quote} onAgree={vi.fn()} onDisagree={vi.fn()} />);
    const card = container.firstElementChild as HTMLElement;
    const dragSpy = vi.fn();
    card.addEventListener('pointerdown', dragSpy);
    fireEvent.pointerDown(screen.getByText(/verified quote/i));
    expect(dragSpy).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/__tests__/QuoteCard.test.tsx`
Expected: FAIL — footer text not found (and `showTrustFooter` prop does not exist yet, which is a type error; that is fine, vitest still reports the failures).

- [x] **Step 3: Add the prop and footer to `src/components/QuoteCard.tsx`**

Add the import at the top (after the existing imports):

```tsx
import { SourceInfoButton } from './SourceExplainer';
```

Add to `QuoteCardProps` (after `externalAnimating?: boolean;`):

```tsx
  /** Hide for practice rounds, where quotes are not real candidate statements. */
  showTrustFooter?: boolean;
```

Add to the destructuring in the component signature (after `externalAnimating = false,`):

```tsx
showTrustFooter = true,
```

Insert the footer immediately after the quote-text `<div>` (after line 137's closing `</div>`, before the closing `</motion.div>`):

```tsx
      {/* Blind-trust footer — generic trust, zero provenance (REDESIGN_SPEC §3.1).
          Capture-phase stop keeps pointer events from starting a card drag. */}
      {showTrustFooter && (
        <div
          onPointerDownCapture={(e) => e.stopPropagation()}
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
          <span
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.8125rem',
              color: 'var(--text-tertiary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>Verified quote.&nbsp; Source shown at the reveal.</span>
          </span>
          <SourceInfoButton />
        </div>
      )}
```

- [x] **Step 4: Suppress the footer in `src/components/PracticeRound.tsx`** — line 148, add the prop:

```tsx
            <QuoteCard key={currentQuote.id} quote={currentQuote} displayNumber={currentIndex + 1}
              showTrustFooter={false}
```

(Keep the rest of that JSX element exactly as it is.)

- [x] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/QuoteCard.test.tsx`
Expected: 4 passed.

- [x] **Step 6: Run the full suite to catch regressions**

Run: `npm test`
Expected: all tests pass.

- [x] **Step 7: Commit**

```bash
git add src/components/QuoteCard.tsx src/components/PracticeRound.tsx src/components/__tests__/QuoteCard.test.tsx
git commit -m "feat: add blind-trust footer to evaluation quote cards"
```

---

### Task 6: Reveal attribution — SourceLine in the breakdown, explainer in the header

Upgrade the ad-hoc source anchor in BallotCard's per-topic breakdown (ResultsPhase.tsx lines 178–183) to the SourceLine primitive, and add the explainer trigger to the reveal header. Export BallotCard so it is unit-testable.

**Files:**
- Modify: `src/components/ResultsPhase.tsx` (imports, line 57 export, lines 178–183, header block at lines 232–246)
- Test: `src/components/__tests__/ResultsPhase.test.tsx`

- [x] **Step 1: Write the failing tests** — create `src/components/__tests__/ResultsPhase.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BallotCard, ResultsPhase } from '../ResultsPhase';
import type { BallotEntry } from '../../data/api';

const entry: BallotEntry = {
  rank: 1,
  candidateId: 'jane-doe',
  name: 'Jane Doe',
  office: 'Candidate for Governor',
  photo: '',
  essentialsUrl: 'https://essentials.empowered.vote/politician/jane-doe',
  evidence: { agreementCount: 1, firstPlaceCount: 1, topicsWithAgreement: 1 },
  perTopic: [
    {
      topicKey: 'housing',
      title: 'Housing',
      userTopWinner: true,
      quotes: [
        {
          quoteId: 'q1',
          text: 'A housing quote.',
          supported: true,
          rank: 1,
          sourceName: 'KQED Forum',
          sourceUrl: 'https://example.com/kqed',
        },
      ],
    },
  ],
};

describe('BallotCard source attribution', () => {
  it('shows a verify link for each quote in the expanded breakdown', async () => {
    render(<BallotCard entry={entry} index={0} verdictMap={{}} prefersReducedMotion={true} />);
    await userEvent.click(screen.getByRole('button', { name: /see what they said/i }));
    const link = screen.getByRole('link', { name: /verify source: KQED Forum/i });
    expect(link).toHaveAttribute('href', 'https://example.com/kqed');
  });
});

describe('ResultsPhase header', () => {
  it('offers the source explainer from the reveal screen', async () => {
    render(<ResultsPhase />);
    expect(
      await screen.findByRole('button', { name: /how we source quotes/i })
    ).toBeInTheDocument();
  });
});
```

(The ResultsPhase test renders with the default store: `currentRaceId` is null, so loading resolves immediately with an empty ballot — the header and explainer trigger render regardless. The zustand store is a module-level singleton with localStorage persistence; if store state ever bleeds between tests, add a `beforeEach` that calls `useReadRankStore.setState({ currentRaceId: null, phase: 'results' })` and `localStorage.clear()`.)

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/__tests__/ResultsPhase.test.tsx`
Expected: FAIL — `BallotCard` is not exported (import error).

- [x] **Step 3: Modify `src/components/ResultsPhase.tsx`**

Add the imports (after the existing imports at the top):

```tsx
import { SourceLine } from './SourceLine';
import { SourceInfoButton } from './SourceExplainer';
```

Export BallotCard — line 57, change:

```tsx
const BallotCard: React.FC<BallotCardProps> = ({ entry, index, verdictMap, address, prefersReducedMotion }) => {
```

to:

```tsx
export const BallotCard: React.FC<BallotCardProps> = ({ entry, index, verdictMap, address, prefersReducedMotion }) => {
```

Replace the inline source anchor (lines 178–183):

```tsx
                  {q.sourceUrl && (
                    <a href={q.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      style={{ marginLeft: '0.375rem', fontSize: '0.6875rem', color: 'var(--color-ev-light-blue)', textDecoration: 'none' }}>
                      {q.sourceName || 'Source'}
                    </a>
                  )}
```

with:

```tsx
                  {q.sourceName && (
                    <span style={{ marginLeft: '0.375rem' }}>
                      <SourceLine sourceName={q.sourceName} sourceUrl={q.sourceUrl} variant="compact" />
                    </span>
                  )}
```

Add the explainer trigger to the header — inside the header `<motion.div>` (lines 232–246), immediately after the closing `</p>` of the subtitle paragraph ("Based only on what you agreed with…"), insert:

```tsx
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.125rem' }}>
          <SourceInfoButton showLabel />
        </div>
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/__tests__/ResultsPhase.test.tsx`
Expected: 2 passed.

- [x] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests pass.

- [x] **Step 6: Commit**

```bash
git add src/components/ResultsPhase.tsx src/components/__tests__/ResultsPhase.test.tsx
git commit -m "feat: reveal-side source attribution with SourceLine and explainer"
```

---

### Task 7: Final verification

- [x] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass (5 test files).

- [x] **Step 2: Lint**

Run: `npm run lint`
Expected: exits 0. Fix any new warnings in files this plan touched.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: `tsc -b` and vite build both exit 0.

- [x] **Step 4: Manual walkthrough**

Run: `npm run dev`, open the printed URL, and verify against REDESIGN_SPEC §3.1/§3.5/§4:

1. Enter the mock race (backend offline → mock fallback). Evaluation card shows the footer "Verified quote.  Source shown at the reveal." with the ⓘ button; no source name or link appears anywhere on the card.
2. Tapping ⓘ opens the explainer; Esc and Close both dismiss it; focus returns to the page.
3. Dragging the card from the quote text still swipes; pressing down on the footer does not start a drag.
4. Practice round cards show no footer.
5. Complete the race, reveal the ballot: header shows "How we source quotes" trigger; expanding "See what they said" shows each quote with its teal verify link opening the source in a new tab.
6. No party label appears anywhere.

- [x] **Step 5: Commit any fixes, then hand off**

Use superpowers:finishing-a-development-branch to merge or open a PR.

---

## Execution Notes (recorded during implementation)

- REDESIGN_SPEC §4 lists a third explainer placement (hub footer); deliberately cut from this plan — both phases are covered (evaluation card footer + reveal header). Backlog item, not a bug.
- A runtime payload sanitizer (`sanitizeRacePayload` in src/data/api.ts) was added beyond the plan after final review: the blind-quote allowlist is now enforced at the fetch boundary, not just in mock data.
- StrictMode bug found in manual browser verification (dialog self-closing via queued close event after effect replay); fixed with an `open` check in the dialog's onClose and a spec-faithful queued-event jsdom stub + StrictMode regression test.
- Tailwind preflight required `margin: auto`, `listStyleType: decimal`, and `userSelect: text` on the dialog (preflight strips UA dialog centering and list numbering; `select-none` on the card inherits into the dialog).
