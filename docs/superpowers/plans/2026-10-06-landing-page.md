# Landing Page Refresh Implementation Plan (PR 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Read & Rank landing page to Aditi's prototype hero (timeline steps, "Choose an election ↓" button) and give the "Choose an election" section an address line with Change and a segmented Upcoming/Past switch.

**Architecture:** `Landing.tsx` owns the hero, timeline and section header. A new `TimeFilterSwitch` component replaces the Upcoming/Past chips; `RaceHub` accepts the time filter as optional controlled props so the switch can sit in Landing's header row. `AddressFilterInput` replaces its address chip with a "Races for … Change" line and an edit state (Cancel / Clear address / Escape). The Google Places hook gains an `attachKey` so autocomplete attaches when the input mounts late.

**Tech Stack:** React 19, framer-motion, Zustand store (`useReadRankStore`), Tailwind v4 + semantic CSS tokens in `src/index.css`, Vitest + jsdom + Testing Library + user-event.

**Spec:** `docs/superpowers/specs/2026-10-06-landing-ev-palette-design.md` (section "PR 2 — landing page").
**Depends on:** PR 1 plan `docs/superpowers/plans/2026-10-06-ev-palette.md` (tokens `--action-primary` `#005366`, `--surface-raised`, etc.). Work on branch `feat/landing-ev-palette`, on top of the PR 1 commits.

## Global Constraints

- Type scale (unchanged from today): eyebrow 12 px / 700 / `tracking-widest` / uppercase / `--text-link`; H1 `text-5xl sm:text-6xl font-bold leading-tight`; lede `text-lg leading-relaxed` `--text-secondary`; H2 `text-2xl sm:text-3xl font-semibold` `--text-link`.
- Colours only through tokens (`var(--…)`); no new hex literals in components.
- Copy, verbatim:
  - Lede: "Real quotes from real candidates, with no names and no parties. Form your own view, then see who you actually agree with."
  - Button: "Choose an election" + a down arrow icon.
  - Warm-up: "Try a warm-up with pizza opinions" + "30 sec".
  - Steps: 1 "Pick an election" / "Local and upcoming races in our Alpha communities." · 2 "Read the quotes" / "Judge positions on their words alone." · 3 "Rank the candidates" / "See who earned your trust, and where you align."
  - Address line: "Races for **{address}**" + "Change". Edit state buttons: "Cancel", "Clear address".
- Do not change: `RaceCard`, closeness tiers, "Browse other races ›"/"Browse all races ›", browse view, empty-state copy, the address placeholder text.
- `RaceHub` rendered alone by `PhaseContainer` (`default: return <RaceHub />`) must keep working with no props.
- Respect reduced motion via `useMotion()` (`m.reduced`).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Responsibility |
|---|---|
| `src/components/TimeFilterSwitch.tsx` | **New.** Segmented Upcoming/Past control |
| `src/components/RaceHub.tsx` | Use `TimeFilterSwitch`; accept controlled `timeFilter` props + `hideTimeFilter` |
| `src/hooks/useGooglePlacesAutocomplete.ts` | Add `attachKey` option so autocomplete re-attaches when the input mounts |
| `src/components/AddressFilterInput.tsx` | Address line + Change → edit state (Cancel / Clear address / Escape) |
| `src/components/Landing.tsx` | New hero, timeline, CTA scroll/focus, section header with switch + address |
| `src/index.css` | `.rr-segmented*`, `.rr-address-line`, `.rr-text-btn`, `.rr-timeline*`, `.rr-cta`; delete `.rr-step*` |
| `src/components/__tests__/TimeFilterSwitch.test.tsx` | **New** |
| `src/components/__tests__/RaceHub.test.tsx` | Add controlled-props test |
| `src/components/__tests__/AddressFilterInput.test.tsx` | Add address-line tests |
| `src/components/__tests__/Landing.test.tsx` | Update to new hero |

---

### Task 1: `TimeFilterSwitch` + controlled time filter in `RaceHub`

**Files:**
- Create: `src/components/TimeFilterSwitch.tsx`
- Create: `src/components/__tests__/TimeFilterSwitch.test.tsx`
- Modify: `src/components/RaceHub.tsx` (props interface line 18; state line 36; chips block lines ~224-244)
- Modify: `src/components/__tests__/RaceHub.test.tsx`
- Modify: `src/index.css` (append)

**Interfaces:**
- Produces: `export function TimeFilterSwitch(props: { value: TimeFilter; onChange: (next: TimeFilter) => void }): JSX.Element` — renders `role="group"` `aria-label="Filter by election timing"` with two `<button aria-pressed>` named "Upcoming" and "Past".
- Produces: `RaceHubProps` gains `timeFilter?: TimeFilter; onTimeFilterChange?: (next: TimeFilter) => void; hideTimeFilter?: boolean`.
- Consumes: `type TimeFilter = 'upcoming' | 'past'` from `src/utils/raceGrouping.ts`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/TimeFilterSwitch.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeFilterSwitch } from '../TimeFilterSwitch';

describe('TimeFilterSwitch', () => {
  it('marks the current value as pressed', () => {
    render(<TimeFilterSwitch value="past" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /filter by election timing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Past' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Upcoming' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked value', async () => {
    const onChange = vi.fn();
    render(<TimeFilterSwitch value="upcoming" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Past' }));
    expect(onChange).toHaveBeenCalledWith('past');
  });
});
```

Append to `src/components/__tests__/RaceHub.test.tsx` (inside the existing top-level `describe`, reusing its imports and `beforeEach`; add `vi` to the vitest import if missing):

```tsx
  it('uses a controlled time filter and can hide its own switch', async () => {
    useReadRankStore.getState().setLocationFilter({
      address: 'Indianapolis, IN', politicianIds: [], state: 'IN', county: null, countyName: null,
      jurisdiction: null,
    });
    const onTimeFilterChange = vi.fn();
    render(<RaceHub timeFilter="past" onTimeFilterChange={onTimeFilterChange} hideTimeFilter />);
    // Controlled "past": the 2024 demo race shows without clicking a tab.
    expect(await screen.findByRole('button', { name: /open governor race/i })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /filter by election timing/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/__tests__/TimeFilterSwitch.test.tsx src/components/__tests__/RaceHub.test.tsx`
Expected: FAIL — `TimeFilterSwitch` module not found; RaceHub test cannot find the governor card (internal state is still "upcoming") or the props are type errors.

- [ ] **Step 3: Implement `TimeFilterSwitch`**

Create `src/components/TimeFilterSwitch.tsx`:

```tsx
import type { TimeFilter } from '../utils/raceGrouping';

interface TimeFilterSwitchProps {
  value: TimeFilter;
  onChange: (next: TimeFilter) => void;
}

const OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

/** Segmented Upcoming/Past control for the race list (prototype screen 1). */
export function TimeFilterSwitch({ value, onChange }: TimeFilterSwitchProps) {
  return (
    <div className="rr-segmented" role="group" aria-label="Filter by election timing">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className="rr-segmented__btn"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

Append to `src/index.css`:

```css
/* Segmented switch (Upcoming / Past) */
.rr-segmented {
  display: inline-flex; gap: 0.25rem; padding: 0.25rem;
  border: 1px solid var(--border-subtle); border-radius: 9999px;
  background: var(--surface-card);
}
.rr-segmented__btn {
  font-family: 'Manrope', sans-serif; font-size: 0.875rem; font-weight: 600;
  padding: 0.375rem 1rem; border-radius: 9999px; border: none; cursor: pointer;
  background: transparent; color: var(--text-secondary); min-height: 2.25rem;
}
.rr-segmented__btn[aria-pressed='true'] {
  background: var(--action-primary); color: var(--action-primary-ink); font-weight: 700;
}
.rr-segmented__btn:focus-visible { outline: 2px solid var(--text-link); outline-offset: 2px; }
```

- [ ] **Step 4: Make `RaceHub` controllable**

In `src/components/RaceHub.tsx`:

1. Import: `import { TimeFilterSwitch } from './TimeFilterSwitch';`
2. Props:
   ```tsx
   interface RaceHubProps {
     hideHeader?: boolean;
     hideFilter?: boolean;
     /** Controlled time filter. When omitted, RaceHub keeps its own state. */
     timeFilter?: TimeFilter;
     onTimeFilterChange?: (next: TimeFilter) => void;
     /** Hide RaceHub's own switch (the parent renders it, e.g. Landing's header row). */
     hideTimeFilter?: boolean;
   }
   ```
3. Signature: `({ hideHeader = false, hideFilter = false, timeFilter: timeFilterProp, onTimeFilterChange, hideTimeFilter = false })`
4. Replace `const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');` with:
   ```tsx
   const [timeFilterState, setTimeFilterState] = useState<TimeFilter>('upcoming');
   const timeFilter = timeFilterProp ?? timeFilterState;
   const setTimeFilter = (next: TimeFilter) => {
     if (timeFilterProp === undefined) setTimeFilterState(next);
     onTimeFilterChange?.(next);
   };
   ```
5. Replace the whole `{/* Time filter chips */} <div className="flex gap-2 …" role="group" …> … </div>` block with:
   ```tsx
   {!hideTimeFilter && (
     <div className="mt-2 mb-1">
       <TimeFilterSwitch value={timeFilter} onChange={setTimeFilter} />
     </div>
   )}
   ```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/__tests__/TimeFilterSwitch.test.tsx src/components/__tests__/RaceHub.test.tsx src/components/__tests__/Landing.test.tsx`
Expected: PASS (Landing's existing "Past" click still works — the button name is still "Past").

- [ ] **Step 6: Commit**

```bash
git add src/components/TimeFilterSwitch.tsx src/components/__tests__/TimeFilterSwitch.test.tsx src/components/RaceHub.tsx src/components/__tests__/RaceHub.test.tsx src/index.css
git commit -m "feat(hub): segmented Upcoming/Past switch, controllable from the parent

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Let Google Places autocomplete attach to a late-mounted input

**Files:**
- Modify: `src/hooks/useGooglePlacesAutocomplete.ts`

**Interfaces:**
- Produces: `useGooglePlacesAutocomplete(inputRef, { onPlaceSelected, attachKey?: unknown })` — the attach effect re-runs whenever `attachKey` changes.

Today the effect depends only on `[inputRef]`, so if the component first mounts with the input hidden (address already known), autocomplete never attaches when the input appears later. Task 3's Change flow mounts the input late, so this must be fixed first. (Google Maps does not load in jsdom — the hook already sets `loadError` without an API key — so this is verified by type check and the manual check in Task 4, not a unit test.)

- [ ] **Step 1: Implement**

```ts
interface UseGooglePlacesAutocompleteOptions {
  onPlaceSelected: (formattedAddress: string) => void;
  /** Change this value when the input element mounts/unmounts so autocomplete re-attaches. */
  attachKey?: unknown;
}

export default function useGooglePlacesAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  { onPlaceSelected, attachKey }: UseGooglePlacesAutocompleteOptions
): { loadError: boolean } {
```

and change the effect's dependency list from `}, [inputRef]);` to `}, [inputRef, attachKey]);`.

- [ ] **Step 2: Type-check and test**

Run: `npx tsc -b && npx vitest run src/components/__tests__/AddressFilterInput.test.tsx`
Expected: no type errors; PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGooglePlacesAutocomplete.ts
git commit -m "fix(places): re-attach autocomplete when the address input remounts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Address line with Change / Cancel / Clear address

**Files:**
- Modify: `src/components/AddressFilterInput.tsx`
- Modify: `src/components/__tests__/AddressFilterInput.test.tsx`
- Modify: `src/index.css` (append)

**Interfaces:**
- Consumes: `useGooglePlacesAutocomplete(inputRef, { onPlaceSelected, attachKey })` from Task 2.
- Produces: no new exports. `AddressFilterInput` renders, when an address is known and not editing, a paragraph containing "Races for" + the (≤ 40 char) address and a button "Change".

- [ ] **Step 1: Write the failing tests**

Append to `src/components/__tests__/AddressFilterInput.test.tsx`:

```tsx
describe('AddressFilterInput known-address line', () => {
  const located = {
    address: '100 W Kirkwood Ave, Bloomington, IN 47404',
    politicianIds: ['p1'], state: 'IN', county: null, countyName: null, jurisdiction: null,
  };

  it('shows "Races for" with the address and a Change button, and no textbox', () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    expect(screen.getByText(/races for/i)).toHaveTextContent('100 W Kirkwood Ave');
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('Change opens a focused search box with Cancel and Clear address', async () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear address' })).toBeInTheDocument();
  });

  it('Cancel and Escape return to the line without changing the filter', async () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Change' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    expect(setLocationFilter).not.toHaveBeenCalled();
    expect(clearLocationFilter).not.toHaveBeenCalled();
  });

  it('Clear address clears the location filter', async () => {
    storeSlice.locationFilter = located;
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear address' }));
    expect(clearLocationFilter).toHaveBeenCalledTimes(1);
  });

  it('a successful new address search closes the edit state', async () => {
    storeSlice.locationFilter = located;
    resolveQueryRoute.mockResolvedValue({ kind: 'address' });
    searchPoliticians.mockResolvedValueOnce({ data: [{ id: 'p2' }], county: null });
    render(<AddressFilterInput />);
    await userEvent.click(screen.getByRole('button', { name: 'Change' }));
    await userEvent.type(screen.getByRole('textbox'), '1 Main St, Salt Lake City, UT');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => expect(setLocationFilter).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Change' })).toBeInTheDocument();
  });

  it('with no address, shows the search box and no "Races for" line', () => {
    storeSlice.locationFilter = null;
    render(<AddressFilterInput />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(/races for/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/__tests__/AddressFilterInput.test.tsx`
Expected: the new cases FAIL (today a chip with "Clear filter" renders, not "Races for … Change"); the existing three still PASS.

- [ ] **Step 3: Implement**

In `src/components/AddressFilterInput.tsx`:

1. State, next to the other `useState` calls:
   ```tsx
   const [editing, setEditing] = useState(false);
   const showInput = locationFilter === null || editing;
   ```
2. In `handlePlaceSelected`, inside `if (politicianIds.length > 0) { … }`, after `writeAddressToContext(…)`, add `setEditing(false);`.
3. In `handleSubmit`, in both browse branches, call `setEditing(false);` before `return;`:
   ```tsx
   if (route.kind === 'browse-state') { setEditing(false); setBrowseTarget({ state: route.state, geoid: null }); return; }
   if (route.kind === 'browse-county') { setEditing(false); setBrowseTarget({ state: route.state, geoid: route.geoid }); return; }
   ```
4. Hook call: `useGooglePlacesAutocomplete(inputRef, { onPlaceSelected: handlePlaceSelected, attachKey: showInput });`
5. Focus when editing opens:
   ```tsx
   useEffect(() => {
     if (editing) inputRef.current?.focus();
   }, [editing]);
   ```
6. Replace the `<AnimatePresence mode="wait"> {locationFilter !== null ? ( …chip… ) : ( …input… )} </AnimatePresence>` with:
   ```tsx
   <AnimatePresence mode="wait">
     {!showInput ? (
       <motion.p
         key="line"
         className="rr-address-line"
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         transition={m.transition(DUR.base)}
       >
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
           className="rr-address-line__pin">
           <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
           <circle cx="12" cy="10" r="3" />
         </svg>
         <span>Races for <strong>{truncatedAddress}</strong></span>
         <button type="button" className="rr-text-btn" onClick={() => setEditing(true)}>
           Change
         </button>
       </motion.p>
     ) : (
       <motion.div
         key="input"
         initial={m.reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
         animate={{ opacity: 1, y: 0 }}
         exit={m.reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
         transition={m.transition(DUR.base)}
       >
         {/* …the existing <div className="flex gap-2"> input + Search button, unchanged,
             except the input's onKeyDown becomes: */}
         {/* onKeyDown={(e) => {
               if (e.key === 'Enter') handleSubmit(inputValue);
               if (e.key === 'Escape' && editing) setEditing(false);
             }} */}
         {editing && (
           <div className="flex gap-4 mt-2">
             <button type="button" className="rr-text-btn" onClick={() => setEditing(false)}>
               Cancel
             </button>
             <button
               type="button"
               className="rr-text-btn rr-text-btn--muted"
               onClick={() => { setEditing(false); clearLocationFilter(); }}
             >
               Clear address
             </button>
           </div>
         )}
         {/* …the existing noMatchWarning paragraph, unchanged */}
       </motion.div>
     )}
   </AnimatePresence>
   ```
   Keep the existing input element, Search button and `noMatchWarning` paragraph exactly as they are; only the input's `onKeyDown` changes as shown. Delete the old chip markup (pin icon, truncated text, "Clear filter" ×).

7. Append to `src/index.css`:
   ```css
   /* Known-address line under "Choose an election" */
   .rr-address-line {
     display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem;
     font-family: 'Manrope', sans-serif; font-size: 0.9375rem;
     color: var(--text-secondary); margin: 0;
   }
   .rr-address-line strong { color: var(--text-ink); font-weight: 700; }
   .rr-address-line__pin { color: var(--text-link); flex-shrink: 0; }
   .rr-text-btn {
     font-family: 'Manrope', sans-serif; font-size: 0.9375rem; font-weight: 700;
     color: var(--text-link); background: none; border: none; padding: 0.25rem 0.125rem;
     cursor: pointer; min-height: 2.75rem;
   }
   .rr-text-btn:hover { text-decoration: underline; }
   .rr-text-btn:focus-visible { outline: 2px solid var(--text-link); outline-offset: 2px; border-radius: 0.25rem; }
   .rr-text-btn--muted { color: var(--text-tertiary); font-weight: 600; }
   ```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/__tests__/AddressFilterInput.test.tsx src/__tests__/noHardcodedChrome.test.ts`
Expected: PASS (all old and new cases; still no hex literals).

- [ ] **Step 5: Commit**

```bash
git add src/components/AddressFilterInput.tsx src/components/__tests__/AddressFilterInput.test.tsx src/index.css
git commit -m "feat(address): 'Races for … Change' line with cancel and clear

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: New landing hero, timeline and section header

**Files:**
- Modify: `src/components/Landing.tsx` (full rewrite of the JSX; keep imports that are still used)
- Modify: `src/components/__tests__/Landing.test.tsx`
- Modify: `src/index.css` (append timeline + CTA; delete the `.rr-step`, `.rr-step__n`, `.rr-step__title`, `.rr-step__body`, `.rr-step__tag` rules under `/* Landing hero steps */`)

**Interfaces:**
- Consumes: `TimeFilterSwitch` (Task 1); `RaceHub` props `timeFilter`, `onTimeFilterChange`, `hideTimeFilter`, `hideHeader`, `hideFilter` (Task 1); `AddressFilterInput` (Task 3); store fields `locationFilter`, `browseTarget`, `startPractice`; `track` from `../lib/analytics`.

- [ ] **Step 1: Rewrite the Landing tests (failing)**

Replace the body of `src/components/__tests__/Landing.test.tsx` with:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from '../Landing';
import { useReadRankStore } from '../../store/useReadRankStore';

const located = {
  address: '100 W Kirkwood Ave, Bloomington, IN 47404', politicianIds: [], state: 'IN',
  county: null, countyName: null, jurisdiction: null,
};

beforeEach(() => {
  window.localStorage?.clear();
  useReadRankStore.getState().reset();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Landing', () => {
  it('renders the hero heading, lede and the three steps as an ordered list', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/read candidates blind/i);
    expect(screen.getByText(/with no names and no parties/i)).toBeInTheDocument();
    const steps = screen.getByRole('list', { name: /how it works/i });
    expect(steps.tagName).toBe('OL');
    expect(steps).toHaveTextContent(/pick an election/i);
    expect(steps).toHaveTextContent(/read the quotes/i);
    expect(steps).toHaveTextContent(/rank the candidates/i);
    expect(screen.queryByText(/start here/i)).not.toBeInTheDocument();
  });

  it('"Choose an election" scrolls to the race section and focuses its heading', async () => {
    render(<Landing />);
    await userEvent.click(screen.getByRole('button', { name: /choose an election/i }));
    const h2 = screen.getByRole('heading', { level: 2, name: /choose an election/i });
    expect(h2.closest('#choose-election')).not.toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(h2).toHaveFocus();
  });

  it('offers practice as an opt-in warm-up', async () => {
    render(<Landing />);
    await userEvent.click(screen.getByRole('button', { name: /try a warm-up with pizza opinions/i }));
    expect(useReadRankStore.getState().phase).toBe('practice');
    expect(useReadRankStore.getState().practiceProgress).not.toBeNull();
  });

  it('with no address: the search box sits in the race section and there is no switch', () => {
    render(<Landing />);
    const section = document.getElementById('choose-election')!;
    expect(section).toContainElement(screen.getByRole('textbox'));
    expect(screen.queryByRole('group', { name: /filter by election timing/i })).not.toBeInTheDocument();
  });

  it('with an address: shows "Races for … Change" and the switch drives the list', async () => {
    useReadRankStore.getState().setLocationFilter(located);
    render(<Landing />);
    expect(screen.getByText(/races for/i)).toHaveTextContent('100 W Kirkwood Ave');
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    // The demo Indiana race (2024-11-05) is past — switch to Past to see it.
    await userEvent.click(screen.getByRole('button', { name: 'Past' }));
    expect(await screen.findByText('Governor', undefined, { timeout: 3000 })).toBeInTheDocument();
    // Only one switch on the page (RaceHub's own is hidden).
    expect(screen.getAllByRole('group', { name: /filter by election timing/i })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/__tests__/Landing.test.tsx`
Expected: FAIL — no "how it works" list, no "Choose an election" button, warm-up button name differs.

- [ ] **Step 3: Rewrite `Landing.tsx`**

Replace `src/components/Landing.tsx` with:

```tsx
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RaceHub } from './RaceHub';
import { AddressFilterInput } from './AddressFilterInput';
import { TimeFilterSwitch } from './TimeFilterSwitch';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_QUOTES } from '../data/practiceData';
import { track } from '../lib/analytics';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import type { TimeFilter } from '../utils/raceGrouping';

const STEPS = [
  { heading: 'Pick an election', body: 'Local and upcoming races in our Alpha communities.' },
  { heading: 'Read the quotes', body: 'Judge positions on their words alone.' },
  { heading: 'Rank the candidates', body: 'See who earned your trust, and where you align.' },
];

export function Landing() {
  const { startPractice, locationFilter, browseTarget } = useReadRankStore();
  const m = useMotion();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const pickerHeadingRef = useRef<HTMLHeadingElement>(null);
  const showSwitch = locationFilter !== null && !browseTarget;

  const enter = (i: number) => ({
    ...m.enter({ y: 12 }),
    transition: m.transition(DUR.moderate, EASE.settle, { delay: i * 0.06 }),
  });

  function goToPicker() {
    track('readrank_landing_cta_clicked');
    const h = pickerHeadingRef.current;
    if (!h) return;
    h.scrollIntoView({ behavior: m.reduced ? 'auto' : 'smooth', block: 'start' });
    h.focus({ preventScroll: true });
  }

  return (
    <section style={{ backgroundColor: 'var(--surface-page)' }} className="w-full py-10">
      {/* Bounded to line up with the ev-ui Header (1512px border-box, 24px inset). */}
      <div className="mx-auto px-6" style={{ maxWidth: '1512px' }}>
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 lg:gap-24 items-center mb-12 lg:mb-16">
          <div>
            <motion.p className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: 'var(--text-link)' }} {...enter(0)}>
              Read &amp; Rank
            </motion.p>
            <motion.h1 className="text-5xl sm:text-6xl font-bold leading-tight"
              style={{ color: 'var(--text-heading)' }} {...enter(1)}>
              Read candidates blind,
            </motion.h1>
            <motion.p className="text-5xl sm:text-6xl font-bold leading-tight mt-1 mb-8"
              style={{ color: 'var(--text-link)' }} {...enter(2)}>
              rank by what they said.
            </motion.p>
            <motion.p className="text-lg leading-relaxed mb-8 max-w-[60ch]"
              style={{ color: 'var(--text-secondary)' }} {...enter(3)}>
              Real quotes from real candidates, with no names and no parties. Form your own
              view, then see who you actually agree with.
            </motion.p>
            <motion.div className="flex flex-col items-start gap-3" {...enter(4)}>
              <button type="button" className="rr-cta" onClick={goToPicker}>
                Choose an election
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                className="rr-text-btn"
                onClick={() => { track('readrank_practice_started'); startPractice(PRACTICE_QUOTES); }}
              >
                Try a warm-up with pizza opinions
                <span className="rr-cta__meta"> 30 sec</span>
              </button>
            </motion.div>
          </div>

          <ol className="rr-timeline" aria-label="How it works">
            {STEPS.map(({ heading, body }, i) => (
              <motion.li key={heading} className="rr-timeline__step"
                {...m.enter({ y: 12 })}
                transition={m.transition(DUR.moderate, EASE.settle, { delay: 0.1 + i * (STAGGER.gridCell / 1000) })}>
                <span className={`rr-timeline__n${i === 0 ? ' rr-timeline__n--active' : ''}`} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <div className="rr-timeline__title">{heading}</div>
                  <div className="rr-timeline__body">{body}</div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Picker */}
        <div id="choose-election" className="scroll-mt-6 border-t pt-10" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
            <div className="min-w-0">
              <h2
                ref={pickerHeadingRef}
                tabIndex={-1}
                className="text-2xl sm:text-3xl font-semibold mb-2 focus:outline-none"
                style={{ color: 'var(--text-link)' }}
              >
                Choose an election
              </h2>
              <AddressFilterInput />
            </div>
            {showSwitch && <TimeFilterSwitch value={timeFilter} onChange={setTimeFilter} />}
          </div>
          <RaceHub
            hideHeader
            hideFilter
            hideTimeFilter
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
          />
        </div>
      </div>
    </section>
  );
}
```

Notes for the implementer:
- `font-family` is inherited from `body` (Manrope), so the inline `fontFamily` styles from the old file are dropped.
- The no-location RaceHub view still prints "Enter your address above to see your own races." — the search box is now directly above it, so the copy stays correct.

- [ ] **Step 4: CSS**

In `src/index.css`, delete the `/* Landing hero steps */` block (`.rr-step` … `.rr-step__tag { … }`), and append:

```css
/* Landing hero — primary CTA */
.rr-cta {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font-family: 'Manrope', sans-serif; font-size: 1rem; font-weight: 700;
  padding: 0.75rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer;
  background: var(--action-primary); color: var(--action-primary-ink);
  transition: background-color var(--dur-fast) var(--ease-standard);
}
.rr-cta:hover { background: var(--action-primary-hover); }
.rr-cta:focus-visible { outline: 2px solid var(--text-link); outline-offset: 3px; }
.rr-cta__meta { font-size: 0.875rem; font-weight: 500; color: var(--text-tertiary); }

/* Landing hero — vertical step timeline */
.rr-timeline { list-style: none; margin: 0; padding: 0; position: relative; display: grid; gap: 1.75rem; }
.rr-timeline::before {
  content: ''; position: absolute; left: 1rem; top: 1rem; bottom: 1rem;
  width: 1px; background: var(--border-medium);
}
.rr-timeline__step { position: relative; display: flex; gap: 1rem; align-items: flex-start; }
.rr-timeline__n {
  position: relative; z-index: 1; flex-shrink: 0;
  width: 2rem; height: 2rem; border-radius: 9999px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
  background: var(--surface-page); color: var(--text-tertiary);
  border: 1px solid var(--border-medium);
}
.rr-timeline__n--active {
  background: var(--action-primary); color: var(--action-primary-ink); border-color: var(--action-primary);
}
.rr-timeline__title { font-weight: 700; font-size: 1rem; color: var(--text-heading); margin-bottom: 0.25rem; }
.rr-timeline__body { font-size: 0.875rem; line-height: 1.5; color: var(--text-secondary); }
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS. If any other test referenced "Start here", the old warm-up label, or `.rr-step`, update it to the new copy and say so in the commit body.

- [ ] **Step 6: Lint + build**

Run: `npm run lint && npm run build`
Expected: both pass (no unused imports left in `Landing.tsx`).

- [ ] **Step 7: Commit**

```bash
git add src/components/Landing.tsx src/components/__tests__/Landing.test.tsx src/index.css
git commit -m "feat(landing): prototype hero, step timeline, address + switch header

Hero follows Aditi's prototype (rr#109 screen 1) with the sibling apps'
type scale. 'Choose an election' scrolls to and focuses the race section.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Verify in the browser, then open PR 2

**Files:** none changed unless a fix is needed.

- [ ] **Step 1: Start the dev server**

`preview_start` with name `read-rank-dev` (port 5180). Local dev serves mock races; the mock Indiana Governor race is enough for every state below.

- [ ] **Step 2: Check each state at 1280×900 and 390×844, light and dark**

1. No address: hero, timeline, search box under "Choose an election", featured race.
2. Click "Choose an election": page scrolls; the H2 has focus (no visible outline jump).
3. Known address: enter an address in the search box. If the local mock search returns no politicians, set the filter from the console with `javascript_tool` (`useReadRankStore` is not on `window`, so instead edit the zustand persist entry in `localStorage` — find its key with `Object.keys(localStorage)` — set `state.locationFilter` to the `located` object from the Landing test, and reload). Expect "Races for … Change", with the switch at the right (it wraps under the heading on phone).
4. Change → input focused; Cancel, Escape, Clear address each behave per Task 3.
5. Past selected → past races list.
6. Keyboard only: Tab reaches CTA → warm-up → Change → switch buttons → cards, with visible focus.

(Reduced-motion scroll behaviour is covered by `useMotion()` and needs no manual check.)

Check `read_console_messages` for errors on every state.

- [ ] **Step 3: Screenshots for the PR**

Capture the four states from the spec (no address, known address, Change open, Past selected) in both themes at both widths.

- [ ] **Step 4: Push and open PR 2**

PR 2 targets `main` after PR 1 merges (rebase `feat/landing-ev-palette` on `main` first if PR 1 was squash-merged). Until then, open it as a draft with base `feat/ev-palette`.

```bash
git push -u origin feat/landing-ev-palette
gh pr create --draft --base feat/ev-palette --head feat/landing-ev-palette \
  --title "feat(landing): prototype hero, step timeline, address line + switch" \
  --body "<summary, link to spec and rr#109, screenshots, test plan; end with the Claude Code attribution line>"
```

Bind the PR with the ccd_pr tools after it opens.
