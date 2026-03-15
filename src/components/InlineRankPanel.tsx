import React from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore, type RankedQuote } from '../store/useReadRankStore';

const RANK_COLORS = ['#00657c', '#ff5740', '#59b0c4', '#94a3b8', '#64748b'];
const RANK_LABELS = ['CHAMPION', 'CHALLENGER', '3RD', '4TH', '5TH'];

interface RankSlotCompactProps {
  quote: RankedQuote;
  rank: number;
  wins: number;
}

const RankSlotCompact: React.FC<RankSlotCompactProps> = ({ quote, rank, wins }) => {
  const rankIndex = Math.min(rank - 1, RANK_COLORS.length - 1);
  const color = RANK_COLORS[rankIndex];
  const label = RANK_LABELS[rankIndex] ?? `#${rank}`;

  return (
    <motion.div
      layout
      layoutId={`inline-rank-slot-${quote.id}`}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        borderLeft: `3px solid ${color}`,
        background: `linear-gradient(90deg, ${color}0f 0%, transparent 100%)`,
        borderRadius: '0 6px 6px 0',
        padding: '0.5rem 0.625rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-start',
      }}
    >
      {/* Rank number */}
      <div style={{
        fontFamily: "'Manrope', sans-serif",
        fontWeight: 800,
        fontSize: '0.875rem',
        color,
        lineHeight: 1,
        minWidth: '1.125rem',
        flexShrink: 0,
        paddingTop: '1px',
      }}>
        {rank}
      </div>

      {/* Quote text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 600,
          fontSize: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color,
          marginBottom: '0.1875rem',
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 400,
          fontSize: '0.6875rem',
          lineHeight: 1.5,
          color: '#2d2d44',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {quote.text}
        </div>
      </div>

      {/* Wins badge */}
      <div style={{
        fontFamily: "'Manrope', sans-serif",
        fontWeight: 800,
        fontSize: '0.8125rem',
        color,
        flexShrink: 0,
        lineHeight: 1,
        paddingTop: '1px',
      }}>
        {wins}W
      </div>
    </motion.div>
  );
};

interface InlineRankPanelProps {
  onDismiss: () => void;
}

export const InlineRankPanel: React.FC<InlineRankPanelProps> = ({ onDismiss }) => {
  const { getCurrentIssueProgress } = useReadRankStore();

  const progress = getCurrentIssueProgress();
  const rankedQuotes = progress?.rankedQuotes ?? [];
  const matchupWins = progress?.matchupWins ?? {};

  return (
    <div className="inline-rank-panel">
      {/* Title */}
      <p style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#2d2d44',
        marginBottom: '0.75rem',
        marginTop: 0,
      }}>
        Your Ranking
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {rankedQuotes.map((quote) => (
          <RankSlotCompact
            key={quote.id}
            quote={quote}
            rank={quote.rank}
            wins={matchupWins[quote.id] ?? 0}
          />
        ))}
      </div>

      {/* Continue button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
        <button
          onClick={onDismiss}
          className="ev-button-secondary"
          style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
