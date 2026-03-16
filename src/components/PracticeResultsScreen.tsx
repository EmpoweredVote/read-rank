import React from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_CHARACTERS } from '../data/practiceData';

export const PracticeResultsScreen: React.FC = () => {
  const { practiceProgress, completePractice } = useReadRankStore();

  const rankedQuotes = practiceProgress?.rankedQuotes ?? [];
  const disagreedQuotes = practiceProgress?.disagreedQuotes ?? [];

  return (
    <div className="pb-12">
      {/* Header */}
      <motion.div
        className="text-center max-w-2xl mx-auto mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          color: '#1a1a2e',
          marginBottom: '0.375rem',
          letterSpacing: '-0.02em',
        }}>
          Your Pizza Topping Rankings
        </h2>
        <p style={{ fontFamily: "'Manrope', sans-serif", color: '#64748b', fontSize: '0.9375rem' }}>
          Here&rsquo;s who said what — the pizza pundits have been revealed!
        </p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        className="max-w-lg mx-auto mb-8"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        style={{
          backgroundColor: '#fffefb',
          border: '1px solid #e8e2d9',
          borderRadius: '0.625rem',
          padding: '1.25rem',
        }}
      >
        <div className="grid grid-cols-2 gap-4 text-center">
          {[
            { label: 'Agreed', value: rankedQuotes.length, color: '#00657c' },
            { label: 'Disagreed', value: disagreedQuotes.length, color: '#78716c' },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: stat.color }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: '0.6875rem',
                color: '#94a3b8',
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Agreed quote result cards */}
      <div className="max-w-2xl mx-auto space-y-4 mb-4">
        {rankedQuotes.map((quote, index) => {
          const character = PRACTICE_CHARACTERS.find(c => c.id === quote.candidateId);
          return (
            <motion.div
              key={quote.id}
              style={{
                backgroundColor: '#fffefb',
                border: '1px solid #e8e2d9',
                borderLeft: '3px solid #00657c',
                borderRadius: '0.625rem',
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Character header */}
              {character && (
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e8e2d9', backgroundColor: '#faf7f2' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: character.avatar?.bg ?? '#e2ebef',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                      }}>
                        {character.avatar?.emoji ?? '🍕'}
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a2e', margin: 0 }}>
                          {character.name}
                        </h3>
                        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#64748b' }}>
                          {character.title}
                        </span>
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#0e7490',
                      backgroundColor: '#ecfeff',
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      Rank {index + 1}
                    </span>
                  </div>
                </div>
              )}

              {/* Quote */}
              <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
                <p className="ev-quote-text" style={{ fontSize: '0.9375rem', margin: 0 }}>
                  &ldquo;{quote.text}&rdquo;
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Disagreed quote result cards */}
      <div className="max-w-2xl mx-auto space-y-4 mb-8">
        {disagreedQuotes.map((quote, index) => {
          const character = PRACTICE_CHARACTERS.find(c => c.id === quote.candidateId);
          const overallIndex = rankedQuotes.length + index;
          return (
            <motion.div
              key={quote.id}
              style={{
                backgroundColor: '#fffefb',
                border: '1px solid #e8e2d9',
                borderLeft: '3px solid #d4cdc3',
                borderRadius: '0.625rem',
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: overallIndex * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Character header */}
              {character && (
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e8e2d9', backgroundColor: '#faf7f2' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: character.avatar?.bg ?? '#e2ebef',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                        filter: 'grayscale(0.5)',
                        opacity: 0.7,
                      }}>
                        {character.avatar?.emoji ?? '🍕'}
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#1a1a2e', margin: 0 }}>
                          {character.name}
                        </h3>
                        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: '#64748b' }}>
                          {character.title}
                        </span>
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#78716c',
                      backgroundColor: '#f5f5f4',
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      Disagreed
                    </span>
                  </div>
                </div>
              )}

              {/* Quote */}
              <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
                <p className="ev-quote-text" style={{ fontSize: '0.9375rem', margin: 0 }}>
                  &ldquo;{quote.text}&rdquo;
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.div
        className="flex justify-center pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button
          onClick={completePractice}
          className="ev-button-primary"
          style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Start exploring real issues
        </motion.button>
      </motion.div>
    </div>
  );
};
