import React, { useEffect } from 'react';
import { useReadRankStore } from '../store/useReadRankStore';

export interface FirstAgreeCoachProps {
  /** Mobile points at the dock (tap); desktop points at the sidebar (drag). */
  variant: 'mobile' | 'desktop';
}

/**
 * One-time teach-by-doing caption after the user's first real agree
 * (REDESIGN_SPEC pain point #4: contextual coaching over tutorial screens).
 * Dismisses on ANY interaction and never shows again (persisted flag).
 */
export const FirstAgreeCoach: React.FC<FirstAgreeCoachProps> = ({ variant }) => {
  const { firstAgreeCoached, completeFirstAgreeCoach } = useReadRankStore();

  useEffect(() => {
    if (firstAgreeCoached) return;
    const dismiss = () => completeFirstAgreeCoach();
    window.addEventListener('pointerdown', dismiss, { once: true });
    window.addEventListener('keydown', dismiss, { once: true });
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [firstAgreeCoached, completeFirstAgreeCoach]);

  if (firstAgreeCoached) return null;

  return (
    <div role="status" className={`first-agree-coach first-agree-coach-${variant}`}>
      Filed as your 1st choice.&nbsp;{' '}
      {variant === 'mobile' ? 'Tap anytime to reorder.' : 'Drag anytime to reorder.'}
    </div>
  );
};
