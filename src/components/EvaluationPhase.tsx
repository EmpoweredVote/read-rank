import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMotionValue, MotionValue, animate } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { QuoteCard } from './QuoteCard';
import { SwipeInstructions } from './SwipeInstructions';
import { SwipeBackground } from './SwipeBackground';
import { ActionButtons } from './ActionButtons';
import { AgreedQuotesSidebar } from './AgreedQuotesSidebar';
import { useDeviceType } from '../hooks/useDeviceType';

export const EvaluationPhase: React.FC = () => {
  const {
    quotesToEvaluate,
    currentQuoteIndex,
    agreedQuotes,
    disagreedQuotes,
    agreeWithQuote,
    disagreeWithQuote,
    setPhase,
    setRankedQuotes,
    questionText
  } = useReadRankStore();

  // Device detection for adaptive UI
  const deviceType = useDeviceType();
  const isMouseDevice = deviceType === 'mouse' || deviceType === 'unknown';

  // Track drag state for swipe background
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dragX = useMotionValue(0);

  // Ref to the motion value for programmatic swipes
  const cardXRef = useRef<MotionValue<number>>(dragX);

  const handleDragStateChange = useCallback((dragging: boolean, x: MotionValue<number>) => {
    setIsDragging(dragging);
    cardXRef.current = x;
    // Sync the motion value from the card
    return x.on('change', (latest) => {
      dragX.set(latest);
    });
  }, [dragX]);

  const currentQuote = quotesToEvaluate[currentQuoteIndex];
  const progress = quotesToEvaluate.length > 0
    ? Math.round(((currentQuoteIndex + 1) / quotesToEvaluate.length) * 100)
    : 0;

  // Handle programmatic swipes (for buttons and keyboard)
  const handleButtonSwipe = useCallback(async (direction: 'agree' | 'disagree') => {
    if (isAnimating || !currentQuote) return;

    setIsAnimating(true);

    const offScreenX = direction === 'agree' ? 500 : -500;

    // Animate card off screen
    await animate(cardXRef.current, offScreenX, {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }).finished;

    // Perform the action
    if (direction === 'agree') {
      agreeWithQuote(currentQuote);
    } else {
      disagreeWithQuote(currentQuote);
    }

    // Reset for next card
    cardXRef.current.set(0);
    dragX.set(0);
    setIsAnimating(false);
  }, [isAnimating, currentQuote, agreeWithQuote, disagreeWithQuote, dragX]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Don't handle during animation
      if (isAnimating || !currentQuote) return;

      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault();
          handleButtonSwipe('disagree');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault();
          handleButtonSwipe('agree');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButtonSwipe, isAnimating, currentQuote]);

  const handleComplete = () => {
    // Set ranked quotes and go to results (skip ranking phase on desktop since they can badge as they go)
    if (isMouseDevice) {
      setRankedQuotes(agreedQuotes);
      setPhase('results');
    } else {
      // Mobile still goes to ranking phase
      setPhase('ranking');
    }
  };

  const isComplete = currentQuoteIndex >= quotesToEvaluate.length;
  const isLastQuote = currentQuoteIndex >= quotesToEvaluate.length - 1;

  // Evaluation content (left side on desktop, full width on mobile)
  const evaluationContent = (
    <div className="space-y-4 md:space-y-6">
      {/* Progress indicator */}
      <div className="text-center">
        <p className="ev-text-secondary text-xs md:text-sm">
          Quote {Math.min(currentQuoteIndex + 1, quotesToEvaluate.length)} of {quotesToEvaluate.length}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
          <div
            className="ev-light-blue h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quote Card with Swipe Background */}
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

          {/* Action Buttons - Show on mouse devices */}
          {isMouseDevice && (
            <ActionButtons
              onAgree={() => handleButtonSwipe('agree')}
              onDisagree={() => handleButtonSwipe('disagree')}
              disabled={isAnimating}
            />
          )}

          {/* Swipe Instructions - only for touch devices */}
          {!isMouseDevice && <SwipeInstructions />}
        </>
      ) : (
        <div className="evaluation-complete-card">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✓</div>
            <h3 className="font-manrope font-bold text-lg text-gray-700 mb-2">
              All quotes evaluated!
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {agreedQuotes.length} agreed • {disagreedQuotes.length} disagreed
            </p>
            {isMouseDevice && agreedQuotes.length > 0 && (
              <p className="text-xs text-gray-400">
                Make sure you've assigned your badges, then see your results.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Summary - only show on mobile */}
      {!isMouseDevice && (agreedQuotes.length > 0 || disagreedQuotes.length > 0) && (
        <div className="text-center text-xs md:text-sm ev-text-secondary">
          <p>
            Agreed: {agreedQuotes.length} • Disagreed: {disagreedQuotes.length}
          </p>
        </div>
      )}

      {/* Continue Button */}
      {(isLastQuote || isComplete) && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleComplete}
            className="ev-button-primary text-base md:text-lg px-8 py-3 animate-gentle-pulse"
          >
            {isMouseDevice ? 'See Your Results' : 'Rank Your Priorities →'}
          </button>
        </div>
      )}
    </div>
  );

  // Question banner displayed above the main content
  const questionBanner = questionText ? (
    <div className="question-banner mb-6">
      <h2 className="font-manrope font-bold text-base md:text-lg text-ev-dark-blue text-center leading-snug">
        {questionText}
      </h2>
    </div>
  ) : null;

  // Desktop: Split layout with sidebar
  if (isMouseDevice) {
    return (
      <div>
        {questionBanner}
        <div className="evaluation-split-layout">
          <div className="evaluation-main-panel">
            {evaluationContent}
          </div>
          <div className="evaluation-sidebar-panel">
            <AgreedQuotesSidebar />
          </div>
        </div>
      </div>
    );
  }

  // Mobile: Single column layout
  return (
    <div>
      {questionBanner}
      {evaluationContent}
    </div>
  );
};
