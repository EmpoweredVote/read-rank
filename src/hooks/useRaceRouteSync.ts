import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, matchPath } from 'react-router-dom';
import { useReadRankStore, type Phase } from '../store/useReadRankStore';
import { fetchRaceQuotes } from '../data/api';
import { shuffleArray } from '../utils/matchingAlgorithm';

// URL step segment <-> in-race phase. hub/practice have no race URL (they live
// at the root), so they're absent from these maps.
const STEP_BY_PHASE: Partial<Record<Phase, string>> = {
  'issue-selection': 'topics',
  evaluation: 'read',
  results: 'results',
};
const PHASE_BY_STEP: Record<string, Phase> = {
  topics: 'issue-selection',
  read: 'evaluation',
  results: 'results',
};

/** Canonical path for a store state. In-race phases map to /race/:id/:step;
 *  everything else (hub, practice, transient) lives at the root. */
function pathForState(phase: Phase, raceId: string | null): string {
  const step = STEP_BY_PHASE[phase];
  return raceId && step ? `/race/${raceId}/${step}` : '/';
}

function matchRace(pathname: string) {
  return matchPath('/race/:raceId/:step', pathname) ?? matchPath('/race/:raceId', pathname);
}

/**
 * Two-way sync between the phase-machine store and the URL so that:
 *  - refreshing mid-race restores that exact race + screen (the URL carries it);
 *  - returning to the bare root lands on the hub, never mid-race;
 *  - the browser Back button exits a race to the hub;
 *  - a deep link to /race/:id resumes local progress, or fetches & starts the
 *    race when there's none on this device (shareable links).
 *
 * The store stays the source of truth for what renders; the URL mirrors it and
 * seeds it on load / history navigation. All operations are idempotent so
 * StrictMode's double-invoked effects are harmless.
 */
export function useRaceRouteSync(): void {
  const phase = useReadRankStore((s) => s.phase);
  const currentRaceId = useReadRankStore((s) => s.currentRaceId);
  const navigate = useNavigate();
  const location = useLocation();
  // True while a cold deep-link fetch is in flight; keeps the store→URL effect
  // from clobbering the race URL that triggered the fetch (store is still 'hub').
  const pendingRaceLoad = useRef(false);

  // URL -> store. Runs on mount and on every history navigation (Back/Forward).
  useEffect(() => {
    const match = matchRace(location.pathname);
    const store = useReadRankStore.getState();

    if (!match) {
      // Root / unknown path: drop any in-race state so the hub shows.
      if (store.currentRaceId) store.goToHub();
      return;
    }

    const params = match.params as { raceId?: string; step?: string };
    const raceId = params.raceId as string;
    const step = params.step;
    const targetPhase = step ? PHASE_BY_STEP[step] : undefined;

    if (step && !targetPhase) {
      // Unrecognised step segment — normalise the URL back to the hub.
      navigate('/', { replace: true });
      return;
    }

    // Already showing this race + screen (e.g. our own store→URL write): no-op.
    if (store.currentRaceId === raceId && (!targetPhase || store.phase === targetPhase)) return;

    // Local progress exists: restore instantly, no fetch.
    if (store.resumeRaceFromUrl(raceId, targetPhase ?? store.phase)) return;

    // Cold deep link (no local progress on this device): fetch and start it.
    pendingRaceLoad.current = true;
    let cancelled = false;
    fetchRaceQuotes(raceId)
      .then((payload) => {
        if (cancelled) return;
        const shuffled = {
          ...payload,
          topics: payload.topics.map((t) => ({ ...t, quotes: shuffleArray(t.quotes) })),
        };
        useReadRankStore.getState().selectRace(shuffled);
      })
      .catch(() => { if (!cancelled) navigate('/', { replace: true }); })
      .finally(() => { pendingRaceLoad.current = false; });

    return () => { cancelled = true; };
  }, [location.pathname, navigate]);

  // store -> URL. Mirror the current phase/race into the address bar.
  useEffect(() => {
    if (pendingRaceLoad.current) return;
    // Read fresh state (not the render-closure values) so a resume performed by
    // the URL→store effect in this same commit isn't overwritten on mount.
    const { phase: p, currentRaceId: id } = useReadRankStore.getState();
    const target = pathForState(p, id);
    const current = window.location.pathname;
    if (current === target) return;
    // Push only when entering a race from a non-race screen, so Back exits to the
    // hub; every other transition replaces to keep history shallow.
    const enteringRace = target.startsWith('/race/') && !current.startsWith('/race/');
    navigate(target, { replace: !enteringRace });
  }, [phase, currentRaceId, navigate]);
}
