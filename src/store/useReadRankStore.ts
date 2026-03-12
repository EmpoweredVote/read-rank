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

export type BadgeType = 'diamond' | 'gold' | null;

export interface BadgeAssignment {
  diamond: string | null; // quoteId that has the diamond
  gold: string | null;    // quoteId that has the gold
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

export type Phase = 'hub' | 'evaluation' | 'ranking' | 'results';

// Progress state for a single issue
export interface IssueProgress {
  issueId: string;
  phase: 'evaluation' | 'ranking' | 'results';
  quotesToEvaluate: Quote[];
  currentQuoteIndex: number;
  agreedQuotes: Quote[];
  disagreedQuotes: Quote[];
  rankedQuotes: RankedQuote[];
  badgeAssignments: BadgeAssignment;
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
  assignBadge: (quoteId: string, badge: BadgeType) => void;
  clearBadge: (badge: 'diamond' | 'gold') => void;
  setCandidateMatches: (matches: MatchingResult[]) => void;
  goToHub: () => void;
  reset: () => void;
  resetIssue: (issueId: string) => void;

  // Helpers
  getCurrentIssueProgress: () => IssueProgress | null;
  getIssueProgress: (issueId: string) => IssueProgress | null;
  getAllIssueProgress: () => Record<string, IssueProgress>;

  // Legacy compatibility (deprecated)
  issueTitle: string;
  questionText: string;
  topicId: string;
  quotesToEvaluate: Quote[];
  currentQuoteIndex: number;
  agreedQuotes: Quote[];
  disagreedQuotes: Quote[];
  rankedQuotes: RankedQuote[];
  badgeAssignments: BadgeAssignment;
  candidateMatches: MatchingResult[];
  setQuotes: (quotes: Quote[]) => void;
  setIssueInfo: (title: string, question: string, topicId: string) => void;
}

const createEmptyIssueProgress = (issueId: string): IssueProgress => ({
  issueId,
  phase: 'evaluation',
  quotesToEvaluate: [],
  currentQuoteIndex: 0,
  agreedQuotes: [],
  disagreedQuotes: [],
  rankedQuotes: [],
  badgeAssignments: { diamond: null, gold: null },
  candidateMatches: [],
  completed: false,
});

const initialState = {
  phase: 'hub' as Phase,
  currentIssueId: null as string | null,
  issueProgress: {} as Record<string, IssueProgress>,

  // Legacy flat state (derived from current issue)
  issueTitle: '',
  questionText: '',
  topicId: '',
  quotesToEvaluate: [] as Quote[],
  currentQuoteIndex: 0,
  agreedQuotes: [] as Quote[],
  disagreedQuotes: [] as Quote[],
  rankedQuotes: [] as RankedQuote[],
  badgeAssignments: { diamond: null, gold: null } as BadgeAssignment,
  candidateMatches: [] as MatchingResult[],
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
                  phase: phase as 'evaluation' | 'ranking' | 'results',
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

      selectIssue: (issueId, quotes, issueData) => {
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
          // Update legacy flat state
          issueTitle: issueData.title,
          questionText: issueData.question,
          topicId: issueId,
          quotesToEvaluate: progress.quotesToEvaluate,
          currentQuoteIndex: progress.currentQuoteIndex,
          agreedQuotes: progress.agreedQuotes,
          disagreedQuotes: progress.disagreedQuotes,
          rankedQuotes: progress.rankedQuotes,
          badgeAssignments: progress.badgeAssignments,
          candidateMatches: progress.candidateMatches,
        });
      },

      nextQuote: () => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const nextIndex = progress.currentQuoteIndex + 1;

        if (nextIndex >= progress.quotesToEvaluate.length) {
          // Move to ranking phase
          set({
            phase: 'ranking',
            currentQuoteIndex: nextIndex,
            issueProgress: {
              ...state.issueProgress,
              [issueId]: {
                ...progress,
                currentQuoteIndex: nextIndex,
                phase: 'ranking',
              },
            },
          });
        } else {
          set({
            currentQuoteIndex: nextIndex,
            issueProgress: {
              ...state.issueProgress,
              [issueId]: {
                ...progress,
                currentQuoteIndex: nextIndex,
              },
            },
          });
        }
      },

      agreeWithQuote: (quote) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const updatedAgreedQuotes = [...progress.agreedQuotes, quote];

        set({
          agreedQuotes: updatedAgreedQuotes,
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
          disagreedQuotes: updatedDisagreedQuotes,
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
          rankedQuotes: newRankedQuotes,
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
          rankedQuotes,
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
          agreedQuotes: quotes,
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              agreedQuotes: quotes,
            },
          },
        });
      },

      assignBadge: (quoteId: string, badge: BadgeType) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const newAssignments = { ...progress.badgeAssignments };

        if (badge === 'diamond' && newAssignments.diamond === quoteId) {
          newAssignments.diamond = null;
        } else if (badge === 'gold' && newAssignments.gold === quoteId) {
          newAssignments.gold = null;
        } else if (badge) {
          if (badge === 'diamond' && newAssignments.gold === quoteId) {
            newAssignments.gold = null;
          } else if (badge === 'gold' && newAssignments.diamond === quoteId) {
            newAssignments.diamond = null;
          }
          newAssignments[badge] = quoteId;
        }

        set({
          badgeAssignments: newAssignments,
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              badgeAssignments: newAssignments,
            },
          },
        });
      },

      clearBadge: (badge: 'diamond' | 'gold') => {
        const state = get();
        const issueId = state.currentIssueId;
        if (!issueId || !state.issueProgress[issueId]) return;

        const progress = state.issueProgress[issueId];
        const newAssignments = {
          ...progress.badgeAssignments,
          [badge]: null,
        };

        set({
          badgeAssignments: newAssignments,
          issueProgress: {
            ...state.issueProgress,
            [issueId]: {
              ...progress,
              badgeAssignments: newAssignments,
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
          candidateMatches: matches,
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

      // Legacy compatibility methods
      setQuotes: (quotes) => {
        const state = get();
        const issueId = state.currentIssueId;
        if (issueId && state.issueProgress[issueId]) {
          set({
            quotesToEvaluate: quotes,
            currentQuoteIndex: 0,
            agreedQuotes: [],
            disagreedQuotes: [],
            issueProgress: {
              ...state.issueProgress,
              [issueId]: {
                ...state.issueProgress[issueId],
                quotesToEvaluate: quotes,
                currentQuoteIndex: 0,
                agreedQuotes: [],
                disagreedQuotes: [],
              },
            },
          });
        } else {
          set({
            quotesToEvaluate: quotes,
            currentQuoteIndex: 0,
            agreedQuotes: [],
            disagreedQuotes: [],
          });
        }
      },

      setIssueInfo: (title, question, topicId) => set({
        issueTitle: title,
        questionText: question,
        topicId,
      }),
    }),
    {
      name: 'ev_readrank',
      version: 1,
      migrate: (persistedState, _version) => {
        // State shape is unchanged from readrank-storage; pass through
        return persistedState as ReadRankState
      },
      partialize: (state) => ({
        phase: state.phase,
        currentIssueId: state.currentIssueId,
        issueProgress: state.issueProgress,
        // Legacy fields for backwards compatibility
        agreedQuotes: state.agreedQuotes,
        disagreedQuotes: state.disagreedQuotes,
        rankedQuotes: state.rankedQuotes,
        badgeAssignments: state.badgeAssignments,
        issueTitle: state.issueTitle,
        questionText: state.questionText,
        topicId: state.topicId,
      }),
    }
  )
);
