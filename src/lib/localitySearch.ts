import { getStateAbbrevFromFips, getStateAbbrevFromName, getStateFips } from '../utils/stateNames';

/** Navigation intent derived from free text + the county-name index. */
export type QueryRoute =
  | { kind: 'address' }
  | { kind: 'browse-state'; state: string }
  | { kind: 'browse-county'; geoid: string; state: string };

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(county|parish|borough)\b/g, '')
    .replace(/[^a-z]/g, '');
}

/** Map free text to a navigation intent using only local data (state names + the
 *  county-name index). Pure; anything not clearly a state or county is an address. */
export function routeFromQuery(query: string, counties: Record<string, string>): QueryRoute {
  const q = (query ?? '').trim();
  if (!q) return { kind: 'address' };
  if (/\d/.test(q)) return { kind: 'address' };

  let place = q;
  let qualifierState: string | null = null;
  const comma = q.lastIndexOf(',');
  if (comma >= 0) {
    qualifierState = getStateAbbrevFromName(q.slice(comma + 1));
    if (qualifierState) place = q.slice(0, comma).trim();
  } else {
    const whole = getStateAbbrevFromName(q);
    if (whole) return { kind: 'browse-state', state: whole };
  }

  const target = normalize(place);
  if (!target) return { kind: 'address' };
  const stateFips = qualifierState ? getStateFips(qualifierState) : null;
  const hits = Object.entries(counties).filter(
    ([geoid, name]) =>
      normalize(name) === target && (!stateFips || geoid.startsWith(stateFips)),
  );
  if (hits.length === 1) {
    const [geoid] = hits[0];
    const state = getStateAbbrevFromFips(geoid.slice(0, 2));
    if (state) return { kind: 'browse-county', geoid, state };
  } else if (hits.length === 0 && qualifierState) {
    return { kind: 'browse-state', state: qualifierState };
  }
  return { kind: 'address' };
}

/** Async wrapper kept for callers. Never throws — any failure resolves to address. */
export async function resolveQueryRoute(
  query: string,
  counties: Record<string, string>,
): Promise<QueryRoute> {
  try {
    return routeFromQuery(query, counties);
  } catch {
    return { kind: 'address' };
  }
}
