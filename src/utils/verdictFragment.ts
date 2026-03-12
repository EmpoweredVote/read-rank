import type { IssueProgress } from '../store/useReadRankStore';

const ESSENTIALS_BASE =
  (import.meta.env as Record<string, string>).VITE_ESSENTIALS_URL ||
  'https://essentials.empowered.vote';

/**
 * Builds a verdict map from all issue progress across ALL issues.
 * rankedQuotes are a ranked subset of agreedQuotes — both map to 'agreed'.
 * Setting v[quote.id] twice with the same value is idempotent.
 * topicId, if provided, is encoded as `t` so Essentials can auto-open that accordion row.
 */
export function buildVerdictFragment(
  issueProgress: Record<string, IssueProgress>,
  topicId?: string
): string {
  const v: Record<string, 'agreed' | 'disagreed'> = {};
  for (const progress of Object.values(issueProgress)) {
    for (const quote of progress.agreedQuotes) {
      v[quote.id] = 'agreed';
    }
    for (const quote of progress.rankedQuotes) {
      v[quote.id] = 'agreed'; // rankedQuotes is a subset of agreed; assignment is idempotent
    }
    for (const quote of progress.disagreedQuotes) {
      v[quote.id] = 'disagreed';
    }
  }
  const payload: Record<string, unknown> = { v };
  if (topicId) payload.t = topicId;
  return `#compass=${btoa(JSON.stringify(payload))}`;
}

/**
 * Builds a full Essentials profile URL for a politician with the verdict fragment.
 * candidateId is the politician UUID (same value as Essentials route param).
 * topicId, if provided, is encoded in the fragment so Essentials auto-opens that topic row.
 */
export function buildEssentialsProfileUrl(
  candidateId: string,
  issueProgress: Record<string, IssueProgress>,
  topicId?: string
): string {
  const fragment = buildVerdictFragment(issueProgress, topicId);
  return `${ESSENTIALS_BASE}/politician/${candidateId}${fragment}`;
}
