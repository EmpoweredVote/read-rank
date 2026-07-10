import { apiFetch } from '../lib/auth';
import type { BlindQuote, RacePayload, VerdictRecord } from '../store/useReadRankStore';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

// ============================================================
// Types
// ============================================================

export interface RaceSummary {
  raceId: string;
  office: string;
  electionName: string;
  electionDate: string | null;
  state: string | null;
  jurisdictionLevel: string | null;
  candidateCount: number;
  topicCount: number;
  isLocal: boolean;
  /** True where this race is actually decided by ranked choice voting. */
  usesRcv?: boolean;
  /** Backend-computed; frontend derives a fallback when absent. */
  tier?: RaceTier;
  scope?: RaceScope;
  boundaryRef?: BoundaryRef | null;
  /** Parent boundary to nest the child inside (backend-resolved). Null = render child alone. */
  frameRef?: BoundaryRef | null;
  /** GEOIDs of the counties this race belongs to (set; state-leg districts cross county
   *  lines). Absent/[] for statewide, federal, and unframed races. */
  countyGeoIds?: string[];
  /** Total blind quotes in the race; used for the time estimate. */
  quoteCount?: number;
  /** Topics with enough quotes to rank; falls back to topicCount. */
  rankableTopicCount?: number;
  /** Backend-formatted seat label, e.g. "District 1", "9th District". Null for statewide races. */
  seat?: string | null;
}

export type RaceTier = 'federal' | 'state' | 'local';
export type RaceScope = 'statewide' | 'district' | 'county' | 'citywide';

/** Map of county GEOID → display name, returned alongside the race list. */
export type CountyIndex = Record<string, string>;

/** How a race's motif finds its boundary polygon. layer is an MTFCC or layer key.
 *  bbox and geojson are embedded by the backend when available — the motif uses
 *  them directly to avoid a secondary fetch. */
export interface BoundaryRef {
  layer: string;
  geoid: string;
  bbox?: [number, number, number, number];
  geojson?: GeoJsonGeometry;
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

export interface RevealQuote {
  quoteId: string;
  /** Edited/revealed quote — the source of truth shown by default. */
  text: string;
  supported: boolean;
  /** Global rank (1-based) across the whole race for agreed quotes; null for
   *  disagreed. Per-topic ranks are re-derived from this in `buildPerTopicRankMap`. */
  rank: number | null;
  sourceName?: string;
  sourceUrl?: string;
  /** Human date string, e.g. "Oct 3, 2025". */
  sourceDate?: string;
  /** Full original quote. `text` is a contiguous substring of this. */
  verbatimText?: string;
  /** Editorial note, shown only in the verbatim/raw view. */
  editorNote?: string;
  /** Source video URL. */
  videoUrl?: string;
  /** Deep-link start time in seconds. */
  videoTimestampSeconds?: number;
}

export interface PerTopicReveal {
  topicKey: string;
  title: string;
  userTopWinner: boolean;
  quotes: RevealQuote[];
}

export interface BallotEntry {
  rank: number;
  candidateId: string;
  name: string;
  office: string;
  /** Position/title, e.g. "City Council Member". Falls back to `office`. */
  title?: string;
  /** Governing body, e.g. "Salt Lake City Council". */
  chamber?: string;
  /** Seat/district, e.g. "District 4". */
  district?: string;
  photo: string;
  essentialsUrl: string;
  evidence: {
    agreementCount: number;
    firstPlaceCount: number;
    topicsWithAgreement: number;
  };
  perTopic: PerTopicReveal[];
  /** Internal sort score — only present when the backend debug flag is on. Never shown. */
  score?: number;
}

export interface RevealResult {
  raceId: string;
  positionName: string;
  /** True where this race is actually decided by ranked choice voting. */
  usesRcv?: boolean;
  ballot: BallotEntry[];
}

// ============================================================
// Race endpoints (with offline mock fallback)
// ============================================================

/**
 * Resolved district GEOIDs for the user's address, keyed by district type.
 * Mirrors the backend `JurisdictionGeoIds` shape (ev-accounts). Each field is a
 * GEOID string or null when that district type wasn't resolved (e.g. no county,
 * or a statewide-only address).
 */
export interface JurisdictionGeoIds {
  congressional: string | null;
  state_senate: string | null;
  state_house: string | null;
  county: string | null;
  school_district: string | null;
}

/** List races that have enough de-identified quote data to play. */
export async function fetchRaces(
  politicianIds?: string[],
  jurisdiction?: JurisdictionGeoIds | null,
): Promise<{ races: RaceSummary[]; counties: CountyIndex }> {
  try {
    const params = new URLSearchParams();
    if (politicianIds && politicianIds.length) {
      params.set('politician_ids', politicianIds.join(','));
    }
    if (jurisdiction) {
      if (jurisdiction.congressional) params.set('cd', jurisdiction.congressional);
      if (jurisdiction.state_senate) params.set('sldu', jurisdiction.state_senate);
      if (jurisdiction.state_house) params.set('sldl', jurisdiction.state_house);
      if (jurisdiction.county) params.set('county', jurisdiction.county);
      if (jurisdiction.school_district) params.set('school', jurisdiction.school_district);
    }
    const qsString = params.toString();
    const qs = qsString ? `?${qsString}` : '';
    const res = await fetch(`${API_BASE}/readrank/races${qs}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return {
      races: (data.races ?? []) as RaceSummary[],
      counties: (data.counties ?? {}) as CountyIndex,
    };
  } catch (err) {
    console.error('Failed to fetch races, falling back to mock', err);
    const { mockRaceSummary } = await import('./mockData');
    return { races: [mockRaceSummary], counties: {} };
  }
}

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

/**
 * Structural blindness guard: rebuild the payload with exactly the BlindQuote
 * keys so an over-returning backend (sourceName, party, candidate name, ...)
 * can never leak provenance into the store before the reveal.
 */
function sanitizeRacePayload(raw: RacePayload): RacePayload {
  return {
    raceId: raw.raceId,
    positionName: raw.positionName,
    topics: (raw.topics ?? [])
      .map((topic) => ({
        topicKey: topic.topicKey,
        title: topic.title,
        question: topic.question,
        quotes: (topic.quotes ?? []).map(
          (quote): BlindQuote => ({
            id: quote.id,
            text: quote.text,
            candidateToken: quote.candidateToken,
            topicKey: quote.topicKey,
          })
        ),
      }))
      // A topic with one voice is not a comparison (REDESIGN_SPEC §8).
      .filter((topic) => topic.quotes.length >= 2),
  };
}

/** Blind, topic-grouped quotes for a race. Never returns candidate identities. */
export async function fetchRaceQuotes(raceId: string): Promise<RacePayload> {
  try {
    const res = await fetch(`${API_BASE}/readrank/races/${encodeURIComponent(raceId)}/quotes`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return sanitizeRacePayload((await res.json()) as RacePayload);
  } catch (err) {
    console.error('Failed to fetch race quotes, falling back to mock', err);
    const { buildMockRacePayload } = await import('./mockData');
    // Same choke point as the live path: blindness + thin-topic invariants
    // hold structurally for the fallback too, not by curation discipline.
    return sanitizeRacePayload(buildMockRacePayload());
  }
}

/**
 * Reveal the candidate ballot. POSTs the user's verdicts so guests can reveal
 * without auth (the client knows everything except identities). Authed users'
 * verdicts are also persisted separately via verdictSync.
 */
export async function fetchRaceReveal(raceId: string, verdicts: VerdictRecord[]): Promise<RevealResult> {
  try {
    const res = await fetch(`${API_BASE}/readrank/races/${encodeURIComponent(raceId)}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verdicts }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return (await res.json()) as RevealResult;
  } catch (err) {
    console.error('Failed to fetch reveal, falling back to mock', err);
    const { buildMockReveal } = await import('./mockData');
    return buildMockReveal(verdicts);
  }
}

// ============================================================
// Address → politicians (unchanged)
// ============================================================

export interface SearchPolitician {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface SearchPoliticiansResult {
  status: string;
  data: SearchPolitician[];
  formattedAddress: string;
  county: { geoid: string; name: string } | null;
  /** Resolved district GEOIDs for the address; null on older backends that don't return it. */
  jurisdiction: JurisdictionGeoIds | null;
  error?: string;
}

/** Parses the `jurisdiction` object from a search response body. Null when absent
 *  (older backend) or malformed, so callers can fall back to roster-only matching. */
function parseJurisdiction(raw: unknown): JurisdictionGeoIds | null {
  if (!raw || typeof raw !== 'object') return null;
  const j = raw as Record<string, unknown>;
  const field = (key: string): string | null => (typeof j[key] === 'string' ? (j[key] as string) : null);
  return {
    congressional: field('congressional'),
    state_senate: field('state_senate'),
    state_house: field('state_house'),
    county: field('county'),
    school_district: field('school_district'),
  };
}

export async function searchPoliticians(query: string): Promise<SearchPoliticiansResult> {
  try {
    const res = await apiFetch('/essentials/candidates/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    if (!res) {
      return { status: 'error', data: [], error: 'Unauthorized', formattedAddress: '', county: null, jurisdiction: null };
    }
    const status = res.headers.get('X-Data-Status') || res.headers.get('x-data-status') || '';
    const formattedAddress = res.headers.get('X-Formatted-Address') || res.headers.get('x-formatted-address') || '';
    if (!res.ok) {
      return { status: 'error', data: [], error: `${res.status} ${res.statusText}`, formattedAddress: '', county: null, jurisdiction: null };
    }
    const raw = await res.json();
    const data: SearchPolitician[] = Array.isArray(raw) ? raw : (raw?.politicians ?? []);
    const rawCounty = (raw && !Array.isArray(raw)) ? raw.county : null;
    const county = rawCounty && typeof rawCounty.geoid === 'string' && rawCounty.geoid
      ? { geoid: rawCounty.geoid as string, name: typeof rawCounty.name === 'string' ? rawCounty.name : '' }
      : null;
    const jurisdiction = (raw && !Array.isArray(raw)) ? parseJurisdiction(raw.jurisdiction) : null;
    return { status: status || 'fresh', data, formattedAddress, county, jurisdiction };
  } catch (error) {
    return { status: 'error', data: [], error: (error as Error).message, formattedAddress: '', county: null, jurisdiction: null };
  }
}
