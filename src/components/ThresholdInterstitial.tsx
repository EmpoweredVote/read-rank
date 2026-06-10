import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface ThresholdInterstitialProps {
  rankedCount: number;
  topicCount: number;
  onContinue: () => void;
}

/**
 * The threshold moment (REDESIGN_SPEC §1.4 step 1): a dark beat between
 * ranking and unmasking. User-paced (no auto-advance) — the recorded
 * deviation from the spec's 1-2s timer, for SR and reduced-motion safety.
 */
export const ThresholdInterstitial: React.FC<ThresholdInterstitialProps> = ({ rankedCount, topicCount, onContinue }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="reveal-threshold">
      <motion.div
        className="reveal-threshold-inner"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="reveal-threshold-count">
          You ranked {rankedCount} quote{rankedCount === 1 ? '' : 's'} across {topicCount} topic{topicCount === 1 ? '' : 's'}.
        </p>
        <h2 className="reveal-threshold-headline">
          Now see <span className="reveal-threshold-who">who</span> you agreed with.
        </h2>
        <button type="button" className="ev-button-primary reveal-threshold-button" onClick={onContinue}>
          See who you agreed with
        </button>
      </motion.div>
    </div>
  );
};
