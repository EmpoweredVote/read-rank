import React from 'react';
import type { RevealResult } from '../data/api';
import type { AlignmentTopic } from '../utils/alignmentGrid';
import { markForQuotes, markStrength } from '../utils/alignmentMarks';
import { AlignmentMarkView } from './AlignmentMark';

export interface AlignmentPillsProps {
  reveal: RevealResult;
  topics: AlignmentTopic[];
  rankMap: Map<string, number>;
}

/**
 * Mobile alternative to the matrix (spec §3): per-candidate mark pills that wrap
 * instead of scrolling. Pills are sorted strongest-first so density signals strength.
 */
export const AlignmentPills: React.FC<AlignmentPillsProps> = ({ reveal, topics, rankMap }) => {
  const titleByKey = new Map(topics.map((t) => [t.key, t.title]));
  return (
    <div className="pills-wrap">
      {reveal.ballot.map((entry) => {
        const byTopic = new Map(entry.perTopic.map((t) => [t.topicKey, t]));
        const pills = topics
          .map((t) => ({ key: t.key, title: titleByKey.get(t.key) ?? t.title, mark: markForQuotes(byTopic.get(t.key)?.quotes ?? [], rankMap) }))
          .filter((p) => p.mark != null)
          .sort((a, b) => markStrength(a.mark) - markStrength(b.mark));
        return (
          <div key={entry.candidateId} className="pills-candidate">
            <p className="pills-name">{entry.name}</p>
            <div className="pills-row">
              {pills.map((p) => (
                <span key={p.key} className={`pill ${p.mark?.kind === 'disagreed' ? 'pill-dis' : ''}`}>
                  <AlignmentMarkView mark={p.mark} size={17} />
                  <span data-testid="pill-topic">{p.title}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
