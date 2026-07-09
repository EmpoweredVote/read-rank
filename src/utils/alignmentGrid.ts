import type { RevealResult } from '../data/api';
import { markForQuotes, type AlignmentMark } from './alignmentMarks';

export interface AlignmentTopic {
  key: string;
  title: string;
}

export interface AlignmentRow {
  candidateId: string;
  name: string;
  cells: AlignmentMark[];
}

/**
 * Candidates × topics marks (spec §3). Each cell is the mark the user's verdict
 * gave that candidate's quote on that topic: a rank number (1-3), an agreed
 * check, a disagreed cross, or null when nothing was judged.
 */
export function buildAlignmentGrid(
  reveal: RevealResult,
  topics: AlignmentTopic[],
  rankMap: Map<string, number>
): AlignmentRow[] {
  return reveal.ballot.map((entry) => {
    const byTopic = new Map(entry.perTopic.map((t) => [t.topicKey, t]));
    const cells = topics.map((topic) => markForQuotes(byTopic.get(topic.key)?.quotes ?? [], rankMap));
    return { candidateId: entry.candidateId, name: entry.name, cells };
  });
}
