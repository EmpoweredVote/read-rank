import React from 'react';
import { Link } from 'react-router-dom';
import { useReadRankStore } from '../store/useReadRankStore';

export const ProgressHeader: React.FC = () => {
  const { phase, issueTitle, reset, setPhase, goToHub } = useReadRankStore();

  const getProgressPercentage = () => {
    switch (phase) {
      case 'hub':
        return 0;
      case 'evaluation':
        return 33;
      case 'ranking':
        return 66;
      case 'results':
        return 100;
      default:
        return 0;
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset and start over? This will clear all your progress.')) {
      reset();
      window.location.reload();
    }
  };

  const handleBack = () => {
    if (phase === 'evaluation') {
      goToHub();
    } else if (phase === 'ranking') {
      setPhase('evaluation');
    } else if (phase === 'results') {
      setPhase('ranking');
    }
  };

  const canGoBack = phase === 'evaluation' || phase === 'ranking' || phase === 'results';
  const isInHub = phase === 'hub';

  return (
    <div className="bg-ev-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-2 md:py-4 max-w-4xl">
        {/* Top Row: Back button, Main Title, Reset */}
        <div className="flex items-center justify-between mb-2 md:mb-3">
          {/* Back Button - Left side */}
          <div className="flex-1">
            {canGoBack ? (
              <button
                onClick={handleBack}
                className="text-sm md:text-base text-ev-light-blue hover:text-ev-coral transition-colors duration-200 font-manrope font-medium flex items-center gap-1"
                aria-label="Go back"
              >
                <span className="text-lg">←</span>
                <span className="hidden sm:inline">
                  {phase === 'evaluation' ? 'Issues' : 'Back'}
                </span>
              </button>
            ) : (
              <div></div>
            )}
          </div>

          {/* Main App Title - Center */}
          <h1 className="ev-heading text-xl md:text-2xl text-center flex-shrink-0">
            Read & Rank
          </h1>

          {/* Reset Button & Animation Options - Right side */}
          <div className="flex-1 flex justify-end items-center gap-3">
            <Link
              to="/animation-options"
              className="text-xs text-gray-400 hover:text-ev-light-blue transition-colors duration-200 font-manrope font-medium"
              title="View animation options"
            >
              🎮 Animations
            </Link>
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-ev-coral transition-colors duration-200 font-manrope font-medium"
              title="Reset and start over"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Issue Title and Progress - Only show when not in hub */}
        {!isInHub && (
          <>
            {issueTitle && (
              <div className="text-center mb-2">
                <h2 className="ev-text-secondary text-sm md:text-base font-manrope font-medium">
                  {issueTitle}
                </h2>
              </div>
            )}

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2 mb-1">
              <div
                className="ev-coral h-1.5 md:h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            {/* Phase Indicator */}
            <div className="flex justify-between text-xs text-ev-light-blue">
              <span className={phase === 'evaluation' ? 'font-bold text-ev-coral' : ''}>
                Evaluate
              </span>
              <span className={phase === 'ranking' ? 'font-bold text-ev-coral' : ''}>
                Rank
              </span>
              <span className={phase === 'results' ? 'font-bold text-ev-coral' : ''}>
                Results
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
