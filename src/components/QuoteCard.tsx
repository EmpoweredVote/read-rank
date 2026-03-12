import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate, MotionValue } from 'framer-motion';
import { useReadRankStore, type Quote } from '../store/useReadRankStore';

interface QuoteCardProps {
  quote: Quote;
  isStacked?: boolean;
  stackIndex?: number;
  displayNumber?: number; // Optional display number for the quote
  onDragStateChange?: (isDragging: boolean, x: MotionValue<number>) => void;
  externalAnimating?: boolean; // When true, card is being animated externally (buttons/keyboard)
}

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  isStacked = false,
  stackIndex = 0,
  displayNumber,
  onDragStateChange,
  externalAnimating = false
}) => {
  const { agreeWithQuote, disagreeWithQuote } = useReadRankStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Combined animating state (internal swipe or external button/keyboard)
  const isCurrentlyAnimating = isAnimating || externalAnimating;

  // Only the top card (not stacked) should be interactive
  const isDraggable = !isStacked;

  // Motion values for swipe animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-20, 20]);
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0.3, 1, 1, 1, 0.3]);

  const handleDragStart = () => {
    if (!isDraggable) return;
    setIsDragging(true);
    onDragStateChange?.(true, x);
  };

  const handleDragEnd = async (_event: any, info: any) => {
    if (isCurrentlyAnimating || !isDraggable) return;

    setIsDragging(false);
    onDragStateChange?.(false, x);
    const { offset } = info;

    // Decision threshold - must drag past this point and release to commit
    const SWIPE_THRESHOLD = 150;

    if (Math.abs(offset.x) > SWIPE_THRESHOLD) {
      // User released past threshold - commit the swipe
      await handleSwipe(offset.x > 0 ? 1 : -1);
    } else {
      // Reset position - user didn't drag far enough or changed their mind
      await animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  const handleSwipe = async (direction: number) => {
    if (isCurrentlyAnimating || !isDraggable) return;
    
    setIsAnimating(true);
    
    const offScreenX = direction > 0 ? 500 : -500;
    
    // Animate card off screen
    await animate(x, offScreenX, { duration: 0.4, ease: [0.4, 0, 0.2, 1] }).finished;
    
    // Perform the action
    if (direction > 0) {
      agreeWithQuote(quote);
    } else {
      disagreeWithQuote(quote);
    }
    
    // Reset for next card
    x.set(0);
    setIsAnimating(false);
  };

  // Stacked card styling
  const scaleValue = isStacked ? 0.95 - (stackIndex * 0.02) : 1;
  const zIndexValue = isStacked ? 100 - (stackIndex * 10) : 100;

  return (
    <motion.div
      drag={isDraggable && !isCurrentlyAnimating}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragStart={isDraggable ? handleDragStart : undefined}
      onDragEnd={isDraggable ? handleDragEnd : undefined}
      style={{
        x,
        rotate,
        opacity,
        scale: scaleValue,
        zIndex: zIndexValue
      }}
      className={`
        ev-quote-card w-full max-w-lg md:max-w-xl relative
        ${isDraggable && !isCurrentlyAnimating ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        shadow-lg select-none touch-none
        ${isCurrentlyAnimating ? 'pointer-events-none' : ''}
        ${isDragging ? 'ev-quote-card-dragging' : ''}
      `}
      whileHover={isDraggable && !isCurrentlyAnimating && !isDragging ? { scale: 1.02 } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Quote Label - only show if displayNumber is provided */}
      {displayNumber && (
        <div className="flex justify-center items-start mb-4 text-center">
          <span className="font-manrope font-bold text-lg">
            Quote {displayNumber}
          </span>
          {isStacked && (
            <span className="text-xs opacity-60 ml-2">Preview</span>
          )}
        </div>
      )}

      {/* Quote Text */}
      <div className="font-manrope font-medium text-base leading-relaxed">
        {quote.text}
      </div>
    </motion.div>
  );
};