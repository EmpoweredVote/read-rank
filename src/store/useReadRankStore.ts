import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';
import { getPendingMatchups, computeRankings, makePairKey } from '../utils/matchupAlgorithm';

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

export type Phase = 'hub' | 'practice' | 'evaluation' | 'results';

export interface PracticeProgress {
  phase: 'evaluation' | 'results';
  currentQuoteIndex: number;
  rankedQuotes: RankedQuote[];
  disagreedQuotes: Quote[];
  matchupWins: Record<string, number>;
  completedMatchupPairs: string[];
  activeMatchupPair: [string, string] | null;
}

// Progress state for a single issue
export interface IssueProgress {
  issueId: string;
  phase: 'evaluation' | 'results';
  quotesToEvaluate: Quote[];
  currentQuoteIndex: number;
  disagreedQuotes: Quote[];
  rankedQuotes: RankedQuote[];  // Single source of truth for agreed quotes
  pendingRankQuoteId: string | null;  // Newly agreed quote awaiting user placement
  rankSkipCount: number;  // Tracks how many times user skipped rank prompt for pending quote
  candidateMatches: MatchingResult[];
  completed: boolean;
  matchupWins: Record<string, number>;       // quoteId -> win count
  completedMatchupPairs: string[];           // canonical pair keys (string[], NOT Set)
  activeMatchupPair: [string, string] | null; // current matchup pair IDs; null = swipe mode
}

interface ReadRankState {
  // Current navigation state
  phase: Phase;
  currentIssueId: string | null;

  // Per-issue progress tracking
  issueProgress: Record<string, IssueProgress>;

  // Practice state
  practiceCompleted: boolean;
  practiceProgress: PracticeProgress | null;

  // Actions
  setPhase: (phase: Phase) => void;
  selectIssue: (issueId: string, quotes: Quote[], issueData: IssueData) => void;
  nextQuote: () => void;
  agreeWithQuote: (quote: Quote) => void;
  disagreeWithQuote: (quote: Quote) => void;
  insertAtRank: (quoteId: string, targetIndex: number) => void;
  skipRankPrompt: () => void;
  dismissPending: () => void;
  reorderRankedQuotes: (newOrder: RankedQuote[]) => void;
  recordMatchupWin: (winnerId: string, loserId: string) => void;
  setCandidateMatches: (matches: MatchingResult[]) => void;
  goToHub: () => void;
  reset: () => void;
  resetIssue: (issueId: string) => void;

  // Practice actions
  startPractice: () => void;
  agreePracticeQuote: (quote: Quote) => void;
  disagreePracticeQuote: (quote: Quote) => void;
  nextPracticeQuote: () => void;
  recordPracticeMatchupWin: (winnerId: string, loserId: string) => void;
  completePractice: () => void;
  skipPractice: () => void;

  // Helpers
  getCurrentIssueProgress: () => IssueProgress | null;
  getIssueProgress: (issueId: string) => IssueProgress | null;
  getAllIssueProgress: () => Record<string, IssueProgress>;
  getPracticeProgress: () => PracticeProgress | null;
}

const createEmptyIssueProgress = (issueId: string): IssueProgress => ({
  issueId,
  phase: 'evaluation',
  quotesToEvaluate: [],
  currentQuoteIndex: 0,
  disagreedQuotes: [],
  rankedQuotes: [],
  pendingRankQuoteId: null,
  rankSkipCount: 0,
  candidateMatches: [],
  completed: false,
  matchupWins: {},
  completedMatchupPairs: [],
  activeMatchupPair: null,
});

const initialState = {
  phase: 'hub' as Phase,
  currentIssueId: null as string | null,
  issueProgress: {} as Record<string, IssueProgress>,
  practiceCompleted: false,
  practiceProgress: null as PracticeProgress | null,
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
        const newRank = progress.rankedQuotes.length + 1;
        const rankedQuote: RankedQuote = {
          ...quote,
          rank: newRank,
          timestamp: Date.now(),
        };

        const updatedRankedQuotes = [...progress.rankedQuotes, rankedQuote];

        // Check for pending matchups if we now have 2+ agreed quotes
        let activeMatchupPair: [string, string] | null = progress.activeMatchupPair;
        if (updatedRankedQuotes.length >= 2) {
          const pending = getPendingMatchups(updatedRankedQuotes, progress.completedMatchupPairs);
          activeMatchupPair = pending.length > 0 ? pending[0] : null;
        }

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              rankedQuotes: updatedRankedQuotes,
              pendingRankQuoteId: quote.id,
              rankSkipCount: 0,
              activeMatchupPair,
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

      insertAtRank: (quoteId, targetIndex) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const currentIndex = progress.rankedQuotes.findIndex(q => q.id === quoteId);
        if (currentIndex === -1) return;

        const reordered = arrayMove(progress.rankedQuotes, currentIndex, targetIndex);
        const withUpdatedRanks = reordered.map((q, i) => ({ ...q, rank: i + 1 }));

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              rankedQuotes: withUpdatedRanks,
              pendingRankQuoteId: null,
            },
          },
        });
      },

      skipRankPrompt: () => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const newSkipCount = progress.rankSkipCount + 1;

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              rankSkipCount: newSkipCount,
              // After 2 skips, dismiss the pending state (quote stays at bottom)
              pendingRankQuoteId: newSkipCount > 1 ? null : progress.pendingRankQuoteId,
            },
          },
        });
      },

      dismissPending: () => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              pendingRankQuoteId: null,
              rankSkipCount: 0,
            },
          },
        });
      },

      reorderRankedQuotes: (newOrder) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const withUpdatedRanks = newOrder.map((q, i) => ({ ...q, rank: i + 1 }));

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              rankedQuotes: withUpdatedRanks,
            },
          },
        });
      },

      recordMatchupWin: (winnerId, loserId) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];

        // Update win count for winner
        const newWins = {
          ...progress.matchupWins,
          [winnerId]: (progress.matchupWins[winnerId] ?? 0) + 1,
        };

        // Record completed pair
        const pairKey = makePairKey(winnerId, loserId);
        const newCompletedPairs = [...progress.completedMatchupPairs, pairKey];

        // Rerank by wins
        const reranked = computeRankings(progress.rankedQuotes, newWins);

        // Find next pending matchup
        const pending = getPendingMatchups(reranked, newCompletedPairs);
        const nextPair: [string, string] | null = pending.length > 0 ? pending[0] : null;

        set({
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              matchupWins: newWins,
              completedMatchupPairs: newCompletedPairs,
              rankedQuotes: reranked,
              activeMatchupPair: nextPair,
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

      startPractice: () => {
        set({
          phase: 'practice' as Phase,
          practiceProgress: {
            phase: 'evaluation',
            currentQuoteIndex: 0,
            rankedQuotes: [],
            disagreedQuotes: [],
            matchupWins: {},
            completedMatchupPairs: [],
            activeMatchupPair: null,
          },
        });
      },

      agreePracticeQuote: (quote) => {
        const state = get();
        const progress = state.practiceProgress;
        if (!progress) return;

        const newRank = progress.rankedQuotes.length + 1;
        const rankedQuote: RankedQuote = { ...quote, rank: newRank, timestamp: Date.now() };
        const updatedRanked = [...progress.rankedQuotes, rankedQuote];

        let activeMatchupPair: [string, string] | null = progress.activeMatchupPair;
        if (updatedRanked.length >= 2) {
          const pending = getPendingMatchups(updatedRanked, progress.completedMatchupPairs);
          activeMatchupPair = pending.length > 0 ? pending[0] : null;
        }

        set({
          practiceProgress: {
            ...progress,
            rankedQuotes: updatedRanked,
            currentQuoteIndex: progress.currentQuoteIndex + 1,
            activeMatchupPair,
          },
        });
      },

      disagreePracticeQuote: (quote) => {
        const state = get();
        const progress = state.practiceProgress;
        if (!progress) return;

        set({
          practiceProgress: {
            ...progress,
            disagreedQuotes: [...progress.disagreedQuotes, quote],
            currentQuoteIndex: progress.currentQuoteIndex + 1,
          },
        });
      },

      nextPracticeQuote: () => {
        // No-op — index already advanced in agree/disagree actions
      },

      recordPracticeMatchupWin: (winnerId, loserId) => {
        const state = get();
        const progress = state.practiceProgress;
        if (!progress) return;

        const newWins = {
          ...progress.matchupWins,
          [winnerId]: (progress.matchupWins[winnerId] ?? 0) + 1,
        };

        const pairKey = makePairKey(winnerId, loserId);
        const newCompletedPairs = [...progress.completedMatchupPairs, pairKey];

        const reranked = computeRankings(progress.rankedQuotes, newWins);

        const pending = getPendingMatchups(reranked, newCompletedPairs);
        const nextPair: [string, string] | null = pending.length > 0 ? pending[0] : null;

        set({
          practiceProgress: {
            ...progress,
            matchupWins: newWins,
            completedMatchupPairs: newCompletedPairs,
            rankedQuotes: reranked,
            activeMatchupPair: nextPair,
          },
        });
      },

      completePractice: () => {
        set({
          phase: 'hub' as Phase,
          practiceCompleted: true,
          practiceProgress: null,
        });
      },

      skipPractice: () => {
        set({
          phase: 'hub' as Phase,
          practiceCompleted: true,
          practiceProgress: null,
        });
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

      getPracticeProgress: () => {
        return get().practiceProgress;
      },
    }),
    {
      name: 'ev_readrank',
      version: 5,
      migrate: (_persistedState, version) => {
        // v5 migration: existing users (version > 0) skip practice; new users see it
        const isUpgrade = version > 0;
        return {
          phase: 'hub' as Phase,
          currentIssueId: null as string | null,
          issueProgress: {} as Record<string, IssueProgress>,
          practiceCompleted: isUpgrade,
          practiceProgress: null as PracticeProgress | null,
        };
      },
      partialize: (state) => ({
        phase: state.phase,
        currentIssueId: state.currentIssueId,
        issueProgress: state.issueProgress,
        practiceCompleted: state.practiceCompleted,
        practiceProgress: state.practiceProgress,
      }),
    }
  )
);
