import type { Quote, Candidate, IssueData } from '../store/useReadRankStore';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.empowered.vote';

interface QuotesResponse {
  quotes: Quote[];
  candidates: Candidate[];
  issues: IssueData[];
}

let cachedData: QuotesResponse | null = null;

export async function fetchQuotesData(): Promise<QuotesResponse> {
  if (cachedData) return cachedData;

  try {
    const res = await fetch(`${API_BASE}/essentials/quotes`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: QuotesResponse = await res.json();
    cachedData = data;
    return data;
  } catch (err) {
    console.error('Failed to fetch quotes from API, falling back to mock data', err);
    // Fallback to mock data for offline/dev use
    const { allIssues, mockQuotes, mockCandidates } = await import('./mockData');
    return {
      quotes: mockQuotes,
      candidates: mockCandidates,
      issues: allIssues,
    };
  }
}

export function getQuotesForIssue(quotes: Quote[], issueId: string): Quote[] {
  return quotes.filter(q => q.issue === issueId);
}

export function getCandidateById(candidates: Candidate[], id: string): Candidate | undefined {
  return candidates.find(c => c.id === id);
}
