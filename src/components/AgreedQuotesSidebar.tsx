import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore, type RankedQuote } from '../store/useReadRankStore';

const RANK_COLORS = ['#00657c', '#ff5740', '#59b0c4', '#94a3b8', '#64748b'];
const RANK_LABELS = ['CHAMPION', 'CHALLENGER', '3RD', '4TH', '5TH'];

interface RankSlotProps {
  quote: RankedQuote;
  rank: number;
  wins: number;
  isNew: boolean;
}

const RankSlot: React.FC<RankSlotProps> = ({ quote, rank, wins, isNew }) => {
  const rankIndex = Math.min(rank - 1, RANK_COLORS.length - 1);
  const color = RANK_COLORS[rankIndex];
  const label = RANK_LABELS[rankIndex] ?? `#${rank}`;

  return (
    <motion.div
      layout
      layoutId={`rank-slot-${quote.id}`}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        animation: isNew ? 'rankSlam 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards' : undefined,
        borderLeft: `3px solid ${color}`,
        background: `linear-gradient(90deg, ${color}0f 0%, transparent 100%)`,
        borderRadius: '0 8px 8px 0',
        padding: '0.625rem 0.75rem',
        display: 'flex',
        gap: '0.625rem',
        alignItems: 'flex-start',
      }}
    >
      {/* Rank number */}
      <div style={{
        fontFamily: "'Manrope', sans-serif",
        fontWeight: 800,
        fontSize: '1rem',
        color,
        lineHeight: 1,
        minWidth: '1.25rem',
        flexShrink: 0,
        paddingTop: '2px',
      }}>
        {rank}
      </div>

      {/* Quote text */}
      <div style={{
        flex: 1,
        minWidth: 0,
      }}>
        <div style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 600,
          fontSize: '0.5625rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color,
          marginBottom: '0.25rem',
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
        fontSize: '0.875rem',
        color,
        flexShrink: 0,
        lineHeight: 1,
        paddingTop: '2px',
      }}>
        {wins}W
      </div>
    </motion.div>
  );
};

export const RankedListSidebar: React.FC = () => {
  const { getCurrentIssueProgress } = useReadRankStore();

  const progress = getCurrentIssueProgress();
  const rankedQuotes = progress?.rankedQuotes ?? [];
  const matchupWins = progress?.matchupWins ?? {};
  const disagreedQuotes = progress?.disagreedQuotes ?? [];

  const [lastLandedId, setLastLandedId] = useState<string | null>(null);
  const prevLengthRef = React.useRef(rankedQuotes.length);

  useEffect(() => {
    if (rankedQuotes.length > prevLengthRef.current) {
      // The newest entry is the one just added (last in the array before reranking)
      const newest = rankedQuotes[rankedQuotes.length - 1];
      if (newest) {
        setLastLandedId(newest.id);
        setTimeout(() => setLastLandedId(null), 600);
      }
    }
    prevLengthRef.current = rankedQuotes.length;
  }, [rankedQuotes.length]);

  return (
    <div className="agreed-quotes-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <span style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 700,
          fontSize: '0.625rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#94a3b8',
        }}>
          Leaderboard
        </span>
        {rankedQuotes.length > 0 && (
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700,
            fontSize: '0.625rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#00657c',
            backgroundColor: 'rgba(0, 101, 124, 0.08)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}>
            {rankedQuotes.length} Ranked
          </span>
        )}
      </div>

      <div className="sidebar-quotes-list" style={{ overflowY: 'auto', maxHeight: '60vh', gap: '0.375rem' }}>
        {rankedQuotes.length === 0 ? (
          <div className="sidebar-empty-state" style={{
            border: '1.5px dashed #e8e2d9',
            borderRadius: '8px',
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4cdc3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
              <path d="M13 19l6-6" />
              <path d="M14 2L2 14" />
              <path d="M3 6l4 4" />
            </svg>
            <p style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.75rem',
              fontWeight: 400,
              color: '#94a3b8',
              textAlign: 'center',
              margin: 0,
            }}>
              Agree with quotes to begin forging your ranking
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {rankedQuotes.map((quote) => (
              <RankSlot
                key={quote.id}
                quote={quote}
                rank={quote.rank}
                wins={matchupWins[quote.id] ?? 0}
                isNew={quote.id === lastLandedId}
              />
            ))}
          </div>
        )}

        {/* Defeated section */}
        {disagreedQuotes.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 700,
              fontSize: '0.5625rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#94a3b8',
              marginBottom: '0.375rem',
            }}>
              Defeated * {disagreedQuotes.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {disagreedQuotes.map((quote) => (
                <div key={quote.id} style={{
                  borderLeft: '3px solid rgba(255, 87, 64, 0.12)',
                  paddingLeft: '0.5rem',
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 400,
                  fontSize: '0.625rem',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                }}>
                  {quote.text.length > 65 ? quote.text.slice(0, 65) + '...' : quote.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Keep old name as alias for any remaining imports during transition
export const AgreedQuotesSidebar = RankedListSidebar;
