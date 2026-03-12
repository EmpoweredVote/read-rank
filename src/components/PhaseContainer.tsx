import React from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { IssueHub } from './IssueHub';
import { EvaluationPhase } from './EvaluationPhase';
import { RankingPhase } from './RankingPhase';
import { ResultsPhase } from './ResultsPhase';

export const PhaseContainer: React.FC = () => {
  const { phase } = useReadRankStore();

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
