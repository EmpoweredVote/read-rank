import type { RaceProgress, TopicProgress } from '../store/useReadRankStore';

export type ProgressState = 'not-started' | 'in-progress' | 'partial' | 'complete';

export interface ProgressInfo {
  state: ProgressState;
  /** Scorable topics the user has fully judged. */
  doneTopics: number;
  /** Live scorable-topic count for the race (RaceSummary.rankableTopicCount). */
  liveScorableTopics: number;
  /** Scorable topics among the user's selection (for the "Continue · N of M" label). */
  selectedScorableTopics: number;
}

/** A topic is scorable when at least two distinct candidates have a quote in it. */
function isScorable(t: TopicProgress): boolean {
  const tokens = new Set(t.quotesToEvaluate.map((qn) => qn.candidateToken));
  return tokens.size > 1;
}

/** A topic is done when every quote in it has been judged (agree or disagree). */
function isDone(t: TopicProgress): boolean {
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
  const scorable = topics.filter(isScorable);
  const doneTopics = scorable.filter(isDone).length;

  const selectedKeys = progress.selectedTopicKeys ?? progress.topicOrder;
  const selectedScorableTopics = scorable.filter((t) => selectedKeys.includes(t.topicKey)).length;

  // When the live scorable count is unknown, fall back to the scorable topics we
  // can see in the user's own progress — never to total topicCount, which would
  // include non-scorable topics and wrongly hold a finished race in 'partial'.
  const live = Math.max(rankableTopicCount ?? scorable.length, 0);

  if (!progress.completed) {
    return { state: 'in-progress', doneTopics, liveScorableTopics: live, selectedScorableTopics };
  }
  const state: ProgressState = doneTopics >= live ? 'complete' : 'partial';
  return { state, doneTopics, liveScorableTopics: live, selectedScorableTopics };
}

/** The status label shown on a race tile, or null for no label.
 *  Pure + exhaustive over ProgressState so a new state can't silently fall through. */
export function progressLabel(info: ProgressInfo): string | null {
  switch (info.state) {
    case 'not-started':
      return null;
    case 'in-progress':
      // No scorable topics yet -> no "0 of 0" nonsense; show no label.
      if (info.selectedScorableTopics <= 0) return null;
      return info.doneTopics >= info.selectedScorableTopics
        ? 'Reveal your ballot'
        : `Continue · ${info.doneTopics} of ${info.selectedScorableTopics} topics`;
    case 'partial':
      return `Ranked ${info.doneTopics} of ${info.liveScorableTopics}`;
    case 'complete':
      return 'Completed';
  }
}
