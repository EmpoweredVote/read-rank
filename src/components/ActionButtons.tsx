// src/components/ActionButtons.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface ActionButtonsProps {
  onAgree: () => void;
  onDisagree: () => void;
  disabled?: boolean;
  /** True on mobile: renders fixed to viewport bottom, full bleed. */
  fixed?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAgree,
  onDisagree,
  disabled = false,
  fixed = false,
}) => {
  return (
    <div
      className={`action-buttons-container ${fixed ? 'action-buttons-fixed' : ''}`}
      role="group"
      aria-label="Verdict"
    >
      <motion.button
        onClick={onDisagree}
        disabled={disabled}
        className="action-button action-button-disagree"
        whileTap={{ scale: 0.98 }}
        aria-label="Disagree with this quote"
      >
        DISAGREE
      </motion.button>
      <motion.button
        onClick={onAgree}
        disabled={disabled}
        className="action-button action-button-agree"
        whileTap={{ scale: 0.98 }}
        aria-label="Agree with this quote"
      >
        AGREE
      </motion.button>
    </div>
  );
};
