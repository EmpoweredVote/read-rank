import { apiFetch, getToken } from '../lib/auth';

// Compass data for the results screen's "Your compass" card. Same routes and rules
// Compass itself and Civic Spaces (useCompassData) use:
//   GET /api/compass/topics                     public — the topic catalog
//   GET /api/compass/politicians/:id/answers    public — a candidate's stances
//   GET /api/compass/answers                    signed in — the user's own stances
//   GET /api/compass/selected-topics            signed in — the user's chosen spoke order

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

/** Below this the chart says nothing useful: the user counts as not calibrated. */
export const MIN_SPOKES = 3;
/** Compass lets a user pick 3–8 topics; a fallback list is capped to match. */
export const MAX_SPOKES = 8;

export interface CompassStance { id?: string; value: number; text: string }

export interface CompassTopic {
  id: string;
  topic_key: string;
  title: string;
  short_title: string;
  stances: CompassStance[];
}

export interface CompassAnswer {
  topic_id: string;
  /** 1..stances.length; 0 means unanswered. */
  value: number;
  inverted?: boolean;
}

export interface MyCompass {
  answers: CompassAnswer[];
  /** Topic ids in the order the user chose in Compass; may be empty. */
  selected: string[];
}

/** One spoke of the user's compass, ready for RadarChartCore. */
export interface CompassSpoke {
  topicId: string;
  shortTitle: string;
  value: number;
  inverted: boolean;
}

async function getPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${API_BASE}${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

let topicsPromise: Promise<CompassTopic[]> | null = null;
/** The Compass topic catalog. Effectively static, so fetched once per page load. */
export function fetchCompassTopics(): Promise<CompassTopic[]> {
  if (!topicsPromise) {
    topicsPromise = getPublic<CompassTopic[]>('/compass/topics').catch((err) => {
      topicsPromise = null; // let a later call retry
      throw err;
    });
  }
  return topicsPromise;
}

const answersCache = new Map<string, Promise<CompassAnswer[]>>();
/** A candidate's published Compass stances (public). */
export function fetchPoliticianAnswers(politicianId: string): Promise<CompassAnswer[]> {
  let p = answersCache.get(politicianId);
  if (!p) {
    p = getPublic<CompassAnswer[]>(`/compass/politicians/${encodeURIComponent(politicianId)}/answers`)
      .catch((err) => {
        answersCache.delete(politicianId);
        throw err;
      });
    answersCache.set(politicianId, p);
  }
  return p;
}

const MOCK_KEY = 'rr-dev-compass-mock';

/**
 * True when the dev-only signed-in mock is switched on (`npm run dev` only).
 * `?compass=mock` turns it on for the rest of the browser tab, so it survives
 * clicking through the app (in-app links drop the query); `?compass=off` turns it off.
 */
export function isCompassMockOn(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  const param = new URLSearchParams(window.location.search).get('compass');
  try {
    if (param === 'mock') window.sessionStorage.setItem(MOCK_KEY, '1');
    if (param === 'off') window.sessionStorage.removeItem(MOCK_KEY);
    return window.sessionStorage.getItem(MOCK_KEY) === '1';
  } catch {
    return param === 'mock';
  }
}
// Read the switch once at start-up, while the opening URL still carries it.
isCompassMockOn();

/**
 * The signed-in user's own compass, or null when signed out (or the session
 * expired). Locally you are always signed out; `?compass=mock` swaps in the
 * signed-in stand-in from src/mocks/compassAnswers.ts.
 */
export async function fetchMyCompass(): Promise<MyCompass | null> {
  if (isCompassMockOn()) {
    const { MOCK_MY_COMPASS } = await import('../mocks/compassAnswers');
    return MOCK_MY_COMPASS;
  }
  if (!getToken()) return null;
  const res = await apiFetch('/compass/answers');
  if (!res) return null; // 401: token cleared, treat as signed out
  if (!res.ok) throw new Error(`GET ${API_BASE}/compass/answers failed: ${res.status}`);
  const answers = (await res.json()) as CompassAnswer[];
  let selected: string[] = [];
  try {
    const sel = await apiFetch('/compass/selected-topics');
    if (sel?.ok) selected = (await sel.json()) as string[];
  } catch {
    // Optional: without a chosen order, fall back to answered order.
  }
  return { answers, selected };
}

/**
 * The user's compass as spokes: the order chosen in Compass first, then anything
 * else answered, capped at MAX_SPOKES. Unanswered topics (value 0) are left out
 * entirely; plotted at zero they would read as a stance.
 */
export function buildSpokes(mine: MyCompass, topics: CompassTopic[]): CompassSpoke[] {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const answerById = new Map(mine.answers.map((a) => [a.topic_id, a]));
  const order = mine.selected.length > 0
    ? mine.selected
    : mine.answers.map((a) => a.topic_id);
  const spokes: CompassSpoke[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    const topic = byId.get(id);
    const answer = answerById.get(id);
    if (!topic || !answer || !(answer.value > 0)) continue;
    spokes.push({ topicId: id, shortTitle: topic.short_title, value: answer.value, inverted: !!answer.inverted });
    if (spokes.length === MAX_SPOKES) break;
  }
  return spokes;
}
