import React, { useEffect, useRef } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { useAuthState } from '../hooks/useAuthState';
import { postVerdicts } from '../utils/verdictSync';
import { IssueHub } from './IssueHub';
import { EvaluationPhase } from './EvaluationPhase';
import { ResultsPhase } from './ResultsPhase';
import { PracticeRound } from './PracticeRound';

export const PhaseContainer: React.FC = () => {
  const { phase, issueProgress, practiceCompleted, startPractice } = useReadRankStore();
  const { isLoggedIn } = useAuthState();
  const hasSynced = useRef(false);

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
      {renderPhase()}
    </div>
  );
};
