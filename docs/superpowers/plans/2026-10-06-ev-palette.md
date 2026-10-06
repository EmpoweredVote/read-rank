# ev-ui Palette Switch Implementation Plan (PR 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch every Read & Rank screen from the warm cream palette to the ev-ui palette used by Essentials and Financials, with no layout change.

**Architecture:** All app colour already flows through semantic CSS custom properties in `src/index.css` (`:root` = light, `.dark` = dark). We change token values, delete the paper-grain overlay, fix the missing `ev-yellow-dark` Tailwind colour, and move the few hard-coded hex colours in `AddressFilterInput.tsx` onto tokens. A Vitest test parses `index.css` and locks the token values and their contrast ratios.

**Tech Stack:** React 19, Vite, Tailwind CSS v4 (CSS-first `@theme` in `src/index.css`; `tailwind.config.js` is NOT loaded — there is no `@config`), Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-06-landing-ev-palette-design.md` (section "PR 1 — ev-ui palette").

## Global Constraints

- Branch: `feat/landing-ev-palette` (already created; spec committed as `77f1583`). Never commit on `main`.
- Colour values come from `@empoweredvote/ev-ui` `src/tokens.js` (see `../ev-ui/src/tokens.js`). Use the exact hex values in the tables below.
- Every text token must reach **≥ 4.5:1** contrast on the surfaces it sits on, in both themes.
- Do **not** change: agree/disagree tokens, banner tokens, podium tokens, tier-frame tokens, progress tokens, motion tokens, fonts (Manrope stays).
- Do **not** change the pizza warm-up colours in `PracticeRound.tsx`, `PracticeResultsScreen.tsx`, `src/data/practiceData.ts`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Commands: `npm test` (vitest run), `npm run lint`, `npm run build`.

## File map

| File | Change |
|---|---|
| `src/index.css` | Token values in `:root` and `.dark`; delete grain; add `--color-ev-yellow-dark` to `@theme` |
| `tailwind.config.js` | `ev-yellow-dark` → `#D0A301` (file is not loaded by Tailwind v4, but keep it truthful) |
| `src/components/AddressFilterInput.tsx` | Hard-coded hex → tokens |
| `src/__tests__/palette.test.ts` | **New.** Parses `index.css`; asserts token values, contrast, grain removal, yellow-dark |
| `src/__tests__/noHardcodedChrome.test.ts` | **New.** Asserts no hex literals in `AddressFilterInput.tsx` |

---

### Task 1: Lock the new palette with a token test, then change the tokens

**Files:**
- Create: `src/__tests__/palette.test.ts`
- Modify: `src/index.css` (`:root` block starting line 36; `.dark` block starting line 116)

**Interfaces:**
- Produces: `src/__tests__/palette.test.ts` exports nothing; Task 2 appends `it(...)` cases to it and reuses its helpers `readCss()` and `block()`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/palette.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function readCss(): string {
  return readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
}

/** Return the body of the first rule whose selector line is exactly `selector {`. */
export function block(css: string, selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') { depth--; if (depth === 0) return css.slice(open + 1, i); }
  }
  throw new Error(`unclosed block: ${selector}`);
}

function token(body: string, name: string): string {
  const m = body.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`token not found or not a 6-digit hex: ${name}`);
  return m[1].toUpperCase();
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT: Record<string, string> = {
  '--surface-page': '#F0F8FA',
  '--surface-card': '#FFFFFF',
  '--surface-raised': '#F5F9FA',
  '--surface-sunken': '#F7F7F8',
  '--text-ink': '#212326',
  '--text-heading': '#212326',
  '--text-strong': '#2F3237',
  '--text-secondary': '#535964',
  '--text-tertiary': '#5F6570',
  '--text-link': '#00657C',
  '--border-subtle': '#E2EBEF',
  '--border-medium': '#D3D7DE',
  '--border-faint': '#EBEDEF',
  '--action-primary': '#005366',
  '--action-primary-hover': '#003E4D',
};

const DARK: Record<string, string> = {
  '--surface-page': '#131416',
  '--surface-card': '#212326',
  '--surface-raised': '#2F3237',
  '--surface-sunken': '#1A1B1E',
  '--text-ink': '#EBEDEF',
  '--text-heading': '#F7F7F8',
  '--text-strong': '#D3D7DE',
  '--text-secondary': '#B3BBCC',
  '--text-tertiary': '#8F9EBC',
  '--text-link': '#59B0C4',
  '--border-subtle': '#2F3237',
  '--border-medium': '#41454E',
  '--border-faint': '#262729',
  '--action-primary': '#59B0C4',
};

const TEXT = ['--text-ink', '--text-heading', '--text-strong', '--text-secondary', '--text-tertiary', '--text-link'];
const SURFACES = ['--surface-page', '--surface-card', '--surface-raised', '--surface-sunken'];

describe('ev-ui palette tokens', () => {
  const css = readCss();
  const light = block(css, ':root');
  const dark = block(css, '.dark');

  it.each(Object.entries(LIGHT))('light %s = %s', (name, hex) => {
    expect(token(light, name)).toBe(hex);
  });

  it.each(Object.entries(DARK))('dark %s = %s', (name, hex) => {
    expect(token(dark, name)).toBe(hex);
  });

  it.each([['light', LIGHT], ['dark', DARK]] as const)('%s: every text token is >= 4.5:1 on every surface', (_t, set) => {
    for (const t of TEXT) for (const s of SURFACES) {
      const ratio = contrast(set[t], set[s]);
      expect(ratio, `${t} ${set[t]} on ${s} ${set[s]} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('primary button ink is >= 4.5:1 on the primary fill in both themes', () => {
    expect(contrast(token(light, '--action-primary-ink'), LIGHT['--action-primary'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(dark, '--action-primary-ink'), DARK['--action-primary'])).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/palette.test.ts`
Expected: FAIL — e.g. `light --surface-page = #F0F8FA` receives `#FAF7F2`. (The contrast cases may pass already; that is fine.)

- [ ] **Step 3: Change the light tokens**

In `src/index.css`, inside the `:root {` block, replace these lines exactly (leave every other line in the block untouched):

```css
  --surface-page: #F0F8FA;
  --surface-card: #FFFFFF;
  --surface-raised: #F5F9FA;
  --surface-sunken: #F7F7F8;

  --text-ink: #212326;
  --text-heading: #212326;
  --text-strong: #2F3237;
  --text-secondary: #535964; /* ev-ui gray-600 — 6.55:1 on page */
  --text-tertiary: #5F6570;  /* between gray-500/600 — 5.45:1 on page (gray-500 #6B7280 is 4.49:1, fails AA) */
  --text-link: #00657C;      /* ev-ui teal-500 — 6.19:1 on page */

  --border-subtle: #E2EBEF;
  --border-medium: #D3D7DE;
  --border-faint: #EBEDEF;
```

and in the same block:

```css
  --action-primary: #005366;       /* ev-ui buttonPrimary */
  --action-primary-hover: #003E4D; /* ev-ui buttonPrimary hover */
```

- [ ] **Step 4: Change the dark tokens**

In the `.dark {` block, replace these lines exactly:

```css
  --surface-page: #131416;   /* ev-ui gray-950 — matches Financials/Compass */
  --surface-card: #212326;   /* gray-900 */
  --surface-raised: #2F3237; /* gray-800 */
  --surface-sunken: #1A1B1E;

  --text-ink: #EBEDEF;
  --text-heading: #F7F7F8;
  --text-strong: #D3D7DE;
  --text-secondary: #B3BBCC; /* gray-300 — 8.17:1 on dark card */
  --text-tertiary: #8F9EBC;  /* gray-400 — 5.84:1 on dark card */
  --text-link: #59B0C4;      /* skyblue-500 — 6.33:1 on dark card */

  --border-subtle: #2F3237;
  --border-medium: #41454E;
  --border-faint: #262729;
```

and:

```css
  --action-primary: #59B0C4;
```

(`--action-primary-hover` and `--action-primary-ink` in `.dark` stay as they are.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/palette.test.ts`
Expected: PASS (all cases). If a contrast case fails, the message names the pair; stop and report it — do not invent a new value.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS. No other test asserts these hex values; if one does, update its expected value to the new token and note it in the commit body.

- [ ] **Step 7: Commit**

```bash
git add src/__tests__/palette.test.ts src/index.css
git commit -m "feat(theme): switch semantic tokens to the ev-ui palette

Light page is ev-ui bgLight #F0F8FA (same as Essentials); dark page is
gray-950 #131416 (same as Financials/Compass). Text and borders use the
ev-ui gray scale. A token test locks the values and AA contrast.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Remove the paper grain and fix `ev-yellow-dark`

**Files:**
- Modify: `src/__tests__/palette.test.ts` (append a `describe`)
- Modify: `src/index.css` (`@theme` block line 11; `--grain-opacity` in `:root` line ~90 and `.dark` line ~165; `body::before` rule line ~198)
- Modify: `tailwind.config.js:17`

**Interfaces:**
- Consumes: `readCss()`, `block()` from Task 1 (same file).

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/palette.test.ts`:

```ts
describe('palette cleanup', () => {
  const css = readCss();

  it('has no paper-grain overlay', () => {
    expect(css).not.toMatch(/--grain-opacity/);
    expect(css).not.toMatch(/body::before/);
  });

  it('defines ev-yellow-dark as the ev-ui value in @theme', () => {
    expect(block(css, '@theme')).toMatch(/--color-ev-yellow-dark:\s*#D0A301;/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/palette.test.ts -t "palette cleanup"`
Expected: FAIL on both cases.

- [ ] **Step 3: Implement**

1. In `src/index.css` `@theme { … }`, after `--color-ev-yellow: #fed12e;` add:
   ```css
     --color-ev-yellow-dark: #D0A301; /* ev-ui yellowDark — hover for yellow buttons */
   ```
   (Before this, the `hover:bg-ev-yellow-dark` class in `AddressFilterInput.tsx` produced no CSS, because Tailwind v4 reads colours from `@theme`, not from `tailwind.config.js`.)
2. Delete the line `--grain-opacity: 0.025;` from `:root` and `--grain-opacity: 0.04;` from `.dark`.
3. Delete the whole rule that starts with the comment `/* Subtle paper grain texture via pseudo-element */` through the closing `}` of `body::before { … }`.
4. In `tailwind.config.js`, change `'ev-yellow-dark': '#eab308',` to `'ev-yellow-dark': '#D0A301',`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/__tests__/palette.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/palette.test.ts src/index.css tailwind.config.js
git commit -m "feat(theme): drop paper grain, define ev-ui yellow-dark

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Move hard-coded colours in `AddressFilterInput` onto tokens

**Files:**
- Create: `src/__tests__/noHardcodedChrome.test.ts`
- Modify: `src/components/AddressFilterInput.tsx` (lines ~166-175 chip; ~244-258 promotion banner)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/noHardcodedChrome.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// App-chrome components must take colour from the semantic tokens in index.css,
// so a palette change is a token change. (The pizza warm-up keeps its own colours.)
const CHROME_FILES = ['src/components/AddressFilterInput.tsx'];

describe('app chrome uses tokens, not hex literals', () => {
  it.each(CHROME_FILES)('%s has no hex colour literals', (file) => {
    const src = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(src.match(/#[0-9a-fA-F]{6}\b/g) ?? []).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/noHardcodedChrome.test.ts`
Expected: FAIL listing `#e8f4f6`, `#00657c`, `#1a1a2e`, `#003E4D`, `#e8f4f6`, `#00657c`.

- [ ] **Step 3: Implement**

In `src/components/AddressFilterInput.tsx`:

- Address chip container: `className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e8f4f6]"` → `className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface-raised)]"`
- Chip pin icon: `stroke="#00657c"` → `stroke="var(--text-link)"`
- Chip address text: `style={{ color: '#1a1a2e', fontFamily: "'Manrope', sans-serif" }}` → `style={{ color: 'var(--text-ink)', fontFamily: "'Manrope', sans-serif" }}`
- Promotion banner: `className="… text-[#003E4D] text-[0.8125rem]"` → `className="… text-[var(--text-link)] text-[0.8125rem]"` and `style={{ background: '#e8f4f6', … }}` → `style={{ background: 'var(--surface-raised)', … }}`
- Promotion "Use it" button: `background: '#00657c'` → `background: 'var(--action-primary)'`, and its `text-white` class → `text-[var(--action-primary-ink)]`

(The chip is replaced in PR 2; it still gets tokens here so PR 1 stands alone.)

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/noHardcodedChrome.test.ts src/components/__tests__/AddressFilterInput.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/noHardcodedChrome.test.ts src/components/AddressFilterInput.tsx
git commit -m "refactor(address): take chip and banner colours from tokens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Verify visually, then open PR 1

**Files:** none changed (screenshots go to the scratchpad and the PR body).

- [ ] **Step 1: Full checks**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 2: Capture "before" screenshots from `main`**

Capture "before" from the live site https://readrank.empowered.vote (it runs `main`), with PostHog requests blocked. Capture at 1280×900 and 390×844, light and dark, these screens: landing, browse ("Browse all races"), issues (open the featured race), read (Start, Skip All coach marks), ranking (agree one quote), ballot (finish and reveal).

- [ ] **Step 3: Capture "after" screenshots**

Start the dev server: `preview_start` with name `read-rank-dev` (port 5180). Local dev uses mock data (`.env.local` points the API at localhost), which is fine for a palette check. Capture the same screens, sizes and themes. Toggle dark mode with the header moon button.

- [ ] **Step 4: Review the screenshots**

Check: no warm cream left anywhere; no unreadable text; cards still separate from the page; focus rings visible; the race-card motif and podium/tier colours unchanged. Fix any token you missed with a further commit (test first if it is a token).

- [ ] **Step 5: Push and open the PR**

PR 1 is the palette commits only. Branch `feat/ev-palette` from the current HEAD so PR 2 can continue on `feat/landing-ev-palette`:

```bash
git branch feat/ev-palette
git push -u origin feat/ev-palette
gh pr create --base main --head feat/ev-palette \
  --title "feat(theme): switch Read & Rank to the ev-ui palette" \
  --body "<summary, token table, before/after screenshots, test plan; end with the Claude Code attribution line>"
```

Bind the PR with the ccd_pr tools after it opens.
