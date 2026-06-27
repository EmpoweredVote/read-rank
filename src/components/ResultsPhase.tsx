import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMotion, EASE, DUR } from '../motion';
import { computeRevealTimeline } from '../utils/revealTimeline';
import { useReadRankStore, getAllAgreedQuotes } from '../store/useReadRankStore';
import { fetchRaceReveal, type BallotEntry, type RevealResult } from '../data/api';
import { buildEssentialsProfileUrl, type VerdictMap } from '../utils/verdictFragment';
import { SourceLine } from './SourceLine';
import { ThresholdInterstitial } from './ThresholdInterstitial';
import { buildInsightSentence, buildQuoteIdentityMap } from '../utils/revealInsight';
import type { QuoteIdentity } from '../utils/revealInsight';
import { AlignmentGrid } from './AlignmentGrid';
import { CompassCrossLink } from './CompassCrossLink';
import { buildAlignmentGrid, type AlignmentTopic } from '../utils/alignmentGrid';
import { TierIcon } from './TierIcon';
import { tierForIndex } from '../utils/tiers';
import { track } from '../lib/analytics';

// ============================================================
// MegaParticles — celebratory burst on the #1 card.
// ============================================================
interface Particle { dx: number; dy: number; size: number; delay: number; isLarge: boolean; }

const MegaParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const ref = useRef<Particle[]>([]);
  if (ref.current.length === 0) {
    ref.current = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360;
      const dist = 40 + ((i * 37) % 70);
      return {
        dx: Math.cos((angle * Math.PI) / 180) * dist,
        dy: Math.sin((angle * Math.PI) / 180) * dist,
        size: 2 + ((i * 13) % 5),
        delay: (i % 5) * 0.03,
        isLarge: i % 4 === 0,
      };
    });
  }
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: -20, pointerEvents: 'none', zIndex: 20 }}>
      {ref.current.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', width: p.isLarge ? p.size * 2 : p.size, height: p.isLarge ? p.size * 2 : p.size,
          borderRadius: '50%',
          background: p.isLarge ? 'radial-gradient(circle, var(--color-ev-coral), transparent)' : 'var(--color-ev-coral)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          animation: `megaBurst 0.8s ${p.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
          ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`,
          opacity: 0.9, filter: p.isLarge ? 'blur(1px)' : 'none',
        }} />
      ))}
    </div>
  );
};

// ============================================================
// BallotCard — one candidate, ranked. NO percentage, NO party
// (antipartisan). Factual evidence + expandable per-topic.
// ============================================================
interface BallotCardProps {
  entry: BallotEntry;
  verdictMap: VerdictMap;
  address?: string;
  /** ms before this card begins its landing (from the reveal timeline). */
  landBaseDelayMs: number;
  /** True for the #1 card once it has landed: gold badge gleam + particle burst. */
  spotlight: boolean;
  /** quoteId → rank index within its topic (for tier icon display). */
  quoteRankMap: Map<string, number>;
}

export const BallotCard: React.FC<BallotCardProps> = ({ entry, verdictMap, address, landBaseDelayMs, spotlight, quoteRankMap }) => {
  const [expanded, setExpanded] = useState(false);
  const [particles, setParticles] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const m = useMotion();
  const rank = entry.rank;
  const badgeClass = `podium-rank-badge ${rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : 'rN'}`;
  const podiumClass = rank === 1 ? 'podium-1' : rank === 2 ? 'podium-2' : rank === 3 ? 'podium-3' : '';

  useEffect(() => {
    if (m.reduced || rank !== 1 || !spotlight) return;
    const on = setTimeout(() => setParticles(true), 0);
    const off = setTimeout(() => setParticles(false), DUR.burst + 200);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [m.reduced, rank, spotlight]);

  const initials = entry.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const { agreementCount, topicsWithAgreement } = entry.evidence;

  return (
    <motion.div
      className={podiumClass}
      style={{
        backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: '0.625rem', overflow: 'hidden', position: 'relative',
      }}
      initial={m.reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
      transition={m.transition(DUR.moderate, EASE.settle, { delay: landBaseDelayMs / 1000 })}
    >
      {!m.reduced && rank === 1 && <MegaParticles active={particles} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem' }}>
        <span className={badgeClass} style={{ width: '2rem', height: '2rem', fontSize: '1rem' }}>{rank}</span>

        {entry.photo && imgOk ? (
          <img src={entry.photo} alt={entry.name} onError={() => setImgOk(false)} style={{ width: '3rem', height: '3rem', borderRadius: '9999px', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '9999px', backgroundColor: 'var(--surface-raised)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            color: 'var(--text-tertiary)', fontFamily: "'Manrope', sans-serif", fontWeight: 700,
          }}>{initials}</div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)' }}>
            {entry.name}
          </div>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {entry.office}
          </div>
        </div>
      </div>

      {/* Factual evidence — no score, no % */}
      <div style={{ padding: '0 1rem 0.75rem' }}>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-strong)' }}>
          You agreed with <strong>{agreementCount}</strong> of their position{agreementCount === 1 ? '' : 's'}
          {entry.perTopic.length > 0 && (
            <> · on <strong>{topicsWithAgreement}</strong> of {entry.perTopic.length} topic{entry.perTopic.length === 1 ? '' : 's'}</>
          )}
        </span>
      </div>

      {/* Actions */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-sunken)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem',
      }}>
        {entry.perTopic.length > 0 ? (
          <button onClick={() => {
            setExpanded((e) => {
              if (!e) track('readrank_candidate_details_expanded', { candidate_id: entry.candidateId, rank });
              return !e;
            });
          }} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          }}>
            {expanded ? 'Hide' : 'See'} what they said
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        ) : <span />}
        <a href={buildEssentialsProfileUrl(entry.candidateId, verdictMap, undefined, address)} target="_blank" rel="noopener noreferrer"
          onClick={() => track('readrank_essentials_link_clicked', { candidate_id: entry.candidateId, rank })}
          style={{
            fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-link)',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap',
          }}>
          View on Essentials
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Per-topic breakdown */}
      {expanded && (
        <div style={{ padding: '0.75rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {entry.perTopic.map((t) => (
            <div key={t.topicKey}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-heading)' }}>{t.title}</span>
                {t.userTopWinner && (
                  <span style={{
                    fontFamily: "'Manrope', sans-serif", fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--podium-silver)', border: '1px solid var(--border-subtle)',
                    padding: '0.0625rem 0.375rem', borderRadius: '9999px',
                  }}>Your #1 here</span>
                )}
              </div>
              {t.quotes.map((q) => {
                const rankIdx = quoteRankMap.get(q.quoteId);
                const tier = rankIdx !== undefined ? tierForIndex(rankIdx) : null;
                return (
                  <div key={q.quoteId} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                    margin: '0 0 0.375rem',
                    paddingLeft: '0.625rem',
                    borderLeft: `2px solid ${q.supported ? 'var(--agree)' : 'var(--border-medium)'}`,
                  }}>
                    {tier && <span style={{ flexShrink: 0 }}><TierIcon tier={tier} size={32} /></span>}
                    <p style={{
                      fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', lineHeight: 1.55, margin: 0,
                      color: q.supported ? 'var(--text-ink)' : 'var(--text-tertiary)',
                    }}>
                      &ldquo;{q.text}&rdquo;
                      {q.sourceName && (
                        <span style={{ marginLeft: '0.375rem' }}>
                          <SourceLine sourceName={q.sourceName} sourceUrl={q.sourceUrl} variant="compact" />
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ============================================================
// ResultsPhase — threshold gate → full results (no staged reveal).
// ============================================================
export const ResultsPhase: React.FC = () => {
  const { goToHub, currentRaceId, getRaceVerdicts, getCurrentRaceProgress, locationFilter } = useReadRankStore();
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<'threshold' | 'results'>('threshold');
  const m = useMotion();
  const [spotlightActive, setSpotlightActive] = useState(false);
  const race = getCurrentRaceProgress();

  const verdicts = currentRaceId ? getRaceVerdicts(currentRaceId) : [];
  const verdictMap: VerdictMap = {};
  for (const v of verdicts) verdictMap[v.quote_id] = v.supported ? 'agreed' : 'disagreed';

  useEffect(() => {
    if (!currentRaceId) { setLoading(false); return; }
    fetchRaceReveal(currentRaceId, getRaceVerdicts(currentRaceId))
      .then(setReveal)
      .finally(() => setTimeout(() => setLoading(false), 600));
  }, [currentRaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const agreedList = race ? getAllAgreedQuotes(race) : [];
  const topicCount = race ? race.topicOrder.length : 0;

  const identities = useMemo(
    (): Map<string, QuoteIdentity> => (reveal ? buildQuoteIdentityMap(reveal) : new Map<string, QuoteIdentity>()),
    [reveal]
  );

  const insight = useMemo(
    () => buildInsightSentence(agreedList, identities),
    [agreedList, identities]
  );

  const alignmentTopics = useMemo<AlignmentTopic[]>(
    () => (race ? race.topicOrder.map((key) => ({ key, title: race.topics[key].title })) : []),
    [race]
  );
  const alignmentRows = useMemo(
    () => (reveal ? buildAlignmentGrid(reveal, agreedList.map((q) => q.id), alignmentTopics) : []),
    [reveal, agreedList, alignmentTopics]
  );
  const topTopicTitle = race && agreedList.length > 0
    ? race.topics[agreedList[0].topicKey]?.title ?? null
    : null;

  // Map quoteId → rank index within its topic (0-based) for tier icon display.
  const quoteRankMap = useMemo((): Map<string, number> => {
    if (!race) return new Map();
    const map = new Map<string, number>();
    for (const topicKey of race.topicOrder) {
      const topic = race.topics[topicKey];
      if (!topic) continue;
      topic.agreed.forEach((q, i) => map.set(q.id, i));
    }
    return map;
  }, [race]);

  const ballot = reveal?.ballot ?? [];
  const filledCells = useMemo(
    () => alignmentRows.reduce((n, r) => n + r.cells.filter(Boolean).length, 0),
    [alignmentRows]
  );
  const timeline = useMemo(
    () => computeRevealTimeline({ filledCells, reduced: m.reduced }),
    [filledCells, m.reduced]
  );

  // One deterministic trigger: flip the #1 spotlight on when card #1 lands.
  // setTimeout (not framer onAnimationComplete) so it survives the rAF throttle.
  useEffect(() => {
    if (stage !== 'results' || m.reduced || ballot.length === 0) return;
    const t = setTimeout(() => setSpotlightActive(true), timeline.firstLand);
    return () => { clearTimeout(t); setSpotlightActive(false); };
  }, [stage, m.reduced, ballot.length, timeline.firstLand]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <motion.div className="inline-block w-6 h-6 border-2 rounded-full"
          style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--color-ev-muted-blue)' }}
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500, color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Tallying your ballot…
        </p>
      </div>
    );
  }

  // Threshold gate.
  if (stage === 'threshold') {
    return (
      <div className="pb-12 max-w-2xl mx-auto">
        <ThresholdInterstitial
          rankedCount={agreedList.length}
          topicCount={topicCount}
          onContinue={() => setStage('results')}
        />
      </div>
    );
  }

  // Empty ballot — no agreements, nothing to show.
  if (ballot.length === 0) {
    return (
      <div className="pb-12">
        <motion.div className="text-center max-w-2xl mx-auto mb-5"
          {...m.enter({ y: 12 })} transition={m.transition(DUR.moderate)}>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-heading)', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
            {race?.positionName ?? reveal?.positionName ?? 'Your ballot'}
          </h2>
        </motion.div>

        <div className="max-w-2xl mx-auto text-center py-10">
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            No agreements yet
          </p>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            You didn&apos;t agree with any quotes, so there&apos;s no ballot to build. Try another race.
          </p>
        </div>

        <motion.div className="flex justify-center pt-6"
          {...m.enter({ y: 12 })} transition={m.transition(DUR.moderate, EASE.settle, { delay: 0.4 })}>
          <button onClick={() => { track('readrank_play_again_clicked'); goToHub(); }} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
            Play another race near you
          </button>
        </motion.div>
      </div>
    );
  }

  // Results — everything revealed at once.
  return (
    <div className="pb-12">
      <motion.div className="text-center max-w-2xl mx-auto mb-5"
        {...m.enter({ y: 12 })}
        transition={m.transition(DUR.moderate, EASE.settle, { delay: timeline.heading / 1000 })}>
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-heading)', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>
          {race?.positionName ?? reveal?.positionName ?? 'Your ballot'}
        </h2>
      </motion.div>

      <div className="max-w-2xl mx-auto space-y-4">
        {insight && (
          <motion.div className="insight-strip"
            {...m.enter({ y: 12 })}
            transition={m.transition(DUR.moderate, EASE.settle, { delay: timeline.insight / 1000 })}>
            {insight}
          </motion.div>
        )}
        <AlignmentGrid topics={alignmentTopics} rows={alignmentRows} />

        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)', margin: '1.25rem 0 0.25rem' }}>
          How the candidates stack up
        </h3>
        {ballot.map((entry, i) => (
          <BallotCard key={entry.candidateId} entry={entry} verdictMap={verdictMap}
            address={locationFilter?.address}
            landBaseDelayMs={timeline.cardDelay(i)}
            spotlight={entry.rank === 1 && spotlightActive}
            quoteRankMap={quoteRankMap} />
        ))}
        <CompassCrossLink raceId={reveal?.raceId ?? ''} topTopicTitle={topTopicTitle} />
      </div>

      <motion.div className="flex justify-center pt-6"
        {...m.enter({ y: 12 })}
        transition={m.transition(DUR.moderate, EASE.settle, { delay: (timeline.cardDelay(ballot.length) + DUR.moderate) / 1000 })}>
        <button onClick={() => goToHub()} className="ev-button-primary" style={{ fontSize: '0.9375rem', padding: '0.625rem 1.75rem' }}>
          Play another race near you
        </button>
      </motion.div>
    </div>
  );
};
