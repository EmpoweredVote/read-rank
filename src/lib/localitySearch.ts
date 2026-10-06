import { fetchLocalities, type Locality } from '../data/api';
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

type Parsed =
  | { route: QueryRoute }
  | { lookup: { place: string; qualifierState: string | null } };

/** Shared local parsing. Returns a final route, or the place to look up as a city. */
function parseQuery(query: string, counties: Record<string, string>): Parsed {
  const address: Parsed = { route: { kind: 'address' } };
  const q = (query ?? '').trim();
  if (!q) return address;
  if (/\d/.test(q)) return address;

  let place = q;
  let qualifierState: string | null = null;
  const comma = q.lastIndexOf(',');
  if (comma >= 0) {
    qualifierState = getStateAbbrevFromName(q.slice(comma + 1));
    if (qualifierState) place = q.slice(0, comma).trim();
  } else {
    const whole = getStateAbbrevFromName(q);
    if (whole) return { route: { kind: 'browse-state', state: whole } };
  }

  const target = normalize(place);
  if (!target) return address;
  const stateFips = qualifierState ? getStateFips(qualifierState) : null;
  const hits = Object.entries(counties).filter(
    ([geoid, name]) =>
      normalize(name) === target && (!stateFips || geoid.startsWith(stateFips)),
  );
  if (hits.length === 1) {
    const [geoid] = hits[0];
    const state = getStateAbbrevFromFips(geoid.slice(0, 2));
    return state ? { route: { kind: 'browse-county', geoid, state } } : address;
  }
  if (hits.length === 0) return { lookup: { place, qualifierState } };
  return address;
}

/** Map free text to a navigation intent using only local data (state names + the
 *  county-name index). Pure; anything not clearly a state or county is an address. */
export function routeFromQuery(query: string, counties: Record<string, string>): QueryRoute {
  const parsed = parseQuery(query, counties);
  return 'route' in parsed ? parsed.route : { kind: 'address' };
}

/** Decide a route from city-lookup results. Pure. */
export function routeFromLocalities(
  localities: Locality[],
  counties: Record<string, string>,
  qualifierState: string | null,
): QueryRoute {
  if (localities.length === 0) {
    return qualifierState ? { kind: 'browse-state', state: qualifierState } : { kind: 'address' };
  }
  const countyGeoids = new Set(localities.map((l) => l.countyGeoid));
  if (countyGeoids.size === 1) {
    const [geoid] = [...countyGeoids];
    if (geoid in counties) {
      return { kind: 'browse-county', geoid, state: localities[0].state.toUpperCase() };
    }
  }
  const states = new Set(localities.map((l) => l.state.toUpperCase()));
  if (states.size === 1) return { kind: 'browse-state', state: [...states][0] };
  return { kind: 'address' };
}

/** Async resolver. Local state/county match first; a city lookup only when no county
 *  matches. Never throws — any failure resolves to address. */
export async function resolveQueryRoute(
  query: string,
  counties: Record<string, string>,
): Promise<QueryRoute> {
  try {
    const parsed = parseQuery(query, counties);
    if ('route' in parsed) return parsed.route;
    const { place, qualifierState } = parsed.lookup;
    const localities = await fetchLocalities(place, qualifierState);
    return routeFromLocalities(localities, counties, qualifierState);
  } catch {
    return { kind: 'address' };
  }
}
