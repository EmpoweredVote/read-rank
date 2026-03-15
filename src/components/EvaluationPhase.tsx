import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMotionValue, MotionValue, animate, motion, AnimatePresence } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { QuoteCard } from './QuoteCard';
import { SwipeInstructions } from './SwipeInstructions';
import { SwipeBackground } from './SwipeBackground';
import { ActionButtons } from './ActionButtons';
import { RankedListSidebar } from './AgreedQuotesSidebar';
import { InlineRankPanel } from './InlineRankPanel';
import { QuickConfirmation } from './QuickConfirmation';
import { useDeviceType } from '../hooks/useDeviceType';

export const EvaluationPhase: React.FC = () => {
  const {
    agreeWithQuote,
    disagreeWithQuote,
    setPhase,
    skipRankPrompt,
    getCurrentIssueProgress,
  } = useReadRankStore();

  const progress = getCurrentIssueProgress();
  const quotesToEvaluate = progress?.quotesToEvaluate ?? [];
  const currentQuoteIndex = progress?.currentQuoteIndex ?? 0;
  const rankedQuotes = progress?.rankedQuotes ?? [];
  const disagreedQuotes = progress?.disagreedQuotes ?? [];
  const pendingRankQuoteId = progress?.pendingRankQuoteId ?? null;
  const rankSkipCount = progress?.rankSkipCount ?? 0;

  const deviceType = useDeviceType();
  const isMouseDevice = deviceType === 'mouse' || deviceType === 'unknown';

  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFullRankList, setShowFullRankList] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const dragX = useMotionValue(0);
  const cardXRef = useRef<MotionValue<number>>(dragX);

  // Inline panel shows on mobile when: pending quote exists AND 2+ ranked quotes AND not showing full list
  const showInlinePanel = !isMouseDevice && pendingRankQuoteId !== null && rankedQuotes.length >= 2 && !showFullRankList;

  const handleDragStateChange = useCallback((dragging: boolean, x: MotionValue<number>) => {
    setIsDragging(dragging);
    cardXRef.current = x;
    return x.on('change', (latest) => {
      dragX.set(latest);
    });
  }, [dragX]);

  const currentQuote = quotesToEvaluate[currentQuoteIndex];
  const progressPercent = quotesToEvaluate.length > 0
    ? Math.round(((currentQuoteIndex + 1) / quotesToEvaluate.length) * 100)
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

    cardXRef.current.set(0);
    dragX.set(0);
    setIsAnimating(false);
  }, [isAnimating, currentQuote, agreeWithQuote, disagreeWithQuote, dragX]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
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
  }, [handleButtonSwipe, isAnimating, currentQuote]);

  const handleDismissPanel = useCallback(() => {
    if (pendingRankQuoteId) {
      skipRankPrompt();
    }
  }, [pendingRankQuoteId, skipRankPrompt]);

  const handleComplete = useCallback(() => {
    if (rankedQuotes.length >= 2) {
      setShowConfirmation(true);
    } else {
      // 0 or 1 agrees — skip confirmation, go straight to results
      setPhase('results');
    }
  }, [rankedQuotes.length, setPhase]);

  const handleConfirm = useCallback(() => {
    setPhase('results');
  }, [setPhase]);

  const handleReorder = useCallback(() => {
    setShowConfirmation(false);
    setReorderMode(true);
  }, []);

  const isComplete = currentQuoteIndex >= quotesToEvaluate.length;
  const isLastQuote = currentQuoteIndex >= quotesToEvaluate.length - 1;

  const evaluationContent = (
    <div className="space-y-5">
      {/* Progress */}
      <div className="text-center">
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem' }}>
          {Math.min(currentQuoteIndex + 1, quotesToEvaluate.length)} of {quotesToEvaluate.length}
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
        <>
          <div className="swipe-card-container">
            <SwipeBackground dragX={dragX} isDragging={isDragging} />
            <div className="flex justify-center relative z-10">
              <QuoteCard
                key={currentQuote.id}
                quote={currentQuote}
                displayNumber={currentQuoteIndex + 1}
                onDragStateChange={handleDragStateChange}
                externalAnimating={isAnimating}
              />
            </div>
          </div>

          {isMouseDevice && (
            <ActionButtons
              onAgree={() => handleButtonSwipe('agree')}
              onDisagree={() => handleButtonSwipe('disagree')}
              disabled={isAnimating}
            />
          )}

          {!isMouseDevice && <SwipeInstructions />}
        </>
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

      {/* Mobile: Inline rank panel (after 2nd agree, when pending exists) */}
      <AnimatePresence>
        {showInlinePanel && (
          <motion.div
            key="inline-rank-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <InlineRankPanel onDismiss={handleDismissPanel} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: Nudge text on first skip */}
      {!isMouseDevice && rankSkipCount === 1 && pendingRankQuoteId && (
        <p style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: '0.75rem',
          color: '#94a3b8',
          fontStyle: 'italic',
          textAlign: 'center',
          margin: '0.25rem 0',
        }}>
          Drag to rank your quotes
        </p>
      )}

      {/* Mobile: Counter pill (visible when ranked quotes exist and not showing inline panel) */}
      {!isMouseDevice && rankedQuotes.length > 0 && !showInlinePanel && (
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

      {/* Mobile: Full rank list (triggered by counter pill) */}
      {showFullRankList && !isMouseDevice && (
        <InlineRankPanel onDismiss={() => setShowFullRankList(false)} />
      )}

      {/* Mobile summary */}
      {!isMouseDevice && (rankedQuotes.length > 0 || disagreedQuotes.length > 0) && (
        <div className="text-center">
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#94a3b8' }}>
            Ranked: {rankedQuotes.length} &middot; Disagreed: {disagreedQuotes.length}
          </p>
        </div>
      )}

      {/* See Your Results button */}
      {(isLastQuote || isComplete) && !showConfirmation && !reorderMode && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleComplete}
            className="ev-button-primary animate-gentle-pulse"
            style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          >
            See Your Results
          </button>
        </div>
      )}

      {/* Quick Confirmation */}
      {showConfirmation && (
        <QuickConfirmation onConfirm={handleConfirm} onReorder={handleReorder} />
      )}

      {/* Reorder mode */}
      {reorderMode && (
        <div className="mt-4">
          <InlineRankPanel onDismiss={() => { setReorderMode(false); setShowConfirmation(true); }} />
        </div>
      )}
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
            <RankedListSidebar />
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
