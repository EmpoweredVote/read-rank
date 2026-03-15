import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Quote {
  id: string;
  text: string;
  candidateId?: string;
  issue: string;
  sourceUrl?: string;
  sourceName?: string;
}

export interface RankedQuote extends Quote {
  rank: number;
  timestamp: number;
}

export interface Candidate {
  id: string;
  name: string;
  party: string;
  office: string;
  photo: string;
  alignmentPercent: number;
  issuesAligned: number;
  totalIssues: number;
}

export interface MatchingResult {
  candidateId: string;
  name: string;
  party: string;
  office: string;
  photo: string;
  alignmentPercent: number;
  issuesAligned: number;
  totalIssues: number;
  rankedQuoteMatches: Array<{
    userRank: number;
    quoteId: string;
    points: number;
  }>;
}

export interface IssueData {
  id: string;
  title: string;
  question: string;
}

export type Phase = 'hub' | 'evaluation' | 'results';

// Progress state for a single issue
export interface IssueProgress {
  issueId: string;
  phase: 'evaluation' | 'results';
  quotesToEvaluate: Quote[];
  currentQuoteIndex: number;
  agreedQuotes: Quote[];
  disagreedQuotes: Quote[];
  rankedQuotes: RankedQuote[];
  candidateMatches: MatchingResult[];
  completed: boolean;
}

interface ReadRankState {
  // Current navigation state
  phase: Phase;
  currentIssueId: string | null;

  // Per-issue progress tracking
  issueProgress: Record<string, IssueProgress>;

  // Actions
  setPhase: (phase: Phase) => void;
  selectIssue: (issueId: string, quotes: Quote[], issueData: IssueData) => void;
  nextQuote: () => void;
  agreeWithQuote: (quote: Quote) => void;
  disagreeWithQuote: (quote: Quote) => void;
  rankQuote: (quoteId: string, newRank: number) => void;
  setRankedQuotes: (quotes: Quote[]) => void;
  reorderAgreedQuotes: (quotes: Quote[]) => void;
  setCandidateMatches: (matches: MatchingResult[]) => void;
  goToHub: () => void;
  reset: () => void;
  resetIssue: (issueId: string) => void;

  // Helpers
  getCurrentIssueProgress: () => IssueProgress | null;
  getIssueProgress: (issueId: string) => IssueProgress | null;
  getAllIssueProgress: () => Record<string, IssueProgress>;
}

const createEmptyIssueProgress = (issueId: string): IssueProgress => ({
  issueId,
  phase: 'evaluation',
  quotesToEvaluate: [],
  currentQuoteIndex: 0,
  agreedQuotes: [],
  disagreedQuotes: [],
  rankedQuotes: [],
  candidateMatches: [],
  completed: false,
});

const initialState = {
  phase: 'hub' as Phase,
  currentIssueId: null as string | null,
  issueProgress: {} as Record<string, IssueProgress>,
};

export const useReadRankStore = create<ReadRankState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPhase: (phase) => {
        const state = get();
        const issueId = state.currentIssueId;

        if (issueId && state.issueProgress[issueId]) {
          // Update the phase within the current issue's progress
          if (phase !== 'hub') {
            set({
              phase,
              issueProgress: {
                ...state.issueProgress,
                [issueId]: {
                  ...state.issueProgress[issueId],
                  phase: phase as 'evaluation' | 'results',
                  completed: phase === 'results' ? true : state.issueProgress[issueId].completed,
                },
              },
            });
          } else {
            set({ phase });
          }
        } else {
          set({ phase });
        }
      },

      selectIssue: (issueId, quotes, _issueData) => {
        const state = get();

        // Check if we have existing progress for this issue
        let progress = state.issueProgress[issueId];

        if (!progress) {
          // Create new progress for this issue
          progress = createEmptyIssueProgress(issueId);
          progress.quotesToEvaluate = quotes;
        }

        set({
          currentIssueId: issueId,
          phase: progress.phase,
          issueProgress: {
            ...state.issueProgress,
            [issueId]: progress,
          },
        });
      },

      nextQuote: () => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const nextIndex = progress.currentQuoteIndex + 1;

        // Cap the index — EvaluationPhase.handleComplete handles explicit phase transitions
        const cappedIndex = Math.min(nextIndex, progress.quotesToEvaluate.length);

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              currentQuoteIndex: cappedIndex,
            },
          },
        });
      },

      agreeWithQuote: (quote) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const updatedAgreedQuotes = [...progress.agreedQuotes, quote];

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              agreedQuotes: updatedAgreedQuotes,
            },
          },
        });
        get().nextQuote();
      },

      disagreeWithQuote: (quote) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const updatedDisagreedQuotes = [...progress.disagreedQuotes, quote];

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              disagreedQuotes: updatedDisagreedQuotes,
            },
          },
        });
        get().nextQuote();
      },

      rankQuote: (quoteId, newRank) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const quoteToRank = progress.agreedQuotes.find(q => q.id === quoteId);
        if (!quoteToRank) return;

        const filteredRankedQuotes = progress.rankedQuotes.filter(q => q.id !== quoteId);
        const rankedQuote: RankedQuote = {
          ...quoteToRank,
          rank: newRank,
          timestamp: Date.now(),
        };

        const newRankedQuotes = [...filteredRankedQuotes, rankedQuote]
          .sort((a, b) => a.rank - b.rank)
          .map((quote, index) => ({ ...quote, rank: index + 1 }));

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              rankedQuotes: newRankedQuotes,
            },
          },
        });
      },

      setRankedQuotes: (quotes: Quote[]) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const rankedQuotes: RankedQuote[] = quotes.map((quote, index) => ({
          ...quote,
          rank: index + 1,
          timestamp: Date.now(),
        }));

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              rankedQuotes,
            },
          },
        });
      },

      reorderAgreedQuotes: (quotes: Quote[]) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              agreedQuotes: quotes,
            },
          },
        });
      },

      setCandidateMatches: (matches) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              candidateMatches: matches,
              completed: true,
            },
          },
        });
      },

      goToHub: () => {
        set({
          phase: 'hub',
          currentIssueId: null,
        });
      },

      reset: () => set(initialState),

      resetIssue: (issueId: string) => {
        const state = get();
        const newProgress = { ...state.issueProgress };
        delete newProgress[issueId];
        set({ issueProgress: newProgress });
      },

      getCurrentIssueProgress: () => {
        const state = get();
        if (!state.currentIssueId) return null;
        return state.issueProgress[state.currentIssueId] || null;
      },

      getIssueProgress: (issueId: string) => {
        const state = get();
        return state.issueProgress[issueId] || null;
      },

      getAllIssueProgress: () => {
        return get().issueProgress;
      },
    }),
    {
      name: 'ev_readrank',
      version: 2,
      migrate: (_persistedState, _version) => {
        // v2 migration: wipe all old state (v1 had 'ranking' phase + badge system)
        return { phase: 'hub' as Phase, currentIssueId: null as string | null, issueProgress: {} as Record<string, IssueProgress> };
      },
      partialize: (state) => ({
        phase: state.phase,
        currentIssueId: state.currentIssueId,
        issueProgress: state.issueProgress,
      }),
    }
  )
);
