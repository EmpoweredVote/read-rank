// src/components/RaceCard.tsx
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
  districtLabel?: string | null;
  electionDate?: string | null;
  boundaryRef?: BoundaryRef | null;
  frameRef?: BoundaryRef | null;
  candidateCount: number;
  topicCount: number;
  estMinutes: number;
  progress?: 'none' | 'in-progress' | 'completed';
  disabled?: boolean;
  onSelect: () => void;
}

export function RaceCard(props: RaceCardProps) {
  const {
    office, tier, scope, state, districtLabel, electionDate, boundaryRef, frameRef,
    candidateCount, topicCount, estMinutes,
    progress = 'none', disabled, onSelect,
  } = props;

  const stateName = getStateName(state);
  const date = formatElectionDate(electionDate);
  const scopeText = [stateName, date].filter(Boolean).join(' · ');

  function activate() { if (!disabled) onSelect(); }

  return (
    <button
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
          {districtLabel && (
            <div className="race-card-v2__district">{districtLabel}</div>
          )}
        </div>
      </div>
      <div className="race-card-v2__meta">
        <div className="race-card-v2__mi"><span className="k">Candidates</span><span className="v">{candidateCount}</span></div>
        <div className="race-card-v2__mi"><span className="k">Topics</span><span className="v">{topicCount}</span></div>
        <div className="race-card-v2__mi"><span className="k">Time</span><span className="v">~{estMinutes} min</span></div>
      </div>
    </button>
  );
}
