import type { Quote, RankedQuote, Candidate, MatchingResult, BadgeAssignment } from '../store/useReadRankStore';

interface QuoteCandidateMap {
  [quoteId: string]: string; // quoteId -> candidateId
}

// Badge-based scoring: Diamond = 5, Gold = 3, Others = 1
const BADGE_POINTS = {
  diamond: 5,
  gold: 3,
  none: 1,
};

/**
 * Shuffle an array randomly using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate alignment between user badge assignments and candidate responses
 * Scoring: Diamond = 5 points, Gold = 3 points, Other agreed quotes = 1 point
 */
export function calculateAlignment(
  rankedQuotes: RankedQuote[],
  quoteCandidateMap: QuoteCandidateMap,
  candidates: Candidate[],
  badgeAssignments?: BadgeAssignment
): MatchingResult[] {
  // Helper to get points for a quote based on badge assignment
  const getPointsForQuote = (quoteId: string): number => {
    if (badgeAssignments?.diamond === quoteId) return BADGE_POINTS.diamond;
    if (badgeAssignments?.gold === quoteId) return BADGE_POINTS.gold;
    return BADGE_POINTS.none;
  };

  // Group quotes by candidate
  const candidatePoints: { [candidateId: string]: number } = {};
  const candidateQuoteMatches: { [candidateId: string]: Array<{ userRank: number; quoteId: string; points: number; badge?: string }> } = {};

  // Initialize candidate tracking
  candidates.forEach(candidate => {
    candidatePoints[candidate.id] = 0;
    candidateQuoteMatches[candidate.id] = [];
  });

  // Calculate points for each quote based on badges
  rankedQuotes.forEach((rankedQuote, index) => {
    const candidateId = quoteCandidateMap[rankedQuote.id];
    if (candidateId && candidatePoints.hasOwnProperty(candidateId)) {
      const points = getPointsForQuote(rankedQuote.id);
      candidatePoints[candidateId] += points;

      // Determine badge type for this quote
      let badge: string | undefined;
      if (badgeAssignments?.diamond === rankedQuote.id) badge = 'diamond';
      else if (badgeAssignments?.gold === rankedQuote.id) badge = 'gold';

      candidateQuoteMatches[candidateId].push({
        userRank: index + 1,
        quoteId: rankedQuote.id,
        points,
        badge
      });
    }
  });

  // Calculate maximum possible points
  // Max = diamond (5) + gold (3) + remaining quotes at 1 point each
  const numQuotes = rankedQuotes.length;
  let maxPossiblePoints = numQuotes; // All quotes worth 1 point base
  if (numQuotes >= 1) maxPossiblePoints += (BADGE_POINTS.diamond - 1); // Diamond adds 4 extra
  if (numQuotes >= 2) maxPossiblePoints += (BADGE_POINTS.gold - 1); // Gold adds 2 extra

  // Create results for all candidates
  const results: MatchingResult[] = candidates.map(candidate => {
    const points = candidatePoints[candidate.id] || 0;
    const alignmentPercent = maxPossiblePoints > 0 ? Math.round((points / maxPossiblePoints) * 100) : 0;
    const issuesAligned = candidateQuoteMatches[candidate.id].length;

    return {
      candidateId: candidate.id,
      name: candidate.name,
      party: candidate.party,
      office: candidate.office,
      photo: candidate.photo,
      alignmentPercent,
      issuesAligned,
      totalIssues: rankedQuotes.length,
      rankedQuoteMatches: candidateQuoteMatches[candidate.id]
    };
  });

  // Sort by alignment percentage (descending)
  return results.sort((a, b) => b.alignmentPercent - a.alignmentPercent);
}

/**
 * Create quote to candidate mapping from quotes array
 */
export function createQuoteCandidateMap(quotes: Quote[]): QuoteCandidateMap {
  const map: QuoteCandidateMap = {};
  quotes.forEach(quote => {
    if (quote.candidateId) {
      map[quote.id] = quote.candidateId;
    }
  });
  return map;
}

/**
 * Simulate API call with loading delay
 */
export async function fetchMatchingResults(
  rankedQuotes: RankedQuote[],
  allQuotes: Quote[],
  candidates: Candidate[],
  badgeAssignments?: BadgeAssignment
): Promise<MatchingResult[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const quoteCandidateMap = createQuoteCandidateMap(allQuotes);
  return calculateAlignment(rankedQuotes, quoteCandidateMap, candidates, badgeAssignments);
}

/**
 * Generate mock candidate data with realistic alignment scores
 */
export function generateMockCandidatesForRanking(rankedQuotes: RankedQuote[], baseCandidates: Candidate[]): Candidate[] {
  // Create a more realistic distribution based on ranking
  const shuffled = [...baseCandidates].sort(() => Math.random() - 0.5);
  
  return shuffled.map((candidate, index) => {
    // Calculate alignment based on position in ranked quotes
    const alignmentBase = Math.max(30, 95 - (index * 8));
    const randomVariation = Math.floor(Math.random() * 20) - 10; // ±10 variation
    const alignmentPercent = Math.max(20, Math.min(95, alignmentBase + randomVariation));
    
    return {
      ...candidate,
      alignmentPercent,
      issuesAligned: Math.floor(Math.random() * rankedQuotes.length) + 1,
      totalIssues: rankedQuotes.length
    };
  });
}