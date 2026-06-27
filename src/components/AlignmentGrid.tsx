import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TIER_META } from '../utils/tiers';
import { TierIcon } from './TierIcon';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import type { AlignmentRow, AlignmentTopic } from '../utils/alignmentGrid';

export interface AlignmentGridProps {
  topics: AlignmentTopic[];
  rows: AlignmentRow[];
  /** When true, the frame settles in and medals pop cell-by-cell with a gleam. Default: static. */
  animate?: boolean;
  /** ms before the frame settles (reveal timeline). */
  frameDelayMs?: number;
  /** ms before the first medal pops (reveal timeline). */
  medalBaseDelayMs?: number;
  /** Candidate whose Diamond cell(s) glow as the #1 spotlight. */
  spotlightCandidateId?: string | null;
  /** When true, the spotlight glow is active (the #1 card has landed). */
  spotlightActive?: boolean;
}

/**
 * Candidates × topics tier grid (REDESIGN_SPEC §1.6) — the "true alignment"
 * artifact. Colorblind-safe: each cell is icon + sr-only tier name, never
 * color alone. In the reveal (`animate`) the grid assembles: frame settles,
 * then minted medals pop in one at a time with a metallic gleam.
 */
export const AlignmentGrid: React.FC<AlignmentGridProps> = ({
  topics, rows, animate = false, frameDelayMs = 0, medalBaseDelayMs = 0,
  spotlightCandidateId = null, spotlightActive = false,
}) => {
  const m = useMotion();
  const play = animate && !m.reduced;

  // Filled-cell order index (row-major) so medals pop in reading order.
  const cellOrder = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    rows.forEach((r, ri) => r.cells.forEach((c, ci) => { if (c) map.set(`${ri}:${ci}`, n++); }));
    return map;
  }, [rows]);

  if (rows.length === 0 || topics.length === 0) return null;

  return (
    <motion.div className="alignment-grid-wrap"
      initial={play ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={play ? { duration: DUR.base / 1000, ease: EASE.settle, delay: frameDelayMs / 1000 } : { duration: 0 }}>
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
          {rows.map((row, ri) => (
            <tr key={row.candidateId}>
              <th scope="row">{row.name}</th>
              {row.cells.map((tier, ci) => {
                const isSpotlight =
                  spotlightActive && tier === 'diamond' && row.candidateId === spotlightCandidateId;
                const order = cellOrder.get(`${ri}:${ci}`) ?? 0;
                const medalDelay = medalBaseDelayMs + order * STAGGER.gridCell;
                return (
                  <td key={topics[ci].key}
                    className={isSpotlight ? 'spotlight-diamond' : undefined}
                    title={tier ? TIER_META[tier].name : 'Not judged'}>
                    {tier ? (
                      <>
                        <motion.span style={{ display: 'inline-flex' }}
                          initial={play ? { scale: 0.4, opacity: 0 } : false}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={play
                            ? { duration: DUR.moderate / 1000, ease: EASE.overshoot, delay: medalDelay / 1000 }
                            : { duration: 0 }}>
                          <TierIcon tier={tier} size={28} gleam={play} gleamDelayMs={medalDelay + DUR.fast} />
                        </motion.span>
                        <span className="sr-only">{TIER_META[tier].name}</span>
                      </>
                    ) : (
                      <span aria-hidden="true" className="alignment-grid-empty">·</span>
                    )}
                    {!tier && <span className="sr-only">Not judged</span>}
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
