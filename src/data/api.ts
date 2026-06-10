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
  positionName: string;
  electionName: string;
  electionDate: string | null;
  state: string | null;
  jurisdictionLevel: string | null;
  candidateCount: number;
  topicCount: number;
  isLocal: boolean;
  /** True where this race is actually decided by ranked choice voting. */
  usesRcv?: boolean;
}

export interface RevealQuote {
  quoteId: string;
  text: string;
  supported: boolean;
  rank: number | null;
  sourceName?: string;
  sourceUrl?: string;
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

/** List races that have enough de-identified quote data to play. */
export async function fetchRaces(politicianIds?: string[]): Promise<RaceSummary[]> {
  try {
    const qs = politicianIds && politicianIds.length
      ? `?politician_ids=${encodeURIComponent(politicianIds.join(','))}`
      : '';
    const res = await fetch(`${API_BASE}/readrank/races${qs}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return (data.races ?? []) as RaceSummary[];
  } catch (err) {
    console.error('Failed to fetch races, falling back to mock', err);
    const { mockRaceSummary } = await import('./mockData');
    return [mockRaceSummary];
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
    return buildMockRacePayload();
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
  error?: string;
}

export async function searchPoliticians(query: string): Promise<SearchPoliticiansResult> {
  try {
    const res = await apiFetch('/essentials/candidates/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    if (!res) {
      return { status: 'error', data: [], error: 'Unauthorized', formattedAddress: '' };
    }
    const status = res.headers.get('X-Data-Status') || res.headers.get('x-data-status') || '';
    const formattedAddress = res.headers.get('X-Formatted-Address') || res.headers.get('x-formatted-address') || '';
    if (!res.ok) {
      return { status: 'error', data: [], error: `${res.status} ${res.statusText}`, formattedAddress: '' };
    }
    const raw = await res.json();
    const data: SearchPolitician[] = Array.isArray(raw) ? raw : (raw?.politicians ?? []);
    return { status: status || 'fresh', data, formattedAddress };
  } catch (error) {
    return { status: 'error', data: [], error: (error as Error).message, formattedAddress: '' };
  }
}
