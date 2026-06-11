import React from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { PRACTICE_CHARACTERS } from '../data/practiceData';

export const PracticeResultsScreen: React.FC = () => {
  const { practiceProgress, completePractice } = useReadRankStore();
  const agreed = practiceProgress?.agreed ?? [];
  const disagreed = practiceProgress?.disagreed ?? [];

  const renderCard = (quoteId: string, text: string, token: string, idx: number, kind: 'agreed' | 'disagreed') => {
    const character = PRACTICE_CHARACTERS.find((c) => c.id === token);
    const accent = kind === 'agreed' ? 'var(--color-ev-muted-blue)' : 'var(--border-medium)';
    return (
      <motion.div key={quoteId}
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${accent}`, borderRadius: '0.625rem', overflow: 'hidden' }}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        {character && (
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-sunken)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: character.avatar?.bg ?? '#e2ebef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0, filter: kind === 'disagreed' ? 'grayscale(0.5)' : undefined, opacity: kind === 'disagreed' ? 0.7 : 1 }}>
                  {character.avatar?.emoji ?? '🍕'}
                </div>
                <div>
                  <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)', margin: 0 }}>{character.name}</h3>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{character.title}</span>
                </div>
              </div>
              <span style={{
                fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', fontWeight: 600,
                color: kind === 'agreed' ? 'var(--agree)' : 'var(--disagree)',
                backgroundColor: kind === 'agreed' ? 'var(--agree-bg)' : 'var(--disagree-bg-strong)',
                padding: '0.25rem 0.625rem', borderRadius: '9999px',
              }}>
                {kind === 'agreed' ? `Rank ${idx + 1}` : 'Disagreed'}
              </span>
            </div>
          </div>
        )}
        <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
          <p className="ev-quote-text" style={{ fontSize: '0.9375rem', margin: 0 }}>&ldquo;{text}&rdquo;</p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="pb-12">
      <motion.div className="text-center max-w-2xl mx-auto mb-8"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: 'var(--text-heading)', marginBottom: '0.375rem', letterSpacing: '-0.02em' }}>
          Your Pizza Topping Rankings
        </h2>
        <p style={{ fontFamily: "'Manrope', sans-serif", color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Here&rsquo;s who said what — the pizza pundits revealed!
        </p>
      </motion.div>

      <div className="max-w-2xl mx-auto space-y-4 mb-4">
        {agreed.map((q, i) => renderCard(q.id, q.text, q.candidateToken, i, 'agreed'))}
      </div>
      <div className="max-w-2xl mx-auto space-y-4 mb-8">
        {disagreed.map((q, i) => renderCard(q.id, q.text, q.candidateToken, agreed.length + i, 'disagreed'))}
      </div>

      <motion.div className="flex justify-center pt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <motion.button onClick={completePractice} className="ev-button-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
          You have the hang of it.&nbsp; Pick a real race.
        </motion.button>
      </motion.div>
    </div>
  );
};
