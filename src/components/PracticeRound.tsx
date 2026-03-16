import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMotionValue, type MotionValue, animate } from 'framer-motion';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_QUOTES } from '../data/practiceData';
import { QuoteCard } from './QuoteCard';
import { MatchCard } from './MatchCard';
import { SwipeBackground } from './SwipeBackground';
import { SwipeInstructions } from './SwipeInstructions';
import { ActionButtons } from './ActionButtons';
import { useDeviceType } from '../hooks/useDeviceType';
import { PracticeResultsScreen } from './PracticeResultsScreen';

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

const RANK_COLORS = ['#00657c', '#ff5740', '#59b0c4', '#94a3b8', '#64748b'];

export const PracticeRound: React.FC = () => {
  const {
    practiceProgress,
    agreePracticeQuote,
    disagreePracticeQuote,
    recordPracticeMatchupWin,
    skipPractice,
    startPractice,
  } = useReadRankStore();

  // Initialize practice state on mount if not already started
  useEffect(() => {
    if (practiceProgress === null) {
      startPractice();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deviceType = useDeviceType();
  const isMouseDevice = deviceType === 'mouse' || deviceType === 'unknown';

  const [showSplash, setShowSplash] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFullRankList, setShowFullRankList] = useState(false);
  const [modeTransition, setModeTransition] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Matchup state
  const [matchupSelected, setMatchupSelected] = useState<'left' | 'right' | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const shakeRef = useRef<HTMLDivElement>(null);

  const prevMatchupPairRef = useRef<string | null>(null);

  const dragX = useMotionValue(0);
  const cardXRef = useRef<MotionValue<number>>(dragX);

  // Derived state from practiceProgress
  const currentQuoteIndex = practiceProgress?.currentQuoteIndex ?? 0;
  const rankedQuotes = practiceProgress?.rankedQuotes ?? [];
  const disagreedQuotes = practiceProgress?.disagreedQuotes ?? [];
  const activeMatchupPair = practiceProgress?.activeMatchupPair ?? null;
  const matchupWins = practiceProgress?.matchupWins ?? {};

  const currentQuote = PRACTICE_QUOTES[currentQuoteIndex];
  const showMatchupMode = activeMatchupPair !== null;
  const isComplete = currentQuoteIndex >= PRACTICE_QUOTES.length;
  const isLastQuote = currentQuoteIndex >= PRACTICE_QUOTES.length - 1;
  const showResultsButton = (isLastQuote || isComplete) && activeMatchupPair === null;

  const progressPercent = Math.round(((currentQuoteIndex + 1) / PRACTICE_QUOTES.length) * 100);

  // Mode transition animation when switching between swipe and matchup
  useEffect(() => {
    const newPairKey = activeMatchupPair ? activeMatchupPair.join('-') : null;
    if (newPairKey !== prevMatchupPairRef.current) {
      const wasNull = prevMatchupPairRef.current === null;
      const isNull = newPairKey === null;
      if (wasNull !== isNull) {
        setModeTransition(true);
        setTimeout(() => setModeTransition(false), 50);
      }
      prevMatchupPairRef.current = newPairKey;
    }
  }, [activeMatchupPair]);

  // Reset matchup selection when pair changes
  useEffect(() => {
    setMatchupSelected(null);
  }, [activeMatchupPair?.[0], activeMatchupPair?.[1]]);

  const handleDragStateChange = useCallback((dragging: boolean, x: MotionValue<number>) => {
    setIsDragging(dragging);
    cardXRef.current = x;
    return x.on('change', (latest) => {
      dragX.set(latest);
    });
  }, [dragX]);

  const handleButtonSwipe = useCallback(async (direction: 'agree' | 'disagree') => {
    if (isAnimating || !currentQuote) return;
    setIsAnimating(true);

    const offScreenX = direction === 'agree' ? 500 : -500;
    await animate(cardXRef.current, offScreenX, {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    }).finished;

    if (direction === 'agree') {
      agreePracticeQuote(currentQuote);
    } else {
      disagreePracticeQuote(currentQuote);
    }

    cardXRef.current.set(0);
    dragX.set(0);
    setIsAnimating(false);
  }, [isAnimating, currentQuote, agreePracticeQuote, disagreePracticeQuote, dragX]);

  // Keyboard shortcuts for swipe mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (showMatchupMode) return;
      if (isAnimating || !currentQuote) return;

      switch (event.key) {
        case 'ArrowLeft': case 'a': case 'A':
          event.preventDefault();
          handleButtonSwipe('disagree');
          break;
        case 'ArrowRight': case 'd': case 'D':
          event.preventDefault();
          handleButtonSwipe('agree');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButtonSwipe, isAnimating, currentQuote, showMatchupMode]);

  // Matchup pick handler
  const leftQuote = activeMatchupPair ? rankedQuotes.find(q => q.id === activeMatchupPair[0]) ?? null : null;
  const rightQuote = activeMatchupPair ? rankedQuotes.find(q => q.id === activeMatchupPair[1]) ?? null : null;

  const handlePick = useCallback((side: 'left' | 'right') => {
    if (matchupSelected !== null || !activeMatchupPair || !leftQuote || !rightQuote) return;

    setMatchupSelected(side);
    setShowFlash(true);

    if (shakeRef.current) {
      shakeRef.current.classList.add('screen-shake');
      setTimeout(() => {
        shakeRef.current?.classList.remove('screen-shake');
      }, 400);
    }

    setTimeout(() => setShowFlash(false), 400);

    setTimeout(() => {
      const winnerId = side === 'left' ? activeMatchupPair[0] : activeMatchupPair[1];
      const loserId = side === 'left' ? activeMatchupPair[1] : activeMatchupPair[0];
      recordPracticeMatchupWin(winnerId, loserId);
    }, 800);
  }, [matchupSelected, activeMatchupPair, leftQuote, rightQuote, recordPracticeMatchupWin]);

  // Keyboard shortcuts for matchup mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!showMatchupMode || matchupSelected !== null) return;

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
  }, [handlePick, showMatchupMode, matchupSelected]);

  // Splash screen — introduce the practice round before jumping in
  if (showSplash) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}>
        {/* Pizza card illustration */}
        <div style={{ width: '100%', maxWidth: '280px', marginBottom: '2rem' }}>
          <svg viewBox="0 0 200 160" style={{ width: '100%', height: 'auto' }}>
            {/* Back card (tilted left) */}
            <g transform="rotate(-8, 100, 80)">
              <rect x="55" y="20" width="90" height="120" rx="8" fill="#f5f0eb" stroke="#e8e2d9" strokeWidth="1.5" />
              <rect x="65" y="35" width="70" height="8" rx="4" fill="#e8e2d9" />
              <rect x="65" y="50" width="55" height="6" rx="3" fill="#e8e2d9" />
              <rect x="65" y="62" width="60" height="6" rx="3" fill="#e8e2d9" />
            </g>
            {/* Front card (tilted right) */}
            <g transform="rotate(6, 100, 80)">
              <rect x="55" y="20" width="90" height="120" rx="8" fill="#fffefb" stroke="#e8e2d9" strokeWidth="1.5" />
              <rect x="65" y="35" width="70" height="8" rx="4" fill="#00657c" fillOpacity="0.15" />
              <rect x="65" y="50" width="55" height="6" rx="3" fill="#00657c" fillOpacity="0.1" />
              <rect x="65" y="62" width="60" height="6" rx="3" fill="#00657c" fillOpacity="0.1" />
              {/* Pizza emoji circle */}
              <circle cx="100" cy="100" r="18" fill="#fef3c7" stroke="#fde68a" strokeWidth="1" />
              <text x="100" y="107" textAnchor="middle" fontSize="20">🍕</text>
            </g>
            {/* Swipe arrows */}
            <g opacity="0.4">
              {/* Left arrow (disagree) */}
              <path d="M30 80 L15 80" stroke="#ff5740" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 75 L15 80 L20 85" stroke="#ff5740" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* Right arrow (agree) */}
              <path d="M170 80 L185 80" stroke="#00657c" strokeWidth="2" strokeLinecap="round" />
              <path d="M180 75 L185 80 L180 85" stroke="#00657c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          </svg>
        </div>

        {/* Feature intro */}
        <h1 style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
          color: '#1a1a2e',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
        }}>
          Read &amp; Rank
        </h1>

        <p style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: '1rem',
          color: '#64748b',
          maxWidth: '24rem',
          marginBottom: '1.5rem',
          lineHeight: 1.6,
        }}>
          Read real politician quotes without knowing who said them.
          Agree or disagree, rank your favorites, and see which politicians
          actually match your views.
        </p>

        {/* Practice round intro */}
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          maxWidth: '24rem',
          marginBottom: '2rem',
        }}>
          <p style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 600,
            fontSize: '0.875rem',
            color: '#92400e',
            marginBottom: '0.25rem',
          }}>
            But first, a quick practice round
          </p>
          <p style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.8125rem',
            color: '#a16207',
            lineHeight: 1.5,
            margin: 0,
          }}>
            We&rsquo;ll use pizza opinions so you can get the hang of
            swiping and ranking before diving into real issues.
          </p>
        </div>

        <motion.button
          onClick={() => setShowSplash(false)}
          className="ev-button-primary"
          style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Let&rsquo;s try it
        </motion.button>

        <button
          onClick={skipPractice}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.875rem',
            color: '#94a3b8',
            textDecoration: 'underline',
            padding: '0.5rem',
            marginTop: '1rem',
          }}
        >
          Skip practice
        </button>
      </div>
    );
  }

  // If showing results sub-phase
  if (showResults) {
    return <PracticeResultsScreen />;
  }

  // Sidebar content for desktop
  const sidebarContent = (
    <div style={{ padding: '1rem' }}>
      <h3 style={{
        fontFamily: "'Manrope', sans-serif",
        fontWeight: 700,
        fontSize: '0.8125rem',
        color: '#64748b',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
      }}>
        Your Rankings
      </h3>
      {rankedQuotes.length === 0 ? (
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: '#94a3b8' }}>
          Agree with quotes to start ranking
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rankedQuotes.map((q, i) => (
            <motion.div
              key={q.id}
              layout
              layoutId={`practice-rank-${q.id}`}
              style={{
                borderLeft: `3px solid ${RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)]}`,
                borderRadius: '0 8px 8px 0',
                padding: '0.5rem 0.75rem',
                background: `linear-gradient(90deg, ${RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)]}0f 0%, transparent 100%)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)],
                }}>
                  {i + 1}
                </span>
                <span style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '0.8125rem',
                  color: '#1a1a2e',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {q.text}
                </span>
              </div>
              {(matchupWins[q.id] ?? 0) > 0 && (
                <span style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '0.625rem',
                  color: '#94a3b8',
                  marginLeft: '1.5rem',
                }}>
                  {matchupWins[q.id]}W
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // Inline rank list for mobile
  const inlineRankList = rankedQuotes.length > 0 ? (
    <div style={{
      backgroundColor: '#fffefb',
      border: '1px solid #e8e2d9',
      borderRadius: '0.625rem',
      overflow: 'hidden',
    }}>
      {rankedQuotes.map((q, i) => (
        <div
          key={q.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 0.875rem',
            borderBottom: i < rankedQuotes.length - 1 ? '1px solid #f1ede8' : 'none',
          }}
        >
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: '0.875rem',
            color: RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)],
            minWidth: '1.25rem',
          }}>
            {i + 1}
          </span>
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.8125rem',
            color: '#1a1a2e',
            flex: 1,
          }}>
            {q.text}
          </span>
        </div>
      ))}
    </div>
  ) : null;

  // Matchup UI (inline, not using MatchupPhase)
  const matchupContent = leftQuote && rightQuote ? (
    <div ref={shakeRef}>
      <ScreenFlash active={showFlash} />

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
          selected={matchupSelected}
          disabled={matchupSelected !== null}
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
          selected={matchupSelected}
          disabled={matchupSelected !== null}
        />
      </div>
    </div>
  ) : null;

  // Swipe UI
  const swipeContent = (
    <>
      {/* Progress */}
      <div className="text-center">
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
          Quote {Math.min(currentQuoteIndex + 1, PRACTICE_QUOTES.length)} of {PRACTICE_QUOTES.length}
        </p>
        <div className="w-full h-1 rounded-full" style={{ backgroundColor: '#e8e2d9' }}>
          <div
            className="h-1 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%`, backgroundColor: '#00657c' }}
          />
        </div>
      </div>

      {/* Quote Card */}
      {currentQuote ? (
        <div className="swipe-card-container">
          <SwipeBackground dragX={dragX} isDragging={isDragging} />
          <div className="flex justify-center relative z-10">
            <QuoteCard
              key={currentQuote.id}
              quote={currentQuote}
              displayNumber={currentQuoteIndex + 1}
              onDragStateChange={handleDragStateChange}
              externalAnimating={isAnimating}
              onAgree={agreePracticeQuote}
              onDisagree={disagreePracticeQuote}
            />
          </div>
        </div>
      ) : (
        <div className="evaluation-complete-card">
          <div className="text-center py-8">
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '2rem', color: '#00657c', marginBottom: '0.75rem' }}>
              Done
            </div>
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              {rankedQuotes.length} ranked &middot; {disagreedQuotes.length} disagreed
            </p>
          </div>
        </div>
      )}

      {isMouseDevice && currentQuote && (
        <ActionButtons
          onAgree={() => handleButtonSwipe('agree')}
          onDisagree={() => handleButtonSwipe('disagree')}
          disabled={isAnimating}
        />
      )}

      {!isMouseDevice && currentQuote && <SwipeInstructions />}
    </>
  );

  const evaluationContent = (
    <div className="space-y-5">
      {/* Practice Round Banner */}
      <div style={{
        textAlign: 'center',
        padding: '0.5rem 1rem',
        backgroundColor: '#fef3c7',
        borderRadius: '0.5rem',
        border: '1px solid #fde68a',
      }}>
        <span style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: '#92400e',
        }}>
          Practice Round — The Great Pizza Debate
        </span>
      </div>

      {/* Mode transition wrapper */}
      <div style={{
        opacity: modeTransition ? 0 : 1,
        transform: modeTransition ? 'scale(0.94) translateY(12px)' : 'scale(1) translateY(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {showMatchupMode ? matchupContent : swipeContent}
      </div>

      {/* Mobile: Counter pill */}
      {!isMouseDevice && rankedQuotes.length > 0 && !showMatchupMode && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setShowFullRankList(prev => !prev)}
            className="rank-counter-pill"
          >
            {rankedQuotes.length} ranked
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: showFullRankList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* Mobile: Inline rank list */}
      {showFullRankList && !isMouseDevice && !showMatchupMode && inlineRankList}

      {/* Mobile summary */}
      {!isMouseDevice && (rankedQuotes.length > 0 || disagreedQuotes.length > 0) && !showMatchupMode && (
        <div className="text-center">
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#94a3b8' }}>
            Ranked: {rankedQuotes.length} &middot; Disagreed: {disagreedQuotes.length}
          </p>
        </div>
      )}

      {/* See Your Pizza Rankings button */}
      {showResultsButton && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setShowResults(true)}
            className="ev-button-primary animate-gentle-pulse"
            style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          >
            See Your Pizza Rankings
          </button>
        </div>
      )}

      {/* Skip practice link */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          onClick={skipPractice}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.8125rem',
            color: '#94a3b8',
            textDecoration: 'underline',
            padding: '0.5rem',
          }}
        >
          Skip practice
        </button>
      </div>
    </div>
  );

  // Desktop: Split layout
  if (isMouseDevice) {
    return (
      <div>
        <div className="evaluation-split-layout">
          <div className="evaluation-main-panel">
            {evaluationContent}
          </div>
          <div className="evaluation-sidebar-panel">
            {sidebarContent}
          </div>
        </div>
      </div>
    );
  }

  // Mobile: Single column
  return (
    <div>
      {evaluationContent}
    </div>
  );
};
