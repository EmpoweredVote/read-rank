import React from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';

interface PhaseNavigationProps {
  onContinue?: () => void;
  onBack?: () => void;
  showContinue?: boolean;
  continueText?: string;
  backText?: string;
}

export const PhaseNavigation: React.FC<PhaseNavigationProps> = ({
  onContinue,
  onBack,
  showContinue = false,
  continueText = "Continue",
  backText = "Back"
}) => {
  const { phase } = useReadRankStore();

  const getCompletedCount = () => {
    const { agreedQuotes, disagreedQuotes } = useReadRankStore.getState();
    return agreedQuotes.length + disagreedQuotes.length;
  };

  const totalQuotes = useReadRankStore.getState().quotesToEvaluate.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-ev-white border-t border-gray-200 p-3 md:p-4 shadow-lg">
      <div className="container mx-auto px-2 md:px-4 max-w-4xl">
        <div className="flex justify-between items-center gap-2">
          {/* Back Button */}
          <div className="flex-1">
            {onBack && (
              <button
                onClick={onBack}
                className="ev-button-secondary text-sm md:text-base"
                aria-label="Go back to previous step"
              >
                {backText}
              </button>
            )}
          </div>

          {/* Progress Indicator - More compact on mobile */}
          <div className="flex-1 text-center">
            {phase === 'evaluation' && totalQuotes > 0 && (
              <div className="font-manrope text-gray-700">
                <div className="text-xs md:text-sm">Completed</div>
                <div className="text-xl md:text-2xl font-bold">{getCompletedCount()}</div>
              </div>
            )}

            {phase === 'ranking' && (
              <span className="ev-text-secondary font-manrope font-semibold text-xs md:text-sm">
                Drag to reorder
              </span>
            )}
            
            {phase === 'results' && (
              <span className="ev-text-secondary font-manrope font-semibold text-xs md:text-sm">
                Your matches
              </span>
            )}
          </div>

          {/* Continue Button */}
          <div className="flex-1 flex justify-end">
            {showContinue && onContinue && (
              <motion.button
                onClick={onContinue}
                className="ev-button-primary animate-gentle-pulse text-sm md:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={continueText}
              >
                {continueText}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
