// src/components/ActionButtons.tsx
import React from 'react';
import { motion, useAnimate } from 'framer-motion';
import { useMotion, DUR, EASE } from '../motion';

interface ActionButtonsProps {
  onAgree: () => void;
  onDisagree: () => void;
  disabled?: boolean;
  /** True on mobile: renders fixed to viewport bottom, full bleed. */
  fixed?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onAgree, onDisagree, disabled = false, fixed = false }) => {
  const m = useMotion();
  const [sweepScope, animateSweep] = useAnimate();

  const handleAgree = () => {
    if (!m.reduced && sweepScope.current) {
      animateSweep(sweepScope.current, { x: ['-100%', '100%'] }, { duration: m.dur(DUR.flight) / 1000, ease: EASE.standard });
    }
    onAgree();
  };

  return (
    <div className={`action-buttons-container ${fixed ? 'action-buttons-fixed' : ''}`} role="group" aria-label="Verdict">
      <motion.button
        onClick={onDisagree}
        disabled={disabled}
        className="action-button action-button-disagree"
        whileTap={m.tap({ scale: 0.98 })}
        aria-label="Disagree with this quote"
      >
        DISAGREE
      </motion.button>
      <motion.button
        onClick={handleAgree}
        disabled={disabled}
        className="action-button action-button-agree"
        whileTap={m.tap({ scale: 0.98 })}
        aria-label="Agree with this quote"
      >
        AGREE
        <span ref={sweepScope} className="action-button-sweep" aria-hidden="true" />
      </motion.button>
    </div>
  );
};
