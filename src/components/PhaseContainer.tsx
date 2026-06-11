import React, { useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import { useAuthState } from '../hooks/useAuthState';
import { postVerdicts, verdictMapToRecords } from '../utils/verdictSync';
import { apiFetch } from '../lib/auth';
import { useEvContextPromotion } from '@empoweredvote/ev-ui';
import { Landing } from './Landing';
import { RaceHub } from './RaceHub';
import { EvaluationPhase } from './EvaluationPhase';
import { ResultsPhase } from './ResultsPhase';
import { PracticeRound } from './PracticeRound';
import { PRACTICE_QUOTES } from '../data/practiceData';

const EASE_CURVE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const getPageTransition = (phase: string, prefersReducedMotion: boolean | null) => {
  if (prefersReducedMotion) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.1 } };
  }
  switch (phase) {
    case 'evaluation':
      return { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.3, ease: EASE_CURVE } };
    case 'results':
      return { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 16 }, transition: { duration: 0.3, ease: EASE_CURVE } };
    case 'hub':
    default:
      return { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.25, ease: EASE_CURVE } };
  }
};

export const PhaseContainer: React.FC = () => {
  const { phase, currentRaceId, raceProgress, practiceCompleted, startPractice, getRaceVerdicts } = useReadRankStore();
  const { isLoggedIn, userId } = useAuthState();
  const hasSynced = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  // Sync verdicts (rank-bearing) to the API when the results screen opens.
  useEffect(() => {
    if (phase === 'results' && isLoggedIn && currentRaceId && !hasSynced.current) {
      hasSynced.current = true;
      postVerdicts(getRaceVerdicts(currentRaceId), userId);
    }
    if (phase !== 'results') hasSynced.current = false;
  }, [phase, isLoggedIn, userId, currentRaceId, getRaceVerdicts]);

  // Guest → authed verdicts promotion. Build the "API-empty" signal from the
  // local store: a map of every agreed/disagreed quote across all races.
  const localVerdictMap = useMemo(() => {
    const m: Record<string, 'agreed' | 'disagreed'> = {};
    for (const race of Object.values(raceProgress)) {
      for (const q of race.agreed) m[q.id] = 'agreed';
      for (const t of Object.values(race.topics)) for (const q of t.disagreed) m[q.id] = 'disagreed';
    }
    return m;
  }, [raceProgress]);

  const verdictsPromoteWriter = async (verdictPayload: unknown) => {
    const map = (verdictPayload && typeof verdictPayload === 'object') ? (verdictPayload as Record<string, 'agreed' | 'disagreed'>) : {};
    const records = verdictMapToRecords(map);
    if (records.length === 0) return;
    const res = await apiFetch('/compass/verdicts', { method: 'POST', body: JSON.stringify({ verdicts: records }) });
    if (!res || !res.ok) throw new Error(`Promotion failed: ${res?.status ?? 'no response'}`);
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

  // First-time users go to practice.
  useEffect(() => {
    if (!practiceCompleted && phase === 'hub') startPractice(PRACTICE_QUOTES);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderPhase = () => {
    switch (phase) {
      case 'hub': return <Landing />;
      case 'practice': return <PracticeRound />;
      case 'evaluation': return <EvaluationPhase />;
      case 'results': return <ResultsPhase />;
      default: return <RaceHub />;
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
        <motion.div key={phase} {...getPageTransition(phase, prefersReducedMotion)}>
          {renderPhase()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

interface VerdictsPromotionBannerProps {
  payload: unknown;
  onSave: () => void;
  onDismiss: () => void;
  status: 'idle' | 'saving' | 'saved' | 'error';
  error: Error | null;
}
const VerdictsPromotionBanner: React.FC<VerdictsPromotionBannerProps> = ({ payload, onSave, onDismiss, status, error }) => {
  const map = (payload && typeof payload === 'object') ? (payload as Record<string, unknown>) : {};
  const count = Object.keys(map).length;
  if (count === 0) return null;
  const saving = status === 'saving';
  return (
    <div role="status" style={{
      margin: '0 auto 1rem', maxWidth: '32rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.75rem 1rem', borderRadius: '0.5rem', backgroundColor: 'var(--banner-from)',
      border: '1px solid var(--banner-border)', fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', color: 'var(--banner-heading)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        Save your earlier <strong>{count}</strong> verdict{count === 1 ? '' : 's'} to your account?
        {status === 'error' && error && (
          <div style={{ color: 'var(--color-ev-coral)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Couldn&apos;t save: {error.message}. Try again?
          </div>
        )}
      </div>
      <button type="button" onClick={onSave} disabled={saving} style={{
        padding: '0.4rem 1rem', borderRadius: '9999px', border: 'none', backgroundColor: 'var(--color-ev-muted-blue)',
        color: '#fff', fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.8125rem',
        cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
      }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onDismiss} disabled={saving} aria-label="Dismiss" style={{
        padding: '0.25rem 0.5rem', border: 'none', background: 'transparent', color: 'var(--text-secondary)',
        fontSize: '1.125rem', lineHeight: 1, cursor: 'pointer',
      }}>
        ×
      </button>
    </div>
  );
};
