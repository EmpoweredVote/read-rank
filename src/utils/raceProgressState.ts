import type { RaceProgress, TopicProgress } from '../store/useReadRankStore';

export type ProgressState = 'not-started' | 'in-progress' | 'partial' | 'complete';

export interface ProgressInfo {
  state: ProgressState;
  /** Scorable topics the user has fully judged. */
  doneTopics: number;
  /** Live scorable-topic count for the race (RaceSummary.rankableTopicCount). */
  liveScorableTopics: number;
  /** Scorable topics among the user's selection (kept for callers/analytics). */
  selectedScorableTopics: number;
}

/** A topic is scorable when at least two distinct candidates have a quote in it. */
export function isTopicScorable(t: TopicProgress): boolean {
  const tokens = new Set(t.quotesToEvaluate.map((qn) => qn.candidateToken));
  return tokens.size > 1;
}

/** A topic is done when every quote in it has been judged (agree or disagree). */
export function isTopicDone(t: TopicProgress): boolean {
  const total = t.quotesToEvaluate.length;
  return total > 0 && t.agreed.length + t.disagreed.length >= total;
}

export function deriveProgressState(
  progress: RaceProgress | undefined,
  rankableTopicCount?: number,
): ProgressInfo {
  if (!progress) {
    const live = Math.max(rankableTopicCount ?? 0, 0);
    return { state: 'not-started', doneTopics: 0, liveScorableTopics: live, selectedScorableTopics: live };
  }

  const topics = Object.values(progress.topics);
  const scorable = topics.filter(isTopicScorable);
  const doneTopics = scorable.filter(isTopicDone).length;

  const selectedKeys = progress.selectedTopicKeys ?? progress.topicOrder;
  const selectedScorableTopics = scorable.filter((t) => selectedKeys.includes(t.topicKey)).length;

  // When the live scorable count is unknown, fall back to the scorable topics we
  // can see in the user's own progress — never total topicCount, which would
  // include non-scorable topics.
  const live = Math.max(rankableTopicCount ?? scorable.length, 0);

  // Completion is DERIVED from topics, not from any persisted `completed` flag —
  // revealing a ballot no longer marks the race done, and stale completed:true
  // data self-heals to in-progress.
  if (live > 0 && doneTopics >= live) {
    return { state: 'complete', doneTopics, liveScorableTopics: live, selectedScorableTopics };
  }
  return { state: 'in-progress', doneTopics, liveScorableTopics: live, selectedScorableTopics };
}

/** True when every live rankable topic in the race is done. */
export function isRaceComplete(
  progress: RaceProgress | undefined,
  rankableTopicCount?: number,
): boolean {
  return deriveProgressState(progress, rankableTopicCount).state === 'complete';
}

/** The status label shown on a race tile, or null for no label.
 *  Pure + exhaustive over ProgressState. */
export function progressLabel(info: ProgressInfo): string | null {
  switch (info.state) {
    case 'not-started':
      return null;
    case 'in-progress':
      // No rankable topics yet -> no "0 of 0" nonsense; show no label.
      if (info.liveScorableTopics <= 0) return null;
      return `Continue · ${info.doneTopics} of ${info.liveScorableTopics} topics`;
    case 'partial':
      // Legacy state — deriveProgressState no longer produces it. Kept exhaustive.
      return `Ranked ${info.doneTopics} of ${info.liveScorableTopics}`;
    case 'complete':
      return 'Completed';
  }
}

/** Derive both the tile's progress state and its label in one call (used by the
 *  hub and browse card lists so their derivation can't drift). */
export function raceCardProgress(
  progress: RaceProgress | undefined,
  rankableTopicCount?: number,
): { progress: ProgressState; label: string | null } {
  const info = deriveProgressState(progress, rankableTopicCount);
  return { progress: info.state, label: progressLabel(info) };
}
