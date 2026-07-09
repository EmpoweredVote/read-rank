import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR } from '../motion';
import type { BallotEntry } from '../data/api';
import { countTopPicks } from '../utils/alignmentMarks';
import { PoliticianIdentityCard } from './PoliticianIdentityCard';
import { QuoteDrawer } from './QuoteDrawer';
import { RankNumber } from './RankNumber';
import { track } from '../lib/analytics';

export interface CandidateBallotCardProps {
  entry: BallotEntry;
  /** Denominator for "agreed with X of Y". */
  totalTopics: number;
  /** quoteId → per-topic rank; drives the "N top picks" count and the drawer. */
  rankMap: Map<string, number>;
  /** True when this entry shares its rank with another. */
  tied?: boolean;
  /** ms delay for the reveal cascade. */
  landDelayMs?: number;
}

interface Particle { dx: number; dy: number; size: number; delay: number; isLarge: boolean; }

/** Celebratory burst on the #1 card — the one earned celebration (spec §7). */
const MegaParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const ref = useRef<Particle[]>([]);
  if (ref.current.length === 0) {
    ref.current = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360;
      const dist = 40 + ((i * 37) % 70);
      return {
        dx: Math.cos((angle * Math.PI) / 180) * dist,
        dy: Math.sin((angle * Math.PI) / 180) * dist,
        size: 2 + ((i * 13) % 5), delay: (i % 5) * 0.03, isLarge: i % 4 === 0,
      };
    });
  }
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: -20, pointerEvents: 'none', zIndex: 20 }}>
      {ref.current.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', width: p.isLarge ? p.size * 2 : p.size, height: p.isLarge ? p.size * 2 : p.size,
          borderRadius: '50%',
          background: p.isLarge ? 'radial-gradient(circle, var(--color-ev-coral), transparent)' : 'var(--color-ev-coral)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          animation: `megaBurst var(--dur-burst) ${p.delay}s var(--ease-burst) forwards`,
          ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`,
          opacity: 0.9, filter: p.isLarge ? 'blur(1px)' : 'none',
        }} />
      ))}
    </div>
  );
};

/** rank number + identity card + summary strip + quote drawer (spec §4-5). The
 *  identity card is fixed height; only the drawer grows, so the photo never stretches. */
export const CandidateBallotCard: React.FC<CandidateBallotCardProps> = ({
  entry, totalTopics, rankMap, tied = false, landDelayMs = 0,
}) => {
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const m = useMotion();
  const { agreementCount } = entry.evidence;
  const topPicks = countTopPicks(entry.perTopic.flatMap((t) => t.quotes), rankMap);

  // #1 celebration: fire the burst once the card has landed (wall-clock timer so it
  // survives the preview rAF throttle, matching the old ResultsPhase behaviour).
  useEffect(() => {
    if (m.reduced || entry.rank !== 1) return;
    const on = setTimeout(() => setBurst(true), landDelayMs);
    const off = setTimeout(() => setBurst(false), landDelayMs + DUR.burst + 200);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [m.reduced, entry.rank, landDelayMs]);

  return (
    <motion.div className="ballot-row"
      initial={m.reduced ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={m.transition(DUR.moderate, EASE.settle, { delay: landDelayMs / 1000 })}>
      {!m.reduced && entry.rank === 1 && <MegaParticles active={burst} />}
      <div className="ballot-rankcol">
        <RankNumber rank={entry.rank} size={28} />
        <span className="sr-only">Ranked {entry.rank}{tied ? ', tied' : ''}</span>
        {tied && <span className="ballot-tie">Tied</span>}
      </div>

      <div className="ballot-outer">
        <PoliticianIdentityCard
          name={entry.name} photo={entry.photo} essentialsUrl={entry.essentialsUrl}
          office={entry.office} title={entry.title} chamber={entry.chamber} district={entry.district}
          onEssentialsClick={() => track('readrank_essentials_link_clicked', { candidate_id: entry.candidateId, rank: entry.rank })} />

        <div className="ballot-strip">
          <p className="ballot-evidence">
            Agreed with <strong>{agreementCount} of {totalTopics}</strong>
            {topPicks > 0 && (
              <> · <span className="ballot-topk">{topPicks} top pick{topPicks === 1 ? '' : 's'}</span></>
            )}
          </p>
          {entry.perTopic.length > 0 && (
            <button type="button" className="ballot-toggle"
              aria-expanded={open}
              onClick={() => {
                setOpen((o) => {
                  if (!o) track('readrank_candidate_details_expanded', { candidate_id: entry.candidateId, rank: entry.rank });
                  return !o;
                });
              }}>
              {open ? 'Hide quotes' : 'See what they said'}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}
        </div>

        {open && <QuoteDrawer entry={entry} rankMap={rankMap} />}
      </div>
    </motion.div>
  );
};
