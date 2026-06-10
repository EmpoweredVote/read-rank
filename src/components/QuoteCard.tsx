import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, animate, MotionValue } from 'framer-motion';
import type { BlindQuote } from '../store/useReadRankStore';
import { SourceInfoButton } from './SourceExplainer';

interface QuoteCardProps {
  quote: BlindQuote;
  isStacked?: boolean;
  stackIndex?: number;
  displayNumber?: number;
  onDragStateChange?: (isDragging: boolean, x: MotionValue<number>) => void;
  externalAnimating?: boolean;
  /** Hide for practice rounds, where quotes are not real candidate statements. */
  showTrustFooter?: boolean;
  onAgree: (quote: BlindQuote) => void;
  onDisagree: (quote: BlindQuote) => void;
}

export const QuoteCard = React.forwardRef<HTMLDivElement, QuoteCardProps>(
  ({ quote, isStacked = false, stackIndex = 0, displayNumber, onDragStateChange, externalAnimating = false, showTrustFooter = true, onAgree, onDisagree }, ref) => {
  const handleAgree = onAgree;
  const handleDisagree = onDisagree;
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isCurrentlyAnimating = isAnimating || externalAnimating;
  const isDraggable = !isStacked;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
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

    const SWIPE_THRESHOLD = 150;

    if (Math.abs(offset.x) > SWIPE_THRESHOLD) {
      await handleSwipe(offset.x > 0 ? 1 : -1);
    } else {
      await animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  const handleSwipe = async (direction: number) => {
    if (isCurrentlyAnimating || !isDraggable) return;

    setIsAnimating(true);

    const offScreenX = direction > 0 ? 500 : -500;

    await animate(x, offScreenX, { duration: 0.4, ease: [0.4, 0, 0.2, 1] }).finished;

    if (direction > 0) {
      handleAgree(quote);
    } else {
      handleDisagree(quote);
    }

    x.set(0);
    setIsAnimating(false);
  };

  const scaleValue = isStacked ? 0.95 - (stackIndex * 0.02) : 1;
  const zIndexValue = isStacked ? 100 - (stackIndex * 10) : 100;

  return (
    <motion.div
      ref={ref}
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
        zIndex: zIndexValue,
        boxShadow: isStacked
          ? `${stackIndex * 3}px ${stackIndex * 3}px 0 rgba(0,0,0,0.04)`
          : undefined
      }}
      className={`
        ev-quote-card w-full max-w-lg md:max-w-xl relative
        ${isDraggable && !isCurrentlyAnimating ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        select-none touch-none
        ${isCurrentlyAnimating ? 'pointer-events-none' : ''}
        ${isDragging ? 'ev-quote-card-dragging' : ''}
      `}
      whileHover={isDraggable && !isCurrentlyAnimating && !isDragging ? { scale: 1.01, y: -2 } : {}}
      transition={{ duration: 0.2 }}
    >
      {/* Quote number */}
      {displayNumber && (
        <div className="flex items-center gap-2 mb-4">
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 600,
            fontSize: '0.6875rem',
            color: '#94a3b8',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
          }}>
            Quote {displayNumber}
          </span>
          {isStacked && (
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.625rem',
              color: '#94a3b8',
              opacity: 0.6,
            }}>
              Preview
            </span>
          )}
        </div>
      )}

      {/* Quote Text — the hero */}
      <div
        className="ev-quote-text"
        style={{
          fontSize: 'clamp(1.0625rem, 2.5vw, 1.25rem)',
          paddingLeft: '0.25rem',
        }}
      >
        {quote.text}
      </div>

      {/* Blind-trust footer — generic trust, zero provenance (REDESIGN_SPEC §3.1).
          Capture-phase stop keeps pointer events from starting a card drag;
          data-no-drag is a marker for future drag code, nothing consumes it yet. */}
      {showTrustFooter && (
        <div
          data-no-drag
          onPointerDownCapture={(e) => e.stopPropagation()}
          style={{
            marginTop: '1.25rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.8125rem',
              color: 'var(--text-tertiary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>Verified quote.&nbsp; Source shown at the reveal.</span>
          </span>
          <SourceInfoButton />
        </div>
      )}
    </motion.div>
  );
});
QuoteCard.displayName = 'QuoteCard';
