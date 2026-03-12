import React from 'react';
import { motion } from 'framer-motion';

interface ActionButtonsProps {
  onAgree: () => void;
  onDisagree: () => void;
  disabled?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAgree,
  onDisagree,
  disabled = false,
}) => {
  return (
    <div className="action-buttons-container">
      {/* Disagree Button */}
      <motion.button
        onClick={onDisagree}
        disabled={disabled}
        className="action-button action-button-disagree"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Disagree with this quote"
      >
        <div className="action-button-content">
          <svg
            className="action-button-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          <span className="action-button-label">Disagree</span>
        </div>
      </motion.button>

      {/* Agree Button */}
      <motion.button
        onClick={onAgree}
        disabled={disabled}
        className="action-button action-button-agree"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Agree with this quote"
      >
        <div className="action-button-content">
          <svg
            className="action-button-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="action-button-label">Agree</span>
        </div>
      </motion.button>
    </div>
  );
};
