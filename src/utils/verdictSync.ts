import type { IssueProgress } from '../store/useReadRankStore';

const API_BASE = (import.meta.env as Record<string, string>).VITE_API_URL
  || 'https://api.empowered.vote';

export interface VerdictPayload {
  quote_id: string;
  verdict: 'agreed' | 'disagreed';
}

export function buildVerdictPayload(
  issueProgress: Record<string, IssueProgress>
): VerdictPayload[] {
  const map = new Map<string, 'agreed' | 'disagreed'>();

  for (const progress of Object.values(issueProgress)) {
    for (const quote of progress.agreedQuotes) {
      map.set(quote.id, 'agreed');
    }
    for (const quote of progress.rankedQuotes) {
      map.set(quote.id, 'agreed'); // rankedQuotes is a subset of agreed; idempotent
    }
    for (const quote of progress.disagreedQuotes) {
      map.set(quote.id, 'disagreed');
    }
  }

  return Array.from(map.entries()).map(([quote_id, verdict]) => ({ quote_id, verdict }));
}

export async function postVerdicts(
  issueProgress: Record<string, IssueProgress>
): Promise<void> {
  const payload = buildVerdictPayload(issueProgress);
  if (payload.length === 0) return;

  try {
    await fetch(`${API_BASE}/compass/verdicts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Failed to sync verdicts to backend:', err);
  }
}
