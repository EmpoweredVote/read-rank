export type VerdictMap = Record<string, 'agreed' | 'disagreed'>;

const ESSENTIALS_BASE =
  (import.meta.env as Record<string, string>).VITE_ESSENTIALS_URL ||
  'https://essentials.empowered.vote';

/**
 * Builds the `#compass=` fragment Essentials reads to highlight the user's
 * verdicts. topicKey, if provided, is encoded as `t` so Essentials can
 * auto-open that accordion row.
 */
export function buildVerdictFragment(verdicts: VerdictMap, topicKey?: string): string {
  const payload: Record<string, unknown> = { v: verdicts };
  if (topicKey) payload.t = topicKey;
  return `#compass=${btoa(JSON.stringify(payload))}`;
}

/**
 * Full Essentials profile URL for a candidate with the verdict fragment.
 * candidateId is the politician UUID (same value as Essentials' route param).
 */
export function buildEssentialsProfileUrl(
  candidateId: string,
  verdicts: VerdictMap,
  topicKey?: string,
  address?: string
): string {
  const fragment = buildVerdictFragment(verdicts, topicKey);
  const query = address ? `?q=${encodeURIComponent(address)}` : '';
  return `${ESSENTIALS_BASE}/politician/${candidateId}${query}${fragment}`;
}
