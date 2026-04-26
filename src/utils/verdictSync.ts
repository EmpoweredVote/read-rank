import type { IssueProgress } from '../store/useReadRankStore';
import { apiFetch } from '../lib/auth';
import { evContext } from '@empoweredvote/ev-ui';

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

/**
 * Post verdicts to the API and, when authed, mirror the verdict map into the
 * userId-stamped ev-context authed slice (260426-mc5) so other EV subdomains
 * can hydrate this user's verdicts instantly via SWR before /compass/verdicts
 * resolves.
 */
export async function postVerdicts(
  issueProgress: Record<string, IssueProgress>,
  userId?: string | null
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
    if (!res.ok) return;
    // Mirror to authed slice on success — only when userId is known.
    if (userId) {
      const verdictMap: Record<string, 'agreed' | 'disagreed'> = {};
      for (const v of payload) verdictMap[v.quote_id] = v.verdict;
      evContext.setAuthedSlice(userId, { verdicts: verdictMap }).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to sync verdicts to backend:', err);
  }
}

/**
 * Read this user's cached verdict map from the userId-stamped authed slice
 * (260426-mc5). Returns null on miss / mismatch / broker error so callers can
 * fall back to the API.
 */
export async function loadVerdictsFromContext(
  userId: string
): Promise<Record<string, 'agreed' | 'disagreed'> | null> {
  if (!userId) return null;
  try {
    const slice = await evContext.getAuthedSlice(userId);
    const v = slice && slice.verdicts;
    if (!v || typeof v !== 'object') return null;
    return v as Record<string, 'agreed' | 'disagreed'>;
  } catch {
    return null;
  }
}
