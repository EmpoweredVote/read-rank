import React from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';

interface QuickConfirmationProps {
  onConfirm: () => void;
  onReorder: () => void;
}

export const QuickConfirmation: React.FC<QuickConfirmationProps> = ({ onConfirm, onReorder }) => {
  const { getCurrentIssueProgress } = useReadRankStore();

  const progress = getCurrentIssueProgress();
  const rankedQuotes = progress?.rankedQuotes ?? [];

  return (
    <motion.div
      className="quick-confirmation"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <h3 style={{
        fontFamily: "'Fraunces', serif",
        fontSize: '1.25rem',
        fontWeight: 600,
        color: '#1a1a2e',
        marginTop: 0,
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        Your Final Ranking
      </h3>

      {/* Ranked list */}
      <div style={{ marginBottom: '1.25rem' }}>
        {rankedQuotes.map((quote, index) => (
          <div key={quote.id} className="quick-confirmation-item">
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#00657c',
              flexShrink: 0,
              minWidth: '1.5rem',
            }}>
              #{index + 1}
            </span>
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.8125rem',
              color: '#2d2d44',
              lineHeight: 1.4,
            }}>
              {quote.text.length > 80 ? `${quote.text.substring(0, 80)}...` : quote.text}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button onClick={onReorder} className="ev-button-secondary">
          Reorder
        </button>
        <button onClick={onConfirm} className="ev-button-primary">
          Looks Good
        </button>
      </div>
    </motion.div>
  );
};
