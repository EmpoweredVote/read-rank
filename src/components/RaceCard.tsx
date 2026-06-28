// src/components/RaceCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR, STAGGER } from '../motion';
import { Motif } from './motif/Motif';
import type { Tier, Scope } from '../utils/raceTier';
import type { BoundaryRef } from '../data/api';
import { getStateName } from '../utils/stateNames';

function formatElectionDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface RaceCardProps {
  office: string;
  tier: Tier;
  scope: Scope;
  state: string | null;
  seat?: string | null;
  electionDate?: string | null;
  boundaryRef?: BoundaryRef | null;
  frameRef?: BoundaryRef | null;
  candidateCount: number;
  topicCount: number;
  estMinutes: number;
  progress?: 'not-started' | 'in-progress' | 'partial' | 'complete';
  progressLabel?: string | null;
  disabled?: boolean;
  onSelect: () => void;
  /** When set, the card mounts with a staggered entrance (race grid reveal). */
  enterIndex?: number;
}

export const RaceCard: React.FC<RaceCardProps> = (props) => {
  const {
    office, tier, scope, state, seat, electionDate, boundaryRef, frameRef,
    candidateCount, topicCount, estMinutes,
    progress = 'not-started', progressLabel, disabled, onSelect, enterIndex,
  } = props;

  const stateName = getStateName(state);
  const date = formatElectionDate(electionDate);
  const scopeText = [stateName, date].filter(Boolean).join(' · ');

  const m = useMotion();
  const entrance = enterIndex === undefined
    ? {}
    : { ...m.enter({ y: 12 }), transition: m.transition(DUR.moderate, EASE.settle, { delay: Math.min(enterIndex, 8) * (STAGGER.gridCell / 1000) }) };

  function activate() { if (!disabled) onSelect(); }

  return (
    <motion.button
      {...entrance}
      type="button"
      className={`race-card-v2 race-card-v2--${progress}`}
      aria-label={`Open ${office} race`}
      disabled={disabled}
      onClick={activate}
    >
      <div className="race-card-v2__top">
        <div className="race-card-v2__motif" aria-hidden="true">
          <Motif tier={tier} scope={scope} boundaryRef={boundaryRef ?? null} frameRef={frameRef ?? null} />
        </div>
        <div className="race-card-v2__body">
          {scopeText && (
            <div className="race-card-v2__scope">{scopeText}</div>
          )}
          <div className="race-card-v2__title">{office}</div>
          {seat && (
            <div className="race-card-v2__seat">{seat}</div>
          )}
        </div>
      </div>
      <div className="race-card-v2__meta">
        <div className="race-card-v2__mi"><span className="k">Candidates</span><span className="v">{candidateCount}</span></div>
        <div className="race-card-v2__mi"><span className="k">Topics</span><span className="v">{topicCount}</span></div>
        <div className="race-card-v2__mi"><span className="k">Time</span><span className="v">~{estMinutes} min</span></div>
      </div>
      {progressLabel && (
        <div className="race-card-v2__status" data-testid="race-card-status">
          <span className="race-card-v2__status-dot" aria-hidden="true" />
          <span className="race-card-v2__status-text">{progressLabel}</span>
        </div>
      )}
    </motion.button>
  );
}
