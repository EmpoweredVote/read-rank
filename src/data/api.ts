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
    const res = await fetch(`${API_BASE}/essentials/politicians/search`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const status = res.headers.get('X-Data-Status') || res.headers.get('x-data-status') || '';
    const formattedAddress = res.headers.get('X-Formatted-Address') || res.headers.get('x-formatted-address') || '';
    if (!res.ok) {
      return { status: 'error', data: [], error: `${res.status} ${res.statusText}`, formattedAddress: '' };
    }
    const data: SearchPolitician[] = await res.json();
    return { status: status || 'fresh', data, formattedAddress };
  } catch (error) {
    return { status: 'error', data: [], error: (error as Error).message, formattedAddress: '' };
  }
}
