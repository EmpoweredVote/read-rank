import React from 'react';
import { motion, useAnimate } from 'framer-motion';
import { useMotion, DUR, EASE } from '../motion';

interface ActionButtonsProps {
  onAgree: () => void;
  onDisagree: () => void;
  disabled?: boolean;
  /** True on mobile: renders fixed to viewport bottom, full bleed. */
  fixed?: boolean;
  /** Desktop: rendered inside the quote card (two rounded buttons with a gap). */
  inCard?: boolean;
}

const SlashCircle = () => (
  <svg data-icon="slash-circle" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
  </svg>
);
const Check = () => (
  <svg data-icon="check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onAgree, onDisagree, disabled = false, fixed = false, inCard = false }) => {
  const m = useMotion();
  const [sweepScope, animateSweep] = useAnimate();

  const handleAgree = () => {
    if (!m.reduced && sweepScope.current) {
      animateSweep(sweepScope.current, { x: ['-100%', '100%'] }, { duration: m.dur(DUR.flight) / 1000, ease: EASE.standard });
    }
    onAgree();
  };

  const containerClass = ['action-buttons-container', fixed && 'action-buttons-fixed', inCard && 'action-buttons-incard']
    .filter(Boolean).join(' ');

  return (
    <div className={containerClass} role="group" aria-label="Verdict">
      <motion.button onClick={onDisagree} disabled={disabled}
        className="action-button action-button-disagree"
        whileTap={m.tap({ scale: 0.98 })} aria-label="Disagree with this quote">
        <SlashCircle /><span>Disagree</span>
      </motion.button>
      <motion.button onClick={handleAgree} disabled={disabled}
        className="action-button action-button-agree"
        whileTap={m.tap({ scale: 0.98 })} aria-label="Agree with this quote">
        <Check /><span>Agree</span>
        <span ref={sweepScope} className="action-button-sweep" aria-hidden="true" />
      </motion.button>
    </div>
  );
};
