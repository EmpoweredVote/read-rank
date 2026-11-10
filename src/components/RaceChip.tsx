import { Motif } from './motif/Motif';
import { getStateName } from '../utils/stateNames';
import type { Tier, Scope } from '../utils/raceTier';
import type { BoundaryRef } from '../data/api';

export interface RaceChipProps {
  office: string;
  seat?: string | null;
  state?: string | null;
  electionDate?: string | null;
  tier?: Tier;
  scope?: Scope;
  boundaryRef?: BoundaryRef | null;
  frameRef?: BoundaryRef | null;
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Race context for the issue screen: motif + "STATE · date" + "office · seat". */
export function RaceChip({ office, seat, state, electionDate, tier, scope, boundaryRef, frameRef }: RaceChipProps) {
  const eyebrow = [getStateName(state ?? null), formatDate(electionDate)].filter(Boolean).join(' · ');
  return (
    <div className="rr-chip">
      {tier && scope && (
        <div className="rr-chip__motif" aria-hidden="true">
          <Motif tier={tier} scope={scope} boundaryRef={boundaryRef ?? null} frameRef={frameRef ?? null} />
        </div>
      )}
      <div className="rr-chip__text">
        {eyebrow && <div className="rr-chip__eyebrow">{eyebrow}</div>}
        <div className="rr-chip__title">
          <strong>{office}</strong>
          {seat && <span className="rr-chip__seat"> · {seat}</span>}
        </div>
      </div>
    </div>
  );
}
