import type { IssueProgress } from '../store/useReadRankStore';
import { apiFetch } from '../lib/auth';

export interface VerdictPayload {
  quote_id: string;
  verdict: 'agreed' | 'disagreed';
}

export function buildVerdictPayload(
  issueProgress: Record<string, IssueProgress>
): VerdictPayload[] {
  const map = new Map<string, 'agreed' | 'disagreed'>();

  for (const progress of Object.values(issueProgress)) {
    for (const quote of progress.rankedQuotes) {
      map.set(quote.id, 'agreed');
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
    const res = await apiFetch('/compass/verdicts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // If res is null, apiFetch handled the 401 redirect
    if (!res) return;
  } catch (err) {
    console.warn('Failed to sync verdicts to backend:', err);
  }
}
