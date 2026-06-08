import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMotionValue, type MotionValue, animate, motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_QUOTES } from '../data/practiceData';
import { QuoteCard } from './QuoteCard';
import { SwipeBackground } from './SwipeBackground';
import { SwipeInstructions } from './SwipeInstructions';
import { ActionButtons } from './ActionButtons';
import { RankList } from './RankList';
import { useDeviceType } from '../hooks/useDeviceType';
import { PracticeResultsScreen } from './PracticeResultsScreen';

export const PracticeRound: React.FC = () => {
  const {
    practiceProgress,
    agreePractice,
    disagreePractice,
    reorderPracticeAgreed,
    skipPractice,
    startPractice,
  } = useReadRankStore();

  useEffect(() => {
    if (practiceProgress === null) startPractice(PRACTICE_QUOTES);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deviceType = useDeviceType();
  const isMouseDevice = deviceType === 'mouse' || deviceType === 'unknown';

  const [showSplash, setShowSplash] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFullRankList, setShowFullRankList] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const dragX = useMotionValue(0);
  const cardXRef = useRef<MotionValue<number>>(dragX);

  const currentIndex = practiceProgress?.currentIndex ?? 0;
  const agreed = practiceProgress?.agreed ?? [];
  const disagreed = practiceProgress?.disagreed ?? [];
  const currentQuote = PRACTICE_QUOTES[currentIndex];
  const isComplete = currentIndex >= PRACTICE_QUOTES.length;
  const progressPercent = Math.round((Math.min(currentIndex, PRACTICE_QUOTES.length) / PRACTICE_QUOTES.length) * 100);

  const handleDragStateChange = useCallback((dragging: boolean, x: MotionValue<number>) => {
    setIsDragging(dragging);
    cardXRef.current = x;
    return x.on('change', (latest) => dragX.set(latest));
  }, [dragX]);

  const handleButtonSwipe = useCallback(async (direction: 'agree' | 'disagree') => {
    if (isAnimating || !currentQuote) return;
    setIsAnimating(true);
    const offScreenX = direction === 'agree' ? 500 : -500;
    await animate(cardXRef.current, offScreenX, { duration: 0.4, ease: [0.4, 0, 0.2, 1] }).finished;
    if (direction === 'agree') agreePractice(currentQuote);
    else disagreePractice(currentQuote);
    cardXRef.current.set(0);
    dragX.set(0);
    setIsAnimating(false);
  }, [isAnimating, currentQuote, agreePractice, disagreePractice, dragX]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (isAnimating || !currentQuote) return;
      switch (event.key) {
        case 'ArrowLeft': case 'a': case 'A': event.preventDefault(); handleButtonSwipe('disagree'); break;
        case 'ArrowRight': case 'd': case 'D': event.preventDefault(); handleButtonSwipe('agree'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButtonSwipe, isAnimating, currentQuote]);

  if (showSplash) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ width: '100%', maxWidth: '280px', marginBottom: '2rem' }}>
          <svg viewBox="0 0 200 160" style={{ width: '100%', height: 'auto' }}>
            <g transform="rotate(-8, 100, 80)">
              <rect x="55" y="20" width="90" height="120" rx="8" fill="var(--surface-raised)" stroke="var(--border-subtle)" strokeWidth="1.5" />
              <rect x="65" y="35" width="70" height="8" rx="4" fill="var(--border-subtle)" />
              <rect x="65" y="50" width="55" height="6" rx="3" fill="var(--border-subtle)" />
            </g>
            <g transform="rotate(6, 100, 80)">
              <rect x="55" y="20" width="90" height="120" rx="8" fill="var(--surface-card)" stroke="var(--border-subtle)" strokeWidth="1.5" />
              <rect x="65" y="35" width="70" height="8" rx="4" fill="var(--color-ev-muted-blue)" fillOpacity="0.15" />
              <rect x="65" y="50" width="55" height="6" rx="3" fill="var(--color-ev-muted-blue)" fillOpacity="0.1" />
              <circle cx="100" cy="100" r="18" fill="#fef3c7" stroke="#fde68a" strokeWidth="1" />
              <text x="100" y="107" textAnchor="middle" fontSize="20">🍕</text>
            </g>
            <g opacity="0.4">
              <path d="M30 80 L15 80" stroke="var(--color-ev-coral)" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 75 L15 80 L20 85" stroke="var(--color-ev-coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M170 80 L185 80" stroke="var(--color-ev-muted-blue)" strokeWidth="2" strokeLinecap="round" />
              <path d="M180 75 L185 80 L180 85" stroke="var(--color-ev-muted-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          </svg>
        </div>

        <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', color: 'var(--text-heading)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Read &amp; Rank
        </h1>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '24rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Read real quotes without knowing who said them. Agree or disagree, drag to rank your
          favorites, then reveal which candidates you match.
        </p>

        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '1rem 1.25rem', maxWidth: '24rem', marginBottom: '2rem' }}>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: '#92400e', marginBottom: '0.25rem' }}>
            But first, a quick practice round
          </p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: '#a16207', lineHeight: 1.5, margin: 0 }}>
            We&rsquo;ll use pizza opinions so you can get the hang of swiping and dragging to rank.
          </p>
        </div>

        <motion.button onClick={() => setShowSplash(false)} className="ev-button-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
          Let&rsquo;s try it
        </motion.button>
        <button onClick={skipPractice} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', color: 'var(--text-tertiary)', textDecoration: 'underline', padding: '0.5rem', marginTop: '1rem' }}>
          Skip practice
        </button>
      </div>
    );
  }

  if (showResults) return <PracticeResultsScreen />;

  const swipeContent = (
    <>
      <div className="text-center">
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.375rem' }}>
          Quote {Math.min(currentIndex + 1, PRACTICE_QUOTES.length)} of {PRACTICE_QUOTES.length}
        </p>
        <div className="w-full h-1 rounded-full" style={{ backgroundColor: 'var(--border-subtle)' }}>
          <div className="h-1 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%`, backgroundColor: 'var(--color-ev-muted-blue)' }} />
        </div>
      </div>

      {currentQuote ? (
        <div className="swipe-card-container">
          <SwipeBackground dragX={dragX} isDragging={isDragging} />
          <div className="flex justify-center relative z-10">
            <QuoteCard key={currentQuote.id} quote={currentQuote} displayNumber={currentIndex + 1}
              onDragStateChange={handleDragStateChange} externalAnimating={isAnimating}
              onAgree={agreePractice} onDisagree={disagreePractice} />
          </div>
        </div>
      ) : (
        <div className="evaluation-complete-card">
          <div className="text-center py-8">
            <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-link)', marginBottom: '0.5rem' }}>Done</div>
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
              {agreed.length} agreed · {disagreed.length} disagreed
            </p>
          </div>
        </div>
      )}

      {isMouseDevice && currentQuote && (
        <ActionButtons onAgree={() => handleButtonSwipe('agree')} onDisagree={() => handleButtonSwipe('disagree')} disabled={isAnimating} />
      )}
      {!isMouseDevice && currentQuote && <SwipeInstructions />}
    </>
  );

  const evaluationContent = (
    <div className="space-y-5">
      <div style={{ textAlign: 'center', padding: '0.5rem 1rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fde68a' }}>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.8125rem', color: '#92400e' }}>
          Practice Round — The Great Pizza Debate
        </span>
      </div>

      {swipeContent}

      {!isMouseDevice && agreed.length > 0 && (
        <div className="flex justify-center mt-1">
          <button onClick={() => setShowFullRankList((p) => !p)} className="rank-counter-pill">
            {agreed.length} agreed · rank them
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showFullRankList ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      )}
      {showFullRankList && !isMouseDevice && (
        <div className="inline-rank-panel">
          <RankList items={agreed} onReorder={reorderPracticeAgreed} compact />
        </div>
      )}

      {isComplete && (
        <div className="flex justify-center pt-2">
          <button onClick={() => setShowResults(true)} className="ev-button-primary animate-gentle-pulse" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
            See your pizza rankings
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button onClick={skipPractice} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-tertiary)', textDecoration: 'underline', padding: '0.5rem' }}>
          Skip practice
        </button>
      </div>
    </div>
  );

  if (isMouseDevice) {
    return (
      <div className="evaluation-split-layout">
        <div className="evaluation-main-panel">{evaluationContent}</div>
        <div className="evaluation-sidebar-panel">
          <div className="agreed-quotes-sidebar">
            <div className="sidebar-header">
              <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-heading)' }}>Your ranking</span>
            </div>
            <div style={{ padding: '0.75rem' }}>
              <RankList items={agreed} onReorder={reorderPracticeAgreed} emptyHint="Agree with a pizza take, then drag to rank. Top 3 are your podium." />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div>{evaluationContent}</div>;
};
