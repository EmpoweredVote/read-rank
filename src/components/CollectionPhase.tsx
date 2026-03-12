import React from 'react';
import { motion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { PhaseNavigation } from './PhaseNavigation';

export const CollectionPhase: React.FC = () => {
  const { agreedQuotes, setPhase } = useReadRankStore();

  const handleContinue = () => {
    setPhase('ranking');
  };

  const handleBack = () => {
    setPhase('evaluation');
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Instructional Text */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <p className="ev-instruction text-lg md:text-xl">
          All done! Now click on 'Continue' to move to the next step.
        </p>
      </motion.div>

      {/* Agreed Quotes Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side - Instructions */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h3 className="ev-heading text-xl md:text-2xl">
            Your Selected Quotes
          </h3>
          <p className="ev-text-primary text-base md:text-lg leading-relaxed">
            These are the responses you agreed with. In the next step, you'll be able to 
            rank them from most to least aligned with your views.
          </p>
          <div className="bg-ev-light-blue bg-opacity-10 rounded-lg p-4">
            <p className="ev-text-primary text-sm font-medium">
              💡 Tip: Think about which quotes best represent your priorities and values.
            </p>
          </div>
        </motion.div>

        {/* Right side - Quote Cards */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          {agreedQuotes.length > 0 ? (
            agreedQuotes.map((quote, index) => (
              <motion.div
                key={quote.id}
                className="ev-quote-card"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: 0.8 + (index * 0.1), 
                  duration: 0.4,
                  ease: "easeOut"
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="font-manrope font-bold text-lg">
                    Quote {quote.id.replace('q', '')}
                  </span>
                  <span className="text-sm opacity-80">#{index + 1}</span>
                </div>
                <div className="font-manrope font-medium text-base leading-relaxed">
                  {quote.text}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="ev-quote-card text-center">
              <p className="text-lg mb-4">No quotes selected</p>
              <p className="text-sm opacity-80">
                You can go back and evaluate more quotes, or continue with your current selections.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <PhaseNavigation
        onContinue={handleContinue}
        onBack={handleBack}
        showContinue={true}
        continueText="Rank Your Priorities"
        backText="Back to Evaluation"
      />
    </div>
  );
};