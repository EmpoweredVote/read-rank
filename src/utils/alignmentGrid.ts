import { revealCardKey, type RevealResult } from '../data/api';
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
    // Keyed by CARD: `topics` columns are card keys, and two sections can share a
    // topicKey, so a topicKey map resolved both columns to whichever landed last.
    const byCard = new Map(entry.perTopic.map((t) => [revealCardKey(t), t]));
    const cells = topics.map((topic) => markForQuotes(byCard.get(topic.key)?.quotes ?? [], rankMap));
    return { candidateId: entry.candidateId, name: entry.name, cells };
  });
}
