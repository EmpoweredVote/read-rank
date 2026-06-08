import type { VerdictRecord } from '../store/useReadRankStore';
import type { VerdictMap } from './verdictFragment';
import { apiFetch } from '../lib/auth';
import { evContext } from '@empoweredvote/ev-ui';

/**
 * Post rank-bearing verdicts to the API (new schema) and, when authed, mirror
 * a simple agreed/disagreed map into the userId-stamped ev-context authed slice
 * so other EV subdomains can hydrate this user's verdicts instantly.
 */
export async function postVerdicts(
  verdicts: VerdictRecord[],
  userId?: string | null
): Promise<void> {
  if (verdicts.length === 0) return;

  try {
    const res = await apiFetch('/compass/verdicts', {
      method: 'POST',
      body: JSON.stringify({ verdicts }),
    });
    if (!res || !res.ok) return;
    if (userId) {
      const map: VerdictMap = {};
      for (const v of verdicts) map[v.quote_id] = v.supported ? 'agreed' : 'disagreed';
      evContext.setAuthedSlice(userId, { verdicts: map }).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to sync verdicts to backend:', err);
  }
}

/**
 * Convert the ev-context guest verdict map (no rank) into the new schema so the
 * guest → authed promotion writer can persist it. Agreed verdicts get no rank
 * (rank is read-rank session state, not carried across apps).
 */
export function verdictMapToRecords(map: VerdictMap): VerdictRecord[] {
  const entries = Object.entries(map).filter(([, v]) => v === 'agreed' || v === 'disagreed');
  const sessionSize = entries.length;
  return entries.map(([quote_id, v]) => ({
    quote_id,
    supported: v === 'agreed',
    rank: null,
    session_size: sessionSize,
  }));
}

/**
 * Read this user's cached verdict map from the userId-stamped authed slice.
 * Returns null on miss / mismatch / broker error so callers fall back to the API.
 */
export async function loadVerdictsFromContext(userId: string): Promise<VerdictMap | null> {
  if (!userId) return null;
  try {
    const slice = await evContext.getAuthedSlice(userId);
    const v = slice && slice.verdicts;
    if (!v || typeof v !== 'object') return null;
    return v as VerdictMap;
  } catch {
    return null;
  }
}
