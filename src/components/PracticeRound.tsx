import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '../motion';
import { useReadRankStore, type BlindQuote } from '../store/useReadRankStore';
import { PRACTICE_QUOTES, PRACTICE_ISSUE } from '../data/practiceData';
import { EvaluationSurface } from './EvaluationSurface';
import { QuestionBanner } from './QuestionBanner';
import { PracticeResultsScreen } from './PracticeResultsScreen';
import type { RankSource } from './RankSource';

export const PracticeRound: React.FC = () => {
  const m = useMotion();
  const {
    practiceProgress,
    agreePractice,
    disagreePractice,
    reorderPracticeAgreed,
    reAgreePractice,
    skipPractice,
    startPractice,
    coachMarksCompleted,
    completeCoachMarks,
  } = useReadRankStore();

  useEffect(() => {
    if (practiceProgress === null) startPractice(PRACTICE_QUOTES);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [showSplash, setShowSplash] = useState(true);
  const [showResults, setShowResults] = useState(false);

  const currentIndex = practiceProgress?.currentIndex ?? 0;
  const agreed = practiceProgress?.agreed ?? [];
  const disagreed = practiceProgress?.disagreed ?? [];
  const currentQuote = PRACTICE_QUOTES[currentIndex];
  const isComplete = currentIndex >= PRACTICE_QUOTES.length;

  const source: RankSource = useMemo(
    () => ({
      agreed: practiceProgress?.agreed ?? [],
      disagreed: practiceProgress?.disagreed ?? [],
      reorder: reorderPracticeAgreed,
      reAgree: reAgreePractice,
    }),
    [practiceProgress?.agreed, practiceProgress?.disagreed, reorderPracticeAgreed, reAgreePractice]
  );

  const onVerdict = (direction: 'agree' | 'disagree', quote: BlindQuote) => {
    if (direction === 'agree') agreePractice(quote);
    else disagreePractice(quote);
  };

  if (showSplash) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ width: '100%', maxWidth: '280px', marginBottom: '2rem' }}>
          <svg viewBox="0 0 200 160" style={{ width: '100%', height: 'auto' }}>
            <g transform="rotate(-8, 100, 80)">
              <rect x="55" y="20" width="90" height="120" rx="8" fill="var(--surface-raised)" stroke="var(--border-subtle)" strokeWidth="1.5" />
              <rect x="65" y="35" width="70" height="8" rx="4" fill="var(--border-subtle)" />
              <rect x="65" y="50" width="55" height="6" rx="3" fill="var(--border-subtle)" />
            </g>
            <g transform="rotate(6, 100, 80)">
              <rect x="55" y="20" width="90" height="120" rx="8" fill="var(--surface-card)" stroke="var(--border-subtle)" strokeWidth="1.5" />
              <rect x="65" y="35" width="70" height="8" rx="4" fill="var(--color-ev-muted-blue)" fillOpacity="0.15" />
              <rect x="65" y="50" width="55" height="6" rx="3" fill="var(--color-ev-muted-blue)" fillOpacity="0.1" />
              <circle cx="100" cy="100" r="18" fill="#fef3c7" stroke="#fde68a" strokeWidth="1" />
              <text x="100" y="107" textAnchor="middle" fontSize="20">🍕</text>
            </g>
            <g opacity="0.4">
              <path d="M30 80 L15 80" stroke="var(--action-primary)" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 75 L15 80 L20 85" stroke="var(--action-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M170 80 L185 80" stroke="var(--color-ev-muted-blue)" strokeWidth="2" strokeLinecap="round" />
              <path d="M180 75 L185 80 L180 85" stroke="var(--color-ev-muted-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          </svg>
        </div>

        <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', color: 'var(--text-heading)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Read &amp; Rank
        </h1>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '24rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Read real quotes without knowing who said them. Agree or disagree, drag to rank your
          favorites, then reveal which candidates you match.
        </p>

        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '1rem 1.25rem', maxWidth: '24rem', marginBottom: '2rem' }}>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.875rem', color: '#92400e', marginBottom: '0.25rem' }}>
            But first, a quick practice round
          </p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: '#a16207', lineHeight: 1.5, margin: 0 }}>
            We&rsquo;ll use a pizza debate so you can get the hang of tapping and dragging to rank.
          </p>
        </div>

        <motion.button onClick={() => setShowSplash(false)} className="ev-button-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          whileHover={m.hover({ scale: 1.03, y: -1 })} whileTap={m.tap({ scale: 0.97 })}>
          Let&rsquo;s try it
        </motion.button>
        <button onClick={skipPractice} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', color: 'var(--text-tertiary)', textDecoration: 'underline', padding: '0.5rem', marginTop: '1rem' }}>
          Skip practice
        </button>
      </div>
    );
  }

  if (showResults) return <PracticeResultsScreen />;

  const header = (
    <div>
      <div className="issue-eyebrow" style={{ cursor: 'default' }} aria-label={`Practice · ${PRACTICE_ISSUE.title}`}>
        <span className="issue-eyebrow-kicker">Practice</span>
        <span className="issue-eyebrow-sep" aria-hidden="true">·</span>
        <span className="issue-eyebrow-topic">{PRACTICE_ISSUE.title}</span>
      </div>
      <QuestionBanner question={PRACTICE_ISSUE.question} />
      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        <button onClick={skipPractice} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-tertiary)', textDecoration: 'underline', padding: '0.5rem' }}>
          Skip practice
        </button>
      </div>
    </div>
  );

  const completeState = (
    <div className="evaluation-complete-card">
      <div className="text-center py-8">
        <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-link)', marginBottom: '0.5rem' }}>Done</div>
        <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
          {agreed.length} agreed · {disagreed.length} disagreed
        </p>
      </div>
    </div>
  );

  return (
    <EvaluationSurface
      currentQuote={currentQuote}
      progress={{ current: Math.min(currentIndex + 1, PRACTICE_QUOTES.length), total: PRACTICE_QUOTES.length }}
      allDone={isComplete}
      onVerdict={onVerdict}
      showTrustFooter={false}
      source={source}
      header={header}
      completeState={completeState}
      reveal={{ label: 'See your pizza rankings', onReveal: () => setShowResults(true), enabled: agreed.length >= 1 }}
      showCoachMarks={!coachMarksCompleted}
      onCoachComplete={completeCoachMarks}
    />
  );
};
