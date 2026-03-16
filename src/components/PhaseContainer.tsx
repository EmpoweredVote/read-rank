import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { useAuthState } from '../hooks/useAuthState';
import { postVerdicts } from '../utils/verdictSync';
import { IssueHub } from './IssueHub';
import { EvaluationPhase } from './EvaluationPhase';
import { ResultsPhase } from './ResultsPhase';
import { PracticeRound } from './PracticeRound';

const EASE_CURVE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const getPageTransition = (phase: string, prefersReducedMotion: boolean | null) => {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.1 },
    };
  }

  switch (phase) {
    case 'evaluation':
      // Slides up + fades in (entering from hub)
      return {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        transition: { duration: 0.3, ease: EASE_CURVE },
      };
    case 'results':
      // Results header slides down (continuation feel from evaluation)
      return {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 16 },
        transition: { duration: 0.3, ease: EASE_CURVE },
      };
    case 'hub':
    default:
      // Default fade + slight slide up
      return {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.25, ease: EASE_CURVE },
      };
  }
};

export const PhaseContainer: React.FC = () => {
  const { phase, issueProgress, practiceCompleted, startPractice } = useReadRankStore();
  const { isLoggedIn } = useAuthState();
  const hasSynced = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (phase === 'results' && isLoggedIn && !hasSynced.current) {
      hasSynced.current = true;
      postVerdicts(issueProgress);
    }
  }, [phase, isLoggedIn, issueProgress]);

  // Auto-redirect first-time users to practice
  useEffect(() => {
    if (!practiceCompleted && phase === 'hub') {
      startPractice();
    }
  }, []); // intentionally empty — run once on mount only

  const renderPhase = () => {
    switch (phase) {
      case 'hub':
        return <IssueHub />;
      case 'practice':
        return <PracticeRound />;
      case 'evaluation':
        return <EvaluationPhase />;
      case 'results':
        return <ResultsPhase />;
      default:
        return <IssueHub />;
    }
  };

  return (
    <div className="min-h-[60vh]">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          {...getPageTransition(phase, prefersReducedMotion)}
        >
          {renderPhase()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
