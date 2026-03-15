import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { MatchCard } from './MatchCard';

interface ScreenFlashProps {
  active: boolean;
}

const ScreenFlash: React.FC<ScreenFlashProps> = ({ active }) => {
  if (!active) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(255, 87, 64, 0.1)',
      animation: 'screenFlash 0.4s ease-out forwards',
      pointerEvents: 'none',
      zIndex: 1000,
    }} />
  );
};

interface MatchupPhaseProps {
  onMatchupComplete?: () => void;
}

export const MatchupPhase: React.FC<MatchupPhaseProps> = ({ onMatchupComplete }) => {
  const { getCurrentIssueProgress, recordMatchupWin } = useReadRankStore();

  const progress = getCurrentIssueProgress();
  const activeMatchupPair = progress?.activeMatchupPair ?? null;
  const rankedQuotes = progress?.rankedQuotes ?? [];
  const quotesToEvaluate = progress?.quotesToEvaluate ?? [];
  const currentQuoteIndex = progress?.currentQuoteIndex ?? 0;

  const [selected, setSelected] = useState<'left' | 'right' | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const shakeRef = useRef<HTMLDivElement>(null);

  // Reset selected when matchup pair changes
  useEffect(() => {
    setSelected(null);
  }, [activeMatchupPair?.[0], activeMatchupPair?.[1]]);

  // Notify parent when all matchups are complete
  useEffect(() => {
    if (activeMatchupPair === null && onMatchupComplete) {
      onMatchupComplete();
    }
  }, [activeMatchupPair, onMatchupComplete]);

  const leftQuote = activeMatchupPair
    ? rankedQuotes.find(q => q.id === activeMatchupPair[0]) ?? null
    : null;
  const rightQuote = activeMatchupPair
    ? rankedQuotes.find(q => q.id === activeMatchupPair[1]) ?? null
    : null;

  const handlePick = useCallback((side: 'left' | 'right') => {
    if (selected !== null || !activeMatchupPair || !leftQuote || !rightQuote) return;

    setSelected(side);
    setShowFlash(true);

    // Screen shake
    if (shakeRef.current) {
      shakeRef.current.classList.add('screen-shake');
      setTimeout(() => {
        shakeRef.current?.classList.remove('screen-shake');
      }, 400);
    }

    setTimeout(() => setShowFlash(false), 400);

    // After animation, record the win
    setTimeout(() => {
      const winnerId = side === 'left' ? activeMatchupPair[0] : activeMatchupPair[1];
      const loserId = side === 'left' ? activeMatchupPair[1] : activeMatchupPair[0];
      recordMatchupWin(winnerId, loserId);
    }, 800);
  }, [selected, activeMatchupPair, leftQuote, rightQuote, recordMatchupWin]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (selected !== null) return;

      if (e.key === '1' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePick('left');
      } else if (e.key === '2' || e.key === 'ArrowRight') {
        e.preventDefault();
        handlePick('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePick, selected]);

  if (!leftQuote || !rightQuote) return null;

  const remainingQuotes = quotesToEvaluate.length - currentQuoteIndex;

  return (
    <>
      <ScreenFlash active={showFlash} />

      <div ref={shakeRef}>
        {/* Banner */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1.25rem',
          animation: 'bannerSlam 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        }}>
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 87, 64, 0.3), transparent)',
            marginBottom: '0.5rem',
          }} />
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700,
            fontSize: '0.9375rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #ff5740, #fed12e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'inline-block',
          }}>
            Choose Your Champion
          </span>
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 87, 64, 0.3), transparent)',
            marginTop: '0.5rem',
          }} />
        </div>

        {/* Cards + VS divider */}
        <div className="matchup-cards-container" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
          <MatchCard
            quote={leftQuote}
            side="left"
            onPick={handlePick}
            selected={selected}
            disabled={selected !== null}
          />

          {/* VS divider */}
          <div style={{
            flexShrink: 0,
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: '1.5px solid rgba(255, 87, 64, 0.3)',
            background: 'radial-gradient(circle, rgba(255, 87, 64, 0.15) 0%, transparent 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
            flexShrink: 0,
            animation: 'vsPulse 2s ease-in-out infinite',
          }}>
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 800,
              fontSize: '0.8125rem',
              color: '#ff5740',
            }}>
              VS
            </span>
          </div>

          <MatchCard
            quote={rightQuote}
            side="right"
            onPick={handlePick}
            selected={selected}
            disabled={selected !== null}
          />
        </div>

        {/* Progress indicator */}
        {remainingQuotes > 0 && (
          <p style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 500,
            fontSize: '0.6875rem',
            color: '#94a3b8',
            textAlign: 'center',
            marginTop: '1rem',
            marginBottom: 0,
          }}>
            {remainingQuotes} more to evaluate after
          </p>
        )}
      </div>
    </>
  );
};
