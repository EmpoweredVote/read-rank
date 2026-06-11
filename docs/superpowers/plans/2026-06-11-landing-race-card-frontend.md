# Landing + Race Card (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the Read & Rank landing into one continuous surface and replace the race list with a reusable `RaceCard` whose motif is a geographic locator of the office's constituency (real map when available, dot-field fallback otherwise).

**Architecture:** Pure utilities (`deriveTierScope`, `estimateMinutes`, `resolveMotif`, `projectGeoJson`) drive presentational components (`DotField`, `Motif`, `RaceCard`). `Motif` fetches simplified boundary GeoJSON from `/api/inform/boundary` and falls back to `DotField` whenever the endpoint is absent, errors, or returns no boundary — so this plan ships fully working with dot-fields before the backend (Plan 2) exists. `RaceHub` maps races to `RaceCard`s; `Landing` restructures into a compact hero + immediately-visible picker.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + @testing-library/react + jsdom, Tailwind v4, inline CSS-variable theming (Manrope only). Repo: `read-rank`. Current branch: `feat/landing-race-card-redesign`.

**Design spec:** `docs/superpowers/specs/2026-06-11-landing-race-card-redesign-design.md`

---

## File Structure

- Create `src/utils/raceTier.ts` — `Tier`/`Scope` types + `deriveTierScope(race)` (prefers backend-provided `tier`/`scope`, else derives from `jurisdictionLevel`/`isLocal`/`positionName`).
- Create `src/utils/estimateMinutes.ts` — `estimateMinutes({quoteCount, candidateCount, topicCount})`.
- Create `src/components/motif/projectGeoJson.ts` — GeoJSON geometry → normalized SVG path + viewBox.
- Create `src/components/motif/resolveMotif.ts` — `(tier, scope, boundaryRef)` → `MotifPlan`.
- Create `src/components/motif/DotField.tsx` — abstract constituents dot-field by arrangement.
- Create `src/components/motif/Motif.tsx` — orchestrates boundary fetch/clip vs dot-field.
- Modify `src/data/api.ts` — extend `RaceSummary` (optional `tier`/`scope`/`boundaryRef`/`quoteCount`/`rankableTopicCount`); add `BoundaryRef`/`BoundaryResult`/`GeoJsonGeometry` + `fetchBoundary`.
- Create `src/components/RaceCard.tsx` — the card.
- Modify `src/index.css` — `.race-card-v2*`, `.race-grid`, landing hero/steps classes.
- Modify `src/components/RaceHub.tsx` — render `RaceCard` grid.
- Modify `src/components/Landing.tsx` — one-section restructure, equal-weight steps + "Start here" tag.
- Modify tests: `__tests__/RaceHub.test.tsx`, `__tests__/Landing.test.tsx`; add util/component tests.

Run tests with `npx vitest run <path>`; full suite `npm test`; lint `npm run lint`.

---

## Task 1: Extend the data layer (types + `fetchBoundary`)

**Files:**
- Modify: `src/data/api.ts` (add to the Types block after `RaceSummary`, line ~24)
- Test: `src/data/__tests__/fetchBoundary.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/data/__tests__/fetchBoundary.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchBoundary } from '../api';

afterEach(() => vi.unstubAllGlobals());

describe('fetchBoundary', () => {
  it('returns null when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await fetchBoundary({ layer: 'G4110', geoid: '1805860' })).toBeNull();
  });

  it('returns null when the body reports no boundary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ hasBoundary: false }),
    }));
    expect(await fetchBoundary({ layer: 'G4110', geoid: 'x' })).toBeNull();
  });

  it('returns the parsed boundary when present', async () => {
    const payload = {
      geoid: '1805860', layer: 'G4110', name: 'Bloomington',
      bbox: [-86.6, 39.0, -86.4, 39.2], hasBoundary: true,
      geojson: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
    const out = await fetchBoundary({ layer: 'G4110', geoid: '1805860' });
    expect(out?.name).toBe('Bloomington');
    expect(out?.geojson.type).toBe('Polygon');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/fetchBoundary.test.ts`
Expected: FAIL — `fetchBoundary` is not exported.

- [ ] **Step 3: Implement the types and function**

In `src/data/api.ts`, add after the `RaceSummary` interface:

```ts
export type RaceTier = 'federal' | 'state' | 'local';
export type RaceScope = 'statewide' | 'district' | 'county' | 'citywide';

/** How a race's motif finds its boundary polygon. layer is an MTFCC or layer key. */
export interface BoundaryRef {
  layer: string;
  geoid: string;
}

export interface GeoJsonGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface BoundaryResult {
  geoid: string;
  layer: string;
  name: string;
  bbox: [number, number, number, number];
  geojson: GeoJsonGeometry;
  hasBoundary: boolean;
}
```

Add these optional fields inside `RaceSummary` (after `usesRcv?: boolean;`):

```ts
  /** Backend-computed; frontend derives a fallback when absent. */
  tier?: RaceTier;
  scope?: RaceScope;
  boundaryRef?: BoundaryRef | null;
  /** Total blind quotes in the race; used for the time estimate. */
  quoteCount?: number;
  /** Topics with enough quotes to rank; falls back to topicCount. */
  rankableTopicCount?: number;
```

Add this function at the end of the Race endpoints section (after `fetchRaces`):

```ts
/**
 * Simplified boundary geometry for a motif. Returns null on any failure or
 * when the backend has no boundary, so callers fall back to the dot-field.
 */
export async function fetchBoundary(ref: BoundaryRef): Promise<BoundaryResult | null> {
  try {
    const qs = `layer=${encodeURIComponent(ref.layer)}&geoid=${encodeURIComponent(ref.geoid)}`;
    const res = await fetch(`${API_BASE}/inform/boundary?${qs}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.hasBoundary === false || !data.geojson) return null;
    return data as BoundaryResult;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/__tests__/fetchBoundary.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/api.ts src/data/__tests__/fetchBoundary.test.ts
git commit -m "feat(api): boundary types + fetchBoundary with graceful fallback"
```

---

## Task 2: `deriveTierScope` utility

**Files:**
- Create: `src/utils/raceTier.ts`
- Test: `src/utils/__tests__/raceTier.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/__tests__/raceTier.test.ts
import { describe, it, expect } from 'vitest';
import { deriveTierScope } from '../raceTier';

const base = { jurisdictionLevel: null, isLocal: false };

describe('deriveTierScope', () => {
  it('prefers explicit backend tier/scope', () => {
    expect(deriveTierScope({ ...base, positionName: 'Anything', tier: 'federal', scope: 'district' }))
      .toEqual({ tier: 'federal', scope: 'district' });
  });

  it('maps Governor to state / statewide', () => {
    expect(deriveTierScope({ ...base, jurisdictionLevel: 'state', positionName: 'Governor' }))
      .toEqual({ tier: 'state', scope: 'statewide' });
  });

  it('maps U.S. Senate to federal / statewide', () => {
    expect(deriveTierScope({ ...base, jurisdictionLevel: 'federal', positionName: 'U.S. Senate' }))
      .toEqual({ tier: 'federal', scope: 'statewide' });
  });

  it('maps U.S. House to federal / district', () => {
    expect(deriveTierScope({ ...base, jurisdictionLevel: 'federal', positionName: 'U.S. House' }))
      .toEqual({ tier: 'federal', scope: 'district' });
  });

  it('maps Mayor to local / citywide', () => {
    expect(deriveTierScope({ ...base, isLocal: true, jurisdictionLevel: 'city', positionName: 'Mayor' }))
      .toEqual({ tier: 'local', scope: 'citywide' });
  });

  it('maps County Commission to local / county', () => {
    expect(deriveTierScope({ ...base, isLocal: true, jurisdictionLevel: 'county', positionName: 'County Commission' }))
      .toEqual({ tier: 'local', scope: 'county' });
  });

  it('maps City Council to local / district', () => {
    expect(deriveTierScope({ ...base, isLocal: true, jurisdictionLevel: 'city', positionName: 'City Common Council' }))
      .toEqual({ tier: 'local', scope: 'district' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/raceTier.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/utils/raceTier.ts
import type { RaceTier, RaceScope } from '../data/api';

export type Tier = RaceTier;
export type Scope = RaceScope;

interface DeriveInput {
  positionName: string;
  jurisdictionLevel: string | null;
  isLocal: boolean;
  tier?: Tier;
  scope?: Scope;
}

export function deriveTierScope(race: DeriveInput): { tier: Tier; scope: Scope } {
  const tier = race.tier ?? deriveTier(race);
  const scope = race.scope ?? deriveScope(race.positionName, tier);
  return { tier, scope };
}

function deriveTier(race: DeriveInput): Tier {
  const jl = (race.jurisdictionLevel ?? '').toLowerCase();
  if (/fed|congress|national/.test(jl)) return 'federal';
  if (jl === 'state') return 'state';
  if (race.isLocal || /county|city|municipal|local|township|school|ward/.test(jl)) return 'local';
  const n = race.positionName.toLowerCase();
  if (/u\.?s\.?\s|congress|president/.test(n)) return 'federal';
  return 'state';
}

function deriveScope(positionName: string, tier: Tier): Scope {
  const n = positionName.toLowerCase();
  if (/county commission|board of supervisors|county council|sheriff|\bcounty\b/.test(n)) return 'county';
  if (/mayor|city of /.test(n)) return 'citywide';
  if (/council|ward|\bdistrict\b|house|assembly|representative|senate district/.test(n)) return 'district';
  if (tier === 'local') return 'citywide';
  return 'statewide';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/raceTier.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/raceTier.ts src/utils/__tests__/raceTier.test.ts
git commit -m "feat: deriveTierScope util with backend-override fallback"
```

---

## Task 3: `estimateMinutes` utility

**Files:**
- Create: `src/utils/estimateMinutes.ts`
- Test: `src/utils/__tests__/estimateMinutes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/__tests__/estimateMinutes.test.ts
import { describe, it, expect } from 'vitest';
import { estimateMinutes } from '../estimateMinutes';

describe('estimateMinutes', () => {
  it('uses quoteCount at ~10s per quote', () => {
    expect(estimateMinutes({ quoteCount: 30, candidateCount: 5, topicCount: 8 })).toBe(5);
  });
  it('estimates from candidates x topics when quoteCount is missing', () => {
    expect(estimateMinutes({ candidateCount: 4, topicCount: 3 })).toBe(2);
  });
  it('never returns less than 1', () => {
    expect(estimateMinutes({ quoteCount: 0, candidateCount: 1, topicCount: 1 })).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/estimateMinutes.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/utils/estimateMinutes.ts
const SECONDS_PER_QUOTE = 10;

export function estimateMinutes(opts: {
  quoteCount?: number | null;
  candidateCount: number;
  topicCount: number;
}): number {
  const quotes = opts.quoteCount && opts.quoteCount > 0
    ? opts.quoteCount
    : Math.max(opts.candidateCount * opts.topicCount, opts.topicCount, 1);
  return Math.max(1, Math.round((quotes * SECONDS_PER_QUOTE) / 60));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/estimateMinutes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/estimateMinutes.ts src/utils/__tests__/estimateMinutes.test.ts
git commit -m "feat: estimateMinutes util"
```

---

## Task 4: `projectGeoJson` utility

**Files:**
- Create: `src/components/motif/projectGeoJson.ts`
- Test: `src/components/motif/__tests__/projectGeoJson.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/motif/__tests__/projectGeoJson.test.ts
import { describe, it, expect } from 'vitest';
import { projectGeoJson } from '../projectGeoJson';

describe('projectGeoJson', () => {
  it('returns a square viewBox and a closed path for a Polygon', () => {
    const geom = { type: 'Polygon' as const, coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
    const { path, viewBox } = projectGeoJson(geom, 100, 6);
    expect(viewBox).toBe('0 0 100 100');
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('keeps projected coordinates inside the padded box', () => {
    const geom = { type: 'Polygon' as const, coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
    const { path } = projectGeoJson(geom, 100, 6);
    const nums = path.match(/-?\d+\.\d+/g)!.map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(6 - 0.01);
    expect(Math.max(...nums)).toBeLessThanOrEqual(94 + 0.01);
  });

  it('handles MultiPolygon (multiple subpaths)', () => {
    const geom = {
      type: 'MultiPolygon' as const,
      coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]],
    };
    const { path } = projectGeoJson(geom, 100, 6);
    expect(path.match(/M/g)?.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/motif/__tests__/projectGeoJson.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/components/motif/projectGeoJson.ts
import type { GeoJsonGeometry } from '../../data/api';

type Ring = number[][];

function collectRings(geom: GeoJsonGeometry): Ring[] {
  if (geom.type === 'Polygon') return geom.coordinates as Ring[];
  // MultiPolygon: array of polygons, each an array of rings.
  return (geom.coordinates as number[][][][]).flat() as Ring[];
}

/**
 * Project a lon/lat geometry to a square SVG viewBox of `size`, preserving
 * aspect ratio with `pad` margin. Equirectangular with a cos(midLat) x-scale
 * so shapes are not horizontally stretched. Y is flipped (north is up).
 */
export function projectGeoJson(
  geom: GeoJsonGeometry,
  size = 60,
  pad = 4,
): { path: string; viewBox: string } {
  const rings = collectRings(geom).filter((r) => r.length > 1);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const midLat = (minY + maxY) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180) || 1;
  const w = (maxX - minX) * kx || 1;
  const h = (maxY - minY) || 1;
  const inner = size - pad * 2;
  const scale = inner / Math.max(w, h);
  const offX = pad + (inner - w * scale) / 2;
  const offY = pad + (inner - h * scale) / 2;
  const px = (x: number) => offX + (x - minX) * kx * scale;
  const py = (y: number) => offY + (maxY - y) * scale;
  const path = rings
    .map((r) => 'M' + r.map(([x, y]) => `${px(x).toFixed(2)},${py(y).toFixed(2)}`).join('L') + 'Z')
    .join(' ');
  return { path, viewBox: `0 0 ${size} ${size}` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/motif/__tests__/projectGeoJson.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/motif/projectGeoJson.ts src/components/motif/__tests__/projectGeoJson.test.ts
git commit -m "feat(motif): projectGeoJson lon/lat -> normalized SVG path"
```

---

## Task 5: `resolveMotif` utility

**Files:**
- Create: `src/components/motif/resolveMotif.ts`
- Test: `src/components/motif/__tests__/resolveMotif.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/motif/__tests__/resolveMotif.test.ts
import { describe, it, expect } from 'vitest';
import { resolveMotif } from '../resolveMotif';

describe('resolveMotif', () => {
  it('plans a boundary when a ref is present', () => {
    expect(resolveMotif({ tier: 'local', scope: 'citywide', boundaryRef: { layer: 'G4110', geoid: '1805860' } }))
      .toEqual({ kind: 'boundary', ref: { layer: 'G4110', geoid: '1805860' } });
  });
  it('falls back to a full dot-field for statewide', () => {
    expect(resolveMotif({ tier: 'state', scope: 'statewide', boundaryRef: null }))
      .toEqual({ kind: 'dotfield', arrangement: 'full' });
  });
  it('falls back to a cluster for a district', () => {
    expect(resolveMotif({ tier: 'state', scope: 'district', boundaryRef: null }))
      .toEqual({ kind: 'dotfield', arrangement: 'cluster' });
  });
  it('falls back to a point for citywide', () => {
    expect(resolveMotif({ tier: 'local', scope: 'citywide', boundaryRef: null }))
      .toEqual({ kind: 'dotfield', arrangement: 'point' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/motif/__tests__/resolveMotif.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/components/motif/resolveMotif.ts
import type { BoundaryRef } from '../../data/api';
import type { Tier, Scope } from '../../utils/raceTier';

export type Arrangement = 'full' | 'cluster' | 'point';

export type MotifPlan =
  | { kind: 'boundary'; ref: BoundaryRef }
  | { kind: 'dotfield'; arrangement: Arrangement };

export function fallbackArrangement(scope: Scope): Arrangement {
  if (scope === 'citywide') return 'point';
  if (scope === 'statewide') return 'full';
  return 'cluster';
}

export function resolveMotif(input: {
  tier: Tier;
  scope: Scope;
  boundaryRef?: BoundaryRef | null;
}): MotifPlan {
  if (input.boundaryRef) return { kind: 'boundary', ref: input.boundaryRef };
  return { kind: 'dotfield', arrangement: fallbackArrangement(input.scope) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/motif/__tests__/resolveMotif.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/motif/resolveMotif.ts src/components/motif/__tests__/resolveMotif.test.ts
git commit -m "feat(motif): resolveMotif plan selection"
```

---

## Task 6: `DotField` component

**Files:**
- Create: `src/components/motif/DotField.tsx`
- Test: `src/components/motif/__tests__/DotField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/motif/__tests__/DotField.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DotField } from '../DotField';

describe('DotField', () => {
  it('renders a non-empty field of dots for each arrangement', () => {
    for (const a of ['full', 'cluster', 'point'] as const) {
      const { container, unmount } = render(<DotField arrangement={a} />);
      expect(container.querySelectorAll('circle').length).toBeGreaterThan(3);
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/motif/__tests__/DotField.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/motif/DotField.tsx
import type { Arrangement } from './resolveMotif';

// Dots imply constituents. `currentColor` lets the parent set the accent token.
const FIELDS: Record<Arrangement, [number, number][]> = {
  full: [
    [13, 13], [25, 11], [38, 14], [49, 13],
    [11, 25], [24, 24], [37, 23], [48, 26],
    [14, 37], [26, 38], [39, 37], [47, 39],
    [18, 49], [31, 50], [44, 48],
  ],
  cluster: [
    [30, 22], [40, 24], [34, 30], [44, 31],
    [28, 33], [38, 37], [46, 39], [33, 41], [42, 45],
  ],
  point: [
    [26, 27], [33, 25], [30, 32], [37, 31],
    [25, 34], [32, 38], [38, 37], [29, 41],
  ],
};

export function DotField({ arrangement }: { arrangement: Arrangement }) {
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <g fill="currentColor">
        {FIELDS[arrangement].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={1.6} />
        ))}
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/motif/__tests__/DotField.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/motif/DotField.tsx src/components/motif/__tests__/DotField.test.tsx
git commit -m "feat(motif): DotField fallback motif"
```

---

## Task 7: `Motif` component (boundary fetch + clip, dot-field fallback)

**Files:**
- Create: `src/components/motif/Motif.tsx`
- Test: `src/components/motif/__tests__/Motif.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/motif/__tests__/Motif.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { Motif } from '../Motif';
import * as api from '../../../data/api';

afterEach(() => vi.restoreAllMocks());

describe('Motif', () => {
  it('renders the dot-field when there is no boundaryRef', () => {
    const { container } = render(<Motif tier="state" scope="statewide" boundaryRef={null} />);
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(3);
  });

  it('renders a boundary path when fetchBoundary resolves geometry', async () => {
    vi.spyOn(api, 'fetchBoundary').mockResolvedValue({
      geoid: '1805860', layer: 'G4110', name: 'Bloomington',
      bbox: [0, 0, 10, 10], hasBoundary: true,
      geojson: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
    });
    const { container } = render(
      <Motif tier="local" scope="citywide" boundaryRef={{ layer: 'G4110', geoid: '1805860' }} />,
    );
    await waitFor(() => expect(container.querySelector('path')).not.toBeNull());
  });

  it('falls back to the dot-field when fetchBoundary returns null', async () => {
    vi.spyOn(api, 'fetchBoundary').mockResolvedValue(null);
    const { container } = render(
      <Motif tier="local" scope="county" boundaryRef={{ layer: 'G4020', geoid: 'x' }} />,
    );
    await waitFor(() => expect(container.querySelectorAll('circle').length).toBeGreaterThan(3));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/motif/__tests__/Motif.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/motif/Motif.tsx
import { useEffect, useState } from 'react';
import { resolveMotif, fallbackArrangement } from './resolveMotif';
import { projectGeoJson } from './projectGeoJson';
import { DotField } from './DotField';
import { fetchBoundary } from '../../data/api';
import type { BoundaryRef } from '../../data/api';
import type { Tier, Scope } from '../../utils/raceTier';

export function Motif({ tier, scope, boundaryRef }: {
  tier: Tier; scope: Scope; boundaryRef: BoundaryRef | null;
}) {
  const plan = resolveMotif({ tier, scope, boundaryRef });
  if (plan.kind === 'dotfield') return <DotField arrangement={plan.arrangement} />;
  return <BoundaryMotif refKey={plan.ref} fallback={fallbackArrangement(scope)} />;
}

function BoundaryMotif({ refKey, fallback }: {
  refKey: BoundaryRef; fallback: 'full' | 'cluster' | 'point';
}) {
  const [path, setPath] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetchBoundary(refKey)
      .then((b) => { if (alive) setPath(b ? projectGeoJson(b.geojson).path : null); })
      .catch(() => { if (alive) setPath(null); });
    return () => { alive = false; };
  }, [refKey.layer, refKey.geoid]);

  if (!path) return <DotField arrangement={fallback} />;
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <path d={path} fill="currentColor" fillOpacity={0.14} stroke="currentColor"
        strokeWidth={1} strokeOpacity={0.75} strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/motif/__tests__/Motif.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/motif/Motif.tsx src/components/motif/__tests__/Motif.test.tsx
git commit -m "feat(motif): Motif orchestrator with boundary fetch + fallback"
```

---

## Task 8: `RaceCard` component

**Files:**
- Create: `src/components/RaceCard.tsx`
- Test: `src/components/__tests__/RaceCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/__tests__/RaceCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaceCard } from '../RaceCard';

const props = {
  office: 'Governor', tier: 'state' as const, scope: 'statewide' as const,
  state: 'IN', place: null, electionDate: '2024-11-05', boundaryRef: null,
  candidateCount: 4, topicCount: 3, estMinutes: 2, isLocal: false, onSelect: () => {},
};

describe('RaceCard', () => {
  it('shows the office title, tier/scope label, geography and metadata', () => {
    render(<RaceCard {...props} />);
    expect(screen.getByText('Governor')).toBeInTheDocument();
    expect(screen.getByText(/state\s*·\s*statewide/i)).toBeInTheDocument();
    expect(screen.getByText(/nov 2024/i)).toBeInTheDocument();
    expect(screen.getByText('Candidates').parentElement).toHaveTextContent('4');
    expect(screen.getByText('Topics').parentElement).toHaveTextContent('3');
    expect(screen.getByText('Time').parentElement).toHaveTextContent('~2 min');
  });

  it('fires onSelect on click', async () => {
    const onSelect = vi.fn();
    render(<RaceCard {...props} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /open governor race/i }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('shows the Local pill when isLocal', () => {
    render(<RaceCard {...props} office="Mayor" tier="local" scope="citywide" isLocal place="Bloomington" />);
    expect(screen.getByText('Local')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/RaceCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/RaceCard.tsx
import { Motif } from './motif/Motif';
import type { Tier, Scope } from '../utils/raceTier';
import type { BoundaryRef } from '../data/api';

const TIER_LABEL: Record<Tier, string> = { federal: 'Federal', state: 'State', local: 'Local' };
const SCOPE_LABEL: Record<Scope, string> = {
  statewide: 'Statewide', district: 'District', county: 'County', citywide: 'Citywide',
};

function formatMonthYear(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export interface RaceCardProps {
  office: string;
  tier: Tier;
  scope: Scope;
  state: string | null;
  place?: string | null;
  electionDate?: string | null;
  boundaryRef?: BoundaryRef | null;
  candidateCount: number;
  topicCount: number;
  estMinutes: number;
  isLocal?: boolean;
  usesRcv?: boolean;
  progress?: 'none' | 'in-progress' | 'completed';
  disabled?: boolean;
  onSelect: () => void;
}

export function RaceCard(props: RaceCardProps) {
  const {
    office, tier, scope, state, place, electionDate, boundaryRef,
    candidateCount, topicCount, estMinutes, isLocal, usesRcv,
    progress = 'none', disabled, onSelect,
  } = props;

  const date = formatMonthYear(electionDate);
  const geo = [place || state, date].filter(Boolean).join(' · ');

  function activate() { if (!disabled) onSelect(); }

  return (
    <button
      type="button"
      className={`race-card-v2 race-card-v2--${progress}`}
      aria-label={`Open ${office} race`}
      disabled={disabled}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
    >
      <div className="race-card-v2__motif" aria-hidden="true">
        <Motif tier={tier} scope={scope} boundaryRef={boundaryRef ?? null} />
      </div>
      <div className="race-card-v2__body">
        <div className="race-card-v2__scope">{TIER_LABEL[tier]} · {SCOPE_LABEL[scope]}</div>
        <div className="race-card-v2__title-row">
          <span className="race-card-v2__title">
            {office}
            {isLocal && <span className="race-card-v2__pill">Local</span>}
          </span>
          <span className="race-card-v2__arrow" aria-hidden="true">&rarr;</span>
        </div>
        {geo && (
          <div className="race-card-v2__geo">
            {geo}{usesRcv ? ' · Ranked choice' : ''}
          </div>
        )}
        <div className="race-card-v2__meta">
          <div className="race-card-v2__mi"><span className="k">Candidates</span><span className="v">{candidateCount}</span></div>
          <div className="race-card-v2__mi"><span className="k">Topics</span><span className="v">{topicCount}</span></div>
          <div className="race-card-v2__mi"><span className="k">Time</span><span className="v">~{estMinutes} min</span></div>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/RaceCard.test.tsx`
Expected: PASS (3 tests). (Styling lands in Task 9; tests are structural.)

- [ ] **Step 5: Commit**

```bash
git add src/components/RaceCard.tsx src/components/__tests__/RaceCard.test.tsx
git commit -m "feat: RaceCard component"
```

---

## Task 9: Card + landing styles in `index.css`

**Files:**
- Modify: `src/index.css` (append a new section at end of file)

No automated test — this is CSS. Verified visually in Task 12.

- [ ] **Step 1: Append the styles**

Add to the end of `src/index.css`:

```css
/* ── Race card v2 + landing redesign ───────────────────────── */
.race-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;
}
@media (min-width: 640px) { .race-grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1024px) { .race-grid { grid-template-columns: 1fr 1fr 1fr; } }

.race-card-v2 {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: 0.875rem;
  padding: 0.875rem;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.2s ease;
}
.race-card-v2:hover {
  border-color: var(--text-link);
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.10), 0 1px 3px rgba(0, 0, 0, 0.05);
}
.race-card-v2:focus-visible {
  outline: 2px solid var(--text-link);
  outline-offset: 2px;
}
.race-card-v2:disabled { cursor: wait; opacity: 0.6; }

.race-card-v2__motif {
  width: 60px; height: 60px; float: left; margin-right: 0.75rem;
  border-radius: 0.5rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border-subtle);
  color: var(--text-link);
  overflow: hidden;
}
.race-card-v2__body { overflow: hidden; }
.race-card-v2__scope {
  font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--text-tertiary);
}
.race-card-v2__title-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;
  margin-top: 0.125rem;
}
.race-card-v2__title {
  font-weight: 800; font-size: 1.0625rem; letter-spacing: -0.02em; line-height: 1.1;
  color: var(--text-heading);
}
.race-card-v2__pill {
  margin-left: 0.375rem; font-size: 0.5625rem; font-weight: 800; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--color-ev-coral);
  background: color-mix(in srgb, var(--color-ev-coral) 14%, transparent);
  padding: 0.0625rem 0.3125rem; border-radius: 9999px; vertical-align: middle;
}
.race-card-v2__arrow {
  flex-shrink: 0; width: 1.5rem; height: 1.5rem; border-radius: 9999px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border-subtle); color: var(--text-secondary);
  transition: color 0.15s, border-color 0.15s, transform 0.15s;
}
.race-card-v2:hover .race-card-v2__arrow {
  color: var(--text-heading); border-color: var(--text-link); transform: translate(1px, -1px);
}
.race-card-v2__geo {
  font-size: 0.6875rem; font-weight: 500; color: var(--text-secondary); margin-top: 0.1875rem;
}
.race-card-v2__meta {
  display: flex; border-top: 1px solid var(--border-subtle);
  margin-top: 0.625rem; padding-top: 0.5rem;
}
.race-card-v2__mi { flex: 1; display: flex; flex-direction: column; gap: 0.0625rem; }
.race-card-v2__mi + .race-card-v2__mi {
  border-left: 1px solid var(--border-subtle); padding-left: 0.5rem; margin-left: 0.5rem;
}
.race-card-v2__mi .k {
  font-size: 0.5rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text-tertiary);
}
.race-card-v2__mi .v { font-size: 0.6875rem; font-weight: 600; color: var(--text-heading); }

/* Landing hero steps */
.rr-step {
  position: relative;
  display: flex; gap: 0.75rem; align-items: flex-start;
  background: var(--surface-card); border: 1px solid var(--border-subtle);
  border-radius: 0.875rem; padding: 0.875rem;
}
.rr-step__n {
  width: 1.75rem; height: 1.75rem; border-radius: 0.5rem; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6875rem; font-weight: 800;
  background: color-mix(in srgb, var(--text-link) 14%, transparent); color: var(--text-link);
}
.rr-step__title { font-weight: 700; font-size: 0.8125rem; color: var(--text-heading); }
.rr-step__body { font-size: 0.75rem; line-height: 1.4; color: var(--text-secondary); margin-top: 0.125rem; }
.rr-step__tag {
  position: absolute; top: 0.75rem; right: 0.75rem;
  font-size: 0.5rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--surface-card); background: var(--text-link);
  padding: 0.125rem 0.375rem; border-radius: 0.3125rem;
}

@media (prefers-reduced-motion: reduce) {
  .race-card-v2, .race-card-v2__arrow { transition: border-color 0.15s, color 0.15s; }
  .race-card-v2:hover { transform: none; }
  .race-card-v2:hover .race-card-v2__arrow { transform: none; }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds (tsc + vite), no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: race card v2 + landing step styles"
```

---

## Task 10: Wire `RaceHub` to render `RaceCard`s

**Files:**
- Modify: `src/components/RaceHub.tsx` (replace the `motion.button` markup inside the races map; keep fetch/sort/filter/loading/empty logic and the wordmark header)
- Modify: `src/components/__tests__/RaceHub.test.tsx` (update the second test only)

- [ ] **Step 1: Update the test to the new card**

Replace the second `it(...)` block in `src/components/__tests__/RaceHub.test.tsx` with:

```tsx
  it('renders the race as a RaceCard with tier, geography and metadata', async () => {
    render(<RaceHub />);
    // jsdom fetch fails -> mock fallback supplies the Indiana demo race.
    expect(await screen.findByText('Governor', undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/state\s*·\s*statewide/i)).toBeInTheDocument();
    expect(screen.getByText(/nov 2024/i)).toBeInTheDocument();
    expect(screen.getByText('Candidates').parentElement).toHaveTextContent('4');
    expect(screen.getByText('Topics').parentElement).toHaveTextContent('3');
    expect(screen.queryByText(/ranked choice/i)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/RaceHub.test.tsx`
Expected: FAIL — old markup still renders `2024 indiana governor` / `4 candidates`, no scope label.

- [ ] **Step 3: Update `RaceHub.tsx`**

Add imports at the top (after existing imports):

```tsx
import { RaceCard } from './RaceCard';
import { deriveTierScope } from '../utils/raceTier';
import { estimateMinutes } from '../utils/estimateMinutes';
```

Replace the `<div className="max-w-2xl mx-auto space-y-3">…</div>` block (the races map, lines ~115-211) with:

```tsx
      <div className="race-grid max-w-5xl mx-auto">
        {races.map((race) => {
          const progressState = raceProgress[race.raceId];
          const progress: 'none' | 'in-progress' | 'completed' = progressState?.completed
            ? 'completed'
            : progressState
              ? 'in-progress'
              : 'none';
          const { tier, scope } = deriveTierScope(race);
          const estMinutes = estimateMinutes({
            quoteCount: race.quoteCount,
            candidateCount: race.candidateCount,
            topicCount: race.topicCount,
          });
          return (
            <RaceCard
              key={race.raceId}
              office={race.positionName}
              tier={tier}
              scope={scope}
              state={race.state}
              place={null}
              electionDate={race.electionDate}
              boundaryRef={race.boundaryRef ?? null}
              candidateCount={race.candidateCount}
              topicCount={race.rankableTopicCount ?? race.topicCount}
              estMinutes={estMinutes}
              isLocal={race.isLocal}
              usesRcv={race.usesRcv}
              progress={progress}
              disabled={starting !== null}
              onSelect={() => handleSelect(race.raceId)}
            />
          );
        })}
      </div>
```

Remove the now-unused `motion` import only if no other usage remains in the file (the header still uses `motion.div`; keep the import). Remove `formatElectionDate` if it is no longer referenced (the card formats its own date) — verify with a search before deleting.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/RaceHub.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RaceHub.tsx src/components/__tests__/RaceHub.test.tsx
git commit -m "feat: RaceHub renders RaceCard grid"
```

---

## Task 11: Restructure `Landing` into one surface

**Files:**
- Modify: `src/components/Landing.tsx` (replace whole file)
- Modify: `src/components/__tests__/Landing.test.tsx` (update the first test)

- [ ] **Step 1: Update the first test**

Replace the first `it(...)` block in `src/components/__tests__/Landing.test.tsx` with:

```tsx
  it('renders the hero and the election picker on one surface', async () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/read what candidates say/i);
    expect(screen.getByText(/choose an election/i)).toBeInTheDocument();
    expect(screen.getByText(/start here/i)).toBeInTheDocument();
    // RaceHub inside the picker resolves the mock race async (fetch fallback).
    expect(await screen.findByText('Governor', undefined, { timeout: 3000 })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Landing.test.tsx`
Expected: FAIL — no `Start here`, and `Governor` not yet asserted against new markup.

- [ ] **Step 3: Replace `src/components/Landing.tsx`**

```tsx
import { RaceHub } from './RaceHub';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_QUOTES } from '../data/practiceData';

const STEPS = [
  { n: '01', heading: 'Pick an election', body: 'Choose from local and upcoming races in our Alpha communities.', start: true },
  { n: '02', heading: 'Read the quotes', body: 'Evaluate positions blind.  No names, no parties, just their words.', start: false },
  { n: '03', heading: 'Rank the candidates', body: 'See who earned your trust and where you aligned.', start: false },
];

export function Landing() {
  const { startPractice } = useReadRankStore();

  return (
    <section
      style={{ backgroundColor: 'var(--surface-page)' }}
      className="w-full px-6 sm:px-10 lg:px-20 py-12 lg:py-16"
    >
      {/* Compact hero */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-16 items-center mb-12 lg:mb-16">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-link)', fontFamily: "'Manrope', sans-serif" }}
          >
            Read &amp; Rank
          </p>
          <h1
            className="text-4xl sm:text-5xl font-extrabold leading-tight"
            style={{ color: 'var(--text-heading)', fontFamily: "'Manrope', sans-serif" }}
          >
            Read what candidates say,
            <br />
            <span style={{ color: 'var(--text-link)' }}>rank them on what matters.</span>
          </h1>
          <p
            className="text-base sm:text-lg leading-relaxed mt-5 max-w-xl"
            style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
          >
            Most voters see only names on a ballot.  Read real quotes with no names attached, form
            your own view, then see who earned your trust.
          </p>
          <button
            type="button"
            onClick={() => startPractice(PRACTICE_QUOTES)}
            className="mt-5 px-1 py-2"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem',
              fontWeight: 600, color: 'var(--text-link)', minHeight: '2.75rem',
            }}
          >
            Not sure yet?&nbsp; Try a 30-second warm-up with pizza opinions.
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {STEPS.map(({ n, heading, body, start }) => (
            <div key={n} className="rr-step">
              <span className="rr-step__n">{n}</span>
              <div>
                <div className="rr-step__title">{heading}</div>
                <div className="rr-step__body">{body}</div>
              </div>
              {start && <span className="rr-step__tag">Start here</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Picker, immediately present */}
      <h2
        className="text-xl sm:text-2xl font-bold mb-1"
        style={{ color: 'var(--text-link)', fontFamily: "'Manrope', sans-serif" }}
      >
        Choose an election
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--text-secondary)', fontFamily: "'Manrope', sans-serif" }}
      >
        Each one is a preview of the full Read &amp; Rank experience.
      </p>
      <RaceHub hideHeader />
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/Landing.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Landing.tsx src/components/__tests__/Landing.test.tsx
git commit -m "feat: merge landing into one surface with equal-weight steps"
```

---

## Task 12: Full verification (suite, lint, visual)

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new util/component/motif tests and the updated `Landing`/`RaceHub` tests.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors. Fix any unused-import warnings introduced in `RaceHub.tsx` (e.g. removed `formatElectionDate`).

- [ ] **Step 3: Type-check / build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Visual verification (preview tools)**

Start the dev server with the preview tooling, load the landing route, and confirm:
- One continuous surface (no full-viewport hero), races visible with minimal scroll.
- Three steps equal weight, "Start here" tag on step 1 only.
- Race cards show a dot-field motif (no backend yet), tier/scope label, `Candidates · Topics · Time` footer.
- Hover lifts the card and nudges the arrow; keyboard focus shows a ring; Enter activates.
- Toggle dark/light theme: motif panel and accents adapt via tokens.

Capture a screenshot for the user.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: lint/type fixes for landing redesign"
```

---

## Self-Review notes
- **Spec coverage:** structure A (T11), equal steps + Start here (T11), RaceCard typography-led (T8), motif map-carries-tier with monochrome accent (T6/T7/T9 via `currentColor` = `--text-link`), dot-field fallback (T6/T7), `resolveMotif`/`projectGeoJson` (T4/T5), metadata Candidates·Topics·Time with rankable topics + time estimate (T3/T8/T10), theme tokens (T9), accessibility: button semantics/focus/Enter-Space/`aria-hidden` motif/reduced-motion (T8/T9), graceful boundary fallback (T1/T7).
- **Backend dependency:** `fetchBoundary` targets `/api/inform/boundary` (Plan 2). Until it exists every fetch returns null and the dot-field renders — the frontend ships working.
- **Deferred to Plan 2:** real polygons (endpoint), `tier`/`scope`/`boundaryRef`/`quoteCount`/`rankableTopicCount` on the races API (frontend reads them when present, derives otherwise), state/US outline ingest.
