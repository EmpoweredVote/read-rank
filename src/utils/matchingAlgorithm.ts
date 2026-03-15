import type { Quote, RankedQuote, Candidate, MatchingResult } from '../store/useReadRankStore';

interface QuoteCandidateMap {
  [quoteId: string]: string; // quoteId -> candidateId
}

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
 * Calculate alignment between user rank positions and candidate responses.
 * Scoring: rank 1 gets N points, rank 2 gets N-1, ..., rank N gets 1 point.
 * maxPossiblePoints = N * (N + 1) / 2 (triangular sum).
 */
export function calculateAlignment(
  rankedQuotes: RankedQuote[],
  quoteCandidateMap: QuoteCandidateMap,
  candidates: Candidate[]
): MatchingResult[] {
  const totalQuotes = rankedQuotes.length;

  // Group quotes by candidate
  const candidatePoints: { [candidateId: string]: number } = {};
  const candidateQuoteMatches: { [candidateId: string]: Array<{ userRank: number; quoteId: string; points: number }> } = {};

  // Initialize candidate tracking
  candidates.forEach(candidate => {
    candidatePoints[candidate.id] = 0;
    candidateQuoteMatches[candidate.id] = [];
  });

  // Score by rank position: rank 1 (index 0) gets totalQuotes points, rank N gets 1 point
  rankedQuotes.forEach((rankedQuote, index) => {
    const candidateId = quoteCandidateMap[rankedQuote.id];
    if (candidateId && Object.prototype.hasOwnProperty.call(candidatePoints, candidateId)) {
      const points = totalQuotes - index; // rank 1 = totalQuotes, rank N = 1
      candidatePoints[candidateId] += points;

      candidateQuoteMatches[candidateId].push({
        userRank: index + 1,
        quoteId: rankedQuote.id,
        points,
      });
    }
  });

  // Maximum possible points = triangular sum: N * (N + 1) / 2
  const maxPossiblePoints = totalQuotes * (totalQuotes + 1) / 2;

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
      rankedQuoteMatches: candidateQuoteMatches[candidate.id],
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
  candidates: Candidate[]
): Promise<MatchingResult[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const quoteCandidateMap = createQuoteCandidateMap(allQuotes);
  return calculateAlignment(rankedQuotes, quoteCandidateMap, candidates);
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
