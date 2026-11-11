import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import type { AlignmentMark } from '../utils/alignmentMarks';
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

/** Below this width the table always stacks (prototype: 560px). */
const STACK_BELOW_PX = 560;

const XMark: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const Check: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** One round mark. Colour-blind safe: number / check / cross / dash, each with a spoken label. */
export const GlanceMark: React.FC<{ mark: AlignmentMark }> = ({ mark }) => {
  if (mark == null) {
    // The candidate has no judged quote on this question: the spot stays blank.
    return <span className="glance-mark glance-mark--none" role="img" aria-label="No quote">–</span>;
  }
  if (mark.kind === 'rank') {
    return mark.rank === 1
      ? <span className="glance-mark glance-mark--top" role="img" aria-label="Your number 1 pick">1</span>
      : <span className="glance-mark glance-mark--rank" role="img" aria-label={`Agreed, ranked ${mark.rank}`}>{mark.rank}</span>;
  }
  if (mark.kind === 'agreed') {
    return <span className="glance-mark glance-mark--rank" role="img" aria-label="Agreed"><Check /></span>;
  }
  return <span className="glance-mark glance-mark--no" role="img" aria-label="Disagreed"><XMark /></span>;
};

/**
 * "Your alignment at a glance": a full-width candidates × topics table. When the
 * topic columns don't fit (or on phones), it stacks: each candidate becomes a row
 * of labelled tiles that wraps, so nothing ever scrolls sideways.
 */
export const AlignmentGrid: React.FC<AlignmentGridProps> = ({
  topics, rows, animate = false, frameDelayMs = 0, cellBaseDelayMs = 0,
}) => {
  const m = useMotion();
  const play = animate && !m.reduced;
  const wrapRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [stacked, setStacked] = useState(false);

  // Measure the table in its unstacked form; stack if it overflows the card.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const table = tableRef.current;
    if (!wrap || !table) return;
    const fit = () => {
      const narrow = window.innerWidth <= STACK_BELOW_PX;
      if (!wrap.clientWidth) { setStacked(narrow); return; } // not laid out yet
      table.classList.remove('glance-table--stacked');
      const next = narrow || table.scrollWidth > wrap.clientWidth + 1;
      table.classList.toggle('glance-table--stacked', next);
      setStacked(next);
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [topics.length, rows.length]);

  if (rows.length === 0 || topics.length === 0) return null;

  // Marks pop one after another, spread over about the same time whatever the table size.
  const step = Math.min(STAGGER.gridCell, (10 * STAGGER.gridCell) / Math.max(1, rows.length * topics.length));
  let cellIndex = 0;
  return (
    <motion.div className="glance-wrap" ref={wrapRef}
      initial={play ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={play ? { duration: DUR.base / 1000, ease: EASE.settle, delay: frameDelayMs / 1000 } : { duration: 0 }}>
      <table ref={tableRef} className={`glance-table${stacked ? ' glance-table--stacked' : ''}`}>
        <caption className="sr-only">Your alignment by candidate and topic. Each cell is what your ranking gave that candidate's quote.</caption>
        <thead>
          <tr>
            <th scope="col" className="glance-cand-col">Candidate</th>
            {topics.map((t) => (
              <th scope="col" key={t.key} className="glance-topic" title={t.title}>{t.title}</th>
            ))}
            <td className="glance-fill" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.candidateId}>
              <th scope="row">{row.name}</th>
              {row.cells.map((mark, ci) => {
                const delay = cellBaseDelayMs + cellIndex++ * step;
                return (
                  <td key={topics[ci].key} data-topic={topics[ci].title}>
                    <motion.span className="glance-pop"
                      initial={play ? { scale: 0, opacity: 0 } : false}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={play ? { duration: DUR.moderate / 1000, ease: EASE.overshoot, delay: delay / 1000 } : { duration: 0 }}>
                      <GlanceMark mark={mark} />
                    </motion.span>
                  </td>
                );
              })}
              <td className="glance-fill" aria-hidden="true" />
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
};
