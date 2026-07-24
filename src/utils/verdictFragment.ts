import { deriveRanks } from './deriveRanks';
import type { TopicProgress, VerdictRecord } from '../store/useReadRankStore';

export type VerdictMap = Record<string, 'agreed' | 'disagreed'>;

/**
 * Pure per-topic verdict assembly. Ranks come from `deriveRanks` (ties share a
 * rank, quotes beyond `rankedCount` are unranked) rather than array index, so
 * the ties/truncation the user set on the agreed pile survive into the
 * records sent to the backend. `sessionSize` is race-wide (all agreed +
 * disagreed across every topic) so it's threaded in rather than computed here
 * — a single topic doesn't know the race total.
 */
export function buildVerdictsForTopic(topic: TopicProgress, sessionSize: number): VerdictRecord[] {
  const ids = topic.agreed.map((q) => q.id);
  const ties = topic.agreed.map((q) => !!q.tieWithPrev);
  const rankedCount = topic.rankedCount ?? topic.agreed.length;
  const rankMap = deriveRanks(ids, ties, rankedCount);

  const agreed: VerdictRecord[] = topic.agreed.map((q) => ({
    quote_id: q.id,
    supported: true,
    rank: rankMap.get(q.id) ?? null,
    session_size: sessionSize,
  }));
  const disagreed: VerdictRecord[] = topic.disagreed.map((q) => ({
    quote_id: q.id,
    supported: false,
    rank: null,
    session_size: sessionSize,
  }));
  return [...agreed, ...disagreed];
}

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
