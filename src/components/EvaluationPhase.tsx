import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMotionValue, MotionValue, animate, motion } from 'framer-motion';
import { useReadRankStore, type Quote } from '../store/useReadRankStore';
import { QuoteCard } from './QuoteCard';
import { SwipeInstructions } from './SwipeInstructions';
import { SwipeBackground } from './SwipeBackground';
import { ActionButtons } from './ActionButtons';
import { RankedListSidebar } from './AgreedQuotesSidebar';
import { InlineRankPanel } from './InlineRankPanel';
import { MatchupPhase } from './MatchupPhase';
import { useDeviceType } from '../hooks/useDeviceType';
import CoachMark from './CoachMark';

export const EvaluationPhase: React.FC = () => {
  const {
    agreeWithQuote,
    disagreeWithQuote,
    setPhase,
    getCurrentIssueProgress,
    coachMarksCompleted,
    completeCoachMarks,
    locationFilter,
  } = useReadRankStore();

  const progress = getCurrentIssueProgress();
  const quotesToEvaluate = progress?.quotesToEvaluate ?? [];
  // When location filter is active, only show quotes from local representatives
  const effectiveQuotesToEvaluate = locationFilter
    ? quotesToEvaluate.filter(q =>
        q.candidateId && locationFilter.politicianIds.includes(q.candidateId)
      )
    : quotesToEvaluate;
  const currentQuoteIndex = progress?.currentQuoteIndex ?? 0;
  const rankedQuotes = progress?.rankedQuotes ?? [];
  const disagreedQuotes = progress?.disagreedQuotes ?? [];
  const activeMatchupPair = progress?.activeMatchupPair ?? null;

  const deviceType = useDeviceType();
  const isMouseDevice = deviceType === 'mouse' || deviceType === 'unknown';

  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFullRankList, setShowFullRankList] = useState(false);
  const [modeTransition, setModeTransition] = useState(false);

  const [tourStep, setTourStep] = useState<1 | 2 | null>(null);
  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const quoteCardRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const inlinePanelRef = useRef<HTMLDivElement>(null);

  const prevMatchupPairRef = useRef<string | null>(null);

  const dragX = useMotionValue(0);
  const cardXRef = useRef<MotionValue<number>>(dragX);

  const showMatchupMode = activeMatchupPair !== null;

  // Mode transition animation when switching between swipe and matchup
  useEffect(() => {
    const newPairKey = activeMatchupPair ? activeMatchupPair.join('-') : null;
    if (newPairKey !== prevMatchupPairRef.current) {
      const wasNull = prevMatchupPairRef.current === null;
      const isNull = newPairKey === null;
      // Only animate on mode switch (null->pair or pair->null), not pair->pair
      if (wasNull !== isNull) {
        setModeTransition(true);
        setTimeout(() => setModeTransition(false), 50);
      }
      prevMatchupPairRef.current = newPairKey;
    }
  }, [activeMatchupPair]);

  // Coach mark tour: start ~500ms after mount on first real issue
  useEffect(() => {
    if (coachMarksCompleted) return;
    const timer = setTimeout(() => setTourStep(1), 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open mobile rank panel for coach mark step 2
  useEffect(() => {
    if (tourStep === 2 && !isMouseDevice && rankedQuotes.length >= 1) {
      setShowFullRankList(true);
    }
  }, [tourStep, isMouseDevice, rankedQuotes.length]);

  const handleDragStateChange = useCallback((dragging: boolean, x: MotionValue<number>) => {
    setIsDragging(dragging);
    cardXRef.current = x;
    return x.on('change', (latest) => {
      dragX.set(latest);
    });
  }, [dragX]);

  const currentQuote = effectiveQuotesToEvaluate[currentQuoteIndex];
  const progressPercent = effectiveQuotesToEvaluate.length > 0
    ? Math.round(((currentQuoteIndex + 1) / effectiveQuotesToEvaluate.length) * 100)
    : 0;

  const handleButtonSwipe = useCallback(async (direction: 'agree' | 'disagree') => {
    if (isAnimating || !currentQuote) return;
    setIsAnimating(true);

    const offScreenX = direction === 'agree' ? 500 : -500;
    await animate(cardXRef.current, offScreenX, {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }).finished;

    if (direction === 'agree') {
      agreeWithQuote(currentQuote);
    } else {
      disagreeWithQuote(currentQuote);
    }

    // Advance tour on first swipe (button/keyboard path)
    if (tourStep === 1) {
      setTourStep(2);
    }

    cardXRef.current.set(0);
    dragX.set(0);
    setIsAnimating(false);
  }, [isAnimating, currentQuote, agreeWithQuote, disagreeWithQuote, dragX, tourStep]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      // Only handle swipe mode keys here; matchup mode handles its own keys
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

  const handleSkipTour = useCallback(() => {
    setTourStep(null);
    completeCoachMarks();
  }, [completeCoachMarks]);

  const handleCompleteTour = useCallback(() => {
    setTourStep(null);
    completeCoachMarks();
  }, [completeCoachMarks]);

  const handleCardAgree = useCallback((quote: Quote) => {
    agreeWithQuote(quote);
    if (tourStep === 1) {
      setTourStep(2);
    }
  }, [agreeWithQuote, tourStep]);

  const handleCardDisagree = useCallback((quote: Quote) => {
    disagreeWithQuote(quote);
    if (tourStep === 1) {
      setTourStep(2);
    }
  }, [disagreeWithQuote, tourStep]);

  // Issue 4: Always go straight to results — no confirmation step
  const handleComplete = useCallback(() => {
    setPhase('results');
  }, [setPhase]);

  const isComplete = currentQuoteIndex >= effectiveQuotesToEvaluate.length;
  const isLastQuote = currentQuoteIndex >= effectiveQuotesToEvaluate.length - 1;
  // Results button only shows when all quotes evaluated AND no pending matchups
  const showResultsButton = (isLastQuote || isComplete) && activeMatchupPair === null;

  const swipeContent = (
    <>
      {/* Progress */}
      <div className="text-center">
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
          {Math.min(currentQuoteIndex + 1, effectiveQuotesToEvaluate.length)} of {effectiveQuotesToEvaluate.length}
        </p>
        <div className="w-full h-1 rounded-full" style={{ backgroundColor: '#e8e2d9' }}>
          <div
            className="h-1 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%`, backgroundColor: '#00657c' }}
          />
        </div>
      </div>

      {/* Quote Card + Action Buttons (wrapped for coach mark spotlight) */}
      <div ref={swipeAreaRef}>
        {currentQuote ? (
          <div className="swipe-card-container">
            <SwipeBackground dragX={dragX} isDragging={isDragging} />
            <div className="flex justify-center relative z-10">
              <QuoteCard
                ref={quoteCardRef}
                key={currentQuote.id}
                quote={currentQuote}
                displayNumber={currentQuoteIndex + 1}
                onDragStateChange={handleDragStateChange}
                externalAnimating={isAnimating}
                onAgree={handleCardAgree}
                onDisagree={handleCardDisagree}
              />
            </div>
          </div>
        ) : (
          <div className="evaluation-complete-card">
            <div className="text-center py-8">
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '2rem', color: '#00657c', marginBottom: '0.75rem' }}>
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
      </div>
    </>
  );

  const evaluationContent = (
    <div className="space-y-5">
      {/* Mode transition wrapper */}
      <div style={{
        opacity: modeTransition ? 0 : 1,
        transform: modeTransition ? 'scale(0.94) translateY(12px)' : 'scale(1) translateY(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {showMatchupMode ? (
          <MatchupPhase />
        ) : (
          swipeContent
        )}
      </div>

      {/* Mobile: Counter pill (visible when ranked quotes exist and not in matchup mode) */}
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

      {/* Mobile: Inline rank list (triggered by counter pill) */}
      {showFullRankList && !isMouseDevice && !showMatchupMode && (
        <InlineRankPanel ref={inlinePanelRef} onDismiss={() => setShowFullRankList(false)} />
      )}

      {/* Mobile summary */}
      {!isMouseDevice && (rankedQuotes.length > 0 || disagreedQuotes.length > 0) && !showMatchupMode && (
        <div className="text-center">
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#94a3b8' }}>
            Ranked: {rankedQuotes.length} &middot; Disagreed: {disagreedQuotes.length}
          </p>
        </div>
      )}

      {/* See Your Results button — only when all matchups done */}
      {showResultsButton && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleComplete}
            className="ev-button-primary animate-gentle-pulse"
            style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          >
            See Who Said It
          </button>
        </div>
      )}
    </div>
  );

  const coachMarkOverlay = (
    <>
      {/* Step 1: Spotlight the swipe card + buttons — interactive, user can swipe/click through it */}
      <CoachMark
        targetRef={swipeAreaRef}
        show={tourStep === 1 && !!currentQuote}
        allowSpotlightInteraction={true}
        stepLabel="1 of 2"
        onNext={handleSkipTour}
        onSkipAll={handleSkipTour}
      >
        Swipe right to agree, left to disagree
      </CoachMark>

      {/* Step 2 desktop: Spotlight the ranked list sidebar */}
      {isMouseDevice && (
        <CoachMark
          targetRef={sidebarRef}
          show={tourStep === 2 && rankedQuotes.length >= 1}
          allowSpotlightInteraction={false}
          stepLabel="2 of 2"
          onDismiss={handleCompleteTour}
        >
          Your agreed quotes rank here. Pick the stronger quote when matchups appear.
        </CoachMark>
      )}

      {/* Step 2 mobile: Spotlight the inline rank panel */}
      {!isMouseDevice && (
        <CoachMark
          targetRef={inlinePanelRef}
          show={tourStep === 2 && rankedQuotes.length >= 1 && showFullRankList}
          allowSpotlightInteraction={false}
          stepLabel="2 of 2"
          onDismiss={handleCompleteTour}
        >
          Your agreed quotes rank here. Pick the stronger quote when matchups appear.
        </CoachMark>
      )}
    </>
  );

  // Desktop: End-of-evaluation centered layout
  if (isComplete && !showMatchupMode && isMouseDevice) {
    return (
      <div>
        <motion.div
          className="max-w-2xl mx-auto space-y-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="text-center mb-4">
            <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '1rem', color: '#00657c' }}>
              All quotes evaluated
            </p>
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: '#94a3b8' }}>
              {rankedQuotes.length} ranked &middot; {disagreedQuotes.length} disagreed
            </p>
          </div>
          <RankedListSidebar ref={sidebarRef} />
          {showResultsButton && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleComplete}
                className="ev-button-primary animate-gentle-pulse"
                style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
              >
                See Who Said It
              </button>
            </div>
          )}
        </motion.div>
        {coachMarkOverlay}
      </div>
    );
  }

  // Desktop: Matchup full-width layout (hides sidebar)
  if (showMatchupMode && isMouseDevice) {
    return (
      <div>
        <div className="matchup-full-layout">
          <div className="matchup-full-main">
            {evaluationContent}
          </div>
        </div>
        {coachMarkOverlay}
      </div>
    );
  }

  // Desktop: Split layout
  if (isMouseDevice) {
    return (
      <div>
        <div className="evaluation-split-layout">
          <div className="evaluation-main-panel">
            {evaluationContent}
          </div>
          <div className="evaluation-sidebar-panel">
            <RankedListSidebar ref={sidebarRef} />
          </div>
        </div>
        {coachMarkOverlay}
      </div>
    );
  }

  // Mobile: Single column
  return (
    <div>
      {evaluationContent}
      {coachMarkOverlay}
    </div>
  );
};
