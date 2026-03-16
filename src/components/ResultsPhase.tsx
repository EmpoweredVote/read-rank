import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useReadRankStore } from '../store/useReadRankStore';
import type { Quote, Candidate, IssueProgress } from '../store/useReadRankStore';
import { fetchQuotesData } from '../data/api';
import { buildEssentialsProfileUrl } from '../utils/verdictFragment';

// ============================================================
// MegaParticles — copied from MatchCard.tsx
// CRITICAL: inline --dx / --dy custom properties required so
// megaBurst keyframe can read var(--dx) / var(--dy).
// ============================================================

interface Particle {
  dx: number;
  dy: number;
  size: number;
  delay: number;
  isLarge: boolean;
}

const MegaParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const particlesRef = useRef<Particle[]>([]);

  if (particlesRef.current.length === 0) {
    particlesRef.current = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * 360;
      const dist = 40 + Math.random() * 70;
      const dx = Math.cos((angle * Math.PI) / 180) * dist;
      const dy = Math.sin((angle * Math.PI) / 180) * dist;
      const size = 2 + Math.random() * 5;
      const delay = Math.random() * 0.15;
      const isLarge = i % 4 === 0;
      return { dx, dy, size, delay, isLarge };
    });
  }

  if (!active) return null;

  return (
    <div style={{ position: 'absolute', inset: -20, pointerEvents: 'none', zIndex: 20 }}>
      {particlesRef.current.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: p.isLarge ? p.size * 2 : p.size,
            height: p.isLarge ? p.size * 2 : p.size,
            borderRadius: '50%',
            background: p.isLarge
              ? 'radial-gradient(circle, #ff5740, transparent)'
              : '#ff5740',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `megaBurst 0.8s ${p.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            opacity: 0.9,
            filter: p.isLarge ? 'blur(1px)' : 'none',
          }}
        />
      ))}
    </div>
  );
};

// ============================================================
// ResultCard — compact layout with inline badge, source below
// quote, and politician row with View on Essentials
// ============================================================

interface ResultCardProps {
  quote: Quote;
  verdict: 'agreed' | 'disagreed';
  index: number;
  candidate: Candidate;
  rank?: number;
  issueProgress: Record<string, IssueProgress>;
  topicId: string | null;
  address?: string;
  prefersReducedMotion: boolean | null;
}

const ResultCard: React.FC<ResultCardProps> = ({
  quote,
  verdict,
  index,
  candidate,
  rank,
  issueProgress,
  topicId,
  address,
  prefersReducedMotion,
}) => {
  // Fire particle burst on card entry
  const [particlesActive, setParticlesActive] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const delay = index * 80 + 400;
    const t = setTimeout(() => {
      setParticlesActive(true);
      setTimeout(() => setParticlesActive(false), 1000);
    }, delay);
    return () => clearTimeout(t);
  }, [index, prefersReducedMotion]);

  const IMG_WIDTH = '3.5rem';

  return (
    <motion.div
      style={{
        backgroundColor: '#fffefb',
        border: '1px solid #e8e2d9',
        borderRadius: '0.625rem',
        overflow: 'hidden',
        opacity: verdict === 'disagreed' ? 0.7 : 1,
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: verdict === 'disagreed' ? 0.7 : 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Quote row: rank column on left, quote + source on right */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Rank / verdict bar — muted blue background, same width as photo below */}
        <div style={{
          width: IMG_WIDTH,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: verdict === 'agreed' ? '#00657c' : '#a8a29e',
          borderRadius: '0.375rem 0 0 0',
        }}>
          {verdict === 'agreed' && rank !== undefined ? (
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#fffefb',
            }}>
              {rank}
            </span>
          ) : verdict === 'agreed' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fffefb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fffefb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* Quote text + source — left padding matches politician row inner padding */}
        <div style={{ flex: 1, padding: '0.875rem 1rem 0.75rem 1rem' }}>
          <p style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 500,
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            color: '#1a1a2e',
            margin: 0,
          }}>
            &ldquo;{quote.text}&rdquo;
          </p>

          {/* Source link — right below the quote */}
          {quote.sourceUrl && (
            <a
              href={quote.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontFamily: "'Manrope', sans-serif",
                fontSize: '0.75rem',
                color: '#59b0c4',
                textDecoration: 'none',
                marginTop: '0.375rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>{quote.sourceName || 'Source'}</span>
            </a>
          )}
        </div>
      </div>

      {/* Politician row — photo, name/office, and View on Essentials on same line */}
      <div
        style={{
          borderTop: '1px solid #e8e2d9',
          backgroundColor: '#faf7f2',
          position: 'relative',
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        {!prefersReducedMotion && <MegaParticles active={particlesActive} />}
        {candidate.photo ? (
          <img
            src={candidate.photo}
            alt={candidate.name}
            style={{
              width: IMG_WIDTH,
              height: '3.5rem',
              borderRadius: '0 0 0 0.375rem',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: IMG_WIDTH,
            height: '3.5rem',
            borderRadius: '0 0 0 0.375rem',
            backgroundColor: '#e8e2d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#94a3b8',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '1rem',
            fontWeight: 700,
          }}>
            {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0, padding: '0.5rem 1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#1a1a2e',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {candidate.name}
            </div>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.6875rem',
              color: '#64748b',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {candidate.office}
            </div>
          </div>
          <a
            href={buildEssentialsProfileUrl(candidate.id, issueProgress, topicId || undefined, address)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#00657c',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            View on Essentials
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// ResultsPhase
// ============================================================

export const ResultsPhase: React.FC = () => {
  const { goToHub, issueProgress, currentIssueId, getCurrentIssueProgress, locationFilter } = useReadRankStore();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const progress = getCurrentIssueProgress();
  const rankedQuotes = progress?.rankedQuotes ?? [];
  const disagreedQuotes = progress?.disagreedQuotes ?? [];

  useEffect(() => {
    fetchQuotesData().then(data => {
      setCandidates(data.candidates);
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    });
  }, []);

  const organizedQuotes = useMemo(() => {
    const result: { quote: Quote; verdict: 'agreed' | 'disagreed'; rank?: number }[] = [];
    rankedQuotes.forEach((quote, i) => result.push({ quote, verdict: 'agreed', rank: i + 1 }));
    disagreedQuotes.forEach(quote => result.push({ quote, verdict: 'disagreed' }));
    return result;
  }, [rankedQuotes, disagreedQuotes]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <motion.div
          className="inline-block w-6 h-6 border-2 rounded-full"
          style={{ borderColor: '#e8e2d9', borderTopColor: '#00657c' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="mt-4" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500, color: '#64748b', fontSize: '1rem' }}>
          Loading results...
        </p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Compact Header */}
      <motion.div
        className="text-center max-w-2xl mx-auto mb-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize: '1.5rem',
          color: '#1a1a2e',
          marginBottom: '0.25rem',
          letterSpacing: '-0.02em',
        }}>
          Here&rsquo;s Who Said What
        </h2>
        <p style={{ fontFamily: "'Manrope', sans-serif", color: '#64748b', fontSize: '0.8125rem' }}>
          See how your preferences align with each candidate
        </p>
      </motion.div>

      {/* Result Cards */}
      <div className="max-w-2xl mx-auto space-y-3">
        {organizedQuotes.map(({ quote, verdict, rank }, index) => {
          const candidate = candidates.find(c => c.id === quote.candidateId);
          if (!candidate) return null;
          return (
            <ResultCard
              key={quote.id}
              quote={quote}
              verdict={verdict}
              index={index}
              candidate={candidate}
              rank={rank}
              issueProgress={issueProgress}
              topicId={currentIssueId}
              address={locationFilter?.address}
              prefersReducedMotion={prefersReducedMotion}
            />
          );
        })}
      </div>

      {/* Explore More Issues */}
      <motion.div
        className="flex justify-center pt-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: organizedQuotes.length * 0.08 + 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={() => goToHub()}
          className="ev-button-secondary"
          style={{ fontSize: '0.875rem', padding: '0.625rem 1.5rem' }}
        >
          Explore More Issues
        </button>
      </motion.div>
    </div>
  );
};
