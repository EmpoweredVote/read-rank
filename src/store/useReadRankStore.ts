import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CountyIndex, JurisdictionGeoIds } from '../data/api';

// ============================================
// Types — race -> topics -> blind quotes
// ============================================

/** A de-identified quote. Identity is withheld behind candidateToken until the reveal. */
export interface BlindQuote {
  id: string;
  text: string;
  candidateToken: string; // opaque, stable per-candidate within a race
  topicKey: string;
}

/** An agreed quote. Position in a topic's `agreed` array IS the rank within that topic. */
export interface AgreedQuote extends BlindQuote {
  addedAt: number;
}

export interface TopicProgress {
  topicKey: string;
  title: string;
  question: string;
  quotesToEvaluate: BlindQuote[];
  currentIndex: number;
  disagreed: BlindQuote[];
  /** Per-topic ordered pile. Index 0 = ranked #1 within this topic. */
  agreed: AgreedQuote[];
}

export interface RaceProgress {
  raceId: string;
  positionName: string;
  /** Clean display fields captured from the RaceSummary at selection time (ADR-0001).
   *  Optional: races started before this field existed fall back to positionName. */
  office?: string;
  seat?: string | null;
  state?: string | null;
  topics: Record<string, TopicProgress>;
  topicOrder: string[];
  currentTopicKey: string | null;
  phase: 'evaluation' | 'results';
  completed: boolean;
  /** Keys of topics the user chose to evaluate. Undefined for races started before this field existed. */
  selectedTopicKeys?: string[];
}

/** All agreed quotes across all topics in topic order (for results/verdicts). */
export function getAllAgreedQuotes(race: RaceProgress): AgreedQuote[] {
  return race.topicOrder.flatMap((k) => race.topics[k]?.agreed ?? []);
}

/** The topics the user chose to evaluate, in canonical `topicOrder` sequence.
 *  This — not `topicOrder` — is what the evaluation flow iterates. Falls back to
 *  the full order for races started before `selectedTopicKeys` existed, or if a
 *  selection somehow filtered everything out. */
export function getActiveTopicKeys(race: RaceProgress): string[] {
  const selected = race.selectedTopicKeys;
  if (!selected || selected.length === 0) return race.topicOrder;
  const set = new Set(selected);
  const active = race.topicOrder.filter((k) => set.has(k));
  return active.length > 0 ? active : race.topicOrder;
}

/** Shape returned by fetchRaceQuotes / mock data, consumed by selectRace. */
export interface RacePayload {
  raceId: string;
  positionName: string;
  topics: Array<{
    topicKey: string;
    title: string;
    question: string;
    quotes: BlindQuote[];
  }>;
}

export interface PracticeProgress {
  quotesToEvaluate: BlindQuote[];
  currentIndex: number;
  disagreed: BlindQuote[];
  agreed: AgreedQuote[];
}

export interface LocationFilter {
  address: string;
  politicianIds: string[];
  /** Two-letter state parsed from the address; null when unparseable. Drives the
   *  same-state ("More in {STATE}") relevance tier on the race hub. */
  state: string | null;
  /** User's home county GEOID (5-digit FIPS) from the address-search geocode; null
   *  when unresolved. Drives the "In {County}" relevance tier. */
  county: string | null;
  /** Display name for the county; null when unknown. */
  countyName: string | null;
  /** Resolved district GEOIDs from the address search, used to geo-match `isLocal`
   *  races on the hub. Null when unresolved or on an older backend that doesn't
   *  return it yet. */
  jurisdiction: JurisdictionGeoIds | null;
}

export type Phase = 'hub' | 'practice' | 'evaluation' | 'results' | 'issue-selection';

/** A single user verdict for backend sync (rank-bearing format). */
export interface VerdictRecord {
  quote_id: string;
  supported: boolean;
  rank: number | null;
  session_size: number;
}

interface ReadRankState {
  // Navigation
  phase: Phase;
  currentRaceId: string | null;

  // Per-race progress
  raceProgress: Record<string, RaceProgress>;

  // Practice
  practiceCompleted: boolean;
  practiceProgress: PracticeProgress | null;

  // Onboarding
  coachMarksCompleted: boolean;
  completeCoachMarks: () => void;
  /** The one-time caption after the user's first real agree has been shown. */
  firstAgreeCoached: boolean;
  completeFirstAgreeCoach: () => void;

  // Location filter
  locationFilter: LocationFilter | null;
  setLocationFilter: (filter: LocationFilter | null) => void;
  clearLocationFilter: () => void;

  // Race hub browse state (shared between the hero AddressFilterInput and RaceHub).
  // Ephemeral/derived — not persisted.
  /** County GEOID → name index, powering browse drill-down and smart-search routing. */
  counties: CountyIndex;
  setCounties: (counties: CountyIndex) => void;
  /** Explicit browse view (State → County → races); null = default ballot view. */
  browseTarget: { state: string; geoid: string | null } | null;
  setBrowseTarget: (target: { state: string; geoid: string | null } | null) => void;

  // Race actions
  setPhase: (phase: Phase) => void;
  selectRace: (payload: RacePayload, meta?: { office: string; seat: string | null; state: string | null }) => void;
  setCurrentTopic: (topicKey: string) => void;
  nextTopic: () => void;
  agree: (quote: BlindQuote) => void;
  disagree: (quote: BlindQuote) => void;
  reorderAgreed: (orderedIds: string[]) => void;
  /** Recover a disagreed quote: remove from its topic's disagreed list, append to agreed. */
  reAgree: (quote: BlindQuote) => void;
  finishRace: () => void;
  setSelectedTopics: (keys: string[]) => void;
  confirmIssueSelection: () => void;
  goToHub: () => void;
  reset: () => void;
  resetRace: (raceId: string) => void;

  // Practice actions
  startPractice: (quotes: BlindQuote[]) => void;
  agreePractice: (quote: BlindQuote) => void;
  disagreePractice: (quote: BlindQuote) => void;
  reorderPracticeAgreed: (orderedIds: string[]) => void;
  completePractice: () => void;
  skipPractice: () => void;

  // Helpers
  getCurrentRaceProgress: () => RaceProgress | null;
  getRaceProgress: (raceId: string) => RaceProgress | null;
  getCurrentTopicProgress: () => TopicProgress | null;
  getRaceVerdicts: (raceId: string) => VerdictRecord[];
  getPracticeProgress: () => PracticeProgress | null;
}

// ============================================
// Helpers
// ============================================

function buildRaceProgress(payload: RacePayload, meta?: { office: string; seat: string | null; state: string | null }): RaceProgress {
  const topics: Record<string, TopicProgress> = {};
  const topicOrder: string[] = [];
  for (const t of payload.topics) {
    topics[t.topicKey] = {
      topicKey: t.topicKey,
      title: t.title,
      question: t.question,
      quotesToEvaluate: t.quotes,
      currentIndex: 0,
      disagreed: [],
      agreed: [],
    };
    topicOrder.push(t.topicKey);
  }
  return {
    raceId: payload.raceId,
    positionName: payload.positionName,
    office: meta?.office,
    seat: meta?.seat ?? null,
    state: meta?.state ?? null,
    topics,
    topicOrder,
    currentTopicKey: topicOrder[0] ?? null,
    phase: 'evaluation',
    completed: false,
    selectedTopicKeys: topicOrder,
  };
}

// Refresh display-only content (topic title + question) from a freshly-fetched payload
// without disturbing the user's verdicts, ranking, phase, or selection. Content edits — e.g.
// a sharpened per-race ranking question — must reach returning users whose progress is
// persisted in localStorage (selectRace otherwise reuses the stale cached copy).
function refreshRaceContent(race: RaceProgress, payload: RacePayload): RaceProgress {
  const topics = { ...race.topics };
  for (const t of payload.topics) {
    const prev = topics[t.topicKey];
    if (prev) topics[t.topicKey] = { ...prev, title: t.title, question: t.question };
  }
  return { ...race, topics };
}

const initialState = {
  phase: 'hub' as Phase,
  currentRaceId: null as string | null,
  raceProgress: {} as Record<string, RaceProgress>,
  practiceCompleted: false,
  practiceProgress: null as PracticeProgress | null,
  coachMarksCompleted: false,
  firstAgreeCoached: false,
  locationFilter: null as LocationFilter | null,
  counties: {} as CountyIndex,
  browseTarget: null as { state: string; geoid: string | null } | null,
};

// Immutably update the current race's progress.
function withCurrentRace(
  state: ReadRankState,
  fn: (race: RaceProgress) => RaceProgress
): Partial<ReadRankState> | null {
  const raceId = state.currentRaceId;
  if (!raceId || !state.raceProgress[raceId]) return null;
  return {
    raceProgress: {
      ...state.raceProgress,
      [raceId]: fn(state.raceProgress[raceId]),
    },
  };
}

// ============================================
// Store
// ============================================

export const useReadRankStore = create<ReadRankState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPhase: (phase) => {
        const state = get();
        if (phase === 'evaluation' || phase === 'results') {
          const patch = withCurrentRace(state, (race) => ({
            ...race,
            phase,
            completed: phase === 'results' ? true : race.completed,
          }));
          if (patch) {
            set({ phase, ...patch });
            return;
          }
        }
        set({ phase });
      },

      selectRace: (payload, meta) => {
        const state = get();
        const existing = state.raceProgress[payload.raceId];
        const race = existing
          ? refreshRaceContent({ ...existing, ...(meta ?? {}) }, payload)
          : buildRaceProgress(payload, meta);
        const nextPhase: Phase = existing ? race.phase : 'issue-selection';
        const selectedTopicKeys = race.selectedTopicKeys ?? race.topicOrder;
        set({
          currentRaceId: payload.raceId,
          phase: nextPhase,
          raceProgress: {
            ...state.raceProgress,
            [payload.raceId]: { ...race, selectedTopicKeys },
          },
        });
      },

      setCurrentTopic: (topicKey) => {
        const patch = withCurrentRace(get(), (race) =>
          race.topics[topicKey] ? { ...race, currentTopicKey: topicKey } : race
        );
        if (patch) set(patch);
      },

      nextTopic: () => {
        const patch = withCurrentRace(get(), (race) => {
          if (!race.currentTopicKey) return race;
          // Advance within the user's selected topics, skipping deselected ones.
          const active = getActiveTopicKeys(race);
          const idx = active.indexOf(race.currentTopicKey);
          const next = active[idx + 1];
          return next ? { ...race, currentTopicKey: next } : race;
        });
        if (patch) set(patch);
      },

      agree: (quote) => {
        const patch = withCurrentRace(get(), (race) => {
          const topic = race.topics[quote.topicKey];
          if (!topic) return race;
          if (topic.agreed.some((q) => q.id === quote.id)) return race;
          return {
            ...race,
            topics: {
              ...race.topics,
              [quote.topicKey]: {
                ...topic,
                agreed: [...topic.agreed, { ...quote, addedAt: Date.now() }],
                currentIndex: Math.min(topic.currentIndex + 1, topic.quotesToEvaluate.length),
              },
            },
          };
        });
        if (patch) set(patch);
      },

      disagree: (quote) => {
        const patch = withCurrentRace(get(), (race) => {
          const topic = race.topics[quote.topicKey];
          if (!topic) return race;
          return {
            ...race,
            topics: {
              ...race.topics,
              [quote.topicKey]: {
                ...topic,
                disagreed: [...topic.disagreed, quote],
                currentIndex: Math.min(topic.currentIndex + 1, topic.quotesToEvaluate.length),
              },
            },
          };
        });
        if (patch) set(patch);
      },

      reorderAgreed: (orderedIds) => {
        const patch = withCurrentRace(get(), (race) => {
          const topicKey = race.currentTopicKey;
          if (!topicKey || !race.topics[topicKey]) return race;
          const topic = race.topics[topicKey];
          const byId = new Map(topic.agreed.map((q) => [q.id, q]));
          const next = orderedIds.map((id) => byId.get(id)).filter(Boolean) as AgreedQuote[];
          // Append any not present in orderedIds (defensive).
          for (const q of topic.agreed) if (!orderedIds.includes(q.id)) next.push(q);
          return { ...race, topics: { ...race.topics, [topicKey]: { ...topic, agreed: next } } };
        });
        if (patch) set(patch);
      },

      reAgree: (quote) => {
        const patch = withCurrentRace(get(), (race) => {
          const topic = race.topics[quote.topicKey];
          if (!topic) return race;
          if (topic.agreed.some((q) => q.id === quote.id)) return race;
          if (!topic.disagreed.some((q) => q.id === quote.id)) return race;
          return {
            ...race,
            topics: {
              ...race.topics,
              [quote.topicKey]: {
                ...topic,
                agreed: [...topic.agreed, { ...quote, addedAt: Date.now() }],
                disagreed: topic.disagreed.filter((q) => q.id !== quote.id),
              },
            },
          };
        });
        if (patch) set(patch);
      },

      setSelectedTopics: (keys) => {
        const patch = withCurrentRace(get(), (race) => ({ ...race, selectedTopicKeys: keys }));
        if (patch) set(patch);
      },

      confirmIssueSelection: () => {
        const state = get();
        const patch = withCurrentRace(state, (race) => {
          // Start on the first selected topic — the first catalog topic may have
          // been deselected.
          const active = getActiveTopicKeys(race);
          const currentTopicKey =
            race.currentTopicKey && active.includes(race.currentTopicKey)
              ? race.currentTopicKey
              : active[0] ?? race.currentTopicKey;
          return { ...race, phase: 'evaluation' as const, currentTopicKey };
        });
        if (patch) set({ phase: 'evaluation', ...patch });
        else set({ phase: 'evaluation' });
      },

      finishRace: () => {
        const state = get();
        const patch = withCurrentRace(state, (race) => ({
          ...race,
          phase: 'results',
          completed: true,
        }));
        if (patch) set({ phase: 'results', ...patch });
        else set({ phase: 'results' });
      },

      goToHub: () => set({ phase: 'hub', currentRaceId: null }),

      reset: () => set(initialState),

      resetRace: (raceId) => {
        const state = get();
        const next = { ...state.raceProgress };
        delete next[raceId];
        set({ raceProgress: next });
      },

      // ---- Practice ----

      startPractice: (quotes) => {
        set({
          phase: 'practice',
          practiceProgress: {
            quotesToEvaluate: quotes,
            currentIndex: 0,
            disagreed: [],
            agreed: [],
          },
        });
      },

      agreePractice: (quote) => {
        const p = get().practiceProgress;
        if (!p) return;
        if (p.agreed.some((q) => q.id === quote.id)) return;
        set({
          practiceProgress: {
            ...p,
            agreed: [...p.agreed, { ...quote, addedAt: Date.now() }],
            currentIndex: Math.min(p.currentIndex + 1, p.quotesToEvaluate.length),
          },
        });
      },

      disagreePractice: (quote) => {
        const p = get().practiceProgress;
        if (!p) return;
        set({
          practiceProgress: {
            ...p,
            disagreed: [...p.disagreed, quote],
            currentIndex: Math.min(p.currentIndex + 1, p.quotesToEvaluate.length),
          },
        });
      },

      reorderPracticeAgreed: (orderedIds) => {
        const p = get().practiceProgress;
        if (!p) return;
        const byId = new Map(p.agreed.map((q) => [q.id, q]));
        const next = orderedIds.map((id) => byId.get(id)).filter(Boolean) as AgreedQuote[];
        for (const q of p.agreed) if (!orderedIds.includes(q.id)) next.push(q);
        set({ practiceProgress: { ...p, agreed: next } });
      },

      completePractice: () => set({ phase: 'hub', practiceCompleted: true, practiceProgress: null }),
      skipPractice: () => set({ phase: 'hub', practiceCompleted: true, practiceProgress: null }),

      completeCoachMarks: () => set({ coachMarksCompleted: true }),
      completeFirstAgreeCoach: () => set({ firstAgreeCoached: true }),

      // Locating means "show my ballot" — leave any browse view when a filter is set.
      setLocationFilter: (filter) =>
        set(filter ? { locationFilter: filter, browseTarget: null } : { locationFilter: filter }),
      clearLocationFilter: () => set({ locationFilter: null, browseTarget: null }),

      setCounties: (counties) => set({ counties }),
      setBrowseTarget: (browseTarget) => set({ browseTarget }),

      // ---- Helpers ----

      getCurrentRaceProgress: () => {
        const state = get();
        if (!state.currentRaceId) return null;
        return state.raceProgress[state.currentRaceId] ?? null;
      },

      getRaceProgress: (raceId) => get().raceProgress[raceId] ?? null,

      getCurrentTopicProgress: () => {
        const race = get().getCurrentRaceProgress();
        if (!race || !race.currentTopicKey) return null;
        return race.topics[race.currentTopicKey] ?? null;
      },

      getRaceVerdicts: (raceId) => {
        const race = get().raceProgress[raceId];
        if (!race) return [];
        const allAgreed = getAllAgreedQuotes(race);
        const disagreed = Object.values(race.topics).flatMap((t) => t.disagreed);
        const sessionSize = allAgreed.length + disagreed.length;
        const verdicts: VerdictRecord[] = [];
        allAgreed.forEach((q, i) => {
          verdicts.push({ quote_id: q.id, supported: true, rank: i + 1, session_size: sessionSize });
        });
        for (const q of disagreed) {
          verdicts.push({ quote_id: q.id, supported: false, rank: null, session_size: sessionSize });
        }
        return verdicts;
      },

      getPracticeProgress: () => get().practiceProgress,
    }),
    {
      name: 'ev_readrank',
      version: 10,
      migrate: (persistedState, version) => {
        // v9: per-topic agreed arrays. Cannot map old race.agreed (no topicKey
        // partition guaranteed). Reset race progress; preserve onboarding flags.
        // v8: race-scoped model. Same reset rationale.
        const isUpgrade = version > 0;
        const prev = (persistedState ?? {}) as Partial<typeof initialState>;
        return {
          ...initialState,
          practiceCompleted: isUpgrade,
          coachMarksCompleted: isUpgrade,
          locationFilter: prev.locationFilter
            ? {
                ...prev.locationFilter,
                state: prev.locationFilter.state ?? null,
                county: prev.locationFilter.county ?? null,
                countyName: prev.locationFilter.countyName ?? null,
                // Old persisted filters predate `jurisdiction` — tolerate its absence.
                jurisdiction: prev.locationFilter.jurisdiction ?? null,
              }
            : null,
        };
      },
      // `phase` and `currentRaceId` are intentionally NOT persisted: returning to
      // Read & Rank should always land on the hub, never resume mid-race. Per-race
      // progress lives in `raceProgress`, so re-entering a race via `selectRace`
      // still resumes exactly where the user left off.
      partialize: (state) => ({
        raceProgress: state.raceProgress,
        practiceCompleted: state.practiceCompleted,
        practiceProgress: state.practiceProgress,
        coachMarksCompleted: state.coachMarksCompleted,
        firstAgreeCoached: state.firstAgreeCoached,
        locationFilter: state.locationFilter,
      }),
      // Guarantee the hub-landing for users whose localStorage predates the
      // partialize change above and still carries a mid-race phase/currentRaceId.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.phase = 'hub';
          state.currentRaceId = null;
        }
      },
    }
  )
);
