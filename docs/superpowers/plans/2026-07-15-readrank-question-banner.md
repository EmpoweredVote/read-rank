# Read & Rank Question Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the evaluation-card question the visual hero — 22px / weight 800, with a "yellow through-line" (black-on-yellow highlighter in light mode, yellow text in dark mode).

**Architecture:** The question already renders from `topic.question` in `TopicStepper`. This is a presentation-only change: wrap the question text in a highlight `<span>`, move the inline styles into `.question-banner` CSS, and add light/dark rules. No data, store, or API changes. The server-side per-race override (a separate ev-accounts plan) flows through this banner unchanged because it only affects the value of `topic.question`.

**Tech Stack:** React + TypeScript, Vite, plain CSS (`src/index.css` with `.dark`-class dark mode), Vitest + Testing Library.

**Scope note:** This is Part B of `docs/superpowers/specs/2026-07-15-bespoke-race-topic-questions-design.md`. Parts A (ev-accounts data model), C (curation docs/skills), and D (CA-governor seed) are separate plans.

---

## File Structure

- **Modify:** `src/components/TopicStepper.tsx` — swap the inline-styled `<h2>` for a class-based `<h2>` with a `.question-banner-hl` `<span>` around the question text.
- **Modify:** `src/index.css` — replace the `.question-banner h2` rule (~line 620) with the 22px/800 treatment; add `.question-banner-hl` (light highlighter) and `.dark .question-banner-hl` (dark yellow text).
- **Create:** `src/components/__tests__/TopicStepper.test.tsx` — structural render test (question renders inside the highlight span).

**Why a structural test only:** jsdom does not compute styles from stylesheets, so font-size/colour can't be unit-tested meaningfully. The unit test locks the markup contract (question text lives inside `.question-banner-hl`); the *visual* result is verified in the browser (Task 3).

---

## Task 1: Banner markup + structural test

**Files:**
- Test: `src/components/__tests__/TopicStepper.test.tsx`
- Modify: `src/components/TopicStepper.tsx:39-45`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/TopicStepper.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicStepper } from '../TopicStepper';
import { useReadRankStore, type RacePayload } from '../../store/useReadRankStore';

const payload: RacePayload = {
  raceId: 'race-q',
  positionName: 'Governor',
  topics: [
    {
      topicKey: 'fossil-fuels',
      title: 'Fossil fuels',
      question: 'Should California phase out oil & gas drilling?',
      quotes: [
        { id: 'q1', text: 'One.', candidateToken: 'a', topicKey: 'fossil-fuels' },
        { id: 'q2', text: 'Two.', candidateToken: 'b', topicKey: 'fossil-fuels' },
      ],
    },
  ],
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  useReadRankStore.getState().selectRace(payload);
});

describe('TopicStepper question banner', () => {
  it('renders the topic question inside the yellow highlight span', () => {
    render(<TopicStepper />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Should California phase out oil & gas drilling?');
    const hl = heading.querySelector('.question-banner-hl');
    expect(hl).not.toBeNull();
    expect(hl).toHaveTextContent('Should California phase out oil & gas drilling?');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/TopicStepper.test.tsx`
Expected: FAIL — the heading has no `.question-banner-hl` child (`hl` is `null`), so `expect(hl).not.toBeNull()` fails.

- [ ] **Step 3: Update the markup**

In `src/components/TopicStepper.tsx`, replace the banner block (lines 39-45):

```tsx
      {topic && (
        <div className="question-banner">
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.9375rem', textAlign: 'center' }}>
            {topic.question}
          </h2>
        </div>
      )}
```

with:

```tsx
      {topic && (
        <div className="question-banner">
          <h2>
            <span className="question-banner-hl">{topic.question}</span>
          </h2>
        </div>
      )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/TopicStepper.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopicStepper.tsx src/components/__tests__/TopicStepper.test.tsx
git commit -m "refactor(banner): wrap question in highlight span + structural test"
```

---

## Task 2: Banner CSS treatment (22px, yellow through-line)

**Files:**
- Modify: `src/index.css` (the `.question-banner h2` rule at ~line 620)

- [ ] **Step 1: Replace the `.question-banner h2` rule and add the highlight rules**

In `src/index.css`, find (around line 620):

```css
.question-banner h2 {
  margin: 0;
  color: var(--banner-heading);
}
```

Replace it with:

```css
.question-banner h2 {
  margin: 0;
  font-family: 'Manrope', sans-serif;
  font-weight: 800;
  font-size: 1.375rem; /* 22px — the question is the hero of the card */
  line-height: 1.32;
  text-align: center;
  color: var(--banner-heading); /* fallback only; the text lives in .question-banner-hl */
}

/* Yellow through-line: the question is "yellow" in both themes.
   Light = black-on-yellow highlighter (the one approved yellow surface, §5 #7).
   Dark  = yellow text on the dark banner. */
.question-banner-hl {
  background-color: var(--color-ev-yellow);
  color: var(--color-ev-black, #1c1c1c);
  padding: 0.06em 0.3em;
  border-radius: 3px;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.dark .question-banner-hl {
  background-color: transparent;
  color: var(--color-ev-yellow);
  padding: 0;
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS (all existing tests + the new TopicStepper test).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(banner): 22px yellow-through-line question treatment (light highlighter / dark yellow)"
```

---

## Task 3: Browser verification (light + dark)

No code changes unless a defect is found. Verify the real rendered result — jsdom can't.

- [ ] **Step 1: Start the dev server**

Use the preview tool: `preview_start` with `{ name: "read-rank-dev" }` (from `.claude/launch.json`, port 5180).

- [ ] **Step 2: Reach an evaluation card**

Navigate the preview to the app root, then click through to a race's evaluation phase (`EvaluationPhase` renders `TopicStepper`). If the flow is unclear at runtime, use `read_page` to find the "Browse"/race entry and the "Start"/begin-ranking control.

- [ ] **Step 3: Verify light mode**

Confirm the question renders at ~22px, weight 800, with a **yellow highlighter behind black text**. Take a screenshot (`computer { action: "screenshot" }`).
Check `read_console_messages` for errors.

- [ ] **Step 4: Verify dark mode**

Enable dark mode. Preferred: `resize_window` with `{ colorScheme: "dark" }`. If the app toggles dark via the `.dark` class rather than the media query, force it with `javascript_tool`: `document.documentElement.classList.add('dark')`, then re-check.
Confirm the question is now **yellow text** (no highlighter) on the dark banner. Screenshot.

- [ ] **Step 5: Confirm contrast (AA)**

Spot-check with `javascript_tool` that the highlight span uses the expected colours:
`getComputedStyle(document.querySelector('.question-banner-hl')).color` and `.backgroundColor`.
Expected light: color ≈ `rgb(28, 28, 28)`, background ≈ `rgb(254, 209, 46)`.
Expected dark: color ≈ `rgb(254, 209, 46)`, background `rgba(0, 0, 0, 0)`.
Both black-on-yellow and yellow-on-dark exceed WCAG AA for large text.

- [ ] **Step 6: Fix + re-verify if needed**

If long questions overflow or wrap poorly on mobile, add a small-screen size reduction to the existing `@media (max-width: 640px) .question-banner` block (e.g. `.question-banner h2 { font-size: 1.25rem; }`), then re-run `npx vitest run`, re-screenshot, and commit:

```bash
git add src/index.css
git commit -m "fix(banner): tighten question size on small screens"
```

---

## Self-Review (completed by plan author)

- **Spec coverage (Part B):** 22px/800 ✓ (Task 2); light highlighter black-on-yellow ✓; dark yellow text ✓; no kicker ✓ (markup has no kicker); boxed banner kept ✓ (`.question-banner` untouched); inline styles moved to CSS ✓ (Task 1 markup + Task 2 CSS); mobile wrapping ✓ (Task 3 Step 6); a11y AA verified ✓ (Task 3 Step 5); render test ✓ (Task 1).
- **Placeholders:** none — every code step shows complete code; commands and expected output are exact.
- **Type consistency:** class names `question-banner-hl` and the `<span>`/`<h2>` structure match across TopicStepper.tsx, index.css, and the test.
