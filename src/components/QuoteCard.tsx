// src/components/QuoteCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import type { BlindQuote } from '../store/useReadRankStore';
import { SourceInfoButton } from './SourceExplainer';

interface QuoteCardProps {
  quote: BlindQuote;
  isStacked?: boolean;
  stackIndex?: number;
  displayNumber?: number;
  showTrustFooter?: boolean;
}

export const QuoteCard = React.forwardRef<HTMLDivElement, QuoteCardProps>(
  ({ quote, isStacked = false, stackIndex = 0, displayNumber, showTrustFooter = true }, ref) => {
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
        {/* Quote number */}
        {displayNumber && (
          <div className="flex items-center gap-2 mb-4">
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 600,
              fontSize: '0.6875rem',
              color: 'var(--text-tertiary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
            }}>
              Quote {displayNumber}
            </span>
            {isStacked && (
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.625rem', color: 'var(--text-tertiary)', opacity: 0.6 }}>
                Preview
              </span>
            )}
          </div>
        )}

        {/* Quote Text */}
        <div
          className="ev-quote-text"
          style={{ fontSize: 'clamp(1.0625rem, 2.5vw, 1.25rem)', paddingLeft: '0.25rem' }}
        >
          {quote.text}
        </div>

        {/* Trust footer */}
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
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.8125rem',
              color: 'var(--text-tertiary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Verified quote.&nbsp; Source shown at the reveal.</span>
            </span>
            <SourceInfoButton />
          </div>
        )}

      </motion.div>
    );
  }
);
QuoteCard.displayName = 'QuoteCard';
