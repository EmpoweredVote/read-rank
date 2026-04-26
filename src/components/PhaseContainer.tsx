import React, { useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { useAuthState } from '../hooks/useAuthState';
import { postVerdicts } from '../utils/verdictSync';
import { apiFetch } from '../lib/auth';
import { useEvContextPromotion } from '@empoweredvote/ev-ui';
import { IssueHub } from './IssueHub';
import { EvaluationPhase } from './EvaluationPhase';
import { ResultsPhase } from './ResultsPhase';
import { PracticeRound } from './PracticeRound';

const EASE_CURVE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const getPageTransition = (phase: string, prefersReducedMotion: boolean | null) => {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.1 },
    };
  }

  switch (phase) {
    case 'evaluation':
      // Slides up + fades in (entering from hub)
      return {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        transition: { duration: 0.3, ease: EASE_CURVE },
      };
    case 'results':
      // Results header slides down (continuation feel from evaluation)
      return {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 16 },
        transition: { duration: 0.3, ease: EASE_CURVE },
      };
    case 'hub':
    default:
      // Default fade + slight slide up
      return {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.25, ease: EASE_CURVE },
      };
  }
};

export const PhaseContainer: React.FC = () => {
  const { phase, issueProgress, practiceCompleted, startPractice } = useReadRankStore();
  const { isLoggedIn, userId } = useAuthState();
  const hasSynced = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (phase === 'results' && isLoggedIn && !hasSynced.current) {
      hasSynced.current = true;
      // Pass userId so postVerdicts can mirror to the authed ev-context slice
      // (260426-mc5).
      postVerdicts(issueProgress, userId);
    }
  }, [phase, isLoggedIn, userId, issueProgress]);

  // 260426-mw6 — guest → authed verdicts promotion. Build the API-empty signal
  // from the local store: if no issueProgress entries have any ranked or
  // disagreed quotes, treat the API as empty for this domain. (We don't fetch
  // /compass/verdicts on mount in this view — postVerdicts is the only write
  // path — so the local store is the best available proxy.)
  const localVerdictMap = useMemo(() => {
    const m: Record<string, 'agreed' | 'disagreed'> = {};
    for (const progress of Object.values(issueProgress)) {
      for (const q of progress.rankedQuotes) m[q.id] = 'agreed';
      for (const q of progress.disagreedQuotes) m[q.id] = 'disagreed';
    }
    return m;
  }, [issueProgress]);

  const verdictsPromoteWriter = async (verdictPayload: unknown) => {
    const map = (verdictPayload && typeof verdictPayload === 'object')
      ? verdictPayload as Record<string, string>
      : {};
    const body = Object.entries(map)
      .filter(([_q, v]) => v === 'agreed' || v === 'disagreed')
      .map(([quote_id, verdict]) => ({ quote_id, verdict }));
    if (body.length === 0) return;
    const res = await apiFetch('/compass/verdicts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res || !res.ok) {
      throw new Error(`Promotion failed: ${res?.status ?? 'no response'}`);
    }
  };

  const {
    shouldPrompt: promoteVerdictsShouldPrompt,
    payload: promoteVerdictsPayload,
    promote: promoteVerdicts,
    dismiss: dismissVerdictsPromotion,
    status: promoteVerdictsStatus,
    error: promoteVerdictsError,
  } = useEvContextPromotion({
    domain: 'verdicts',
    isLoggedIn,
    userId,
    apiData: localVerdictMap,
    apiWriter: verdictsPromoteWriter,
  });

  // Auto-redirect first-time users to practice
  useEffect(() => {
    if (!practiceCompleted && phase === 'hub') {
      startPractice();
    }
  }, []); // intentionally empty — run once on mount only

  const renderPhase = () => {
    switch (phase) {
      case 'hub':
        return <IssueHub />;
      case 'practice':
        return <PracticeRound />;
      case 'evaluation':
        return <EvaluationPhase />;
      case 'results':
        return <ResultsPhase />;
      default:
        return <IssueHub />;
    }
  };

  return (
    <div className="min-h-[60vh]">
      {phase === 'results' && promoteVerdictsShouldPrompt && (
        <VerdictsPromotionBanner
          payload={promoteVerdictsPayload}
          onSave={promoteVerdicts}
          onDismiss={dismissVerdictsPromotion}
          status={promoteVerdictsStatus}
          error={promoteVerdictsError}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          {...getPageTransition(phase, prefersReducedMotion)}
        >
          {renderPhase()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// 260426-mw6 — inline banner shown on the results screen when ev-context has
// guest verdicts but the local store is empty for this user.
interface VerdictsPromotionBannerProps {
  payload: unknown;
  onSave: () => void;
  onDismiss: () => void;
  status: 'idle' | 'saving' | 'saved' | 'error';
  error: Error | null;
}
const VerdictsPromotionBanner: React.FC<VerdictsPromotionBannerProps> = ({
  payload, onSave, onDismiss, status, error,
}) => {
  const map = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};
  const count = Object.keys(map).length;
  if (count === 0) return null;
  const saving = status === 'saving';
  return (
    <div
      role="status"
      style={{
        margin: '0 auto 1rem',
        maxWidth: '32rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        backgroundColor: '#e8f4f6',
        border: '1px solid #bcdde4',
        fontFamily: "'Manrope', sans-serif",
        fontSize: '0.875rem',
        color: '#003E4D',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        Save your earlier <strong>{count}</strong> verdict{count === 1 ? '' : 's'} to your account?
        {status === 'error' && error && (
          <div style={{ color: '#e64a34', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Couldn't save: {error.message}. Try again?
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        style={{
          padding: '0.4rem 1rem', borderRadius: '9999px', border: 'none',
          backgroundColor: '#00657c', color: '#fff',
          fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
          cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        disabled={saving}
        aria-label="Dismiss"
        style={{
          padding: '0.25rem 0.5rem', border: 'none', background: 'transparent',
          color: '#64748b', fontSize: '1.125rem', lineHeight: 1, cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
};
