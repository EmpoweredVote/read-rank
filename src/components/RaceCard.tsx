// src/components/RaceCard.tsx
import { Motif } from './motif/Motif';
import type { Tier, Scope } from '../utils/raceTier';
import type { BoundaryRef } from '../data/api';

const TIER_LABEL: Record<Tier, string> = { federal: 'Federal', state: 'State', local: 'Local' };
const SCOPE_LABEL: Record<Scope, string> = {
  statewide: 'Statewide', district: 'District', county: 'County', citywide: 'Citywide',
};

function formatMonthYear(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export interface RaceCardProps {
  office: string;
  tier: Tier;
  scope: Scope;
  state: string | null;
  place?: string | null;
  electionDate?: string | null;
  boundaryRef?: BoundaryRef | null;
  candidateCount: number;
  topicCount: number;
  estMinutes: number;
  isLocal?: boolean;
  usesRcv?: boolean;
  progress?: 'none' | 'in-progress' | 'completed';
  disabled?: boolean;
  onSelect: () => void;
}

export function RaceCard(props: RaceCardProps) {
  const {
    office, tier, scope, state, place, electionDate, boundaryRef,
    candidateCount, topicCount, estMinutes, isLocal, usesRcv,
    progress = 'none', disabled, onSelect,
  } = props;

  const date = formatMonthYear(electionDate);
  const geo = [place || state, date].filter(Boolean).join(' · ');

  function activate() { if (!disabled) onSelect(); }

  return (
    <button
      type="button"
      className={`race-card-v2 race-card-v2--${progress}`}
      aria-label={`Open ${office} race`}
      disabled={disabled}
      onClick={activate}
    >
      <div className="race-card-v2__motif" aria-hidden="true">
        <Motif tier={tier} scope={scope} boundaryRef={boundaryRef ?? null} />
      </div>
      <div className="race-card-v2__body">
        <div className="race-card-v2__scope">{TIER_LABEL[tier]} · {SCOPE_LABEL[scope]}</div>
        <div className="race-card-v2__title-row">
          <span className="race-card-v2__title">
            {office}
            {isLocal && <span className="race-card-v2__pill">Local</span>}
          </span>
          <span className="race-card-v2__arrow" aria-hidden="true">&rarr;</span>
        </div>
        {geo && (
          <div className="race-card-v2__geo">
            {geo}{usesRcv ? ' · Ranked choice' : ''}
          </div>
        )}
        <div className="race-card-v2__meta">
          <div className="race-card-v2__mi"><span className="k">Candidates</span><span className="v">{candidateCount}</span></div>
          <div className="race-card-v2__mi"><span className="k">Topics</span><span className="v">{topicCount}</span></div>
          <div className="race-card-v2__mi"><span className="k">Time</span><span className="v">~{estMinutes} min</span></div>
        </div>
      </div>
    </button>
  );
}
