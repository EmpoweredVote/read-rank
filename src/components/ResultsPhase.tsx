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
// ResultCard — shows quote, identity, and CTA immediately
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
  const borderLeftColor = verdict === 'agreed' ? '#00657c' : '#d4cdc3';

  // Fire particle burst on card entry
  const [particlesActive, setParticlesActive] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const delay = index * 80 + 400; // after card entry animation
    const t = setTimeout(() => {
      setParticlesActive(true);
      setTimeout(() => setParticlesActive(false), 1000);
    }, delay);
    return () => clearTimeout(t);
  }, [index, prefersReducedMotion]);

  const getStatusBadge = () => {
    if (verdict === 'agreed') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: '#0e7490',
            backgroundColor: '#ecfeff',
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Agreed
          </span>
          {rank !== undefined && (
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: '#fffefb',
              backgroundColor: '#00657c',
              width: '1.25rem',
              height: '1.25rem',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {rank}
            </span>
          )}
        </div>
      );
    }
    return (
      <span style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: '0.6875rem',
        fontWeight: 600,
        color: '#78716c',
        backgroundColor: '#f5f5f4',
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        Disagreed
      </span>
    );
  };

  return (
    <motion.div
      style={{
        backgroundColor: '#fffefb',
        border: '1px solid #e8e2d9',
        borderLeft: `3px solid ${borderLeftColor}`,
        borderRadius: '0.625rem',
        overflow: 'hidden',
        opacity: verdict === 'disagreed' ? 0.7 : 1,
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: verdict === 'disagreed' ? 0.7 : 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Quote section */}
      <div style={{ padding: '1.25rem 1.25rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.625rem' }}>
          {getStatusBadge()}
        </div>
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
      </div>

      {/* Candidate identity */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid #e8e2d9',
          borderBottom: '1px solid #e8e2d9',
          backgroundColor: '#faf7f2',
          position: 'relative',
        }}
      >
        {!prefersReducedMotion && <MegaParticles active={particlesActive} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src={candidate.photo}
            alt={candidate.name}
            style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '9999px',
              objectFit: 'cover',
              border: '2px solid #fffefb',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 600,
              fontSize: '1rem',
              color: '#1a1a2e',
            }}>
              {candidate.name}
            </div>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.75rem',
              color: '#64748b',
            }}>
              {candidate.office}
            </div>
          </div>
        </div>
      </div>

      {/* Source link */}
      {quote.sourceUrl && (
        <div style={{ padding: '0.625rem 1.25rem 0' }}>
          <a
            href={quote.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.8125rem',
              color: '#00657c',
              textDecoration: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>{quote.sourceName || 'Source'}</span>
          </a>
        </div>
      )}

      {/* CTA — View on Essentials */}
      <div style={{ padding: '0.75rem 1.25rem 1.25rem' }}>
        <a
          href={buildEssentialsProfileUrl(candidate.id, issueProgress, topicId || undefined, address)}
          target="_blank"
          rel="noopener noreferrer"
          className="ev-button-primary"
          style={{
            width: '100%',
            fontSize: '0.8125rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
          }}
        >
          View on Essentials
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
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
      {/* Header */}
      <motion.div
        className="text-center max-w-2xl mx-auto mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 800,
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          color: '#1a1a2e',
          marginBottom: '0.375rem',
          letterSpacing: '-0.02em',
        }}>
          Here&rsquo;s Who Said What
        </h2>
        <p style={{ fontFamily: "'Manrope', sans-serif", color: '#64748b', fontSize: '0.9375rem' }}>
          See how your preferences align with each candidate
        </p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        className="max-w-lg mx-auto mb-8"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        style={{
          backgroundColor: '#fffefb',
          border: '1px solid #e8e2d9',
          borderRadius: '0.625rem',
          padding: '1.25rem',
        }}
      >
        <div className="grid grid-cols-2 gap-4 text-center">
          {[
            { label: 'Agreed', value: rankedQuotes.length, color: '#00657c' },
            { label: 'Disagreed', value: disagreedQuotes.length, color: '#78716c' },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.6875rem', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Result Cards — identities shown immediately */}
      <div className="max-w-2xl mx-auto space-y-4">
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
        className="flex justify-center pt-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: organizedQuotes.length * 0.08 + 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={() => goToHub()}
          className="ev-button-secondary"
          style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
        >
          Explore More Issues
        </button>
      </motion.div>
    </div>
  );
};
