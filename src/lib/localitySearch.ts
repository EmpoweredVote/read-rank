import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/** Result of classifying free text via the Google geocoder. */
export interface Classification {
  kind: 'address' | 'city' | 'county' | 'state' | 'unknown';
  stateAbbrev?: string;
  countyName?: string;
  cityName?: string;
}

/** Navigation intent derived from a classification + the county-name index. */
export type QueryRoute =
  | { kind: 'address' }
  | { kind: 'browse-state'; state: string }
  | { kind: 'browse-county'; geoid: string; state: string };

function comp(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
): google.maps.GeocoderAddressComponent | null {
  return components?.find((c) => c.types.includes(type)) || null;
}

function ensureConfigured(): void {
  // Only call setOptions if importLibrary hasn't been installed yet.
  // Prevents duplicate-call warning during Vite HMR.
  if (API_KEY && !window.google?.maps?.importLibrary) {
    // Use 'key' not 'apiKey' — the loader converts camelCase to snake_case
    // for URL params, so 'apiKey' becomes 'api_key' which Google rejects.
    setOptions({ key: API_KEY });
  }
}

/** Classify free text via the Google geocoder. Throws when the geocoder is unavailable
 *  or returns nothing — callers treat a throw as "fall back to address search". */
export async function classifyQuery(query: string): Promise<Classification> {
  if (!API_KEY) throw new Error('no maps key');
  ensureConfigured();
  const { Geocoder } = (await importLibrary('geocoding')) as google.maps.GeocodingLibrary;
  const geocoder = new Geocoder();
  const { results } = await geocoder.geocode({
    address: query,
    componentRestrictions: { country: 'US' },
  });
  const top = results?.[0];
  if (!top) throw new Error('no geocode result');

  const types = top.types || [];
  const components = top.address_components || [];
  const stateComp = comp(components, 'administrative_area_level_1');
  const countyComp = comp(components, 'administrative_area_level_2');
  const localityComp =
    comp(components, 'locality') || comp(components, 'postal_town') || comp(components, 'sublocality');

  const out: Classification = {
    kind: 'unknown',
    stateAbbrev: stateComp?.short_name || undefined,
    countyName: countyComp?.long_name || undefined,
    cityName: localityComp?.long_name || undefined,
  };

  const hasStreet =
    !!comp(components, 'street_number') ||
    types.some((t) => ['street_address', 'premise', 'subpremise', 'route'].includes(t));

  if (hasStreet || types.includes('postal_code')) out.kind = 'address';
  else if (types.includes('locality') || types.includes('postal_town') || types.includes('sublocality')) out.kind = 'city';
  else if (types.includes('administrative_area_level_2')) out.kind = 'county';
  else if (types.includes('administrative_area_level_1')) out.kind = 'state';

  return out;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(county|parish|borough)\b/g, '')
    .replace(/[^a-z]/g, '')
    .trim();
}

/** Map a classification to a navigation intent using the county-name index for GEOID lookup.
 *  Pure — unit-tested without the geocoder. */
export function routeFromClassification(
  c: Classification,
  counties: Record<string, string>,
  _query: string,
): QueryRoute {
  if (c.kind === 'address') return { kind: 'address' };
  if (!c.stateAbbrev) return { kind: 'address' };
  if (c.kind === 'state') return { kind: 'browse-state', state: c.stateAbbrev };
  if ((c.kind === 'county' || c.kind === 'city') && c.countyName) {
    const target = normalize(c.countyName);
    const hit = Object.entries(counties).find(([, name]) => normalize(name) === target);
    if (hit) return { kind: 'browse-county', geoid: hit[0], state: c.stateAbbrev };
    return { kind: 'browse-state', state: c.stateAbbrev };
  }
  return { kind: 'address' };
}

/** Full resolve: classify then route. Never throws — any failure resolves to address. */
export async function resolveQueryRoute(
  query: string,
  counties: Record<string, string>,
): Promise<QueryRoute> {
  try {
    return routeFromClassification(await classifyQuery(query), counties, query);
  } catch {
    return { kind: 'address' };
  }
}
