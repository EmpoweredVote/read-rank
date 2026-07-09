import React, { useState } from 'react';
import type { RaceSummary, CountyIndex } from '../data/api';
import { statesWithCounts, countiesForState, racesInCounty } from '../utils/raceGrouping';
import { RaceCard } from './RaceCard';
import { deriveTierScope } from '../utils/raceTier';
import { estimateMinutes } from '../utils/estimateMinutes';
import { getStateName } from '../utils/stateNames';

export interface BrowseTarget { state: string; geoid: string; }

interface RaceBrowseProps {
  races: RaceSummary[];
  counties: CountyIndex;
  onSelect: (race: RaceSummary) => void;
  /** Jump straight to a county (from smart search) or a state list; null = state list. */
  initial: BrowseTarget | { state: string; geoid: null } | null;
  disabled?: boolean;
}

type Level =
  | { level: 'states' }
  | { level: 'counties'; state: string }
  | { level: 'races'; state: string; geoid: string };

function initialLevel(initial: RaceBrowseProps['initial']): Level {
  if (initial && 'geoid' in initial && initial.geoid) return { level: 'races', state: initial.state, geoid: initial.geoid };
  if (initial && initial.state) return { level: 'counties', state: initial.state };
  return { level: 'states' };
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '0.75rem',
  letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-link)',
  margin: '1rem 0 0.5rem',
};

function Breadcrumb({ nav, counties, onNavigate }: {
  nav: Level; counties: CountyIndex; onNavigate: (l: Level) => void;
}) {
  return (
    <nav className="flex items-center gap-2 mb-2" aria-label="Browse location" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem' }}>
      <button onClick={() => onNavigate({ level: 'states' })} className="font-bold" style={{ color: 'var(--text-link)', background: 'none', border: 'none', cursor: 'pointer' }}>All states</button>
      {nav.level !== 'states' && (
        <>
          <span style={{ color: 'var(--text-tertiary)' }}>›</span>
          <button
            onClick={() => onNavigate({ level: 'counties', state: nav.state })}
            className="font-bold" style={{ color: nav.level === 'counties' ? 'var(--text-secondary)' : 'var(--text-link)', background: 'none', border: 'none', cursor: 'pointer' }}
          >{getStateName(nav.state) ?? nav.state}</button>
        </>
      )}
      {nav.level === 'races' && (
        <>
          <span style={{ color: 'var(--text-tertiary)' }}>›</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{counties[nav.geoid] ?? nav.geoid}</span>
        </>
      )}
    </nav>
  );
}

export const RaceBrowse: React.FC<RaceBrowseProps> = ({ races, counties, onSelect, initial, disabled }) => {
  const [nav, setNav] = useState<Level>(() => initialLevel(initial));

  if (nav.level === 'states') {
    const states = statesWithCounts(races);
    return (
      <div>
        <div style={labelStyle}>Browse by state</div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {states.map((s) => (
            <li key={s.state}>
              <button className="race-browse-row" onClick={() => setNav({ level: 'counties', state: s.state })}>
                <span className="race-browse-row__name">{s.name}</span>
                <span className="race-browse-row__count">{s.count} race{s.count !== 1 ? 's' : ''} ›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (nav.level === 'counties') {
    const list = countiesForState(races, counties, nav.state);
    return (
      <div>
        <Breadcrumb nav={nav} counties={counties} onNavigate={setNav} />
        <div style={labelStyle}>Counties in {getStateName(nav.state) ?? nav.state}</div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {list.map((c) => (
            <li key={c.geoid}>
              <button className="race-browse-row" onClick={() => setNav({ level: 'races', state: nav.state, geoid: c.geoid })}>
                <span className="race-browse-row__name">{c.name}</span>
                <span className="race-browse-row__count">{c.count} race{c.count !== 1 ? 's' : ''} ›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // level: races
  const list = racesInCounty(races, nav.geoid);
  return (
    <div>
      <Breadcrumb nav={nav} counties={counties} onNavigate={setNav} />
      <div className="race-grid">
        {list.map((r, i) => {
          const { tier, scope } = deriveTierScope(r);
          return (
            <RaceCard
              key={r.raceId}
              office={r.office} tier={tier} scope={scope} state={r.state} seat={r.seat ?? null}
              electionDate={r.electionDate} boundaryRef={r.boundaryRef ?? null} frameRef={r.frameRef ?? null}
              candidateCount={r.candidateCount} topicCount={r.rankableTopicCount ?? r.topicCount}
              estMinutes={estimateMinutes({ quoteCount: r.quoteCount, candidateCount: r.candidateCount, topicCount: r.topicCount })}
              disabled={disabled} onSelect={() => onSelect(r)} enterIndex={i}
            />
          );
        })}
      </div>
    </div>
  );
};
