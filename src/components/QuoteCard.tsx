// src/components/QuoteCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import type { BlindQuote } from '../store/useReadRankStore';
import { SourceInfoButton } from './SourceExplainer';

/** Shared with the flight clone so its text matches the card at landing. */
export const QUOTE_TEXT_FONT = 'clamp(1.125rem, 2.4vw, 1.375rem)';

interface QuoteCardProps {
  quote: BlindQuote;
  isStacked?: boolean;
  stackIndex?: number;
  /** Show the sourcing-methodology info button (hidden in the pizza warm-up). */
  showTrustFooter?: boolean;
  children?: React.ReactNode;
}

export const QuoteCard = React.forwardRef<HTMLDivElement, QuoteCardProps>(
  ({ quote, isStacked = false, stackIndex = 0, showTrustFooter = true, children }, ref) => {
    const scaleValue = isStacked ? 0.95 - stackIndex * 0.02 : 1;
    const zIndexValue = isStacked ? 100 - stackIndex * 10 : 100;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2 }}
        style={{
          scale: scaleValue,
          zIndex: zIndexValue,
          position: 'relative',
          boxShadow: isStacked
            ? `${stackIndex * 3}px ${stackIndex * 3}px 0 rgba(0,0,0,0.04)`
            : undefined,
        }}
        className={`ev-quote-card ${!isStacked ? 'ev-quote-card-active' : ''} w-full`}
      >
        {/* Sourcing-methodology affordance: a quiet info button in the corner so
            the quote itself owns the card. The explainer is one tap away; the
            source is revealed only at the reveal. */}
        {showTrustFooter && (
          <div
            data-no-drag
            onPointerDownCapture={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', zIndex: 1 }}
          >
            <SourceInfoButton />
          </div>
        )}

        {/* Quote Text */}
        <div
          className="ev-quote-text"
          style={{ fontSize: QUOTE_TEXT_FONT }}
        >
          {quote.text}
        </div>
        {showTrustFooter && (
          <p className="rr-blind-line">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M1 1l22 22" />
            </svg>
            Speaker and source are shown when you see your ballot
          </p>
        )}
        {children}
      </motion.div>
    );
  }
);
QuoteCard.displayName = 'QuoteCard';
