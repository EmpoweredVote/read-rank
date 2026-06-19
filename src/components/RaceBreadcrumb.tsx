import React from 'react';
import { useReadRankStore } from '../store/useReadRankStore';
import { getStateName } from '../utils/stateNames';

/** Two-level breadcrumb shown during the task phases. "All races" is the exit;
 *  the current-race crumb is non-interactive (aria-current). Format:
 *  `{office}, {seat} · {state}` — office-first so it survives truncation. */
export const RaceBreadcrumb: React.FC = () => {
  const { currentRaceId, raceProgress, goToHub } = useReadRankStore();
  if (!currentRaceId) return null;
  const race = raceProgress[currentRaceId];
  if (!race) return null;

  const office = race.office ?? race.positionName;
  const officeSeat = race.seat ? `${office}, ${race.seat}` : office;
  const stateName = getStateName(race.state ?? null);
  const label = stateName ? `${officeSeat} · ${stateName}` : officeSeat;

  return (
    <nav className="rr-breadcrumb" aria-label="Breadcrumb">
      <button type="button" className="rr-breadcrumb__back" onClick={goToHub}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span>All races</span>
      </button>
      <span className="rr-breadcrumb__sep" aria-hidden="true">/</span>
      <span className="rr-breadcrumb__current" aria-current="page" title={label}>{label}</span>
    </nav>
  );
};
