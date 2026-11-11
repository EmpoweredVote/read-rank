import { useEffect, useState } from 'react';
import {
  buildSpokes, fetchCompassTopics, fetchMyCompass, MIN_SPOKES,
  type CompassSpoke, type CompassTopic,
} from '../data/compass';

export type MyCompassState =
  | { status: 'loading' }
  /** Signed out, or fewer than MIN_SPOKES answered: invite them to calibrate. */
  | { status: 'uncalibrated' }
  /** Signed in with answers, but a request failed. Not the same as uncalibrated. */
  | { status: 'error' }
  | { status: 'calibrated'; spokes: CompassSpoke[]; topics: CompassTopic[] };

/** Does this user have a calibrated compass, and if so, what is on it? */
export function useMyCompass(): MyCompassState {
  const [state, setState] = useState<MyCompassState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await fetchMyCompass();
        if (!mine || mine.answers.filter((a) => a.value > 0).length < MIN_SPOKES) {
          if (!cancelled) setState({ status: 'uncalibrated' });
          return;
        }
        const topics = await fetchCompassTopics();
        const spokes = buildSpokes(mine, topics);
        if (cancelled) return;
        setState(spokes.length >= MIN_SPOKES ? { status: 'calibrated', spokes, topics } : { status: 'uncalibrated' });
      } catch (err) {
        console.error('Failed to load your compass', err);
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return state;
}
