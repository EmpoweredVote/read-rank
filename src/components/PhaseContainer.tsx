import React, { useEffect, useRef } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { useAuthState } from '../hooks/useAuthState';
import { postVerdicts } from '../utils/verdictSync';
import { IssueHub } from './IssueHub';
import { EvaluationPhase } from './EvaluationPhase';
import { RankingPhase } from './RankingPhase';
import { ResultsPhase } from './ResultsPhase';

export const PhaseContainer: React.FC = () => {
  const { phase, issueProgress } = useReadRankStore();
  const { isLoggedIn } = useAuthState();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (phase === 'results' && isLoggedIn && !hasSynced.current) {
      hasSynced.current = true;
      postVerdicts(issueProgress);
    }
  }, [phase, isLoggedIn, issueProgress]);

  const renderPhase = () => {
    switch (phase) {
      case 'hub':
        return <IssueHub />;
      case 'evaluation':
        return <EvaluationPhase />;
      case 'ranking':
        return <RankingPhase />;
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
