import React, { useEffect, useMemo, useState } from 'react';
import { RadarChartCore } from '@empoweredvote/ev-ui';
import { fetchPoliticianAnswers, type CompassAnswer, type CompassSpoke, type CompassTopic } from '../data/compass';
import { track } from '../lib/analytics';
import compassLight from '../assets/compass-symbol-light.svg';
import compassDark from '../assets/compass-symbol-dark.svg';

const COMPASS_URL = 'https://compass.empowered.vote';

export interface CompassCandidate {
  candidateId: string;
  name: string;
}

export interface YourCompassCardProps {
  /** The user's spokes (at least MIN_SPOKES). */
  spokes: CompassSpoke[];
  /** Compass topic catalog; RadarChartCore reads each topic's stance count. */
  topics: CompassTopic[];
  /** Candidates in ballot order; the first is compared by default. */
  candidates: CompassCandidate[];
}

type Load =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; answers: CompassAnswer[] };

const LOADING: Load = { state: 'loading' };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * "Your compass": shown instead of the Calibrate invitation once the user has a
 * calibrated compass. Lays a candidate's published Compass stances over the
 * user's. A spoke the candidate has no stance on is marked as such (dashed spoke,
 * named in the note below) rather than guessed.
 */
export const YourCompassCard: React.FC<YourCompassCardProps> = ({ spokes, topics, candidates }) => {
  const [compareId, setCompareId] = useState<string | null>(candidates[0]?.candidateId ?? null);
  const [loads, setLoads] = useState<Record<string, Load>>({});

  // Fetch the compared candidate's stances (cached per candidate in data/compass).
  useEffect(() => {
    // No entry yet reads as loading; an earlier error is retried on reselect.
    if (!compareId || loads[compareId]?.state === 'ready') return;
    let cancelled = false;
    fetchPoliticianAnswers(compareId)
      .then((answers) => { if (!cancelled) setLoads((l) => ({ ...l, [compareId]: { state: 'ready', answers } })); })
      .catch(() => { if (!cancelled) setLoads((l) => ({ ...l, [compareId]: { state: 'error' } })); });
    return () => { cancelled = true; };
  }, [compareId]); // eslint-disable-line react-hooks/exhaustive-deps

  const compared = candidates.find((c) => c.candidateId === compareId) ?? null;
  const load: Load | undefined = compareId ? (loads[compareId] ?? LOADING) : undefined;

  const data = useMemo(() => Object.fromEntries(spokes.map((s) => [s.shortTitle, s.value])), [spokes]);
  const invertedSpokes = useMemo(
    () => Object.fromEntries(spokes.filter((s) => s.inverted).map((s) => [s.shortTitle, true])),
    [spokes]
  );

  // The candidate's value per spoke; spokes with no stance on file stay out of compareData.
  const { compareData, missing } = useMemo(() => {
    if (load?.state !== 'ready') return { compareData: {} as Record<string, number>, missing: [] as string[] };
    const byTopic = new Map(load.answers.map((a) => [a.topic_id, a.value]));
    const cd: Record<string, number> = {};
    const miss: string[] = [];
    for (const s of spokes) {
      const v = byTopic.get(s.topicId);
      if (v != null && v > 0) cd[s.shortTitle] = v;
      else miss.push(s.shortTitle);
    }
    return { compareData: cd, missing: miss };
  }, [load, spokes]);

  const hasOverlay = Object.keys(compareData).length > 0;
  const unansweredSpokes = useMemo(
    () => (hasOverlay ? Object.fromEntries(missing.map((t) => [t, true])) : {}),
    [hasOverlay, missing]
  );

  const who = compared?.name ?? '';
  const chartLabel = `Your compass${hasOverlay ? `, compared with ${who}` : ''}: ` +
    spokes.map((s) => {
      const theirs = compareData[s.shortTitle];
      return `${s.shortTitle} ${s.value}${hasOverlay ? (theirs ? ` (${who} ${theirs})` : ` (${who}: no stance on file)`) : ''}`;
    }).join(', ');

  return (
    <section className="my-compass" aria-labelledby="my-compass-title">
      <div className="my-compass__head">
        <img src={compassLight} alt="" aria-hidden="true" className="my-compass__symbol my-compass__symbol--light" width={40} height={40} />
        <img src={compassDark} alt="" aria-hidden="true" className="my-compass__symbol my-compass__symbol--dark" width={40} height={40} />
        <div>
          <span className="my-compass__badge">Compass</span>
          <h3 className="my-compass__title" id="my-compass-title">Your compass</h3>
        </div>
      </div>
      <p className="my-compass__intro">Pick a candidate to lay their compass over yours.</p>

      <figure className="my-compass__figure">
        <div className="my-compass__chart" role="img" aria-label={chartLabel}>
          <RadarChartCore
            topics={topics}
            data={data}
            compareData={compareData}
            invertedSpokes={invertedSpokes}
            unansweredSpokes={unansweredSpokes}
            labelFontSize={22}
            tightFit
            dotRadius={5}
          />
        </div>
        <figcaption className="my-compass__legend">
          <span className="my-compass__key my-compass__key--you"><i aria-hidden="true" />You</span>
          {who && <span className="my-compass__key my-compass__key--them"><i aria-hidden="true" />{who}</span>}
        </figcaption>
      </figure>

      <p className="my-compass__note" aria-live="polite">
        {load?.state === 'loading' && <>Loading {who}&apos;s stances…</>}
        {load?.state === 'error' && <>We couldn&apos;t load {who}&apos;s stances right now.</>}
        {load?.state === 'ready' && !hasOverlay && <>{who} has no Compass stances on file for your topics yet.</>}
        {load?.state === 'ready' && hasOverlay && missing.length > 0 && (
          <>No stance on file from {who} on {listJoin(missing)}.</>
        )}
      </p>

      {candidates.length > 0 && (
        <div className="my-compass__cands" role="group" aria-label="Compare with">
          {candidates.map((c) => (
            <button key={c.candidateId} type="button" className="my-compass__cand"
              aria-pressed={c.candidateId === compareId}
              onClick={() => {
                setCompareId(c.candidateId);
                track('readrank_compass_compare_clicked', { candidate_id: c.candidateId });
              }}>
              <span className="my-compass__ini" aria-hidden="true">{initials(c.name)}</span>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="my-compass__actions">
        <a className="ev-button-secondary my-compass__refine" href={COMPASS_URL} target="_blank" rel="noopener noreferrer">
          Refine your stances in Compass <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
};
