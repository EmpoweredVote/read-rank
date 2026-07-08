import React from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import { AlignmentMarkView } from './AlignmentMark';
import type { AlignmentRow, AlignmentTopic } from '../utils/alignmentGrid';

export interface AlignmentGridProps {
  topics: AlignmentTopic[];
  rows: AlignmentRow[];
  /** When true, cells pop in one at a time on the reveal timeline. */
  animate?: boolean;
  /** ms before the frame settles. */
  frameDelayMs?: number;
  /** ms before the first cell pops. */
  cellBaseDelayMs?: number;
}

/**
 * Desktop candidates × topics matrix (spec §3). Colourblind-safe (icon + sr-only
 * label). Wide races scroll horizontally with the candidate column pinned and an
 * edge fade; the mobile alternative is AlignmentPills.
 */
export const AlignmentGrid: React.FC<AlignmentGridProps> = ({
  topics, rows, animate = false, frameDelayMs = 0, cellBaseDelayMs = 0,
}) => {
  const m = useMotion();
  const play = animate && !m.reduced;
  if (rows.length === 0 || topics.length === 0) return null;

  let cellIndex = 0;
  return (
    <motion.div className="alignment-grid-wrap"
      initial={play ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={play ? { duration: DUR.base / 1000, ease: EASE.settle, delay: frameDelayMs / 1000 } : { duration: 0 }}>
      <table className="alignment-grid">
        <caption className="sr-only">Your alignment by candidate and topic. Each cell is what your ranking gave that candidate's quote.</caption>
        <thead>
          <tr>
            <th scope="col" className="alignment-grid-corner">Candidate</th>
            {topics.map((t) => (
              <th scope="col" key={t.key}><span className="alignment-col-label">{t.title}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.candidateId}>
              <th scope="row">{row.name}</th>
              {row.cells.map((mark, ci) => {
                const order = cellIndex++;
                const delay = cellBaseDelayMs + order * STAGGER.gridCell;
                return (
                  <td key={topics[ci].key}>
                    <motion.span style={{ display: 'inline-flex' }}
                      initial={play ? { scale: 0.4, opacity: 0 } : false}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={play ? { duration: DUR.moderate / 1000, ease: EASE.overshoot, delay: delay / 1000 } : { duration: 0 }}>
                      <AlignmentMarkView mark={mark} size={22} />
                    </motion.span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};
