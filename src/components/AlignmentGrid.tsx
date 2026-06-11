import React from 'react';
import { TIER_META } from '../utils/tiers';
import { TierIcon } from './TierIcon';
import type { AlignmentRow, AlignmentTopic } from '../utils/alignmentGrid';

export interface AlignmentGridProps {
  topics: AlignmentTopic[];
  rows: AlignmentRow[];
}

/**
 * Candidates × topics tier grid (REDESIGN_SPEC §1.6) — the "true alignment"
 * artifact. Colorblind-safe: each cell is icon + sr-only tier name, never
 * color alone.
 */
export const AlignmentGrid: React.FC<AlignmentGridProps> = ({ topics, rows }) => {
  if (rows.length === 0 || topics.length === 0) return null;

  return (
    <div className="alignment-grid-wrap">
      <table className="alignment-grid">
        <caption className="sr-only">
          Your alignment by candidate and topic.&nbsp; Each cell is the tier your ranking gave
          that candidate's quote.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="alignment-grid-corner">Candidate</th>
            {topics.map((t) => (
              <th scope="col" key={t.key}>{t.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.candidateId}>
              <th scope="row">{row.name}</th>
              {row.cells.map((tier, i) => (
                <td key={topics[i].key} title={tier ? TIER_META[tier].name : 'Not judged'}>
                  {tier ? (
                    <>
                      <TierIcon tier={tier} size={16} />
                      <span className="sr-only">{TIER_META[tier].name}</span>
                    </>
                  ) : (
                    <span aria-hidden="true" className="alignment-grid-empty">·</span>
                  )}
                  {!tier && <span className="sr-only">Not judged</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
