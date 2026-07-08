// src/components/QuoteCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import type { BlindQuote } from '../store/useReadRankStore';
import { SourceInfoButton } from './SourceExplainer';

interface QuoteCardProps {
  quote: BlindQuote;
  isStacked?: boolean;
  stackIndex?: number;
  /** Show the sourcing-methodology info button (hidden in the pizza warm-up). */
  showTrustFooter?: boolean;
}

export const QuoteCard = React.forwardRef<HTMLDivElement, QuoteCardProps>(
  ({ quote, isStacked = false, stackIndex = 0, showTrustFooter = true }, ref) => {
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
          style={{ fontSize: 'clamp(1.0625rem, 2.5vw, 1.25rem)', paddingLeft: '0.25rem' }}
        >
          {quote.text}
        </div>

      </motion.div>
    );
  }
);
QuoteCard.displayName = 'QuoteCard';
