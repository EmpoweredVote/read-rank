import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

/** An agreed quote in the race-wide pile. Position in the `agreed` array IS the rank. */
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
}

export interface RaceProgress {
  raceId: string;
  positionName: string;
  topics: Record<string, TopicProgress>;
  topicOrder: string[];
  currentTopicKey: string | null;
  /** ONE race-wide ordered pile. Index 0 = #1; first 3 = podium. */
  agreed: AgreedQuote[];
  phase: 'evaluation' | 'results';
  completed: boolean;
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
}

export type Phase = 'hub' | 'practice' | 'evaluation' | 'results';

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

  // Race actions
  setPhase: (phase: Phase) => void;
  selectRace: (payload: RacePayload) => void;
  setCurrentTopic: (topicKey: string) => void;
  nextTopic: () => void;
  agree: (quote: BlindQuote) => void;
  disagree: (quote: BlindQuote) => void;
  reorderAgreed: (orderedIds: string[]) => void;
  /** Recover a disagreed quote: remove from its topic's disagreed list, append to agreed. */
  reAgree: (quote: BlindQuote) => void;
  finishRace: () => void;
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

function buildRaceProgress(payload: RacePayload): RaceProgress {
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
    };
    topicOrder.push(t.topicKey);
  }
  return {
    raceId: payload.raceId,
    positionName: payload.positionName,
    topics,
    topicOrder,
    currentTopicKey: topicOrder[0] ?? null,
    agreed: [],
    phase: 'evaluation',
    completed: false,
  };
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
        if (phase !== 'hub') {
          const patch = withCurrentRace(state, (race) => ({
            ...race,
            phase: phase as 'evaluation' | 'results',
            completed: phase === 'results' ? true : race.completed,
          }));
          if (patch) {
            set({ phase, ...patch });
            return;
          }
        }
        set({ phase });
      },

      selectRace: (payload) => {
        const state = get();
        const existing = state.raceProgress[payload.raceId];
        const race = existing ?? buildRaceProgress(payload);
        set({
          currentRaceId: payload.raceId,
          phase: race.phase,
          raceProgress: {
            ...state.raceProgress,
            [payload.raceId]: race,
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
          const idx = race.topicOrder.indexOf(race.currentTopicKey);
          const next = race.topicOrder[idx + 1];
          return next ? { ...race, currentTopicKey: next } : race;
        });
        if (patch) set(patch);
      },

      agree: (quote) => {
        const patch = withCurrentRace(get(), (race) => {
          if (race.agreed.some((q) => q.id === quote.id)) return race;
          const topic = race.topics[quote.topicKey];
          const updatedTopic = topic
            ? { ...topic, currentIndex: Math.min(topic.currentIndex + 1, topic.quotesToEvaluate.length) }
            : topic;
          return {
            ...race,
            agreed: [...race.agreed, { ...quote, addedAt: Date.now() }],
            topics: topic ? { ...race.topics, [quote.topicKey]: updatedTopic } : race.topics,
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
          const byId = new Map(race.agreed.map((q) => [q.id, q]));
          const next = orderedIds.map((id) => byId.get(id)).filter(Boolean) as AgreedQuote[];
          // Append any not present in orderedIds (defensive).
          for (const q of race.agreed) if (!orderedIds.includes(q.id)) next.push(q);
          return { ...race, agreed: next };
        });
        if (patch) set(patch);
      },

      reAgree: (quote) => {
        const patch = withCurrentRace(get(), (race) => {
          if (race.agreed.some((q) => q.id === quote.id)) return race;
          const topic = race.topics[quote.topicKey];
          if (!topic) return race;
          if (!topic.disagreed.some((q) => q.id === quote.id)) return race;
          return {
            ...race,
            agreed: [...race.agreed, { ...quote, addedAt: Date.now() }],
            topics: {
              ...race.topics,
              [quote.topicKey]: {
                ...topic,
                disagreed: topic.disagreed.filter((q) => q.id !== quote.id),
              },
            },
          };
        });
        if (patch) set(patch);
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

      setLocationFilter: (filter) => set({ locationFilter: filter }),
      clearLocationFilter: () => set({ locationFilter: null }),

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
        const disagreed = Object.values(race.topics).flatMap((t) => t.disagreed);
        const sessionSize = race.agreed.length + disagreed.length;
        const verdicts: VerdictRecord[] = [];
        race.agreed.forEach((q, i) => {
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
      version: 8,
      migrate: (persistedState, version) => {
        // v8: race-scoped model. The old issue-scoped shape cannot be mapped
        // (no race_id, matchup-derived ranks). Reset progress; preserve
        // onboarding flags + location so returning users don't re-onboard.
        const isUpgrade = version > 0;
        const prev = (persistedState ?? {}) as Partial<typeof initialState>;
        return {
          ...initialState,
          practiceCompleted: isUpgrade,
          coachMarksCompleted: isUpgrade,
          locationFilter: prev.locationFilter ?? null,
        };
      },
      partialize: (state) => ({
        phase: state.phase,
        currentRaceId: state.currentRaceId,
        raceProgress: state.raceProgress,
        practiceCompleted: state.practiceCompleted,
        practiceProgress: state.practiceProgress,
        coachMarksCompleted: state.coachMarksCompleted,
        firstAgreeCoached: state.firstAgreeCoached,
        locationFilter: state.locationFilter,
      }),
    }
  )
);
